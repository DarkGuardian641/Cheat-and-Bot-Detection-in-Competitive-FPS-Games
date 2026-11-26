import React from 'react';
import { LayoutGrid, Upload, Film, Users } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Overview', short: 'Overview', icon: LayoutGrid, owns: [] as string[] },
  { id: 'matches', label: 'Matches', short: 'Matches', icon: Film, owns: ['match-detail'] },
  { id: 'players', label: 'Players', short: 'Players', icon: Users, owns: ['player-detail'] },
  { id: 'new-analysis', label: 'Upload demo', short: 'Upload', icon: Upload, owns: [] as string[] },
];

const Mark: React.FC = () => (
  <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
    <rect width="32" height="32" rx="7" fill="hsl(var(--rail-2))" />
    <path
      d="M16 6.5 8.5 9.3v6.1c0 4.6 3.2 8.6 7.5 10.1 4.3-1.5 7.5-5.5 7.5-10.1V9.3L16 6.5Z"
      fill="none"
      stroke="hsl(var(--rail-ink))"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="15.5" r="2.4" fill="hsl(var(--ember))" />
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const isActive = (item: (typeof navItems)[number]) => currentTab === item.id || item.owns.includes(currentTab);

  return (
    <aside className="z-30 bg-rail text-rail-ink lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-3 pt-4 lg:pb-6 lg:pt-6">
        <Mark />
        <div className="leading-tight">
          <div className="font-semibold tracking-[-0.01em]">Sentinel</div>
          <div className="text-xs text-rail-ink-2">CS2 match review</div>
        </div>
      </div>

      <nav
        aria-label="Primary"
        className="grid grid-cols-4 gap-1 px-2 pb-2 lg:flex lg:flex-1 lg:flex-col lg:px-3 lg:pb-0"
      >
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex h-9 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-sm transition-colors lg:justify-start lg:gap-2.5 lg:px-3 ${
                active
                  ? 'bg-rail-2 font-medium text-rail-ink'
                  : 'text-rail-ink-2 hover:bg-rail-2/60 hover:text-rail-ink'
              }`}
            >
              <Icon size={16} strokeWidth={1.8} className={`hidden shrink-0 sm:block ${active ? 'text-[#f08a5d]' : ''}`} />
              <span className="truncate lg:hidden">{item.short}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="group hidden border-t border-rail-2 px-5 py-5 lg:block">
        <p className="text-xs text-rail-ink-2">Designed by</p>
        <p className="mt-1 text-[15px] font-medium tracking-[-0.01em] text-rail-ink">
          <span className="bg-[linear-gradient(hsl(var(--ember)),hsl(var(--ember)))] bg-[length:1.25rem_2px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 ease-out group-hover:bg-[length:100%_2px]">
            Atharva Baikar
          </span>
        </p>
      </div>
    </aside>
  );
};
