import { z } from 'zod';

export const LLMProviderSchema = z.enum([
  'openai', 
  'anthropic', 
  'google', 
  'deepseek', 
  'zhipu'
]);

export const ExpertLLMConfigSchema = z.object({
  provider: LLMProviderSchema.nullable(),
  model: z.string().nullable(),
});

export const LLMConfigSchema = z.object({
  global: z.object({
    provider: LLMProviderSchema,
    model: z.string(),
    baseUrl: z.string().nullable(),
  }),
  experts: z.object({
    crucible: ExpertLLMConfigSchema.nullable(),
    writer: ExpertLLMConfigSchema.nullable(),
    director: ExpertLLMConfigSchema.nullable(),
    music: ExpertLLMConfigSchema.nullable(),
    thumbnail: ExpertLLMConfigSchema.nullable(),
    marketing: ExpertLLMConfigSchema.nullable(),
    shorts: ExpertLLMConfigSchema.nullable(),
  }),
});

export type LLMProvider = z.infer<typeof LLMProviderSchema>;
export type ExpertLLMConfig = z.infer<typeof ExpertLLMConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  global: {
    provider: 'openai',
    model: 'gpt-4o',
    baseUrl: null,
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
