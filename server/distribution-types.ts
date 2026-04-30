export type PlatformAuthStatus =
  | 'connected'
  | 'expired'
  | 'needs_refresh'
  | 'offline'
  | 'draft_ready';

export type PlatformAuthType = 'oauth' | 'cookie' | 'appkey';
export type LegacyDistributionTaskStatus = 'pending' | 'running' | 'completed';
export type DistributionTaskStatus = 'queued' | 'scheduled' | 'processing' | 'succeeded' | 'failed' | 'retryable';
export type DistributionResultStatus = 'success' | 'failed';
export type DistributionTaskEventType =
  | 'job_created'
  | 'job_deleted'
  | 'job_retried'
  | 'job_started'
  | 'job_progress'
  | 'job_failed'
  | 'job_succeeded';
export type DistributionTaskProgressStage =
  | 'validating_auth'
  | 'uploading_media'
  | 'finalizing_result';

export interface DistributionTaskProgress {
  stage: DistributionTaskProgressStage;
  current?: number;
  total?: number;
}

export interface DistributionTaskLatestEvent {
  type: DistributionTaskEventType;
  status: DistributionTaskStatus;
  platform?: string;
  message?: string;
  progress?: DistributionTaskProgress;
  timestamp: string;
}

export interface PlatformAccount {
  platform: string;
  status: PlatformAuthStatus;
  target?: string;
  lastAuth?: string;
  authType: PlatformAuthType;
}

export interface AuthData {
  accounts: PlatformAccount[];
  lastChecked: string;
}

/**
 * 错误分类（A3 重试策略使用）。
 * 与 server/distribution-retry-policy.ts 的 classifyError 输出对齐。
 */
export type DistributionErrorCategory =
  | '4xx_auth'         // 401/403：不重试
  | '4xx_content'      // 422：内容违规，不重试
  | '4xx_rate_limit'   // 429：递增延迟重试
  | '5xx_server'       // 服务端错误：立即/短延迟重试
  | 'network'          // 网络/超时：立即/短延迟重试
  | 'unknown';         // 兜底分类

/**
 * X / Twitter 平台的覆盖字段。
 * 字段定义参考 PRD §5.1 与 X API v2 docs。
 */
export interface PlatformOverrideTwitter {
  title?: string;
  tags?: string[];
  replySettings?: 'everyone' | 'following' | 'mentioned';
  communityUrl?: string;
  madeWithAi?: boolean;
  paidPartnership?: boolean;
}

/**
 * 微信公众号平台的覆盖字段。
 * 字段定义参考 PRD §5.2 与微信草稿 API。
 */
export interface PlatformOverrideWechatMp {
  title?: string;
  tags?: string[];
  summary?: string;            // 摘要 ≤120 字
  author?: string;
  originalLink?: string;
  coverImagePath?: string;     // 项目内相对路径，将上传到素材库换 thumb_media_id
  commentEnabled?: boolean;
  rewardEnabled?: boolean;
}

/**
 * YouTube 平台的覆盖字段。
 * 字段定义参考 PRD §5.3 与 YouTube Data API v3。
 */
export interface PlatformOverrideYoutube {
  title?: string;
  tags?: string[];
  visibility?: 'private' | 'unlisted' | 'public';
  madeForKids?: boolean;
  category?: string;
  license?: 'youtube' | 'creativeCommon';
  thumbnailPath?: string;
}

/**
 * 哔哩哔哩平台的覆盖字段。
 * 字段定义参考 PRD §5.4。
 * copyright=2（转载）时 source 必填，由 connector 运行时校验。
 */
export interface PlatformOverrideBilibili {
  title?: string;
  tags?: string[];
  copyright?: 1 | 2;           // 1=原创 2=转载
  tid?: number;                // 分区 ID
  source?: string;             // 转载来源（copyright=2 必填）
  noReprint?: boolean;
  chargeOpen?: boolean;
  dolby?: boolean;
  hires?: boolean;
  dtime?: number;              // Unix 秒，B站定时
  thumbnailPath?: string;
}

/**
 * 平台覆盖字段联合类型。
 * Record<string, ...> 保留对未实现平台的向后兼容（可被泛化为基础字段）。
 */
export type PlatformOverride =
  | PlatformOverrideTwitter
  | PlatformOverrideWechatMp
  | PlatformOverrideYoutube
  | PlatformOverrideBilibili
  | { title?: string; tags?: string[] };

export interface DistributionTaskAssets {
  mediaUrl: string;
  textDraft: string;
  title: string;
  tags: string[];
  summary?: string;
  sourceFiles?: string[];
  platformOverrides?: Record<string, PlatformOverride>;
  visibility?: 'private' | 'unlisted' | 'public';

  // === A1 新增 ===
  /** 素材组归属 ID，例如 "longform_深度文稿_v2-1" / "video_main_1080p" */
  materialGroupId?: string;
  /** 风控延时开关，默认 true。false 则立即发布（systemDelayMs=0） */
  riskDelayEnabled?: boolean;
}

export interface DistributionPlatformResult {
  platform: string;
  status: DistributionResultStatus;
  deliveryMode?: 'published' | 'draft_ready' | 'artifact_ready';
  remoteId?: string;
  url?: string;
  publishedAt?: string;
  artifactPath?: string;
  message?: string;

  // === A1 新增 ===
  /** 草稿态平台的「打开后台」URL，对应 PRD R4.5 */
  backendUrl?: string;
  /** 错误分类（仅 status='failed' 时有值），驱动 A3 重试策略 */
  errorCategory?: DistributionErrorCategory;
  /** 已尝试次数（1=首次），重试时递增 */
  attemptCount?: number;
  /** ISO 8601 下次重试时间（仅可重试错误时有值） */
  nextRetryAt?: string;
}

export interface DistributionTask {
  taskId: string;
  projectId: string;
  platforms: string[];
  assets: DistributionTaskAssets;
  scheduleTime?: string;
  timezone?: string;
  systemDelayMs?: number;
  status: DistributionTaskStatus;
  createdAt: string;
  updatedAt?: string;
  scheduledAt?: string;
  completedAt?: string;
  error?: string;
  results?: Record<string, DistributionPlatformResult>;
  latestEvent?: DistributionTaskLatestEvent;

  // === A1 新增 ===
  /**
   * 实际开始执行的时间（ISO 8601）。
   * 计算公式：scheduleTime（如有）+ systemDelayMs（如风控延时启用）。
   * 即时发布场景：now + systemDelayMs。
   * A4 调度器轮询此字段决定是否触发执行。
   */
  effectiveStartAt?: string;
  /** 已尝试次数，重试时递增。1=首次执行 */
  attemptCount?: number;

  // === A4 新增 ===
  /**
   * 风控延时开关。默认 true。
   * false 时 systemDelayMs = 0，即时发布无延时。
   */
  riskDelayEnabled?: boolean;
}

export interface DistributionHistoryEntry {
  historyId: string;
  taskId: string;
  projectId: string;
  platform: string;
  title: string;
  mediaUrl: string;
  status: DistributionResultStatus;
  createdAt: string;
  completedAt: string;
  publishedAt?: string;
  remoteId?: string;
  url?: string;
  message?: string;
  error?: string;
}

export interface DistributionVideoAsset {
  name: string;
  path: string;
  type: string;
}

export interface DistributionTextAsset {
  name: string;
  path: string;
}

export interface DistributionComposerSourceFile {
  name: string;
  path: string;
  category: 'marketing' | 'script' | 'video';
}

export interface DistributionComposerSources {
  suggestedTitle: string;
  suggestedBody: string;
  suggestedTags: string[];
  sourceFiles: DistributionComposerSourceFile[];
  warnings: string[];
}

/**
 * === A1/A2 新增 ===
 * 受支持的发布平台（一期 4 个）。
 * 一期不做的平台保留在代码里但不在 UI 中暴露。
 */
export type DistributionSupportedPlatform = 'twitter' | 'wechat_mp' | 'youtube' | 'bilibili';

/**
 * 素材组的 ready 状态（按平台维度）。
 * - ready=true：可勾选发布
 * - ready=false + missingItems：UI 置灰，hover 提示缺失项
 */
export interface DistributionPlatformReadyState {
  ready: boolean;
  /** 缺失项中文清单，例如 ['封面图 cover.png 不存在', '市场大师文案不存在'] */
  missingItems?: string[];
}

/**
 * 素材组（PRD §5 D2 决策的实现单元）。
 * 一个项目可以有 N 个素材组：
 * - 长文素材（02_Script/*.md）→ 每个 .md 一组，applicablePlatforms = ['twitter', 'wechat_mp']
 * - 长视频素材（04_Video/*.mp4）→ 每个 .mp4 一组，applicablePlatforms = ['youtube', 'bilibili']
 *
 * 卡片数 = 素材组数 × 该组 applicablePlatforms 长度。
 */
export interface DistributionMaterialGroup {
  /** 组唯一 ID，例如 "longform_深度文稿_v2-1" / "video_main_1080p" */
  groupId: string;
  /** 素材组类型 */
  groupType: 'longform' | 'video';
  /** 主素材文件信息 */
  primarySource: DistributionComposerSourceFile;
  /** 该组适用的平台清单 */
  applicablePlatforms: DistributionSupportedPlatform[];
  /** 自动预填的标题建议（来自 marketing 文案或主素材） */
  suggestedTitle: string;
  /** 自动预填的正文建议 */
  suggestedBody: string;
  /** 自动预填的标签建议 */
  suggestedTags: string[];
  /**
   * 各平台的 ready 状态判定结果。
   * 键为 DistributionSupportedPlatform，仅包含 applicablePlatforms 中的平台。
   */
  readyState: Partial<Record<DistributionSupportedPlatform, DistributionPlatformReadyState>>;
  /** 本组扫描过程中的告警（不阻塞，仅作 UI 提示） */
  warnings: string[];
}

/**
 * V2 composer-sources 返回结构（PRD R1.1）。
 * V1（DistributionComposerSources）保留作为旧 PublishComposer 的契约，不破坏。
 *
 * 路由约定：
 *   GET /distribution/composer-sources?projectId=X         → 返回 V1
 *   GET /distribution/composer-sources?projectId=X&v=2     → 返回 V2
 */
export interface DistributionComposerSourcesV2 {
  /** 扫描出的所有素材组 */
  groups: DistributionMaterialGroup[];
  /** 扫描时间（ISO 8601） */
  scannedAt: string;
  /** 项目级告警，例如 ['项目目录为空', '02_Script 不存在'] */
  warnings: string[];
  /**
   * 兼容字段：旧客户端如果误传 v=2 但只解析旧字段，仍能工作。
   * 内容来自第一个 longform 组（如有）的 suggested* 字段。
   */
  legacy?: DistributionComposerSources;
}

export interface DistributionTaskEvent {
  type: DistributionTaskEventType;
  taskId: string;
  projectId: string;
  status: DistributionTaskStatus;
  platform?: string;
  message?: string;
  progress?: DistributionTaskProgress;
  result?: DistributionPlatformResult;
  timestamp: string;
  task?: DistributionTask;
}

export function normalizeDistributionTaskStatus(
  status: DistributionTaskStatus | LegacyDistributionTaskStatus
): DistributionTaskStatus {
  switch (status) {
    case 'pending':
      return 'queued';
    case 'running':
      return 'processing';
    case 'completed':
      return 'succeeded';
    default:
      return status;
  }
}

export function normalizeDistributionTask(task: DistributionTask): DistributionTask {
  const normalizedStatus = normalizeDistributionTaskStatus(
    task.status as DistributionTaskStatus | LegacyDistributionTaskStatus
  );
  const normalizedLatestEvent = task.latestEvent
    ? {
        ...task.latestEvent,
        status: normalizeDistributionTaskStatus(
          task.latestEvent.status as DistributionTaskStatus | LegacyDistributionTaskStatus
        ),
      }
    : undefined;

  if (normalizedStatus === task.status && normalizedLatestEvent === task.latestEvent) {
    return task;
  }

  return {
    ...task,
    status: normalizedStatus,
    latestEvent: normalizedLatestEvent,
  };
}
