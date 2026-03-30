import { z } from 'zod';
import {
  GenProviderSchema,
  IMAGE_MODELS_BY_PROVIDER,
  VIDEO_MODELS_BY_PROVIDER,
  inferVisualProviderFromModel,
  type GenProvider,
  type VisualTaskType,
} from './visual-models';

export const LLMProviderSchema = z.enum([
  'openai',
  'deepseek',
  'zhipu',
  'siliconflow',
  'kimi',
  'volcengine',
  'yinli'
]);

export const ExpertLLMConfigSchema = z.object({
  provider: LLMProviderSchema.nullable(),
  model: z.string().nullable(),
  baseUrl: z.string().nullable(),
});

export const GenerationTargetSchema = z.object({
  provider: GenProviderSchema,
  model: z.string(),
});

export const GenerationConfigSchema = z.object({
  image: GenerationTargetSchema,
  video: GenerationTargetSchema,
});

export const ExpertConfigSchema = z.object({
  enabled: z.boolean(),
  llm: ExpertLLMConfigSchema.nullable(),
});

export const ExpertConfigMapSchema = z.object({
  crucible: ExpertConfigSchema.nullable(),
  writer: ExpertConfigSchema.nullable(),
  director: ExpertConfigSchema.nullable(),
  music: ExpertConfigSchema.nullable(),
  thumbnail: ExpertConfigSchema.nullable(),
  marketing: ExpertConfigSchema.nullable(),
  shorts: ExpertConfigSchema.nullable(),
});

export const LLMConfigSchema = z.object({
  global: z.object({
    provider: LLMProviderSchema,
    model: z.string(),
    baseUrl: z.string().nullable(),
  }),
  generation: GenerationConfigSchema,
  experts: ExpertConfigMapSchema,
});

export type LLMProvider = z.infer<typeof LLMProviderSchema>;
export type ExpertLLMConfig = z.infer<typeof ExpertLLMConfigSchema>;
export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;
export type GenerationTarget = z.infer<typeof GenerationTargetSchema>;
export type ExpertConfig = z.infer<typeof ExpertConfigSchema>;
export type ExpertConfigMap = z.infer<typeof ExpertConfigMapSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  global: {
    provider: 'siliconflow',
    model: 'Pro/moonshotai/Kimi-K2.5',
    baseUrl: 'https://api.siliconflow.cn/v1',
  },
  generation: {
    image: {
      provider: 'volcengine',
      model: 'doubao-seedream-4-5-251128',
    },
    video: {
      provider: 'volcengine',
      model: 'doubao-seedance-1-5-pro',
    },
  },
  experts: {
    crucible: null,
    writer: null,
    director: null,
    music: null,
    thumbnail: null,
    marketing: null,
    shorts: null,
  },
};

export const resolveGlobalLLMConfig = (config?: Partial<LLMConfig> | null) => {
  const hasGlobalConfig = Boolean(config?.global);
  const provider = config?.global?.provider || DEFAULT_LLM_CONFIG.global.provider;
  const model = config?.global?.model || DEFAULT_LLM_CONFIG.global.model;
  const baseUrl = hasGlobalConfig
    ? (config?.global?.baseUrl ?? null)
    : DEFAULT_LLM_CONFIG.global.baseUrl;

  return { provider, model, baseUrl };
};

export const PROVIDER_INFO: Record<string, {
  name: string;
  type: 'llm' | 'generation';
  envVars: string[];
  baseUrl: string;
  models: string[];
}> = {
  openai: {
    name: 'OpenAI',
    type: 'llm',
    envVars: ['OPENAI_API_KEY'],
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  },
  deepseek: {
    name: 'DeepSeek',
    type: 'llm',
    envVars: ['DEEPSEEK_API_KEY'],
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  zhipu: {
    name: 'Zhipu AI',
    type: 'llm',
    envVars: ['ZHIPU_API_KEY'],
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4', 'glm-4-flash', 'glm-4-plus'],
  },
  siliconflow: {
    name: 'SiliconFlow',
    type: 'llm',
    envVars: ['SILICONFLOW_API_KEY'],
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['Pro/moonshotai/Kimi-K2.5', 'Pro/deepseek-ai/DeepSeek-V3.2'],
  },
  kimi: {
    name: 'Kimi (Moonshot AI)',
    type: 'llm',
    envVars: ['KIMI_API_KEY'],
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['kimi-k2.5', 'moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
  },
  yinli: {
    name: 'Yinli的引力',
    type: 'llm',
    envVars: ['YINLI_API_KEY'],
    baseUrl: 'https://yinli.one/v1',
    models: ['claude-sonnet-4-6-thinking'],
  },
  google: {
    name: 'Google Gemini Image',
    type: 'generation',
    envVars: ['GOOGLE_API_KEY'],
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: IMAGE_MODELS_BY_PROVIDER.google.map((item) => item.id),
  },
  volcengine: {
    name: 'Volcengine (火山引擎)',
    type: 'generation',
    envVars: ['VOLCENGINE_ACCESS_KEY'],
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: [
      ...IMAGE_MODELS_BY_PROVIDER.volcengine.map((item) => item.id),
      ...VIDEO_MODELS_BY_PROVIDER.volcengine.map((item) => item.id),
    ],
  },
};

export const normalizeGenerationTarget = (
  taskType: VisualTaskType,
  target?: Partial<GenerationTarget> | null,
): GenerationTarget => {
  const fallback = DEFAULT_LLM_CONFIG.generation[taskType];
  const inferredProvider = inferVisualProviderFromModel(taskType, target?.model);
  const provider = target?.provider || inferredProvider || fallback.provider;
  const options = taskType === 'image'
    ? IMAGE_MODELS_BY_PROVIDER[provider]
    : VIDEO_MODELS_BY_PROVIDER[provider];

  if (!options.length) return fallback;

  const model = options.some((item) => item.id === target?.model)
    ? target!.model!
    : options[0].id;

  return {
    provider,
    model,
  };
};

export const normalizeGenerationConfig = (generation?: unknown): GenerationConfig => {
  if (!generation || typeof generation !== 'object') {
    return DEFAULT_LLM_CONFIG.generation;
  }

  const raw = generation as {
    image?: Partial<GenerationTarget> | null;
    video?: Partial<GenerationTarget> | null;
    imageModel?: string | null;
    videoModel?: string | null;
  };

  return {
    image: normalizeGenerationTarget('image', raw.image || (raw.imageModel ? { model: raw.imageModel } : undefined)),
    video: normalizeGenerationTarget('video', raw.video || (raw.videoModel ? { model: raw.videoModel } : undefined)),
  };
};

const normalizeExpertLLMConfig = (raw?: unknown): ExpertLLMConfig | null => {
  if (!raw || typeof raw !== 'object') return null;

  const candidate = raw as Partial<ExpertLLMConfig>;
  const provider = candidate.provider ?? null;
  const model = candidate.model ?? null;
  const baseUrl = candidate.baseUrl ?? null;

  if (provider === null && model === null && baseUrl === null) {
    return null;
  }

  return ExpertLLMConfigSchema.parse({
    provider,
    model,
    baseUrl,
  });
};

export const normalizeExpertConfig = (raw?: unknown): ExpertConfig | null => {
  if (!raw || typeof raw !== 'object') return null;

  const candidate = raw as {
    enabled?: unknown;
    llm?: unknown;
  };

  return {
    enabled: Boolean(candidate.enabled),
    llm: normalizeExpertLLMConfig(candidate.llm),
  };
};

export const normalizeExpertsConfig = (experts?: unknown): ExpertConfigMap => {
  const raw = (experts && typeof experts === 'object') ? experts as Record<string, unknown> : {};

  return {
    crucible: normalizeExpertConfig(raw.crucible),
    writer: normalizeExpertConfig(raw.writer),
    director: normalizeExpertConfig(raw.director),
    music: normalizeExpertConfig(raw.music),
    thumbnail: normalizeExpertConfig(raw.thumbnail),
    marketing: normalizeExpertConfig(raw.marketing),
    shorts: normalizeExpertConfig(raw.shorts),
  };
};

/**
 * 归一化 provider/model/baseUrl 三字段联动
 * 切换 provider 时自动修正 model 和 baseUrl，防止错配
 */
export function normalizeProviderConfig(
  provider: string,
  model?: string | null,
  _baseUrl?: string | null
): { provider: LLMProvider; model: string; baseUrl: string } {
  const info = PROVIDER_INFO[provider];
  if (!info || info.type !== 'llm') {
    const fallback = PROVIDER_INFO.deepseek;
    return { provider: 'deepseek', model: fallback.models[0], baseUrl: fallback.baseUrl };
  }

  const validModel = (model && info.models.includes(model)) ? model : info.models[0];
  return { provider, model: validModel, baseUrl: info.baseUrl };
}

export const EXPERT_LIST = [
  { id: 'crucible', name: 'Crucible', icon: '🔥', description: '思维拆解' },
  { id: 'writer', name: 'Writer', icon: '✍️', description: '文稿撰写' },
  { id: 'director', name: 'Director', icon: '🎬', description: '分镜策划' },
  { id: 'music', name: 'Music', icon: '🎵', description: '音乐总监' },
  { id: 'thumbnail', name: 'Thumbnail', icon: '🖼️', description: '缩略图' },
  { id: 'marketing', name: 'Marketing', icon: '📢', description: 'SEO/推广' },
  { id: 'shorts', name: 'Shorts', icon: '⚡', description: '短视频' },
];

export {
  GenProviderSchema,
  IMAGE_MODELS_BY_PROVIDER,
  VIDEO_MODELS_BY_PROVIDER,
};

export type { GenProvider };
