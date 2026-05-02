import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { ChatPanel } from '../ChatPanel';
import { RuntimePanel } from './drawer/RuntimePanel';
import { ArtifactsPanel } from './drawer/ArtifactsPanel';
import { HandoffPanel } from './drawer/HandoffPanel';
import type { RuntimeData } from '../../types';

const DRAWER_TABS = [
  { id: 'chat', label: '对话' },
  { id: 'runtime', label: '运行态' },
  { id: 'artifacts', label: '产物' },
  { id: 'handoff', label: '交接' },
];

interface ContextDrawerProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  socket: any;
  projectId: string;
  activeExpertId: string;
  runtimeData?: RuntimeData;
}

export function ContextDrawer({
  collapsed,
  onToggleCollapse,
  activeTab,
  onTabChange,
  socket,
  projectId,
  activeExpertId,
  runtimeData,
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
        {/* Chat tab: always mounted, display:none when hidden to preserve blob URLs.
            Chat tab 不加外层 padding，由 ChatPanel 自管，避免双重留白 */}
        <div style={{ display: activeTab === 'chat' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <ChatPanel
            isOpen={activeTab === 'chat'}
            onToggle={onToggleCollapse}
            expertId={activeExpertId}
            projectId={projectId}
            socket={socket}
          />
        </div>

        {activeTab === 'runtime' && (
          <div className="shell-drawer__pane--padded">
            <RuntimePanel
              currentModel={runtimeData?.currentModel}
              logs={runtimeData?.logs}
              actions={runtimeData?.actions}
              activeAction={runtimeData?.activeAction}
              isLoading={runtimeData?.isLoading}
              startTime={runtimeData?.startTime}
              socket={socket}
            />
          </div>
        )}

        {activeTab === 'artifacts' && (
          <div className="shell-drawer__pane--padded">
            <ArtifactsPanel projectId={projectId} />
          </div>
        )}

        {activeTab === 'handoff' && (
          <div className="shell-drawer__pane--padded">
            <HandoffPanel projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  );
}
