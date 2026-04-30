import { publishToWechatMp } from './connectors/wechat-mp-connector';
import { publishToX } from './connectors/x-connector';
import { publishToYoutube } from './connectors/youtube-connector';
import {
  applyRetryPolicy,
  classifyError,
  computeNextRetryAt,
  defaultRetryPolicy,
  type RetryPolicyConfig,
} from './distribution-retry-policy';
import type {
  DistributionErrorCategory,
  DistributionHistoryEntry,
  DistributionPlatformResult,
  DistributionTask,
  DistributionTaskEvent,
  DistributionTaskEventType,
  DistributionTaskProgress,
  DistributionTaskStatus,
} from './distribution-types';

function buildFailureResult(platform: string, error: unknown): DistributionPlatformResult {
  const message = getErrorMessage(error);

  return {
    platform,
    status: 'failed',
    message,
    errorCategory: classifyError(error),
  };
}

function annotateRetryMetadata(
  result: DistributionPlatformResult,
  attemptCount: number,
  policy: RetryPolicyConfig = defaultRetryPolicy
): DistributionPlatformResult {
  if (result.status !== 'failed') {
    return result;
  }

  const category: DistributionErrorCategory = result.errorCategory ?? classifyError(undefined);
  const decision = applyRetryPolicy(category, attemptCount, policy);

  return {
    ...result,
    errorCategory: category,
    attemptCount,
    nextRetryAt:
      decision.shouldRetry && typeof decision.delayMs === 'number'
        ? computeNextRetryAt(decision.delayMs)
        : undefined,
  };
}

function isResultRetryable(
  result: DistributionPlatformResult,
  attemptCount: number,
  policy: RetryPolicyConfig = defaultRetryPolicy
): boolean {
  if (result.status !== 'failed') return false;
  const category: DistributionErrorCategory = result.errorCategory ?? 'unknown';
  return applyRetryPolicy(category, attemptCount, policy).shouldRetry;
}

type AutoRetryScheduler = (task: DistributionTask, delayMs: number) => void;

let autoRetryScheduler: AutoRetryScheduler | null = null;

/**
 * A4 单元注入实际的调度器实现（基于 setTimeout）。
 * A3 只暴露钩子，留下默认 no-op 以避免破坏调用方。
 */
export function setAutoRetryScheduler(scheduler: AutoRetryScheduler | null) {
  autoRetryScheduler = scheduler;
}

export function scheduleAutoRetry(task: DistributionTask, delayMs: number) {
  autoRetryScheduler?.(task, delayMs);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function buildHistoryId(task: DistributionTask, result: DistributionPlatformResult, completedAt: string) {
  const safeCompletedAt = completedAt.replace(/[^0-9A-Za-z]/g, '');
  return `hist_${task.taskId}_${result.platform}_${safeCompletedAt}`;
}

function cloneTask(task: DistributionTask): DistributionTask {
  return JSON.parse(JSON.stringify(task)) as DistributionTask;
}

function buildTaskEvent(
  task: DistributionTask,
  input: {
    type: DistributionTaskEventType;
    status: DistributionTaskStatus;
    platform?: string;
    message?: string;
    progress?: DistributionTaskProgress;
    result?: DistributionPlatformResult;
  }
): DistributionTaskEvent {
  const timestamp = new Date().toISOString();
  const nextStatus = input.status;

  task.status = nextStatus;
  task.updatedAt = timestamp;
  task.latestEvent = {
    type: input.type,
    status: nextStatus,
    platform: input.platform,
    message: input.message,
    progress: input.progress,
    timestamp,
  };

  if (input.type === 'job_started') {
    task.completedAt = undefined;
  }

  if (input.type === 'job_failed' || input.type === 'job_succeeded') {
    task.completedAt = task.completedAt || timestamp;
  }

  return {
    type: input.type,
    taskId: task.taskId,
    projectId: task.projectId,
    status: nextStatus,
    platform: input.platform,
    message: input.message,
    progress: input.progress,
    result: input.result,
    timestamp,
    task: cloneTask(task),
  };
}

function emitTaskEvent(
  task: DistributionTask,
  input: {
    type: DistributionTaskEventType;
    status: DistributionTaskStatus;
    platform?: string;
    message?: string;
    progress?: DistributionTaskProgress;
    result?: DistributionPlatformResult;
  },
  onEvent?: (event: DistributionTaskEvent) => void
) {
  const event = buildTaskEvent(task, input);
  onEvent?.(event);
  return event;
}

export function getDistributionTaskOrThrow(queue: DistributionTask[], taskId: string) {
  const task = queue.find((item) => item.taskId === taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  return task;
}

export function markDistributionTaskRunning(task: DistributionTask) {
  if (task.status === 'processing') {
    throw new Error('Task is already running');
  }

  if (task.status === 'succeeded') {
    throw new Error('Completed tasks cannot be executed again');
  }

  task.status = 'processing';
  task.error = undefined;
  task.completedAt = undefined;
  task.attemptCount = (task.attemptCount ?? 0) + 1;
  task.updatedAt = new Date().toISOString();
}

export function markDistributionTaskFailed(
  task: DistributionTask,
  error: unknown,
  options?: {
    retryable?: boolean;
    onEvent?: (event: DistributionTaskEvent) => void;
  }
) {
  task.error = getErrorMessage(error);

  return emitTaskEvent(
    task,
    {
      type: 'job_failed',
      status: options?.retryable ? 'retryable' : 'failed',
      message: task.error,
    },
    options?.onEvent
  );
}

export function recordDistributionTaskEvent(
  task: DistributionTask,
  input: {
    type: DistributionTaskEventType;
    status: DistributionTaskStatus;
    platform?: string;
    message?: string;
    progress?: DistributionTaskProgress;
    result?: DistributionPlatformResult;
  }
) {
  return buildTaskEvent(task, input);
}

export async function executeDistributionTask(
  task: DistributionTask,
  options?: {
    onEvent?: (event: DistributionTaskEvent) => void;
  }
) {
  const results: Record<string, DistributionPlatformResult> = {};
  const onEvent = options?.onEvent;
  const attemptCount = task.attemptCount ?? 1;

  for (const [index, platform] of task.platforms.entries()) {
    try {
      emitTaskEvent(
        task,
        {
          type: 'job_progress',
          status: 'processing',
          platform,
          message: `正在校验 ${platform} 的发布凭证`,
          progress: {
            stage: 'validating_auth',
            current: index + 1,
            total: task.platforms.length,
          },
        },
        onEvent
      );

      if (platform === 'youtube' || platform === 'youtube_shorts') {
        emitTaskEvent(
          task,
          {
            type: 'job_progress',
            status: 'processing',
            platform,
            message: `正在上传媒体到 ${platform}`,
            progress: {
              stage: 'uploading_media',
              current: index + 1,
              total: task.platforms.length,
            },
          },
          onEvent
        );

        results[platform] = await publishToYoutube(task, platform);
      } else if (platform === 'twitter') {
        results[platform] = await publishToX(task);
      } else if (platform === 'wechat_mp') {
        results[platform] = await publishToWechatMp(task);
      } else {
        results[platform] = buildFailureResult(platform, `Platform connector not implemented: ${platform}`);
      }

      results[platform] = annotateRetryMetadata(results[platform], attemptCount);

      emitTaskEvent(
        task,
        {
          type: 'job_progress',
          status: 'processing',
          platform,
          message:
            results[platform].status === 'success'
              ? results[platform].message || `${platform} 发布成功，正在整理结果`
              : results[platform].message || `${platform} 发布失败，正在整理错误信息`,
          progress: {
            stage: 'finalizing_result',
            current: index + 1,
            total: task.platforms.length,
          },
          result: results[platform],
        },
        onEvent
      );
    } catch (error) {
      results[platform] = annotateRetryMetadata(buildFailureResult(platform, error), attemptCount);

      emitTaskEvent(
        task,
        {
          type: 'job_progress',
          status: 'processing',
          platform,
          message: results[platform].message || `${platform} 发布失败，正在整理错误信息`,
          progress: {
            stage: 'finalizing_result',
            current: index + 1,
            total: task.platforms.length,
          },
          result: results[platform],
        },
        onEvent
      );
    }
  }

  const completedAt = new Date().toISOString();
  const failedResults = Object.values(results).filter((result) => result.status === 'failed');
  const hasFailures = failedResults.length > 0;
  const anyRetryable = failedResults.some((result) => isResultRetryable(result, attemptCount));

  task.results = results;
  task.completedAt = completedAt;
  task.updatedAt = completedAt;
  task.status = hasFailures ? (anyRetryable ? 'retryable' : 'failed') : 'succeeded';
  task.error = hasFailures
    ? failedResults
        .map((result) => `${result.platform}: ${result.message || 'Unknown publish failure'}`)
        .join(' | ')
    : undefined;

  const finalStatus: DistributionTaskStatus = task.status;

  emitTaskEvent(
    task,
    {
      type: hasFailures ? 'job_failed' : 'job_succeeded',
      status: finalStatus,
      message: hasFailures
        ? task.error || '任务执行失败，请检查平台结果并重试'
        : '任务执行完成，所有平台均已成功返回结果',
    },
    onEvent
  );

  if (anyRetryable) {
    const nextDelayMs = failedResults
      .map((result) => {
        const category: DistributionErrorCategory = result.errorCategory ?? 'unknown';
        const decision = applyRetryPolicy(category, attemptCount);
        return decision.shouldRetry ? decision.delayMs ?? 0 : Number.POSITIVE_INFINITY;
      })
      .reduce((min, current) => (current < min ? current : min), Number.POSITIVE_INFINITY);

    if (Number.isFinite(nextDelayMs)) {
      scheduleAutoRetry(task, nextDelayMs);
    }
  }

  return task;
}

export function createDistributionHistoryEntries(task: DistributionTask): DistributionHistoryEntry[] {
  const completedAt = task.completedAt || new Date().toISOString();
  const results = Object.values(task.results || {});

  return results.map((result) => ({
    historyId: buildHistoryId(task, result, completedAt),
    taskId: task.taskId,
    projectId: task.projectId,
    platform: result.platform,
    title: task.assets.title,
    mediaUrl: task.assets.mediaUrl,
    status: result.status,
    createdAt: task.createdAt,
    completedAt,
    publishedAt: result.publishedAt,
    remoteId: result.remoteId,
    url: result.url,
    message: result.message,
    error: result.status === 'failed' ? result.message : undefined,
  }));
}
