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

export interface DistributionTaskAssets {
  mediaUrl: string;
  textDraft: string;
  title: string;
  tags: string[];
  summary?: string;
  sourceFiles?: string[];
  platformOverrides?: Record<
    string,
    {
      title?: string;
      tags?: string[];
    }
  >;
  visibility?: 'private' | 'unlisted' | 'public';
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
