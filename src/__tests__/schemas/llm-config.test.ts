import { describe, it, expect } from 'vitest';
import {
  LLMConfigSchema,
  DEFAULT_LLM_CONFIG,
  resolveGlobalLLMConfig,
  normalizeGenerationConfig,
  normalizeExpertsConfig,
} from '../../schemas/llm-config';

describe('LLMConfig Schema', () => {
  it('should validate default config', () => {
    const result = LLMConfigSchema.safeParse(DEFAULT_LLM_CONFIG);
    expect(result.success).toBe(true);
  });

  it('should reject invalid provider', () => {
    const config = {
      global: { provider: 'invalid' as any, model: 'test', baseUrl: null },
      generation: DEFAULT_LLM_CONFIG.generation,
      experts: DEFAULT_LLM_CONFIG.experts,
    };
    const result = LLMConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should normalize legacy generation config into the new nested structure', () => {
    const generation = normalizeGenerationConfig({
      imageModel: 'gemini-2.5-flash-image',
      videoModel: 'doubao-seedance-1-0-lite',
    });

    expect(generation).toEqual({
      image: {
        provider: 'google',
        model: 'gemini-2.5-flash-image',
      },
      video: {
        provider: 'volcengine',
        model: 'doubao-seedance-1-0-lite',
      },
    });
  });

  it('should strip legacy expert visual overrides and keep llm override only', () => {
    const experts = normalizeExpertsConfig({
      director: {
        enabled: true,
        llm: { provider: 'kimi', model: 'kimi-k2.5', baseUrl: null },
        imageModel: 'gemini-2.5-flash-image',
        videoModel: 'doubao-seedance-1-5-pro',
      },
    });

    expect(experts.director).toEqual({
      enabled: true,
      llm: { provider: 'kimi', model: 'kimi-k2.5', baseUrl: null },
    });
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
