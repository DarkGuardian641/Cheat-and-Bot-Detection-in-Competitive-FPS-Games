import React from 'react';
import { AnalysisListItem, MatchListItem } from '../services/api';

interface DashboardPageProps {
  analyses: AnalysisListItem[];
  matches: MatchListItem[];
  onSelectMatch: (matchId: string) => void;
  onNavigateTab: (tab: string) => void;
  loading: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  analyses,
  matches: _matches,
  onSelectMatch,
  onNavigateTab,
  loading,
}) => {
  const totalWindows = analyses.reduce((acc, a) => acc + (a.total_windows || 0), 0);
  const totalSuspicious = analyses.reduce((acc, a) => acc + (a.suspicious_players_count || 0), 0);
  const completedAnalyses = analyses.filter((a) => a.status === 'completed');

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* HEADER BANNER & SYSTEM OVERVIEW */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-card border border-border-subtle p-5 rounded-xl shadow-lg">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-bold text-text-primary tracking-tight font-sans">
              Esports Telemetry &amp; Anti-Cheat Oversight
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cs-orange/15 text-cs-orange border border-cs-orange/30">
              VALVE PROTOCOL 14041
            </span>
          </div>
          <p className="text-xs text-text-tertiary flex flex-wrap items-center gap-2">
            <span className="text-text-secondary font-medium">Local Analysis Node</span>
            <span>•</span>
            <span className="font-mono text-text-tertiary">Sub-Tick Demoparser2 Synchronized</span>
            <span>•</span>
            <span className="font-mono text-cs-green">Biomechanics &amp; Kinematics Parity Active</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-panel border border-border-subtle rounded-lg">
            <span className="material-symbols-outlined text-sm text-cs-green">verified</span>
            <span className="font-mono text-xs text-text-primary">PARSER WORKERS: 100%</span>
          </div>
          <button
            onClick={() => onNavigateTab('new-analysis')}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-cs-orange to-amber-600 hover:from-orange-600 hover:to-amber-700 text-black font-extrabold rounded-lg shadow-md shadow-cs-orange/20 active:scale-95 transition-all text-xs font-mono"
          >
            <span className="material-symbols-outlined text-base">cloud_upload</span>
            <span>INGEST DEMO (.dem)</span>
          </button>
        </div>
      </section>

      {/* 4 AUTHENTIC CS2 KPI CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Matches Analyzed */}
        <div className="bg-surface-card border border-border-subtle p-5 rounded-xl shadow-md flex flex-col justify-between hover:border-border-highlight transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary font-medium">
                Demos Ingested
              </span>
              <span className="text-3xl font-extrabold text-text-primary tracking-tight mt-1 font-mono">
                {analyses.length}
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cs-orange/10 border border-cs-orange/20 text-cs-orange flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">analytics</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle">
            <span className="inline-flex items-center gap-1 text-cs-green font-mono text-xs font-bold">
              <span className="material-symbols-outlined text-sm">trending_up</span> Real-time
            </span>
            <span className="text-xs text-text-tertiary font-mono">64t &amp; Sub-tick</span>
          </div>
        </div>

        {/* Card 2: Active Flagged Demos */}
        <div className="bg-surface-card border border-border-subtle p-5 rounded-xl shadow-md flex flex-col justify-between hover:border-cs-red/40 transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-xs uppercase tracking-wider text-cs-red font-medium">
                Flagged Suspect Detections
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-cs-red tracking-tight font-mono">
                  {totalSuspicious}
                </span>
                <span className="text-xs font-mono text-text-tertiary">suspect epochs</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cs-red/10 border border-cs-red/30 text-cs-red flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.15)]">
              <span className="material-symbols-outlined text-xl">warning</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle">
            <span className="text-xs font-mono text-cs-red font-semibold">
              {totalWindows > 0 ? ((totalSuspicious / totalWindows) * 100).toFixed(1) : 0}% Anomaly Ratio
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cs-red/10 text-cs-red border border-cs-red/30">
              High Priority
            </span>
          </div>
        </div>

        {/* Card 3: Sliding Windows Processed */}
        <div className="bg-surface-card border border-border-subtle p-5 rounded-xl shadow-md flex flex-col justify-between hover:border-border-highlight transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary font-medium">
                256-Tick Windows Evaluated
              </span>
              <span className="text-3xl font-extrabold text-text-primary tracking-tight mt-1 font-mono">
                {totalWindows.toLocaleString()}
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cs-amber/10 border border-cs-amber/20 text-cs-amber flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">timeline</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle">
            <span className="text-xs font-mono text-cs-amber">128-tick sliding stride</span>
            <span className="text-xs text-text-tertiary font-mono">Kinematic features</span>
          </div>
        </div>

        {/* Card 4: Completed Pipeline Runs */}
        <div className="bg-surface-card border border-border-subtle p-5 rounded-xl shadow-md flex flex-col justify-between hover:border-border-highlight transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary font-medium">
                Analysis Pipeline Health
              </span>
              <span className="text-3xl font-extrabold text-cs-green tracking-tight mt-1 font-mono">
                {completedAnalyses.length} <span className="text-lg font-normal text-text-tertiary">done</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cs-green/10 border border-cs-green/20 text-cs-green flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">bolt</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle">
            <span className="text-xs font-mono text-cs-green">Deterministic ML Triage</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cs-green/10 text-cs-green border border-cs-green/20">
              Low Latency
            </span>
          </div>
        </div>
      </section>

      {/* MIDDLE SECTION: INGESTION TABLE (7/12) & HEURISTICS BREAKDOWN (5/12) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Recent Match Ingestion Table */}
        <div className="lg:col-span-7 bg-surface-card border border-border-subtle rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary text-base">Recent Match Replays</span>
                  <span className="px-2 py-0.5 rounded bg-cs-orange/10 text-cs-orange border border-cs-orange/30 text-[10px] font-mono font-bold">
                    SUB-TICK
                  </span>
                </div>
                <span className="text-xs text-text-tertiary font-mono mt-0.5">
                  Click any demo replay to inspect full kill breakdowns and proofs
                </span>
              </div>
              <span className="px-2 py-1 rounded bg-surface-panel text-text-tertiary font-mono text-[11px] border border-border-subtle">
                AUTO-POLL 8s
              </span>
            </div>

            {loading && analyses.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-tertiary font-mono text-xs">
                <span className="material-symbols-outlined animate-spin text-2xl text-cs-orange">sync</span>
                <span>Polling Match Registry...</span>
              </div>
            ) : analyses.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                <span className="material-symbols-outlined text-4xl text-text-tertiary">folder_open</span>
                <p className="text-sm font-semibold text-text-primary">No match replays ingested yet</p>
                <p className="text-xs text-text-tertiary max-w-sm">
                  Upload any `.dem` replay file from the `sample_demos/` folder to run ML &amp; forensic detection.
                </p>
                <button
                  onClick={() => onNavigateTab('new-analysis')}
                  className="mt-2 px-3.5 py-1.5 bg-cs-orange text-black font-bold text-xs font-mono rounded"
                >
                  Upload First Demo
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary border-b border-border-subtle bg-surface-panel/60">
                      <th className="py-2.5 px-3">Demo File</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Suspects</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-xs">
                    {analyses.slice(0, 7).map((item) => {
                      const isFlagged = (item.suspicious_players_count || 0) > 0;
                      return (
                        <tr
                          key={item.analysis_id}
                          onClick={() => onSelectMatch(item.analysis_id)}
                          className="hover:bg-surface-card-hover transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-mono text-text-primary font-semibold truncate max-w-[220px]" title={item.filename}>
                                {item.filename}
                              </span>
                              <span className="text-[10px] text-text-tertiary font-mono">
                                ID: {item.analysis_id.slice(0, 8)}...
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold border ${
                                item.status === 'completed'
                                  ? isFlagged
                                    ? 'bg-cs-red/10 text-cs-red border-cs-red/30'
                                    : 'bg-cs-green/10 text-cs-green border-cs-green/30'
                                  : 'bg-cs-orange/10 text-cs-orange border-cs-orange/30 animate-pulse'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.status === 'completed'
                                    ? isFlagged
                                      ? 'bg-cs-red'
                                      : 'bg-cs-green'
                                    : 'bg-cs-orange'
                                }`}
                              />
                              {item.status === 'completed'
                                ? isFlagged
                                  ? 'Flagged'
                                  : 'Clean'
                                : 'Analyzing...'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`font-mono text-xs font-bold ${
                                isFlagged ? 'text-cs-red' : 'text-cs-green'
                              }`}
                            >
                              {item.suspicious_players_count || 0}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectMatch(item.analysis_id);
                              }}
                              className="font-mono text-xs text-cs-orange hover:text-cs-orange-hover font-bold hover:underline"
                            >
                              Inspect →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border-subtle mt-4">
            <span className="font-mono text-xs text-text-tertiary">
              Showing {analyses.slice(0, 7).length} of {analyses.length} parsed replays
            </span>
            <button
              onClick={() => onNavigateTab('matches')}
              className="font-mono text-xs text-cs-orange hover:text-cs-orange-hover font-bold flex items-center gap-1 group"
            >
              <span>View Full Match Vault</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: Aim & Movement Heuristics Breakdown */}
        <div className="lg:col-span-5 bg-surface-card border border-border-subtle rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-border-subtle">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary text-base">Aim &amp; Movement Heuristics</span>
                  <span className="px-2 py-0.5 rounded bg-cs-orange/15 text-cs-orange font-mono text-[10px] font-bold border border-cs-orange/30">
                    XGBoost Ensemble
                  </span>
                </div>
                <span className="text-xs text-text-tertiary font-mono mt-0.5">
                  Multi-Factor Forensic Anomaly Distribution
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-cs-orange/10 border border-cs-orange/20 flex items-center justify-center text-cs-orange">
                <span className="material-symbols-outlined text-lg">track_changes</span>
              </div>
            </div>

            <p className="text-xs text-text-tertiary mb-5 leading-relaxed">
              Sliding 256-tick window feature extraction analyzing crosshair micro-adjustments, sub-tick snap boundaries, through-smoke engagements, and wall penetration tracking.
            </p>

            {/* Heuristic Breakdown Bars */}
            <div className="flex flex-col gap-4 font-mono text-xs">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-text-primary flex items-center gap-2 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-cs-orange shadow-[0_0_6px_rgba(255,104,43,0.8)]"></span>
                    Aim Trajectory &amp; Polynomial Snap
                  </span>
                  <span className="text-text-primary font-bold">42%</span>
                </div>
                <div className="w-full h-2 rounded bg-surface-panel overflow-hidden border border-border-subtle">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-cs-orange rounded" style={{ width: '42%' }}></div>
                </div>
                <span className="text-[11px] text-text-tertiary">High jerk &amp; mechanical step velocity profiles</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-text-primary flex items-center gap-2 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-cs-red shadow-[0_0_6px_rgba(239,68,68,0.8)]"></span>
                    Wall Penetration &amp; Pre-Aim Tracking
                  </span>
                  <span className="text-text-primary font-bold">28%</span>
                </div>
                <div className="w-full h-2 rounded bg-surface-panel overflow-hidden border border-border-subtle">
                  <div className="h-full bg-gradient-to-r from-cs-orange to-cs-red rounded" style={{ width: '28%' }}></div>
                </div>
                <span className="text-[11px] text-text-tertiary">Tracking enemies behind solid geometry before line-of-sight</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-text-primary flex items-center gap-2 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    Reaction Time &amp; Triggerbot Outliers
                  </span>
                  <span className="text-text-primary font-bold">18%</span>
                </div>
                <div className="w-full h-2 rounded bg-surface-panel overflow-hidden border border-border-subtle">
                  <div className="h-full bg-amber-500 rounded" style={{ width: '18%' }}></div>
                </div>
                <span className="text-[11px] text-text-tertiary">Reaction latency &lt; 100ms on first enemy pixel visibility</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-text-primary flex items-center gap-2 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-cs-blue"></span>
                    Movement Scripts &amp; Bhop Chaining
                  </span>
                  <span className="text-text-primary font-bold">12%</span>
                </div>
                <div className="w-full h-2 rounded bg-surface-panel overflow-hidden border border-border-subtle">
                  <div className="h-full bg-cs-blue rounded" style={{ width: '12%' }}></div>
                </div>
                <span className="text-[11px] text-text-tertiary">Consistent 1-tick jump command ground releases</span>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-border-subtle flex flex-col gap-2">
            <button
              onClick={() => onNavigateTab('new-analysis')}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cs-orange to-amber-600 hover:from-orange-600 hover:to-amber-700 text-black font-extrabold rounded-lg font-mono text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cs-orange/20 active:scale-[0.99] transition-all"
            >
              <span className="material-symbols-outlined text-lg">upload_file</span>
              <span>INGEST NEW CS2 .DEM MATCH</span>
            </button>
            <div className="flex items-center justify-between text-[11px] font-mono text-text-tertiary px-1">
              <span>Supports Valve CS2 match demos</span>
              <span className="text-cs-orange font-semibold">Sub-tick Native</span>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM SECTION: SERVICE NODES & TELEMETRY WORKERS */}
      <section className="bg-surface-card border border-border-subtle p-5 rounded-xl shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 pb-3 border-b border-border-subtle gap-2">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-cs-green shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            <div className="flex flex-col">
              <span className="font-bold text-text-primary text-base font-sans">
                Engine Architecture &amp; Service Nodes
              </span>
              <span className="text-xs text-text-tertiary font-mono">
                Demoparser2 backend with sub-tick extraction pipeline
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs text-text-secondary">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-panel border border-border-subtle">
              <span className="w-2 h-2 rounded-full bg-cs-green"></span>
              <span>Backend: Port 8000</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-panel border border-border-subtle text-cs-orange">
              <span className="material-symbols-outlined text-sm">memory</span>
              <span>Model: XGBoost Calibrated</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface-panel border border-border-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-text-primary font-bold">Demo Parser Binary</span>
                <span className="px-2 py-0.5 rounded bg-cs-green/10 text-cs-green border border-cs-green/30 font-mono text-[10px] font-bold">
                  HEALTHY
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-1.5 leading-normal">
                demoparser2 C++ binding parsing Valve Source 2 PBDEMS2 packets.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between font-mono text-xs">
              <span className="text-text-tertiary">Container:</span>
              <span className="text-cs-green font-bold">Source 2 Native</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-panel border border-border-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-text-primary font-bold">Feature Vectorizer</span>
                <span className="px-2 py-0.5 rounded bg-cs-green/10 text-cs-green border border-cs-green/30 font-mono text-[10px] font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-1.5 leading-normal">
                256-tick sliding window feature generator &amp; kinematic derivatives.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between font-mono text-xs">
              <span className="text-text-tertiary">Window:</span>
              <span className="text-cs-orange font-bold">256 ticks (128 stride)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-panel border border-border-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-text-primary font-bold">Forensic Proof Engine</span>
                <span className="px-2 py-0.5 rounded bg-cs-orange/10 text-cs-orange border border-cs-orange/30 font-mono text-[10px] font-bold">
                  EXPANDED
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-1.5 leading-normal">
                Plain-text kill descriptions, hitgroups, smoke/blind tags &amp; reasoning.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between font-mono text-xs">
              <span className="text-text-tertiary">Output:</span>
              <span className="text-cs-amber font-bold">Human Readable</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-panel border border-border-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-text-primary font-bold">Classifier Tribunal</span>
                <span className="px-2 py-0.5 rounded bg-cs-green/10 text-cs-green border border-cs-green/30 font-mono text-[10px] font-bold">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-1.5 leading-normal">
                XGBoost anomaly scoring with calibrated threshold evaluation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between font-mono text-xs">
              <span className="text-text-tertiary">Inference:</span>
              <span className="text-text-primary font-bold">Local CPU/GPU</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
