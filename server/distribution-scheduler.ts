import fs from 'fs';
import {
  executeDistributionTask,
  markDistributionTaskRunning,
  recordDistributionTaskEvent,
  setAutoRetryScheduler,
} from './distribution-execution-service';
import { broadcastDistributionEvent } from './distribution-events';
import { loadDistributionQueue, saveDistributionQueue } from './distribution-store';
import { getProjectsBase } from './project-paths';
import type { DistributionTask } from './distribution-types';

let intervalId: ReturnType<typeof setInterval> | null = null;
let isScanning = false;
const retryTimeouts = new Set<ReturnType<typeof setTimeout>>();

function getAllProjectIds(): string[] {
  const base = getProjectsBase();
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('CSET-'))
    .map((d) => d.name);
}

async function executeTaskInQueue(task: DistributionTask, queue: DistributionTask[]) {
  const liveTask = queue.find((t) => t.taskId === task.taskId);
  if (!liveTask) return;
  if (
    liveTask.status !== 'scheduled' &&
    liveTask.status !== 'queued' &&
    liveTask.status !== 'retryable'
  )
    return;

  try {
    markDistributionTaskRunning(liveTask);
    broadcastDistributionEvent(
      recordDistributionTaskEvent(liveTask, {
        type: 'job_started',
        status: 'processing',
        message: '定时任务到点，开始自动执行',
      })
    );

    await executeDistributionTask(liveTask, {
      onEvent: (event) => broadcastDistributionEvent(event),
    });
  } catch (err) {
    console.error(`[Scheduler] Task ${task.taskId} execution error:`, err);
  }
}

export async function triggerDueTasks(now: Date = new Date()) {
  if (isScanning) {
    console.log('[Scheduler] Scan already in progress, skipping');
    return;
  }
  isScanning = true;

  try {
    const projectIds = getAllProjectIds();

    for (const projectId of projectIds) {
      try {
        const queue = loadDistributionQueue(projectId);
        const dueTasks = queue.filter(
          (t) =>
            t.status === 'scheduled' &&
            t.effectiveStartAt &&
            new Date(t.effectiveStartAt) <= now
        );

        if (dueTasks.length === 0) continue;

        for (const task of dueTasks) {
          await executeTaskInQueue(task, queue);
        }

        saveDistributionQueue(projectId, queue);
      } catch (err) {
        console.error(`[Scheduler] Error scanning project ${projectId}:`, err);
      }
    }
  } finally {
    isScanning = false;
  }
}

export function initScheduler() {
  setAutoRetryScheduler((task, delayMs) => {
    const timeout = setTimeout(() => {
      retryTimeouts.delete(timeout);
      const queue = loadDistributionQueue(task.projectId);
      const liveTask = queue.find((t) => t.taskId === task.taskId);
      if (!liveTask) return;

      executeTaskInQueue(liveTask, queue)
        .then(() => saveDistributionQueue(task.projectId, queue))
        .catch((err) => {
          console.error(`[Scheduler] Auto-retry failed for task ${task.taskId}:`, err);
        });
    }, delayMs);
    retryTimeouts.add(timeout);
  });

  triggerDueTasks(new Date()).catch((err) => {
    console.error('[Scheduler] Initial trigger failed:', err);
  });

  intervalId = setInterval(() => {
    triggerDueTasks(new Date()).catch((err) => {
      console.error('[Scheduler] Interval trigger failed:', err);
    });
  }, 30_000);

  console.log('[Scheduler] Distribution scheduler initialized (interval: 30s)');
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  for (const timeout of retryTimeouts) {
    clearTimeout(timeout);
  }
  retryTimeouts.clear();
  setAutoRetryScheduler(null);
  console.log('[Scheduler] Distribution scheduler stopped');
}
