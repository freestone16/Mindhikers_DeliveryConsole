import { publishToYoutube } from './connectors/youtube-connector';
import type {
  DistributionHistoryEntry,
  DistributionPlatformResult,
  DistributionTask,
} from './distribution-types';

function buildFailureResult(platform: string, error: unknown): DistributionPlatformResult {
  const message = getErrorMessage(error);

  return {
    platform,
    status: 'failed',
    message,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function buildHistoryId(task: DistributionTask, result: DistributionPlatformResult, completedAt: string) {
  const safeCompletedAt = completedAt.replace(/[^0-9A-Za-z]/g, '');
  return `hist_${task.taskId}_${result.platform}_${safeCompletedAt}`;
}

export function getDistributionTaskOrThrow(queue: DistributionTask[], taskId: string) {
  const task = queue.find((item) => item.taskId === taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  return task;
}

export function markDistributionTaskRunning(task: DistributionTask) {
  if (task.status === 'running') {
    throw new Error('Task is already running');
  }

  if (task.status === 'completed') {
    throw new Error('Completed tasks cannot be executed again');
  }

  task.status = 'running';
  task.error = undefined;
  task.updatedAt = new Date().toISOString();
}

export function markDistributionTaskFailed(task: DistributionTask, error: unknown) {
  const completedAt = new Date().toISOString();

  task.status = 'failed';
  task.updatedAt = completedAt;
  task.completedAt = completedAt;
  task.error = getErrorMessage(error);
}

export async function executeDistributionTask(task: DistributionTask) {
  const results: Record<string, DistributionPlatformResult> = {};

  for (const platform of task.platforms) {
    try {
      if (platform === 'youtube' || platform === 'youtube_shorts') {
        results[platform] = await publishToYoutube(task, platform);
        continue;
      }

      results[platform] = buildFailureResult(platform, `Platform connector not implemented: ${platform}`);
    } catch (error) {
      results[platform] = buildFailureResult(platform, error);
    }
  }

  const completedAt = new Date().toISOString();
  const failedResults = Object.values(results).filter((result) => result.status === 'failed');

  task.results = results;
  task.completedAt = completedAt;
  task.updatedAt = completedAt;
  task.status = failedResults.length > 0 ? 'failed' : 'completed';
  task.error =
    failedResults.length > 0
      ? failedResults
          .map((result) => `${result.platform}: ${result.message || 'Unknown publish failure'}`)
          .join(' | ')
      : undefined;

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
