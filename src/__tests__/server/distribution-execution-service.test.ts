import { describe, expect, it } from 'vitest';
import {
  createDistributionHistoryEntries,
  executeDistributionTask,
  getDistributionTaskOrThrow,
  markDistributionTaskRunning,
} from '../../../server/distribution-execution-service';
import type { DistributionTask } from '../../../server/distribution-types';

function createTask(overrides: Partial<DistributionTask> = {}): DistributionTask {
  return {
    taskId: 'dist_test',
    projectId: 'alpha',
    platforms: ['wechat_mp'],
    assets: {
      mediaUrl: '02_Script/article.md',
      textDraft: 'body',
      title: 'Demo',
      tags: ['ai'],
    },
    status: 'pending',
    createdAt: '2026-03-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('distribution-execution-service', () => {
  it('finds tasks and marks them as running before execution', () => {
    const queue = [createTask()];
    const task = getDistributionTaskOrThrow(queue, 'dist_test');

    markDistributionTaskRunning(task);

    expect(task.status).toBe('running');
    expect(task.updatedAt).toBeTruthy();
  });

  it('marks unsupported platforms as failed and records task-level error', async () => {
    const task = createTask({
      platforms: ['wechat_mp'],
      status: 'running',
    });

    await executeDistributionTask(task);

    expect(task.status).toBe('failed');
    expect(task.results?.wechat_mp?.status).toBe('failed');
    expect(task.error).toContain('Platform connector not implemented');
  });

  it('creates history entries from platform execution results', () => {
    const task = createTask({
      completedAt: '2026-03-20T00:02:00.000Z',
      results: {
        youtube: {
          platform: 'youtube',
          status: 'success',
          remoteId: 'video_123',
          url: 'https://youtube.com/watch?v=video_123',
          message: 'ok',
        },
      },
    });

    const entries = createDistributionHistoryEntries(task);

    expect(entries).toEqual([
      {
        historyId: 'hist_dist_test_youtube',
        taskId: 'dist_test',
        projectId: 'alpha',
        platform: 'youtube',
        title: 'Demo',
        mediaUrl: '02_Script/article.md',
        status: 'success',
        createdAt: '2026-03-20T00:00:00.000Z',
        completedAt: '2026-03-20T00:02:00.000Z',
        remoteId: 'video_123',
        url: 'https://youtube.com/watch?v=video_123',
        error: undefined,
      },
    ]);
  });
});
