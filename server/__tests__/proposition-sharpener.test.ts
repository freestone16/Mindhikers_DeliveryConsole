import { describe, expect, it, vi } from 'vitest';
import {
  applySharpenedProposition,
  sharpenProposition,
  SharpenResultSchema,
} from '../proposition-sharpener';

// Mock the llm module
vi.mock('../llm', () => ({
  callRoundtableLlm: vi.fn(),
}));

import { callRoundtableLlm } from '../llm';

describe('proposition-sharpener', () => {
  describe('sharpenProposition', () => {
    it('should handle empty input', async () => {
      const result = await sharpenProposition('');
      
      expect(result.isSharp).toBe(false);
      expect(result.clarifyingQuestions).toContain('请输入一个议题');
    });

    it('should handle whitespace-only input', async () => {
      const result = await sharpenProposition('   ');
      
      expect(result.isSharp).toBe(false);
    });

    it('should return sharp result for already sharp proposition (mocked)', async () => {
      const mockResponse = JSON.stringify({
        isSharp: true,
        reasoning: 'Already sharp',
      });
      
      vi.mocked(callRoundtableLlm).mockResolvedValueOnce(mockResponse);
      
      const result = await sharpenProposition('生成式 AI 应当被允许作为 K-12 学生的主要学习伙伴');
      
      expect(result.isSharp).toBe(true);
      expect(result.reasoning).toBe('Already sharp');
    });

    it('should return sharpened result for blunt proposition (mocked)', async () => {
      const mockResponse = JSON.stringify({
        isSharp: false,
        sharpened: '生成式 AI 应当被允许作为 K-12 学生的主要学习伙伴',
        clarifyingQuestions: [],
        reasoning: 'Added specificity and debate structure',
      });
      
      vi.mocked(callRoundtableLlm).mockResolvedValueOnce(mockResponse);
      
      const result = await sharpenProposition('AI 会改变教育');
      
      expect(result.isSharp).toBe(false);
      expect(result.sharpened).toBe('生成式 AI 应当被允许作为 K-12 学生的主要学习伙伴');
      expect(result.clarifyingQuestions).toEqual([]);
    });

    it('should return clarifying questions when needed (mocked)', async () => {
      const mockResponse = JSON.stringify({
        isSharp: false,
        clarifyingQuestions: ['你指的是哪个教育阶段？', '具体是 AI 的哪些应用？'],
        reasoning: 'Too vague',
      });
      
      vi.mocked(callRoundtableLlm).mockResolvedValueOnce(mockResponse);
      
      const result = await sharpenProposition('教育中的 AI');
      
      expect(result.isSharp).toBe(false);
      expect(result.clarifyingQuestions).toHaveLength(2);
      expect(result.sharpened).toBeUndefined();
    });

    it('should handle detect mode', async () => {
      const mockResponse = JSON.stringify({
        isSharp: false,
        sharpened: 'Some sharpened version',
        reasoning: 'Needs sharpening',
      });
      
      vi.mocked(callRoundtableLlm).mockResolvedValueOnce(mockResponse);
      
      const result = await sharpenProposition('AI 会改变教育', { mode: 'detect' });
      
      expect(result.isSharp).toBe(false);
      expect(result.sharpened).toBeUndefined(); // detect mode should not return sharpened
      expect(result.reasoning).toBe('Needs sharpening');
    });

    it('should fallback on LLM error', async () => {
      vi.mocked(callRoundtableLlm).mockRejectedValueOnce(new Error('API error'));
      
      const result = await sharpenProposition('Some proposition');
      
      expect(result.isSharp).toBe(true);
      expect(result.reasoning).toBe('Error fallback');
    });

    it('should fallback on invalid JSON response', async () => {
      vi.mocked(callRoundtableLlm).mockResolvedValueOnce('not valid json');
      
      const result = await sharpenProposition('Some proposition');
      
      expect(result.isSharp).toBe(true);
    });

    it('should truncate long input', async () => {
      const longProposition = 'A'.repeat(1000);
      
      const mockResponse = JSON.stringify({
        isSharp: true,
        reasoning: 'Already sharp',
      });
      
      vi.mocked(callRoundtableLlm).mockResolvedValueOnce(mockResponse);
      
      await sharpenProposition(longProposition);
      
      // Verify call was made (the truncated content would be passed)
      expect(callRoundtableLlm).toHaveBeenCalled();
    });
  });

  describe('applySharpenedProposition', () => {
    it('should return selected proposition', () => {
      const result = applySharpenedProposition(
        'AI 会改变教育',
        '生成式 AI 应当被允许作为 K-12 学生的主要学习伙伴'
      );
      
      expect(result.success).toBe(true);
      expect(result.finalProposition).toBe('生成式 AI 应当被允许作为 K-12 学生的主要学习伙伴');
    });

    it('should handle missing original', () => {
      const result = applySharpenedProposition('', 'some proposition');
      
      expect(result.success).toBe(false);
    });

    it('should handle missing selected', () => {
      const result = applySharpenedProposition('original', '');
      
      expect(result.success).toBe(false);
    });

    it('should truncate selected proposition to 500 chars', () => {
      const longProposition = 'A'.repeat(600);
      
      const result = applySharpenedProposition('original', longProposition);
      
      expect(result.success).toBe(true);
      expect(result.finalProposition.length).toBe(500);
    });
  });

  describe('SharpenResultSchema', () => {
    it('should validate valid sharp result', () => {
      const valid = {
        isSharp: true,
        reasoning: 'Already sharp',
      };
      
      const parsed = SharpenResultSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should validate valid sharpened result', () => {
      const valid = {
        isSharp: false,
        sharpened: 'Sharpened version',
        clarifyingQuestions: ['Question 1?', 'Question 2?'],
        reasoning: 'Too vague',
      };
      
      const parsed = SharpenResultSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should reject missing isSharp', () => {
      const invalid = {
        sharpened: 'Some text',
      };
      
      const parsed = SharpenResultSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('should allow optional fields to be missing', () => {
      const minimal = {
        isSharp: true,
      };
      
      const parsed = SharpenResultSchema.safeParse(minimal);
      expect(parsed.success).toBe(true);
    });
  });
});
