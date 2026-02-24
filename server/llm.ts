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

export const SYSTEM_PROMPTS = {
  brollGenerator: `你是一个专业的视频分镜策划助手。根据给定的章节脚本内容，为该章节生成恰好3个B-Roll视觉方案。

要求：
- 必须生成恰好3个方案，全部为remotion类型
- 每个方案必须包含：
  1. name: 方案名称（如"粒子动画"、"数据图表"、"渐变背景"）
  2. type: "remotion"（固定）
  3. quote: 从原文中提取的1-2句话，作为此B-roll对应的原文定位
  4. prompt: 详细的视觉描述，用于生成Remotion动画的简述方案，需说明具体动画效果、颜色、元素
  5. imagePrompt: 用于生成缩略图的英文提示词，应该是一个简洁的静态画面描述，适合作为视频关键帧

请以JSON数组格式输出，不要有其他内容。格式如下：
[
  {
    "name": "粒子汇聚动画",
    "type": "remotion",
    "quote": "当AI可以用一句话生成大片的时候，真正被改变的不光是影视和相关行业",
    "prompt": "蓝色粒子从画面四周向中心汇聚，逐渐形成文字标题，粒子有光晕效果",
    "imagePrompt": "Futuristic data particles converging into text, blue glowing particles, dark background, cinematic lighting"
  },
  {
    "name": "动态数据图表",
    "type": "remotion", 
    "quote": "内容领域将迎来史无前例的通货膨胀",
    "prompt": "折线图从左到右动态生长，数据点有脉冲动画，背景为深色渐变",
    "imagePrompt": "Dynamic line chart growing from left to right, data points with pulse effect, dark blue gradient background"
  },
  {
    "name": "光效渐变背景",
    "type": "remotion",
    "quote": "真正被改变的是我们每个人和'意义'之间的关系",
    "prompt": "柔和的蓝紫渐变背景，光晕缓慢移动，营造沉浸氛围",
    "imagePrompt": "Soft purple gradient background with slowly moving light orbs, immersive atmosphere, minimalist"
  }
]`,
};

export interface BRollOption {
  name: string;
  type: 'remotion' | 'generative' | 'artlist';
  quote: string;
  prompt: string;
  imagePrompt?: string;
}

export async function generateBRollOptions(
  chapterName: string,
  scriptText: string,
  brollTypes: ('remotion' | 'generative' | 'artlist')[],
  provider: 'zhipu' | 'openai' | 'deepseek' = 'deepseek'
): Promise<BRollOption[]> {
  const options: BRollOption[] = [];
  
  const userMessage = `章节名称：${chapterName}
章节内容：${scriptText}

需要生成的类型：${brollTypes.join(', ')}

请为这个章节生成 B-Roll 视觉方案。`;

  try {
    const response = await callLLM(
      [
        { role: 'system', content: SYSTEM_PROMPTS.brollGenerator },
        { role: 'user', content: userMessage },
      ],
      provider
    );

    const parsed = JSON.parse(response.content);
    if (Array.isArray(parsed)) {
      options.push(...parsed);
    }
  } catch (error) {
    console.error('LLM generation failed, using fallback:', error);
    return generateFallbackOptions(brollTypes, scriptText);
  }

  const remotionOptions = options.filter(o => o.type === 'remotion');
  if (remotionOptions.length < 3) {
    const fallback = generateFallbackOptions(['remotion', 'remotion', 'remotion'], scriptText);
    const existingNames = new Set(options.map(o => o.name));
    for (const f of fallback) {
      if (!existingNames.has(f.name)) {
        options.push(f);
      }
      if (options.filter(o => o.type === 'remotion').length >= 3) break;
    }
  }

  return options;
}

function generateFallbackOptions(
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
  }));
}
