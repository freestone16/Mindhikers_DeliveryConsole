import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getDistributionComposerSources,
  getDistributionComposerSourcesV2,
} from '../../../server/distribution-store';

const originalProjectsBase = process.env.PROJECTS_BASE;

afterEach(() => {
  if (originalProjectsBase === undefined) {
    delete process.env.PROJECTS_BASE;
  } else {
    process.env.PROJECTS_BASE = originalProjectsBase;
  }
});

function writeFile(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe('distribution composer sources', () => {
  it('prefers marketing output when structured marketing files exist', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-composer-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'alpha');
    writeFile(
      path.join(projectRoot, '05_Marketing', 'Alpha_YouTube_Submission_v1.txt'),
      `[1. 视频标题 (Title)]
我的标题

[2. 视频描述 (Description)]
这里是一段真实营销文案。

[4. 标签 (Tags)]
AI, MindHikers, OpenClaw`
    );
    writeFile(
      path.join(projectRoot, '02_Script', 'script.md'),
      `# 脚本文稿标题

脚本文稿正文`
    );

    const sources = getDistributionComposerSources('alpha', {
      selectedVideoPath: '05_Shorts_Output/demo.mp4',
    });

    expect(sources.suggestedTitle).toBe('我的标题');
    expect(sources.suggestedBody).toContain('真实营销文案');
    expect(sources.suggestedTags).toEqual(['AI', 'MindHikers', 'OpenClaw']);
    expect(sources.sourceFiles.map((item) => item.path)).toContain('05_Marketing/Alpha_YouTube_Submission_v1.txt');
    expect(sources.sourceFiles.map((item) => item.path)).toContain('05_Shorts_Output/demo.mp4');
  });

  it('falls back to script content when marketing outputs are missing', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-composer-script-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'beta');
    writeFile(
      path.join(projectRoot, '02_Script', 'Beta_深度文稿_v1.md'),
      `# Script Fallback Title

第一段正文。

第二段正文。

## 附录：对话金句

* 认知主权
* 混合思考系统`
    );

    const sources = getDistributionComposerSources('beta');

    expect(sources.suggestedTitle).toBe('Script Fallback Title');
    expect(sources.suggestedBody).toContain('第一段正文');
    expect(sources.sourceFiles[0].category).toBe('script');
    expect(sources.warnings).toContain('未找到 Marketing 产物，已回退到 Script。');
  });

  it('returns warnings when no marketing or script source exists', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-composer-empty-'));
    process.env.PROJECTS_BASE = tempRoot;
    fs.mkdirSync(path.join(tempRoot, 'gamma'), { recursive: true });

    const sources = getDistributionComposerSources('gamma', {
      selectedVideoPath: '05_Shorts_Output/final-video.mp4',
    });

    expect(sources.suggestedTitle).toBe('final-video');
    expect(sources.suggestedBody).toBe('');
    expect(sources.suggestedTags).toEqual([]);
    expect(sources.warnings).toContain('项目内未找到可用于装填的 Marketing / Script 文案源。');
  });
});

// ============================================================================
// === A2 新增：V2 素材组分组测试 ===
// ============================================================================

describe('A2 · getDistributionComposerSourcesV2', () => {
  it('Happy path: 1 长文 + 1 长视频 → 2 组（longform + video），共 4 卡', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-v2-mixed-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'cset-mixed');
    writeFile(
      path.join(projectRoot, '02_Script', 'deep_article_v1.md'),
      '# 深度文章标题\n\n这是正文段落。\n\n第二段。'
    );
    writeFile(path.join(projectRoot, '04_Video', 'main_1080p.mp4'), 'fake-mp4-bytes');
    // youtube/bilibili 文案使其 video 组 ready
    writeFile(
      path.join(projectRoot, '05_Marketing', 'youtube.md'),
      '# YouTube 标题\n\nYT 描述'
    );
    writeFile(
      path.join(projectRoot, '05_Marketing', 'bilibili.md'),
      '# B站 标题\n\nB站 描述'
    );

    const sources = getDistributionComposerSourcesV2('cset-mixed');

    expect(sources.groups).toHaveLength(2);
    const longform = sources.groups.find((g) => g.groupType === 'longform');
    const video = sources.groups.find((g) => g.groupType === 'video');

    expect(longform).toBeDefined();
    expect(video).toBeDefined();
    expect(longform!.applicablePlatforms).toEqual(['twitter', 'wechat_mp']);
    expect(video!.applicablePlatforms).toEqual(['youtube', 'bilibili']);

    // 4 卡 = (longform × 2 平台) + (video × 2 平台)
    const totalCards = sources.groups.reduce(
      (sum, g) => sum + g.applicablePlatforms.length,
      0
    );
    expect(totalCards).toBe(4);
  });

  it('Happy path: 2 篇长文 + 2 部视频 → 4 组，共 8 卡', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-v2-multi-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'multi');
    writeFile(path.join(projectRoot, '02_Script', 'a.md'), '# A\n正文');
    writeFile(path.join(projectRoot, '02_Script', 'b.md'), '# B\n正文');
    writeFile(path.join(projectRoot, '04_Video', 'v1.mp4'), 'x');
    writeFile(path.join(projectRoot, '04_Video', 'v2.mp4'), 'x');

    const sources = getDistributionComposerSourcesV2('multi');

    expect(sources.groups).toHaveLength(4);
    expect(sources.groups.filter((g) => g.groupType === 'longform')).toHaveLength(2);
    expect(sources.groups.filter((g) => g.groupType === 'video')).toHaveLength(2);

    const totalCards = sources.groups.reduce(
      (sum, g) => sum + g.applicablePlatforms.length,
      0
    );
    expect(totalCards).toBe(8);
  });

  it('Happy path: longform 缺封面图 → wechat_mp ready=false + missingItems', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-v2-nocover-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'nocover');
    writeFile(path.join(projectRoot, '02_Script', 'article_v1.md'), '# T\n正文');
    // 不写 article_v1.png 也不写 cover.png

    const sources = getDistributionComposerSourcesV2('nocover');
    const longform = sources.groups.find((g) => g.groupType === 'longform')!;

    expect(longform.readyState.twitter?.ready).toBe(true);
    expect(longform.readyState.wechat_mp?.ready).toBe(false);
    expect(longform.readyState.wechat_mp?.missingItems).toContain('封面图 article_v1.png 不存在');
  });

  it('Happy path: longform 有同名 .png 封面 → wechat_mp ready=true', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-v2-cover-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'havecover');
    writeFile(path.join(projectRoot, '02_Script', 'article_v1.md'), '# T\n正文');
    writeFile(path.join(projectRoot, '02_Script', 'article_v1.png'), 'fake-png-bytes');

    const sources = getDistributionComposerSourcesV2('havecover');
    const longform = sources.groups.find((g) => g.groupType === 'longform')!;

    expect(longform.readyState.wechat_mp?.ready).toBe(true);
  });

  it('Happy path: video 找到 youtube.md → suggestedTitle 来自 youtube.md', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-v2-yt-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'yt');
    writeFile(path.join(projectRoot, '04_Video', 'main.mp4'), 'x');
    writeFile(
      path.join(projectRoot, '05_Marketing', 'youtube.md'),
      '# 这是 YouTube 标题\n\n# 不应被使用的脚本标题\n'
    );
    writeFile(
      path.join(projectRoot, '02_Script', 'script.md'),
      '# 脚本标题\n\n脚本正文'
    );

    const sources = getDistributionComposerSourcesV2('yt');
    const video = sources.groups.find((g) => g.groupType === 'video')!;

    expect(video.suggestedTitle).toBe('这是 YouTube 标题');
  });

  it('Happy path: video 无 youtube.md 但有 02_Script → 回退到脚本，youtube ready=true', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-v2-fallback-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'fb');
    writeFile(path.join(projectRoot, '04_Video', 'main.mp4'), 'x');
    writeFile(
      path.join(projectRoot, '02_Script', 'script.md'),
      '# 脚本标题\n\n脚本正文'
    );

    const sources = getDistributionComposerSourcesV2('fb');
    const video = sources.groups.find((g) => g.groupType === 'video')!;

    expect(video.readyState.youtube?.ready).toBe(true);
    expect(video.readyState.bilibili?.ready).toBe(false);
    expect(video.readyState.bilibili?.missingItems).toContain(
      '市场大师文案 05_Marketing/bilibili.md 不存在'
    );
  });

  it('Happy path: video 无任何文案 → youtube/bilibili 都 ready=false', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-v2-nodesc-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'nodesc');
    writeFile(path.join(projectRoot, '04_Video', 'main.mp4'), 'x');

    const sources = getDistributionComposerSourcesV2('nodesc');
    const video = sources.groups.find((g) => g.groupType === 'video')!;

    expect(video.readyState.youtube?.ready).toBe(false);
    expect(video.readyState.bilibili?.ready).toBe(false);
  });

  it('Edge case: 项目目录为空 → groups=[] + warnings 提示', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-v2-empty-'));
    process.env.PROJECTS_BASE = tempRoot;
    fs.mkdirSync(path.join(tempRoot, 'empty'), { recursive: true });

    const sources = getDistributionComposerSourcesV2('empty');

    expect(sources.groups).toHaveLength(0);
    expect(sources.warnings.some((w) => w.includes('未找到可用素材'))).toBe(true);
  });

  it('Edge case: 02_Script 不存在但 04_Video 有视频 + youtube.md → 仍能扫出 video 组', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-v2-noscript-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'noscript');
    writeFile(path.join(projectRoot, '04_Video', 'main.mp4'), 'x');
    writeFile(path.join(projectRoot, '05_Marketing', 'youtube.md'), '# T');

    const sources = getDistributionComposerSourcesV2('noscript');

    expect(sources.groups).toHaveLength(1);
    expect(sources.groups[0].groupType).toBe('video');
    expect(sources.groups[0].readyState.youtube?.ready).toBe(true);
  });

  it('Edge case: 文件名含空格 / 中文 → groupId 安全可读', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-v2-cjk-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'cjk');
    writeFile(
      path.join(projectRoot, '02_Script', '深度 文稿 v2.1.md'),
      '# 标题\n正文'
    );

    const sources = getDistributionComposerSourcesV2('cjk');
    const group = sources.groups[0];

    expect(group).toBeDefined();
    expect(group.groupId).toMatch(/^longform_/);
    // 不应包含空格或多余的连字符
    expect(group.groupId).not.toMatch(/\s/);
    expect(group.groupId).not.toMatch(/--+/);
  });

  it('Integration: V2 返回结构包含 legacy 兼容字段（取自首个 longform）', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-v2-legacy-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'lg');
    writeFile(path.join(projectRoot, '02_Script', 'a.md'), '# 兼容测试\n\n正文段。');

    const sources = getDistributionComposerSourcesV2('lg');

    expect(sources.legacy).toBeDefined();
    expect(sources.legacy?.suggestedTitle).toBe('兼容测试');
    expect(sources.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('Integration: V1 旧函数与 V2 新函数共存，V1 不受 V2 影响', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-v1v2-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'compat');
    writeFile(
      path.join(projectRoot, '05_Marketing', 'submission.txt'),
      `[1. 视频标题 (Title)]\nV1 标题\n\n[2. 视频描述 (Description)]\nV1 正文`
    );

    const v1 = getDistributionComposerSources('compat');
    const v2 = getDistributionComposerSourcesV2('compat');

    // V1 用旧 marketing 路径正常返回
    expect(v1.suggestedTitle).toBe('V1 标题');
    // V2 因为没有 02_Script 也没有 04_Video，返回空 groups + warning
    expect(v2.groups).toHaveLength(0);
  });
});
