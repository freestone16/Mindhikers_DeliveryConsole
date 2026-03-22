import { afterEach, describe, expect, it, vi } from 'vitest';
import { publishToWechatMp } from '../../../server/connectors/wechat-mp-connector';
import { publishToX } from '../../../server/connectors/x-connector';
import { publishToYoutube } from '../../../server/connectors/youtube-connector';
import {
  createDistributionHistoryEntries,
  executeDistributionTask,
  getDistributionTaskOrThrow,
  markDistributionTaskFailed,
  markDistributionTaskRunning,
  recordDistributionTaskEvent,
} from '../../../server/distribution-execution-service';
import type { DistributionTask, DistributionTaskEvent } from '../../../server/distribution-types';

vi.mock('../../../server/connectors/youtube-connector', () => ({
  publishToYoutube: vi.fn(),
}));

vi.mock('../../../server/connectors/x-connector', () => ({
  publishToX: vi.fn(),
}));

vi.mock('../../../server/connectors/wechat-mp-connector', () => ({
  publishToWechatMp: vi.fn(),
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
    status: 'queued',
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

    expect(task.status).toBe('processing');
    expect(task.updatedAt).toBeTruthy();
  });

  it('marks unsupported platforms as failed and records task-level error', async () => {
    const task = createTask({
      platforms: ['weibo'],
      status: 'processing',
    });

    await executeDistributionTask(task);

    expect(task.status).toBe('retryable');
    expect(task.results?.weibo?.status).toBe('failed');
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
      status: 'processing',
      assets: {
        mediaUrl: '05_Shorts_Output/demo.mp4',
        textDraft: 'body',
        title: 'Demo',
        tags: ['ai'],
      },
    });

    await executeDistributionTask(task);

    expect(task.status).toBe('succeeded');
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

  it('executes X tasks through the connector', async () => {
    vi.mocked(publishToX).mockResolvedValue({
      platform: 'twitter',
      status: 'success',
      deliveryMode: 'artifact_ready',
      remoteId: 'x_artifact_1',
      artifactPath: '/tmp/x-1.json',
      publishedAt: '2026-03-20T00:03:00.000Z',
      message: 'X phase1 payload prepared for outbound adapter.',
    });

    const task = createTask({
      platforms: ['twitter'],
      status: 'processing',
    });

    await executeDistributionTask(task);

    expect(task.status).toBe('succeeded');
    expect(task.results?.twitter?.deliveryMode).toBe('artifact_ready');
    expect(task.results?.twitter?.message).toContain('payload prepared');
  });

  it('executes wechat_mp tasks through the connector', async () => {
    vi.mocked(publishToWechatMp).mockResolvedValue({
      platform: 'wechat_mp',
      status: 'success',
      deliveryMode: 'draft_ready',
      remoteId: 'wechat_mp_draft_1',
      artifactPath: '/tmp/wechat-1.json',
      publishedAt: '2026-03-20T00:03:00.000Z',
      message: '微信公众号 draft package generated.',
    });

    const task = createTask({
      platforms: ['wechat_mp'],
      status: 'processing',
    });

    await executeDistributionTask(task);

    expect(task.status).toBe('succeeded');
    expect(task.results?.wechat_mp?.deliveryMode).toBe('draft_ready');
    expect(task.results?.wechat_mp?.message).toContain('draft package generated');
  });

  it('marks task failure details when execution aborts before results are persisted', () => {
    const task = createTask({
      status: 'processing',
    });

    markDistributionTaskFailed(task, new Error('Persistence failed'));

    expect(task.status).toBe('failed');
    expect(task.completedAt).toBeTruthy();
    expect(task.error).toBe('Persistence failed');
  });

  it('records typed task events for queue broadcasts', () => {
    const task = createTask();
    const event = recordDistributionTaskEvent(task, {
      type: 'job_created',
      status: 'queued',
      message: '任务已进入待执行队列',
    });

    expect(event.taskId).toBe('dist_test');
    expect(event.status).toBe('queued');
    expect(event.task?.latestEvent?.type).toBe('job_created');
  });

  it('emits key execution events while running a task', async () => {
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
      status: 'processing',
      assets: {
        mediaUrl: '05_Shorts_Output/demo.mp4',
        textDraft: 'body',
        title: 'Demo',
        tags: ['ai'],
      },
    });
    const events: DistributionTaskEvent[] = [];

    await executeDistributionTask(task, {
      onEvent: (event) => events.push(event),
    });

    expect(events.map((event) => event.type)).toEqual([
      'job_progress',
      'job_progress',
      'job_progress',
      'job_succeeded',
    ]);
    expect(events[0].progress?.stage).toBe('validating_auth');
    expect(events[1].progress?.stage).toBe('uploading_media');
    expect(events[2].progress?.stage).toBe('finalizing_result');
    expect(events[3].status).toBe('succeeded');
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
