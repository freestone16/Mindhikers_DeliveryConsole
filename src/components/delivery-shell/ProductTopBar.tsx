import { useState, useEffect, useRef } from 'react';
import { ChevronDown, FolderOpen, FileText, Settings } from 'lucide-react';

interface Project {
  name: string;
  isActive: boolean;
  hasDeliveryStore: boolean;
}

interface ScriptFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
}

interface ProductTopBarProps {
  projectId: string;
  selectedScriptPath?: string;
  onSelectProject: (id: string) => void;
  onSelectScript: (projectId: string, path: string) => Promise<boolean>;
}

export function ProductTopBar({
  projectId,
  selectedScriptPath,
  onSelectProject,
  onSelectScript,
}: ProductTopBarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scripts, setScripts] = useState<ScriptFile[]>([]);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [scriptDropdownOpen, setScriptDropdownOpen] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => setProjects(data.projects || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/scripts`)
      .then(r => r.json())
      .then(data => setScripts(data.scripts || []))
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) setProjectDropdownOpen(false);
      if (scriptRef.current && !scriptRef.current.contains(e.target as Node)) setScriptDropdownOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const activeProject = projects.find(p => p.isActive) || projects[0];
  const activeScript = scripts.find(s => s.path === selectedScriptPath);

  return (
    <div className="shell-topbar">
      <div className="shell-topbar__brand">
        <div className="shell-topbar__brandmark">D</div>
        <span>Delivery</span>
      </div>

      <div className="shell-topbar__crumbs">
        <div ref={projectRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'inherit', font: 'inherit',
            }}
          >
            <FolderOpen style={{ width: 14, height: 14 }} />
            <strong>{activeProject?.name || 'Select project'}</strong>
            <ChevronDown style={{ width: 12, height: 12 }} />
          </button>
          {projectDropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 50,
              background: 'var(--shell-panel-solid)', border: '1px solid var(--shell-border)',
              borderRadius: 8, minWidth: 220, boxShadow: 'var(--shell-shadow)', marginTop: 4,
            }}>
              {projects.map(p => (
                <button key={p.name} onClick={() => { onSelectProject(p.name); setProjectDropdownOpen(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px',
                    background: p.isActive ? 'rgba(201,117,69,0.08)' : 'transparent',
                    border: 'none', cursor: 'pointer', color: 'var(--shell-text)', font: 'inherit',
                  }}>
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedScriptPath && (
          <div ref={scriptRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setScriptDropdownOpen(!scriptDropdownOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'inherit', font: 'inherit',
              }}
            >
              <FileText style={{ width: 14, height: 14 }} />
              <strong>{activeScript?.name || 'Select script'}</strong>
              <ChevronDown style={{ width: 12, height: 12 }} />
            </button>
            {scriptDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, zIndex: 50,
                background: 'var(--shell-panel-solid)', border: '1px solid var(--shell-border)',
                borderRadius: 8, minWidth: 260, maxHeight: 300, overflow: 'auto',
                boxShadow: 'var(--shell-shadow)', marginTop: 4,
              }}>
                {scripts.map(s => (
                  <button key={s.path} onClick={() => { onSelectScript(projectId, s.path); setScriptDropdownOpen(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px',
                      background: s.path === selectedScriptPath ? 'rgba(201,117,69,0.08)' : 'transparent',
                      border: 'none', cursor: 'pointer', color: 'var(--shell-text)', font: 'inherit',
                    }}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shell-topbar__meta">
        <button
          onClick={() => { window.location.hash = '/llm-config'; }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--shell-muted)', font: 'inherit', fontSize: '0.85rem',
          }}
        >
          <Settings style={{ width: 14, height: 14 }} />
          LLM Config
        </button>
      </div>
    </div>
  );
}
