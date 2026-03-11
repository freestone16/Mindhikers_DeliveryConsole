export type SpeakerId = 'user' | 'laozhang' | 'laolu' | 'moderator';

export type CanvasAssetType = 'ascii' | 'mindmap' | 'quote' | 'remotion' | 'reference';

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

export interface ClarificationCard {
    id: string;
    prompt: string;
    helper: string;
    answer: string;
    isSaved: boolean;
}

export interface CrucibleSnapshot {
    messages?: CrucibleMessage[];
    canvasAssets: CanvasAsset[];
    activeAssetId?: string;
    topicTitle?: string;
    clarificationCards?: ClarificationCard[];
    submittedAt?: string;
    roundIndex?: number;
    isThinking?: boolean;
    questionSource?: 'static' | 'socrates' | 'fallback';
}

export interface CrucibleRound {
    userMessage: CrucibleMessage;
    assistantMessages: CrucibleMessage[];
    generatedAssets: CanvasAsset[];
    nextActiveAssetId: string;
}
