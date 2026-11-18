import React, { useState, useEffect } from 'react';

interface HeaderProps {
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export const Header: React.FC<HeaderProps> = ({ onSearch, searchQuery = '' }) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format time in Indian Standard Time (IST, UTC+5:30)
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      const formatted = new Intl.DateTimeFormat('en-IN', options).format(now);
      setTimeStr(`${formatted} IST`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface-panel/90 backdrop-blur-xl border-b border-border-subtle z-40 px-6 flex items-center justify-between">
      {/* Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-lg">
            search
          </span>
          <input
            className="w-full pl-9 pr-4 py-1.5 bg-surface-card border border-border-subtle text-text-primary placeholder:text-text-tertiary font-mono text-xs rounded-lg outline-none focus:border-cs-orange focus:ring-1 focus:ring-cs-orange transition-all"
            placeholder="Search Match ID, SteamID64, or Demo SHA-256..."
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
        </div>
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-card border border-border-subtle text-text-secondary text-xs font-mono shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-cs-orange"></span>
          <span>VALVE CS2 &amp; FACEIT</span>
        </div>
      </div>

      {/* Right Status Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cs-green/10 border border-cs-green/30 text-cs-green font-mono text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-cs-green animate-pulse" />
          <span>LIVE PIPELINE ACTIVE</span>
        </div>

        <div className="flex items-center gap-1 px-3 py-1 bg-surface-card border border-border-subtle rounded-lg font-mono text-xs text-text-secondary">
          <span className="material-symbols-outlined text-sm text-cs-orange">schedule</span>
          <span>{timeStr}</span>
        </div>
      </div>
    </header>
  );
};
