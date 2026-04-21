import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveDirectorBridgeAction, tryResolveDirectorFastPath } from '../../server/director-bridge';

const tempDirs: string[] = [];

function createProjectRoot() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'director-bridge-'));
  tempDirs.push(projectRoot);

  const store = {
    modules: {
      director: {
        items: [
          {
            chapterId: 'ch1',
            chapterName: '开篇',
            chapterIndex: 0,
            options: [
              {
                id: 'ch1-opt1',
                type: 'seedance',
                name: '方案一',
                quote: '真正的目标不是被告知，而是从生命中涌现。',
              },
              {
                id: 'ch1-opt2',
                type: 'remotion',
                template: 'TextReveal',
                name: '方案二',
                props: { text: '原始文案' },
              },
              { id: 'ch1-opt3', type: 'seedance', name: '方案三' },
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

describe('resolveDirectorBridgeAction', () => {
  it('maps D to internet-clip and returns a confirmable execution plan', () => {
    const projectRoot = createProjectRoot();

    const result = resolveDirectorBridgeAction({
      intentType: 'change_type',
      targetRef: '1-2',
      userRequest: '把 1-2 改成 D',
      requestedTypeLabel: 'D',
    }, projectRoot);

    expect(result.status).toBe('ready_to_confirm');
    expect(result.confirmCard?.summary).toContain('将把 1-2 改为 D. 互联网素材');
    expect(result.executionPlan).toEqual({
      actionName: 'update_option_fields',
      actionArgs: {
        chapterId: 'ch1',
        optionId: 'ch1-opt2',
        updates: {
          type: 'internet-clip',
        },
      },
    });
  });

  it('asks for clarification when only upload intent is provided', () => {
    const projectRoot = createProjectRoot();

    const result = resolveDirectorBridgeAction({
      intentType: 'change_type',
      targetRef: '1-1',
      userRequest: '把 1-1 改成我自己上传',
      requestedTypeLabel: '我自己上传',
    }, projectRoot);

    expect(result.status).toBe('needs_clarification');
    expect(result.clarification?.message).toContain('D. 互联网素材');
    expect(result.clarification?.message).toContain('E. 用户截图/录屏');
  });

  it('maps 截图录屏 to user-capture when the type is explicit', () => {
    const projectRoot = createProjectRoot();

    const result = resolveDirectorBridgeAction({
      intentType: 'change_type',
      targetRef: '1-1',
      userRequest: '把 1-1 改成截图录屏',
      requestedTypeLabel: '截图录屏',
    }, projectRoot);

    expect(result.status).toBe('ready_to_confirm');
    expect(result.executionPlan?.actionArgs).toMatchObject({
      updates: {
        type: 'user-capture',
      },
    });
  });

  it('treats internet-clip + upload intent as a single internet-clip decision', () => {
    const projectRoot = createProjectRoot();

    const result = resolveDirectorBridgeAction({
      intentType: 'change_type',
      targetRef: '1-1',
      userRequest: '把 1-1 改成互联网素材，我自己上传',
      requestedTypeLabel: '互联网素材，我自己上传',
    }, projectRoot);

    expect(result.status).toBe('ready_to_confirm');
    expect(result.confirmCard?.summary).toContain('保留用户上传入口');
    expect(result.executionPlan?.actionArgs).toMatchObject({
      updates: {
        type: 'internet-clip',
      },
    });
  });

  it('treats negated old type + target type as a replacement instead of a conflict', () => {
    const projectRoot = createProjectRoot();

    const result = resolveDirectorBridgeAction({
      intentType: 'change_type',
      targetRef: '1-2',
      userRequest: '1-2 不需要文生视频，请改成互联网素材，我自己上传',
      requestedTypeLabel: '不需要文生视频，改成互联网素材，我自己上传',
    }, projectRoot);

    expect(result.status).toBe('ready_to_confirm');
    expect(result.confirmCard?.summary).toContain('D. 互联网素材');
    expect(result.confirmCard?.summary).toContain('保留用户上传入口');
    expect(result.executionPlan?.actionArgs).toMatchObject({
      updates: {
        type: 'internet-clip',
      },
    });
  });

  it('asks for the replacement type when the user only negates the current type', () => {
    const projectRoot = createProjectRoot();

    const result = resolveDirectorBridgeAction({
      intentType: 'change_type',
      targetRef: '1-2',
      userRequest: '1-2 不要文生视频了',
      requestedTypeLabel: '不要文生视频了',
    }, projectRoot);

    expect(result.status).toBe('needs_clarification');
    expect(result.clarification?.message).toContain('不要');
    expect(result.clarification?.message).toContain('B. 文生视频');
    expect(result.clarification?.message).toContain('替换成哪一种');
  });

  it('returns needs_clarification when true type aliases still conflict', () => {
    const projectRoot = createProjectRoot();

    const result = resolveDirectorBridgeAction({
      intentType: 'change_type',
      targetRef: '1-1',
      userRequest: '把 1-1 改成互联网素材，改成截图录屏',
      requestedTypeLabel: '互联网素材，截图录屏',
    }, projectRoot);

    expect(result.status).toBe('needs_clarification');
    expect(result.clarification?.reason).toBe('type_conflict');
    expect(result.clarification?.choices).toEqual([
      'D. 互联网素材',
      'E. 用户截图/录屏',
    ]);
  });

  it('returns invalid_target when option reference is out of range', () => {
    const projectRoot = createProjectRoot();

    const result = resolveDirectorBridgeAction({
      intentType: 'change_type',
      targetRef: '1-4',
      userRequest: '把 1-4 改成 D',
      requestedTypeLabel: 'D',
    }, projectRoot);

    expect(result.status).toBe('invalid_target');
    expect(result.clarification?.reason).toBe('target_not_found');
    expect(result.clarification?.message).toContain('当前第 1 章只有 3 个方案');
  });

  it('supports safe template change to TextReveal with base props', () => {
    const projectRoot = createProjectRoot();

    const result = resolveDirectorBridgeAction({
      intentType: 'change_template',
      targetRef: '1-1',
      userRequest: '把 1-1 改成 TextReveal',
      requestedTemplate: 'TextReveal',
    }, projectRoot);

    expect(result.status).toBe('ready_to_confirm');
    expect(result.executionPlan).toEqual({
      actionName: 'update_option_fields',
      actionArgs: {
        chapterId: 'ch1',
        optionId: 'ch1-opt1',
        updates: {
          type: 'remotion',
          template: 'TextReveal',
          props: {
            text: '真正的目标不是被告知，而是从生命中涌现。',
          },
        },
      },
    });
  });

  it('translates TextReveal no-wrap layout intent into a props patch', () => {
    const projectRoot = createProjectRoot();

    const result = resolveDirectorBridgeAction({
      intentType: 'adjust_layout',
      targetRef: '1-2',
      userRequest: '把 1-2 调成一行显示，不要换行，缩边距',
      layoutIntent: '一行显示，不要换行，缩边距',
    }, projectRoot);

    expect(result.status).toBe('ready_to_confirm');
    expect(result.confirmCard?.summary).toContain('TextReveal 排版');
    expect(result.executionPlan?.actionArgs).toMatchObject({
      updates: {
        props: {
          singleLine: true,
          noWrap: true,
          containerWidth: '88%',
          paddingX: '6%',
          paddingY: '4%',
          textStyle: {
            whiteSpace: 'nowrap',
            fontSize: 'clamp(24px, 4vw, 48px)',
            letterSpacing: '-0.03em',
          },
        },
      },
    });
  });

  it('fast-path resolves direct type change requests before LLM reasoning', () => {
    const projectRoot = createProjectRoot();

    const result = tryResolveDirectorFastPath('1-2我自己有视频待上传，请改成互联网素材', projectRoot);

    expect(result?.status).toBe('ready_to_confirm');
    expect(result?.confirmCard?.summary).toContain('D. 互联网素材');
    expect(result?.confirmCard?.summary).toContain('保留用户上传入口');
  });

  it('fast-path understands replacement syntax with negated old type', () => {
    const projectRoot = createProjectRoot();

    const result = tryResolveDirectorFastPath('1-2不需要文生视频，请改成互联网素材，我自己上传', projectRoot);

    expect(result?.status).toBe('ready_to_confirm');
    expect(result?.confirmCard?.summary).toContain('D. 互联网素材');
    expect(result?.confirmCard?.summary).toContain('保留用户上传入口');
  });
});
