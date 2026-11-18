import React from 'react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  serverOnline: boolean;
  defaultModel: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  serverOnline,
  defaultModel,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Live Overview', icon: 'dashboard' },
    { id: 'new-analysis', label: 'Ingest Demo (.dem)', icon: 'cloud_upload' },
    { id: 'matches', label: 'Match Vault', icon: 'sports_esports' },
    { id: 'players', label: 'Player Registry', icon: 'group' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-panel border-r border-border-subtle z-50 flex flex-col justify-between p-4">
      <div className="flex flex-col gap-6">
        {/* Platform Brand Header */}
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cs-orange to-amber-600 flex items-center justify-center shadow-lg shadow-cs-orange/20 border border-cs-orange/30">
            <span className="material-symbols-outlined text-black font-bold text-xl">shield</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-text-primary text-base tracking-tight font-sans">SENTINEL</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cs-orange/20 text-cs-orange border border-cs-orange/30">
                CS2
              </span>
            </div>
            <span className="font-mono text-[10px] text-text-tertiary tracking-wider uppercase">
              Esports Integrity Engine
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5">
          <div className="px-2 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-text-tertiary">
            Operations Console
          </div>
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left border ${
                  isActive
                    ? 'bg-cs-orange/15 text-cs-orange font-semibold border-cs-orange/30 shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-card border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cs-orange animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Status Card */}
      <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-card border border-border-subtle">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                serverOnline
                  ? 'bg-cs-green shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : 'bg-cs-red shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              }`}
            />
            Telemetry Node
          </span>
          <span
            className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              serverOnline
                ? 'bg-cs-green/10 text-cs-green border border-cs-green/20'
                : 'bg-cs-red/10 text-cs-red border border-cs-red/20'
            }`}
          >
            {serverOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 font-mono text-[11px] text-text-tertiary pt-2 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-text-secondary">
              <span className="material-symbols-outlined text-xs text-cs-green">speed</span>
              Pipeline
            </span>
            <span className="text-text-primary font-semibold">Sub-tick v2.4</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-text-secondary">
              <span className="material-symbols-outlined text-xs text-cs-orange">memory</span>
              Classifier
            </span>
            <span className="truncate max-w-[100px] text-text-primary" title={defaultModel}>
              {defaultModel || 'XGBoost'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
