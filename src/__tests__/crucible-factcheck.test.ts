import { describe, expect, it } from 'vitest';
import { performCrucibleFactCheck } from '../../server/crucible-factcheck';

describe('crucible factchecker executor skeleton', () => {
    it('returns a structured unavailable result instead of host-side fake business output', async () => {
        const result = await performCrucibleFactCheck({
            goal: '核对关键事实边界',
            scope: '关于 AI 创作主体性的外部说法',
        });

        expect(result.checked).toBe(false);
        expect(result.scope).toBe('关于 AI 创作主体性的外部说法');
        expect(result.error).toContain('执行器骨架已接入');
    });
});
