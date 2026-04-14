import { describe, expect, it } from 'vitest';

// Legacy single-prompt architecture test — superseded by two-phase orchestrator
// See: src/__tests__/crucible-orchestrator.test.ts (SaaS backsync)
describe.skip('legacy single-prompt', () => {
const PAIR = {
    challengerSlug: 'oldzhang',
    synthesizerSlug: 'oldlu',
    challengerName: '老张',
    synthesizerName: '老卢',
};

describe('crucible socrates prompt', () => {
    it('makes the host boundary explicit and keeps business judgement inside Socrates', () => {
        const prompt = buildSocratesPrompt(
            {
                topicTitle: 'AI 时代高质量内容真正稀缺的东西是什么',
                previousCards: [
                    {
                        prompt: '价值到底指什么',
                        answer: '我更关心思想启发和真实经验',
                    },
                ],
                roundIndex: 2,
                seedPrompt: 'AI 让很多人都能比较快地做出 70 分的内容',
                latestUserReply: '我想先看看最近两年的研究，再继续往下聊。',
            },
            PAIR,
            '保持追问定义、真实困惑与边界。',
            '老张：冷静、锐利、不讨好。'
        );

        expect(prompt).toContain('宿主只提供对话上下文、状态同步与结果回传，不替你做任何业务判断');
        expect(prompt).toContain('是否需要搜索、调研、查证、进入哪个阶段、是否调动 @Researcher / @FactChecker');
        expect(prompt).toContain('如果用户明确提出联网搜索、研究现状、外部资料或事实核查，你必须先正面响应这个需求');
    });

    it('keeps topic suggestion optional after round three', () => {
        const prompt = buildSocratesPrompt(
            {
                topicTitle: 'AI 时代高质量内容真正稀缺的东西是什么',
                previousCards: [],
                roundIndex: 3,
                seedPrompt: 'AI 让很多人都能比较快地做出 70 分的内容',
                latestUserReply: '我现在更想讨论判断力为什么比表达力更稀缺。',
            },
            PAIR,
            '保持追问定义、真实困惑与边界。',
            '老卢：温和、收束、能把主线托住。'
        );

        expect(prompt).toContain('topicSuggestion');
    });
});
});
