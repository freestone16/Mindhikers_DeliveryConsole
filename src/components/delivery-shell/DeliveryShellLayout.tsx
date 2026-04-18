import { useState } from 'react';
import { ProductTopBar } from './ProductTopBar';
import { WorkstationRail } from './WorkstationRail';
import { ContextDrawer } from './ContextDrawer';
import '../../styles/delivery-shell.css';

interface DeliveryShellLayoutProps {
  activeExpertId: string;
  onExpertChange: (expertId: string) => void;
  projectId: string;
  selectedScriptPath?: string;
  onSelectProject: (id: string) => void;
  onSelectScript: (projectId: string, path: string) => Promise<boolean>;
  children: React.ReactNode;
}

export function DeliveryShellLayout({
  activeExpertId,
  onExpertChange,
  projectId,
  selectedScriptPath,
  onSelectProject,
  onSelectScript,
  children,
}: DeliveryShellLayoutProps) {
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState('chat');

  const bodyClass = [
    'shell-body',
    drawerCollapsed ? 'shell-body--drawer-collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="delivery-shell">
      <ProductTopBar
        projectId={projectId}
        selectedScriptPath={selectedScriptPath}
        onSelectProject={onSelectProject}
        onSelectScript={onSelectScript}
      />
      <div className={bodyClass}>
        <WorkstationRail
          activeExpertId={activeExpertId}
          onExpertChange={onExpertChange}
          projectId={projectId}
          selectedScriptPath={selectedScriptPath}
        />
        <div className="shell-center">
          {children}
        </div>
        <ContextDrawer
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed(!drawerCollapsed)}
          activeTab={activeDrawerTab}
          onTabChange={setActiveDrawerTab}
        />
      </div>
    </div>
  );
}
