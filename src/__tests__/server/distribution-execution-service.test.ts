import { afterEach, describe, expect, it, vi } from 'vitest';
import { publishToYoutube } from '../../../server/connectors/youtube-connector';
import {
  createDistributionHistoryEntries,
  executeDistributionTask,
  getDistributionTaskOrThrow,
  markDistributionTaskFailed,
  markDistributionTaskRunning,
} from '../../../server/distribution-execution-service';
import type { DistributionTask } from '../../../server/distribution-types';

vi.mock('../../../server/connectors/youtube-connector', () => ({
  publishToYoutube: vi.fn(),
}));

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
  afterEach(() => {
    vi.clearAllMocks();
  });

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

  it('marks youtube tasks as completed when the connector succeeds', async () => {
    vi.mocked(publishToYoutube).mockResolvedValue({
      platform: 'youtube',
      status: 'success',
      remoteId: 'video_123',
      url: 'https://youtube.com/watch?v=video_123',
      publishedAt: '2026-03-20T00:03:00.000Z',
      message: 'YouTube upload completed.',
    });

    const task = createTask({
      platforms: ['youtube'],
      status: 'running',
      assets: {
        mediaUrl: '05_Shorts_Output/demo.mp4',
        textDraft: 'body',
        title: 'Demo',
        tags: ['ai'],
      },
    });

    await executeDistributionTask(task);

    expect(task.status).toBe('completed');
    expect(task.error).toBeUndefined();
    expect(task.results?.youtube).toEqual({
      platform: 'youtube',
      status: 'success',
      remoteId: 'video_123',
      url: 'https://youtube.com/watch?v=video_123',
      publishedAt: '2026-03-20T00:03:00.000Z',
      message: 'YouTube upload completed.',
    });
  });

  it('marks task failure details when execution aborts before results are persisted', () => {
    const task = createTask({
      status: 'running',
    });

    markDistributionTaskFailed(task, new Error('Persistence failed'));

    expect(task.status).toBe('failed');
    expect(task.completedAt).toBeTruthy();
    expect(task.error).toBe('Persistence failed');
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
          publishedAt: '2026-03-20T00:01:30.000Z',
          message: 'ok',
        },
      },
    });

    const entries = createDistributionHistoryEntries(task);

    expect(entries).toEqual([
      {
        historyId: 'hist_dist_test_youtube_20260320T000200000Z',
        taskId: 'dist_test',
        projectId: 'alpha',
        platform: 'youtube',
        title: 'Demo',
        mediaUrl: '02_Script/article.md',
        status: 'success',
        createdAt: '2026-03-20T00:00:00.000Z',
        completedAt: '2026-03-20T00:02:00.000Z',
        publishedAt: '2026-03-20T00:01:30.000Z',
        remoteId: 'video_123',
        url: 'https://youtube.com/watch?v=video_123',
        message: 'ok',
        error: undefined,
      },
    ]);
  });
});
