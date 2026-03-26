import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { ChatPanel } from './components/ChatPanel';
import { useDeliveryStore, INITIAL_STATE } from './hooks/useDeliveryStore';
import { Loader2 } from 'lucide-react';
import { StatusFooter } from './components/StatusFooter';
import { CrucibleWorkspace } from './components/CrucibleWorkspace';
import { LLMConfigPage } from './components/LLMConfigPage';
import type { ChatMessage, HostRoutedAsset } from './types';
import type { CrucibleSnapshot } from './components/crucible/types';
import { CRUCIBLE_HEADER_BADGES, getCrucibleSpeakerMeta } from './components/crucible/soulRegistry';
import { readCrucibleSnapshot, readPersistedCrucibleSnapshot } from './components/crucible/storage';

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
    const [crucibleHasBoardContent, setCrucibleHasBoardContent] = useState(false);
    const [crucibleManualSidebarWidth, setCrucibleManualSidebarWidth] = useState<number | null>(null);
    const [chatResetToken, setChatResetToken] = useState(0);
    const [crucibleRoutedAssets, setCrucibleRoutedAssets] = useState<HostRoutedAsset[]>([]);
    const [crucibleTopicTitle, setCrucibleTopicTitle] = useState(() => {
        const snap = readCrucibleSnapshot();
        return snap?.topicTitle || '标题待定';
    });
    const [crucibleSeedPrompt, setCrucibleSeedPrompt] = useState('');
    const [crucibleSeedVersion, setCrucibleSeedVersion] = useState(0);
    const [crucibleTurnSettledToken, setCrucibleTurnSettledToken] = useState(0);
    const injectedRoundKeysRef = useRef<Set<string>>(new Set());
    const crucibleShellRef = useRef<HTMLDivElement | null>(null);

    const toInjectedMessages = useCallback((snapshot: CrucibleSnapshot | null) => {
        if (!snapshot?.messages?.length) {
            injectedRoundKeysRef.current.clear();
            return [];
        }

        const roundKeys = new Set<string>();
        const mapped = snapshot.messages.map((msg) => {
            const roundMatch = msg.id.match(/^crucible_round_(\d+)_/);
            if (roundMatch) {
                roundKeys.add(roundMatch[1]);
            }

            return {
                id: msg.id,
                role: (msg.speaker === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
                content: msg.content,
                timestamp: msg.timestamp || msg.createdAt,
                meta: msg.speaker !== 'user' ? getCrucibleSpeakerMeta(msg.speaker) : undefined,
            };
        });

        injectedRoundKeysRef.current = roundKeys;
        return mapped;
    }, []);
    const [crucibleInjectedMessages, setCrucibleInjectedMessages] = useState<ChatMessage[]>(() => (
        toInjectedMessages(readCrucibleSnapshot())
    ));

    const resetCrucibleContext = useCallback(() => {
        setCrucibleRoutedAssets([]);
        setCrucibleSeedPrompt('');
        setCrucibleSeedVersion(0);
        setCrucibleInjectedMessages([]);
        setCrucibleHasBoardContent(false);
        setCrucibleTurnSettledToken(0);
        injectedRoundKeysRef.current.clear();
        setChatResetToken((prev) => prev + 1);
    }, []);

    useEffect(() => {
        if (!isConnected || !socket || state.projectId) {
            return;
        }

        const projectId = CRUCIBLE_DEFAULT_PROJECT_ID;
        setState({
            ...INITIAL_STATE,
            projectId,
            lastUpdated: new Date().toISOString(),
        });
        socket.emit('select-project', projectId);
    }, [isConnected, socket, state.projectId, setState]);

    useEffect(() => {
        let cancelled = false;

        void readPersistedCrucibleSnapshot().then((snapshot) => {
            if (!snapshot || cancelled) {
                return;
            }

            setCrucibleTopicTitle(snapshot.topicTitle || '标题待定');
            setCrucibleInjectedMessages(toInjectedMessages(snapshot));
            setCrucibleHasBoardContent((snapshot.presentables || []).length > 0);
        });

        return () => {
            cancelled = true;
        };
    }, [toInjectedMessages]);

    const handleSelectProject = (projectId: string) => {
        if (projectId !== state.projectId) {
            handleCrucibleReset();
        }
        setState({
            ...INITIAL_STATE,
            projectId,
            lastUpdated: new Date().toISOString(),
        });
        if (socket) {
            socket.emit('select-project', projectId);
        }
    };

    const handleSelectScript = async (projectId: string, scriptPath: string) => {
        const hasChanged = projectId !== state.projectId || scriptPath !== state.selectedScript?.path;
        const didSelect = await selectScript(projectId, scriptPath);
        if (didSelect && hasChanged) {
            handleCrucibleReset();
        }
        return didSelect;
    };

    const crucibleProjectId = state.projectId || CRUCIBLE_DEFAULT_PROJECT_ID;

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
        resetCrucibleContext();
        setCrucibleTopicTitle('标题待定');
    }, [resetCrucibleContext]);

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

    const hashRoute = useHashRoute();

    const handleCrucibleDividerMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        const container = crucibleShellRef.current;
        if (!container) {
            return;
        }

        event.preventDefault();
        const rect = container.getBoundingClientRect();
        const minWidth = 280;
        const maxWidth = Math.max(minWidth, rect.width - 80);

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
                    <p className="text-sm text-[var(--ink-3)]">Connecting to GoldenCrucible...</p>
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
            />

            <div ref={crucibleShellRef} className="min-h-0 flex flex-1 overflow-hidden">
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
                    className="min-w-[280px] max-w-[1200px] border-l border-[var(--line-soft)] bg-[rgba(255,250,242,0.76)] backdrop-blur-md"
                >
                    <ChatPanel
                        isOpen={true}
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
                        onResetAll={handleCrucibleReset}
                        blackboardHint={crucibleHasBoardContent ? '中屏有参考内容挂出来了，你可以顺便看一眼。' : null}
                        crucibleTurnSettledToken={crucibleTurnSettledToken}
                        socket={socket}
                    />
                </div>
            </div>

            <StatusFooter
                isConnected={isConnected}
                activeChatExpertId={CRUCIBLE_EXPERT_ID}
            />
        </div>
    );
}

export default App;
