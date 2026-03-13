import fs from 'fs';
import path from 'path';
import type { BRollType, ToolDefinition } from '../src/types';

export const DIRECTOR_BRIDGE_ACTION_NAME = 'director_bridge_action';

type DirectorBridgeIntentType =
  | 'change_type'
  | 'change_text'
  | 'change_template'
  | 'adjust_layout'
  | 'regenerate_prompt'
  | 'delete_option';

type DirectorBridgeResolutionStatus =
  | 'ready_to_confirm'
  | 'needs_clarification'
  | 'invalid_target'
  | 'unsupported_intent';

interface DirectorBridgeActionInput {
  intentType: DirectorBridgeIntentType;
  targetRef: string;
  userRequest: string;
  requestedTypeLabel?: string;
  replacementText?: string;
  requestedTemplate?: string;
  layoutIntent?: string;
  styleHint?: string;
  rationale?: string;
}

interface DirectorTarget {
  targetRef: string;
  chapterSeq: number;
  optionSeq: number;
  chapterId: string;
  optionId: string;
  chapterTitle?: string;
  optionName?: string;
  currentType: BRollType;
  currentTemplate?: string;
  currentProps?: Record<string, unknown>;
  quote?: string;
  prompt?: string;
  imagePrompt?: string;
}

interface DirectorConfirmCard {
  title: string;
  summary: string;
  targetLabel: string;
  diffLabel?: string;
}

interface DirectorExecutionPlan {
  actionName: 'update_option_fields' | 'update_prompt' | 'regenerate_prompt' | 'delete_option';
  actionArgs: Record<string, unknown>;
}

export interface DirectorBridgeResolution {
  status: DirectorBridgeResolutionStatus;
  target?: DirectorTarget;
  clarification?: {
    reason: 'target_not_found' | 'type_conflict' | 'ambiguous_alias' | 'missing_required_value';
    message: string;
    choices?: string[];
  };
  confirmCard?: DirectorConfirmCard;
  executionPlan?: DirectorExecutionPlan;
}

interface DirectorStoreOption {
  id: string;
  type: BRollType;
  name?: string;
  template?: string;
  props?: Record<string, unknown>;
  prompt?: string;
  imagePrompt?: string;
  quote?: string;
}

interface DirectorStoreChapter {
  chapterId: string;
  chapterIndex?: number;
  chapterName?: string;
  options?: DirectorStoreOption[];
}

const TYPE_DISPLAY: Record<Exclude<BRollType, 'generative'>, string> = {
  remotion: 'A. Remotion',
  seedance: 'B. 文生视频',
  artlist: 'C. Artlist',
  'internet-clip': 'D. 互联网素材',
  'user-capture': 'E. 用户截图/录屏',
  infographic: 'F. 信息图',
};

const TYPE_ALIASES: Array<{ type: Exclude<BRollType, 'generative'>; labels: string[] }> = [
  { type: 'remotion', labels: ['a', 'remotion', '动画模板', '模板动画'] },
  { type: 'seedance', labels: ['b', 'seedance', '文生视频', 'ai视频', 'ai 视频', '生成视频'] },
  { type: 'artlist', labels: ['c', 'artlist', '素材库', 'stock footage'] },
  { type: 'internet-clip', labels: ['d', '互联网素材', '网素材', '网络素材', '网上找片段', '网络片段'] },
  { type: 'user-capture', labels: ['e', '用户截图', '用户录屏', '截图录屏', '截图', '录屏', '界面录制', '操作录屏'] },
  { type: 'infographic', labels: ['f', '信息图', 'infographic'] },
];

const UPLOAD_INTENT_LABELS = [
  '我自己上传',
  '自己上传',
  '我来上传',
  '我自己有视频',
  '我有视频',
  '已有视频',
  '现成视频',
  '待上传',
  '上传就好',
  '上传即可',
  '上传素材',
];

const TYPE_CHANGE_VERBS = ['改成', '换成', '改为', '变成', '切成', '切到', '转成', '换为', '改'];
const TYPE_TARGET_VERBS = ['改成', '换成', '改为', '变成', '切成', '切到', '转成', '换为'];
const TYPE_NEGATION_PREFIXES = ['不需要', '不要', '不用', '别用', '别再用', '不是', '去掉', '移除'];

const TEMPLATE_ALIASES: Array<{ template: string; labels: string[]; requiresStructuredProps?: boolean }> = [
  { template: 'TextReveal', labels: ['textreveal', 'text reveal', '金句模板', '文字揭示', '文字揭示动画', '金句动画'] },
  { template: 'CinematicZoom', labels: ['cinematiczoom', 'cinematic zoom', '推镜', '推拉镜头', '电影推镜'] },
  { template: 'ComparisonSplit', labels: ['comparisonsplit', 'comparison split', '对比模板', '左右对比', '分屏对比'], requiresStructuredProps: true },
  { template: 'TimelineFlow', labels: ['timelineflow', 'timeline flow', '时间线', '时间轴'], requiresStructuredProps: true },
  { template: 'ConceptChain', labels: ['conceptchain', 'concept chain', '概念链', '链条图'], requiresStructuredProps: true },
  { template: 'NumberCounter', labels: ['numbercounter', 'number counter', '数字计数', '数字滚动'], requiresStructuredProps: true },
];

export function getDirectorBridgeToolDefinitions(): ToolDefinition[] {
  return [
    {
      type: 'function',
      function: {
        name: DIRECTOR_BRIDGE_ACTION_NAME,
        description: 'Director 专属高层桥接动作。只表达用户要改哪一张卡、想改什么，不直接传 chapterId/optionId 或 raw patch。',
        parameters: {
          type: 'object',
          properties: {
            intentType: {
              type: 'string',
              enum: ['change_type', 'change_text', 'change_template', 'adjust_layout', 'regenerate_prompt', 'delete_option'],
              description: '高层编辑意图类型',
            },
            targetRef: {
              type: 'string',
              description: '用户视角的定位引用，如 1-4',
            },
            userRequest: {
              type: 'string',
              description: '用户原始要求，保留完整表达用于桥梁层判断冲突与澄清',
            },
            requestedTypeLabel: {
              type: 'string',
              description: '用户对目标类型的说法，如 D、互联网素材、我自己上传',
            },
            replacementText: {
              type: 'string',
              description: '直接替换的文案内容',
            },
            requestedTemplate: {
              type: 'string',
              description: '用户明确指定的模板名',
            },
            layoutIntent: {
              type: 'string',
              description: '高层排版意图，如单行显示、缩边距、更紧凑',
            },
            styleHint: {
              type: 'string',
              description: '提示词重生时的风格补充',
            },
            rationale: {
              type: 'string',
              description: 'Skill 的导演判断摘要',
            },
          },
          required: ['intentType', 'targetRef', 'userRequest'],
        },
      },
    },
  ];
}

export function resolveDirectorBridgeAction(
  rawInput: Record<string, unknown>,
  projectRoot: string
): DirectorBridgeResolution {
  const input = rawInput as unknown as DirectorBridgeActionInput;
  const target = resolveTarget(projectRoot, input.targetRef);
  if (!target) {
    return {
      status: 'invalid_target',
      clarification: {
        reason: 'target_not_found',
        message: buildTargetNotFoundMessage(projectRoot, input.targetRef),
      },
    };
  }

  switch (input.intentType) {
    case 'change_type':
      return resolveTypeChange(input, target);
    case 'change_text':
      return resolveTextChange(input, target);
    case 'change_template':
      return resolveTemplateChange(input, target);
    case 'adjust_layout':
      return resolveLayoutAdjustment(input, target);
    case 'regenerate_prompt':
      return {
        status: 'ready_to_confirm',
        target,
        confirmCard: {
          title: '确认修改',
          summary: `将为 ${target.targetRef} 重新生成提示词`,
          targetLabel: buildTargetLabel(target),
          diffLabel: input.styleHint ? `风格提示：${input.styleHint}` : undefined,
        },
        executionPlan: {
          actionName: 'regenerate_prompt',
          actionArgs: {
            chapterId: target.chapterId,
            optionId: target.optionId,
            style_hint: input.styleHint || input.rationale || input.userRequest,
          },
        },
      };
    case 'delete_option':
      return {
        status: 'ready_to_confirm',
        target,
        confirmCard: {
          title: '确认删除',
          summary: `将删除 ${target.targetRef} 这条视觉方案`,
          targetLabel: buildTargetLabel(target),
        },
        executionPlan: {
          actionName: 'delete_option',
          actionArgs: {
            chapterId: target.chapterId,
            optionId: target.optionId,
          },
        },
      };
    default:
      return {
        status: 'unsupported_intent',
        clarification: {
          reason: 'missing_required_value',
          message: '当前这类 Director 编辑意图还未接入桥梁层。',
        },
      };
  }
}

export function tryResolveDirectorFastPath(
  userRequest: string,
  projectRoot: string
): DirectorBridgeResolution | null {
  const targetMatch = userRequest.match(/(\d+\s*[-–]\s*\d+)/);
  if (!targetMatch) return null;

  const hasChangeVerb = TYPE_CHANGE_VERBS.some(verb => userRequest.includes(verb));
  const hasTypeSignal = extractTypeMatches(userRequest).length > 0 || detectUploadIntent(userRequest);
  if (!hasChangeVerb || !hasTypeSignal) return null;

  return resolveDirectorBridgeAction({
    intentType: 'change_type',
    targetRef: targetMatch[1].replace(/\s+/g, ''),
    userRequest,
    requestedTypeLabel: userRequest,
  }, projectRoot);
}

function resolveTypeChange(
  input: DirectorBridgeActionInput,
  target: DirectorTarget
): DirectorBridgeResolution {
  const labelSource = `${input.requestedTypeLabel || ''} ${input.userRequest || ''}`.trim();
  const matches = extractTypeMatches(labelSource);
  const hasUploadIntent = detectUploadIntent(labelSource);
  const negatedMatches = extractNegatedTypeMatches(labelSource);
  const preferredMatches = filterNegatedTypeMatches(
    extractPreferredTypeMatches(labelSource),
    negatedMatches
  );

  if (preferredMatches.length === 0 && matches.length === 0) {
    return {
      status: 'needs_clarification',
      target,
      clarification: {
        reason: 'ambiguous_alias',
        message: hasUploadIntent
          ? `我知道你这条素材会自己上传，但还需要确认它属于哪一类：如果是现成网络片段，请选 D. 互联网素材；如果是你自己录的界面/截图，请选 E. 用户截图/录屏。`
          : `我知道你想改 ${target.targetRef} 的类型，但还没识别出明确目标。请直接说 A-F，或说“互联网素材 / 用户截图录屏 / 文生视频 / Remotion / 信息图”。`,
      },
    };
  }

  const survivingMatches = preferredMatches.length > 0
    ? preferredMatches
    : filterNegatedTypeMatches(matches, negatedMatches);

  if (survivingMatches.length === 0 && negatedMatches.length > 0) {
    return {
      status: 'needs_clarification',
      target,
      clarification: {
        reason: 'ambiguous_alias',
        message: `我理解你是不要 ${negatedMatches.map(match => `“${TYPE_DISPLAY[match]}”`).join(' 和 ')}，但还需要确认要替换成哪一种。请直接说 A-F，或说“互联网素材 / 用户截图录屏 / 文生视频 / Remotion / 信息图”。`,
      },
    };
  }

  const normalizedMatch = normalizeTypeMatches(
    survivingMatches.length > 0 ? survivingMatches : matches,
    hasUploadIntent
  );
  if (normalizedMatch.length > 1) {
    return {
      status: 'needs_clarification',
      target,
      clarification: {
        reason: 'type_conflict',
        message: `你同时表达了 ${normalizedMatch.map(match => `“${TYPE_DISPLAY[match]}”`).join(' 和 ')}，这些类型互相冲突。请明确保留哪一种。`,
        choices: normalizedMatch.map(match => TYPE_DISPLAY[match]),
      },
    };
  }

  const resolvedType = normalizedMatch[0];
  const summary = hasUploadIntent && resolvedType === 'internet-clip'
    ? `将把 ${target.targetRef} 改为 ${TYPE_DISPLAY[resolvedType]}，并保留用户上传入口`
    : `将把 ${target.targetRef} 改为 ${TYPE_DISPLAY[resolvedType]}`;

  return {
    status: 'ready_to_confirm',
    target,
    confirmCard: {
      title: '确认修改',
      summary,
      targetLabel: buildTargetLabel(target),
      diffLabel: `type -> ${resolvedType}`,
    },
    executionPlan: {
      actionName: 'update_option_fields',
      actionArgs: {
        chapterId: target.chapterId,
        optionId: target.optionId,
        updates: {
          type: resolvedType,
        },
      },
    },
  };
}

function resolveTextChange(
  input: DirectorBridgeActionInput,
  target: DirectorTarget
): DirectorBridgeResolution {
  const replacementText = input.replacementText?.trim();
  if (!replacementText) {
    return {
      status: 'needs_clarification',
      target,
      clarification: {
        reason: 'missing_required_value',
        message: `你希望把 ${target.targetRef} 改成什么文案？请直接给我替换后的文字。`,
      },
    };
  }

  return {
    status: 'ready_to_confirm',
    target,
    confirmCard: {
      title: '确认修改',
      summary: `将把 ${target.targetRef} 的文案改为“${replacementText}”`,
      targetLabel: buildTargetLabel(target),
    },
    executionPlan: {
      actionName: 'update_option_fields',
      actionArgs: {
        chapterId: target.chapterId,
        optionId: target.optionId,
        updates: {
          name: replacementText,
          imagePrompt: replacementText,
        },
      },
    },
  };
}

function resolveTemplateChange(
  input: DirectorBridgeActionInput,
  target: DirectorTarget
): DirectorBridgeResolution {
  const templateResolution = resolveRequestedTemplate(input.requestedTemplate || input.userRequest);
  if (!templateResolution) {
    return {
      status: 'needs_clarification',
      target,
      clarification: {
        reason: 'ambiguous_alias',
        message: `我知道你想改 ${target.targetRef} 的模板，但还没识别出明确模板名。请直接说 TextReveal、CinematicZoom、ComparisonSplit、TimelineFlow、ConceptChain 或 NumberCounter。`,
      },
    };
  }

  if (templateResolution.requiresStructuredProps && templateResolution.template !== target.currentTemplate) {
    return {
      status: 'needs_clarification',
      target,
      clarification: {
        reason: 'missing_required_value',
        message: `${templateResolution.template} 需要更完整的结构化内容，Bridge 还不能安全自动补全。请先补充该模板的核心内容，或先改成 TextReveal / CinematicZoom。`,
      },
    };
  }

  const updates: Record<string, unknown> = {
    type: 'remotion',
    template: templateResolution.template,
  };

  if (templateResolution.template === 'TextReveal') {
    updates.props = buildTextRevealBaseProps(target);
  } else if (templateResolution.template === 'CinematicZoom' && !target.currentProps) {
    updates.props = {};
  }

  return {
    status: 'ready_to_confirm',
    target,
    confirmCard: {
      title: '确认修改',
      summary: `将把 ${target.targetRef} 改为 ${templateResolution.template} 模板`,
      targetLabel: buildTargetLabel(target),
      diffLabel: `template -> ${templateResolution.template}`,
    },
    executionPlan: {
      actionName: 'update_option_fields',
      actionArgs: {
        chapterId: target.chapterId,
        optionId: target.optionId,
        updates,
      },
    },
  };
}

function resolveLayoutAdjustment(
  input: DirectorBridgeActionInput,
  target: DirectorTarget
): DirectorBridgeResolution {
  const layoutIntent = (input.layoutIntent || input.userRequest || '').trim();
  if (!layoutIntent) {
    return {
      status: 'needs_clarification',
      target,
      clarification: {
        reason: 'missing_required_value',
        message: `你希望把 ${target.targetRef} 调成什么排版效果？例如“一行显示”“不要换行”“缩边距”。`,
      },
    };
  }

  const effectiveTemplate = target.currentTemplate || resolveRequestedTemplate(input.requestedTemplate || '')?.template;
  if (effectiveTemplate !== 'TextReveal') {
    return {
      status: 'needs_clarification',
      target,
      clarification: {
        reason: 'missing_required_value',
        message: `当前 Bridge 只先支持 TextReveal 的高频排版调整。${target.targetRef} 现在不是 TextReveal，请先切到 TextReveal 或明确要修改的模板结构。`,
      },
    };
  }

  const propsPatch = buildLayoutPatch(layoutIntent);
  if (!propsPatch) {
    return {
      status: 'needs_clarification',
      target,
      clarification: {
        reason: 'ambiguous_alias',
        message: `我识别到你在调 ${target.targetRef} 的排版，但当前只支持“一行显示 / 不换行 / 缩边距 / 更紧凑”这几类高频诉求。请更明确一点。`,
      },
    };
  }

  return {
    status: 'ready_to_confirm',
    target,
    confirmCard: {
      title: '确认修改',
      summary: `将调整 ${target.targetRef} 的 TextReveal 排版：${propsPatch.summary}`,
      targetLabel: buildTargetLabel(target),
      diffLabel: propsPatch.diffLabel,
    },
    executionPlan: {
      actionName: 'update_option_fields',
      actionArgs: {
        chapterId: target.chapterId,
        optionId: target.optionId,
        updates: {
          props: propsPatch.props,
        },
      },
    },
  };
}

function resolveTarget(projectRoot: string, targetRef: string): DirectorTarget | null {
  const match = targetRef.match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*$/);
  if (!match) return null;

  const chapterSeq = Number(match[1]);
  const optionSeq = Number(match[2]);
  if (!Number.isInteger(chapterSeq) || !Number.isInteger(optionSeq) || chapterSeq <= 0 || optionSeq <= 0) {
    return null;
  }

  const chapters = loadDirectorChapters(projectRoot);
  const chapterIndex = chapters.findIndex((chapter, index) => getChapterSeq(chapter, index) === chapterSeq);
  if (chapterIndex < 0) {
    return null;
  }

  const chapter = chapters[chapterIndex];
  const options = chapter.options || [];
  const option = options[optionSeq - 1];
  if (!option) {
    return null;
  }

  return {
    targetRef: `${chapterSeq}-${optionSeq}`,
    chapterSeq,
    optionSeq,
    chapterId: chapter.chapterId,
    optionId: option.id,
    chapterTitle: chapter.chapterName,
    optionName: option.name,
    currentType: option.type,
    currentTemplate: option.template,
    currentProps: option.props,
    quote: option.quote,
    prompt: option.prompt,
    imagePrompt: option.imagePrompt,
  };
}

function buildTargetNotFoundMessage(projectRoot: string, targetRef: string): string {
  const match = targetRef.match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*$/);
  if (!match) {
    return '我没能识别目标卡片，请用“章-方案”的格式，例如 1-4。';
  }

  const chapterSeq = Number(match[1]);
  const chapters = loadDirectorChapters(projectRoot);
  const chapterIndex = chapters.findIndex((chapter, index) => getChapterSeq(chapter, index) === chapterSeq);
  if (chapterIndex < 0) {
    return `当前没有第 ${chapterSeq} 章，请确认你要修改哪一章。`;
  }

  const optionCount = chapters[chapterIndex].options?.length || 0;
  return `当前第 ${chapterSeq} 章只有 ${optionCount} 个方案，请确认你要修改哪一个。`;
}

function loadDirectorChapters(projectRoot: string): DirectorStoreChapter[] {
  const storePath = path.join(projectRoot, 'delivery_store.json');
  if (!fs.existsSync(storePath)) {
    return [];
  }

  try {
    const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    return store.modules?.director?.items || [];
  } catch {
    return [];
  }
}

function getChapterSeq(chapter: DirectorStoreChapter, index: number): number {
  return chapter.chapterIndex ?? index + 1;
}

function buildTargetLabel(target: DirectorTarget): string {
  return `第 ${target.chapterSeq} 章 · 方案 ${target.optionSeq}`;
}

function extractTypeMatches(source: string): Array<Exclude<BRollType, 'generative'>> {
  const normalized = normalizeText(source);
  const matches = new Set<Exclude<BRollType, 'generative'>>();

  for (const entry of TYPE_ALIASES) {
    for (const label of entry.labels) {
      if (label.length === 1) {
        const regex = new RegExp(`(^|[\\s，,。:：;；(（])${label}($|[\\s，,。:：;；)）])`, 'i');
        if (regex.test(source)) {
          matches.add(entry.type);
          break;
        }
        continue;
      }

      if (normalized.includes(normalizeText(label))) {
        matches.add(entry.type);
        break;
      }
    }
  }

  return Array.from(matches);
}

function extractPreferredTypeMatches(source: string): Array<Exclude<BRollType, 'generative'>> {
  const matches = new Set<Exclude<BRollType, 'generative'>>();

  for (const verb of TYPE_TARGET_VERBS) {
    const segments = source.split(verb).slice(1);
    for (const segment of segments) {
      extractTypeMatches(segment).forEach(match => matches.add(match));
    }
  }

  return Array.from(matches);
}

function extractNegatedTypeMatches(source: string): Array<Exclude<BRollType, 'generative'>> {
  const matches = new Set<Exclude<BRollType, 'generative'>>();

  for (const prefix of TYPE_NEGATION_PREFIXES) {
    const segments = source.split(prefix).slice(1);
    for (const segment of segments) {
      const scopedSegment = segment.split(/[，,。；;\n]/)[0] || segment;
      extractTypeMatches(scopedSegment).forEach(match => matches.add(match));
    }
  }

  return Array.from(matches);
}

function detectUploadIntent(source: string): boolean {
  const normalized = normalizeText(source);
  return UPLOAD_INTENT_LABELS.some(label => normalized.includes(normalizeText(label)));
}

function normalizeTypeMatches(
  matches: Array<Exclude<BRollType, 'generative'>>,
  hasUploadIntent: boolean
): Array<Exclude<BRollType, 'generative'>> {
  const uniqueMatches = Array.from(new Set(matches));

  // "互联网素材 + 我自己上传" is not a real type conflict:
  // the type is internet-clip, while upload is just the material delivery method.
  if (
    hasUploadIntent &&
    uniqueMatches.includes('internet-clip') &&
    uniqueMatches.includes('user-capture') &&
    uniqueMatches.length === 2
  ) {
    return ['internet-clip'];
  }

  return uniqueMatches;
}

function filterNegatedTypeMatches(
  matches: Array<Exclude<BRollType, 'generative'>>,
  negatedMatches: Array<Exclude<BRollType, 'generative'>>
): Array<Exclude<BRollType, 'generative'>> {
  if (negatedMatches.length === 0) {
    return Array.from(new Set(matches));
  }

  const negatedSet = new Set(negatedMatches);
  return Array.from(new Set(matches.filter(match => !negatedSet.has(match))));
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

function resolveRequestedTemplate(source: string): { template: string; requiresStructuredProps?: boolean } | null {
  const normalized = normalizeText(source);
  for (const entry of TEMPLATE_ALIASES) {
    for (const label of entry.labels) {
      if (normalized.includes(normalizeText(label))) {
        return {
          template: entry.template,
          requiresStructuredProps: entry.requiresStructuredProps,
        };
      }
    }
  }
  return null;
}

function buildTextRevealBaseProps(target: DirectorTarget): Record<string, unknown> {
  const currentProps = isPlainObject(target.currentProps) ? target.currentProps : {};
  const existingText = typeof currentProps.text === 'string' ? currentProps.text : undefined;
  const fallbackText = existingText || target.quote || target.optionName || target.imagePrompt || target.prompt || '请补充文案';

  return {
    ...currentProps,
    text: fallbackText,
  };
}

function buildLayoutPatch(layoutIntent: string): { summary: string; diffLabel: string; props: Record<string, unknown> } | null {
  const normalized = normalizeText(layoutIntent);
  const wantsSingleLine = ['单行', '一行', 'nowrap', '不换行', '单行显示', '一行显示'].some(keyword => normalized.includes(normalizeText(keyword)));
  const wantsTighterPadding = ['缩边距', '更紧凑', '字更紧', '更紧一点', '收紧'].some(keyword => normalized.includes(normalizeText(keyword)));

  if (!wantsSingleLine && !wantsTighterPadding) {
    return null;
  }

  const props: Record<string, unknown> = {};
  const textStyle: Record<string, unknown> = {};
  const changes: string[] = [];

  if (wantsSingleLine) {
    props.singleLine = true;
    props.noWrap = true;
    props.containerWidth = '84%';
    props.paddingX = '8%';
    props.paddingY = '6%';
    textStyle.whiteSpace = 'nowrap';
    textStyle.fontSize = 'clamp(24px, 4vw, 48px)';
    textStyle.letterSpacing = '-0.02em';
    changes.push('单行显示');
  }

  if (wantsTighterPadding) {
    props.containerWidth = '88%';
    props.paddingX = '6%';
    props.paddingY = '4%';
    textStyle.letterSpacing = '-0.03em';
    changes.push('缩边距');
  }

  props.textStyle = textStyle;

  return {
    summary: changes.join(' + '),
    diffLabel: `props -> ${changes.join(' / ')}`,
    props,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
