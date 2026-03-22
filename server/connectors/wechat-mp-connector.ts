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

function stripMarkdown(content: string) {
  return content
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .trim();
}

function buildSummary(task: DistributionTask) {
  if (task.assets.summary?.trim()) {
    return task.assets.summary.trim();
  }

  const plainText = stripMarkdown(task.assets.textDraft).replace(/\s+/g, ' ').trim();
  return plainText.slice(0, 120);
}

function buildWechatDraft(task: DistributionTask) {
  const override = task.assets.platformOverrides?.wechat_mp;
  const title = override?.title || task.assets.title;
  const tags = override?.tags?.length ? override.tags : task.assets.tags;
  const markdown = task.assets.textDraft.trim();

  if (!markdown) {
    throw new Error('Missing article body for wechat_mp draft');
  }

  return {
    taskId: task.taskId,
    platform: 'wechat_mp',
    mode: 'draft',
    title,
    summary: buildSummary(task),
    markdown,
    tags,
    mediaUrl: task.assets.mediaUrl,
    sourceFiles: task.assets.sourceFiles || [],
    generatedAt: new Date().toISOString(),
  };
}

export async function publishToWechatMp(task: DistributionTask): Promise<DistributionPlatformResult> {
  requirePlatformAuth('wechat_mp', ['draft_ready', 'connected']);

  const outboundDir = path.join(getDistributionDir(task.projectId), 'outbound', 'wechat_mp');
  ensureDir(outboundDir);

  const draftPayload = buildWechatDraft(task);
  const artifactBase = path.join(outboundDir, `wechat-mp-${task.taskId}`);
  const jsonPath = `${artifactBase}.json`;
  const markdownPath = `${artifactBase}.md`;

  fs.writeFileSync(jsonPath, JSON.stringify(draftPayload, null, 2));
  fs.writeFileSync(markdownPath, draftPayload.markdown);

  return {
    platform: 'wechat_mp',
    status: 'success',
    deliveryMode: 'draft_ready',
    remoteId: `wechat_mp_draft_${task.taskId}`,
    artifactPath: jsonPath,
    publishedAt: new Date().toISOString(),
    message: '微信公众号 draft package generated.',
  };
}
