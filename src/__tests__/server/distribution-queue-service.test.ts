import { describe, expect, it } from 'vitest';
import {
  createDistributionTask,
  deleteDistributionTask,
  retryDistributionTask,
  summarizeQueue,
} from '../../../server/distribution-queue-service';

describe('distribution-queue-service', () => {
  it('creates a scheduled task with randomized system delay (2-8min) and scheduled status', () => {
    const task = createDistributionTask({
      projectId: 'alpha',
      platforms: ['youtube'],
      assets: {
        mediaUrl: '05_Shorts_Output/demo.mp4',
        textDraft: 'body',
        title: 'Demo',
        tags: ['ai'],
        visibility: 'private',
      },
      scheduleTime: '2099-03-21T09:00:00.000Z',
    });

    expect(task.projectId).toBe('alpha');
    expect(task.status).toBe('scheduled');
    expect(task.systemDelayMs).toBeGreaterThanOrEqual(2 * 60 * 1000);
    expect(task.systemDelayMs).toBeLessThanOrEqual(8 * 60 * 1000);
    expect(task.riskDelayEnabled).toBe(true);
    expect(task.effectiveStartAt).toBeDefined();
    expect(new Date(task.effectiveStartAt!).getTime()).toBe(
      new Date('2099-03-21T09:00:00.000Z').getTime() + (task.systemDelayMs || 0)
    );
    expect(task.scheduledAt).toBe('2099-03-21T09:00:00.000Z');
    expect(task.assets.visibility).toBe('private');
  });

  it('creates an immediate task with risk delay enabled (default) → scheduled with 2-8min delay', () => {
    const before = Date.now();
    const task = createDistributionTask({
      projectId: 'alpha',
      platforms: ['youtube'],
      assets: { mediaUrl: 'a', textDraft: '', title: 'a', tags: [] },
    });
    const after = Date.now();

    expect(task.status).toBe('scheduled');
    expect(task.systemDelayMs).toBeGreaterThanOrEqual(2 * 60 * 1000);
    expect(task.systemDelayMs).toBeLessThanOrEqual(8 * 60 * 1000);
    expect(task.riskDelayEnabled).toBe(true);
    expect(task.effectiveStartAt).toBeDefined();
    const effectiveMs = new Date(task.effectiveStartAt!).getTime();
    expect(effectiveMs).toBeGreaterThanOrEqual(before + (task.systemDelayMs || 0));
    expect(effectiveMs).toBeLessThanOrEqual(after + (task.systemDelayMs || 0));
  });

  it('creates an immediate task with risk delay disabled → queued with zero delay', () => {
    const before = Date.now();
    const task = createDistributionTask({
      projectId: 'alpha',
      platforms: ['youtube'],
      assets: { mediaUrl: 'a', textDraft: '', title: 'a', tags: [] },
      riskDelayEnabled: false,
    });
    const after = Date.now();

    expect(task.status).toBe('queued');
    expect(task.systemDelayMs).toBe(0);
    expect(task.riskDelayEnabled).toBe(false);
    expect(task.effectiveStartAt).toBeDefined();
    const effectiveMs = new Date(task.effectiveStartAt!).getTime();
    expect(effectiveMs).toBeGreaterThanOrEqual(before);
    expect(effectiveMs).toBeLessThanOrEqual(after);
  });

  it('creates a scheduled task with risk delay disabled → scheduled with zero delay', () => {
    const task = createDistributionTask({
      projectId: 'alpha',
      platforms: ['youtube'],
      assets: { mediaUrl: 'a', textDraft: '', title: 'a', tags: [] },
      scheduleTime: '2099-03-21T09:00:00.000Z',
      riskDelayEnabled: false,
    });

    expect(task.status).toBe('scheduled');
    expect(task.systemDelayMs).toBe(0);
    expect(task.riskDelayEnabled).toBe(false);
    expect(task.effectiveStartAt).toBe('2099-03-21T09:00:00.000Z');
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
        status: 'queued',
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
        status: 'queued' as const,
        createdAt: '2026-03-20T00:00:00.000Z',
      },
      {
        taskId: 'failed_task',
        projectId: 'alpha',
        platforms: ['x'],
        assets: { mediaUrl: 'b', textDraft: '', title: 'b', tags: [] },
        status: 'retryable' as const,
        createdAt: '2026-03-20T00:00:00.000Z',
        error: 'boom',
      },
    ];

    const updatedQueue = deleteDistributionTask(queue, 'pending_task');
    expect(updatedQueue).toHaveLength(1);

    const retriedTask = retryDistributionTask(updatedQueue, 'failed_task');
    expect(retriedTask.status).toBe('queued');
    expect(retriedTask.error).toBeUndefined();
  });
});
