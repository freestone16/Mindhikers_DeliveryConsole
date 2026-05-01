export type SpeakerId = string;
export type CrucibleEngineMode = 'roundtable_discovery' | 'socratic_refinement';

export type CanvasAssetType = 'ascii' | 'mindmap' | 'quote' | 'remotion' | 'reference';

export interface CrucibleDialogue {
    speaker: SpeakerId;
    utterance: string;
    focus: string;
}

export interface CrucibleTurnResponse {
    conversationId?: string;
    source?: 'socrates' | 'fallback';
    warning?: string;
    dialogue?: CrucibleDialogue;
    presentables?: Array<{ type?: 'reference' | 'quote' | 'asset'; title?: string; summary?: string; content?: string }>;
    topicSuggestion?: string;
    decision?: {
        stageLabel?: string;
        needsResearch: boolean;
        needsFactCheck: boolean;
        toolRequests: Array<{
            tool: 'Researcher' | 'FactChecker';
            mode: 'primary' | 'support';
            reason: string;
            query?: string;
            goal?: string;
            scope?: string;
        }>;
    };
    toolTraces?: Array<{
        tool: 'Researcher' | 'FactChecker';
        requestedBy: 'Socrates';
        mode: 'primary' | 'support';
        status: 'success' | 'failed' | 'skipped';
        reason: string;
        input: {
            query?: string;
            goal?: string;
            scope?: string;
        };
        output?: unknown;
        error?: string;
        startedAt: string;
        finishedAt: string;
    }>;
    engineMode?: CrucibleEngineMode;
    thesisReady?: boolean;
}

export interface CrucibleConversationSummary {
    id: string;
    workspaceId: string;
    topicTitle: string;
    status: 'active' | 'archived';
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

export interface CrucibleConversationDetail {
    summary: CrucibleConversationSummary;
    snapshot: CrucibleSnapshot;
    artifacts: CrucibleConversationArtifact[];
    sourceContext: {
        projectId: string;
        scriptPath: string;
    };
}

export interface UpdateCrucibleConversationPayload {
    topicTitle?: string;
    status?: 'active' | 'archived';
}

export interface SaveCrucibleConversationPayload {
    conversationId?: string;
    topicTitle?: string;
    status?: 'active' | 'archived';
    projectId?: string;
    scriptPath?: string;
    snapshot: CrucibleSnapshot;
}

export type CrucibleSseEventName = 'turn' | 'error' | 'done';

export interface CrucibleRemotionPreviewResponse {
    imageUrl?: string;
}

export interface CrucibleMessage {
    id: string;
    speaker: SpeakerId;
    name: string;
    content: string;
    createdAt: string;
    timestamp: string;
    linkedAssetId?: string;
    phase?: 'prompt' | 'debate' | 'summary' | 'crystallize';
}

export interface CanvasAsset {
    id: string;
    type: CanvasAssetType;
    title: string;
    subtitle: string;
    content: string;
    summary?: string;
}

export interface RoundAnchor {
    id: string;
    title: string;
    summary: string;
    content: string;
}

export interface CrucibleSnapshot {
    conversationId?: string;
    messages?: CrucibleMessage[];
    presentables: CanvasAsset[];
    crystallizedQuotes?: CanvasAsset[];
    activePresentableId?: string;
    topicTitle?: string;
    openingPrompt?: string;
    roundAnchors?: RoundAnchor[];
    lastDialogue?: CrucibleDialogue;
    updatedAt?: string;
    submittedAt?: string;
    roundIndex?: number;
    isThinking?: boolean;
    questionSource?: 'static' | 'socrates' | 'fallback';
    engineMode?: CrucibleEngineMode;
    draftInputText?: string;
    saveMode?: 'autosave' | 'manual' | 'conversation';
    toolTraces?: CrucibleTurnResponse['toolTraces'];
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

export interface CrucibleRound {
    userMessage: CrucibleMessage;
    assistantMessages: CrucibleMessage[];
    generatedAssets: CanvasAsset[];
    nextActiveAssetId: string;
}
