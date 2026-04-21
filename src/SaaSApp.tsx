import { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { buildApiUrl } from './config/runtime';
import { DEFAULT_MODULE, extractModuleId, LLM_CONFIG_PATH, modulePath } from './router';
import { type HeaderModule } from './components/Header';
import { ChatPanel } from './components/ChatPanel';
import { SaaSLLMConfigPage } from './components/SaaSLLMConfigPage';
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
import { CrucibleStage, getRegisteredModules, RoundtableStage, subscribe } from './modules';
import { ShellLayout } from './shell/ShellLayout';
import { useShellStore } from './shell/shellStore';
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

interface ThesisTrialStatus {
    enabled: boolean;
    mode: 'platform' | 'byok';
    accountTier?: 'standard' | 'vip';
    thesisQuota: {
        limit: number;
        used: number;
        remaining: number;
    };
    canGenerateThesis: boolean;
    message: string;
}

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

function SaaSApp() {
    const location = useLocation();
    const navigate = useNavigate();
    const { authEnabled, session: authSession, workspace } = useAppAuth();
    const crucibleWorkspaceId = workspace?.activeWorkspace.id || null;
    const initialCrucibleSnapshot = readScopedCrucibleSnapshot(crucibleWorkspaceId);
    const crucibleAutosaveBootstrapKey = getCrucibleAutosaveBootstrapKey(crucibleWorkspaceId);
    const { state, isConnected, selectScript, socket, setState } = useDeliveryStore();
    const [crucibleHasBoardContent, setCrucibleHasBoardContent] = useState(false);
    const [chatResetToken, setChatResetToken] = useState(0);
    const [crucibleRoutedAssets, setCrucibleRoutedAssets] = useState<HostRoutedAsset[]>([]);
    const [crucibleTopicTitle, setCrucibleTopicTitle] = useState(() => initialCrucibleSnapshot?.topicTitle || '标题待定');
    const [crucibleSeedPrompt, setCrucibleSeedPrompt] = useState('');
    const [crucibleSeedVersion, setCrucibleSeedVersion] = useState(0);
    const [crucibleInjectedMessages, setCrucibleInjectedMessages] = useState<ChatMessage[]>(() => toCrucibleInjectedMessages(initialCrucibleSnapshot));
    const [crucibleTurnSettledToken, setCrucibleTurnSettledToken] = useState(0);
    const [crucibleWorkspaceKey, setCrucibleWorkspaceKey] = useState(0);

    const [crucibleConversationState, setCrucibleConversationState] = useState({
        conversationId: initialCrucibleSnapshot?.conversationId || '',
        roundIndex: initialCrucibleSnapshot?.roundIndex || 0,
    });
    const [crucibleTrialStatus, setCrucibleTrialStatus] = useState<CrucibleTrialStatus | null>(null);
    const [crucibleTrialWarning, setCrucibleTrialWarning] = useState<string | null>(null);
    const [thesisTrialStatus, setThesisTrialStatus] = useState<ThesisTrialStatus | null>(null);
    const [crucibleThesisReady, setCrucibleThesisReady] = useState(false);
    const [isGeneratingThesis, setIsGeneratingThesis] = useState(false);
    const [thesisError, setThesisError] = useState<string | null>(null);
    const previousContextRef = useRef({ projectId: '', scriptPath: '' });
    const injectedRoundKeysRef = useRef<Set<string>>(new Set());
    const activeModule = useShellStore((shell) => shell.activeModule);
    const setActiveModule = useShellStore((shell) => shell.setActiveModule);
    const artifactDrawerOpen = useShellStore((shell) => shell.artifactDrawerOpen);
    const toggleArtifactDrawer = useShellStore((shell) => shell.toggleArtifactDrawer);
    const registeredModules = useSyncExternalStore(subscribe, getRegisteredModules, getRegisteredModules);

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
        setCrucibleWorkspaceKey((prev) => prev + 1);
        setChatResetToken((prev) => prev + 1);
    }, [crucibleAutosaveBootstrapKey, crucibleWorkspaceId, setActiveModule]);

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



    const handleEnterThesisWriter = useCallback(async () => {
        if (isGeneratingThesis) return;
        const isThesisQuotaBlocked = thesisTrialStatus
            && thesisTrialStatus.mode !== 'byok'
            && thesisTrialStatus.accountTier !== 'vip'
            && !thesisTrialStatus.canGenerateThesis;
        if (isThesisQuotaBlocked) {
            setThesisError(thesisTrialStatus.message);
            return;
        }
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
    }, [crucibleConversationState.conversationId, crucibleProjectId, isGeneratingThesis, state.selectedScript?.path, thesisTrialStatus]);

    const handleRestoreCrucibleHistory = useCallback((snapshot: CrucibleSnapshot) => {
        hydrateCrucibleSnapshot(snapshot);
    }, [hydrateCrucibleSnapshot]);

    const _handleSelectProject = (projectId: string) => {
        setState({
            ...INITIAL_STATE,
            projectId,
            lastUpdated: new Date().toISOString(),
        });

        if (socket) {
            socket.emit('select-project', projectId);
        }
    };
    void _handleSelectProject;

    const _handleSelectScript = async (projectId: string, scriptPath: string) => selectScript(projectId, scriptPath);
    void _handleSelectScript;

    const handleModuleChange = (module: HeaderModule) => {
        if (!registeredModules.some((registeredModule) => registeredModule.id === module)) {
            return;
        }

        const nextModule = module as typeof DEFAULT_MODULE | 'roundtable' | 'rador' | 'writer';
        navigate(modulePath(nextModule));
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
        if (activeModule !== 'crucible' || !crucibleWorkspaceId) return;
        const params = new URLSearchParams();
        if (crucibleProjectId) params.set('projectId', crucibleProjectId);
        if (state.selectedScript?.path) params.set('scriptPath', state.selectedScript.path);
        fetch(`/api/crucible/thesis/trial-status?${params}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setThesisTrialStatus(data))
            .catch(() => setThesisTrialStatus(null));
    }, [activeModule, crucibleWorkspaceId, crucibleProjectId, state.selectedScript?.path]);

    useEffect(() => {
        if (!crucibleTrialWarning) {
            return;
        }

        const timer = window.setTimeout(() => setCrucibleTrialWarning(null), 4200);
        return () => window.clearTimeout(timer);
    }, [crucibleTrialWarning]);

    const thesisQuotaWarning = thesisTrialStatus
        && thesisTrialStatus.mode !== 'byok'
        && thesisTrialStatus.accountTier !== 'vip'
        && !thesisTrialStatus.canGenerateThesis
        ? thesisTrialStatus.message
        : null;

    useEffect(() => {
        const moduleFromPath = extractModuleId(location.pathname);
        if (!moduleFromPath) {
            return;
        }

        if (activeModule !== moduleFromPath) {
            setActiveModule(moduleFromPath);
        }
    }, [activeModule, location.pathname, setActiveModule]);

    const handleSendRoundtableToCrucible = useCallback(() => {
        setActiveModule('crucible');
        navigate(modulePath('crucible'));
    }, [navigate, setActiveModule]);

    if (location.pathname === LLM_CONFIG_PATH) {
        return (
            <SaaSLLMConfigPage
                trialStatus={crucibleTrialStatus}
                onSaved={refreshCrucibleTrialStatus}
                onClose={() => { navigate(modulePath()); }}
            />
        );
    }

    if (location.pathname === '/') {
        return <Navigate to={modulePath()} replace />;
    }

    const resolvedModule = extractModuleId(location.pathname) ?? DEFAULT_MODULE;
    const activeModuleLabel = registeredModules.find((module) => module.id === activeModule)?.label;
    const shellViews = {
        crucible: {
            keepMounted: true,
            content: (
                <CrucibleStage
                    workspaceKey={crucibleWorkspaceKey}
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
            ),
            drawer: (
                <ChatPanel
                    key={`crucible-chat-${chatResetToken}`}
                    isOpen={resolvedModule === 'crucible'}
                    onToggle={toggleArtifactDrawer}
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
                    blackboardHint={crucibleHasBoardContent ? '中屏有参考内容挂出来了，你可以顺便看一眼。' : null}
                    crucibleTurnSettledToken={crucibleTurnSettledToken}
                    workspaceId={crucibleWorkspaceId}
                    trialStatus={crucibleTrialStatus}
                    externalWarning={crucibleTrialWarning || thesisError || thesisQuotaWarning}
                    thesisReady={crucibleThesisReady}
                    onEnterThesisWriter={handleEnterThesisWriter}
                    socket={socket}
                />
            ),
            drawerTitle: '对话',
            drawerExpanded: artifactDrawerOpen,
            onDrawerToggle: toggleArtifactDrawer,
        },
        roundtable: {
            content: <RoundtableStage onSendToCrucible={handleSendRoundtableToCrucible} />,
        },
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--gc-bg-base)] text-[var(--gc-text-primary)]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--gc-accent)]" />
                    <p className="text-sm text-[var(--gc-text-tertiary)]">Connecting to SaaS console...</p>
                </div>
            </div>
        );
    }

    return (
        <ShellLayout
            modules={registeredModules}
            activeModuleId={resolvedModule}
            onModuleChange={(moduleId) => handleModuleChange(moduleId as HeaderModule)}
            views={shellViews}
            workspaceName={workspace?.activeWorkspace.name}
            displayName={authSession?.user.name?.trim() || authSession?.user.email || activeModuleLabel}
        />
    );
}

export default SaaSApp;
