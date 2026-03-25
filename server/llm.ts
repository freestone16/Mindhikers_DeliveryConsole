import process from 'process';
import type { LLMProvider } from '../src/schemas/llm-config';

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

/**
 * 安全解析 LLM 返回的 JSON。
 * 如果直接解析失败（通常因为 svgPrompt 中的 SVG 代码引号冲突），
 * 尝试剥离 svgPrompt 字段来拯救其余数据。
 */
function safeParseLLMJson(raw: string): any {
  // 第一次尝试：直接解析
  try {
    return JSON.parse(raw);
  } catch (firstError: any) {
    console.warn(`[llm.ts] ⚠️ JSON parse failed: ${firstError.message}, attempting repair...`);
  }

  // 修复策略：移除 svgPrompt 字段（它含有破坏 JSON 的 SVG 代码）
  // 逐字符扫描找到 "svgPrompt" 字段并安全删除
  let repaired = raw;
  let searchFrom = 0;
  const svgPromptKey = '"svgPrompt"';

  while (true) {
    const keyPos = repaired.indexOf(svgPromptKey, searchFrom);
    if (keyPos === -1) break;

    // 找到冒号后面的值开始位置
    const colonPos = repaired.indexOf(':', keyPos + svgPromptKey.length);
    if (colonPos === -1) break;

    const valueStart = repaired.indexOf('"', colonPos + 1);
    if (valueStart === -1) break;

    // 逐字符找到字符串值的真正结尾：
    // 未转义的引号后面紧跟 , 或 } 或 ]（允许空白）
    let i = valueStart + 1;
    while (i < repaired.length) {
      if (repaired[i] === '\\') {
        i += 2; // 跳过转义字符
        continue;
      }
      if (repaired[i] === '"') {
        // 检查这个引号后面是否是 JSON 结构字符
        const afterQuote = repaired.substring(i + 1).trimStart();
        if (afterQuote[0] === ',' || afterQuote[0] === '}' || afterQuote[0] === ']') {
          // 找到了真正的字段结束位置
          break;
        }
      }
      i++;
    }

    if (i >= repaired.length) {
      // 没找到合法结尾，直接跳过
      searchFrom = keyPos + svgPromptKey.length;
      continue;
    }

    // 删除从 keyPos 前的逗号到 valueEnd（包含引号）
    const valueEnd = i + 1;
    // 检查前面是否有逗号需要一起删除
    let deleteStart = keyPos;
    const before = repaired.substring(0, keyPos).trimEnd();
    if (before.endsWith(',')) {
      deleteStart = before.lastIndexOf(',');
    }

    // 检查后面是否有逗号
    const afterStr = repaired.substring(valueEnd).trimStart();
    let deleteEnd = valueEnd;
    if (afterStr[0] === ',') {
      deleteEnd = repaired.indexOf(',', valueEnd) + 1;
    }

    repaired = repaired.substring(0, deleteStart) + repaired.substring(deleteEnd);
    console.warn(`[llm.ts] ⚠️ Stripped broken svgPrompt field at position ${keyPos}`);
    // 继续搜索（位置不需要前进，因为字符串已缩短）
  }

  // 清理可能的尾随逗号
  repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

  try {
    const result = JSON.parse(repaired);
    console.log('[llm.ts] ✅ JSON repair succeeded (svgPrompt fields stripped)');
    return result;
  } catch (secondError: any) {
    console.error(`[llm.ts] ❌ JSON repair also failed: ${secondError.message}`);
    throw secondError;
  }
}

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
  provider: LLMProvider = 'deepseek',
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
  svgPrompt?: string;
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
  provider: LLMProvider = 'deepseek',
  model?: string
): Promise<GlobalBRollProposal> {
  return generateGlobalBRollPlanWithRetry(chapters, brollTypes, provider, model, 0);
}

const MAX_RETRIES = 2;

async function generateGlobalBRollPlanWithRetry(
  chapters: { id: string; name: string; text: string }[],
  brollTypes: ('remotion' | 'generative' | 'artlist' | 'internet-clip' | 'user-capture' | 'infographic')[],
  provider: LLMProvider = 'deepseek',
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
1. 请严格按照系统提示中定义的 JSON 结构和模板规范输出。当 type 为 "remotion" 时，template 和 props 必须严格遵循系统提示中的 Remotion 组件速查表。
2. ⚠️ 最少要求：每一个章节必须至少生成 3 个 B-roll 方案！即使内容很简单，也必须提供 3 个不同视角/类型的方案。
3. 灵活分配：重点章节或高潮章节可以生成 4-8 个方案以增强视觉冲击力。
4. 严禁均分！请根据内容深度和情感起伏智能分配数量和类型。
5. 确保 quote 字段精准指向该章节内的具体行。
6. ⚠️ **imagePrompt 底图规则**：remotion 类型方案中至少 50% 必须提供 imagePrompt（用于 Seedream 文生图底图），不要全部留空。infographic 类型也鼓励提供 imagePrompt 作为底图。底图能大幅提升视觉丰富度。
`;

  try {
    const response = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      provider,
      model
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

    const parsed = safeParseLLMJson(content);

    // 透传校验：仅 warn，不降级不阻断（模板知识由导演大师 skill 管理）
    if (parsed.chapters && Array.isArray(parsed.chapters)) {
      parsed.chapters.forEach((ch: any) => {
        if (ch.options && Array.isArray(ch.options)) {
          ch.options.forEach((opt: any) => {
            if (opt.type === 'remotion') {
              if (!opt.template || typeof opt.template !== 'string' || opt.template.trim() === '') {
                console.warn(`[llm.ts] ⚠️ Remotion option【${opt.name}】缺少 template 字段，将透传给 Remotion CLI（可能 fallback 到 SceneComposer）`);
              }
              if (!opt.props || typeof opt.props !== 'object') {
                console.warn(`[llm.ts] ⚠️ Remotion option【${opt.name}】缺少 props 字段`);
              }
            }
          });
        }
      });
    }

    return parsed as GlobalBRollProposal;
  } catch (error: any) {
    const isValidationError = error.message?.startsWith('VALIDATION_FAILED:');
    if (retryCount < MAX_RETRIES) {
      console.log(`[llm.ts] Generation failed, retrying (${retryCount + 1}/${MAX_RETRIES}). Reason: ${error.message}`);

      let retryPrompt = userMessage;
      if (isValidationError) {
        retryPrompt += `\n\n【注意！上次生成失败原因】\n你上次生成的数据结构有误，请修正：\n${error.message.replace('VALIDATION_FAILED: ', '')}`;
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
  provider: LLMProvider = 'deepseek'
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

    const parsed = safeParseLLMJson(content);
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

