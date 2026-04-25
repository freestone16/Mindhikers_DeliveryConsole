import { useState, useEffect, useRef } from 'react';
import { ChevronDown, FolderOpen, FileText, Settings } from 'lucide-react';
import type { ScriptFile } from './DeliveryShellLayout';

interface Project {
  name: string;
  isActive: boolean;
  hasDeliveryStore: boolean;
}

interface ProductTopBarProps {
  projectId: string;
  selectedScriptPath?: string;
  onSelectProject: (id: string) => void;
  onSelectScript: (projectId: string, path: string) => Promise<boolean>;
  scripts: ScriptFile[];
}

export function ProductTopBar({
  projectId,
  selectedScriptPath,
  onSelectProject,
  onSelectScript,
  scripts,
}: ProductTopBarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [scriptDropdownOpen, setScriptDropdownOpen] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProjectsLoading(true);
    setProjectsError(null);
    fetch('/api/projects')
      .then(r => {
        if (!r.ok) {
          throw new Error(`projects request failed: ${r.status}`);
        }
        return r.json();
      })
      .then(data => setProjects(data.projects || []))
      .catch((error) => {
        console.error('Failed to fetch projects:', error);
        setProjects([]);
        setProjectsError('项目加载失败，请检查 PROJECTS_BASE 配置');
      })
      .finally(() => setProjectsLoading(false));
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) setProjectDropdownOpen(false);
      if (scriptRef.current && !scriptRef.current.contains(e.target as Node)) setScriptDropdownOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const activeProject = projects.find(p => p.name === projectId) || projects.find(p => p.isActive) || projects[0];
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
            <strong>{activeProject?.name || '选择项目'}</strong>
            <ChevronDown style={{ width: 12, height: 12 }} />
          </button>
          {projectDropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 50,
              background: 'var(--shell-panel-solid)', border: '1px solid var(--shell-border)',
              borderRadius: 8, minWidth: 220, boxShadow: 'var(--shell-shadow)', marginTop: 4,
            }}>
              {projectsLoading ? (
                <div style={{ padding: '10px 14px', color: 'var(--shell-muted)', fontSize: '0.9rem' }}>加载中...</div>
              ) : projectsError ? (
                <div style={{ padding: '10px 14px', color: 'var(--shell-muted)', fontSize: '0.9rem' }}>{projectsError}</div>
              ) : projects.length === 0 ? (
                <div style={{ padding: '10px 14px', color: 'var(--shell-muted)', fontSize: '0.9rem' }}>当前没有可用项目</div>
              ) : projects.map(p => (
                <button key={p.name} onClick={() => { onSelectProject(p.name); setProjectDropdownOpen(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px',
                    background: (p.name === projectId || p.isActive) ? 'rgba(201,117,69,0.08)' : 'transparent',
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
              <strong>{activeScript?.name || '选择文稿'}</strong>
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
          模型配置
        </button>
      </div>
    </div>
  );
}
