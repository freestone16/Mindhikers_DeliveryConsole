import { PenTool, Eye, Music, Image, Video, Megaphone, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { SessionListPanel } from './SessionListPanel';
import type { ScriptFile } from './DeliveryShellLayout';

const WORKSTATIONS = [
  { id: 'Director', label: '影视导演', icon: PenTool },
  { id: 'ShortsMaster', label: '短视频', icon: Video },
  { id: 'ThumbnailMaster', label: '缩略图', icon: Image },
  { id: 'MusicMaster', label: '音乐', icon: Music },
  { id: 'MarketingMaster', label: '营销', icon: Megaphone },
  { id: 'VisualAudit', label: '视觉审计', icon: Eye },
];

interface WorkstationRailProps {
  activeExpertId: string;
  onExpertChange: (id: string) => void;
  projectId: string;
  selectedScriptPath?: string;
  onSelectScript: (projectId: string, path: string) => Promise<boolean>;
  scripts: ScriptFile[];
  projectName?: string;
  modelName?: string;
  outputDir?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function WorkstationRail({
  activeExpertId,
  onExpertChange,
  projectId,
  selectedScriptPath,
  onSelectScript,
  scripts,
  collapsed = false,
  onToggleCollapse,
}: WorkstationRailProps) {
  const activeLabel = WORKSTATIONS.find(ws => ws.id === activeExpertId)?.label || activeExpertId;

  if (collapsed) {
    return (
      <div className="shell-rail shell-rail--collapsed">
        <button
          onClick={onToggleCollapse}
          style={{
            display: 'grid', placeItems: 'center', width: '100%', height: 44,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--shell-muted)', borderBottom: '1px solid var(--shell-border)',
          }}
        >
          <PanelLeftOpen style={{ width: 16, height: 16 }} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 4px', alignItems: 'center' }}>
          {WORKSTATIONS.map(ws => {
            const Icon = ws.icon;
            const isActive = ws.id === activeExpertId;
            return (
              <button
                key={ws.id}
                className={`shell-workstation${isActive ? ' shell-workstation--active' : ''}`}
                onClick={() => onExpertChange(ws.id)}
                style={{ justifyContent: 'center', padding: '7px 0', width: 44 }}
                title={ws.label}
              >
                <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="shell-rail">
      <div className="shell-rail__section">
        <div className="shell-rail__label">
          <span>工作站</span>
          <button
            onClick={onToggleCollapse}
            style={{
              display: 'grid', placeItems: 'center', width: 28, height: 28,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--shell-muted)', borderRadius: 4,
            }}
          >
            <PanelLeftClose style={{ width: 14, height: 14 }} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {WORKSTATIONS.map(ws => {
            const Icon = ws.icon;
            const isActive = ws.id === activeExpertId;
            return (
              <button
                key={ws.id}
                className={`shell-workstation${isActive ? ' shell-workstation--active' : ''}`}
                onClick={() => onExpertChange(ws.id)}
              >
                <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>{ws.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <SessionListPanel
        scripts={scripts}
        selectedScriptPath={selectedScriptPath}
        onSelectScript={onSelectScript}
        expertLabel={activeLabel}
        projectId={projectId}
      />
    </div>
  );
}
