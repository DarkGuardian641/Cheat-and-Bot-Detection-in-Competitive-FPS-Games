import React, { useState, useEffect } from 'react';
import { api, PlayerDetail } from '../services/api';
import {
  displayFilename,
  ErrorState,
  Figures,
  formatNumber,
  formatPct,
  Loading,
  Mono,
  PageHeader,
  RatioBar,
  SectionTitle,
  VerdictBadge,
} from '../components/ui';

interface PlayerDetailsPageProps {
  playerId: string;
  backLabel?: string;
  onBack: () => void;
  onSelectMatch: (matchId: string) => void;
}

export const PlayerDetailsPage: React.FC<PlayerDetailsPageProps> = ({
  playerId,
  backLabel = 'Players',
  onBack,
  onSelectMatch,
}) => {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getPlayerDetails(playerId)
      .then((data) => !cancelled && setPlayer(data))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : 'Failed to load player.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const back = { label: backLabel, onClick: onBack };

  if (loading) {
    return (
      <div>
        <PageHeader title="Player" back={back} />
        <Loading label="Loading player" />
      </div>
    );
  }

  if (error || !player) {
    return (
      <div>
        <PageHeader title="Player" back={back} />
        <ErrorState
          title="No record for this player"
          message={`SteamID64 ${playerId} does not appear in any completed analysis.`}
          action={
            <button className="btn-secondary" onClick={onBack}>
              Go back
            </button>
          }
        />
      </div>
    );
  }

  const flagged = player.overall_verdict === 'Flagged';
  const matches = [...(player.matches || [])].sort((a, b) => b.suspicious_ratio - a.suspicious_ratio);
  const peak = Math.max(0, ...matches.map((m) => m.max_suspicion_score || 0));

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {player.player_name}
            <VerdictBadge verdict={player.overall_verdict} />
          </span>
        }
        back={back}
        description={
          <span>
            <Mono>{player.player_id}</Mono>
            <span className="mx-2 text-ink-3">·</span>
            <a
              className="link"
              href={`https://steamcommunity.com/profiles/${encodeURIComponent(player.player_id)}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              Steam profile
            </a>
          </span>
        }
      />

      <Figures
        items={[
          {
            label: 'Flagged share',
            value: formatPct(player.overall_suspicious_ratio),
            tone: flagged ? 'flag' : 'clean',
            note: 'Across all matches',
          },
          {
            label: 'Flagged windows',
            value: formatNumber(player.suspicious_windows),
            note: `of ${formatNumber(player.total_windows)} scored`,
          },
          { label: 'Peak score', value: peak.toFixed(3), note: 'Highest single window' },
          { label: 'Matches', value: formatNumber(player.matches_analyzed) },
        ]}
      />

      <section className="mt-10">
        <SectionTitle title="Match history" meta="Highest flagged share first" />
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-sunken/50">
                <tr>
                  <th className="th">Demo</th>
                  <th className="th">Verdict</th>
                  <th className="th">Flagged share</th>
                  <th className="th text-right">Flagged / total</th>
                  <th className="th text-right">Mean</th>
                  <th className="th text-right">Peak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {matches.map((m) => (
                  <tr
                    key={m.match_id}
                    onClick={() => onSelectMatch(m.match_id)}
                    className="cursor-pointer transition-colors hover:bg-sunken/60"
                  >
                    <td className="td max-w-[340px]">
                      <button
                        className="block max-w-full truncate text-left font-medium text-ink hover:underline"
                        title={displayFilename(m.demo_filename)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMatch(m.match_id);
                        }}
                      >
                        {displayFilename(m.demo_filename)}
                      </button>
                    </td>
                    <td className="td">
                      <VerdictBadge verdict={m.verdict} />
                    </td>
                    <td className="td">
                      <RatioBar value={m.suspicious_ratio} flagged={m.verdict === 'Flagged'} />
                    </td>
                    <td className="td num text-right text-ink-2">
                      {m.suspicious_windows} / {m.total_windows}
                    </td>
                    <td className="td num text-right text-ink-2">{(m.mean_suspicion_score || 0).toFixed(3)}</td>
                    <td className="td num text-right text-ink-2">{(m.max_suspicion_score || 0).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
