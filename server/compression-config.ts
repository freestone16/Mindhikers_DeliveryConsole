import { CompressionConfig } from './roundtable-types';

const LLM_TIER = (process.env.LLM_TIER as 'kimi-k2.5' | 'gpt-5.4' | 'opus-4.6') || 'kimi-k2.5';

export const COMPRESSION_PRESETS: Record<string, CompressionConfig> = {
  'kimi-k2.5': {
    modelName: 'Kimi K2.5',
    contextWindowTokens: 256_000,
    effectiveInputTokens: 179_200,
    costBreakpoint: undefined,
    hasBuiltinCompaction: false,
    l0Threshold: 50_000,
    l1Threshold: 130_000,
  },
  'gpt-5.4': {
    modelName: 'GPT 5.4',
    contextWindowTokens: 1_050_000,
    effectiveInputTokens: 922_000,
    costBreakpoint: 272_000,
    hasBuiltinCompaction: false,
    l0Threshold: 100_000,
    l1Threshold: 250_000,
  },
  'opus-4.6': {
    modelName: 'Opus 4.6',
    contextWindowTokens: 1_000_000,
    effectiveInputTokens: 872_000,
    costBreakpoint: undefined,
    hasBuiltinCompaction: true,
    l0Threshold: 200_000,
    l1Threshold: 500_000,
  },
};

export const activeConfig: CompressionConfig = COMPRESSION_PRESETS[LLM_TIER] || COMPRESSION_PRESETS['kimi-k2.5'];
export function estimateHistoryTokens(session: {
  rounds: Array<{
    turns: Array<{ utterance: string }>;
  }>;
}, upToRound: number): number {
  let total = 0;
  for (let i = 0; i < upToRound; i++) {
    for (const turn of session.rounds[i]?.turns || []) {
      total += Math.ceil(turn.utterance.length / 1.5);
    }
  }
  return total;
}
