import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publishToWechatMp } from '../../../server/connectors/wechat-mp-connector';
import type { DistributionTask } from '../../../server/distribution-types';

vi.mock('../../../server/distribution-auth-service', () => ({
  requirePlatformAuth: vi.fn(),
}));

const { requirePlatformAuth } = await import('../../../server/distribution-auth-service');

const originalProjectsBase = process.env.PROJECTS_BASE;

function createTask(overrides: Partial<DistributionTask> = {}): DistributionTask {
  return {
    taskId: 'dist_wechat_test',
    projectId: 'alpha',
    platforms: ['wechat_mp'],
    assets: {
      mediaUrl: '05_Shorts_Output/demo.mp4',
      textDraft: '# 文章标题\n\n第一段正文。\n\n第二段正文。',
      title: '公众号标题',
      tags: ['AI'],
    },
    status: 'queued',
    createdAt: '2026-03-22T00:00:00.000Z',
    ...overrides,
  };
}

describe('wechat-mp-connector', () => {
  beforeEach(() => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-wechat-connector-'));
    process.env.PROJECTS_BASE = tempRoot;
    fs.mkdirSync(path.join(tempRoot, 'alpha'), { recursive: true });
    vi.mocked(requirePlatformAuth).mockReturnValue({
      platform: 'wechat_mp',
      status: 'draft_ready',
      authType: 'appkey',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (originalProjectsBase === undefined) {
      delete process.env.PROJECTS_BASE;
    } else {
      process.env.PROJECTS_BASE = originalProjectsBase;
    }
  });

  it('creates draft-ready outbound artifacts', async () => {
    const result = await publishToWechatMp(createTask());

    expect(result.status).toBe('success');
    expect(result.deliveryMode).toBe('draft_ready');
    expect(result.artifactPath).toBeTruthy();
    expect(result.message).toContain('draft package generated');

    const payload = JSON.parse(fs.readFileSync(result.artifactPath!, 'utf-8'));
    const markdownPath = result.artifactPath!.replace(/\.json$/, '.md');
    expect(payload.mode).toBe('draft');
    expect(payload.summary).toContain('文章标题');
    expect(fs.existsSync(markdownPath)).toBe(true);
  });

  it('fails when article body is missing', async () => {
    const task = createTask({
      assets: {
        mediaUrl: '05_Shorts_Output/demo.mp4',
        textDraft: '   ',
        title: '公众号标题',
        tags: ['AI'],
      },
    });

    await expect(publishToWechatMp(task)).rejects.toThrow('Missing article body for wechat_mp draft');
  });
});
