import type { DistributionTask } from './distribution-types';

export function createDistributionTask(input: {
  projectId: string;
  platforms: string[];
  assets: DistributionTask['assets'];
  scheduleTime?: string;
  timezone?: string;
}): DistributionTask {
  const taskId = `dist_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  let systemDelayMs: number | undefined;
  let scheduledAt: string | undefined;
  let status: DistributionTask['status'] = 'pending';

  if (input.scheduleTime) {
    systemDelayMs = Math.floor(Math.random() * (10 - 3) + 3) * 60 * 1000;
    scheduledAt = new Date(input.scheduleTime).toISOString();
    status = 'scheduled';
  }

  return {
    taskId,
    projectId: input.projectId,
    platforms: input.platforms,
    assets: input.assets,
    scheduleTime: input.scheduleTime,
    timezone: input.timezone || 'Asia/Shanghai',
    systemDelayMs,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scheduledAt,
  };
}

export function summarizeQueue(queue: DistributionTask[]) {
  const today = new Date().toISOString().split('T')[0];
  return {
    todayCount: queue.filter((task) => task.createdAt.startsWith(today)).length,
    upcomingCount: queue.filter((task) => task.status === 'scheduled').length,
  };
}

export function deleteDistributionTask(queue: DistributionTask[], taskId: string) {
  const taskIndex = queue.findIndex((task) => task.taskId === taskId);
  if (taskIndex === -1) {
    throw new Error('Task not found');
  }

  if (queue[taskIndex].status === 'running') {
    throw new Error('Cannot cancel running task');
  }

  queue.splice(taskIndex, 1);
  return queue;
}

export function retryDistributionTask(queue: DistributionTask[], taskId: string) {
  const task = queue.find((item) => item.taskId === taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  if (task.status !== 'failed') {
    throw new Error('Only failed tasks can be retried');
  }

  task.status = 'pending';
  task.error = undefined;
  task.results = undefined;
  task.createdAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  task.completedAt = undefined;

  return task;
}
