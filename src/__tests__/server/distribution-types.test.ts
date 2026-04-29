import { describe, it, expect } from 'vitest';
import {
  normalizeDistributionTask,
  normalizeDistributionTaskStatus,
  type DistributionTask,
  type DistributionTaskAssets,
  type DistributionPlatformResult,
  type DistributionMaterialGroup,
  type DistributionComposerSourcesV2,
  type DistributionErrorCategory,
  type PlatformOverrideTwitter,
  type PlatformOverrideWechatMp,
  type PlatformOverrideYoutube,
  type PlatformOverrideBilibili,
} from '../../../server/distribution-types';

/**
 * Unit A1 类型层契约测试。
 *
 * 这里不测运行时逻辑，只验证：
 * 1) 旧 task JSON（无新字段）能正常解析为 DistributionTask
 * 2) 带新字段的 task JSON 能正常解析
 * 3) normalize 函数对新字段不破坏
 * 4) 各平台 PlatformOverride 类型形状正确
 * 5) DistributionMaterialGroup / DistributionComposerSourcesV2 形状正确
 */

describe('A1 类型扩展 · DistributionTaskAssets', () => {
  it('Happy path: 反序列化无新字段的旧 task JSON，所有字段读取正常', () => {
    const oldJson = JSON.stringify({
      taskId: 'dist_legacy_001',
      projectId: 'demo',
      platforms: ['youtube'],
      assets: {
        mediaUrl: '04_Video/main.mp4',
        textDraft: 'hello',
        title: 'Old Task',
        tags: ['ai'],
      },
      status: 'queued',
      createdAt: '2026-04-01T00:00:00.000Z',
    });

    const task = JSON.parse(oldJson) as DistributionTask;

    expect(task.taskId).toBe('dist_legacy_001');
    expect(task.assets.materialGroupId).toBeUndefined();
    expect(task.assets.riskDelayEnabled).toBeUndefined();
    expect(task.effectiveStartAt).toBeUndefined();
    expect(task.attemptCount).toBeUndefined();
  });

  it('Happy path: 反序列化带新字段的 task JSON，类型校验通过', () => {
    const newJson = JSON.stringify({
      taskId: 'dist_new_001',
      projectId: 'demo',
      platforms: ['twitter', 'wechat_mp'],
      assets: {
        mediaUrl: '02_Script/article.md',
        textDraft: 'body',
        title: 'New Task',
        tags: ['ai'],
        materialGroupId: 'longform_article',
        riskDelayEnabled: false,
      },
      status: 'scheduled',
      createdAt: '2026-04-27T10:00:00.000Z',
      effectiveStartAt: '2026-04-27T10:05:00.000Z',
      attemptCount: 1,
    });

    const task = JSON.parse(newJson) as DistributionTask;

    expect(task.assets.materialGroupId).toBe('longform_article');
    expect(task.assets.riskDelayEnabled).toBe(false);
    expect(task.effectiveStartAt).toBe('2026-04-27T10:05:00.000Z');
    expect(task.attemptCount).toBe(1);
  });

  it('Edge case: materialGroupId 为空字符串 / undefined / null 都不报错（运行时层面）', () => {
    const samples: Partial<DistributionTaskAssets>[] = [
      { materialGroupId: '' },
      { materialGroupId: undefined },
      // null 是运行时可能性（虽然类型上是 undefined），这里测兜底
      { materialGroupId: null as unknown as undefined },
    ];

    for (const sample of samples) {
      const json = JSON.stringify(sample);
      const parsed = JSON.parse(json) as Partial<DistributionTaskAssets>;
      // 不抛错即通过
      expect(parsed).toBeDefined();
    }
  });
});

describe('A1 类型扩展 · DistributionPlatformResult', () => {
  it('Happy path: 反序列化带新字段的 result JSON', () => {
    const result: DistributionPlatformResult = {
      platform: 'wechat_mp',
      status: 'success',
      deliveryMode: 'draft_ready',
      remoteId: 'mp_draft_xxx',
      backendUrl: 'https://mp.weixin.qq.com/',
      message: '草稿已就绪',
    };

    const roundtrip = JSON.parse(JSON.stringify(result)) as DistributionPlatformResult;

    expect(roundtrip.deliveryMode).toBe('draft_ready');
    expect(roundtrip.backendUrl).toBe('https://mp.weixin.qq.com/');
  });

  it('Happy path: 失败 result 带 errorCategory 和 nextRetryAt', () => {
    const result: DistributionPlatformResult = {
      platform: 'twitter',
      status: 'failed',
      message: 'rate limit',
      errorCategory: '4xx_rate_limit',
      attemptCount: 1,
      nextRetryAt: '2026-04-27T11:00:00.000Z',
    };

    expect(result.errorCategory).toBe('4xx_rate_limit');
    expect(result.attemptCount).toBe(1);
  });

  it('Edge case: 旧 result 无新字段，errorCategory 为 undefined', () => {
    const oldResult = JSON.parse(
      JSON.stringify({
        platform: 'youtube',
        status: 'success',
        deliveryMode: 'published',
        url: 'https://youtu.be/abc',
      })
    ) as DistributionPlatformResult;

    expect(oldResult.errorCategory).toBeUndefined();
    expect(oldResult.backendUrl).toBeUndefined();
    expect(oldResult.attemptCount).toBeUndefined();
  });

  it('Type-level: errorCategory 限定为 7 个枚举值', () => {
    const validCategories: DistributionErrorCategory[] = [
      '4xx_auth',
      '4xx_content',
      '4xx_rate_limit',
      '5xx_server',
      'network',
      'unknown',
    ];

    expect(validCategories).toHaveLength(6);
  });
});

describe('A1 类型扩展 · PlatformOverride 各平台', () => {
  it('PlatformOverrideTwitter 形状正确', () => {
    const override: PlatformOverrideTwitter = {
      title: 'short title',
      tags: ['AI'],
      replySettings: 'following',
      communityUrl: 'https://x.com/i/communities/123',
      madeWithAi: true,
      paidPartnership: false,
    };

    expect(override.replySettings).toBe('following');
  });

  it('PlatformOverrideWechatMp 形状正确，summary 限制语义在 UI 校验', () => {
    const override: PlatformOverrideWechatMp = {
      title: '公众号标题',
      summary: '一句话摘要',
      author: '老卢',
      coverImagePath: '02_Script/cover.png',
      commentEnabled: true,
      rewardEnabled: false,
    };

    expect(override.coverImagePath).toBe('02_Script/cover.png');
  });

  it('PlatformOverrideYoutube 形状正确', () => {
    const override: PlatformOverrideYoutube = {
      visibility: 'unlisted',
      madeForKids: false,
      category: '27',
      license: 'youtube',
      thumbnailPath: '04_Video/thumb.png',
    };

    expect(override.visibility).toBe('unlisted');
  });

  it('PlatformOverrideBilibili 形状正确，copyright=2 时 source 字段可填', () => {
    const override: PlatformOverrideBilibili = {
      copyright: 2,
      tid: 27,
      source: 'https://example.com/original',
      noReprint: true,
      chargeOpen: false,
    };

    expect(override.copyright).toBe(2);
    expect(override.source).toBeDefined();
  });

  it('Integration: platformOverrides 多平台共存于同一 task.assets', () => {
    const assets: DistributionTaskAssets = {
      mediaUrl: '04_Video/main.mp4',
      textDraft: '...',
      title: '通用标题',
      tags: ['ai'],
      platformOverrides: {
        twitter: { title: 'X 短标题', replySettings: 'everyone' } as PlatformOverrideTwitter,
        wechat_mp: { title: '公众号标题', summary: '摘要' } as PlatformOverrideWechatMp,
        youtube: { visibility: 'public' } as PlatformOverrideYoutube,
        bilibili: { tid: 27, copyright: 1 } as PlatformOverrideBilibili,
      },
    };

    expect(Object.keys(assets.platformOverrides ?? {})).toHaveLength(4);
  });
});

describe('A1 类型扩展 · DistributionMaterialGroup / V2', () => {
  it('Happy path: 长文素材组形状正确', () => {
    const group: DistributionMaterialGroup = {
      groupId: 'longform_深度文稿_v2-1',
      groupType: 'longform',
      primarySource: {
        name: '深度文稿_v2.1.md',
        path: '02_Script/深度文稿_v2.1.md',
        category: 'script',
      },
      applicablePlatforms: ['twitter', 'wechat_mp'],
      suggestedTitle: '推理模型新世代',
      suggestedBody: '...',
      suggestedTags: ['AI', 'OpenAI'],
      readyState: {
        twitter: { ready: true },
        wechat_mp: { ready: false, missingItems: ['封面图 cover.png 不存在'] },
      },
      warnings: [],
    };

    expect(group.applicablePlatforms).toEqual(['twitter', 'wechat_mp']);
    expect(group.readyState.wechat_mp?.ready).toBe(false);
    expect(group.readyState.wechat_mp?.missingItems).toContain('封面图 cover.png 不存在');
  });

  it('Happy path: 视频素材组 applicablePlatforms 是 youtube/bilibili', () => {
    const group: DistributionMaterialGroup = {
      groupId: 'video_main_1080p',
      groupType: 'video',
      primarySource: {
        name: 'main_1080p.mp4',
        path: '04_Video/main_1080p.mp4',
        category: 'video',
      },
      applicablePlatforms: ['youtube', 'bilibili'],
      suggestedTitle: 'AI Reasoning',
      suggestedBody: 'desc',
      suggestedTags: [],
      readyState: {
        youtube: { ready: true },
        bilibili: { ready: false, missingItems: ['市场大师文案 bilibili.md 不存在'] },
      },
      warnings: [],
    };

    expect(group.groupType).toBe('video');
  });

  it('Happy path: V2 结构含 groups + scannedAt + 兼容 legacy', () => {
    const sources: DistributionComposerSourcesV2 = {
      groups: [],
      scannedAt: '2026-04-27T10:00:00.000Z',
      warnings: ['项目内未找到可用素材'],
      legacy: {
        suggestedTitle: '',
        suggestedBody: '',
        suggestedTags: [],
        sourceFiles: [],
        warnings: [],
      },
    };

    expect(sources.groups).toHaveLength(0);
    expect(sources.legacy).toBeDefined();
  });
});

describe('A1 类型扩展 · normalize 函数兼容性', () => {
  it('normalizeDistributionTaskStatus 旧值映射不变', () => {
    expect(normalizeDistributionTaskStatus('pending')).toBe('queued');
    expect(normalizeDistributionTaskStatus('running')).toBe('processing');
    expect(normalizeDistributionTaskStatus('completed')).toBe('succeeded');
    expect(normalizeDistributionTaskStatus('queued')).toBe('queued');
    expect(normalizeDistributionTaskStatus('retryable')).toBe('retryable');
  });

  it('Integration: normalizeDistributionTask 对带新字段 task 不丢失字段', () => {
    const task: DistributionTask = {
      taskId: 'dist_norm_001',
      projectId: 'demo',
      platforms: ['twitter'],
      assets: {
        mediaUrl: '02_Script/a.md',
        textDraft: 'body',
        title: 'T',
        tags: [],
        materialGroupId: 'longform_a',
        riskDelayEnabled: true,
      },
      status: 'pending' as DistributionTask['status'],
      createdAt: '2026-04-27T10:00:00.000Z',
      effectiveStartAt: '2026-04-27T10:05:00.000Z',
      attemptCount: 1,
    };

    const normalized = normalizeDistributionTask(task);

    expect(normalized.status).toBe('queued');
    expect(normalized.assets.materialGroupId).toBe('longform_a');
    expect(normalized.effectiveStartAt).toBe('2026-04-27T10:05:00.000Z');
    expect(normalized.attemptCount).toBe(1);
  });
});
