import process from 'process';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

async function callZhipuLLM(messages: LLMMessage[], model = 'glm-4'): Promise<LLMResponse> {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) {
    throw new Error('ZHIPU_API_KEY not configured');
  }

  const response = await fetch(ZHIPU_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zhipu API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

async function callOpenAILLM(messages: LLMMessage[], model = 'gpt-4o'): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

async function callDeepSeekLLM(messages: LLMMessage[], model = 'deepseek-chat'): Promise<LLMResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

async function callSiliconFlowLLM(messages: LLMMessage[], model = 'Pro/moonshotai/Kimi-K2.5'): Promise<LLMResponse> {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) {
    throw new Error('SILICONFLOW_API_KEY not configured');
  }

  const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SiliconFlow API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

async function callYinliLLM(messages: LLMMessage[], model = 'claude-sonnet-4-6-thinking'): Promise<LLMResponse> {
  const apiKey = process.env.YINLI_API_KEY;
  if (!apiKey) {
    throw new Error('YINLI_API_KEY not configured');
  }

  const response = await fetch('https://yinli.one/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 16384,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Yinli API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

async function callKimiLLM(messages: LLMMessage[], model = 'kimi-k2.5'): Promise<LLMResponse> {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    throw new Error('KIMI_API_KEY not configured');
  }

  // Kimi K2.5 只允许 temperature = 1，旧版 moonshot 系列支持 0.7
  const isKimiK25 = model.includes('kimi-k2') || model.includes('k2.5');
  const temperature = isKimiK25 ? 1 : 0.7;

  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

export async function callLLM(
  messages: LLMMessage[],
  provider: 'zhipu' | 'openai' | 'deepseek' | 'anthropic' | 'siliconflow' | 'kimi' | 'yinli' = 'deepseek',
  model?: string
): Promise<LLMResponse> {
  switch (provider) {
    case 'zhipu':
      return callZhipuLLM(messages, model || 'glm-4');
    case 'openai':
      return callOpenAILLM(messages, model || 'gpt-4o');
    case 'deepseek':
      return callDeepSeekLLM(messages, model || 'deepseek-chat');
    case 'siliconflow':
      return callSiliconFlowLLM(messages, model || 'Pro/moonshotai/Kimi-K2.5');
    case 'kimi':
      return callKimiLLM(messages, model || 'kimi-k2.5');
    case 'yinli':
      return callYinliLLM(messages, model || 'claude-sonnet-4-6-thinking');
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// System prompts are now dynamically generated via skill-loader.ts
// keeping this export for backward compatibility if other modules reference it
export const SYSTEM_PROMPTS = {
  brollGenerator: '' // deprecated: use buildDirectorSystemPrompt('broll') instead
};

export interface BRollOption {
  name: string;
  type: 'remotion' | 'generative' | 'artlist' | 'internet-clip' | 'user-capture' | 'infographic';
  template?: string;
  props?: Record<string, any>;
  quote: string;
  prompt: string;
  imagePrompt?: string;
  rationale?: string;
  // Infographic specific
  infographicLayout?: string;
  infographicStyle?: string;
  infographicUseMode?: 'cinematic-zoom' | 'static';
}

export interface GlobalBRollProposal {
  chapters: {
    chapterId: string;
    chapterName: string;
    options: BRollOption[];
  }[];
}

import { buildDirectorSystemPrompt } from './skill-loader';

/**
 * 全局 B-roll 规划生成器 (上帝视角)
 * 一次性处理所有章节，实现智能分配与节奏控制
 */
export async function generateGlobalBRollPlan(
  chapters: { id: string; name: string; text: string }[],
  brollTypes: ('remotion' | 'generative' | 'artlist' | 'internet-clip' | 'user-capture' | 'infographic')[],
  provider: 'zhipu' | 'openai' | 'deepseek' | 'siliconflow' | 'kimi' = 'deepseek',
  model?: string
): Promise<GlobalBRollProposal> {
  return generateGlobalBRollPlanWithRetry(chapters, brollTypes, provider, model, 0);
}

const MAX_RETRIES = 2;

// 智能模板推荐函数 - 根据内容推荐合适的模板
function suggestTemplateFromContent(prompt: string, quote: string): string {
  const content = (prompt + quote).toLowerCase();

  if (content.match(/金句|名言|观点|quote|生命目标|涌现|核心|要旨|精髓/)) return 'TextReveal';
  if (content.match(/\d+[万千亿百万]|增长|统计|数据|指标|14.5万|0.839/)) return 'NumberCounter';
  if (content.match(/对比|vs|传统|觉醒|otto|inga|归因|涌现|分屏|对立|区别/)) return 'ComparisonSplit';
  if (content.match(/\d{4}|年份|年代|从.*到|演化|历史|时间线|编年|路线/)) return 'TimelineFlow';
  if (content.match(/象限|坐标|四象限|分布|矩阵/)) return 'DataChartQuadrant';
  if (content.match(/照片|图片|背景图|缩放|电影|氛围/)) return 'CinematicZoom';

  return 'ConceptChain'; // 兜底
}

async function generateGlobalBRollPlanWithRetry(
  chapters: { id: string; name: string; text: string }[],
  brollTypes: ('remotion' | 'generative' | 'artlist' | 'internet-clip' | 'user-capture' | 'infographic')[],
  provider: 'zhipu' | 'openai' | 'deepseek' | 'siliconflow' | 'kimi' = 'deepseek',
  model?: string,
  retryCount: number = 0,
  overrideUserMessage?: string
): Promise<GlobalBRollProposal> {
  const systemPrompt = buildDirectorSystemPrompt('broll');

  const userMessage = overrideUserMessage || `请作为导演，为以下完整视频剧本进行全局 B-roll 视觉规划。
你必须基于全局视角进行“排兵布阵”，决定哪些章节需要密集的视觉冲击（多几个方案），哪些章节适合保持克制。

可用的 B-roll 类型：${brollTypes.join(', ')}

剧本章节列表：
${chapters.map((ch, i) => `--- [第${i + 1}章: ${ch.name}] (ID: ${ch.id}) ---\n${ch.text}`).join('\n\n')}

输出要求：
1. 请输出一个 JSON 对象，结构如下：
{
  "chapters": [
    {
      "chapterId": "章节ID",
      "chapterName": "章节名称",
      "options": [
        {
          "name": "方案名",
          "type": "类型",
          "template": "可选，取决于 type",
          "props": "可选对象，取决于 template",
          "quote": "精准锚定章节中的1-2句原文（请确保引用文字完全匹配原文）",
          "prompt": "具体的视觉描述",
          "imagePrompt": "英文缩略图提示词",
          "rationale": "选择该类型的业务理由"
        }
      ]
    }
  ]
}
2. ⚠️ 最少要求：每一个章节必须至少生成 3 个 B-roll 方案！即使内容很简单，也必须提供 3 个不同视角/类型的方案。
3. 灵活分配：重点章节或高潮章节可以生成 4-8 个方案以增强视觉冲击力。
4. 严禁均分！请根据内容深度和情感起伏智能分配数量和类型。
5. 确保 quote 字段精准指向该章节内的具体行。

【输出格式示例】
{
  "chapters": [
    {
      "chapterId": "ch1",
      "chapterName": "章节名称",
      "options": [
        {
          "name": "金句展示",
          "type": "remotion",
          "template": "TextReveal",
          "props": { "text": "生命目标是涌现的", "textColor": "#ffffff" },
          "quote": "生命目标是涌现的",
          "prompt": "黑底金字缓缓浮现",
          "imagePrompt": "golden text on black background",
          "rationale": "使用 TextReveal 突出核心金句"
        },
        {
          "name": "数据冲击",
          "type": "remotion",
          "template": "NumberCounter",
          "props": { "title": "GitHub 星标", "endNumber": 145000, "suffix": "颗" },
          "quote": "14.5万星标",
          "prompt": "数字从0跑动到14.5万",
          "imagePrompt": "number counting animation",
          "rationale": "使用 NumberCounter 展示数据冲击力"
        }
      ]
    }
  ]
}
`;

  try {
    const response = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      provider as any,
      model || (provider === 'deepseek' ? 'deepseek-chat' : undefined)
    );

    let content = response.content.trim();
    // 更鲁棒的 JSON 提取：找到第一个 { 和最后一个 }
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      content = content.substring(startIndex, endIndex + 1);
    } else {
      throw new Error('未在模型输出中找到有效的 JSON 结构');
    }

    const parsed = JSON.parse(content);

    // Schema Validator for Remotion options
    const validationErrors: string[] = [];
    if (parsed.chapters && Array.isArray(parsed.chapters)) {
      parsed.chapters.forEach((ch: any) => {
        if (ch.options && Array.isArray(ch.options)) {
          ch.options.forEach((opt: any) => {
            if (opt.type === 'remotion') {
              // 强制要求 template 字段
              if (!opt.template || typeof opt.template !== 'string' || opt.template.trim() === '') {
                validationErrors.push(`remotion 类型的方案必须指定 template 字段（从以下选择：ConceptChain, DataChartQuadrant, TextReveal, NumberCounter, ComparisonSplit, TimelineFlow, CinematicZoom），当前选项【${opt.name}】缺少 template 字段。`);
              }

              // 原有模板验证逻辑
              if (opt.template === 'ConceptChain') {
                if (!opt.props?.nodes || !Array.isArray(opt.props.nodes) || opt.props.nodes.length < 2) {
                  validationErrors.push(`ConceptChain 模板需要 props.nodes 数组(至少2项)，当前选项【${opt.name}】不符合。`);
                }
              } else if (opt.template === 'DataChartQuadrant') {
                if (!opt.props?.quadrants || !Array.isArray(opt.props.quadrants) || opt.props.quadrants.length !== 4) {
                  validationErrors.push(`DataChartQuadrant 模板需要 props.quadrants 数组(严格4项)，当前选项【${opt.name}】不符合。`);
                }
              } else if (opt.template === 'TimelineFlow') {
                if (!opt.props?.nodes || !Array.isArray(opt.props.nodes) || opt.props.nodes.length < 2) {
                  validationErrors.push(`TimelineFlow 模板需要 props.nodes 数组(至少2个包含 year 和 event 的节点)，当前选项【${opt.name}】不符合。`);
                }
              } else if (opt.template === 'TextReveal') {
                if (typeof opt.props?.text !== 'string' || opt.props.text.length === 0) {
                  validationErrors.push(`TextReveal 模板需要 props.text 为有效字符串，当前选项【${opt.name}】不符合。`);
                }
              } else if (opt.template === 'NumberCounter') {
                if (typeof opt.props?.endNumber !== 'number') {
                  validationErrors.push(`NumberCounter 模板需要 props.endNumber 为数值，当前选项【${opt.name}】不符合。`);
                }
              } else if (opt.template === 'ComparisonSplit') {
                if (!opt.props?.leftTitle || !opt.props?.rightTitle) {
                  validationErrors.push(`ComparisonSplit 模板需要 props.leftTitle 和 rightTitle，当前选项【${opt.name}】不符合。`);
                }
              }
            }
          });
        }
      });
    }

    if (validationErrors.length > 0) {
      console.warn(`[llm.ts] Schema validation failed: ${validationErrors.join(' | ')}`);
      throw new Error(`VALIDATION_FAILED: ${validationErrors.join(' | ')}`);
    }

    return parsed as GlobalBRollProposal;
  } catch (error: any) {
    const isValidationError = error.message?.startsWith('VALIDATION_FAILED:');
    if (retryCount < MAX_RETRIES) {
      console.log(`[llm.ts] Generation failed, retrying (${retryCount + 1}/${MAX_RETRIES}). Reason: ${error.message}`);

      let retryPrompt = userMessage;
      if (isValidationError) {
        retryPrompt += `\n\n【注意！上次生成失败原因】\n你上次生成的数据结构有误，请修正：\n${error.message.replace('VALIDATION_FAILED: ', '')}`;

        // 如果是缺少 template 字段的错误，添加智能模板推荐
        if (error.message.includes('缺少 template 字段')) {
          retryPrompt += `\n\n【智能模板推荐指南】\n- 金句/名言/观点 → TextReveal\n- 数字/统计/数据 → NumberCounter\n- 对比/A vs B → ComparisonSplit\n- 历史/演化/时间线 → TimelineFlow\n- 象限/坐标分布 → DataChartQuadrant\n- 氛围/照片/缩放 → CinematicZoom\n`;
        }
      }

      // Internal recursive retry wrapper
      return generateGlobalBRollPlanWithRetry(chapters, brollTypes, provider, model, retryCount + 1, retryPrompt);
    }

    console.error('[llm.ts] Global LLM generation failed after retries:', error.message || error);
    // Fallback logic
    return {
      chapters: chapters.map(ch => ({
        chapterId: ch.id,
        chapterName: ch.name,
        options: generateFallbackOptions(brollTypes, ch.text)
      }))
    };
  }
}

export async function generateBRollOptions(
  chapterName: string,
  scriptText: string,
  brollTypes: ('remotion' | 'generative' | 'artlist' | 'internet-clip' | 'user-capture' | 'infographic')[],
  provider: 'zhipu' | 'openai' | 'deepseek' = 'deepseek'
): Promise<BRollOption[]> {
  const options: BRollOption[] = [];

  // 使用 skill-loader 注入 Director 方法论
  const systemPrompt = buildDirectorSystemPrompt('broll');

  const userMessage = `章节名称：${chapterName}
章节内容：${scriptText}

可用的 B-roll 类型：${brollTypes.join(', ')}

请根据章节内容的特点，智能选择最合适的 B-roll 类型（不必平均分配），为这个章节生成 B-Roll 视觉方案。`;

  try {
    const response = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      provider
    );

    // 清理 LLM 返回的 markdown code block wrapper
    let content = response.content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      options.push(...parsed);
    }
  } catch (error: any) {
    console.error('[llm.ts] LLM generation failed, using fallback:', error.message || error);
    return generateFallbackOptions(brollTypes, scriptText);
  }

  if (options.length < 1) {
    return generateFallbackOptions(brollTypes, scriptText);
  }

  return options;
}

export function generateFallbackOptions(
  types: ('remotion' | 'generative' | 'artlist' | 'internet-clip' | 'user-capture' | 'infographic')[],
  scriptText: string = ''
): BRollOption[] {
  const quote = scriptText.split(/[。！？\n]/).filter(s => s.trim()).slice(0, 2).join('。') || '原文引用';
  const typeLabels: Record<string, string> = { remotion: '数据可视化', generative: '概念意象', artlist: '空镜', 'internet-clip': '互联网素材', 'user-capture': '截图录屏', infographic: '信息图' };
  return types.map((type, index) => ({
    name: `${typeLabels[type] || type}-方案${index + 1}`,
    type,
    quote,
    prompt: `为该章节内容生成相关的 ${type} 风格视觉素材`,
    imagePrompt: `Abstract ${type} visual background, dark theme, minimal`,
    rationale: '兜底方案（LLM 生成失败）',
  }));
}

