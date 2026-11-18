import React, { useState } from 'react';
import { MatchListItem } from '../services/api';

interface MatchesPageProps {
  onSelectMatch: (matchId: string) => void;
  matches?: MatchListItem[];
  onNavigateUpload?: () => void;
  loading?: boolean;
}

export const MatchesPage: React.FC<MatchesPageProps> = ({
  onSelectMatch,
  matches = [],
  onNavigateUpload,
  loading = false,
}) => {
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = matches.filter((m) => {
    const matchesQuery =
      m.match_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      m.filename.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || m.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            Match Vault &amp; Telemetry Index
          </h1>
          <p className="text-xs text-text-tertiary mt-0.5">
            Indexed CS2 replays, telemetry window volumes, and forensic findings
          </p>
        </div>

        {onNavigateUpload && (
          <button
            onClick={onNavigateUpload}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-cs-orange to-amber-600 text-black font-extrabold rounded-lg text-xs font-mono shadow-md shadow-cs-orange/20 hover:from-orange-600 hover:to-amber-700 transition-all self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-sm">cloud_upload</span>
            <span>INGEST NEW DEMO</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-card p-4 rounded-xl border border-border-subtle flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-base">
            search
          </span>
          <input
            type="text"
            placeholder="Filter match ID or filename..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface-panel text-text-primary placeholder:text-text-tertiary font-mono text-xs rounded-lg outline-none border border-border-subtle focus:border-cs-orange transition-all"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {['all', 'completed', 'processing', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded font-mono text-[11px] capitalize transition-colors border ${
                statusFilter === st
                  ? 'bg-cs-orange text-black border-cs-orange font-bold'
                  : 'bg-surface-panel text-text-secondary border-border-subtle hover:text-text-primary'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Matches Table */}
      <div className="bg-surface-card p-6 rounded-xl border border-border-subtle shadow-lg">
        {loading ? (
          <div className="py-12 text-center text-text-tertiary text-sm font-mono flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-cs-orange">sync</span>
            <span>Loading matches...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-3xl text-text-tertiary">search_off</span>
            <p className="text-sm font-semibold text-text-primary">No Matches Found</p>
            <p className="text-xs text-text-tertiary">
              No matching replays located. Ingest a demo from <code className="text-text-secondary">sample_demos/</code> to view forensics.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-text-tertiary font-mono uppercase text-[10px] bg-surface-panel/60">
                  <th className="py-3 px-3">Filename</th>
                  <th className="py-3 px-3">Match ID</th>
                  <th className="py-3 px-3">Windows</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-mono">
                {filtered.map((m) => (
                  <tr
                    key={m.match_id}
                    onClick={() => onSelectMatch(m.match_id)}
                    className="hover:bg-surface-card-hover transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3">
                      <span className="font-semibold text-text-primary group-hover:text-cs-orange transition-colors">
                        {m.filename}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-text-tertiary text-[11px]">{m.match_id.slice(0, 16)}...</td>
                    <td className="py-3 px-3 text-text-secondary text-[11px]">
                      {m.total_windows || 0} windows
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-semibold border ${
                          m.status === 'completed'
                            ? 'bg-cs-green/10 text-cs-green border-cs-green/30'
                            : 'bg-cs-orange/10 text-cs-orange border-cs-orange/30'
                        }`}
                      >
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMatch(m.match_id);
                        }}
                        className="text-cs-orange hover:text-cs-orange-hover font-bold hover:underline"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
