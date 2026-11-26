import React, { useMemo } from 'react';
import { EvidenceWindow } from '../services/api';
import { formatClock } from './ui';

interface SuspicionTimelineProps {
  windows: EvidenceWindow[];
  threshold: number;
  onSelectPlayer: (steamid: string) => void;
}

/**
 * One row per player, match time left to right. Each mark is one scored
 * 256-tick window; its height is the model score, with the threshold drawn
 * as a hairline so marks that cross it read immediately.
 */
export const SuspicionTimeline: React.FC<SuspicionTimelineProps> = ({ windows, threshold, onSelectPlayer }) => {
  const { rows, span, ticks } = useMemo(() => {
    const byPlayer = new Map<string, { name: string; items: EvidenceWindow[]; peak: number }>();
    let maxEnd = 0;
    for (const w of windows) {
      maxEnd = Math.max(maxEnd, w.end_time);
      const entry = byPlayer.get(w.steamid) ?? { name: w.player_name, items: [], peak: 0 };
      entry.items.push(w);
      entry.peak = Math.max(entry.peak, w.suspicion_score);
      byPlayer.set(w.steamid, entry);
    }
    // Round the axis up to the next 5 minutes so tick labels stay even.
    const span = Math.max(300, Math.ceil(maxEnd / 300) * 300);
    const step = span > 2400 ? 600 : 300;
    const ticks: number[] = [];
    for (let t = 0; t <= span; t += step) ticks.push(t);
    const rows = [...byPlayer.entries()]
      .map(([steamid, v]) => ({ steamid, ...v }))
      .sort((a, b) => b.items.length - a.items.length || b.peak - a.peak);
    return { rows, span, ticks };
  }, [windows]);

  if (rows.length === 0) return null;

  const ROW = 36;

  return (
    <div className="panel px-4 pb-4 pt-5 sm:px-5">
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          {rows.map((row) => (
            <div key={row.steamid} className="grid grid-cols-[168px_minmax(0,1fr)] items-end gap-4">
              <button
                onClick={() => onSelectPlayer(row.steamid)}
                className="truncate pb-1.5 text-left text-sm font-medium text-ink hover:underline"
                title={row.name}
              >
                {row.name}
                <span className="num ml-1.5 font-normal text-ink-3">{row.items.length}</span>
              </button>
              <div className="relative border-b border-line" style={{ height: ROW }}>
                {/* threshold line */}
                <div
                  className="absolute inset-x-0 border-t border-dashed border-ink-3/40"
                  style={{ bottom: `${threshold * 100}%` }}
                  aria-hidden
                />
                {row.items.map((w, i) => {
                  const over = w.suspicion_score >= threshold;
                  return (
                    <span
                      key={`${w.start_tick}-${i}`}
                      title={`${w.player_name} · ${formatClock(w.start_time)}–${formatClock(w.end_time)} · ticks ${w.start_tick}–${w.end_tick} · score ${w.suspicion_score.toFixed(3)}`}
                      className={`absolute bottom-0 w-[3px] rounded-t-sm transition-opacity hover:opacity-70 ${
                        over ? 'bg-flag' : 'bg-ink-3/50'
                      }`}
                      style={{
                        left: `calc(${(w.start_time / span) * 100}% - 1.5px)`,
                        height: `${Math.max(w.suspicion_score, 0.08) * 100}%`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          <div className="grid grid-cols-[168px_minmax(0,1fr)] gap-4">
            <div />
            <div className="relative h-6">
              {ticks.map((t) => (
                <span
                  key={t}
                  className="num absolute top-1.5 -translate-x-1/2 text-xs text-ink-3 first:translate-x-0 last:-translate-x-full"
                  style={{ left: `${(t / span) * 100}%` }}
                >
                  {formatClock(t)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Bar height is the model score. Dashed line is the {threshold.toFixed(2)} threshold. Hover a bar for its
        tick range.
      </p>
    </div>
  );
};
