import type { SidebarTab } from './roundtable/types';
import type { RoundtableStatus } from './roundtable/types';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  sessionStatus: RoundtableStatus | null;
  spikeCount: number;
}

const TAB_ITEMS: Array<{ key: SidebarTab; icon: string; label: string }> = [
  { key: 'proposition', icon: '📋', label: '命题' },
  { key: 'roundtable', icon: '🎭', label: '圆桌' },
  { key: 'spikes', icon: '📊', label: 'Spikes' },
  { key: 'settings', icon: '🔧', label: '设置' },
];

const STATUS_LABELS: Partial<Record<RoundtableStatus, string>> = {
  selecting: '选择哲人中',
  opening: '开场中',
  discussing: '讨论中',
  synthesizing: '综合中',
  awaiting: '等待导演',
  spike_extracting: '提取 Spike',
  completed: '已完成',
};

export const Sidebar = ({
  activeTab,
  onTabChange,
  sessionStatus,
  spikeCount,
}: SidebarProps) => {
  return (
    <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r border-[var(--line-soft)] bg-[var(--surface-0)]">
      <div className="border-b border-[var(--line-soft)] px-4 py-4">
        <h1 className="mh-display text-lg text-[var(--ink-1)]">
          🏛️ Roundtable
        </h1>
        <p className="mt-0.5 text-xs text-[var(--ink-3)]">
          圆桌研讨引擎
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {TAB_ITEMS.map((tab) => {
          const isActive = activeTab === tab.key;
          const hasBadge = tab.key === 'spikes' && spikeCount > 0;

          return (
            <button
              key={tab.key}
              type="button"
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                isActive
                  ? 'bg-[var(--accent-soft)] text-[var(--ink-1)] font-medium'
                  : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
              }`}
              onClick={() => onTabChange(tab.key)}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="flex-1">{tab.label}</span>
              {hasBadge ? (
                <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-xs text-white">
                  {spikeCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {sessionStatus ? (
        <div className="border-t border-[var(--line-soft)] px-4 py-3">
          <div className="text-xs text-[var(--ink-3)]">会话状态</div>
          <div className="mt-1 text-sm font-medium text-[var(--ink-2)]">
            {STATUS_LABELS[sessionStatus] ?? sessionStatus}
          </div>
        </div>
      ) : null}
    </aside>
  );
};
