import { PenTool, Eye, Music, Image, Video, Megaphone } from 'lucide-react';

const WORKSTATIONS = [
  { id: 'Director', label: 'Director', icon: PenTool },
  { id: 'ShortsMaster', label: 'Shorts', icon: Video },
  { id: 'ThumbnailMaster', label: 'Thumbnail', icon: Image },
  { id: 'MusicMaster', label: 'Music', icon: Music },
  { id: 'MarketingMaster', label: 'Marketing', icon: Megaphone },
  { id: 'VisualAudit', label: 'Visual Audit', icon: Eye },
];

interface WorkstationRailProps {
  activeExpertId: string;
  onExpertChange: (id: string) => void;
  projectId: string;
  selectedScriptPath?: string;
}

export function WorkstationRail({ activeExpertId, onExpertChange }: WorkstationRailProps) {
  return (
    <div className="shell-rail">
      <div className="shell-rail__section">
        <div className="shell-rail__label">
          <span>Workstations</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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

      <div className="shell-dock">
        <div className="shell-dock__row">
          <span className="shell-dock__label">Project</span>
          <span className="shell-dock__value" style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            —
          </span>
        </div>
        <div className="shell-dock__row">
          <span className="shell-dock__label">Model</span>
          <span className="shell-dock__value" style={{ fontSize: '0.82rem' }}>—</span>
        </div>
      </div>
    </div>
  );
}
