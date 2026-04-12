import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { getAuthPool, getSessionFromRequest, isAuthEnabled } from './auth';
import { ensurePersonalWorkspace } from './auth/workspace-store';
import type { SocratesDecision, ToolExecutionTrace } from './crucible-orchestrator';

const CRUCIBLE_RUNTIME_ROOT = path.resolve(process.cwd(), 'runtime', 'crucible');

export interface MaterializedCruciblePresentable {
    type: 'reference' | 'quote' | 'asset';
    title: string;
    summary: string;
    content: string;
}

export interface CruciblePersistenceContext {
    workspaceId: string;
    workspaceDir: string;
    conversationId: string;
    projectId: string;
    scriptPath: string;
    mode: 'workspace' | 'legacy';
}

export interface CrucibleConversationSummary {
    id: string;
    workspaceId: string;
    topicTitle: string;
    status: 'active' | 'archived';
    accessMode?: 'platform' | 'byok';
    isActive?: boolean;
    saveMode?: 'autosave' | 'manual' | 'conversation';
    hasDraftInput?: boolean;
    createdAt: string;
    updatedAt: string;
    roundIndex: number;
    lastSpeaker: string;
    lastFocus: string;
    messageCount: number;
    artifactCount: number;
}

export interface CrucibleConversationArtifact {
    id: string;
    type: 'reference' | 'quote' | 'asset';
    title: string;
    summary: string;
    content: string;
    roundIndex: number;
    createdAt: string;
}

export interface CrucibleConversationSnapshot {
    conversationId: string;
    messages: Array<{
        id: string;
        speaker: string;
        name: string;
        content: string;
        createdAt: string;
        timestamp: string;
    }>;
    presentables: Array<{
        id: string;
        type: 'reference' | 'quote' | 'mindmap';
        title: string;
        subtitle: string;
        content: string;
        summary?: string;
    }>;
    crystallizedQuotes: Array<{
        id: string;
        type: 'quote';
        title: string;
        subtitle: string;
        content: string;
        summary?: string;
    }>;
    activePresentableId?: string;
    topicTitle: string;
    openingPrompt?: string;
    draftInputText?: string;
    roundAnchors: Array<{
        id: string;
        title: string;
        summary: string;
        content: string;
    }>;
    lastDialogue?: {
        speaker: string;
        utterance: string;
        focus: string;
    };
    updatedAt?: string;
    roundIndex: number;
    isThinking: false;
    questionSource: 'static' | 'socrates' | 'fallback';
    engineMode: 'roundtable_discovery' | 'socratic_refinement';
    saveMode?: 'autosave' | 'manual' | 'conversation';
    toolTraces?: ToolExecutionTrace[];
    decisionSummary?: {
        stageLabel?: string;
        needsResearch: boolean;
        needsFactCheck: boolean;
        requestedTools: Array<{
            tool: string;
            mode: string;
        }>;
    };
    thesisReady?: boolean;
}

export interface CrucibleConversationDetail {
    summary: CrucibleConversationSummary;
    snapshot: CrucibleConversationSnapshot;
    artifacts: CrucibleConversationArtifact[];
    sourceContext: {
        projectId: string;
        scriptPath: string;
    };
}

export interface CrucibleArtifactExportBundle {
    version: 'crucible-artifact-export-v1';
    requestedFormat: string;
    exportedAt: string;
    conversation: {
        id: string;
        topicTitle: string;
        workspaceId: string;
        roundIndex: number;
        updatedAt: string;
    };
    sourceContext: {
        projectId: string;
        scriptPath: string;
    };
    artifacts: CrucibleConversationArtifact[];
}

interface StoredCrucibleMessage {
    id: string;
    role: 'user' | 'assistant';
    speaker: string;
    content: string;
    createdAt: string;
}

interface StoredCrucibleTurn {
    turnId: string;
    createdAt: string;
    source: 'socrates' | 'fallback';
    roundIndex: number;
    userInput: {
        openingPrompt: string;
        latestUserReply: string;
    };
    skillOutput: {
        speaker: string;
        utterance: string;
        focus: string;
        candidatePresentables: unknown[];
    };
    bridgeOutput: {
        dialogue: {
            speaker: string;
            utterance: string;
            focus: string;
        };
        presentables: MaterializedCruciblePresentable[];
    };
    meta: {
        decisionVersion?: string;
        searchRequested: boolean;
        searchConnected: boolean;
    };
    decision?: SocratesDecision;
    toolTraces?: ToolExecutionTrace[];
    research?: unknown;
}

interface StoredCrucibleConversation {
    id: string;
    workspaceId: string;
    topicTitle: string;
    status: 'active' | 'archived';
    accessMode?: 'platform' | 'byok';
    sourceContext: {
        projectId: string;
        scriptPath: string;
    };
    createdAt: string;
    updatedAt: string;
    roundIndex: number;
    messages: StoredCrucibleMessage[];
    turns: StoredCrucibleTurn[];
    artifacts: CrucibleConversationArtifact[];
    snapshot?: CrucibleConversationSnapshot;
}

const sanitizePathSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');
const sanitizeFilenameSegment = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const ensureDirectory = (targetDir: string) => {
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
};

const readJsonFile = <T>(filePath: string, fallback: T): T => {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    } catch {
        return fallback;
    }
};

const getWorkspaceRoot = (workspaceId: string, mode: 'workspace' | 'legacy') => (
    mode === 'workspace'
        ? path.join(CRUCIBLE_RUNTIME_ROOT, 'workspaces', sanitizePathSegment(workspaceId))
        : path.join(CRUCIBLE_RUNTIME_ROOT, sanitizePathSegment(workspaceId))
);

const getActiveConversationPointerPath = (workspaceDir: string) => path.join(workspaceDir, 'active_conversation.json');
const getConversationDirectory = (workspaceDir: string) => path.join(workspaceDir, 'conversations');
const getConversationFile = (workspaceDir: string, conversationId: string) => (
    path.join(getConversationDirectory(workspaceDir), `${sanitizePathSegment(conversationId)}.json`)
);
const getConversationIndexPath = (workspaceDir: string) => path.join(getConversationDirectory(workspaceDir), 'index.json');
const getCompatTurnLogPath = (workspaceDir: string) => path.join(workspaceDir, 'turn_log.json');
const readConversationIndex = (workspaceDir: string) => (
    readJsonFile<CrucibleConversationSummary[]>(getConversationIndexPath(workspaceDir), [])
);

const hasWorkspaceConversationState = (workspaceDir: string) => {
    if (readConversationIndex(workspaceDir).length > 0) {
        return true;
    }

    if (readActiveConversationId(workspaceDir)) {
        return true;
    }

    return fs.existsSync(getCompatTurnLogPath(workspaceDir));
};

const writeConversationIndex = (workspaceDir: string, items: CrucibleConversationSummary[]) => {
    fs.writeFileSync(getConversationIndexPath(workspaceDir), JSON.stringify(items, null, 2), 'utf-8');
};

const seedWorkspaceFromLegacySnapshot = (
    workspaceDir: string,
    workspaceId: string,
    projectId: string,
) => {
    const legacyWorkspaceDir = getWorkspaceRoot(projectId, 'legacy');
    if (!fs.existsSync(legacyWorkspaceDir) || hasWorkspaceConversationState(workspaceDir)) {
        return;
    }

    const legacyIndex = readConversationIndex(legacyWorkspaceDir);
    if (legacyIndex.length === 0) {
        return;
    }

    const nextIndex = legacyIndex.map((item) => ({
        ...item,
        workspaceId,
    }));

    for (const entry of nextIndex) {
        const legacyConversation = readStoredConversation(legacyWorkspaceDir, entry.id);
        if (!legacyConversation) {
            continue;
        }

        const nextConversation: StoredCrucibleConversation = {
            ...legacyConversation,
            workspaceId,
        };

        fs.writeFileSync(
            getConversationFile(workspaceDir, entry.id),
            JSON.stringify(nextConversation, null, 2),
            'utf-8',
        );
    }

    writeConversationIndex(workspaceDir, nextIndex);

    const activeConversationId = readActiveConversationId(legacyWorkspaceDir);
    if (activeConversationId) {
        const activeEntry = nextIndex.find((item) => item.id === activeConversationId) || nextIndex[0];
        if (activeEntry) {
            writeActiveConversationPointer(workspaceDir, activeEntry.id, activeEntry.topicTitle);
        }
    }

    const legacyTurnLog = readJsonFile<Record<string, unknown> | null>(getCompatTurnLogPath(legacyWorkspaceDir), null);
    if (legacyTurnLog) {
        fs.writeFileSync(getCompatTurnLogPath(workspaceDir), JSON.stringify({
            ...legacyTurnLog,
            workspaceId,
        }, null, 2), 'utf-8');
    }
};

const readActiveConversationId = (workspaceDir: string) => {
    const pointer = readJsonFile<{ conversationId?: string } | null>(getActiveConversationPointerPath(workspaceDir), null);
    return pointer?.conversationId?.trim() || null;
};

const resolveActiveConversationId = (workspaceDir: string) => {
    const activeConversationId = readActiveConversationId(workspaceDir);
    if (activeConversationId) {
        return activeConversationId;
    }

    const latestConversation = readConversationIndex(workspaceDir).find((item) => item.status !== 'archived')
        || readConversationIndex(workspaceDir)[0];
    return latestConversation?.id?.trim() || null;
};

const deleteActiveConversationPointer = (workspaceDir: string) => {
    const pointerPath = getActiveConversationPointerPath(workspaceDir);
    if (fs.existsSync(pointerPath)) {
        fs.unlinkSync(pointerPath);
    }
};

const writeActiveConversationPointer = (workspaceDir: string, conversationId: string, topicTitle: string) => {
    ensureDirectory(workspaceDir);
    fs.writeFileSync(getActiveConversationPointerPath(workspaceDir), JSON.stringify({
        conversationId,
        topicTitle,
        updatedAt: new Date().toISOString(),
    }, null, 2), 'utf-8');
};

const updateConversationIndex = (workspaceDir: string, entry: CrucibleConversationSummary) => {
    const indexPath = getConversationIndexPath(workspaceDir);
    const existing = readJsonFile<CrucibleConversationSummary[]>(indexPath, []);
    const next = existing.filter((item) => item.id !== entry.id);
    next.unshift(entry);
    fs.writeFileSync(indexPath, JSON.stringify(next.slice(0, 200), null, 2), 'utf-8');
};

const getConversationSummaryWithActiveState = (
    workspaceDir: string,
    items: CrucibleConversationSummary[],
) => {
    const activeConversationId = readActiveConversationId(workspaceDir);
    return items.map((item) => ({
        ...item,
        isActive: item.id === activeConversationId,
    }));
};

const toSnapshotPresentableType = (type: CrucibleConversationArtifact['type']) => (
    type === 'asset' ? 'mindmap' : type
);

const normalizeSnapshotTopicTitle = (value?: string, fallback = '标题待定') => {
    const normalized = value?.trim();
    if (!normalized) {
        return fallback;
    }
    if (normalized === '标题待定' || normalized === '标题待收敛...' || normalized.toUpperCase() === 'TBD') {
        return fallback;
    }
    return normalized;
};

const normalizeConversationSnapshot = (
    snapshot: Partial<CrucibleConversationSnapshot> | null | undefined,
    options: {
        conversationId: string;
        topicTitle: string;
        roundIndex?: number;
        updatedAt?: string;
        saveMode?: 'autosave' | 'manual' | 'conversation';
    },
): CrucibleConversationSnapshot => {
    const presentables = Array.isArray(snapshot?.presentables) ? snapshot.presentables : [];
    const crystallizedQuotes = Array.isArray(snapshot?.crystallizedQuotes) ? snapshot.crystallizedQuotes : [];
    const roundAnchors = Array.isArray(snapshot?.roundAnchors) ? snapshot.roundAnchors : [];
    const messages = Array.isArray(snapshot?.messages) ? snapshot.messages.filter((item) => item?.id && item?.createdAt) : [];
    const roundIndex = Number.isFinite(snapshot?.roundIndex) ? Number(snapshot?.roundIndex) : (options.roundIndex || 0);

    return {
        conversationId: options.conversationId,
        messages,
        presentables,
        crystallizedQuotes,
        activePresentableId: snapshot?.activePresentableId || presentables[0]?.id,
        topicTitle: normalizeSnapshotTopicTitle(snapshot?.topicTitle, options.topicTitle),
        openingPrompt: snapshot?.openingPrompt?.trim() || undefined,
        draftInputText: snapshot?.draftInputText?.trim() || undefined,
        roundAnchors,
        lastDialogue: snapshot?.lastDialogue || undefined,
        updatedAt: snapshot?.updatedAt || options.updatedAt,
        roundIndex,
        isThinking: false,
        questionSource: snapshot?.questionSource === 'socrates' || snapshot?.questionSource === 'fallback'
            ? snapshot.questionSource
            : 'static',
        engineMode: snapshot?.engineMode === 'roundtable_discovery' || snapshot?.engineMode === 'socratic_refinement'
            ? snapshot.engineMode
            : (roundIndex <= 1 ? 'roundtable_discovery' : 'socratic_refinement'),
        saveMode: snapshot?.saveMode || options.saveMode || 'conversation',
        toolTraces: Array.isArray(snapshot?.toolTraces) ? snapshot.toolTraces : undefined,
        decisionSummary: snapshot?.decisionSummary,
    };
};

const countSnapshotArtifacts = (snapshot?: CrucibleConversationSnapshot) => (
    (snapshot?.presentables?.length || 0) + (snapshot?.crystallizedQuotes?.length || 0)
);

const buildConversationSummary = (
    conversation: StoredCrucibleConversation,
    fallback?: Partial<CrucibleConversationSummary>,
): CrucibleConversationSummary => {
    const lastTurn = conversation.turns[conversation.turns.length - 1];
    const snapshot = conversation.snapshot;
    return {
        id: conversation.id,
        workspaceId: conversation.workspaceId,
        topicTitle: conversation.topicTitle,
        status: conversation.status,
        accessMode: conversation.accessMode || 'platform',
        isActive: fallback?.isActive,
        saveMode: snapshot?.saveMode || 'conversation',
        hasDraftInput: Boolean(snapshot?.draftInputText?.trim()),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        roundIndex: conversation.roundIndex,
        lastSpeaker: lastTurn?.bridgeOutput.dialogue.speaker || fallback?.lastSpeaker || 'assistant',
        lastFocus: lastTurn?.bridgeOutput.dialogue.focus || fallback?.lastFocus || '',
        messageCount: conversation.messages.length || fallback?.messageCount || 0,
        artifactCount: Math.max(conversation.artifacts.length, countSnapshotArtifacts(snapshot), fallback?.artifactCount || 0),
    };
};

const buildDerivedConversationSnapshot = (conversation: StoredCrucibleConversation): CrucibleConversationSnapshot => {
    const lastTurn = conversation.turns[conversation.turns.length - 1];
    const openingPrompt = conversation.turns.find((turn) => turn.userInput.openingPrompt.trim())?.userInput.openingPrompt || '';
    const latestArtifacts = conversation.artifacts.filter((artifact) => artifact.roundIndex === conversation.roundIndex);
    const presentables = latestArtifacts.map((artifact) => ({
        id: artifact.id,
        type: toSnapshotPresentableType(artifact.type),
        title: artifact.title,
        subtitle: '',
        content: artifact.content,
        summary: artifact.summary,
    }));
    const crystallizedQuotes = conversation.artifacts
        .filter((artifact) => artifact.type === 'quote')
        .map((artifact) => ({
            id: artifact.id,
            type: 'quote' as const,
            title: artifact.title,
            subtitle: '',
            content: artifact.content,
            summary: artifact.summary,
        }));

    return normalizeConversationSnapshot({
        conversationId: conversation.id,
        messages: conversation.messages.map((message) => ({
            id: message.id,
            speaker: message.speaker,
            name: message.speaker,
            content: message.content,
            createdAt: message.createdAt,
            timestamp: message.createdAt,
        })),
        presentables,
        crystallizedQuotes,
        activePresentableId: presentables[0]?.id,
        topicTitle: conversation.topicTitle,
        openingPrompt: openingPrompt || undefined,
        roundAnchors: presentables.map((artifact) => ({
            id: `anchor_${artifact.id}`,
            title: artifact.title,
            summary: artifact.summary || '这一轮的黑板焦点',
            content: artifact.content,
        })),
        lastDialogue: lastTurn?.bridgeOutput.dialogue,
        roundIndex: conversation.roundIndex,
        isThinking: false,
        questionSource: lastTurn ? (lastTurn.source === 'socrates' ? 'socrates' : 'fallback') : 'static',
        engineMode: conversation.roundIndex <= 1 ? 'roundtable_discovery' : 'socratic_refinement',
        toolTraces: lastTurn?.toolTraces,
        decisionSummary: lastTurn?.decision ? {
            stageLabel: lastTurn.decision.stageLabel,
            needsResearch: lastTurn.decision.needsResearch,
            needsFactCheck: lastTurn.decision.needsFactCheck,
            requestedTools: lastTurn.decision.toolRequests.map((request) => ({
                tool: request.tool,
                mode: request.mode,
            })),
        } : undefined,
        thesisReady: conversation.turns.some(
            (turn) => turn.roundIndex >= 5
                && turn.source === 'socrates'
                && turn.decision?.stageLabel === 'crystallization',
        ) || undefined,
    }, {
        conversationId: conversation.id,
        topicTitle: conversation.topicTitle,
        roundIndex: conversation.roundIndex,
        updatedAt: conversation.updatedAt,
        saveMode: 'conversation',
    });
};

const buildConversationSnapshot = (conversation: StoredCrucibleConversation): CrucibleConversationSnapshot => (
    normalizeConversationSnapshot(
        conversation.snapshot || buildDerivedConversationSnapshot(conversation),
        {
            conversationId: conversation.id,
            topicTitle: conversation.topicTitle,
            roundIndex: conversation.roundIndex,
            updatedAt: conversation.updatedAt,
            saveMode: conversation.snapshot?.saveMode || 'conversation',
        },
    )
);

const readStoredConversation = (workspaceDir: string, conversationId: string) => (
    readJsonFile<StoredCrucibleConversation | null>(getConversationFile(workspaceDir, conversationId), null)
);

export const resolveCruciblePersistenceContext = async (
    req: Request,
    options: {
        projectId?: string;
        scriptPath?: string;
        conversationId?: string;
    },
): Promise<CruciblePersistenceContext> => {
    const projectId = options.projectId?.trim() || 'golden-crucible-sandbox';
    const scriptPath = options.scriptPath?.trim() || '';

    if (!isAuthEnabled()) {
        const workspaceId = projectId;
        const workspaceDir = getWorkspaceRoot(workspaceId, 'legacy');
        ensureDirectory(workspaceDir);
        ensureDirectory(getConversationDirectory(workspaceDir));
        const conversationId = options.conversationId?.trim()
            || readActiveConversationId(workspaceDir)
            || randomUUID();

        return {
            workspaceId,
            workspaceDir,
            conversationId,
            projectId,
            scriptPath,
            mode: 'legacy',
        };
    }

    const session = await getSessionFromRequest(req);
    if (!session?.user?.id) {
        const error = new Error('Authentication required');
        (error as Error & { statusCode?: number }).statusCode = 401;
        throw error;
    }

    const workspace = await ensurePersonalWorkspace(getAuthPool(), {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    });
    const workspaceId = workspace.activeWorkspace.id;
    const workspaceDir = getWorkspaceRoot(workspaceId, 'workspace');
    ensureDirectory(workspaceDir);
    ensureDirectory(getConversationDirectory(workspaceDir));
    seedWorkspaceFromLegacySnapshot(workspaceDir, workspaceId, projectId);
    const conversationId = options.conversationId?.trim()
        || readActiveConversationId(workspaceDir)
        || randomUUID();

    return {
        workspaceId,
        workspaceDir,
        conversationId,
        projectId,
        scriptPath,
        mode: 'workspace',
    };
};

export const clearCrucibleActiveConversation = async (req: Request, fallbackProjectId?: string) => {
    const context = await resolveCruciblePersistenceContext(req, {
        projectId: fallbackProjectId,
    });
    deleteActiveConversationPointer(context.workspaceDir);
};

export const appendTurnToCrucibleConversation = (
    context: CruciblePersistenceContext,
    params: {
        topicTitle: string;
        roundIndex: number;
        source: 'socrates' | 'fallback';
        accessMode: 'platform' | 'byok';
        seedPrompt: string;
        latestUserReply: string;
        decision?: SocratesDecision;
        toolTraces?: ToolExecutionTrace[];
        searchRequested: boolean;
        searchConnected: boolean;
        research?: unknown;
        speaker: string;
        utterance: string;
        focus: string;
        presentables: MaterializedCruciblePresentable[];
        skillPresentables: unknown[];
    },
) => {
    const conversationFile = getConversationFile(context.workspaceDir, context.conversationId);
    const now = new Date().toISOString();
    const existing = readJsonFile<StoredCrucibleConversation | null>(conversationFile, null);
    const conversation: StoredCrucibleConversation = existing || {
        id: context.conversationId,
        workspaceId: context.workspaceId,
        topicTitle: params.topicTitle,
        status: 'active',
        accessMode: params.accessMode,
        sourceContext: {
            projectId: context.projectId,
            scriptPath: context.scriptPath,
        },
        createdAt: now,
        updatedAt: now,
        roundIndex: 0,
        messages: [],
        turns: [],
        artifacts: [],
    };

    conversation.topicTitle = params.topicTitle;
    conversation.updatedAt = now;
    conversation.roundIndex = Math.max(conversation.roundIndex, params.roundIndex);
    conversation.sourceContext = {
        projectId: context.projectId,
        scriptPath: context.scriptPath,
    };
    conversation.accessMode = params.accessMode;

    const turnId = `turn_${Date.now()}`;
    conversation.turns.push({
        turnId,
        createdAt: now,
        source: params.source,
        roundIndex: params.roundIndex,
        userInput: {
            openingPrompt: params.seedPrompt,
            latestUserReply: params.latestUserReply,
        },
        skillOutput: {
            speaker: params.speaker,
            utterance: params.utterance,
            focus: params.focus,
            candidatePresentables: params.skillPresentables,
        },
        bridgeOutput: {
            dialogue: {
                speaker: params.speaker,
                utterance: params.utterance,
                focus: params.focus,
            },
            presentables: params.presentables,
        },
        meta: {
            decisionVersion: params.decision?.version,
            searchRequested: params.searchRequested,
            searchConnected: params.searchConnected,
        },
        decision: params.decision,
        toolTraces: params.toolTraces,
        research: params.research,
    });

    if (params.latestUserReply.trim()) {
        conversation.messages.push({
            id: `${turnId}_user`,
            role: 'user',
            speaker: 'user',
            content: params.latestUserReply.trim(),
            createdAt: now,
        });
    }

    conversation.messages.push({
        id: `${turnId}_assistant`,
        role: 'assistant',
        speaker: params.speaker,
        content: params.utterance,
        createdAt: now,
    });

    const artifacts = params.presentables.map((item, index) => ({
        id: `${turnId}_artifact_${index + 1}`,
        type: item.type,
        title: item.title,
        summary: item.summary,
        content: item.content,
        roundIndex: params.roundIndex,
        createdAt: now,
    }));
    conversation.artifacts.push(...artifacts);
    conversation.snapshot = buildDerivedConversationSnapshot(conversation);

    fs.writeFileSync(conversationFile, JSON.stringify(conversation, null, 2), 'utf-8');
    writeActiveConversationPointer(context.workspaceDir, context.conversationId, params.topicTitle);
    updateConversationIndex(context.workspaceDir, buildConversationSummary(conversation));

    fs.writeFileSync(getCompatTurnLogPath(context.workspaceDir), JSON.stringify({
        conversationId: conversation.id,
        workspaceId: conversation.workspaceId,
        projectId: context.projectId,
        scriptPath: context.scriptPath,
        topicTitle: conversation.topicTitle,
        updatedAt: conversation.updatedAt,
        turns: conversation.turns,
    }, null, 2), 'utf-8');

    return conversation;
};

export const saveCrucibleConversationSnapshot = async (
    req: Request,
    options: {
        conversationId?: string;
        topicTitle?: string;
        status?: 'active' | 'archived';
        snapshot: Partial<CrucibleConversationSnapshot>;
        projectId?: string;
        scriptPath?: string;
    },
): Promise<CrucibleConversationDetail> => {
    const requestedConversationId = options.conversationId?.trim()
        || options.snapshot.conversationId?.trim();
    const context = await resolveCruciblePersistenceContext(req, {
        conversationId: requestedConversationId,
        projectId: options.projectId,
        scriptPath: options.scriptPath,
    });
    const conversationFile = getConversationFile(context.workspaceDir, context.conversationId);
    const existing = readJsonFile<StoredCrucibleConversation | null>(conversationFile, null);
    const now = new Date().toISOString();
    const topicTitle = normalizeSnapshotTopicTitle(
        options.topicTitle || options.snapshot.topicTitle || existing?.topicTitle,
        '未命名议题',
    );

    const conversation: StoredCrucibleConversation = existing || {
        id: context.conversationId,
        workspaceId: context.workspaceId,
        topicTitle,
        status: options.status || 'active',
        accessMode: existing?.accessMode || 'platform',
        sourceContext: {
            projectId: context.projectId,
            scriptPath: context.scriptPath,
        },
        createdAt: now,
        updatedAt: now,
        roundIndex: 0,
        messages: [],
        turns: [],
        artifacts: [],
    };

    conversation.topicTitle = topicTitle;
    conversation.status = options.status || conversation.status || 'active';
    conversation.sourceContext = {
        projectId: context.projectId,
        scriptPath: context.scriptPath,
    };
    conversation.snapshot = normalizeConversationSnapshot(options.snapshot, {
        conversationId: conversation.id,
        topicTitle,
        roundIndex: Math.max(conversation.roundIndex, Number(options.snapshot.roundIndex || 0)),
        updatedAt: now,
        saveMode: 'manual',
    });
    conversation.roundIndex = Math.max(conversation.roundIndex, conversation.snapshot.roundIndex || 0);
    conversation.updatedAt = now;

    fs.writeFileSync(conversationFile, JSON.stringify(conversation, null, 2), 'utf-8');
    writeActiveConversationPointer(context.workspaceDir, conversation.id, conversation.topicTitle);
    updateConversationIndex(context.workspaceDir, buildConversationSummary(conversation, {
        isActive: true,
    }));

    return {
        summary: buildConversationSummary(conversation, {
            isActive: true,
        }),
        snapshot: buildConversationSnapshot(conversation),
        artifacts: conversation.artifacts,
        sourceContext: conversation.sourceContext,
    };
};

export const listCrucibleConversations = async (
    req: Request,
    options: {
        projectId?: string;
        scriptPath?: string;
    } = {},
): Promise<CrucibleConversationSummary[]> => {
    const context = await resolveCruciblePersistenceContext(req, options);
    return getConversationSummaryWithActiveState(context.workspaceDir, readConversationIndex(context.workspaceDir));
};

export const getCrucibleConversationDetail = async (
    req: Request,
    options: {
        conversationId?: string;
        projectId?: string;
        scriptPath?: string;
    } = {},
): Promise<CrucibleConversationDetail | null> => {
    const context = await resolveCruciblePersistenceContext(req, options);
    const targetConversationId = options.conversationId?.trim() || resolveActiveConversationId(context.workspaceDir);

    if (!targetConversationId) {
        return null;
    }

    const conversation = readStoredConversation(context.workspaceDir, targetConversationId);
    if (!conversation) {
        return null;
    }

    const indexEntry = getConversationSummaryWithActiveState(context.workspaceDir, readConversationIndex(context.workspaceDir))
        .find((item) => item.id === targetConversationId);
    return {
        summary: buildConversationSummary(conversation, indexEntry),
        snapshot: buildConversationSnapshot(conversation),
        artifacts: conversation.artifacts,
        sourceContext: conversation.sourceContext,
    };
};

export const activateCrucibleConversation = async (
    req: Request,
    options: {
        conversationId: string;
        projectId?: string;
        scriptPath?: string;
    },
): Promise<CrucibleConversationDetail | null> => {
    const conversationId = options.conversationId?.trim();
    if (!conversationId) {
        return null;
    }

    const detail = await getCrucibleConversationDetail(req, options);
    if (!detail) {
        return null;
    }

    const context = await resolveCruciblePersistenceContext(req, options);
    writeActiveConversationPointer(context.workspaceDir, conversationId, detail.summary.topicTitle);
    return detail;
};

export const updateCrucibleConversation = async (
    req: Request,
    options: {
        conversationId: string;
        topicTitle?: string;
        status?: 'active' | 'archived';
        projectId?: string;
        scriptPath?: string;
    },
): Promise<CrucibleConversationDetail | null> => {
    const conversationId = options.conversationId?.trim();
    if (!conversationId) {
        return null;
    }

    const context = await resolveCruciblePersistenceContext(req, options);
    const conversationFile = getConversationFile(context.workspaceDir, conversationId);
    const conversation = readJsonFile<StoredCrucibleConversation | null>(conversationFile, null);
    if (!conversation) {
        return null;
    }

    const nextTitle = options.topicTitle?.trim();
    if (nextTitle) {
        conversation.topicTitle = nextTitle;
    }

    if (options.status === 'active' || options.status === 'archived') {
        conversation.status = options.status;
    }

    conversation.updatedAt = new Date().toISOString();
    fs.writeFileSync(conversationFile, JSON.stringify(conversation, null, 2), 'utf-8');

    updateConversationIndex(context.workspaceDir, buildConversationSummary(conversation));

    const activeConversationId = readActiveConversationId(context.workspaceDir);
    if (conversation.status === 'archived' && activeConversationId === conversationId) {
        const indexItems = readConversationIndex(context.workspaceDir);
        const fallbackConversation = indexItems.find((item) => item.id !== conversationId && item.status !== 'archived');
        if (fallbackConversation) {
            writeActiveConversationPointer(context.workspaceDir, fallbackConversation.id, fallbackConversation.topicTitle);
        } else {
            deleteActiveConversationPointer(context.workspaceDir);
        }
    } else if (conversation.status === 'active' && activeConversationId === conversationId) {
        writeActiveConversationPointer(context.workspaceDir, conversationId, conversation.topicTitle);
    }

    return getCrucibleConversationDetail(req, {
        conversationId,
        projectId: options.projectId,
        scriptPath: options.scriptPath,
    });
};

export const buildCrucibleArtifactExport = (
    detail: CrucibleConversationDetail,
    options?: {
        format?: string;
    },
) => {
    const requestedFormat = options?.format?.trim() || 'bundle-json';
    const bundle: CrucibleArtifactExportBundle = {
        version: 'crucible-artifact-export-v1',
        requestedFormat,
        exportedAt: new Date().toISOString(),
        conversation: {
            id: detail.summary.id,
            topicTitle: detail.summary.topicTitle,
            workspaceId: detail.summary.workspaceId,
            roundIndex: detail.summary.roundIndex,
            updatedAt: detail.summary.updatedAt,
        },
        sourceContext: detail.sourceContext,
        artifacts: detail.artifacts,
    };

    const safeTopicTitle = sanitizeFilenameSegment(detail.summary.topicTitle || 'crucible');
    if (requestedFormat === 'markdown') {
        const lines: string[] = [
            `# ${detail.summary.topicTitle || '未命名议题'}`,
            '',
            `- 会话 ID：${detail.summary.id}`,
            `- Workspace：${detail.summary.workspaceId}`,
            `- 轮次：${detail.summary.roundIndex}`,
            `- 更新时间：${detail.summary.updatedAt}`,
            `- Project：${detail.sourceContext.projectId || '-'}`,
            `- Script：${detail.sourceContext.scriptPath || '-'}`,
            '',
            '## 对话摘要',
            '',
            detail.summary.lastFocus || '当前未生成摘要焦点。',
            '',
            '## 产物列表',
            '',
        ];

        for (const artifact of detail.artifacts) {
            lines.push(`### ${artifact.title || `产物 ${artifact.id}`}`);
            lines.push('');
            lines.push(`- 类型：${artifact.type}`);
            lines.push(`- 轮次：${artifact.roundIndex}`);
            lines.push(`- 创建时间：${artifact.createdAt}`);
            lines.push('');
            if (artifact.summary?.trim()) {
                lines.push(artifact.summary.trim());
                lines.push('');
            }
            lines.push(artifact.content?.trim() || '(空内容)');
            lines.push('');
        }

        return {
            filename: `${safeTopicTitle}-${detail.summary.id}-artifacts.md`,
            contentType: 'text/markdown; charset=utf-8',
            body: lines.join('\n'),
        };
    }

    return {
        filename: `${safeTopicTitle}-${detail.summary.id}-artifacts.json`,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(bundle, null, 2),
    };
};
