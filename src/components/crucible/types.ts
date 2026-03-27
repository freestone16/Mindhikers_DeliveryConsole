export type SpeakerId = string;
export type CrucibleEngineMode = 'roundtable_discovery' | 'socratic_refinement';

export type CanvasAssetType = 'ascii' | 'mindmap' | 'quote' | 'remotion' | 'reference';

export interface CrucibleDialogue {
    speaker: SpeakerId;
    utterance: string;
    focus: string;
}

export interface CrucibleTurnResponse {
    source?: 'socrates' | 'fallback';
    warning?: string;
    dialogue?: CrucibleDialogue;
    presentables?: Array<{ type?: 'reference' | 'quote' | 'asset'; title?: string; summary?: string; content?: string }>;
    topicSuggestion?: string;
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
    messages?: CrucibleMessage[];
    presentables: CanvasAsset[];
    crystallizedQuotes?: CanvasAsset[];
    activePresentableId?: string;
    topicTitle?: string;
    openingPrompt?: string;
    roundAnchors?: RoundAnchor[];
    lastDialogue?: CrucibleDialogue;
    submittedAt?: string;
    roundIndex?: number;
    isThinking?: boolean;
    questionSource?: 'static' | 'socrates' | 'fallback';
    engineMode?: CrucibleEngineMode;
}

export interface CrucibleRound {
    userMessage: CrucibleMessage;
    assistantMessages: CrucibleMessage[];
    generatedAssets: CanvasAsset[];
    nextActiveAssetId: string;
}
