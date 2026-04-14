import { useState, useEffect, useRef } from 'react';
import { ChevronDown, FolderOpen, Database, FileText, Settings } from 'lucide-react';
import { buildApiUrl } from '../config/runtime';
import { UserAvatarMenu } from './UserAvatarMenu';

export type HeaderModule = 'crucible' | 'delivery' | 'distribution';

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

interface HeaderProps {
    projectId: string;
    selectedScriptPath?: string;
    onSelectProject: (projectId: string) => void;
    onSelectScript: (projectId: string, path: string) => Promise<boolean>;
    activeModule: HeaderModule;
    onModuleChange: (module: HeaderModule) => void;
    availableModules?: HeaderModule[];
    lockSelectorsWhenCrucible?: boolean;
    appTitle?: string;
    hideWorkspaceControls?: boolean;
    hideSettingsButton?: boolean;
    authSummary?: {
        displayName: string;
        email: string;
        avatarImage?: string | null;
        workspaceName?: string;
        onOpenHistory?: () => void;
        onSignOut: () => void;
    };
}

const MODULE_META: Record<HeaderModule, { label: string; activeClass: string }> = {
    crucible: {
        label: '黄金坩埚',
        activeClass: 'bg-[var(--accent)] text-white',
    },
    delivery: {
        label: '交付终端',
        activeClass: 'bg-[var(--surface-2)] text-[var(--ink-1)]',
    },
    distribution: {
        label: '分发终端',
        activeClass: 'bg-[var(--surface-2)] text-[var(--ink-1)]',
    },
};

export const Header = ({
    projectId,
    selectedScriptPath,
    onSelectProject,
    onSelectScript,
    activeModule,
    onModuleChange,
    availableModules,
    lockSelectorsWhenCrucible = true,
    appTitle = '心行者 MindHikers Delivery Console',
    hideWorkspaceControls = false,
    hideSettingsButton = false,
    authSummary,
}: HeaderProps) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [scripts, setScripts] = useState<ScriptFile[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isScriptDropdownOpen, setIsScriptDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const scriptDropdownRef = useRef<HTMLDivElement>(null);
    const modules = availableModules ?? ['crucible', 'delivery', 'distribution'];

    // ... (fetch logic remains same)
    const fetchProjects = async () => {
        try {
            const res = await fetch(buildApiUrl('/api/projects'));
            const data = await res.json();
            setProjects(data.projects);
        } catch (e) {
            console.error('Failed to fetch projects:', e);
        }
    };

    const fetchScripts = async () => {
        if (!projectId) return;
        try {
            const res = await fetch(`${buildApiUrl('/api/scripts')}?projectId=${encodeURIComponent(projectId)}&t=${Date.now()}`);
            const data = await res.json();
            setScripts(data.scripts || []);
        } catch (e) {
            console.error('Failed to fetch scripts:', e);
            setScripts([]);
        }
    };

    useEffect(() => {
        fetchProjects();
        if (projectId) {
            fetchScripts();
        } else {
            setScripts([]);
        }
    }, [projectId]);

    // ... (event listeners remain same)
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (scriptDropdownRef.current && !scriptDropdownRef.current.contains(e.target as Node)) {
                setIsScriptDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSwitch = (projectName: string) => {
        if (projectName === projectId) {
            setIsDropdownOpen(false);
            return;
        }

        onSelectProject(projectName);
        setIsDropdownOpen(false);
    };

    const handleScriptSelect = async (scriptPath: string) => {
        setIsScriptDropdownOpen(false);
        await onSelectScript(projectId, scriptPath);
    };

    const selectedScript = scripts.find(s => s.path === selectedScriptPath);
    const formatSize = (bytes: number) => bytes > 1000 ? `${(bytes / 1000).toFixed(1)}k` : `${bytes}`;
    const isCrucibleLocked = lockSelectorsWhenCrucible && activeModule === 'crucible';

    return (
        <>
            <header className="relative z-[100] border-b border-[var(--line-soft)] bg-[rgba(255,250,242,0.84)] px-4 py-2.5 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <img src="/logo.png" alt="MindHikers Logo" className="h-9 w-9 rounded-2xl border border-[var(--line-soft)] object-cover shadow-[0_8px_20px_rgba(130,102,70,0.08)]" />
                        <div>
                            <h1 className="mh-display text-[18px] font-semibold tracking-tight text-[var(--ink-1)]">{appTitle}</h1>
                        </div>
                    </div>

                    {modules.length > 1 ? (
                        <div className="flex rounded-full border border-[var(--line-soft)] bg-[var(--surface-0)] p-1 shadow-[0_10px_24px_rgba(130,102,70,0.05)]">
                            {modules.map((module) => (
                                <button
                                    key={module}
                                    onClick={() => onModuleChange(module)}
                                    className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${activeModule === module
                                        ? MODULE_META[module].activeClass
                                        : 'text-[var(--ink-3)] hover:text-[var(--ink-1)]'
                                        }`}
                                >
                                    {MODULE_META[module].label}
                                </button>
                            ))}
                        </div>
                    ) : <div />}

                    <div className="flex items-center gap-2.5">
                        {authSummary ? (
                            <UserAvatarMenu
                                displayName={authSummary.displayName}
                                email={authSummary.email}
                                avatarImage={authSummary.avatarImage}
                                workspaceName={authSummary.workspaceName}
                                onOpenHistory={authSummary.onOpenHistory}
                                onSignOut={authSummary.onSignOut}
                            />
                        ) : null}

                        {!hideWorkspaceControls ? (
                            <>
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => {
                                            if (isCrucibleLocked) return;
                                            setIsDropdownOpen(!isDropdownOpen);
                                            if (!isDropdownOpen) fetchProjects();
                                        }}
                                        disabled={isCrucibleLocked}
                                        title={isCrucibleLocked ? '议题尚未定稿，暂不可创建项目' : undefined}
                                        className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${isCrucibleLocked
                                            ? 'cursor-not-allowed border-[var(--line-soft)] bg-[rgba(237,231,222,0.82)] text-[var(--ink-3)]'
                                            : 'cursor-pointer border-[var(--line-soft)] bg-[var(--surface-0)] text-[var(--ink-2)] hover:border-[var(--line-strong)] hover:text-[var(--ink-1)]'
                                            }`}
                                    >
                                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                                        <span className="max-w-[120px] truncate">{projectId || '项目'}</span>
                                        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isDropdownOpen && !isCrucibleLocked && (
                                        <div className="absolute top-full right-0 z-[9999] mt-2 w-72 overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-[var(--surface-1)] shadow-[0_24px_50px_rgba(117,88,55,0.14)]">
                                            <div className="border-b border-[var(--line-soft)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--ink-3)]">
                                                Available Projects
                                            </div>
                                            {projects.length === 0 ? (
                                                <div className="px-3 py-4 text-center text-sm text-[var(--ink-3)]">加载中...</div>
                                            ) : (
                                                <div className="max-h-60 overflow-y-auto overflow-x-hidden">
                                                    {projects.map(p => (
                                                        <button
                                                            key={p.name}
                                                            onClick={() => handleSwitch(p.name)}
                                                            className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left text-sm transition-colors ${p.isActive
                                                                ? 'border-[var(--accent)] bg-[var(--surface-2)] text-[var(--ink-1)]'
                                                                : 'border-transparent text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
                                                                }`}
                                                        >
                                                            <FolderOpen className="w-4 h-4 flex-shrink-0 opacity-60" />
                                                            <span className="flex-1 truncate font-mono">{p.name}</span>
                                                            {p.hasDeliveryStore && (
                                                                <Database className="h-3.5 w-3.5 flex-shrink-0 text-[var(--accent-muted)]" />
                                                            )}
                                                            {p.isActive && (
                                                                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] text-[var(--ink-1)]">ACTIVE</span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="relative" ref={scriptDropdownRef}>
                                    <button
                                        onClick={() => {
                                            if (isCrucibleLocked) return;
                                            setIsScriptDropdownOpen(!isScriptDropdownOpen);
                                            if (!isScriptDropdownOpen) fetchScripts();
                                        }}
                                        disabled={isCrucibleLocked}
                                        title={isCrucibleLocked ? '议题尚未定稿，暂不可创建文稿' : undefined}
                                        className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${isCrucibleLocked
                                            ? 'cursor-not-allowed border-[var(--line-soft)] bg-[rgba(237,231,222,0.82)] text-[var(--ink-3)]'
                                            : 'cursor-pointer border-[var(--line-soft)] bg-[var(--surface-0)] text-[var(--ink-2)] hover:border-[var(--line-strong)] hover:text-[var(--ink-1)]'
                                            }`}
                                    >
                                        <FileText className="w-4 h-4 flex-shrink-0" />
                                        <span className="flex items-center whitespace-nowrap">
                                            文稿: <span className="ml-1 inline-block max-w-[180px] truncate align-bottom text-[var(--accent)]">{selectedScript?.name || '未选择'}</span>
                                        </span>
                                        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isScriptDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isScriptDropdownOpen && !isCrucibleLocked && (
                                        <div className="absolute top-full right-0 z-[9999] mt-2 w-80 overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-[var(--surface-1)] shadow-[0_24px_50px_rgba(117,88,55,0.14)]">
                                            <div className="border-b border-[var(--line-soft)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--ink-3)]">
                                                02_Script 文稿
                                            </div>
                                            {scripts.length === 0 ? (
                                                <div className="px-3 py-4 text-center text-sm text-[var(--ink-3)]">暂无文稿</div>
                                            ) : (
                                                <div className="max-h-60 overflow-y-auto overflow-x-hidden">
                                                    {scripts.map(s => (
                                                        <button
                                                            key={s.path}
                                                            onClick={() => handleScriptSelect(s.path)}
                                                            className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left text-sm transition-colors ${s.path === selectedScriptPath
                                                                ? 'border-[var(--accent)] bg-[var(--surface-2)] text-[var(--ink-1)]'
                                                                : 'border-transparent text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
                                                                }`}
                                                        >
                                                            <FileText className="w-4 h-4 flex-shrink-0 opacity-60" />
                                                            <span className="flex-1 truncate">{s.name}</span>
                                                            <span className="text-xs text-[var(--ink-3)]">{formatSize(s.size)}</span>
                                                            <span className="text-xs text-[var(--ink-3)]">{s.modifiedAt}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : null}

                        {!hideSettingsButton ? (
                            <button
                                onClick={() => window.open('/#/llm-config', '_blank')}
                                className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-0)] p-2 text-[var(--ink-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink-1)]"
                                title="LLM Configuration"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        ) : null}
                    </div>
                </div>
            </header>
        </>
    );
};
