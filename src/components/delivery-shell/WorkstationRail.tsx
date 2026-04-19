import { PenTool, Eye, Music, Image, Video, Megaphone } from 'lucide-react';
import { SessionListPanel } from './SessionListPanel';
import { ProjectContextDock } from './ProjectContextDock';
import type { ScriptFile } from './DeliveryShellLayout';

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
  onSelectScript: (projectId: string, path: string) => Promise<boolean>;
  scripts: ScriptFile[];
  projectName?: string;
  modelName?: string;
  outputDir?: string;
}

export function WorkstationRail({
  activeExpertId,
  onExpertChange,
  projectId,
  selectedScriptPath,
  onSelectScript,
  scripts,
  projectName,
  modelName,
  outputDir,
}: WorkstationRailProps) {
  const activeLabel = WORKSTATIONS.find(ws => ws.id === activeExpertId)?.label || activeExpertId;

  const activeScript = scripts.find(s => s.path === selectedScriptPath);

  return (
    <div className="shell-rail">
      <div className="shell-rail__section">
        <div className="shell-rail__label">
          <span>Workstations</span>
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

      <ProjectContextDock
        projectName={projectName}
        scriptName={activeScript?.name}
        modelName={modelName}
        outputDir={outputDir}
      />
    </div>
  );
}
