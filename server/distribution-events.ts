import type { Response } from 'express';
import { setupSSE, writeSSE } from './sse';
import type { DistributionTaskEvent } from './distribution-types';

const HEARTBEAT_MS = 15_000;
const subscribers = new Map<string, Set<Response>>();
const heartbeats = new Map<Response, NodeJS.Timeout>();

function getSubscriberBucket(projectId: string) {
  let bucket = subscribers.get(projectId);
  if (!bucket) {
    bucket = new Set<Response>();
    subscribers.set(projectId, bucket);
  }
  return bucket;
}

function unregisterSubscriber(projectId: string, res: Response) {
  const bucket = subscribers.get(projectId);
  if (bucket) {
    bucket.delete(res);
    if (bucket.size === 0) {
      subscribers.delete(projectId);
    }
  }

  const heartbeat = heartbeats.get(res);
  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeats.delete(res);
  }
}

export function registerDistributionEventSubscriber(projectId: string, res: Response) {
  setupSSE(res);
  res.write(': connected\n\n');

  getSubscriberBucket(projectId).add(res);

  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, HEARTBEAT_MS);

  heartbeats.set(res, heartbeat);

  res.on('close', () => {
    unregisterSubscriber(projectId, res);
  });
}

export function broadcastDistributionEvent(event: DistributionTaskEvent) {
  const bucket = subscribers.get(event.projectId);
  if (!bucket || bucket.size === 0) {
    return;
  }

  console.log(
    `[Distribution-SSE] event=${event.type} projectId=${event.projectId} taskId=${event.taskId} status=${event.status}`
  );

  for (const res of bucket) {
    writeSSE(res, event, event.type);
  }
}

export function resetDistributionEventSubscribers() {
  for (const [projectId, bucket] of subscribers.entries()) {
    for (const res of bucket) {
      unregisterSubscriber(projectId, res);
    }
  }
}
