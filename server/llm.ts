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

export async function callLLM(
  messages: LLMMessage[],
  provider: 'zhipu' | 'openai' | 'deepseek' | 'anthropic' = 'deepseek',
  model?: string
): Promise<LLMResponse> {
  switch (provider) {
    case 'zhipu':
      return callZhipuLLM(messages, model || 'glm-4');
    case 'openai':
      return callOpenAILLM(messages, model || 'gpt-4o');
    case 'deepseek':
      return callDeepSeekLLM(messages, model || 'deepseek-chat');
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
  type: 'remotion' | 'generative' | 'artlist';
  quote: string;
  prompt: string;
  imagePrompt?: string;
  rationale?: string;
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
  brollTypes: ('remotion' | 'generative' | 'artlist')[],
  provider: 'zhipu' | 'openai' | 'deepseek' = 'deepseek'
): Promise<GlobalBRollProposal> {
  const systemPrompt = buildDirectorSystemPrompt('broll');

  const userMessage = `请作为导演，为以下完整视频剧本进行全局 B-roll 视觉规划。
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
          "quote": "精准锚定章节中的1-2句原文（请确保引用文字完全匹配原文）",
          "prompt": "具体的视觉描述",
          "imagePrompt": "英文缩略图提示词",
          "rationale": "选择该类型的业务理由"
        }
      ]
    }
  ]
}
2. 每一个章节必须至少有 1 个方案（即使是普通叙事），高潮章节建议 3-5 个方案。
3. 严禁均分！请根据内容深度和情感起伏智能分配类型。
4. 确保 quote 字段精准指向该章节内的具体行。
`;

  try {
    const response = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      provider,
      provider === 'deepseek' ? 'deepseek-chat' : undefined
    );

    let content = response.content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    const parsed = JSON.parse(content);
    return parsed as GlobalBRollProposal;
  } catch (error) {
    console.error('Global LLM generation failed:', error);
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
  brollTypes: ('remotion' | 'generative' | 'artlist')[],
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
  } catch (error) {
    console.error('LLM generation failed, using fallback:', error);
    return generateFallbackOptions(brollTypes, scriptText);
  }

  if (options.length < 1) {
    return generateFallbackOptions(brollTypes, scriptText);
  }

  return options;
}

export function generateFallbackOptions(
  types: ('remotion' | 'generative' | 'artlist')[],
  scriptText: string = ''
): BRollOption[] {
  const quote = scriptText.split(/[。！？\n]/).filter(s => s.trim()).slice(0, 2).join('。') || '原文引用';
  return types.map((type, index) => ({
    name: `${type === 'remotion' ? '数据可视化' : type === 'generative' ? '概念意象' : '空镜'}-方案${index + 1}`,
    type,
    quote,
    prompt: `为该章节内容生成相关的 ${type} 风格视觉素材`,
    imagePrompt: `Abstract ${type} visual background, dark theme, minimal`,
    rationale: '兜底方案（LLM 生成失败）',
  }));
}

