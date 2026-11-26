import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import {
  api,
  AnalysisLimitations,
  AnalysisStatus,
  MatchAnalysisResults,
  ModelProvenance,
  ProofIncident,
} from '../services/api';
import {
  Badge,
  displayFilename,
  ErrorState,
  Figures,
  formatDate,
  formatNumber,
  formatPct,
  Loading,
  mapLabel,
  Mono,
  PageHeader,
  RatioBar,
  SectionTitle,
  VerdictBadge,
} from '../components/ui';
import { SuspicionTimeline } from '../components/SuspicionTimeline';

interface MatchAnalysisPageProps {
  matchId: string;
  onBack: () => void;
  onSelectPlayer: (playerId: string) => void;
  /** Called once when a job that was in flight finishes or fails. */
  onAnalysisSettled?: () => void;
}

// Values documented in docs/evaluation_results.md; used when an older report
// was written before the backend started embedding provenance.
const DEFAULT_PROVENANCE: ModelProvenance = {
  model_name: 'XGBoost',
  model_version: '2.4.1',
  calibrated_threshold: 0.61,
  target_max_fpr: 0.08,
  empirical_fpr: 0.0666,
  training_dataset: 'CS2CD (Hugging Face) - 399,156 windows',
  split_method: 'Stratified match-held-out split',
  decision_support_only: true,
};

const DEFAULT_LIMITATIONS: AnalysisLimitations = {
  uncertainty_notes: [
    'Scores measure how unusual a window is against the CS2CD reference data. They are not proof of cheating.',
    'Windows from a cheater include ordinary play too, so match-level results are diluted (false-negative rate 74.7% at this threshold).',
  ],
  missing_fields: [
    'visibility_ts: when an opponent enters the client viewport is not in the demo stream.',
    'crosshair_align_ts: sub-tick crosshair-to-bone raycasts are not recorded, so reaction-time features are zero-filled.',
  ],
  unsupported_cheat_categories: ['Triggerbot and ESP can only be noted as context; the demo lacks the client visibility data to confirm them.'],
  research_track_signals: [
    'Wallbang and through-smoke kills are logged as facts for manual review, not scored as cheating.',
  ],
};

const IN_FLIGHT = new Set(['pending', 'processing']);

export const MatchAnalysisPage: React.FC<MatchAnalysisPageProps> = ({
  matchId,
  onBack,
  onSelectPlayer,
  onAnalysisSettled,
}) => {
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [data, setData] = useState<MatchAnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evidencePlayer, setEvidencePlayer] = useState<string>('all');
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const settledRef = useRef(onAnalysisSettled);
  settledRef.current = onAnalysisSettled;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let wasInFlight = false;

    setStatus(null);
    setData(null);
    setError(null);
    setEvidencePlayer('all');
    setShowAllEvidence(false);

    // Poll the lightweight status endpoint while the job runs, then fetch the
    // full report once.
    const poll = async () => {
      try {
        const s = await api.getAnalysisStatus(matchId);
        if (cancelled) return;
        setStatus(s);
        if (IN_FLIGHT.has(s.status)) {
          wasInFlight = true;
          timer = setTimeout(poll, 2500);
          return;
        }
        const res = await api.getAnalysisResults(matchId);
        if (cancelled) return;
        setData(res);
        if (wasInFlight) settledRef.current?.();
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load this analysis.');
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [matchId]);

  const back = { label: 'Matches', onClick: onBack };

  if (error) {
    return (
      <div>
        <PageHeader title="Match report" back={back} />
        <ErrorState
          title="This analysis could not be loaded"
          message={error}
          action={
            <button className="btn-secondary" onClick={onBack}>
              Back to matches
            </button>
          }
        />
      </div>
    );
  }

  if (!status || (!data && !IN_FLIGHT.has(status.status))) {
    return (
      <div>
        <PageHeader title="Match report" back={back} />
        <Loading label="Loading report" />
      </div>
    );
  }

  const title = displayFilename(status.filename);

  if (IN_FLIGHT.has(status.status)) {
    return (
      <div>
        <PageHeader title={title} back={back} description={<Mono className="text-ink-3">{matchId}</Mono>} />
        <div className="panel flex flex-col items-center px-6 py-16 text-center">
          <Loader2 size={22} className="mb-4 animate-spin text-ember" />
          <p className="font-medium text-ink">
            {status.status === 'pending' ? 'Waiting to start' : 'Parsing the demo and scoring windows'}
          </p>
          <p className="mt-1 max-w-[52ch] text-sm text-ink-2">
            Large demos can take a few minutes. This page checks every few seconds and opens the report when it is
            ready.
          </p>
          {status.created_at && <p className="mt-4 text-xs text-ink-3">Uploaded {formatDate(status.created_at)}</p>}
        </div>
      </div>
    );
  }

  if (status.status === 'failed' || data?.status === 'failed') {
    const msg = status.error || 'The backend did not record a reason.';
    const modelMissing = /no trained model/i.test(msg);
    return (
      <div>
        <PageHeader title={title} back={back} description={<Mono className="text-ink-3">{matchId}</Mono>} />
        <ErrorState
          title="Analysis failed"
          message={
            modelMissing
              ? 'The backend has no trained model to score this demo with. Train one with python -m ml.train, then upload the demo again.'
              : `The demo could not be processed. It may be truncated, corrupt, or not a CS2 demo. Backend said: “${msg}”`
          }
          action={
            <button className="btn-secondary" onClick={onBack}>
              Back to matches
            </button>
          }
        />
      </div>
    );
  }

  if (!data) return null;

  /* ---------- Completed report ---------- */

  const threshold = data.threshold_used ?? DEFAULT_PROVENANCE.calibrated_threshold;
  const summaries = Object.values(data.player_summaries || {}).sort(
    (a, b) =>
      Number(b.status === 'Flagged') - Number(a.status === 'Flagged') || b.suspicious_ratio - a.suspicious_ratio,
  );
  const flaggedCount = summaries.filter((s) => s.status === 'Flagged').length;
  const totalWindows = data.total_windows || 0;
  const flaggedWindows = data.suspicious_windows_count || 0;

  const kills = Object.entries(data.forensic_proofs?.kill_breakdowns || {}).sort(
    (a, b) => b[1].total_kills - a[1].total_kills,
  );
  const totalKills = kills.reduce((acc, [, k]) => acc + (k.total_kills || 0), 0);
  const totalHs = kills.reduce((acc, [, k]) => acc + (k.headshot_count || 0), 0);

  const proofs: ProofIncident[] = data.forensic_proofs?.proof_incidents || [];
  const proofPlayers = [...new Map(proofs.map((p) => [p.steamid, p.player_name])).entries()];
  const filteredProofs = proofs.filter((p) => evidencePlayer === 'all' || p.steamid === evidencePlayer);
  const visibleProofs = showAllEvidence ? filteredProofs : filteredProofs.slice(0, 6);
  // The forensic pass often writes the same explanation for every incident of a
  // type; state it once instead of repeating it on every row.
  const reasonings = [...new Set(filteredProofs.map((p) => p.reasoning))];
  const sharedReasoning = reasonings.length === 1 ? reasonings[0] : null;

  const provenance = { ...DEFAULT_PROVENANCE, ...(data.model_provenance || {}) };
  const limitations = data.limitations || DEFAULT_LIMITATIONS;
  const notes = [
    ...limitations.uncertainty_notes,
    ...limitations.missing_fields,
    ...limitations.unsupported_cheat_categories,
    ...limitations.research_track_signals,
  ];

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {mapLabel(data.match_info?.map_name)}
            <span className="text-base font-normal text-ink-2">{title}</span>
          </span>
        }
        back={back}
        description={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {data.match_info?.server_name && <span>{data.match_info.server_name}</span>}
            {status.completed_at && <span>Analyzed {formatDate(status.completed_at)}</span>}
            <Mono className="text-ink-3">{matchId}</Mono>
          </span>
        }
      />

      <Figures
        items={[
          {
            label: 'Players flagged',
            value: `${flaggedCount} of ${summaries.length}`,
            tone: flaggedCount > 0 ? 'flag' : 'clean',
          },
          {
            label: 'Flagged windows',
            value: formatNumber(flaggedWindows),
            note: `${formatPct(totalWindows ? flaggedWindows / totalWindows : 0)} of ${formatNumber(totalWindows)}`,
          },
          {
            label: 'Kills logged',
            value: formatNumber(totalKills),
            note: totalKills ? `${formatPct(totalHs / totalKills, 0)} headshots` : undefined,
          },
          { label: 'Threshold', value: threshold.toFixed(2), note: `${provenance.model_name} calibrated` },
        ]}
      />

      <section className="mt-10">
        <SectionTitle title="Players" meta="Share of each player's windows that scored over the threshold" />
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-sunken/50">
                <tr>
                  <th className="th">Player</th>
                  <th className="th">Verdict</th>
                  <th className="th">Flagged share</th>
                  <th className="th text-right">Flagged / total</th>
                  <th className="th text-right">Mean score</th>
                  <th className="th text-right">Peak score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summaries.map((p) => {
                  const flagged = p.status === 'Flagged';
                  return (
                    <tr
                      key={p.steamid}
                      onClick={() => onSelectPlayer(p.steamid)}
                      className="cursor-pointer transition-colors hover:bg-sunken/60"
                    >
                      <td className="td">
                        <button
                          className="font-medium text-ink hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPlayer(p.steamid);
                          }}
                        >
                          {p.player_name}
                        </button>
                      </td>
                      <td className="td">
                        <VerdictBadge verdict={p.status} />
                      </td>
                      <td className="td">
                        <RatioBar value={p.suspicious_ratio} flagged={flagged} />
                      </td>
                      <td className="td num text-right text-ink-2">
                        {p.suspicious_windows} / {p.total_windows}
                      </td>
                      <td className="td num text-right text-ink-2">{(p.mean_suspicion_score || 0).toFixed(3)}</td>
                      <td className={`td num text-right ${p.max_suspicion_score >= threshold ? 'text-ink' : 'text-ink-2'}`}>
                        {(p.max_suspicion_score || 0).toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {(data.evidence_windows?.length ?? 0) > 0 && (
        <section className="mt-10">
          <SectionTitle
            title="When it happened"
            meta={`The ${data.evidence_windows!.length} highest-scoring windows in the match, by player`}
          />
          <SuspicionTimeline windows={data.evidence_windows!} threshold={threshold} onSelectPlayer={onSelectPlayer} />
        </section>
      )}

      {proofs.length > 0 && (
        <section className="mt-10">
          <SectionTitle title="Evidence" meta={`${proofs.length} incidents written up by the forensic pass`}>
            {proofPlayers.length > 1 && (
              <label className="flex items-center gap-2 text-sm text-ink-2">
                Player
                <select
                  value={evidencePlayer}
                  onChange={(e) => {
                    setEvidencePlayer(e.target.value);
                    setShowAllEvidence(false);
                  }}
                  className="field h-8 w-auto pr-8"
                >
                  <option value="all">Everyone</option>
                  {proofPlayers.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </SectionTitle>

          {sharedReasoning && (
            <p className="mb-3 max-w-[75ch] text-sm text-ink-2">
              <span className="font-medium text-ink">Why these were written up: </span>
              {sharedReasoning}
            </p>
          )}
          <ol className="panel divide-y divide-line">
            {visibleProofs.map((proof, idx) => {
              const sev = proof.severity.toLowerCase();
              return (
                <li key={`${proof.steamid}-${proof.tick}-${idx}`} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <Badge tone={sev === 'critical' || sev === 'high' ? 'flag' : sev === 'medium' ? 'pending' : 'neutral'}>
                      {proof.severity}
                    </Badge>
                    <span className="font-medium text-ink">{proof.cheat_type}</span>
                    <span className="text-sm text-ink-3">·</span>
                    <button className="link text-sm" onClick={() => onSelectPlayer(proof.steamid)}>
                      {proof.player_name}
                    </button>
                    <Mono className="ml-auto text-ink-3">tick {proof.tick}</Mono>
                  </div>
                  <p className="mt-2 max-w-[75ch] text-sm text-ink">{proof.evidence}</p>
                  {!sharedReasoning && <p className="mt-1 max-w-[75ch] text-sm text-ink-2">{proof.reasoning}</p>}
                </li>
              );
            })}
          </ol>
          {filteredProofs.length > 6 && (
            <button className="btn-ghost -ml-3 mt-2" onClick={() => setShowAllEvidence((v) => !v)}>
              {showAllEvidence ? 'Show fewer' : `Show all ${filteredProofs.length}`}
            </button>
          )}
        </section>
      )}

      {kills.length > 0 && (
        <section className="mt-10">
          <SectionTitle title="Kills" meta="From the demo's death events. Context for review; not scored by the model." />
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-sunken/50">
                  <tr>
                    <th className="th">Player</th>
                    <th className="th text-right">Kills</th>
                    <th className="th text-right">Headshot</th>
                    <th className="th text-right">While blind</th>
                    <th className="th text-right">Through smoke</th>
                    <th className="th text-right">Wallbang</th>
                    <th className="th text-right">Airborne</th>
                    <th className="th">Main weapon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {kills.map(([steamid, k]) => {
                    const topWeapon = Object.entries(k.weapons || {}).sort((a, b) => b[1] - a[1])[0];
                    const cell = (n: number) => (
                      <td className={`td num text-right ${n > 0 ? 'text-ink' : 'text-ink-3'}`}>{n}</td>
                    );
                    return (
                      <tr key={steamid}>
                        <td className="td">
                          <button className="font-medium text-ink hover:underline" onClick={() => onSelectPlayer(steamid)}>
                            {k.player_name}
                          </button>
                        </td>
                        <td className="td num text-right text-ink">{k.total_kills}</td>
                        <td className="td num text-right text-ink-2">{formatPct(k.headshot_rate, 0)}</td>
                        {cell(k.blind_kills)}
                        {cell(k.smoke_kills)}
                        {cell(k.wallbang_kills)}
                        {cell(k.air_kills)}
                        <td className="td text-ink-2">
                          {topWeapon ? (
                            <>
                              <Mono>{topWeapon[0].toLowerCase()}</Mono>
                              <span className="num ml-1.5 text-ink-3">{topWeapon[1]}</span>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="text-base font-semibold text-ink">Reading this report</h2>
        <div className="mt-4 grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <dl className="grid content-start grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2.5 text-sm">
            <dt className="text-ink-3">Model</dt>
            <dd className="text-ink">
              {provenance.model_name} {provenance.model_version}
            </dd>
            <dt className="text-ink-3">Threshold</dt>
            <dd className="num text-ink">{threshold.toFixed(2)}</dd>
            <dt className="text-ink-3">False positives</dt>
            <dd className="num text-ink">
              {formatPct(provenance.empirical_fpr, 2)}{' '}
              <span className="text-ink-3">(target under {formatPct(provenance.target_max_fpr, 0)})</span>
            </dd>
            <dt className="text-ink-3">Trained on</dt>
            <dd className="text-ink">{provenance.training_dataset}</dd>
            <dt className="text-ink-3">Split</dt>
            <dd className="text-ink">{provenance.split_method}</dd>
          </dl>
          <div>
            <p className="text-sm font-medium text-ink">
              Decision support only. A person reviews every flag before any action is taken.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-2 marker:text-ink-3">
              {notes.map((n) => (
                <li key={n} className="max-w-[75ch]">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
