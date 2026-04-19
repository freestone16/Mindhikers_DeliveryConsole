import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { ChatPanel } from '../ChatPanel';

const DRAWER_TABS = [
  { id: 'chat', label: 'Chat' },
  { id: 'runtime', label: 'Runtime' },
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'handoff', label: 'Handoff' },
];

interface ContextDrawerProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  socket: any;
  projectId: string;
  activeExpertId: string;
}

export function ContextDrawer({
  collapsed,
  onToggleCollapse,
  activeTab,
  onTabChange,
  socket,
  projectId,
  activeExpertId,
}: ContextDrawerProps) {
  if (collapsed) {
    return (
      <div className="shell-drawer shell-drawer--collapsed">
        <button
          onClick={onToggleCollapse}
          style={{
            display: 'grid', placeItems: 'center', width: '100%', height: 44,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--shell-muted)', borderBottom: '1px solid var(--shell-border)',
          }}
        >
          <PanelRightOpen style={{ width: 16, height: 16 }} />
        </button>
      </div>
    );
  }

  return (
    <div className="shell-drawer">
      <div className="shell-drawer__tabs">
        {DRAWER_TABS.map(tab => (
          <button
            key={tab.id}
            className={`shell-drawer__tab${tab.id === activeTab ? ' shell-drawer__tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={onToggleCollapse}
          style={{
            display: 'grid', placeItems: 'center', width: 36, flexShrink: 0,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--shell-muted)', marginLeft: 'auto',
          }}
        >
          <PanelRightClose style={{ width: 14, height: 14 }} />
        </button>
      </div>
      <div className="shell-drawer__content">
        {/* Chat tab: always mounted, display:none when hidden to preserve blob URLs */}
        <div style={{ display: activeTab === 'chat' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <ChatPanel
            isOpen={activeTab === 'chat'}
            onToggle={onToggleCollapse}
            expertId={activeExpertId}
            projectId={projectId}
            socket={socket}
          />
        </div>


        {activeTab !== 'chat' && (
          <div className="shell-drawer__empty">
            <span>{DRAWER_TABS.find(t => t.id === activeTab)?.label} panel placeholder</span>
          </div>
        )}
      </div>
    </div>
  );
}
