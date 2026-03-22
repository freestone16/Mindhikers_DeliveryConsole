import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { getDistributionComposerSources } from '../../../server/distribution-store';

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
