import React, { useState } from 'react';
import { FileUp, Search } from 'lucide-react';
import { MatchListItem } from '../services/api';
import {
  displayFilename,
  EmptyState,
  formatDate,
  formatNumber,
  JobStatusBadge,
  Loading,
  Mono,
  PageHeader,
  Segmented,
} from '../components/ui';

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

  const q = filterQuery.trim().toLowerCase();
  const byQuery = matches.filter(
    (m) => !q || m.match_id.toLowerCase().includes(q) || m.filename.toLowerCase().includes(q),
  );
  const inProgress = (s: string) => s === 'pending' || s === 'processing';
  const filtered = byQuery.filter((m) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'flagged') return m.status === 'completed' && m.suspicious_players_count > 0;
    if (statusFilter === 'processing') return inProgress(m.status);
    return m.status === statusFilter;
  });

  const counts = {
    all: byQuery.length,
    flagged: byQuery.filter((m) => m.status === 'completed' && m.suspicious_players_count > 0).length,
    processing: byQuery.filter((m) => inProgress(m.status)).length,
    failed: byQuery.filter((m) => m.status === 'failed').length,
  };

  return (
    <div>
      <PageHeader
        title="Matches"
        description="Every demo that has been uploaded, newest first."
        actions={
          onNavigateUpload && (
            <button onClick={onNavigateUpload} className="btn-primary">
              <FileUp size={16} />
              Upload demo
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            aria-label="Filter matches"
            placeholder="Filter by file name or ID"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="field pl-9"
          />
        </div>
        <div className="overflow-x-auto">
          <Segmented
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'flagged', label: 'Flagged', count: counts.flagged },
              { value: 'processing', label: 'In progress', count: counts.processing },
              { value: 'failed', label: 'Failed', count: counts.failed },
            ]}
          />
        </div>
      </div>

      <div className="panel overflow-hidden">
        {loading && matches.length === 0 ? (
          <Loading label="Loading matches" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={matches.length === 0 ? 'No matches yet' : 'No matches fit these filters'}
            body={
              matches.length === 0
                ? 'Upload a .dem file and its report will show up here.'
                : 'Try a different name, or switch the status filter back to All.'
            }
            action={
              matches.length === 0 && onNavigateUpload ? (
                <button className="btn-primary" onClick={onNavigateUpload}>
                  Upload demo
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-sunken/50">
                <tr>
                  <th className="th">Demo</th>
                  <th className="th">ID</th>
                  <th className="th">Result</th>
                  <th className="th text-right">Windows</th>
                  <th className="th text-right">Finished</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((m) => (
                  <tr
                    key={m.match_id}
                    onClick={() => onSelectMatch(m.match_id)}
                    className="cursor-pointer transition-colors hover:bg-sunken/60"
                  >
                    <td className="td max-w-[380px]">
                      <button
                        className="block max-w-full truncate text-left font-medium text-ink hover:underline"
                        title={displayFilename(m.filename)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMatch(m.match_id);
                        }}
                      >
                        {displayFilename(m.filename)}
                      </button>
                    </td>
                    <td className="td">
                      <Mono className="text-ink-3">{m.match_id.replace(/^analysis_/, '')}</Mono>
                    </td>
                    <td className="td">
                      <JobStatusBadge status={m.status} flaggedCount={m.suspicious_players_count} />
                    </td>
                    <td className="td num text-right text-ink-2">{formatNumber(m.total_windows)}</td>
                    <td className="td num whitespace-nowrap text-right text-ink-2">{formatDate(m.completed_at)}</td>
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
