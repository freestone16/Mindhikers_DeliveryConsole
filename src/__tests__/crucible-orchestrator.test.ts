import { describe, expect, it } from 'vitest';
import { createCrucibleOrchestratorPlan } from '../../server/crucible-orchestrator';

describe('createCrucibleOrchestratorPlan', () => {
    it('keeps searchRequested false before the user asks to search', () => {
        const plan = createCrucibleOrchestratorPlan({
            topicTitle: 'AI 时代高质量内容真正稀缺的东西是什么',
            previousCards: [
                {
                    prompt: '价值到底指什么',
                    answer: '我更关心思想启发和真实经验',
                },
                {
                    prompt: '你当前的直觉是什么',
                    answer: '真实经验、判断力、穿透力结构可能更稀缺',
                },
            ],
            roundIndex: 2,
            seedPrompt: 'AI 让很多人都能比较快地做出 70 分的内容',
            latestUserReply: '我现在的直觉是，稀缺的可能不是写作技巧本身。',
        });

        expect(plan.searchRequested).toBe(false);
        expect(plan.toolRoutes.find((route) => route.tool === 'Researcher')?.mode).toBe('hold');
    });

    it('detects a contextual search request from the latest user reply', () => {
        const plan = createCrucibleOrchestratorPlan({
            topicTitle: 'AI 时代高质量内容真正稀缺的东西是什么',
            previousCards: [
                {
                    prompt: '价值到底指什么',
                    answer: '我更关心思想启发和真实经验',
                },
                {
                    prompt: '你当前的直觉是什么',
                    answer: '真实经验、判断力、穿透力结构可能更稀缺',
                },
            ],
            roundIndex: 3,
            seedPrompt: 'AI 让很多人都能比较快地做出 70 分的内容',
            latestUserReply: '基于我们刚才这个问题，我想先联网搜索一下最近一两年的研究或讨论，再继续往下聊。',
        });

        expect(plan.searchRequested).toBe(true);
        expect(plan.phase).toBe('deep_dialogue');
        expect(plan.toolRoutes.find((route) => route.tool === 'Researcher')?.mode).toBe('support');
    });
});
