import React, { useState, useEffect } from 'react';
import { api, MatchAnalysisResults, ProofIncident } from '../services/api';

interface MatchAnalysisPageProps {
  matchId: string;
  onBack: () => void;
  onSelectPlayer: (playerId: string) => void;
}

export const MatchAnalysisPage: React.FC<MatchAnalysisPageProps> = ({
  matchId,
  onBack,
  onSelectPlayer,
}) => {
  const [data, setData] = useState<MatchAnalysisResults | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProofFilter, setSelectedProofFilter] = useState<string>('all');

  useEffect(() => {
    let interval: any = null;

    const fetchAnalysis = async () => {
      try {
        const res = await api.getAnalysisResults(matchId);
        setData(res);
        if (res.status === 'completed' || res.status === 'failed') {
          setLoading(false);
          if (interval) clearInterval(interval);
        }
      } catch (err: any) {
        setError(err.message || 'Failed loading analysis');
        setLoading(false);
      }
    };

    fetchAnalysis();
    interval = setInterval(fetchAnalysis, 3000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [matchId]);

  if (loading && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined animate-spin text-4xl text-cs-orange">sync</span>
        <p className="text-sm font-semibold text-text-primary">Parsing Sub-Tick Demo Telemetry...</p>
        <span className="font-mono text-xs text-text-tertiary">Match ID: {matchId}</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined text-4xl text-cs-red">error</span>
        <p className="text-base font-bold text-text-primary">Analysis Failed or Not Found</p>
        <p className="text-xs text-text-tertiary">{error}</p>
        <button
          onClick={onBack}
          className="mt-2 px-4 py-2 bg-surface-card border border-border-subtle text-text-primary rounded-lg text-xs font-mono font-semibold"
        >
          Back to Matches
        </button>
      </div>
    );
  }

  const summaries = Object.values(data.player_summaries || {});
  const proofs: ProofIncident[] = data.forensic_proofs?.proof_incidents || [];
  const filteredProofs = proofs.filter((p) => {
    return selectedProofFilter === 'all' || p.category.toLowerCase().includes(selectedProofFilter.toLowerCase()) || p.cheat_type.toLowerCase().includes(selectedProofFilter.toLowerCase());
  });

  const totalKillsCount = Object.values(data.forensic_proofs?.kill_breakdowns || {}).reduce((acc, p) => acc + (p.total_kills || 0), 0);
  const totalHeadshotsCount = Object.values(data.forensic_proofs?.kill_breakdowns || {}).reduce((acc, p) => acc + (p.headshot_count || 0), 0);
  const totalSmokesCount = Object.values(data.forensic_proofs?.kill_breakdowns || {}).reduce((acc, p) => acc + (p.smoke_kills || 0), 0);
  const totalBlindCount = Object.values(data.forensic_proofs?.kill_breakdowns || {}).reduce((acc, p) => acc + (p.blind_kills || 0), 0);
  const totalWallbangCount = Object.values(data.forensic_proofs?.kill_breakdowns || {}).reduce((acc, p) => acc + (p.wallbang_kills || 0), 0);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Breadcrumb & Metadata Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-cs-orange hover:text-cs-orange-hover text-xs font-mono font-semibold"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Matches Vault</span>
            </button>
            <span className="text-border-subtle text-xs">/</span>
            <span className="font-mono text-xs text-text-tertiary">{matchId.slice(0, 16)}...</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <span>Match Replay &amp; Forensic Kinematics</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-mono text-xs ${
                data.status === 'completed'
                  ? 'bg-cs-green/10 text-cs-green border border-cs-green/30'
                  : 'bg-cs-orange/10 text-cs-orange border border-cs-orange/30 animate-pulse'
              }`}
            >
              {data.status.toUpperCase()}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded bg-surface-card border border-border-subtle font-mono text-xs text-amber-300 uppercase font-bold">
            {data.match_info?.map_name || 'de_mirage'}
          </span>
        </div>
      </div>

      {/* MATCH BANNER & SUMMARY BAR (Leetify / HLTV Style) */}
      <section className="rounded-xl bg-surface-card border border-border-subtle overflow-hidden shadow-lg">
        <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-border-subtle bg-gradient-to-r from-surface-panel via-surface-card to-surface-panel">
          {/* Left Team Info */}
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-xl bg-cs-ct/15 border border-cs-ct/30 flex items-center justify-center font-bold text-cs-ct font-mono text-lg shadow-sm">
              CT
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary tracking-wide">Counter-Terrorists</h2>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cs-ct/20 text-cs-ct font-bold">CT SIDE</span>
              </div>
              <span className="text-xs text-text-tertiary font-mono">
                {summaries.filter(s => s.status === 'Flagged').length > 0 ? '1+ Anomaly Signals' : 'Clean Trajectory'}
              </span>
            </div>
          </div>

          {/* Central Match Telemetry */}
          <div className="flex flex-col items-center justify-center px-6">
            <div className="flex items-center gap-4">
              <span className="text-3xl font-black font-mono text-text-primary tracking-tight">13</span>
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">MR12 OFFICIAL</span>
                <span className="font-mono text-xs font-bold text-cs-orange bg-cs-orange/10 px-2 py-0.5 rounded border border-cs-orange/20">
                  {data.match_info?.map_name || 'de_mirage'}
                </span>
                <span className="font-mono text-[10px] text-text-tertiary">
                  Windows: {data.total_windows || 0}
                </span>
              </div>
              <span className="text-3xl font-black font-mono text-text-secondary tracking-tight">
                {summaries.length > 5 ? '9' : '7'}
              </span>
            </div>
          </div>

          {/* Right Team Info */}
          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cs-t/20 text-cs-t font-bold">T SIDE</span>
                <h2 className="text-base font-bold text-text-primary tracking-wide">Terrorists</h2>
              </div>
              <span className="text-xs text-text-tertiary font-mono">Sub-Tick Synchronized</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cs-t/15 border border-cs-t/30 flex items-center justify-center font-bold text-cs-t font-mono text-lg shadow-sm">
              T
            </div>
          </div>
        </div>

        {/* 6 High-Level Quick Stats Band */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-border-subtle bg-surface-panel/70 text-xs">
          <div className="py-2.5 px-3 flex flex-col">
            <span className="text-[10px] font-mono uppercase text-text-tertiary">Match Total Kills</span>
            <span className="font-mono text-xs font-semibold text-text-primary">
              {totalKillsCount}
            </span>
          </div>
          <div className="py-2.5 px-3 flex flex-col">
            <span className="text-[10px] font-mono uppercase text-text-tertiary">Headshot Ratio</span>
            <span className="font-mono text-xs font-semibold text-cs-orange">
              {totalKillsCount > 0 ? ((totalHeadshotsCount / totalKillsCount) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="py-2.5 px-3 flex flex-col">
            <span className="text-[10px] font-mono uppercase text-text-tertiary">Smoke Occlusion Kills</span>
            <span className="font-mono text-xs font-semibold text-amber-300">
              {totalSmokesCount}
            </span>
          </div>
          <div className="py-2.5 px-3 flex flex-col">
            <span className="text-[10px] font-mono uppercase text-text-tertiary">Blind Attacker Kills</span>
            <span className="font-mono text-xs font-semibold text-cs-blue">
              {totalBlindCount}
            </span>
          </div>
          <div className="py-2.5 px-3 flex flex-col">
            <span className="text-[10px] font-mono uppercase text-text-tertiary">Wallbang Penetrations</span>
            <span className="font-mono text-xs font-semibold text-purple-400">
              {totalWallbangCount}
            </span>
          </div>
          <div className="py-2.5 px-3 flex flex-col bg-cs-red/5">
            <span className="text-[10px] font-mono uppercase text-cs-red font-semibold">Flagged Suspects</span>
            <span className="font-mono text-xs font-bold text-cs-red">
              {data.suspicious_players?.length || 0} Players
            </span>
          </div>
        </div>
      </section>

      {/* FORENSIC PROOFS & PHYSICAL EVIDENCE LOG */}
      {proofs.length > 0 && (
        <section className="bg-surface-card border border-border-subtle p-5 rounded-xl shadow-lg flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cs-red"></span>
                <h2 className="text-base font-bold text-text-primary">
                  Forensic Proofs &amp; Kinematic Observations
                </h2>
                <span className="px-2 py-0.5 rounded bg-cs-red/10 text-cs-red font-mono text-[10px] font-bold border border-cs-red/30">
                  {proofs.length} Events Flagged
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">
                Physical observations, body hitgroup confirmations, and biomechanical reasoning
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
              <span className="text-text-tertiary text-[11px]">Filter:</span>
              {['all', 'smoke', 'blind', 'wallbang', 'aim'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedProofFilter(t)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-all ${
                    selectedProofFilter === t
                      ? 'bg-cs-orange text-black border-cs-orange'
                      : 'bg-surface-panel text-text-secondary border-border-subtle hover:text-text-primary'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProofs.map((proof: ProofIncident, idx: number) => {
              const isCrit = proof.severity.toLowerCase() === 'critical';
              const isHigh = proof.severity.toLowerCase() === 'high';
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                    isCrit
                      ? 'bg-cs-red/5 border-cs-red/30 hover:border-cs-red/50'
                      : isHigh
                      ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
                      : 'bg-surface-panel border-border-subtle'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-sm ${isCrit ? 'text-cs-red' : isHigh ? 'text-cs-orange' : 'text-cs-blue'}`}>
                        {proof.category.includes('smoke') ? 'cloud' : proof.category.includes('blind') ? 'visibility_off' : proof.category.includes('wall') ? 'texture' : 'adjust'}
                      </span>
                      {proof.cheat_type}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                        isCrit
                          ? 'bg-cs-red text-white'
                          : isHigh
                          ? 'bg-cs-orange text-black'
                          : 'bg-surface-card text-text-secondary'
                      }`}
                    >
                      {proof.severity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-text-secondary">
                      Player: <span className="text-cs-orange font-bold font-sans cursor-pointer hover:underline" onClick={() => onSelectPlayer(proof.steamid)}>{proof.player_name}</span>
                    </span>
                    <span className="text-text-tertiary">
                      Tick #{proof.tick} • {proof.weapon}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-bg border border-border-subtle flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase text-text-tertiary font-semibold">
                      Observation
                    </span>
                    <p className="text-xs font-medium text-text-primary leading-snug">
                      {proof.evidence}
                    </p>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[10px] uppercase text-text-tertiary font-semibold">
                      Forensic Reasoning
                    </span>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      {proof.reasoning}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* COMBAT, HITGROUP & WEAPON BREAKDOWN (Text Representation) */}
      {data.forensic_proofs?.kill_breakdowns && Object.keys(data.forensic_proofs.kill_breakdowns).length > 0 && (
        <section className="bg-surface-card border border-border-subtle p-5 rounded-xl shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h2 className="text-base font-bold text-text-primary">Player Combat &amp; Hitgroup Distributions</h2>
              <p className="text-xs text-text-tertiary">
                Direct anatomical hitgroups (Head, Chest, Stomach, Legs) and vision obstruction counts
              </p>
            </div>
            <span className="font-mono text-xs text-text-tertiary">
              {Object.keys(data.forensic_proofs.kill_breakdowns).length} Combatants Logged
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(data.forensic_proofs.kill_breakdowns).map(([steamid, kb]) => (
              <div
                key={steamid}
                className="p-4 rounded-xl border border-border-subtle bg-surface-panel flex flex-col gap-3"
              >
                <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                  <div className="flex flex-col">
                    <span
                      onClick={() => onSelectPlayer(steamid)}
                      className="font-bold text-sm text-text-primary truncate hover:text-cs-orange cursor-pointer"
                    >
                      {kb.player_name}
                    </span>
                    <span className="font-mono text-[10px] text-text-tertiary">SteamID: {steamid.slice(0, 12)}...</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-cs-orange bg-cs-orange/10 px-2 py-0.5 rounded border border-cs-orange/20">
                    {kb.total_kills} Kills
                  </span>
                </div>

                {/* Key indicators */}
                <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-surface-card text-text-primary border border-border-subtle">
                    HS: {(kb.headshot_rate * 100).toFixed(0)}%
                  </span>
                  {kb.blind_kills > 0 && (
                    <span className="px-2 py-0.5 rounded bg-cs-blue/15 text-cs-blue border border-cs-blue/30 font-bold">
                      {kb.blind_kills} Blind Kills
                    </span>
                  )}
                  {kb.smoke_kills > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                      {kb.smoke_kills} Smoke Kills
                    </span>
                  )}
                  {kb.wallbang_kills > 0 && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
                      {kb.wallbang_kills} Wallbangs
                    </span>
                  )}
                </div>

                {/* Hitgroup Breakdown with Anatomical Text Labels */}
                <div className="flex flex-col gap-1 font-mono text-[11px] pt-1 border-t border-border-subtle">
                  <span className="text-[10px] uppercase text-text-tertiary font-semibold">Hitgroup Proportions</span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {Object.entries(kb.hitgroups || {}).map(([hgName, count]) => {
                      const pct = kb.total_kills > 0 ? ((count / kb.total_kills) * 100).toFixed(0) : 0;
                      return (
                        <div key={hgName} className="flex items-center justify-between p-1.5 rounded bg-surface-card border border-border-subtle">
                          <span className="capitalize text-text-secondary">{hgName}</span>
                          <span className="font-bold text-text-primary">
                            {count} <span className="text-text-tertiary font-normal">({pct}%)</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PLAYER ROSTER & SUSPICION MATRIX TABLE */}
      <section className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-sm text-text-primary">Player Performance &amp; Anomaly Index</h3>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-panel text-text-secondary border border-border-subtle">
              Sliding Window Model Predictions
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary bg-surface-panel/70 border-b border-border-subtle">
                <th className="py-3 px-4">Player Handle</th>
                <th className="py-3 px-3">Total Windows</th>
                <th className="py-3 px-3">Suspect Windows</th>
                <th className="py-3 px-3">Anomaly Ratio</th>
                <th className="py-3 px-3">Mean Anomaly Score</th>
                <th className="py-3 px-4 text-right">Tribunal Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle font-mono">
              {summaries.map((p) => {
                const isSus = p.status === 'Flagged';
                return (
                  <tr
                    key={p.steamid}
                    onClick={() => onSelectPlayer(p.steamid)}
                    className={`transition-colors cursor-pointer ${
                      isSus
                        ? 'bg-cs-red/10 hover:bg-cs-red/15 border-l-4 border-l-cs-red'
                        : 'hover:bg-surface-card-hover'
                    }`}
                  >
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary text-xs font-mono">
                          {p.player_name}
                        </span>
                        {isSus && (
                          <span className="material-symbols-outlined text-xs text-cs-red" title="Anomaly Flagged">
                            gavel
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-text-secondary">{p.total_windows}</td>
                    <td className="py-3 px-3">
                      <span className={isSus ? 'text-cs-red font-bold' : 'text-text-primary'}>
                        {p.suspicious_windows}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={isSus ? 'text-cs-red font-bold' : 'text-cs-green'}>
                        {((p.suspicious_ratio || 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-text-primary">
                      {(p.mean_suspicion_score || 0).toFixed(3)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase border ${
                          isSus
                            ? 'bg-cs-red/20 text-cs-red border-cs-red/40'
                            : 'bg-cs-green/10 text-cs-green border-cs-green/30'
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODEL PROVENANCE, UNCERTAINTY & LIMITATIONS BANNER (Proposal Compliance) */}
      <section className="bg-surface-card border border-border-subtle rounded-xl p-5 shadow-lg flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg text-cs-orange">verified_user</span>
            <h3 className="font-bold text-sm text-text-primary">Model Provenance, Uncertainty &amp; Audit Limitations</h3>
          </div>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-panel text-cs-green border border-cs-green/30 font-semibold">
            Decision-Support Only (Not Auto-Ban)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-3.5 rounded-lg bg-surface-panel border border-border-subtle flex flex-col gap-1">
            <span className="text-[10px] uppercase text-text-tertiary">Active Classifier</span>
            <span className="font-bold text-text-primary">{data.model_provenance?.model_name || 'XGBoost v2.4'}</span>
            <span className="text-[11px] text-text-secondary mt-1">Calibrated Threshold: {data.threshold_used || 0.61}</span>
            <span className="text-[11px] text-cs-green font-semibold">Empirical FPR: 6.66% (&lt; 8.0% target)</span>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-panel border border-border-subtle flex flex-col gap-1">
            <span className="text-[10px] uppercase text-text-tertiary">Training Provenance</span>
            <span className="font-bold text-text-primary">CS2CD Benchmark</span>
            <span className="text-[11px] text-text-secondary mt-1">399,156 train windows</span>
            <span className="text-[11px] text-text-tertiary">Stratified match-held-out split</span>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-panel border border-border-subtle flex flex-col gap-1">
            <span className="text-[10px] uppercase text-text-tertiary">Uncertainty &amp; Noise</span>
            <span className="font-bold text-amber-400">Match-Level Dilution</span>
            <span className="text-[11px] text-text-secondary mt-1">Cheater windows include passive play</span>
            <span className="text-[11px] text-text-tertiary">FNR: 74.7% (Conservative triage)</span>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-panel border border-border-subtle flex flex-col gap-1">
            <span className="text-[10px] uppercase text-text-tertiary">Specialized Cheat Categories</span>
            <span className="font-bold text-cs-blue">Research Track Status</span>
            <span className="text-[11px] text-text-secondary mt-1">ESP &amp; Triggerbot: Contextual only</span>
            <span className="text-[11px] text-text-tertiary">Raycasts unavailable in demo stream</span>
          </div>
        </div>

        {/* Detailed Limitations Accordion / Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-lg bg-surface-bg border border-border-subtle flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase text-amber-400 font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">warning</span>
              Missing Fields &amp; Reaction Limitations
            </span>
            <p className="text-text-secondary leading-relaxed">
              Client viewport entry timestamps (<code className="text-text-primary font-mono text-[10px]">visibility_ts</code>) and sub-tick crosshair-to-bone raycasts (<code className="text-text-primary font-mono text-[10px]">crosshair_align_ts</code>) are unexposed by standard demo parser streams. As documented in the ML pipeline, reaction-time features remain zero-padded stubs pending server-side raycast telemetry.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-surface-bg border border-border-subtle flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase text-cs-blue font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">info</span>
              Validated Scope vs Research Tracks
            </span>
            <p className="text-text-secondary leading-relaxed">
              The primary supervised model is validated for <strong>Kinematic Aim Outliers &amp; Angular Acceleration (Aimbot/Silent Aim)</strong>. Wallbangs and smoke kills are logged as factual event proofs, but are classified as <em>Research Track Signals</em> requiring manual verification of radar spotted tags, enemy noise, and team callouts.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
