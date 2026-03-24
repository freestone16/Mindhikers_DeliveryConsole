import { useState, useEffect, useRef } from 'react';
import { ChevronDown, FolderOpen, Database, FileText, Settings } from 'lucide-react';
import { buildApiUrl } from '../config/runtime';

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
}

export const Header = ({ projectId, selectedScriptPath, onSelectProject, onSelectScript }: HeaderProps) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [scripts, setScripts] = useState<ScriptFile[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isScriptDropdownOpen, setIsScriptDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const scriptDropdownRef = useRef<HTMLDivElement>(null);

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

    const selectedScript = scripts.find((script) => script.path === selectedScriptPath);
    const selectedScriptLabel = selectedScript?.name || selectedScriptPath?.split('/').pop() || '未选择';
    const formatSize = (bytes: number) => bytes > 1000 ? `${(bytes / 1000).toFixed(1)}k` : `${bytes}`;

    return (
        <header className="relative z-[100] border-b border-[var(--line-soft)] bg-[rgba(255,250,242,0.84)] px-4 py-2.5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <img src="/logo.png" alt="MindHikers Logo" className="h-9 w-9 rounded-2xl border border-[var(--line-soft)] object-cover shadow-[0_8px_20px_rgba(130,102,70,0.08)]" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="mh-display text-[18px] font-semibold tracking-tight text-[var(--ink-1)]">黄金坩埚 GoldenCrucible</h1>
                            <span className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-0)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
                                SaaS Shell
                            </span>
                        </div>
                        <p className="text-[12px] text-[var(--ink-3)]">默认进入议题工作台，保留最小项目与文稿上下文。</p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => {
                                setIsDropdownOpen(!isDropdownOpen);
                                if (!isDropdownOpen) fetchProjects();
                            }}
                            className="group flex items-center gap-2 rounded-full border border-[var(--line-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-[13px] text-[var(--ink-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink-1)]"
                        >
                            <FolderOpen className="w-4 h-4 flex-shrink-0" />
                            <span className="max-w-[120px] truncate">{projectId || '工作区'}</span>
                            <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full right-0 z-[9999] mt-2 w-72 overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-[var(--surface-1)] shadow-[0_24px_50px_rgba(117,88,55,0.14)]">
                                <div className="border-b border-[var(--line-soft)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--ink-3)]">
                                    Available Workspaces
                                </div>
                                {projects.length === 0 ? (
                                    <div className="px-3 py-4 text-center text-sm text-[var(--ink-3)]">加载中...</div>
                                ) : (
                                    <div className="max-h-60 overflow-y-auto overflow-x-hidden">
                                        {projects.map((project) => (
                                            <button
                                                key={project.name}
                                                onClick={() => handleSwitch(project.name)}
                                                className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left text-sm transition-colors ${project.isActive
                                                    ? 'border-[var(--accent)] bg-[var(--surface-2)] text-[var(--ink-1)]'
                                                    : 'border-transparent text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
                                                    }`}
                                            >
                                                <FolderOpen className="w-4 h-4 flex-shrink-0 opacity-60" />
                                                <span className="flex-1 truncate font-mono">{project.name}</span>
                                                {project.hasDeliveryStore && (
                                                    <Database className="h-3.5 w-3.5 flex-shrink-0 text-[var(--accent-muted)]" />
                                                )}
                                                {project.isActive && (
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
                                setIsScriptDropdownOpen(!isScriptDropdownOpen);
                                if (!isScriptDropdownOpen) fetchScripts();
                            }}
                            className="group flex items-center gap-2 rounded-full border border-[var(--line-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-[13px] text-[var(--ink-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink-1)]"
                        >
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span className="flex items-center whitespace-nowrap">
                                文稿: <span className="ml-1 inline-block max-w-[180px] truncate align-bottom text-[var(--accent)]">{selectedScriptLabel}</span>
                            </span>
                            <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isScriptDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isScriptDropdownOpen && (
                            <div className="absolute top-full right-0 z-[9999] mt-2 w-80 overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-[var(--surface-1)] shadow-[0_24px_50px_rgba(117,88,55,0.14)]">
                                <div className="border-b border-[var(--line-soft)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--ink-3)]">
                                    Script Files
                                </div>
                                {scripts.length === 0 ? (
                                    <div className="px-3 py-4 text-center text-sm text-[var(--ink-3)]">暂无文稿</div>
                                ) : (
                                    <div className="max-h-60 overflow-y-auto overflow-x-hidden">
                                        {scripts.map((script) => (
                                            <button
                                                key={script.path}
                                                onClick={() => handleScriptSelect(script.path)}
                                                className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left text-sm transition-colors ${script.path === selectedScriptPath
                                                    ? 'border-[var(--accent)] bg-[var(--surface-2)] text-[var(--ink-1)]'
                                                    : 'border-transparent text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
                                                    }`}
                                            >
                                                <FileText className="w-4 h-4 flex-shrink-0 opacity-60" />
                                                <span className="flex-1 truncate">{script.name}</span>
                                                <span className="text-xs text-[var(--ink-3)]">{formatSize(script.size)}</span>
                                                <span className="text-xs text-[var(--ink-3)]">{script.modifiedAt}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => window.open('/#/llm-config', '_blank')}
                        className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-0)] p-2 text-[var(--ink-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink-1)]"
                        title="LLM Configuration"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    );
};
