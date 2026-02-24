import { z } from 'zod';

export const LLMProviderSchema = z.enum([
  'openai', 
  'anthropic', 
  'google', 
  'deepseek', 
  'zhipu',
  'siliconflow',
  'volcengine'
]);

export const GenProviderSchema = z.enum(['volcengine', 'siliconflow']);

export const ExpertLLMConfigSchema = z.object({
  provider: LLMProviderSchema.nullable(),
  model: z.string().nullable(),
  baseUrl: z.string().nullable(),
});

export const GenerationConfigSchema = z.object({
  imageModel: z.string().nullable(),
  videoModel: z.string().nullable(),
});

export const ExpertConfigSchema: z.ZodType<{
  enabled: boolean;
  llm: { provider: string | null; model: string | null; baseUrl: string | null } | null;
  imageModel: string | null;
  videoModel: string | null;
}> = z.object({
  enabled: z.boolean(),
  llm: ExpertLLMConfigSchema.nullable(),
  imageModel: z.string().nullable(),
  videoModel: z.string().nullable(),
});

export const LLMConfigSchema = z.object({
  global: z.object({
    provider: LLMProviderSchema,
    model: z.string(),
    baseUrl: z.string().nullable(),
  }),
  generation: z.object({
    imageModel: z.string(),
    videoModel: z.string(),
  }),
  experts: z.object({
    crucible: ExpertConfigSchema.nullable(),
    writer: ExpertConfigSchema.nullable(),
    director: ExpertConfigSchema.nullable(),
    music: ExpertConfigSchema.nullable(),
    thumbnail: ExpertConfigSchema.nullable(),
    marketing: ExpertConfigSchema.nullable(),
    shorts: ExpertConfigSchema.nullable(),
  }),
});

export type LLMProvider = z.infer<typeof LLMProviderSchema>;
export type GenProvider = z.infer<typeof GenProviderSchema>;
export type ExpertLLMConfig = z.infer<typeof ExpertLLMConfigSchema>;
export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;
export type ExpertConfig = z.infer<typeof ExpertConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  global: {
    provider: 'siliconflow',
    model: 'Pro/moonshotai/Kimi-K2.5',
    baseUrl: 'https://api.siliconflow.cn/v1',
  },
  generation: {
    imageModel: 'doubao-image-01',
    videoModel: 'doubao-video-01',
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
  anthropic: {
    name: 'Anthropic',
    type: 'llm',
    envVars: ['ANTHROPIC_API_KEY'],
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
  },
  google: {
    name: 'Google',
    type: 'llm',
    envVars: ['GOOGLE_API_KEY'],
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  deepseek: {
    name: 'DeepSeek',
    type: 'llm',
    envVars: ['DEEPSEEK_API_KEY'],
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
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
    models: ['Pro/moonshotai/Kimi-K2.5', 'Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-V2.5', 'THUDM/glm-4-9b-chat'],
  },
  volcengine: {
    name: 'Volcengine (火山引擎)',
    type: 'generation',
    envVars: ['VOLCENGINE_ACCESS_KEY'],
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: ['doubao-seedream-4-5', 'doubao-seedance-pro'],
  },
};

export const IMAGE_MODELS = [
  { id: 'doubao-image-01', name: '豆包图片生成 (doubao-image-01)' },
  { id: 'kolors', name: 'Kolors (SiliconFlow)' },
  { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL' },
];

export const VIDEO_MODELS = [
  { id: 'doubao-video-01', name: '豆包视频生成 (doubao-video-01)' },
  { id: 'wan2.1-t2v-14b', name: 'Wan2.1 T2V 14B' },
];

export const EXPERT_LIST = [
  { id: 'crucible', name: 'Crucible', icon: '🔥', description: '思维拆解' },
  { id: 'writer', name: 'Writer', icon: '✍️', description: '文稿撰写' },
  { id: 'director', name: 'Director', icon: '🎬', description: '分镜策划' },
  { id: 'music', name: 'Music', icon: '🎵', description: '音乐总监' },
  { id: 'thumbnail', name: 'Thumbnail', icon: '🖼️', description: '缩略图' },
  { id: 'marketing', name: 'Marketing', icon: '📢', description: 'SEO/推广' },
  { id: 'shorts', name: 'Shorts', icon: '⚡', description: '短视频' },
];
