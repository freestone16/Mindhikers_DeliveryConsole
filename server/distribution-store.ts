import fs from 'fs';
import path from 'path';
import { getProjectRoot, getProjectsBase, resolveProjectPath } from './project-paths';
import type {
  DistributionHistoryEntry,
  DistributionTask,
  DistributionTextAsset,
  DistributionVideoAsset,
} from './distribution-types';

const DISTRIBUTION_DIR = '06_Distribution';
const DISTRIBUTION_QUEUE_FILE = 'distribution_queue.json';
const DISTRIBUTION_HISTORY_FILE = 'distribution_history.json';
const PUBLISH_PACKAGES_DIR = 'publish_packages';
const LEGACY_QUEUE_FILE = '_distribution_queue.json';

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function getLegacyQueueFile() {
  return path.join(getProjectsBase(), LEGACY_QUEUE_FILE);
}

export function getDistributionDir(projectId: string) {
  const distributionDir = resolveProjectPath(projectId, DISTRIBUTION_DIR);
  ensureDir(distributionDir);
  return distributionDir;
}

export function getDistributionQueueFile(projectId: string) {
  return path.join(getDistributionDir(projectId), DISTRIBUTION_QUEUE_FILE);
}

export function getDistributionHistoryFile(projectId: string) {
  return path.join(getDistributionDir(projectId), DISTRIBUTION_HISTORY_FILE);
}

function migrateLegacyQueueIfNeeded(projectId: string, queueFile: string): DistributionTask[] {
  const legacyQueueFile = getLegacyQueueFile();
  if (!fs.existsSync(legacyQueueFile)) {
    return [];
  }

  const legacyQueue = readJsonFile<DistributionTask[]>(legacyQueueFile, []);
  const migratedTasks = legacyQueue.filter((task) => task.projectId === projectId);
  if (migratedTasks.length > 0) {
    fs.writeFileSync(queueFile, JSON.stringify(migratedTasks, null, 2));
  }
  return migratedTasks;
}

export function loadDistributionQueue(projectId: string): DistributionTask[] {
  const queueFile = getDistributionQueueFile(projectId);
  if (!fs.existsSync(queueFile)) {
    const migratedTasks = migrateLegacyQueueIfNeeded(projectId, queueFile);
    if (migratedTasks.length > 0) {
      return migratedTasks;
    }

    fs.writeFileSync(queueFile, JSON.stringify([], null, 2));
    return [];
  }

  return readJsonFile<DistributionTask[]>(queueFile, []);
}

export function saveDistributionQueue(projectId: string, queue: DistributionTask[]) {
  const queueFile = getDistributionQueueFile(projectId);
  fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2));
}

export function ensureDistributionHistory(projectId: string) {
  const historyFile = getDistributionHistoryFile(projectId);
  if (!fs.existsSync(historyFile)) {
    fs.writeFileSync(historyFile, JSON.stringify([], null, 2));
  }
  return historyFile;
}

export function listDistributionAssets(projectId: string): {
  videos: DistributionVideoAsset[];
  marketingFiles: DistributionTextAsset[];
} {
  const projectRoot = getProjectRoot(projectId);
  const shortsDir = path.join(projectRoot, '05_Shorts_Output');
  const marketingDir = path.join(projectRoot, '05_Marketing');
  const scriptDir = path.join(projectRoot, '02_Script');

  const videos: DistributionVideoAsset[] = [];
  const marketingFiles: DistributionTextAsset[] = [];

  if (fs.existsSync(shortsDir)) {
    const files = fs.readdirSync(shortsDir).filter((file) => file.endsWith('.mp4'));
    files.forEach((file) => {
      const isVertical = file.includes('_9-16') || file.includes('_916');
      videos.push({
        name: file,
        path: `05_Shorts_Output/${file}`,
        type: isVertical ? '9:16' : '16:9',
      });
    });
  }

  if (fs.existsSync(marketingDir)) {
    const files = fs.readdirSync(marketingDir).filter((file) => file.endsWith('.md') || file.endsWith('.json'));
    files.forEach((file) => {
      marketingFiles.push({
        name: file,
        path: `05_Marketing/${file}`,
      });
    });
  }

  if (fs.existsSync(scriptDir)) {
    const files = fs.readdirSync(scriptDir).filter((file) => file.endsWith('.md'));
    files.forEach((file) => {
      marketingFiles.push({
        name: file,
        path: `02_Script/${file}`,
      });
    });
  }

  ensureDistributionHistory(projectId);

  return { videos, marketingFiles };
}

export function loadDistributionHistory(projectId: string): DistributionHistoryEntry[] {
  const historyFile = ensureDistributionHistory(projectId);
  return readJsonFile<DistributionHistoryEntry[]>(historyFile, []);
}

export function appendDistributionHistory(projectId: string, entries: DistributionHistoryEntry[]) {
  const historyFile = ensureDistributionHistory(projectId);
  const history = readJsonFile<DistributionHistoryEntry[]>(historyFile, []);
  history.unshift(...entries);
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

export function savePublishPackageSnapshot(projectId: string, task: DistributionTask) {
  const packageDir = path.join(getDistributionDir(projectId), PUBLISH_PACKAGES_DIR);
  ensureDir(packageDir);

  const snapshotPath = path.join(packageDir, `pkg-${task.taskId}.json`);
  fs.writeFileSync(
    snapshotPath,
    JSON.stringify(
      {
        packageId: `pkg-${task.taskId}`,
        projectId,
        task,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  return snapshotPath;
}
