import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ExpertNav } from './components/ExpertNav';
import { ExpertPage } from './components/ExpertPage';
import { DirectorSection } from './components/DirectorSection';
import { ShortsSection } from './components/ShortsSection';
import { MarketingSection } from './components/MarketingSection';
import { VisualAuditPage } from './components/VisualAuditPage';
import { AccountsHub } from './components/AccountsHub';
import { PublishComposer } from './components/PublishComposer';
import { DistributionQueue } from './components/DistributionQueue';
import { ChatPanel } from './components/ChatPanel';
import { useDeliveryStore, INITIAL_STATE } from './hooks/useDeliveryStore';
import { Loader2, Users, Send, Clock, ArrowRight, Sparkles, RadioTower } from 'lucide-react';
import { StatusFooter } from './components/StatusFooter';
import { CrucibleHome } from './components/CrucibleHome';
import { LLMConfigPage } from './components/LLMConfigPage';
import { ThemeConfigPage } from './components/ThemeConfigPage';
import { ThemeContext, useThemeProvider, useTheme, applyThemeToElement } from './hooks/useTheme';
import type { ModuleId } from './config/theme-presets';

type ModuleType = 'crucible' | 'delivery' | 'distribution';
type DistributionPage = 'accounts' | 'composer' | 'queue';

function useHashRoute() {
    const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/');
    useEffect(() => {
        const handleHashChange = () => {
            setHash(window.location.hash.slice(1) || '/');
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);
    return hash;
}

function App() {
    const { state, isConnected, selectScript, socket, setState } = useDeliveryStore();
    const [activeExpertId, setActiveExpertId] = useState('Director');
    const [activeModule, setActiveModule] = useState<ModuleType>('delivery');
    const [activeDistributionPage, setActiveDistributionPage] = useState<DistributionPage>('composer');
    const [isChatOpen, setIsChatOpen] = useState(false);

    const handleSelectProject = (projectId: string) => {
        setState({
            ...INITIAL_STATE,
            projectId: projectId,
            lastUpdated: new Date().toISOString()
        });
        if (socket) {
            socket.emit('select-project', projectId);
        }
    };

    const handleSelectExpert = (expertId: string) => {
        setActiveExpertId(expertId);
    };

    const handleModuleChange = (module: ModuleType) => {
        setActiveModule(module);
    };

    const handleStartWork = async (expertId: string) => {
        if (!state.selectedScript) {
            alert('请先选择文稿');
            return;
        }

        try {
            const res = await fetch('/api/experts/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expertId,
                    scriptPath: state.selectedScript.path,
                    projectId: state.projectId
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '启动失败');
            }
            alert('专家任务已启动');
        } catch (e: any) {
            console.error('Start work error:', e);
            alert(`启动失败: ${e.message}`);
        }
    };

    const handleCancel = async (expertId: string) => {
        if (socket) {
            socket.emit('update-expert-data', {
                projectId: state.projectId,
                expertId,
                data: { status: 'idle', logs: [] }
            });
        }
    };

    const handleRerun = (expertId: string) => {
        handleStartWork(expertId);
    };

    const expertStatuses = {};

    const hashRoute = useHashRoute();
    const themeProvider = useThemeProvider();

    if (hashRoute === '/llm-config') {
        return <LLMConfigPage onClose={() => window.location.hash = '/'} />;
    }

    if (hashRoute === '/theme-config') {
        return (
            <ThemeContext.Provider value={themeProvider}>
                <ThemeConfigPage onClose={() => window.location.hash = '/'} />
            </ThemeContext.Provider>
        );
    }

    if (!isConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#060b14', color: '#e2e8f0' }}>
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-slate-400">Connecting to Local Secure Server...</p>
                </div>
            </div>
        );
    }

    return (
        <ThemeContext.Provider value={themeProvider}>
        <div className="h-screen flex flex-col font-sans" style={{ backgroundColor: 'var(--color-bg, #060b14)', color: 'var(--color-text, #e2e8f0)' }}>
            <Header
                projectId={state.projectId}
                selectedScriptPath={state.selectedScript?.path}
                onSelectProject={handleSelectProject}
                onSelectScript={selectScript}
                activeModule={activeModule}
                onModuleChange={handleModuleChange}
            />

            {activeModule === 'crucible' ? (
                <main className="max-w-7xl mx-auto px-6 py-20">
                    <CrucibleHome />
                </main>
            ) : activeModule === 'delivery' ? (
                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <ExpertNav
                            activeExpertId={activeExpertId}
                            expertStatuses={expertStatuses}
                            onSelectExpert={handleSelectExpert}
                            isChatOpen={isChatOpen}
                            onToggleChat={() => setIsChatOpen(!isChatOpen)}
                        />

                        <div className="flex-1 flex overflow-hidden">
                            <main className="flex-1 overflow-y-auto px-6 py-8 transition-all duration-300">
                                <div className="max-w-7xl mx-auto">
                                    {activeExpertId === 'VisualAudit' ? (
                                        <VisualAuditPage />
                                    ) : activeExpertId === 'Director' ? (
                                        <DirectorSection
                                            projectId={state.projectId}
                                            scriptPath={state.selectedScript?.path || ''}
                                            socket={socket}
                                        />
                                    ) : activeExpertId === 'ShortsMaster' ? (
                                        <ShortsSection
                                            projectId={state.projectId}
                                            scriptPath={state.selectedScript?.path || ''}
                                            socket={socket}
                                        />
                                    ) : activeExpertId === 'MarketingMaster' ? (
                                        <MarketingSection
                                            projectId={state.projectId}
                                            scriptPath={state.selectedScript?.path || ''}
                                            socket={socket}
                                        />
                                    ) : (
                                        <ExpertPage
                                            expertId={activeExpertId}
                                            projectId={state.projectId}
                                            selectedScript={state.selectedScript}
                                            onStartWork={handleStartWork}
                                            onCancel={handleCancel}
                                            onRerun={handleRerun}
                                        />
                                    )}
                                </div>
                            </main>
                        </div>
                    </div>

                    {/* ChatPanel Sidebar (Spans full height of the work area) */}
                    <div className={`transition-all duration-300 flex-shrink-0 border-l border-slate-700/50 bg-[#0b1529]/80 backdrop-blur-md ${isChatOpen ? 'w-[25vw] min-w-[320px]' : 'w-0 overflow-hidden border-none'
                        }`}>
                        <ChatPanel
                            isOpen={true}
                            onToggle={() => setIsChatOpen(false)}
                            expertId={activeExpertId}
                            projectId={state.projectId}
                            socket={socket}
                        />
                    </div>
                </div>
            ) : (
                <ThemedModule moduleId="distribution">
                    <DistributionLayout
                        projectId={state.projectId}
                        activePage={activeDistributionPage}
                        onPageChange={setActiveDistributionPage}
                    />
                </ThemedModule>
            )}

            <StatusFooter isConnected={isConnected} />
        </div>
        </ThemeContext.Provider>
    );
}

const ThemedModule = ({ moduleId, children }: { moduleId: ModuleId; children: React.ReactNode }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { themeState, getModuleColors, getModuleDataTheme } = useTheme();

    useEffect(() => {
        const colors = getModuleColors(moduleId);
        if (ref.current) {
            applyThemeToElement(ref.current, colors);
        }
        // Also apply to document root so the outer app shell inherits the theme
        applyThemeToElement(document.documentElement, colors);

        return () => {
            // Clean up when switching away from this module
            const vars = [
                '--color-bg', '--color-surface', '--color-surface-alt',
                '--color-text', '--color-text-secondary', '--color-text-muted',
                '--color-border', '--color-module', '--color-module-light',
                '--color-module-mid', '--color-module-secondary',
            ];
            vars.forEach((v) => document.documentElement.style.removeProperty(v));
        };
    }, [themeState, moduleId, getModuleColors]);

    return (
        <div
            ref={ref}
            data-theme={getModuleDataTheme(moduleId)}
            className="flex-1 flex flex-col overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
        >
            {children}
        </div>
    );
};

const DistributionLayout = ({ activePage, onPageChange, projectId }: { activePage: DistributionPage; onPageChange: (page: DistributionPage) => void; projectId: string }) => {
    const navItems = [
        {
            id: 'accounts' as DistributionPage,
            label: 'Accounts Hub',
            summary: '管理全局账号状态与授权风险',
            icon: <Users className="w-4 h-4" />
        },
        {
            id: 'composer' as DistributionPage,
            label: 'Publish Composer',
            summary: '围绕一条内容完成跨平台提稿',
            icon: <Send className="w-4 h-4" />
        },
        {
            id: 'queue' as DistributionPage,
            label: 'Queue',
            summary: '观察队列、结果与最新事件',
            icon: <Clock className="w-4 h-4" />
        },
    ];

    const activeNavItem = navItems.find((item) => item.id === activePage) || navItems[0];
    const pageSignals: Record<DistributionPage, { title: string; bullets: string[] }> = {
        accounts: {
            title: '账号枢纽',
            bullets: [
                '先确认哪些平台可用，再决定发射面',
                '保持授权状态和业务动作解耦',
                '用一个统一的账号中心支撑所有发布页',
            ],
        },
        composer: {
            title: '单贴中心',
            bullets: [
                '先编辑这条内容，再处理平台差异',
                'Magic Fill 是来源增强，不是另一个页面',
                '提交策略固定在右侧，不随正文长度漂移',
            ],
        },
        queue: {
            title: '发布工作台',
            bullets: [
                '结果、重试、删除必须一眼可扫',
                '实时事件是辅助，不应压过任务本身',
                '让 artifact、draft、外链都能直接被看到',
            ],
        },
    };

    return (
        <div className="flex-1 overflow-hidden">
            <div className="h-full grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
                <aside className="border-r border-module/10 bg-surface/80 backdrop-blur-md">
                    <div className="h-full overflow-y-auto px-4 py-6">
                        <div className="mb-6 rounded-2xl border border-module/20 bg-gradient-to-br from-module/12 via-module-secondary/6 to-transparent p-4">
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-module/30 bg-module/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-module-light">
                                <Sparkles className="h-3.5 w-3.5" />
                                Secondary Modules
                            </div>
                            <h2 className="text-lg font-semibold text-text">Distribution Terminal</h2>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">
                                按黄金坩埚同系布局收口：左侧是模块切换，中间做主业务，右侧承接控制与解释。
                            </p>
                        </div>

                        <div className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-module-mid/80">
                            二级模块
                        </div>
                        <nav className="space-y-2">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onPageChange(item.id)}
                                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${activePage === item.id
                                        ? 'border-module/40 bg-gradient-to-r from-module/18 to-module-secondary/10 text-text shadow-[0_0_0_1px_rgba(var(--color-module),0.08)]'
                                        : 'border-border bg-surface/50 text-text-secondary hover:border-module/20 hover:bg-surface/80'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`rounded-xl p-2 ${activePage === item.id ? 'bg-module/15 text-module-light' : 'bg-surface-alt text-text-muted'}`}>
                                            {item.icon}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">{item.label}</span>
                                                {activePage === item.id && <ArrowRight className="h-3.5 w-3.5 text-module-light" />}
                                            </div>
                                            <p className="mt-1 text-xs leading-5 text-text-muted">{item.summary}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                <main className="min-w-0 overflow-y-auto px-6 py-8 xl:px-8">
                    <div className="mx-auto max-w-7xl">
                        {activePage === 'accounts' && <AccountsHub />}
                        {activePage === 'composer' && <PublishComposer projectId={projectId} />}
                        {activePage === 'queue' && <DistributionQueue projectId={projectId} />}
                    </div>
                </main>

                <aside className="hidden xl:block border-l border-module/10 bg-surface/80 backdrop-blur-md">
                    <div className="h-full overflow-y-auto px-5 py-6">
                        <div className="rounded-2xl border border-module/15 bg-surface/50 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-module-mid/80">
                                Current Focus
                            </div>
                            <h3 className="mt-2 text-lg font-semibold text-text">{activeNavItem.label}</h3>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">{activeNavItem.summary}</p>
                            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-module/20 bg-module/8 px-3 py-1 text-xs text-module-light">
                                <RadioTower className="h-3.5 w-3.5" />
                                项目：{projectId || '未选择'}
                            </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-border bg-surface/60 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                                Layout Notes
                            </div>
                            <h4 className="mt-2 text-sm font-semibold text-text">{pageSignals[activePage].title}</h4>
                            <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
                                {pageSignals[activePage].bullets.map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-module-mid/80" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default App;
