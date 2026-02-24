import { describe, it, expect } from 'vitest';
import { LLMConfigSchema, DEFAULT_LLM_CONFIG } from '../../schemas/llm-config';

describe('LLMConfig Schema', () => {
  it('should validate default config', () => {
    const result = LLMConfigSchema.safeParse(DEFAULT_LLM_CONFIG);
    expect(result.success).toBe(true);
  });

  it('should reject invalid provider', () => {
    const config = {
      global: { provider: 'invalid', model: 'test', baseUrl: null },
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
      global: { provider: 'openai', model: 'gpt-4o', baseUrl: null },
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
      global: { provider: 'openai', model: 'gpt-4o', baseUrl: null },
      experts: {
        crucible: null,
        writer: null,
        director: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
        music: null,
        thumbnail: null,
        marketing: null,
        shorts: null,
      },
    };
    const result = LLMConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});
