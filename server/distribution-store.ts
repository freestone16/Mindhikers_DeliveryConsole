import fs from 'fs';
import path from 'path';
import { getProjectRoot, getProjectsBase, resolveProjectPath } from './project-paths';
import type {
  DistributionComposerSourceFile,
  DistributionComposerSources,
  DistributionHistoryEntry,
  DistributionTask,
  DistributionTextAsset,
  DistributionVideoAsset,
} from './distribution-types';
import { normalizeDistributionTask } from './distribution-types';

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

function listFilesRecursive(dirPath: string, maxDepth: number, depth = 0): string[] {
  if (!fs.existsSync(dirPath) || depth > maxDepth) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath, maxDepth, depth + 1));
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

function relativeProjectPath(projectRoot: string, filePath: string) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

function readTextFileIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function sliceSection(content: string, pattern: RegExp) {
  const match = content.match(pattern);
  return match?.[1]?.trim() || '';
}

function extractFirstNonEmptyLine(content: string) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function cleanCandidateLine(line: string) {
  return line
    .replace(/^\*+\s*/, '')
    .replace(/^[-•]\s*/, '')
    .replace(/^\d+[\.\)]\s*/, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/\*\*/g, '')
    .trim();
}

function extractTitleFromStructuredText(content: string) {
  const titleSection =
    sliceSection(content, /\[1\.\s*视频标题[^\]]*]\s*([\s\S]*?)(?=\n\s*\[[^\]]+]|$)/i) ||
    sliceSection(content, /###\s*1\.\s*爆款标题[^\n]*\n([\s\S]*?)(?=\n---|\n###\s*\d+\.|\n##\s|$)/i);

  if (titleSection) {
    const candidate = titleSection
      .split('\n')
      .map((line) => cleanCandidateLine(line))
      .find((line) => line.length > 0 && !line.startsWith('选项'));

    if (candidate) {
      return candidate;
    }
  }

  const firstHeading = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^#/.test(line));

  return firstHeading ? cleanCandidateLine(firstHeading.replace(/^#+\s*/, '')) : '';
}

function extractBodyFromStructuredText(content: string) {
  const bodySection =
    sliceSection(content, /\[2\.\s*视频描述[^\]]*]\s*([\s\S]*?)(?=\n\s*\[[^\]]+]|$)/i) ||
    sliceSection(content, /###\s*2\.\s*视频描述[^\n]*\n([\s\S]*?)(?=\n---|\n###\s*\d+\.|\n##\s|$)/i);

  if (bodySection) {
    return bodySection.trim();
  }

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .slice(0, 8)
    .join('\n\n');
}

function extractTagsFromStructuredText(content: string) {
  const tagSection =
    sliceSection(content, /\[4\.\s*标签[^\]]*]\s*([\s\S]*?)(?=\n\s*\[[^\]]+]|$)/i) ||
    sliceSection(content, /###\s*4\.\s*标签[^\n]*\n([\s\S]*?)(?=\n---|\n###\s*\d+\.|\n##\s|$)/i) ||
    sliceSection(content, /###\s*5\.\s*Hashtags[^\n]*\n([\s\S]*?)(?=\n---|\n###\s*\d+\.|\n##\s|$)/i);

  if (!tagSection) {
    return [];
  }

  return tagSection
    .replace(/\n/g, ',')
    .split(/[,#，]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 12);
}

function extractTagsFromScriptContent(content: string) {
  const appendix = sliceSection(content, /##\s*附录[^\n]*[\s\S]*?(?=\n---|$)/i);
  if (appendix) {
    return appendix
      .split('\n')
      .map((line) => cleanCandidateLine(line))
      .filter((line) => line.length > 0)
      .slice(0, 5)
      .map((line) => line.replace(/^"|"$/g, ''));
  }

  return [];
}

function buildScriptFallback(content: string) {
  const titleLine = extractFirstNonEmptyLine(
    content
      .split('\n')
      .filter((line) => line.trim().startsWith('#'))
      .map((line) => line.replace(/^#+\s*/, ''))
      .join('\n')
  );
  const body = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('>'))
    .slice(0, 6)
    .join('\n\n');

  return {
    title: titleLine || '',
    body,
    tags: extractTagsFromScriptContent(content),
  };
}

function sortMarketingCandidates(filePaths: string[]) {
  return [...filePaths].sort((left, right) => {
    const leftName = path.basename(left).toLowerCase();
    const rightName = path.basename(right).toLowerCase();

    const score = (name: string) => {
      if (name.includes('submission')) return 100;
      if (name.includes('marketing_plan')) return 90;
      if (name.includes('youtube')) return 80;
      if (name.endsWith('.txt')) return 70;
      if (name.includes('seo_geo')) return 60;
      if (name.endsWith('.md')) return 50;
      if (name.endsWith('.json')) return 40;
      return 0;
    };

    const scoreDiff = score(rightName) - score(leftName);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs;
  });
}

function sortScriptCandidates(filePaths: string[]) {
  return [...filePaths].sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
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
  const migratedTasks = legacyQueue
    .filter((task) => task.projectId === projectId)
    .map((task) => normalizeDistributionTask(task));
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

  return readJsonFile<DistributionTask[]>(queueFile, []).map((task) => normalizeDistributionTask(task));
}

export function saveDistributionQueue(projectId: string, queue: DistributionTask[]) {
  const queueFile = getDistributionQueueFile(projectId);
  fs.writeFileSync(queueFile, JSON.stringify(queue.map((task) => normalizeDistributionTask(task)), null, 2));
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
    const files = fs
      .readdirSync(marketingDir)
      .filter((file) => file.endsWith('.md') || file.endsWith('.json') || file.endsWith('.txt'));
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

export function getDistributionComposerSources(
  projectId: string,
  options?: {
    selectedVideoPath?: string;
  }
): DistributionComposerSources {
  const projectRoot = getProjectRoot(projectId);
  const marketingDir = path.join(projectRoot, '05_Marketing');
  const scriptDir = path.join(projectRoot, '02_Script');
  const sourceFiles: DistributionComposerSourceFile[] = [];
  const warnings: string[] = [];

  const marketingCandidates = sortMarketingCandidates(
    listFilesRecursive(marketingDir, 1).filter((filePath) => {
      const normalized = path.basename(filePath).toLowerCase();
      return (
        (normalized.endsWith('.md') || normalized.endsWith('.txt') || normalized.endsWith('.json')) &&
        !normalized.includes('state') &&
        !normalized.includes(' bk') &&
        !normalized.includes('backup')
      );
    })
  );

  for (const candidate of marketingCandidates) {
    if (candidate.endsWith('.json')) {
      continue;
    }

    const content = readTextFileIfExists(candidate);
    const title = extractTitleFromStructuredText(content);
    const body = extractBodyFromStructuredText(content);
    const tags = extractTagsFromStructuredText(content);

    if (title || body || tags.length > 0) {
      sourceFiles.push({
        name: path.basename(candidate),
        path: relativeProjectPath(projectRoot, candidate),
        category: 'marketing',
      });

      if (options?.selectedVideoPath) {
        sourceFiles.push({
          name: path.basename(options.selectedVideoPath),
          path: options.selectedVideoPath,
          category: 'video',
        });
      }

      return {
        suggestedTitle: title,
        suggestedBody: body,
        suggestedTags: tags,
        sourceFiles,
        warnings,
      };
    }
  }

  if (marketingCandidates.length > 0) {
    warnings.push('Marketing 产物存在，但未能提取出可用标题/正文，已回退到 Script。');
  } else {
    warnings.push('未找到 Marketing 产物，已回退到 Script。');
  }

  const scriptCandidates = sortScriptCandidates(
    listFilesRecursive(scriptDir, 1).filter((filePath) => {
      const normalized = path.basename(filePath).toLowerCase();
      return normalized.endsWith('.md') && !filePath.includes(`${path.sep}old${path.sep}`) && !normalized.includes('twitter_thread');
    })
  );

  if (scriptCandidates.length > 0) {
    const selectedScript = scriptCandidates[0];
    const content = readTextFileIfExists(selectedScript);
    const fallback = buildScriptFallback(content);

    sourceFiles.push({
      name: path.basename(selectedScript),
      path: relativeProjectPath(projectRoot, selectedScript),
      category: 'script',
    });

    if (options?.selectedVideoPath) {
      sourceFiles.push({
        name: path.basename(options.selectedVideoPath),
        path: options.selectedVideoPath,
        category: 'video',
      });
    }

    if (fallback.tags.length === 0) {
      warnings.push('Script 未提供明确标签，建议手动补充 tags。');
    }

    return {
      suggestedTitle: fallback.title || path.basename(options?.selectedVideoPath || '', path.extname(options?.selectedVideoPath || '')),
      suggestedBody: fallback.body,
      suggestedTags: fallback.tags,
      sourceFiles,
      warnings,
    };
  }

  warnings.push('项目内未找到可用于装填的 Marketing / Script 文案源。');

  if (options?.selectedVideoPath) {
    sourceFiles.push({
      name: path.basename(options.selectedVideoPath),
      path: options.selectedVideoPath,
      category: 'video',
    });
  }

  return {
    suggestedTitle: path.basename(options?.selectedVideoPath || '', path.extname(options?.selectedVideoPath || '')),
    suggestedBody: '',
    suggestedTags: [],
    sourceFiles,
    warnings,
  };
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
