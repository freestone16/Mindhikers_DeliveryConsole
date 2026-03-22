import { EventEmitter } from 'events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  broadcastDistributionEvent,
  registerDistributionEventSubscriber,
  resetDistributionEventSubscribers,
} from '../../../server/distribution-events';
import type { DistributionTaskEvent } from '../../../server/distribution-types';

function createMockResponse() {
  const emitter = new EventEmitter();
  const writes: string[] = [];

  const res = {
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn((chunk: string) => {
      writes.push(chunk);
      return true;
    }),
    on: emitter.on.bind(emitter),
  };

  return {
    res,
    writes,
    close: () => emitter.emit('close'),
  };
}

function createEvent(overrides: Partial<DistributionTaskEvent> = {}): DistributionTaskEvent {
  return {
    type: 'job_created',
    taskId: 'dist_test',
    projectId: 'alpha',
    status: 'queued',
    message: '任务已进入待执行队列',
    timestamp: '2026-03-22T10:00:00.000Z',
    task: {
      taskId: 'dist_test',
      projectId: 'alpha',
      platforms: ['youtube'],
      assets: {
        mediaUrl: '05_Shorts_Output/demo.mp4',
        textDraft: 'body',
        title: 'Demo',
        tags: ['ai'],
      },
      status: 'queued',
      createdAt: '2026-03-22T09:59:00.000Z',
    },
    ...overrides,
  };
}

describe('distribution-events', () => {
  afterEach(() => {
    resetDistributionEventSubscribers();
  });

  it('registers a project subscriber and streams typed events', () => {
    const { res, writes } = createMockResponse();

    registerDistributionEventSubscriber('alpha', res as any);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.flushHeaders).toHaveBeenCalled();

    broadcastDistributionEvent(createEvent());

    expect(writes.join('')).toContain('event: job_created');
    expect(writes.join('')).toContain('"taskId":"dist_test"');
    expect(writes.join('')).toContain('"projectId":"alpha"');
  });

  it('cleans up closed subscribers so they no longer receive broadcasts', () => {
    const { res, writes, close } = createMockResponse();

    registerDistributionEventSubscriber('alpha', res as any);
    close();

    broadcastDistributionEvent(
      createEvent({
        type: 'job_failed',
        status: 'retryable',
        message: 'youtube: token expired',
      })
    );

    expect(writes.join('')).not.toContain('job_failed');
  });
});
