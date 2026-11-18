import React, { useState, useEffect } from 'react';
import { api, TrackedPlayer } from '../services/api';

interface PlayersIndexPageProps {
  onSelectPlayer: (playerId: string) => void;
}

export const PlayersIndexPage: React.FC<PlayersIndexPageProps> = ({
  onSelectPlayer,
}) => {
  const [steamIdInput, setSteamIdInput] = useState<string>('');
  const [players, setPlayers] = useState<TrackedPlayer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        const data = await api.listPlayers();
        setPlayers(data);
      } catch (err) {
        console.error('Failed to load tracked players:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (steamIdInput.trim()) {
      onSelectPlayer(steamIdInput.trim());
    }
  };

  const filteredPlayers = players.filter((p) => {
    const matchesQuery =
      p.player_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.player_id.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      p.overall_verdict.toLowerCase() === statusFilter.toLowerCase();
    return matchesQuery && matchesStatus;
  });

  const totalFlagged = players.filter((p) => p.overall_verdict === 'Flagged').length;
  const totalClean = players.filter((p) => p.overall_verdict === 'Clean').length;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Title & Stats Header Banner */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-card border border-border-subtle p-5 rounded-xl shadow-lg">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-text-primary tracking-tight font-sans">
              Player Registry &amp; Kinematic Tracking
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cs-orange/15 text-cs-orange border border-cs-orange/30">
              CROSS-MATCH TRACKING
            </span>
          </div>
          <p className="text-xs text-text-tertiary">
            Aggregated crosshair kinematics, anomalous sliding windows, and historical verdicts across all analyzed CS2 matches
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-panel border border-border-subtle rounded-lg">
            <span className="text-text-tertiary">Tracked:</span>
            <span className="text-text-primary font-bold">{players.length} Players</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cs-red/10 border border-cs-red/30 rounded-lg text-cs-red">
            <span className="material-symbols-outlined text-sm">warning</span>
            <span className="font-bold">{totalFlagged} Flagged</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cs-green/10 border border-cs-green/30 rounded-lg text-cs-green">
            <span className="material-symbols-outlined text-sm">verified</span>
            <span className="font-bold">{totalClean} Clean</span>
          </div>
        </div>
      </section>

      {/* Manual SteamID Search & Quick Filter Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SteamID Direct Lookup Box */}
        <div className="lg:col-span-5 bg-surface-card p-4 rounded-xl border border-border-subtle shadow-md flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary font-medium">
              Direct SteamID64 Dossier Lookup
            </span>
            <span className="text-xs text-text-tertiary">
              Jump directly to any combatant's telemetry record
            </span>
          </div>
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-base">
                person_search
              </span>
              <input
                type="text"
                placeholder="Enter SteamID64..."
                value={steamIdInput}
                onChange={(e) => setSteamIdInput(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-surface-panel text-text-primary placeholder:text-text-tertiary font-mono text-xs rounded-lg outline-none border border-border-subtle focus:border-cs-orange transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-cs-orange text-black font-extrabold rounded-lg text-xs font-mono shadow-sm hover:bg-cs-orange-hover transition-all"
            >
              Lookup
            </button>
          </form>
        </div>

        {/* Filter & Live Search in Tracked Players */}
        <div className="lg:col-span-7 bg-surface-card p-4 rounded-xl border border-border-subtle shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-base">
              search
            </span>
            <input
              type="text"
              placeholder="Search player name or steam ID..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-surface-panel text-text-primary placeholder:text-text-tertiary font-mono text-xs rounded-lg outline-none border border-border-subtle focus:border-cs-orange transition-all"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
            <span className="text-text-tertiary text-[11px]">Verdict:</span>
            {['all', 'flagged', 'clean'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded text-[11px] font-semibold border transition-all ${
                  statusFilter === st
                    ? st === 'flagged'
                      ? 'bg-cs-red text-white border-cs-red'
                      : st === 'clean'
                      ? 'bg-cs-green text-black border-cs-green'
                      : 'bg-cs-orange text-black border-cs-orange'
                    : 'bg-surface-panel text-text-secondary border-border-subtle hover:text-text-primary'
                }`}
              >
                {st.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tracked Players Data Table */}
      <section className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 flex items-center justify-between border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-cs-orange">group</span>
            <h3 className="font-bold text-sm text-text-primary">Tracked Combatant Database</h3>
          </div>
          <span className="font-mono text-xs text-text-tertiary">
            Showing {filteredPlayers.length} of {players.length} players
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-text-tertiary text-xs font-mono flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-cs-orange text-xl">sync</span>
            <span>Aggregating player telemetry across match replays...</span>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-3xl text-text-tertiary">person_off</span>
            <p className="text-sm font-semibold text-text-primary">No Tracked Players Found</p>
            <p className="text-xs text-text-tertiary">
              {players.length === 0
                ? 'Ingest CS2 match demos to automatically index player kinematics.'
                : 'No players match your search filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary bg-surface-panel/70 border-b border-border-subtle">
                  <th className="py-3 px-4">Player Handle &amp; SteamID</th>
                  <th className="py-3 px-3">Matches Analyzed</th>
                  <th className="py-3 px-3">Total Windows</th>
                  <th className="py-3 px-3">Flagged Windows</th>
                  <th className="py-3 px-3">Anomaly Ratio</th>
                  <th className="py-3 px-3">Integrity Verdict</th>
                  <th className="py-3 px-4 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-mono">
                {filteredPlayers.map((player) => {
                  const isSus = player.overall_verdict === 'Flagged';
                  return (
                    <tr
                      key={player.player_id}
                      onClick={() => onSelectPlayer(player.player_id)}
                      className={`hover:bg-surface-card-hover transition-colors cursor-pointer group ${
                        isSus ? 'bg-cs-red/5 hover:bg-cs-red/10 border-l-4 border-l-cs-red' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                            isSus ? 'bg-cs-red/20 text-cs-red border border-cs-red/30' : 'bg-surface-panel text-text-secondary border border-border-subtle'
                          }`}>
                            {player.player_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-text-primary text-xs font-mono group-hover:text-cs-orange transition-colors flex items-center gap-1.5">
                              {player.player_name}
                              {isSus && (
                                <span className="material-symbols-outlined text-xs text-cs-red" title="Anomaly Flagged">
                                  gavel
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-text-tertiary font-mono">
                              STEAM_{player.player_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-text-secondary">
                        <span className="font-semibold text-text-primary">{player.matches_analyzed}</span> match(es)
                      </td>

                      <td className="py-3 px-3 text-text-secondary">
                        {player.total_windows.toLocaleString()}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`font-bold ${isSus ? 'text-cs-red' : 'text-text-primary'}`}>
                          {player.suspicious_windows}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-surface-panel overflow-hidden border border-border-subtle">
                            <div
                              className={`h-full ${isSus ? 'bg-cs-red' : 'bg-cs-green'}`}
                              style={{ width: `${Math.min(player.overall_suspicious_ratio * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`font-bold ${isSus ? 'text-cs-red' : 'text-cs-green'}`}>
                            {(player.overall_suspicious_ratio * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase border ${
                            isSus
                              ? 'bg-cs-red/20 text-cs-red border-cs-red/40'
                              : 'bg-cs-green/10 text-cs-green border-cs-green/30'
                          }`}
                        >
                          {player.overall_verdict}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPlayer(player.player_id);
                          }}
                          className="text-cs-orange hover:text-cs-orange-hover font-bold hover:underline"
                        >
                          Inspect Dossier →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
