import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { getAuthPool, getSessionFromRequest, isAuthEnabled } from './auth';
import { ensurePersonalWorkspace } from './auth/workspace-store';

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
    createdAt: string;
    updatedAt: string;
    roundIndex: number;
    lastSpeaker: string;
    lastFocus: string;
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
    roundIndex: number;
    isThinking: false;
    questionSource: 'static' | 'socrates' | 'fallback';
    engineMode: 'roundtable_discovery' | 'socratic_refinement';
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
        searchRequested: boolean;
        searchConnected: boolean;
    };
    research?: unknown;
}

interface StoredCrucibleConversation {
    id: string;
    workspaceId: string;
    topicTitle: string;
    status: 'active' | 'archived';
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
}

const sanitizePathSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');

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

const readActiveConversationId = (workspaceDir: string) => {
    const pointer = readJsonFile<{ conversationId?: string } | null>(getActiveConversationPointerPath(workspaceDir), null);
    return pointer?.conversationId?.trim() || null;
};

const resolveActiveConversationId = (workspaceDir: string) => {
    const activeConversationId = readActiveConversationId(workspaceDir);
    if (activeConversationId) {
        return activeConversationId;
    }

    const latestConversation = readConversationIndex(workspaceDir)[0];
    return latestConversation?.id?.trim() || null;
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

const toSnapshotPresentableType = (type: CrucibleConversationArtifact['type']) => (
    type === 'asset' ? 'mindmap' : type
);

const buildConversationSummary = (
    conversation: StoredCrucibleConversation,
    fallback?: Partial<CrucibleConversationSummary>,
): CrucibleConversationSummary => {
    const lastTurn = conversation.turns[conversation.turns.length - 1];
    return {
        id: conversation.id,
        workspaceId: conversation.workspaceId,
        topicTitle: conversation.topicTitle,
        status: conversation.status,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        roundIndex: conversation.roundIndex,
        lastSpeaker: lastTurn?.bridgeOutput.dialogue.speaker || fallback?.lastSpeaker || 'assistant',
        lastFocus: lastTurn?.bridgeOutput.dialogue.focus || fallback?.lastFocus || '',
    };
};

const buildConversationSnapshot = (conversation: StoredCrucibleConversation): CrucibleConversationSnapshot => {
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

    return {
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
    };
};

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
    const pointerPath = getActiveConversationPointerPath(context.workspaceDir);
    if (fs.existsSync(pointerPath)) {
        fs.unlinkSync(pointerPath);
    }
};

export const appendTurnToCrucibleConversation = (
    context: CruciblePersistenceContext,
    params: {
        topicTitle: string;
        roundIndex: number;
        source: 'socrates' | 'fallback';
        seedPrompt: string;
        latestUserReply: string;
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
            searchRequested: params.searchRequested,
            searchConnected: params.searchConnected,
        },
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

    fs.writeFileSync(conversationFile, JSON.stringify(conversation, null, 2), 'utf-8');
    writeActiveConversationPointer(context.workspaceDir, context.conversationId, params.topicTitle);
    updateConversationIndex(context.workspaceDir, {
        id: conversation.id,
        workspaceId: conversation.workspaceId,
        topicTitle: conversation.topicTitle,
        status: conversation.status,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        roundIndex: conversation.roundIndex,
        lastSpeaker: params.speaker,
        lastFocus: params.focus,
    });

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

export const listCrucibleConversations = async (
    req: Request,
    options: {
        projectId?: string;
        scriptPath?: string;
    } = {},
): Promise<CrucibleConversationSummary[]> => {
    const context = await resolveCruciblePersistenceContext(req, options);
    return readConversationIndex(context.workspaceDir);
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

    const indexEntry = readConversationIndex(context.workspaceDir).find((item) => item.id === targetConversationId);
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
