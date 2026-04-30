import type { DistributionTask } from './distribution-types';

export function createDistributionTask(input: {
  projectId: string;
  platforms: string[];
  assets: DistributionTask['assets'];
  scheduleTime?: string;
  timezone?: string;
  riskDelayEnabled?: boolean;
}): DistributionTask {
  const taskId = `dist_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const riskDelayEnabled = input.riskDelayEnabled !== false;

  // A4: 即时发布也支持风控延时（2-8 分钟随机），可关
  const systemDelayMs = riskDelayEnabled
    ? Math.floor(Math.random() * (480 - 120) + 120) * 1000
    : 0;

  const now = Date.now();
  const scheduleTimeMs = input.scheduleTime
    ? new Date(input.scheduleTime).getTime()
    : now;

  const effectiveStartAtMs = scheduleTimeMs + systemDelayMs;
  const effectiveStartAt = new Date(effectiveStartAtMs).toISOString();

  const status: DistributionTask['status'] =
    effectiveStartAtMs > now ? 'scheduled' : 'queued';

  return {
    taskId,
    projectId: input.projectId,
    platforms: input.platforms,
    assets: input.assets,
    scheduleTime: input.scheduleTime,
    timezone: input.timezone || 'Asia/Shanghai',
    systemDelayMs,
    riskDelayEnabled,
    effectiveStartAt,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scheduledAt: input.scheduleTime
      ? new Date(input.scheduleTime).toISOString()
      : undefined,
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

  if (queue[taskIndex].status === 'processing') {
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

  if (task.status !== 'retryable' && task.status !== 'failed') {
    throw new Error('Only failed tasks can be retried');
  }

  task.status = 'queued';
  task.error = undefined;
  task.results = undefined;
  task.createdAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  task.completedAt = undefined;
  task.latestEvent = undefined;

  return task;
}
