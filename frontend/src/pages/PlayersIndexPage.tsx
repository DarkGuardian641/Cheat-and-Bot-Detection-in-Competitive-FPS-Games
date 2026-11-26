import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { TrackedPlayer } from '../services/api';
import {
  EmptyState,
  formatDate,
  formatNumber,
  Loading,
  Mono,
  PageHeader,
  RatioBar,
  Segmented,
  VerdictBadge,
} from '../components/ui';

interface PlayersIndexPageProps {
  players: TrackedPlayer[];
  loading: boolean;
  onSelectPlayer: (playerId: string) => void;
}

export const PlayersIndexPage: React.FC<PlayersIndexPageProps> = ({ players, loading, onSelectPlayer }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const q = searchFilter.trim().toLowerCase();
  const byQuery = players.filter(
    (p) => !q || p.player_name.toLowerCase().includes(q) || p.player_id.toLowerCase().includes(q),
  );
  const filtered = byQuery.filter(
    (p) => statusFilter === 'all' || p.overall_verdict.toLowerCase() === statusFilter,
  );

  // A full SteamID64 that isn't in the list can still be looked up directly.
  const looksLikeSteamId = /^\d{17}$/.test(searchFilter.trim());

  return (
    <div>
      <PageHeader
        title="Players"
        description="Everyone seen across analyzed demos. Totals add up windows from every match a player appears in."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          className="relative w-full sm:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (filtered.length === 1) onSelectPlayer(filtered[0].player_id);
            else if (looksLikeSteamId) onSelectPlayer(searchFilter.trim());
          }}
        >
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            aria-label="Search players"
            placeholder="Name or SteamID64"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="field pl-9"
          />
        </form>
        <Segmented
          label="Verdict"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All', count: byQuery.length },
            { value: 'flagged', label: 'Flagged', count: byQuery.filter((p) => p.overall_verdict === 'Flagged').length },
            { value: 'clean', label: 'Clean', count: byQuery.filter((p) => p.overall_verdict === 'Clean').length },
          ]}
        />
      </div>

      <div className="panel overflow-hidden">
        {loading && players.length === 0 ? (
          <Loading label="Loading players" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={players.length === 0 ? 'No players yet' : 'No players match'}
            body={
              players.length === 0
                ? 'Players are added as each demo finishes analysis.'
                : looksLikeSteamId
                  ? 'That SteamID64 is not in the loaded list. Press Enter to look it up directly.'
                  : 'Try another name or SteamID64, or clear the verdict filter.'
            }
            action={
              looksLikeSteamId ? (
                <button className="btn-secondary" onClick={() => onSelectPlayer(searchFilter.trim())}>
                  Look up {searchFilter.trim()}
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-sunken/50">
                <tr>
                  <th className="th">Player</th>
                  <th className="th">Verdict</th>
                  <th className="th">Flagged share</th>
                  <th className="th text-right">Flagged / total</th>
                  <th className="th text-right">Matches</th>
                  <th className="th text-right">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((player) => {
                  const flagged = player.overall_verdict === 'Flagged';
                  return (
                    <tr
                      key={player.player_id}
                      onClick={() => onSelectPlayer(player.player_id)}
                      className="cursor-pointer transition-colors hover:bg-sunken/60"
                    >
                      <td className="td">
                        <button
                          className="block text-left font-medium text-ink hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPlayer(player.player_id);
                          }}
                        >
                          {player.player_name}
                        </button>
                        <Mono className="text-xs text-ink-3">{player.player_id}</Mono>
                      </td>
                      <td className="td">
                        <VerdictBadge verdict={player.overall_verdict} />
                      </td>
                      <td className="td">
                        <RatioBar value={player.overall_suspicious_ratio} flagged={flagged} />
                      </td>
                      <td className="td num text-right text-ink-2">
                        {formatNumber(player.suspicious_windows)} / {formatNumber(player.total_windows)}
                      </td>
                      <td className="td num text-right text-ink-2">{player.matches_analyzed}</td>
                      <td className="td num whitespace-nowrap text-right text-ink-2">{formatDate(player.last_seen)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
