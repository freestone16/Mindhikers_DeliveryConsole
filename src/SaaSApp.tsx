import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { buildApiUrl } from './config/runtime';
import { Header, type HeaderModule } from './components/Header';
import { ChatPanel } from './components/ChatPanel';
import { StatusFooter } from './components/StatusFooter';
import { CrucibleWorkspace } from './components/CrucibleWorkspace';
import { SaaSLLMConfigPage } from './components/SaaSLLMConfigPage';
import { CrucibleHistorySheet } from './components/crucible/CrucibleHistorySheet';
import { useDeliveryStore, INITIAL_STATE } from './hooks/useDeliveryStore';
import type { ChatMessage, HostRoutedAsset } from './types';
import { buildCrucibleHeaderBadges, getCrucibleSpeakerMeta } from './components/crucible/soulRegistry';
import {
    clearPersistedCrucibleSnapshot,
    readPersistedCrucibleSnapshot,
    readScopedCrucibleSnapshot,
    writeCrucibleSnapshot,
} from './components/crucible/storage';
import type { CrucibleSnapshot } from './components/crucible/types';
import { useAppAuth } from './auth/useAppAuth';

type SaaSModule = 'crucible' | 'distribution';
type CrucibleTrialStatus = {
    enabled: boolean;
    mode: 'platform';
    limits: {
        conversationLimit: number;
        turnLimitPerConversation: number;
    };
    usage: {
        conversationsUsed: number;
        conversationsRemaining: number;
        currentConversationId?: string;
        currentConversationTurnsUsed: number;
        currentConversationTurnsRemaining: number;
    };
    status: 'inactive' | 'active' | 'conversation_exhausted' | 'quota_exhausted';
    requiresByok: boolean;
    message: string;
};

const CRUCIBLE_EXPERT_ID = 'GoldenMetallurgist';
const CRUCIBLE_DEFAULT_PROJECT_ID = 'golden-crucible-sandbox';
const getCrucibleAutosaveBootstrapKey = (workspaceId?: string | null) => (
    `golden-crucible-autosave-bootstrap-v2:${workspaceId?.trim() || 'legacy'}`
);

const toCrucibleInjectedMessages = (snapshot?: CrucibleSnapshot | null): ChatMessage[] => {
    if (!snapshot?.messages?.length) return [];
    return snapshot.messages.map((msg) => ({
        id: msg.id,
        role: (msg.speaker === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp || msg.createdAt,
        meta: msg.speaker !== 'user' ? getCrucibleSpeakerMeta(msg.speaker) : undefined,
    }));
};

const toSnapshotTime = (snapshot?: CrucibleSnapshot | null) => {
    if (!snapshot?.updatedAt) {
        return Number.NaN;
    }

    return new Date(snapshot.updatedAt).getTime();
};

const shouldHydratePersistedSnapshot = (
    persistedSnapshot?: CrucibleSnapshot | null,
    localSnapshot?: CrucibleSnapshot | null,
) => {
    if (!persistedSnapshot?.topicTitle || !persistedSnapshot.messages?.length) {
        return false;
    }

    if (!localSnapshot) {
        return true;
    }

    const persistedTime = toSnapshotTime(persistedSnapshot);
    const localTime = toSnapshotTime(localSnapshot);
    const persistedHasTime = Number.isFinite(persistedTime);
    const localHasTime = Number.isFinite(localTime);

    if ((persistedSnapshot.conversationId || '') !== (localSnapshot.conversationId || '')) {
        if (!localHasTime) {
            return true;
        }
        if (!persistedHasTime) {
            return persistedSnapshot.messages.length > (localSnapshot.messages?.length || 0);
        }
        return persistedTime >= localTime;
    }

    if ((persistedSnapshot.topicTitle || '') !== (localSnapshot.topicTitle || '')) {
        return true;
    }

    if (!localHasTime) {
        return true;
    }
    if (!persistedHasTime) {
        return persistedSnapshot.messages.length > (localSnapshot.messages?.length || 0);
    }

    if (persistedTime !== localTime) {
        return persistedTime > localTime;
    }

    return persistedSnapshot.messages.length > (localSnapshot.messages?.length || 0);
};

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

function SaaSApp() {
    const { authEnabled, session: authSession, workspace, signOut } = useAppAuth();
    const crucibleWorkspaceId = workspace?.activeWorkspace.id || null;
    const initialCrucibleSnapshot = readScopedCrucibleSnapshot(crucibleWorkspaceId);
    const crucibleAutosaveBootstrapKey = getCrucibleAutosaveBootstrapKey(crucibleWorkspaceId);
    const { state, isConnected, selectScript, socket, setState } = useDeliveryStore();
    const [activeModule, setActiveModule] = useState<SaaSModule>('crucible');
    const [hasBootedCrucible, setHasBootedCrucible] = useState(true);
    const [crucibleHasBoardContent, setCrucibleHasBoardContent] = useState(false);
    const [crucibleManualSidebarWidth, setCrucibleManualSidebarWidth] = useState<number | null>(null);
    const [chatResetToken, setChatResetToken] = useState(0);
    const [crucibleRoutedAssets, setCrucibleRoutedAssets] = useState<HostRoutedAsset[]>([]);
    const [crucibleTopicTitle, setCrucibleTopicTitle] = useState(() => initialCrucibleSnapshot?.topicTitle || '标题待定');
    const [crucibleSeedPrompt, setCrucibleSeedPrompt] = useState('');
    const [crucibleSeedVersion, setCrucibleSeedVersion] = useState(0);
    const [crucibleInjectedMessages, setCrucibleInjectedMessages] = useState<ChatMessage[]>(() => toCrucibleInjectedMessages(initialCrucibleSnapshot));
    const [crucibleTurnSettledToken, setCrucibleTurnSettledToken] = useState(0);
    const [crucibleWorkspaceKey, setCrucibleWorkspaceKey] = useState(0);
    const [isCrucibleHistoryOpen, setIsCrucibleHistoryOpen] = useState(false);
    const [crucibleConversationState, setCrucibleConversationState] = useState({
        conversationId: initialCrucibleSnapshot?.conversationId || '',
        roundIndex: initialCrucibleSnapshot?.roundIndex || 0,
    });
    const [crucibleTrialStatus, setCrucibleTrialStatus] = useState<CrucibleTrialStatus | null>(null);
    const [crucibleTrialWarning, setCrucibleTrialWarning] = useState<string | null>(null);
    const [crucibleThesisReady, setCrucibleThesisReady] = useState(false);
    const [isGeneratingThesis, setIsGeneratingThesis] = useState(false);
    const [thesisError, setThesisError] = useState<string | null>(null);
    const previousContextRef = useRef({ projectId: '', scriptPath: '' });
    const injectedRoundKeysRef = useRef<Set<string>>(new Set());
    const crucibleShellRef = useRef<HTMLDivElement | null>(null);
    const hashRoute = useHashRoute();

    const currentUserBadge = useMemo(() => {
        const displayName = authSession?.user.name?.trim()
            || authSession?.user.email?.split('@')[0]
            || '你';

        return {
            id: 'user',
            name: displayName,
            role: '当前用户',
            avatarText: displayName.slice(0, 1).toUpperCase(),
            avatarImage: authSession?.user.image || undefined,
        };
    }, [authSession?.user.email, authSession?.user.image, authSession?.user.name]);

    const crucibleHeaderBadges = useMemo(
        () => buildCrucibleHeaderBadges(currentUserBadge),
        [currentUserBadge],
    );

    const hydrateCrucibleSnapshot = useCallback((snapshot: CrucibleSnapshot) => {
        writeCrucibleSnapshot(snapshot, { workspaceId: crucibleWorkspaceId });
        window.localStorage.setItem(crucibleAutosaveBootstrapKey, 'done');
        injectedRoundKeysRef.current.clear();
        setCrucibleRoutedAssets([]);
        setCrucibleTopicTitle(snapshot.topicTitle || '标题待定');
        setCrucibleInjectedMessages(toCrucibleInjectedMessages(snapshot));
        setCrucibleHasBoardContent(Boolean(snapshot.presentables?.length || snapshot.crystallizedQuotes?.length));
        setCrucibleSeedPrompt('');
        setCrucibleSeedVersion(0);
        setCrucibleTurnSettledToken(0);
        setCrucibleConversationState({
            conversationId: snapshot.conversationId || '',
            roundIndex: snapshot.roundIndex || 0,
        });
        setCrucibleThesisReady(snapshot.thesisReady || false);
        setActiveModule('crucible');
        setHasBootedCrucible(true);
        setCrucibleWorkspaceKey((prev) => prev + 1);
        setChatResetToken((prev) => prev + 1);
    }, [crucibleAutosaveBootstrapKey, crucibleWorkspaceId]);

    const resetCrucibleState = useCallback((options?: { remount?: boolean; clearPersisted?: boolean }) => {
        if (options?.clearPersisted) {
            window.localStorage.removeItem(crucibleAutosaveBootstrapKey);
            void clearPersistedCrucibleSnapshot({ workspaceId: crucibleWorkspaceId });
        }
        setCrucibleRoutedAssets([]);
        setCrucibleSeedPrompt('');
        setCrucibleSeedVersion(0);
        setCrucibleInjectedMessages([]);
        setCrucibleHasBoardContent(false);
        setCrucibleTurnSettledToken(0);
        injectedRoundKeysRef.current.clear();
        setCrucibleTopicTitle('标题待定');
        setCrucibleConversationState({
            conversationId: '',
            roundIndex: 0,
        });
        setCrucibleThesisReady(false);
        setChatResetToken((prev) => prev + 1);
        if (options?.remount) {
            setCrucibleWorkspaceKey((prev) => prev + 1);
        }
    }, [crucibleAutosaveBootstrapKey, crucibleWorkspaceId]);

    useEffect(() => {
        const currentContext = {
            projectId: state.projectId,
            scriptPath: state.selectedScript?.path || '',
        };
        const previousContext = previousContextRef.current;
        const hasContextChanged = previousContext.projectId !== currentContext.projectId
            || previousContext.scriptPath !== currentContext.scriptPath;

        if (hasContextChanged && currentContext.projectId && previousContext.projectId !== '') {
            resetCrucibleState({ remount: true });
        }

        previousContextRef.current = currentContext;
    }, [resetCrucibleState, state.projectId, state.selectedScript?.path]);

    useEffect(() => {
        let cancelled = false;

        const hydrateFromAutosave = async () => {
            try {
                const localSnapshot = readScopedCrucibleSnapshot(crucibleWorkspaceId);
                const persistedSnapshot = await readPersistedCrucibleSnapshot({ workspaceId: crucibleWorkspaceId });
                if (!persistedSnapshot || cancelled || !shouldHydratePersistedSnapshot(persistedSnapshot, localSnapshot)) {
                    return;
                }

                hydrateCrucibleSnapshot(persistedSnapshot);
            } catch (error) {
                console.warn('[Crucible] Failed to hydrate autosave on boot:', error);
            }
        };

        void hydrateFromAutosave();

        return () => {
            cancelled = true;
        };
    }, [crucibleAutosaveBootstrapKey, crucibleWorkspaceId, hydrateCrucibleSnapshot]);

    const crucibleProjectId = state.projectId || CRUCIBLE_DEFAULT_PROJECT_ID;

    const handleOpenCrucibleHistory = useCallback(() => {
        setActiveModule('crucible');
        setHasBootedCrucible(true);
        setIsCrucibleHistoryOpen(true);
    }, []);

    const handleStartNewCrucibleTopic = useCallback(() => {
        setIsCrucibleHistoryOpen(false);
        setActiveModule('crucible');
        setHasBootedCrucible(true);
        resetCrucibleState({ remount: true, clearPersisted: true });
    }, [resetCrucibleState]);

    const handleEnterThesisWriter = useCallback(async () => {
        if (isGeneratingThesis) return;
        setIsGeneratingThesis(true);
        setThesisError(null);
        try {
            const conversationId = crucibleConversationState.conversationId;
            if (!conversationId) {
                throw new Error('没有活跃对话');
            }
            const response = await fetch('/api/crucible/thesis/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId,
                    projectId: crucibleProjectId,
                    scriptPath: state.selectedScript?.path || '',
                }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: '论文生成失败' }));
                throw new Error(errorData.message || errorData.error || '论文生成失败');
            }
            const data = await response.json();
            setCrucibleThesisReady(false);
            if (data.content) {
                const blob = new Blob([data.content], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${data.artifact?.title || '论文'}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            setCrucibleTrialWarning('论文已生成，已开始下载');
        } catch (error: any) {
            setThesisError(error.message || '论文生成失败');
        } finally {
            setIsGeneratingThesis(false);
        }
    }, [crucibleConversationState.conversationId, crucibleProjectId, isGeneratingThesis, state.selectedScript?.path]);

    const handleRestoreCrucibleHistory = useCallback((snapshot: CrucibleSnapshot) => {
        hydrateCrucibleSnapshot(snapshot);
    }, [hydrateCrucibleSnapshot]);

    const handleSelectProject = (projectId: string) => {
        setState({
            ...INITIAL_STATE,
            projectId,
            lastUpdated: new Date().toISOString(),
        });

        if (socket) {
            socket.emit('select-project', projectId);
        }
    };

    const handleSelectScript = async (projectId: string, scriptPath: string) => selectScript(projectId, scriptPath);

    const handleModuleChange = (module: HeaderModule) => {
        if (module === 'delivery') {
            return;
        }

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
    const refreshCrucibleTrialStatus = useCallback(async () => {
        if (!authEnabled || !authSession?.user?.id) {
            setCrucibleTrialStatus(null);
            return;
        }

        try {
            const search = new URLSearchParams();
            if (crucibleConversationState.conversationId) {
                search.set('conversationId', crucibleConversationState.conversationId);
            }
            if (state.projectId) {
                search.set('projectId', state.projectId);
            }
            if (state.selectedScript?.path) {
                search.set('scriptPath', state.selectedScript.path);
            }

            const response = await fetch(buildApiUrl(`/api/crucible/trial-status?${search.toString()}`), {
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error(`trial status failed: ${response.status}`);
            }

            const payload = await response.json() as CrucibleTrialStatus;
            setCrucibleTrialStatus(payload);
        } catch (error) {
            console.warn('[CrucibleTrial] Failed to refresh status:', error);
        }
    }, [authEnabled, authSession?.user?.id, crucibleConversationState.conversationId, state.projectId, state.selectedScript?.path]);
    const handleCrucibleConversationStateChange = useCallback((payload: { conversationId?: string; roundIndex: number }) => {
        setCrucibleConversationState({
            conversationId: payload.conversationId || '',
            roundIndex: payload.roundIndex,
        });
    }, []);
    const handleCrucibleTurnError = useCallback((payload: { message: string }) => {
        setCrucibleTrialWarning(payload.message);
        void refreshCrucibleTrialStatus();
    }, [refreshCrucibleTrialStatus]);

    useEffect(() => {
        void refreshCrucibleTrialStatus();
    }, [refreshCrucibleTrialStatus]);

    useEffect(() => {
        if (!crucibleTrialWarning) {
            return;
        }

        const timer = window.setTimeout(() => setCrucibleTrialWarning(null), 4200);
        return () => window.clearTimeout(timer);
    }, [crucibleTrialWarning]);

    const crucibleSidebarStyle = crucibleManualSidebarWidth
        ? { width: `${crucibleManualSidebarWidth}px` }
        : { width: crucibleHasBoardContent ? 'clamp(440px, 35vw, 620px)' : 'clamp(520px, 46vw, 760px)' };

    if (hashRoute === '/llm-config') {
        return (
            <SaaSLLMConfigPage
                trialStatus={crucibleTrialStatus}
                onSaved={refreshCrucibleTrialStatus}
                onClose={() => { window.location.hash = '/'; }}
            />
        );
    }

    if (!isConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--shell-bg)] text-[var(--ink-1)]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                    <p className="text-sm text-[var(--ink-3)]">Connecting to SaaS console...</p>
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
                availableModules={['crucible']}
                lockSelectorsWhenCrucible={false}
                appTitle="黄金坩埚 Golden Crucible"
                hideWorkspaceControls
                authSummary={authEnabled && authSession ? {
                    displayName: authSession.user.name?.trim() || authSession.user.email,
                    email: authSession.user.email,
                    avatarImage: authSession.user.image,
                    workspaceName: workspace?.activeWorkspace.name,
                    onOpenHistory: handleOpenCrucibleHistory,
                    onSignOut: () => {
                        void signOut();
                    },
                } : undefined}
            />

            {(activeModule === 'crucible' || hasBootedCrucible) && (
                <div
                    ref={crucibleShellRef}
                    className={`min-h-0 flex-1 overflow-hidden ${activeModule === 'crucible' ? 'flex' : 'hidden'}`}
                    aria-hidden={activeModule !== 'crucible'}
                >
                    <div className="min-h-0 flex-1 overflow-hidden">
                        <CrucibleWorkspace
                            key={crucibleWorkspaceKey}
                            projectId={crucibleProjectId}
                            scriptPath={state.selectedScript?.path || ''}
                            workspaceId={crucibleWorkspaceId}
                            incomingAssets={crucibleRoutedAssets}
                            topicTitle={crucibleTopicTitle}
                            seedPrompt={crucibleSeedPrompt}
                            seedPromptVersion={crucibleSeedVersion}
                            onResetWorkspace={() => resetCrucibleState({ clearPersisted: true })}
                            onRoundGenerated={handleCrucibleRoundGenerated}
                            onBlackboardStateChange={handleCrucibleBoardStateChange}
                            onTurnSettled={handleCrucibleTurnSettled}
                            onConversationStateChange={handleCrucibleConversationStateChange}
                            onTurnError={handleCrucibleTurnError}
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
                            key={`crucible-chat-${chatResetToken}`}
                            isOpen={activeModule === 'crucible'}
                            onToggle={() => undefined}
                            expertId={CRUCIBLE_EXPERT_ID}
                            projectId={crucibleProjectId}
                            scriptPath={state.selectedScript?.path || ''}
                            resetToken={chatResetToken}
                            displayName={crucibleTopicTitle}
                            panelTitle="对话"
                            currentUserBadge={currentUserBadge}
                            headerBadges={crucibleHeaderBadges}
                            externalMessages={crucibleInjectedMessages}
                            onUserMessage={handleCrucibleUserPrompt}
                            onRouteAsset={handleCrucibleRouteAsset}
                            onPersistedSnapshotSaved={handleRestoreCrucibleHistory}
                            onResetAll={() => resetCrucibleState({ remount: true, clearPersisted: true })}
                            onOpenHistory={handleOpenCrucibleHistory}
                            blackboardHint={crucibleHasBoardContent ? '中屏有参考内容挂出来了，你可以顺便看一眼。' : null}
                            crucibleTurnSettledToken={crucibleTurnSettledToken}
                            workspaceId={crucibleWorkspaceId}
                            trialStatus={crucibleTrialStatus}
                            externalWarning={crucibleTrialWarning || thesisError}
                            thesisReady={crucibleThesisReady}
                            onEnterThesisWriter={handleEnterThesisWriter}
                            socket={socket}
                        />
                    </div>
                </div>
            )}

            <StatusFooter
                isConnected={isConnected}
                activeChatExpertId={activeModule === 'crucible' ? CRUCIBLE_EXPERT_ID : undefined}
            />
            <CrucibleHistorySheet
                isOpen={isCrucibleHistoryOpen}
                workspaceId={crucibleWorkspaceId}
                onClose={() => setIsCrucibleHistoryOpen(false)}
                onStartNewTopic={handleStartNewCrucibleTopic}
                onRestoreSnapshot={handleRestoreCrucibleHistory}
            />
        </div>
    );
}

export default SaaSApp;
