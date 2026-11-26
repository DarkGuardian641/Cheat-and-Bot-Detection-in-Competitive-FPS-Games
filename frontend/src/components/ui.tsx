import React from 'react';
import { AlertCircle, ArrowLeft, Loader2, PlugZap, TriangleAlert } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

/** Stored demo names are prefixed with the analysis id; strip it for display. */
export function displayFilename(name: string | undefined | null): string {
  if (!name) return 'Untitled demo';
  return name.replace(/^analysis_[a-f0-9]+_/i, '');
}

export function formatPct(ratio: number | undefined | null, digits = 1): string {
  return `${((ratio || 0) * 100).toFixed(digits)}%`;
}

export function formatNumber(n: number | undefined | null): string {
  return (n || 0).toLocaleString();
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Seconds → m:ss, for match-time positions. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function mapLabel(map: string | undefined | null): string {
  if (!map) return 'Unknown map';
  const bare = map.replace(/^de_|^cs_/, '');
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

type Tone = 'flag' | 'clean' | 'pending' | 'neutral';

const toneClasses: Record<Tone, string> = {
  flag: 'bg-flag-soft text-flag',
  clean: 'bg-clean-soft text-clean',
  pending: 'bg-pending-soft text-pending',
  neutral: 'bg-sunken text-ink-2',
};

const dotClasses: Record<Tone, string> = {
  flag: 'bg-flag',
  clean: 'bg-clean',
  pending: 'bg-pending',
  neutral: 'bg-ink-3',
};

export const Badge: React.FC<{ tone: Tone; children: React.ReactNode; className?: string }> = ({
  tone,
  children,
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${toneClasses[tone]} ${className}`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`} aria-hidden />
    {children}
  </span>
);

export const VerdictBadge: React.FC<{ verdict: string | undefined }> = ({ verdict }) => {
  const flagged = verdict?.toLowerCase() === 'flagged';
  return <Badge tone={flagged ? 'flag' : 'clean'}>{flagged ? 'Flagged' : 'Clean'}</Badge>;
};

/**
 * Status of an analysis job. For completed jobs, pass the flagged-player count
 * so the badge can say whether the match needs review.
 */
export const JobStatusBadge: React.FC<{ status: string; flaggedCount?: number }> = ({
  status,
  flaggedCount,
}) => {
  const s = status.toLowerCase();
  if (s === 'completed') {
    if (flaggedCount === undefined) return <Badge tone="neutral">Completed</Badge>;
    return flaggedCount > 0 ? (
      <Badge tone="flag">
        {flaggedCount} flagged
      </Badge>
    ) : (
      <Badge tone="clean">No flags</Badge>
    );
  }
  if (s === 'pending') return <Badge tone="pending">Queued</Badge>;
  if (s === 'processing') return <Badge tone="pending">Analyzing</Badge>;
  if (s === 'failed') return <Badge tone="flag">Failed</Badge>;
  return <Badge tone="neutral">{status}</Badge>;
};

/* ------------------------------------------------------------------ */
/* Layout pieces                                                       */
/* ------------------------------------------------------------------ */

export const PageHeader: React.FC<{
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { label: string; onClick: () => void };
  actions?: React.ReactNode;
}> = ({ title, description, back, actions }) => (
  <header className="mb-8">
    {back && (
      <button
        onClick={back.onClick}
        className="mb-3 -ml-1 inline-flex items-center gap-1.5 rounded px-1 text-sm text-ink-2 hover:text-ink"
      >
        <ArrowLeft size={15} strokeWidth={2} />
        {back.label}
      </button>
    )}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.015em] text-ink">{title}</h1>
        {description && <div className="mt-1.5 max-w-[68ch] text-sm text-ink-2">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </header>
);

export const SectionTitle: React.FC<{
  title: string;
  meta?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ title, meta, children }) => (
  <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
    <div>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {meta && <p className="mt-0.5 text-sm text-ink-3">{meta}</p>}
    </div>
    {children}
  </div>
);

/** A row of figures in one panel, separated by rules. */
export const Figures: React.FC<{
  items: Array<{ label: string; value: React.ReactNode; note?: React.ReactNode; tone?: 'flag' | 'clean' }>;
}> = ({ items }) => (
  <dl className="panel grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-line md:[&>*:nth-child(n+3)]:border-t-0">
    {items.map((item) => (
      <div key={item.label} className="px-5 py-4">
        <dt className="text-sm text-ink-2">{item.label}</dt>
        <dd
          className={`num mt-1 text-2xl font-semibold tracking-[-0.01em] ${
            item.tone === 'flag' ? 'text-flag' : item.tone === 'clean' ? 'text-clean' : 'text-ink'
          }`}
        >
          {item.value}
        </dd>
        {item.note && <dd className="mt-0.5 text-xs text-ink-3">{item.note}</dd>}
      </div>
    ))}
  </dl>
);

/**
 * Horizontal ratio bar with the model threshold marked, so a reader can see
 * at a glance how far past (or short of) the line a value sits.
 */
export const RatioBar: React.FC<{ value: number; flagged: boolean; width?: string }> = ({
  value,
  flagged,
  width = 'w-24',
}) => (
  <div className="flex items-center gap-2.5">
    <div className={`relative h-1.5 ${width} overflow-hidden rounded-full bg-sunken`}>
      <div
        className={`h-full rounded-full ${flagged ? 'bg-flag' : 'bg-clean/70'}`}
        style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }}
      />
    </div>
    <span className={`num text-sm ${flagged ? 'font-medium text-flag' : 'text-ink-2'}`}>{formatPct(value)}</span>
  </div>
);

export const Segmented: React.FC<{
  options: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (v: string) => void;
  label: string;
}> = ({ options, value, onChange, label }) => (
  <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line-strong bg-surface p-0.5">
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          role="radio"
          aria-checked={active}
          onClick={() => onChange(opt.value)}
          className={`h-8 rounded px-3 text-sm transition-colors ${
            active ? 'bg-sunken font-medium text-ink' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {opt.label}
          {opt.count !== undefined && <span className="num ml-1.5 text-ink-3">{opt.count}</span>}
        </button>
      );
    })}
  </div>
);

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export const Loading: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-ink-2" role="status">
    <Loader2 size={16} className="animate-spin text-ink-3" />
    {label}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, body, action, icon }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    {icon && <div className="mb-3 text-ink-3">{icon}</div>}
    <p className="font-medium text-ink">{title}</p>
    {body && <p className="mt-1 max-w-[52ch] text-sm text-ink-2">{body}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ title: string; message?: string | null; action?: React.ReactNode }> = ({
  title,
  message,
  action,
}) => (
  <div className="panel flex flex-col items-center px-6 py-14 text-center">
    <AlertCircle size={22} className="mb-3 text-flag" />
    <p className="font-medium text-ink">{title}</p>
    {message && <p className="mt-1 max-w-[60ch] text-sm text-ink-2">{message}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Mono: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({
  children,
  className = '',
  title,
}) => (
  <span className={`font-mono text-[0.8125rem] ${className}`} title={title}>
    {children}
  </span>
);

export const Callout: React.FC<{ tone: 'warn' | 'error'; title: string; children: React.ReactNode }> = ({
  tone,
  title,
  children,
}) => (
  <div
    className={`mb-6 flex gap-3 rounded-lg border px-4 py-3.5 text-sm ${
      tone === 'error' ? 'border-flag/25 bg-flag-soft' : 'border-pending/25 bg-pending-soft'
    }`}
    role={tone === 'error' ? 'alert' : 'status'}
  >
    {tone === 'error' ? (
      <PlugZap size={18} className="mt-px shrink-0 text-flag" />
    ) : (
      <TriangleAlert size={18} className="mt-px shrink-0 text-pending" />
    )}
    <div>
      <p className="font-medium text-ink">{title}</p>
      <div className="mt-0.5 text-ink-2">{children}</div>
    </div>
  </div>
);
