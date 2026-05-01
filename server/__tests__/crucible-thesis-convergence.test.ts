import { describe, it, expect } from 'vitest';
import { detectThesisConvergence } from '../crucible';

const buildDecision = (stageLabel?: string) => ({
    version: 'decision-v1',
    speaker: 'socrates',
    reflectionIntent: 'test',
    focus: 'test',
    needsResearch: false,
    needsFactCheck: false,
    toolRequests: [],
    stageLabel,
});

describe('detectThesisConvergence', () => {
    it('round 5 socrates crystallization → true', () => {
        expect(detectThesisConvergence(5, 'socrates', buildDecision('crystallization'))).toBe(true);
    });

    it('round 6 socrates crystallization → true', () => {
        expect(detectThesisConvergence(6, 'socrates', buildDecision('crystallization'))).toBe(true);
    });

    it('round 5 socrates exploration → false', () => {
        expect(detectThesisConvergence(5, 'socrates', buildDecision('exploration'))).toBe(false);
    });

    it('round 4 socrates crystallization → false (round too low)', () => {
        expect(detectThesisConvergence(4, 'socrates', buildDecision('crystallization'))).toBe(false);
    });

    it('round 5 fallback crystallization → false (wrong source)', () => {
        expect(detectThesisConvergence(5, 'fallback', buildDecision('crystallization'))).toBe(false);
    });

    it('round 5 socrates no decision → false', () => {
        expect(detectThesisConvergence(5, 'socrates', undefined)).toBe(false);
    });
});
