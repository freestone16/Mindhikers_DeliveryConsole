import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DirectorAdapter } from '../../server/expert-actions/director';

const tempDirs: string[] = [];

function createProjectRoot() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'director-adapter-'));
  tempDirs.push(projectRoot);

  const store = {
    modules: {
      director: {
        items: [
          {
            chapterId: 'ch2',
            chapterName: '一句话的大片',
            chapterIndex: 1,
            options: [
              {
                id: 'ch2-opt1',
                type: 'seedance',
                name: '测试方案',
                prompt: 'old prompt',
                imagePrompt: 'old image prompt',
                previewUrl: 'https://example.com/old.png',
                props: { title: 'old title' },
              },
            ],
          },
        ],
      },
    },
  };

  fs.writeFileSync(
    path.join(projectRoot, 'delivery_store.json'),
    JSON.stringify(store, null, 2)
  );

  return projectRoot;
}

afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('DirectorAdapter', () => {
  it('updates option type through update_option_fields and invalidates preview', async () => {
    const projectRoot = createProjectRoot();

    const result = await DirectorAdapter.executeAction('update_option_fields', {
      chapterId: 'ch2',
      optionId: 'ch2-opt1',
      updates: {
        type: 'internet-clip',
      },
    }, projectRoot);

    expect(result.success).toBe(true);

    const store = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'delivery_store.json'), 'utf-8')
    );
    const option = store.modules.director.items[0].options[0];

    expect(option.type).toBe('internet-clip');
    expect(option.previewUrl).toBeUndefined();
  });

  it('merges nested props through update_option_fields without system-side normalization', async () => {
    const projectRoot = createProjectRoot();

    const storePath = path.join(projectRoot, 'delivery_store.json');
    const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    store.modules.director.items[0].options[0].template = 'TextReveal';
    store.modules.director.items[0].options[0].props = {
      text: '当前地表最强的视频生成模型',
      textColor: '#ff4757',
      textStyle: {
        fontSize: '32px',
      },
    };
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));

    const result = await DirectorAdapter.executeAction('update_option_fields', {
      chapterId: 'ch2',
      optionId: 'ch2-opt1',
      updates: {
        props: {
          noWrap: true,
          textStyle: {
            whiteSpace: 'nowrap',
          },
        },
      },
    }, projectRoot);

    expect(result.success).toBe(true);

    const updatedStore = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'delivery_store.json'), 'utf-8')
    );
    const option = updatedStore.modules.director.items[0].options[0];

    expect(option.props.noWrap).toBe(true);
    expect(option.props.text).toBe('当前地表最强的视频生成模型');
    expect(option.props.textColor).toBe('#ff4757');
    expect(option.props.textStyle.fontSize).toBe('32px');
    expect(option.props.textStyle.whiteSpace).toBe('nowrap');
    expect(option.previewUrl).toBeUndefined();
  });
});
