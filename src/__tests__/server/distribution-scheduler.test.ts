import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import {
  initScheduler,
  stopScheduler,
  triggerDueTasks,
} from '../../../server/distribution-scheduler';

vi.mock('../../../server/distribution-store', () => ({
  loadDistributionQueue: vi.fn(),
  saveDistributionQueue: vi.fn(),
}));

vi.mock('../../../server/distribution-execution-service', async () => {
  const actual = await vi.importActual(
    '../../../server/distribution-execution-service'
  );
  return {
    ...actual,
    executeDistributionTask: vi.fn(),
    markDistributionTaskRunning: vi.fn(),
    recordDistributionTaskEvent: vi.fn((task, input) => ({
      ...input,
      taskId: task.taskId,
      projectId: task.projectId,
      timestamp: new Date().toISOString(),
    })),
    setAutoRetryScheduler: vi.fn(),
  };
});

vi.mock('../../../server/distribution-events', () => ({
  broadcastDistributionEvent: vi.fn(),
}));

vi.mock('../../../server/project-paths', () => ({
  getProjectsBase: vi.fn(() => '/tmp/projects'),
}));

import { loadDistributionQueue, saveDistributionQueue } from '../../../server/distribution-store';
import {
  executeDistributionTask,
  markDistributionTaskRunning,
  setAutoRetryScheduler,
} from '../../../server/distribution-execution-service';

describe('distribution-scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue([
      { name: 'CSET-test', isDirectory: () => true },
    ] as unknown as fs.Dirent[]);
  });

  afterEach(() => {
    stopScheduler();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function createMockTask(overrides: Record<string, unknown> = {}) {
    return {
      taskId: 'dist_001',
      projectId: 'CSET-test',
      platforms: ['youtube'],
      assets: { mediaUrl: 'a', textDraft: '', title: 'a', tags: [] },
      status: 'scheduled',
      effectiveStartAt: new Date(Date.now() - 1000).toISOString(),
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  it('triggerDueTasks finds and executes a due scheduled task', async () => {
    const task = createMockTask();
    vi.mocked(loadDistributionQueue).mockReturnValue([task]);
    vi.mocked(executeDistributionTask).mockResolvedValue(undefined as never);

    await triggerDueTasks(new Date());

    expect(markDistributionTaskRunning).toHaveBeenCalledWith(task);
    expect(executeDistributionTask).toHaveBeenCalledWith(
      task,
      expect.any(Object)
    );
    expect(saveDistributionQueue).toHaveBeenCalledWith(
      'CSET-test',
      expect.any(Array)
    );
  });

  it('skips tasks already in processing status', async () => {
    const task = createMockTask({ status: 'processing' });
    vi.mocked(loadDistributionQueue).mockReturnValue([task]);

    await triggerDueTasks(new Date());

    expect(executeDistributionTask).not.toHaveBeenCalled();
  });

  it('initScheduler triggers overdue tasks immediately on startup', async () => {
    const task = createMockTask();
    vi.mocked(loadDistributionQueue).mockReturnValue([task]);
    vi.mocked(executeDistributionTask).mockResolvedValue(undefined as never);

    initScheduler();
    await vi.advanceTimersByTimeAsync(0);

    expect(setAutoRetryScheduler).toHaveBeenCalled();
    expect(markDistributionTaskRunning).toHaveBeenCalled();
  });

  it('initScheduler scans every 30 seconds', async () => {
    const task = createMockTask();
    vi.mocked(loadDistributionQueue).mockReturnValue([task]);
    vi.mocked(executeDistributionTask).mockResolvedValue(undefined as never);

    initScheduler();
    await vi.advanceTimersByTimeAsync(0);

    expect(markDistributionTaskRunning).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000);

    expect(markDistributionTaskRunning).toHaveBeenCalledTimes(2);
  });

  it('does not pollute other tasks when one execution throws', async () => {
    const task1 = createMockTask({ taskId: 'dist_001' });
    const task2 = createMockTask({ taskId: 'dist_002' });
    vi.mocked(loadDistributionQueue).mockReturnValue([task1, task2]);
    vi.mocked(executeDistributionTask)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined as never);

    await triggerDueTasks(new Date());

    expect(executeDistributionTask).toHaveBeenCalledTimes(2);
    expect(saveDistributionQueue).toHaveBeenCalled();
  });

  it('injects setAutoRetryScheduler and triggers retry after delay', async () => {
    const task = createMockTask({ status: 'retryable', attemptCount: 1 });
    vi.mocked(loadDistributionQueue).mockReturnValue([task]);
    vi.mocked(executeDistributionTask).mockResolvedValue(undefined as never);

    initScheduler();
    await vi.advanceTimersByTimeAsync(0);

    const injectedScheduler = vi.mocked(setAutoRetryScheduler).mock.calls[0][0];
    expect(injectedScheduler).toBeDefined();

    injectedScheduler!(task, 5000);
    await vi.advanceTimersByTimeAsync(5000);

    expect(executeDistributionTask).toHaveBeenCalled();
  });

  it('stops retry timeouts on stopScheduler', () => {
    initScheduler();

    const injectedScheduler = vi.mocked(setAutoRetryScheduler).mock.calls[0][0];
    injectedScheduler!(createMockTask(), 10_000);

    stopScheduler();

    expect(setAutoRetryScheduler).toHaveBeenLastCalledWith(null);
  });
});
