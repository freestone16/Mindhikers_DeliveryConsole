import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publishToX } from '../../../server/connectors/x-connector';
import type { DistributionTask } from '../../../server/distribution-types';

vi.mock('../../../server/distribution-auth-service', () => ({
  requirePlatformAuth: vi.fn(),
}));

const { requirePlatformAuth } = await import('../../../server/distribution-auth-service');

const originalProjectsBase = process.env.PROJECTS_BASE;

function createTask(overrides: Partial<DistributionTask> = {}): DistributionTask {
  return {
    taskId: 'dist_x_test',
    projectId: 'alpha',
    platforms: ['twitter'],
    assets: {
      mediaUrl: '05_Shorts_Output/demo.mp4',
      textDraft: '这里是一段较长的正文，用于验证 X connector 的 payload 组装。',
      title: 'X 标题',
      tags: ['AI', 'MindHikers'],
    },
    status: 'queued',
    createdAt: '2026-03-22T00:00:00.000Z',
    ...overrides,
  };
}

describe('x-connector', () => {
  beforeEach(() => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-x-connector-'));
    process.env.PROJECTS_BASE = tempRoot;
    fs.mkdirSync(path.join(tempRoot, 'alpha'), { recursive: true });
    vi.mocked(requirePlatformAuth).mockReturnValue({
      platform: 'twitter',
      status: 'connected',
      authType: 'oauth',
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

  it('fails clearly when auth is not ready', async () => {
    vi.mocked(requirePlatformAuth).mockImplementation(() => {
      throw new Error('Platform auth not ready for twitter: expired');
    });

    await expect(publishToX(createTask())).rejects.toThrow('Platform auth not ready for twitter: expired');
  });

  it('writes outbound payload with platform overrides', async () => {
    const task = createTask({
      assets: {
        mediaUrl: '05_Shorts_Output/demo.mp4',
        textDraft: 'X 正文',
        title: '全局标题',
        tags: ['AI', 'MindHikers'],
        platformOverrides: {
          twitter: {
            title: 'X 定制标题',
            tags: ['override', 'x'],
          },
        },
      },
    });

    const result = await publishToX(task);

    expect(result.status).toBe('success');
    expect(result.deliveryMode).toBe('artifact_ready');
    expect(result.artifactPath).toBeTruthy();
    expect(result.message).toContain('X phase1 payload prepared');

    const payload = JSON.parse(fs.readFileSync(result.artifactPath!, 'utf-8'));
    expect(payload.title).toBe('X 定制标题');
    expect(payload.tags).toEqual(['override', 'x']);
    expect(payload.postText).toContain('X 定制标题');
  });
});
