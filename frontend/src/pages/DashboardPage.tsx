import React from 'react';
import { ChevronRight, FileUp } from 'lucide-react';
import { AnalysisListItem, HealthInfo, TrackedPlayer } from '../services/api';
import {
  Callout,
  displayFilename,
  EmptyState,
  Figures,
  formatDate,
  formatNumber,
  JobStatusBadge,
  Loading,
  PageHeader,
  RatioBar,
  SectionTitle,
} from '../components/ui';

interface DashboardPageProps {
  analyses: AnalysisListItem[];
  players: TrackedPlayer[];
  health: HealthInfo | null;
  serverOnline: boolean;
  onSelectMatch: (matchId: string) => void;
  onSelectPlayer: (playerId: string) => void;
  onNavigateTab: (tab: string) => void;
  loading: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  analyses,
  players,
  health,
  serverOnline,
  onSelectMatch,
  onSelectPlayer,
  onNavigateTab,
  loading,
}) => {
  const completed = analyses.filter((a) => a.status === 'completed');
  const inFlight = analyses.filter((a) => a.status === 'pending' || a.status === 'processing');
  const totalWindows = analyses.reduce((acc, a) => acc + (a.total_windows || 0), 0);
  const flaggedPlayers = players.filter((p) => p.overall_verdict === 'Flagged');
  const reviewQueue = [...flaggedPlayers].sort((a, b) => b.overall_suspicious_ratio - a.overall_suspicious_ratio);

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Every uploaded demo is scored in 256-tick windows. A flag means the model wants a human to look, not that a player is guilty."
        actions={
          <button className="btn-primary" onClick={() => onNavigateTab('new-analysis')}>
            <FileUp size={16} />
            Upload demo
          </button>
        }
      />

      {!serverOnline && !loading && (
        <Callout tone="error" title="Can't reach the backend">
          Start it from the project root with{' '}
          <code className="font-mono text-[0.8125rem] text-ink">python -m uvicorn backend.main:app --port 8000</code>.
          This page retries every 8 seconds.
        </Callout>
      )}

      {serverOnline && health && !health.model_exists && (
        <Callout tone="warn" title="No trained model on disk">
          Existing reports still open, but new uploads will fail until{' '}
          <code className="font-mono text-[0.8125rem] text-ink">models/{health.default_model}</code> exists. Train one
          with <code className="font-mono text-[0.8125rem] text-ink">python -m ml.train</code>.
        </Callout>
      )}

      <Figures
        items={[
          {
            label: 'Demos analyzed',
            value: formatNumber(completed.length),
            note: inFlight.length > 0 ? `${inFlight.length} in progress` : `${analyses.length} uploaded in total`,
          },
          { label: 'Players tracked', value: formatNumber(players.length), note: 'Unique SteamIDs' },
          {
            label: 'Players flagged',
            value: formatNumber(flaggedPlayers.length),
            tone: flaggedPlayers.length > 0 ? 'flag' : undefined,
            note: players.length > 0 ? `of ${players.length} tracked` : undefined,
          },
          { label: 'Windows scored', value: formatNumber(totalWindows), note: '256 ticks each' },
        ]}
      />

      <div className="mt-10 grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
        <section>
          <SectionTitle title="Recent analyses">
            {analyses.length > 0 && (
              <button className="btn-ghost -mr-2 h-8" onClick={() => onNavigateTab('matches')}>
                All matches
                <ChevronRight size={15} />
              </button>
            )}
          </SectionTitle>

          <div className="panel overflow-hidden">
            {loading && analyses.length === 0 ? (
              <Loading label="Loading analyses" />
            ) : analyses.length === 0 ? (
              <EmptyState
                title="No demos yet"
                body="Upload a CS2 .dem file to get a per-player suspicion report."
                action={
                  <button className="btn-primary" onClick={() => onNavigateTab('new-analysis')}>
                    Upload your first demo
                  </button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-sunken/50">
                    <tr>
                      <th className="th">Demo</th>
                      <th className="th">Result</th>
                      <th className="th text-right">Windows</th>
                      <th className="th text-right">Finished</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {analyses.slice(0, 8).map((item) => (
                      <tr
                        key={item.analysis_id}
                        onClick={() => onSelectMatch(item.analysis_id)}
                        className="cursor-pointer transition-colors hover:bg-sunken/60"
                      >
                        <td className="td max-w-[320px]">
                          <button
                            className="block max-w-full truncate text-left font-medium text-ink hover:underline"
                            title={displayFilename(item.filename)}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectMatch(item.analysis_id);
                            }}
                          >
                            {displayFilename(item.filename)}
                          </button>
                        </td>
                        <td className="td">
                          <JobStatusBadge status={item.status} flaggedCount={item.suspicious_players_count} />
                        </td>
                        <td className="td num text-right text-ink-2">{formatNumber(item.total_windows)}</td>
                        <td className="td num whitespace-nowrap text-right text-ink-2">
                          {formatDate(item.completed_at || item.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section>
          <SectionTitle title="Needs review" meta="Flagged players, highest share of flagged windows first" />
          <div className="panel">
            {loading && players.length === 0 ? (
              <Loading label="Loading players" />
            ) : reviewQueue.length === 0 ? (
              <EmptyState
                title="Nothing to review"
                body={players.length === 0 ? 'Players appear here once a demo finishes.' : 'No tracked player is over the threshold.'}
              />
            ) : (
              <ul className="divide-y divide-line">
                {reviewQueue.slice(0, 6).map((p) => (
                  <li key={p.player_id}>
                    <button
                      onClick={() => onSelectPlayer(p.player_id)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-sunken/60"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">{p.player_name}</div>
                        <div className="num text-xs text-ink-3">
                          {p.suspicious_windows} of {formatNumber(p.total_windows)} windows · {p.matches_analyzed}{' '}
                          {p.matches_analyzed === 1 ? 'match' : 'matches'}
                        </div>
                      </div>
                      <RatioBar value={p.overall_suspicious_ratio} flagged width="w-16" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {reviewQueue.length > 6 && (
              <div className="border-t border-line px-4 py-2.5">
                <button className="link text-sm" onClick={() => onNavigateTab('players')}>
                  {reviewQueue.length - 6} more flagged players
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
