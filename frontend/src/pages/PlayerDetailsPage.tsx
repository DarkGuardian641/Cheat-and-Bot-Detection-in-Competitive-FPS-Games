import React, { useState, useEffect } from 'react';
import { api, PlayerDetail } from '../services/api';

interface PlayerDetailsPageProps {
  playerId: string;
  onBack: () => void;
  onSelectMatch: (matchId: string) => void;
}

export const PlayerDetailsPage: React.FC<PlayerDetailsPageProps> = ({
  playerId,
  onBack,
  onSelectMatch,
}) => {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        setLoading(true);
        const data = await api.getPlayerDetails(playerId);
        setPlayer(data);
      } catch (err: any) {
        setError(err.message || 'Failed loading player data');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [playerId]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined animate-spin text-4xl text-cs-orange">sync</span>
        <p className="text-sm font-semibold text-text-primary">Loading Player Telemetry Profile...</p>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined text-4xl text-cs-red">person_off</span>
        <p className="text-base font-bold text-text-primary">Player Not Found</p>
        <p className="text-xs text-text-tertiary">{error}</p>
        <button
          onClick={onBack}
          className="mt-2 px-4 py-2 bg-surface-card border border-border-subtle text-text-primary rounded-lg text-xs font-mono font-semibold"
        >
          Back
        </button>
      </div>
    );
  }

  const isFlagged = player.overall_verdict === 'Flagged';

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header and Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-cs-orange hover:text-cs-orange-hover text-xs font-mono font-semibold"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Player Registry</span>
            </button>
            <span className="text-border-subtle text-xs">/</span>
            <span className="font-mono text-xs text-text-tertiary">{player.player_id}</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <span>{player.player_name}</span>
            <span
              className={`px-2.5 py-0.5 rounded font-mono text-xs font-bold uppercase border ${
                isFlagged
                  ? 'bg-cs-red/20 text-cs-red border-cs-red/40'
                  : 'bg-cs-green/10 text-cs-green border-cs-green/30'
              }`}
            >
              {player.overall_verdict.toUpperCase()}
            </span>
          </h1>
          <p className="text-xs text-text-tertiary font-mono">
            SteamID64: {player.player_id} • Evaluated across {player.matches_analyzed} match demo(s)
          </p>
        </div>
      </div>

      {/* Aggregate Profile Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-card p-5 rounded-xl border border-border-subtle shadow-md flex flex-col justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary">
            Matches Evaluated
          </span>
          <span className="text-3xl font-extrabold text-text-primary tracking-tight mt-1 font-mono">
            {player.matches_analyzed}
          </span>
          <span className="text-xs font-mono text-text-tertiary mt-2">Historical replays</span>
        </div>

        <div className="bg-surface-card p-5 rounded-xl border border-border-subtle shadow-md flex flex-col justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary">
            Total Telemetry Windows
          </span>
          <span className="text-3xl font-extrabold text-text-primary tracking-tight mt-1 font-mono">
            {player.total_windows}
          </span>
          <span className="text-xs font-mono text-text-tertiary mt-2">256-tick increments</span>
        </div>

        <div className="bg-surface-card p-5 rounded-xl border border-border-subtle shadow-md flex flex-col justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary">
            Flagged Windows
          </span>
          <span className={`text-3xl font-extrabold tracking-tight mt-1 font-mono ${isFlagged ? 'text-cs-red' : 'text-cs-green'}`}>
            {player.suspicious_windows}
          </span>
          <span className="text-xs font-mono text-text-tertiary mt-2">ML threshold exceeded</span>
        </div>

        <div className="bg-surface-card p-5 rounded-xl border border-border-subtle shadow-md flex flex-col justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary">
            Overall Anomaly Ratio
          </span>
          <span className={`text-3xl font-extrabold tracking-tight mt-1 font-mono ${isFlagged ? 'text-cs-red' : 'text-cs-green'}`}>
            {((player.overall_suspicious_ratio || 0) * 100).toFixed(1)}%
          </span>
          <span className="text-xs font-mono text-text-tertiary mt-2">Lifetime mean</span>
        </div>
      </section>

      {/* Match History Table */}
      <section className="bg-surface-card p-6 rounded-xl border border-border-subtle shadow-lg flex flex-col gap-4">
        <h2 className="text-base font-bold text-text-primary">Match Replay History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-text-tertiary font-mono uppercase text-[10px] bg-surface-panel/60">
                <th className="py-2.5 px-3">Match ID</th>
                <th className="py-2.5 px-3">Windows</th>
                <th className="py-2.5 px-3">Suspect</th>
                <th className="py-2.5 px-3">Anomaly Ratio</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border-subtle font-mono">
              {(player.matches || []).map((m) => (
                <tr key={m.match_id} className="hover:bg-surface-card-hover transition-colors">
                  <td className="py-3 px-3 text-text-primary font-semibold">{m.match_id.slice(0, 16)}...</td>
                  <td className="py-3 px-3 text-text-secondary">{m.total_windows}</td>
                  <td className="py-3 px-3">
                    <span className={m.suspicious_windows > 0 ? 'text-cs-red font-bold' : 'text-text-primary'}>
                      {m.suspicious_windows}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={m.suspicious_windows > 0 ? 'text-cs-red font-bold' : 'text-cs-green'}>
                      {((m.suspicious_ratio || 0) * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onSelectMatch(m.match_id)}
                      className="text-cs-orange hover:text-cs-orange-hover font-bold hover:underline"
                    >
                      Inspect Match →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
