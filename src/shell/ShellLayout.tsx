import { useMemo } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Avatar } from '../components/primitives';
import type { ModuleManifest, ModuleSessionItem } from '../modules/types';
import { ModuleErrorBoundary } from './error-boundaries';
import { ArtifactDrawer, ModuleTab, Rail } from './primitives';
import { SkillSyncStatus } from './SkillSyncStatus';
import { SessionList } from './sessions/SessionList';
import styles from './ShellLayout.module.css';

export interface ShellLayoutView {
  content: ReactNode;
  drawer?: ReactNode;
  drawerTitle?: string;
  drawerExpanded?: boolean;
  onDrawerToggle?: () => void;
  keepMounted?: boolean;
}

interface ShellLayoutProps {
  modules: ModuleManifest[];
  activeModuleId: string;
  onModuleChange: (moduleId: string) => void;
  views: Record<string, ShellLayoutView>;
  workspaceName?: string;
  displayName?: string;
  sessionItemsByModule?: Partial<Record<string, ModuleSessionItem[]>>;
  activeSessionId?: string | null;
  onSessionChange?: (sessionId: string) => void;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

export function ShellLayout({
  modules,
  activeModuleId,
  onModuleChange,
  views,
  workspaceName,
  displayName,
  sessionItemsByModule,
  activeSessionId,
  onSessionChange,
  sidebarOpen = true,
  onSidebarToggle,
}: ShellLayoutProps) {
  const activeModule = useMemo(
    () => modules.find((module) => module.id === activeModuleId),
    [activeModuleId, modules],
  );
  const activeView = activeModule ? views[activeModule.id] : undefined;
  const activeModuleSessions = useMemo(() => {
    if (!activeModule) return [];
    const overriddenItems = sessionItemsByModule?.[activeModule.id];
    if (overriddenItems) return overriddenItems;
    return activeModule.sessionSource?.items || [];
  }, [activeModule, sessionItemsByModule]);
  const resolvedActiveSessionId =
    activeSessionId ??
    activeModule?.sessionSource?.activeSessionId ??
    activeModuleSessions[0]?.id ??
    null;

  return (
    <div className={styles.root}>
      <Rail className={clsx(styles.rail, !sidebarOpen && styles.railCollapsed)}>
        <Rail.Brand
          className={clsx(styles.brand, !sidebarOpen && styles.brandCollapsed)}
          name={sidebarOpen ? 'Golden Crucible' : undefined}
          suffix={sidebarOpen ? 'SaaS' : undefined}
        >
          <button
            type="button"
            className={styles.sidebarToggle}
            onClick={onSidebarToggle}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              {sidebarOpen ? (
                <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </Rail.Brand>
        <Rail.Section className={clsx(!sidebarOpen && styles.sectionCollapsed)}>
          {sidebarOpen ? <Rail.Eyebrow>Modules</Rail.Eyebrow> : null}
          <div className={styles.moduleTabs}>
            {modules.map((module) => (
              <ModuleTab
                key={module.id}
                icon={module.icon}
                label={module.label}
                active={module.id === activeModuleId}
                collapsed={!sidebarOpen}
                onClick={() => onModuleChange(module.id)}
              />
            ))}
          </div>
        </Rail.Section>
        {sidebarOpen && activeModuleSessions.length > 0 ? (
          <Rail.Section>
            <Rail.Eyebrow>{activeModule?.sessionLabel || 'Sessions'}</Rail.Eyebrow>
            <SessionList
              items={activeModuleSessions}
              activeSessionId={resolvedActiveSessionId}
              onSessionChange={onSessionChange}
            />
          </Rail.Section>
        ) : null}
        <Rail.User
          className={clsx(!sidebarOpen && styles.userCollapsed)}
          avatar={<Avatar initial={(displayName || '你').slice(0, 1)} />}
          name={sidebarOpen ? (displayName || '你') : undefined}
          subtitle={sidebarOpen ? (workspaceName || 'Workspace') : undefined}
        />
      </Rail>

      <div className={styles.main}>
        <SkillSyncStatus />
        <div className={styles.content}>
          {modules.length === 0 ? (
            <div className={styles.empty}>尚未注册任何模块</div>
          ) : (
            modules.map((module) => {
              const view = views[module.id];
              if (!view) return null;
              const isActive = module.id === activeModuleId;
              if (!isActive && !view.keepMounted) return null;

              return (
                <div
                  key={module.id}
                  className={clsx(styles.view, !isActive && styles.viewHidden)}
                  aria-hidden={!isActive}
                >
                  <ModuleErrorBoundary moduleName={module.label}>
                    {view.content}
                  </ModuleErrorBoundary>
                </div>
              );
            })
          )}
        </div>

        {activeView?.drawer ? (
          <ArtifactDrawer
            expanded={activeView.drawerExpanded ?? true}
            onToggle={activeView.onDrawerToggle}
          >
            <ArtifactDrawer.Head title={activeView.drawerTitle || activeModule?.label || 'Artifact'} />
            <ArtifactDrawer.Body className={styles.drawerBodyReset}>
              {activeView.drawer}
            </ArtifactDrawer.Body>
          </ArtifactDrawer>
        ) : null}
      </div>
    </div>
  );
}
