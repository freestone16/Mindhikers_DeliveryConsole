import fs from 'fs';
import path from 'path';
import { requirePlatformAuth } from '../distribution-auth-service';
import { getDistributionDir } from '../distribution-store';
import type { DistributionPlatformResult, DistributionTask } from '../distribution-types';

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function limitText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildXPayload(task: DistributionTask) {
  const override = task.assets.platformOverrides?.twitter;
  const title = override?.title || task.assets.title;
  const tags = override?.tags?.length ? override.tags : task.assets.tags;
  const body = task.assets.textDraft.trim();
  const parts = [title.trim(), body]
    .filter(Boolean)
    .join('\n\n')
    .trim();
  const hashtags = tags.map((tag) => `#${tag.replace(/^#/, '').replace(/\s+/g, '')}`).join(' ');
  const postText = limitText(
    [parts, hashtags].filter(Boolean).join(parts && hashtags ? '\n\n' : '').trim(),
    280
  );

  return {
    taskId: task.taskId,
    platform: 'twitter',
    mode: 'phase1_text',
    title,
    body,
    tags,
    postText,
    sourceFiles: task.assets.sourceFiles || [],
    generatedAt: new Date().toISOString(),
  };
}

export async function publishToX(task: DistributionTask): Promise<DistributionPlatformResult> {
  requirePlatformAuth('twitter', ['connected']);

  const outboundDir = path.join(getDistributionDir(task.projectId), 'outbound', 'x');
  ensureDir(outboundDir);

  const payload = buildXPayload(task);
  const artifactPath = path.join(outboundDir, `x-${task.taskId}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(payload, null, 2));

  return {
    platform: 'twitter',
    status: 'success',
    deliveryMode: 'artifact_ready',
    remoteId: `x_artifact_${task.taskId}`,
    artifactPath,
    publishedAt: new Date().toISOString(),
    message: 'X phase1 payload prepared for outbound adapter.',
  };
}
