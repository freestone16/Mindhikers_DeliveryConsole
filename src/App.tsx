import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Loader2, Users, Send, Clock } from 'lucide-react';
import { StatusFooter } from './components/StatusFooter';
import { CrucibleWorkspace } from './components/CrucibleWorkspace';
import { LLMConfigPage } from './components/LLMConfigPage';
import { buildApiUrl } from './config/runtime';
import type { ChatMessage, HostRoutedAsset } from './types';
import { CRUCIBLE_HEADER_BADGES, getCrucibleSpeakerMeta } from './components/crucible/soulRegistry';
import { readCrucibleSnapshot } from './components/crucible/storage';

type ModuleType = 'crucible' | 'delivery' | 'distribution';
type DistributionPage = 'accounts' | 'composer' | 'queue';
const CRUCIBLE_EXPERT_ID = 'GoldenMetallurgist';
const CRUCIBLE_DEFAULT_PROJECT_ID = 'golden-crucible-sandbox';

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
    const [hasBootedCrucible, setHasBootedCrucible] = useState(false);
    const [crucibleHasBoardContent, setCrucibleHasBoardContent] = useState(false);
    const [crucibleManualSidebarWidth, setCrucibleManualSidebarWidth] = useState<number | null>(null);
    const [activeDistributionPage, setActiveDistributionPage] = useState<DistributionPage>('composer');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatResetToken, setChatResetToken] = useState(0);
    const [crucibleRoutedAssets, setCrucibleRoutedAssets] = useState<HostRoutedAsset[]>([]);
    const [crucibleTopicTitle, setCrucibleTopicTitle] = useState(() => {
        const snap = readCrucibleSnapshot();
        return snap?.topicTitle || '标题待定';
    });
    const [crucibleSeedPrompt, setCrucibleSeedPrompt] = useState('');
    const [crucibleSeedVersion, setCrucibleSeedVersion] = useState(0);
    const [crucibleInjectedMessages, setCrucibleInjectedMessages] = useState<ChatMessage[]>(() => {
        const snap = readCrucibleSnapshot();
        if (!snap?.messages?.length) return [];
        return snap.messages.map((msg) => ({
            id: msg.id,
            role: (msg.speaker === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: msg.content,
            timestamp: msg.timestamp || msg.createdAt,
            meta: msg.speaker !== 'user' ? getCrucibleSpeakerMeta(msg.speaker) : undefined,
        }));
    });
    const [crucibleTurnSettledToken, setCrucibleTurnSettledToken] = useState(0);
    const previousContextRef = useRef({ projectId: '', scriptPath: '' });
    const injectedRoundKeysRef = useRef<Set<string>>(new Set());
    const crucibleShellRef = useRef<HTMLDivElement | null>(null);

    const buildPhaseOneState = useCallback((expertId: string, nextScriptPath: string) => {
        if (expertId === 'Director') {
            return { phase: 1, conceptProposal: '', conceptFeedback: '', isConceptApproved: false, items: [], renderJobs: [] };
        }

        if (expertId === 'ShortsMaster') {
            return { phase: 1, scripts: [], renderUnits: [], subtitleConfigs: [] };
        }

        if (expertId === 'MarketingMaster') {
            return {
                phase: 1,
                phase1SubStep: 'candidates',
                candidates: [],
                goldenKeywords: [],
                activeTabIndex: 0,
                plans: [],
                selectedScript: nextScriptPath
                    ? {
                        filename: nextScriptPath.split('/').pop() || nextScriptPath,
                        path: nextScriptPath,
                    }
                    : undefined,
            };
        }

        return { status: 'idle', logs: [] };
    }, []);

    const resetActiveExpertContext = useCallback((projectId: string, nextScriptPath: string) => {
        if (!socket || !projectId) return;

        if (activeModule === 'crucible') {
            setCrucibleRoutedAssets([]);
            setCrucibleSeedPrompt('');
            setCrucibleSeedVersion(0);
            setCrucibleInjectedMessages([]);
            setCrucibleHasBoardContent(false);
            setCrucibleTurnSettledToken(0);
            injectedRoundKeysRef.current.clear();
            setChatResetToken((prev) => prev + 1);
            return;
        }

        if (activeModule !== 'delivery') return;

        socket.emit('update-expert-data', {
            projectId,
            expertId: activeExpertId,
            data: buildPhaseOneState(activeExpertId, nextScriptPath),
        });
        setChatResetToken((prev) => prev + 1);
    }, [socket, activeModule, activeExpertId, buildPhaseOneState]);

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

    const handleSelectScript = async (projectId: string, scriptPath: string) => {
        return selectScript(projectId, scriptPath);
    };

    const crucibleProjectId = state.projectId || CRUCIBLE_DEFAULT_PROJECT_ID;

    const handleSelectExpert = (expertId: string) => {
        setActiveExpertId(expertId);
    };

    const handleModuleChange = (module: ModuleType) => {
        setActiveModule(module);
        if (module === 'crucible') {
            setHasBootedCrucible(true);
        }
    };

    const handleCrucibleRouteAsset = useCallback((asset: HostRoutedAsset) => {
        setCrucibleRoutedAssets((prev) => {
            if (prev.some((item) => item.id === asset.id || (item.type === asset.type && item.content === asset.content))) {
                return prev;
            }
            return [asset, ...prev].slice(0, 12);
        });
    }, []);

    const handleCrucibleUserPrompt = useCallback((content: string) => {
        const normalized = content.trim();
        if (!normalized) {
            return;
        }
        setCrucibleSeedPrompt(normalized);
        setCrucibleSeedVersion((prev) => prev + 1);
    }, []);

    const handleCrucibleReset = useCallback(() => {
        setCrucibleRoutedAssets([]);
        setCrucibleSeedPrompt('');
        setCrucibleSeedVersion(0);
        setCrucibleInjectedMessages([]);
        setCrucibleHasBoardContent(false);
        setCrucibleTurnSettledToken(0);
        injectedRoundKeysRef.current.clear();
        setCrucibleTopicTitle('标题待定');
        setChatResetToken((prev) => prev + 1);
    }, []);

    const handleCrucibleRoundGenerated = useCallback((payload: {
        speaker: string;
        reflection: string;
        source: 'socrates' | 'fallback';
        roundIndex: number;
    }) => {
        const roundKey = `${payload.roundIndex}`;
        if (injectedRoundKeysRef.current.has(roundKey)) {
            return;
        }
        injectedRoundKeysRef.current.add(roundKey);

        const meta = {
            ...getCrucibleSpeakerMeta(payload.speaker),
            classification: 'dialogue' as const,
        };

        setCrucibleInjectedMessages((prev) => [
            ...prev,
            {
                id: `crucible_round_${payload.roundIndex}_${Date.now()}`,
                role: 'assistant',
                content: payload.reflection,
                timestamp: new Date().toISOString(),
                meta,
            },
        ]);
    }, []);

    const handleStartWork = async (expertId: string) => {
        if (!state.selectedScript) {
            alert('请先选择文稿');
            return;
        }

        try {
            const res = await fetch(buildApiUrl('/api/experts/run'), {
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

    useEffect(() => {
        const currentContext = {
            projectId: state.projectId,
            scriptPath: state.selectedScript?.path || '',
        };
        const previousContext = previousContextRef.current;
        const hasContextChanged = previousContext.projectId !== currentContext.projectId
            || previousContext.scriptPath !== currentContext.scriptPath;

        if (hasContextChanged && currentContext.projectId) {
            resetActiveExpertContext(currentContext.projectId, currentContext.scriptPath);
            // Only wipe crucible state on a real project switch (not on initial load from '' → projectId)
            if (previousContext.projectId !== '') {
                setCrucibleTopicTitle('标题待定');
                setCrucibleRoutedAssets([]);
                setCrucibleSeedPrompt('');
                setCrucibleSeedVersion(0);
                setCrucibleInjectedMessages([]);
                setCrucibleHasBoardContent(false);
                setCrucibleTurnSettledToken(0);
                injectedRoundKeysRef.current.clear();
            }
        }

        previousContextRef.current = currentContext;
    }, [state.projectId, state.selectedScript?.path, resetActiveExpertContext]);

    const handleCrucibleDividerMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        const container = crucibleShellRef.current;
        if (!container) {
            return;
        }

        event.preventDefault();
        const rect = container.getBoundingClientRect();
        const minWidth = 320;
        const maxWidth = Math.max(minWidth, rect.width - 180);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const nextWidth = Math.min(maxWidth, Math.max(minWidth, rect.right - moveEvent.clientX));
            setCrucibleManualSidebarWidth(nextWidth);
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, []);

    const handleCrucibleBoardStateChange = useCallback((payload: { hasContent: boolean }) => {
        setCrucibleHasBoardContent(payload.hasContent);
    }, []);

    const handleCrucibleTurnSettled = useCallback(() => {
        setCrucibleTurnSettledToken((prev) => prev + 1);
    }, []);

    const crucibleSidebarStyle = crucibleManualSidebarWidth
        ? { width: `${crucibleManualSidebarWidth}px` }
        : { width: crucibleHasBoardContent ? 'clamp(440px, 35vw, 620px)' : 'clamp(520px, 46vw, 760px)' };

    if (hashRoute === '/llm-config') {
        return <LLMConfigPage onClose={() => window.location.hash = '/'} />;
    }

    if (!isConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--shell-bg)] text-[var(--ink-1)]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                    <p className="text-sm text-[var(--ink-3)]">Connecting to local console...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[var(--shell-bg)] text-[var(--ink-1)]">
            <Header
                projectId={state.projectId}
                selectedScriptPath={state.selectedScript?.path}
                onSelectProject={handleSelectProject}
                onSelectScript={handleSelectScript}
                activeModule={activeModule}
                onModuleChange={handleModuleChange}
            />

            {(activeModule === 'crucible' || hasBootedCrucible) && (
                <div
                    ref={crucibleShellRef}
                    className={`min-h-0 flex-1 overflow-hidden ${activeModule === 'crucible' ? 'flex' : 'hidden'}`}
                    aria-hidden={activeModule !== 'crucible'}
                >
                    <div className="min-h-0 flex-1 overflow-hidden">
                        <CrucibleWorkspace
                            projectId={crucibleProjectId}
                            scriptPath={state.selectedScript?.path || ''}
                            incomingAssets={crucibleRoutedAssets}
                            topicTitle={crucibleTopicTitle}
                            seedPrompt={crucibleSeedPrompt}
                            seedPromptVersion={crucibleSeedVersion}
                            onResetWorkspace={handleCrucibleReset}
                            onRoundGenerated={handleCrucibleRoundGenerated}
                            onBlackboardStateChange={handleCrucibleBoardStateChange}
                            onTurnSettled={handleCrucibleTurnSettled}
                        />
                    </div>
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        onMouseDown={handleCrucibleDividerMouseDown}
                        onDoubleClick={() => setCrucibleManualSidebarWidth(null)}
                        className="group relative hidden w-3 cursor-col-resize xl:block"
                    >
                        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[rgba(142,99,55,0.12)] transition-colors group-hover:bg-[rgba(142,99,55,0.32)]" />
                    </div>
                    <div
                        style={crucibleSidebarStyle}
                        className="min-w-[320px] max-w-[1200px] border-l border-[var(--line-soft)] bg-[rgba(255,250,242,0.76)] backdrop-blur-md"
                    >
                        <ChatPanel
                            isOpen={activeModule === 'crucible'}
                            onToggle={() => undefined}
                            expertId={CRUCIBLE_EXPERT_ID}
                            projectId={crucibleProjectId}
                            scriptPath={state.selectedScript?.path || ''}
                            resetToken={chatResetToken}
                            displayName={crucibleTopicTitle}
                            panelTitle="对话"
                            headerBadges={CRUCIBLE_HEADER_BADGES}
                            externalMessages={crucibleInjectedMessages}
                            onUserMessage={handleCrucibleUserPrompt}
                            onRouteAsset={handleCrucibleRouteAsset}
                            blackboardHint={crucibleHasBoardContent ? '中屏有参考内容挂出来了，你可以顺便看一眼。' : null}
                            crucibleTurnSettledToken={crucibleTurnSettledToken}
                            socket={socket}
                        />
                    </div>
                </div>
            )}

            {activeModule === 'delivery' ? (
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
                            scriptPath={state.selectedScript?.path || ''}
                            resetToken={chatResetToken}
                            socket={socket}
                        />
                    </div>
                </div>
            ) : null}

            {activeModule === 'distribution' ? (
                <DistributionLayout
                    activePage={activeDistributionPage}
                    onPageChange={setActiveDistributionPage}
                />
            ) : null}

            <StatusFooter
                isConnected={isConnected}
                activeChatExpertId={activeModule === 'crucible' ? CRUCIBLE_EXPERT_ID : activeExpertId}
            />
        </div>
    );
}

const DistributionLayout = ({ activePage, onPageChange }: { activePage: DistributionPage; onPageChange: (page: DistributionPage) => void }) => {
    const navItems = [
        { id: 'accounts' as DistributionPage, label: 'Accounts Hub', icon: <Users className="w-4 h-4" /> },
        { id: 'composer' as DistributionPage, label: 'Publish Composer', icon: <Send className="w-4 h-4" /> },
        { id: 'queue' as DistributionPage, label: 'Queue', icon: <Clock className="w-4 h-4" /> },
    ];

    return (
        <>
            <div className="border-b border-[var(--line-soft)] bg-[rgba(255,250,242,0.78)] backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6">
                    <nav className="flex gap-1 py-2">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onPageChange(item.id)}
                                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${activePage === item.id
                                    ? 'bg-[var(--surface-2)] text-[var(--ink-1)]'
                                    : 'text-[var(--ink-3)] hover:bg-[var(--surface-1)] hover:text-[var(--ink-1)]'
                                    }`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
            <main className="max-w-7xl mx-auto px-6 py-8">
                {activePage === 'accounts' && <AccountsHub />}
                {activePage === 'composer' && <PublishComposer />}
                {activePage === 'queue' && <DistributionQueue />}
            </main>
        </>
    );
};

export default App;
