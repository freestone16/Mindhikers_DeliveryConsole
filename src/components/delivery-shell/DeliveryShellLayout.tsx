import { useState, useEffect, useCallback } from 'react';
import { ProductTopBar } from './ProductTopBar';
import { WorkstationRail } from './WorkstationRail';
import { ContextDrawer } from './ContextDrawer';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import '../../styles/delivery-shell.css';

export interface ScriptFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
}

interface DeliveryShellLayoutProps {
  activeExpertId: string;
  onExpertChange: (expertId: string) => void;
  projectId: string;
  selectedScriptPath?: string;
  onSelectProject: (id: string) => void;
  onSelectScript: (projectId: string, path: string) => Promise<boolean>;
  socket: any;
  runtimeData?: {
    currentModel: { provider: string; model: string } | null;
    logs: { timestamp: number; type: string; message: string }[];
    isLoading: boolean;
    startTime: number | null;
  };
  children: React.ReactNode;
}

export function DeliveryShellLayout({
  activeExpertId,
  onExpertChange,
  projectId,
  selectedScriptPath,
  onSelectProject,
  onSelectScript,
  socket,
  runtimeData,
  children,
}: DeliveryShellLayoutProps) {
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState('chat');

  const [scripts, setScripts] = useState<ScriptFile[]>([]);

  useEffect(() => {
    if (!projectId) { setScripts([]); return; }
    let stale = false;
    const controller = new AbortController();
    fetch(`/api/scripts?projectId=${encodeURIComponent(projectId)}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { if (!stale) setScripts(data.scripts || []); })
      .catch(err => { if (err.name !== 'AbortError' && !stale) setScripts([]); });
    return () => { stale = true; controller.abort(); };
  }, [projectId]);

  const handleSelectScript = useCallback(async (pid: string, path: string) => {
    return onSelectScript(pid, path);
  }, [onSelectScript]);

  const bodyClass = [
    'shell-body',
    drawerCollapsed ? 'shell-body--drawer-collapsed' : '',
    railCollapsed ? 'shell-body--rail-collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="delivery-shell">
      <ProductTopBar
        projectId={projectId}
        selectedScriptPath={selectedScriptPath}
        onSelectProject={onSelectProject}
        onSelectScript={handleSelectScript}
        scripts={scripts}
      />
      <div className={bodyClass}>
        <WorkstationRail
          activeExpertId={activeExpertId}
          onExpertChange={onExpertChange}
          projectId={projectId}
          selectedScriptPath={selectedScriptPath}
          onSelectScript={handleSelectScript}
          scripts={scripts}
          collapsed={railCollapsed}
          onToggleCollapse={() => setRailCollapsed(!railCollapsed)}
        />
        <div className="shell-center">
          {children}
        </div>
        <ContextDrawer
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed(!drawerCollapsed)}
          activeTab={activeDrawerTab}
          onTabChange={setActiveDrawerTab}
          socket={socket}
          projectId={projectId}
          activeExpertId={activeExpertId}
          runtimeData={runtimeData}
        />
      </div>
    </div>
  );
}
