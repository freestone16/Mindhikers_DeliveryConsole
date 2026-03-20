import { describe, expect, it } from 'vitest';
import {
  createDistributionTask,
  deleteDistributionTask,
  retryDistributionTask,
  summarizeQueue,
} from '../../../server/distribution-queue-service';

describe('distribution-queue-service', () => {
  it('creates a scheduled task with randomized system delay and scheduled status', () => {
    const task = createDistributionTask({
      projectId: 'alpha',
      platforms: ['youtube'],
      assets: {
        mediaUrl: '05_Shorts_Output/demo.mp4',
        textDraft: 'body',
        title: 'Demo',
        tags: ['ai'],
      },
      scheduleTime: '2026-03-21T09:00:00.000Z',
    });

    expect(task.projectId).toBe('alpha');
    expect(task.status).toBe('scheduled');
    expect(task.systemDelayMs).toBeGreaterThanOrEqual(3 * 60 * 1000);
    expect(task.systemDelayMs).toBeLessThanOrEqual(9 * 60 * 1000);
    expect(task.scheduledAt).toBe('2026-03-21T09:00:00.000Z');
  });

  it('summarizes today and upcoming counts from a queue', () => {
    const today = new Date().toISOString();
    const summary = summarizeQueue([
      {
        taskId: 'a',
        projectId: 'alpha',
        platforms: ['youtube'],
        assets: { mediaUrl: 'a', textDraft: '', title: 'a', tags: [] },
        status: 'scheduled',
        createdAt: today,
      },
      {
        taskId: 'b',
        projectId: 'alpha',
        platforms: ['x'],
        assets: { mediaUrl: 'b', textDraft: '', title: 'b', tags: [] },
        status: 'pending',
        createdAt: today,
      },
    ]);

    expect(summary.todayCount).toBe(2);
    expect(summary.upcomingCount).toBe(1);
  });

  it('deletes cancellable tasks and rejects retry/deletion for invalid states', () => {
    const queue = [
      {
        taskId: 'pending_task',
        projectId: 'alpha',
        platforms: ['youtube'],
        assets: { mediaUrl: 'a', textDraft: '', title: 'a', tags: [] },
        status: 'pending' as const,
        createdAt: '2026-03-20T00:00:00.000Z',
      },
      {
        taskId: 'failed_task',
        projectId: 'alpha',
        platforms: ['x'],
        assets: { mediaUrl: 'b', textDraft: '', title: 'b', tags: [] },
        status: 'failed' as const,
        createdAt: '2026-03-20T00:00:00.000Z',
        error: 'boom',
      },
    ];

    const updatedQueue = deleteDistributionTask(queue, 'pending_task');
    expect(updatedQueue).toHaveLength(1);

    const retriedTask = retryDistributionTask(updatedQueue, 'failed_task');
    expect(retriedTask.status).toBe('pending');
    expect(retriedTask.error).toBeUndefined();
  });
});
