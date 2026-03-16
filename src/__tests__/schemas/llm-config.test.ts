import { describe, it, expect } from 'vitest';
import { LLMConfigSchema, DEFAULT_LLM_CONFIG, resolveGlobalLLMConfig } from '../../schemas/llm-config';

describe('LLMConfig Schema', () => {
  it('should validate default config', () => {
    const result = LLMConfigSchema.safeParse(DEFAULT_LLM_CONFIG);
    expect(result.success).toBe(true);
  });

  it('should reject invalid provider', () => {
    const config = {
      global: { provider: 'invalid' as any, model: 'test', baseUrl: null },
      generation: { imageModel: 'doubao-image-01', videoModel: 'doubao-video-01' },
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
    const result = LLMConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should allow null expert config (inherit global)', () => {
    const config = {
      global: { provider: 'siliconflow', model: 'Pro/moonshotai/Kimi-K2.5', baseUrl: 'https://api.siliconflow.cn/v1' },
      generation: { imageModel: 'doubao-image-01', videoModel: 'doubao-video-01' },
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
    const result = LLMConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should allow valid expert override', () => {
    const config = {
      global: { provider: 'siliconflow', model: 'Pro/moonshotai/Kimi-K2.5', baseUrl: 'https://api.siliconflow.cn/v1' },
      generation: { imageModel: 'doubao-image-01', videoModel: 'doubao-video-01' },
      experts: {
        crucible: null,
        writer: null,
        director: { 
          enabled: true, 
          llm: { provider: 'siliconflow', model: 'Qwen/Qwen2.5-72B-Instruct', baseUrl: null },
          imageModel: 'doubao-image-01',
          videoModel: 'doubao-video-01'
        },
        music: null,
        thumbnail: null,
        marketing: null,
        shorts: null,
      },
    };
    const result = LLMConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should resolve the configured global gateway', () => {
    const resolved = resolveGlobalLLMConfig({
      ...DEFAULT_LLM_CONFIG,
      global: {
        provider: 'deepseek',
        model: 'deepseek-chat',
        baseUrl: null,
      },
    });

    expect(resolved).toEqual({
      provider: 'deepseek',
      model: 'deepseek-chat',
      baseUrl: null,
    });
  });

  it('should fall back to the default global gateway when config is missing', () => {
    const resolved = resolveGlobalLLMConfig();

    expect(resolved).toEqual(DEFAULT_LLM_CONFIG.global);
  });
});
