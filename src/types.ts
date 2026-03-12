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
    phase: number;
    conceptProposal: string;
    conceptFeedback: string;
    isConceptApproved: boolean;
    items: any[]; // Using any[] here to avoid circular/forward refs for now, will cast to DirectorChapter[] in component
    renderJobs?: any[]; // Using any[] to avoid forward refs to RenderJob
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
    activeModule?: 'crucible' | 'delivery' | 'distribution';
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

export type BRollType = 'remotion' | 'seedance' | 'generative' | 'artlist' | 'internet-clip' | 'user-capture' | 'infographic';

export interface SceneOption {
    id: string;
    type: BRollType;
    template?: string;
    props?: Record<string, any>;
    name?: string;
    previewUrl?: string;
    prompt?: string;
    quote?: string;
    imagePrompt?: string;
    rationale?: string;
    mode?: 'T2V' | 'I2V' | 'V2V';
    search_keywords?: string[];
    // Infographic specific (BaoyuInfographic)
    infographicLayout?: string;
    infographicStyle?: string;
    infographicUseMode?: 'cinematic-zoom' | 'static';
    isChecked?: boolean;
    // Phase 2 (初审) fields
    phase2Approved?: boolean;
    // Phase 3 (二审) fields
    videoUrl?: string;            // MP4 video URL/path after Phase 3 render
    phase3Approved?: boolean;
    revisedPrompt?: string;       // AI-rewritten prompt awaiting user confirmation
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
    isChecked?: boolean;
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
// SD-202: Director Master Phase 2/3 Refactor Types
// ============================================================

// B-roll 预审状态
export type BRollReviewStatus = 'pending' | 'approved' | 'skipped';

// B-roll 渲染状态
export type BRollRenderStatus = 'waiting' | 'rendering' | 'completed' | 'failed';

// Phase 3 渲染任务
export interface RenderJob_V2 {
    jobId: string;
    chapterId: string;
    optionId: string;
    type: 'remotion' | 'seedance';
    status: BRollRenderStatus;
    progress: number; // 0-100
    frame?: number;
    totalFrames?: number;
    outputPath?: string;
    error?: string;
    startedAt?: string;
    completedAt?: string;
    retryCount?: number;
}

// 外部素材加载记录
export interface ExternalAsset {
    assetId: string;
    chapterId: string;
    type: 'artlist' | 'internet-clip' | 'user-capture';
    sourcePath: string; // 原始文件路径
    targetPath: string; // 复制后路径
    loadedAt: string;
}

// 扩展的 DirectorChapter（支持 Phase 2/3）
export interface DirectorChapter_V2 extends DirectorChapter {
    // Phase 2 预审数据
    reviewStatus: BRollReviewStatus; // 'pending' | 'approved' | 'skipped'

    // Phase 3 渲染数据
    renderStatus?: BRollRenderStatus;
    renderProgress?: number; // 0-100
    outputPath?: string; // 渲染后视频路径
    retryCount?: number; // 重试次数
}

// 扩展的 BRollOption（支持 Phase 2 预审）
export interface BRollOption_V2 {
    optionId: string;
    type: 'remotion' | 'seedance' | 'artlist' | 'internet-clip' | 'user-capture';
    description: string; // 导演大师生成的文案
    previewPath?: string; // 预览图路径 (remotion/seedance)
    props?: Record<string, any>; // Remotion 模板参数
    prompt?: string; // 文生视频提示词
    searchKeywords?: string[]; // Artlist/互联网搜索关键词
    searchTips?: string; // 搜索提示
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
    description?: string;
    tags: string[];
    source: 'llm' | 'user';
    status: 'pending' | 'scoring' | 'scored';
    tubeBuddyScore?: TubeBuddyScore;
    userComment?: string;
}

/** TubeBuddy Keyword Explorer 评分 (Sprint 3 — 真实 DOM 提取后使用此 flat 结构) */
export interface TubeBuddyScore {
    overall: number;        // 综合评分 0-100
    searchVolume: number;   // 搜索量 0-100
    competition: number;    // 竞争度 0-100
    optimization: number;   // 优化度 0-100
    relevance: number;      // 相关度 0-100
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
// SD-207 V3: MarketingMaster V3 Types (2-Phase Redesign)
// ============================================================

/** 关键词的简繁体变体，含独立的 TubeBuddy 评分 */
export interface KeywordVariant {
    text: string;
    script: 'simplified' | 'traditional';
    tubeBuddyScore?: TubeBuddyScore;
    status: 'pending' | 'scoring' | 'scored' | 'error';
    errorMessage?: string;
    scoringDuration?: number;   // 评分耗时 ms
    scoredAt?: string;
}

/** Phase 1: 候选关键词 */
export interface CandidateKeyword {
    id: string;
    keyword: string;            // 主关键词（简体）
    variants: KeywordVariant[]; // 简体 + 繁体变体
    source: 'llm' | 'user';
    isGolden: boolean;          // 用户选定为黄金词
    bestScore?: number;         // variants 中最高 overallScore
}

export type Phase1SubStep = 'candidates' | 'scoring' | 'selection';

/** 视频描述子区块（纯文本，禁止 Markdown） */
export interface DescriptionBlock {
    id: string;
    type: 'hook' | 'geo_qa' | 'series' | 'action_plan' | 'timeline'
        | 'references' | 'pinned_comment' | 'hashtags';
    label: string;
    content: string;            // 纯文本 + Emoji，严禁 ## / ** / -
    isCollapsed: boolean;
}

/** "其他设置" 子项 */
export interface OtherItem {
    key: string;
    label: string;
    value: string;
    isDefault: boolean;         // 是否来自 Default Settings
}

/** Phase 2 表格中的一行 */
export interface MarketingPlanRow {
    id: string;
    rowType: 'title' | 'description' | 'thumbnail' | 'playlist' | 'tags' | 'other';
    label: string;
    content: string;
    isConfirmed: boolean;
    descriptionBlocks?: DescriptionBlock[]; // 仅 description 行
    otherItems?: OtherItem[];               // 仅 other 行
}

/** 一套完整营销方案（对应一个黄金关键词） */
export interface MarketingPlan {
    keywordId: string;
    keyword: string;
    rows: MarketingPlanRow[];
    thumbnailPaths: string[];
    generationStatus: 'pending' | 'generating' | 'ready' | 'error';
    errorMessage?: string;
    generationDuration?: number; // ms
}

/** SRT 字幕解析出的章节 */
export interface SRTChapter {
    title: string;
    startTime: string;          // "00:05:23"
    endTime?: string;
}

/** MarketingMaster V3 顶层状态 */
export interface MarketModule_V3 {
    phase: 1 | 2;
    phase1SubStep: Phase1SubStep;
    candidates: CandidateKeyword[];
    goldenKeywords: string[];   // CandidateKeyword.id 数组（1-3 个）
    activeTabIndex: number;     // 当前激活的 Tab (0-2)
    plans: MarketingPlan[];     // 一个黄金词 = 一套方案
    srtChapters?: SRTChapter[];
    llmAnalysis?: string;       // LLM 策略点评全文
    selectedScript?: { filename: string; path: string };
    savedOutputs?: { paths: string[]; savedAt: string };
}

/** YouTube 平台默认设置 */
export interface YouTubeDefaults {
    language: string;           // "zh-Hans"
    captionsCertification: string;
    alteredContent: boolean;
    madeForKids: boolean;
    category: string;           // "27"
    categoryName: string;       // "Education"
    license: string;            // "standard"
    allowComments: boolean;
    commentSort: string;
    visibility: string;         // "public"
    videoFilenamePattern: string;
}

/** 多平台默认设置（其他平台留 null 占位） */
export interface PlatformDefaults {
    youtube: YouTubeDefaults;
    x: null;
    wechat: null;
    bilibili: null;
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
    actionConfirm?: ToolCallConfirmation;
}

export interface ToolCallConfirmation {
    confirmId: string;
    actionName: string;
    actionArgs: any;
    description: string;
    title?: string;
    targetLabel?: string;
    diffLabel?: string;
    status: 'pending' | 'confirmed' | 'cancelled';
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

export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, any>;
            required?: string[];
        };
    };
}

export interface ToolCallResult {
    type: 'tool_call';
    functionName: string;
    arguments: any;
}

export interface ExpertActionResult {
    success: boolean;
    data?: any;
    error?: string;
}
