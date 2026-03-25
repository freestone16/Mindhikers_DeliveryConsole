import { useState, useEffect, useRef } from 'react';
import { ChevronDown, FolderOpen, Database, FileText, Settings } from 'lucide-react';

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
    activeModule: 'crucible' | 'delivery' | 'distribution';
    onModuleChange: (module: 'crucible' | 'delivery' | 'distribution') => void;
}

export const Header = ({ projectId, selectedScriptPath, onSelectProject, onSelectScript, activeModule, onModuleChange }: HeaderProps) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [scripts, setScripts] = useState<ScriptFile[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isScriptDropdownOpen, setIsScriptDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const scriptDropdownRef = useRef<HTMLDivElement>(null);

    // ... (fetch logic remains same)
    const fetchProjects = async () => {
        try {
            const res = await fetch('http://localhost:3002/api/projects');
            const data = await res.json();
            setProjects(data.projects);
        } catch (e) {
            console.error('Failed to fetch projects:', e);
        }
    };

    const fetchScripts = async () => {
        if (!projectId) return;
        try {
            const res = await fetch(`http://localhost:3002/api/scripts?projectId=${encodeURIComponent(projectId)}&t=${Date.now()}`);
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

    return (
        <>
            <header className="border-b border-[var(--line-soft)] bg-[linear-gradient(180deg,rgba(255,250,244,0.96)_0%,rgba(246,235,219,0.96)_100%)] px-6 py-4 shadow-[0_10px_30px_rgba(120,88,52,0.06)] relative z-[100]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="MindHikers Logo" className="w-10 h-10 rounded-lg shadow-sm object-cover overflow-hidden" />
                        <div>
                            <h1 className="text-xl font-bold text-[var(--ink-1)] tracking-tight">MindHikers Delivery Console</h1>
                        </div>
                    </div>

                    {/* Module Switcher */}
                    <div className="flex rounded-2xl border border-[var(--line-soft)] bg-[rgba(255,249,241,0.92)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <button
                            onClick={() => onModuleChange('crucible')}
                            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${activeModule === 'crucible'
                                ? 'bg-[linear-gradient(135deg,#c98b43_0%,#a86b34_100%)] text-white shadow-[0_10px_22px_rgba(168,107,52,0.26)]'
                                : 'text-[var(--ink-3)] hover:text-[var(--ink-1)]'
                                }`}
                        >
                            🔥 黄金坩埚
                        </button>
                        <button
                            onClick={() => onModuleChange('delivery')}
                            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${activeModule === 'delivery'
                                ? 'bg-[linear-gradient(135deg,#b77740_0%,#965427_100%)] text-white shadow-[0_10px_22px_rgba(150,84,39,0.24)]'
                                : 'text-[var(--ink-3)] hover:text-[var(--ink-1)]'
                                }`}
                        >
                            🏭 交付终端
                        </button>
                        <button
                            onClick={() => onModuleChange('distribution')}
                            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${activeModule === 'distribution'
                                ? 'bg-[linear-gradient(135deg,#8d9f75_0%,#6f7f5b_100%)] text-white shadow-[0_10px_22px_rgba(111,127,91,0.22)]'
                                : 'text-[var(--ink-3)] hover:text-[var(--ink-1)]'
                                }`}
                        >
                            📡 分发终端
                        </button>
                    </div>

                    {/* Right Section: Project & Script Selector */}
                    <div className="flex items-center gap-4">
                        {/* Project Selector */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => {
                                    setIsDropdownOpen(!isDropdownOpen);
                                    if (!isDropdownOpen) fetchProjects();
                                }}
                                className="flex items-center gap-1.5 text-[var(--ink-3)] text-sm font-mono hover:text-[var(--ink-1)] transition-colors cursor-pointer group"
                            >
                                <FolderOpen className="w-4 h-4 flex-shrink-0" />
                                <span className="text-[var(--ink-2)] group-hover:text-[var(--ink-1)] max-w-[120px] truncate">{projectId}</span>
                                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-72 overflow-hidden rounded-[22px] border border-[var(--line-soft)] bg-[linear-gradient(180deg,rgba(255,250,244,0.98)_0%,rgba(246,236,220,0.98)_100%)] shadow-[0_24px_60px_rgba(90,63,28,0.18)] z-[9999]">
                                    <div className="px-3 py-2 border-b border-[var(--line-soft)] text-xs text-[var(--ink-3)] uppercase tracking-wider">
                                        Available Projects
                                    </div>
                                    {projects.length === 0 ? (
                                        <div className="px-3 py-4 text-sm text-[var(--ink-3)] text-center">加载中...</div>
                                    ) : (
                                        <div className="max-h-60 overflow-y-auto overflow-x-hidden">
                                            {projects.map(p => (
                                                <button
                                                    key={p.name}
                                                    onClick={() => handleSwitch(p.name)}
                                                    className={`w-full px-3 py-2.5 flex items-center gap-3 text-left text-sm transition-colors ${p.isActive
                                                        ? 'bg-[rgba(166,117,64,0.12)] text-[var(--ink-1)] border-l-2 border-[var(--accent)]'
                                                        : 'text-[var(--ink-2)] hover:bg-[rgba(166,117,64,0.06)] border-l-2 border-transparent'
                                                        }`}
                                                >
                                                    <FolderOpen className="w-4 h-4 flex-shrink-0 opacity-60" />
                                                    <span className="flex-1 truncate font-mono">{p.name}</span>
                                                    {p.hasDeliveryStore && (
                                                        <Database className="w-3.5 h-3.5 text-[rgb(111,127,91)] flex-shrink-0" />
                                                    )}
                                                    {p.isActive && (
                                                        <span className="text-[10px] bg-[rgba(166,117,64,0.14)] text-[var(--accent)] px-1.5 py-0.5 rounded flex-shrink-0">ACTIVE</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Script Selector */}
                        <div className="relative" ref={scriptDropdownRef}>
                            <button
                                onClick={() => {
                                    setIsScriptDropdownOpen(!isScriptDropdownOpen);
                                    if (!isScriptDropdownOpen) fetchScripts();
                                }}
                                className="flex items-center gap-1.5 text-[var(--ink-3)] text-sm font-mono hover:text-[var(--ink-1)] transition-colors cursor-pointer group"
                            >
                                <FileText className="w-4 h-4 flex-shrink-0" />
                                <span className="flex items-center whitespace-nowrap">
                                    Script: <span className="text-[var(--accent)] group-hover:text-[var(--accent-strong)] ml-1 max-w-[180px] inline-block truncate align-bottom">{selectedScript?.name || '未选择'}</span>
                                </span>
                                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isScriptDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isScriptDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-80 overflow-hidden rounded-[22px] border border-[var(--line-soft)] bg-[linear-gradient(180deg,rgba(255,250,244,0.98)_0%,rgba(246,236,220,0.98)_100%)] shadow-[0_24px_60px_rgba(90,63,28,0.18)] z-[9999]">
                                    <div className="px-3 py-2 border-b border-[var(--line-soft)] text-xs text-[var(--ink-3)] uppercase tracking-wider">
                                        02_Script 文稿
                                    </div>
                                    {scripts.length === 0 ? (
                                        <div className="px-3 py-4 text-sm text-[var(--ink-3)] text-center">暂无文稿</div>
                                    ) : (
                                        <div className="max-h-60 overflow-y-auto overflow-x-hidden">
                                            {scripts.map(s => (
                                                <button
                                                    key={s.path}
                                                    onClick={() => handleScriptSelect(s.path)}
                                                    className={`w-full px-3 py-2.5 flex items-center gap-3 text-left text-sm transition-colors ${s.path === selectedScriptPath
                                                        ? 'bg-[rgba(166,117,64,0.12)] text-[var(--ink-1)] border-l-2 border-[var(--accent)]'
                                                        : 'text-[var(--ink-2)] hover:bg-[rgba(166,117,64,0.06)] border-l-2 border-transparent'
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

                        {/* Settings Button */}
                        <button
                            onClick={() => window.open('/#/llm-config', '_blank')}
                            className="rounded-2xl p-2 text-[var(--ink-3)] transition-colors hover:bg-[rgba(166,117,64,0.08)] hover:text-[var(--ink-1)]"
                            title="LLM Configuration"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>
        </>
    );
};
