export type PhaseState = 'concept' | 'execution';

export interface BaseItem {
    id: string;
    name: string;
    content: string; // The AI generated content
    comment: string; // User annotation
    checked: boolean; // User confirmation
}

export interface ThumbnailVariant {
    id: string;
    name: string;
    content: string; // Core Prompt
    visualSpecs?: {
        font: string;
        layout: string;
        colorPalette: string[];
        composition: string;
    };
    comment: string;
    status: 'active' | 'deleted';
}

export interface MarketingStrategy {
    seo: {
        titleCandidates: string[];
        description: string;
        keywords: string[];
        competitorAnalysis: string;
    };
    social: {
        twitterThread: string;
        redditPost: string;
    };
    geo: {
        locationTags: string[];
        culturalRelevance: string;
    };
}

export interface DirectorModule {
    phase: 1 | 2;
    conceptProposal: string;
    conceptFeedback: string;
    isConceptApproved: boolean; // NEW: persists submit state
    items: BaseItem[];
}

export interface MusicModule {
    phase: 1 | 2;
    moodProposal: string;
    conceptFeedback: string;
    isConceptApproved: boolean; // NEW: persists submit state
    items: BaseItem[];
}

export interface ThumbnailModule {
    variants: ThumbnailVariant[];
    selectedVariantId?: string; // NEW: tracks which variant was selected
}

export interface MarketingModule {
    strategy: MarketingStrategy;
    feedback: string;
    isSubmitted: boolean;
    items?: never;
}

export interface ReviewEntry {
    timestamp: string;
    stage: 'script' | 'render';
    action: 'approve' | 'reject';
    comment: string;

}

export type ShortStatus =
    | 'draft'           // 脚本已生成
    | 'linked'          // 已关联视频文件 (v2.1)
    | 'script_review'   // 脚本审核中
    | 'rendering'       // Remotion 渲染中
    | 'render_review'   // 渲染结果审核中
    | 'approved'        // 审核通过，待排期
    | 'scheduled'       // 已排期，待上传
    | 'uploading'       // 上传中
    | 'published';      // 已发布

export interface ShortItem {
    id: string;
    title: string;
    description: string;
    tags: string[];
    scriptPath: string;       // 脚本 markdown 文件路径
    videoPath?: string;       // 渲染后的 .mp4 路径
    status: ShortStatus;
    scheduledDate?: string;   // 预约日期 "2026-02-15"
    scheduledTime?: string;   // 预约时间 "09:00"
    youtubeVideoId?: string;  // 上传后的 YouTube ID
    youtubeUrl?: string;
    reviewHistory: ReviewEntry[];
    createdAt: string;
    updatedAt: string;
    // v2.2 Metadata
    categoryId?: string;        // Default: '27' (Education)
    madeForKids?: boolean;      // Default: false
    privacyStatus?: 'private' | 'unlisted' | 'public'; // Default: 'private'
    aiDisclosure?: boolean;     // Default: false
}

export interface UploadSession {
    timestamp: string;
    videoCount: number;
    successCount: number;
    failedIds: string[];
}

export interface ShortsModule {
    items: ShortItem[];
    uploadHistory: UploadSession[];
}

export interface SelectedScript {
    filename: string;
    path: string;
    selectedAt: string;
}

export type ExpertStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed';

export interface ExpertWork {
    status: ExpertStatus;
    startedAt?: string;
    completedAt?: string;
    outputPath?: string;
    outputContent?: string;
    logs: string[];
    error?: string;
}

export interface DeliveryState {
    projectId: string;
    lastUpdated?: string;
    selectedScript?: SelectedScript;
    activeExpertId?: string;
    experts?: {
        [expertId: string]: ExpertWork;
    };
    modules: {
        director: DirectorModule;
        music: MusicModule;
        thumbnail: ThumbnailModule;
        marketing: MarketingModule;
        shorts: ShortsModule | ShortsModule_V2;
    };
}

// --- Visual Audit Module (v3.1) ---

export type BgStyle = 'black' | 'stripes' | 'dark-gradient';

export interface CinematicZoomProps {
    imageUrl: string;
    bgStyle?: BgStyle;
    zoomStart?: number;
    zoomEnd?: number;
}

export interface VisualScene {
    id: string;
    timestamp: string;
    script_line: string;
    type: 'remotion' | 'seedance' | 'artlist';
    // Remotion specific
    template?: string;
    props?: Record<string, any>;
    // Seedance specific
    mode?: 'T2V' | 'I2V' | 'V2V';
    resolution?: string;
    duration?: string;
    prompt?: string;
    references?: {
        images?: string[];
        videos?: string[];
        audio?: string[];
    };
    // Artlist specific
    search_keywords?: string[];
    search_tips?: string;

    // CinematicZoom specific (v3.2)
    visualPrompt?: string;
    audioSync?: string;

    // Common
    sfx?: string;
    status: 'pending_review' | 'approved' | 'rejected';
    review_comment?: string | null;
}

export interface VisualPlan {
    version: string;
    project: string;
    created_at: string;
    scenes: VisualScene[];
    metadata: any;
}

// --- Director Master V2 Types ---

export type BRollType = 'remotion' | 'seedance' | 'generative' | 'artlist';

export interface SceneOption {
    id: string;
    type: BRollType;
    previewUrl?: string;
    template?: string;
    props?: Record<string, unknown>;
    prompt?: string;
    quote?: string;
    imagePrompt?: string;
    rationale?: string;
    mode?: 'T2V' | 'I2V' | 'V2V';
    search_keywords?: string[];
}

export interface DirectorChapter {
    chapterId: string;
    chapterIndex: number;
    chapterName: string;
    scriptText: string;
    options: SceneOption[];
    selectedOptionId?: string;
    userComment?: string;
    isLocked: boolean;
}

export interface SelectionState {
    projectId: string;
    lastUpdated: string;
    chapters: DirectorChapter[];
}

export interface DirectorAction {
    action: 'phase1' | 'phase2_generate' | 'phase2_revise' | 'phase2_select' | 'phase3_render';
    projectId: string;
    chapterIndex?: number;
    userComment?: string;
    selectedOptions?: BRollType[];
}

export interface Phase1Concept {
    projectId: string;
    createdAt: string;
    content: string;
    userFeedback?: string;
    isApproved: boolean;
}

export interface RenderJob {
    jobId: string;
    projectId: string;
    chapterId: string;
    status: 'pending' | 'rendering' | 'completed' | 'failed';
    progress: number;
    frame?: number;
    totalFrames?: number;
    outputPath?: string;
    error?: string;
}

// ============================================================
// SD-206: Shorts Master V2 Types
// ============================================================

export type CTA = 'follow' | 'share' | 'comment' | 'link' | 'subscribe';

export interface ShortsGenerateRequest {
    projectId: string;
    count: number;
    ctaDistribution: CTA[];
    topic: string;
    style: 'suspense' | 'knowledge' | 'emotion' | 'contrast' | 'narrative';
}

export interface ShortScript {
    id: string;
    index: number;
    scriptText: string;
    cta: CTA;
    hookType: string;
    thumbnailUrl?: string;
    status: 'draft' | 'editing' | 'regenerating' | 'confirmed';
    userComment?: string;
}

export interface ShortBRoll {
    id: string;
    timeRange: string;
    scriptContext: string;
    type: 'remotion' | 'seedance';
    thumbnailUrl?: string;
    confirmed: boolean;
    userComment?: string;
    template?: string;
    props?: Record<string, unknown>;
    prompt?: string;
}

export interface WhisperSegment {
    id: number;
    start: number;
    end: number;
    text: string;
    confidence: number;
}

export interface SubtitleConfig {
    id: string;
    name: string;
    fontFamily: string;
    fontSize: number;
    fontColor: string;
    strokeColor: string;
    strokeWidth: number;
    position: 'bottom' | 'center' | 'top';
    animation: 'none' | 'fade' | 'typewriter' | 'karaoke';
}

export interface HeaderOverlayConfig {
    enabled: boolean;
    leftLogo?: string;
    rightLogo?: string;
    centerText?: string;
    textFont?: string;
    textColor?: string;
    textSize?: number;
    bgColor?: string;
    height?: number;
}

export interface ShortRenderUnit {
    id: string;
    shortScriptId: string;
    aroll: {
        originalPath?: string;
        croppedPath?: string;
        confirmed: boolean;
    };
    brolls: ShortBRoll[];
    thumbnail: {
        imageUrl?: string;
        confirmed: boolean;
    };
    subtitle: {
        srtPath?: string;
        segments: WhisperSegment[];
        configId: string;
        confirmed: boolean;
    };
    bgm: {
        source: 'preset' | 'custom';
        path?: string;
        name?: string;
    };
    headerOverlay: boolean;
    renderStatus: 'pending' | 'rendering' | 'completed' | 'failed';
    outputPaths?: {
        brollDir: string;
        fcpxmlPath: string;
        finalVideoPath?: string;
    };
}

export interface ShortsModule_V2 {
    phase: 1 | 2 | 3;
    scripts: ShortScript[];
    renderUnits: ShortRenderUnit[];
    subtitleConfigs: SubtitleConfig[];
    headerConfig?: HeaderOverlayConfig;
    generationConfig?: ShortsGenerateRequest;
}

// ============================================================
// SD-207: Market Master (TubeBuddy SEO) Types
// ============================================================

export interface TitleTagSet {
    id: string;
    index: number;
    title: string;
    tags: string[];
    source: 'llm' | 'user';
    status: 'pending' | 'scoring' | 'scored';
    tubeBuddyScore?: TubeBuddyScore;
    userComment?: string;
}

export interface TubeBuddyScore {
    overallScore: number;
    weightedScore?: number;
    metrics: {
        searchVolume: number;
        competition: number;
        optimization: number;
        relevance: number;
    };
    rawMetrics?: {
        monthlySearches?: number;
        competitionLevel?: 'low' | 'medium' | 'high';
    };
}

export interface MarketModule_V2 {
    phase: 1 | 2 | 3;
    selectedScript?: {
        filename: string;
        path: string;
    };
    titleTagSets: TitleTagSet[];
    selectedSetId?: string;
    generationConfig?: {
        count: number;
        focusKeywords?: string[];
        language: 'zh' | 'en';
    };
    finalOutput?: {
        title: string;
        tags: string[];
        savedAt: string;
        savedPath: string;
    };
}

// ============================================================
// SD-207: Chat Panel Types
// ============================================================

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    attachments?: Attachment[];
}

export interface Attachment {
    type: 'image';
    name: string;
    base64: string;
    previewUrl: string;
}

export interface ChatHistory {
    expertId: string;
    projectId: string;
    messages: ChatMessage[];
    lastUpdated: string;
}

export interface ExpertContextMap {
    [expertId: string]: {
        outputDir: string;
        keyFiles: string[];
    };
}

// ============================================================
// SD-207.1: Chat Panel 协作模式类型
// ============================================================

export type ModifyAction =
    | 'update_script_text'
    | 'update_cta'
    | 'update_hook'
    | 'batch_update'
    | 'regenerate';

export interface ChatIntent {
    type: 'chat' | 'modify';
    confidence: number;
    target?: {
        expertId: string;
        action: ModifyAction;
        targetId?: string;
        payload?: any;
    };
}

export interface ExpertModification {
    expertId: string;
    action: ModifyAction;
    targetId?: string;
    payload: any;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    timestamp: string;
}

export interface ExpertDataUpdate {
    expertId: string;
    action: ModifyAction;
    data: {
        scriptId?: string;
        updates?: Record<string, any>;
        [key: string]: any;
    };
}
