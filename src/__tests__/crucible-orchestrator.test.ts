import { describe, expect, it } from 'vitest';
import {
    buildSocratesCompositionPrompt,
    buildSocratesDecisionPrompt,
    type SocratesDecision,
    type ToolExecutionTrace,
} from '../../server/crucible-orchestrator';

const pair = {
    challengerSlug: 'oldzhang',
    synthesizerSlug: 'oldlu',
    challengerName: '老张',
    synthesizerName: '老卢',
};

describe('crucible orchestrator prompts', () => {
    it('asks Socrates to output a structured decision instead of host-side search flags', () => {
        const prompt = buildSocratesDecisionPrompt(
            {
                topicTitle: 'AI 时代创作的主体性',
                previousCards: [],
                roundIndex: 3,
                seedPrompt: 'AI 正在逼近内容生产主链',
                latestUserReply: '我希望你通过互联网给我一些新的输入，然后我们继续讨论。',
            },
            pair,
            '保持追问定义、真实困惑与边界。',
            '老张：冷静、锐利、不讨好。',
        );

        expect(prompt).toContain('是否联网、是否查证、调哪些工具，必须由你决定');
        expect(prompt).toContain('"toolRequests"');
        expect(prompt).not.toContain('searchRequested');
    });

    it('injects real tool traces into the composition prompt', () => {
        const decision: SocratesDecision = {
            version: 'decision-v1',
            speaker: 'oldzhang',
            reflectionIntent: '先补一刀外部材料，再继续压边界。',
            focus: '外部讨论到底补充了什么新约束',
            needsResearch: true,
            needsFactCheck: false,
            toolRequests: [
                {
                    tool: 'Researcher',
                    mode: 'support',
                    reason: '用户明确要求补充外部材料',
                    query: 'AI时代创作的主体性 最新研究',
                    goal: '补近两年外部讨论与研究线索',
                },
            ],
            stageLabel: '外部补线',
        };
        const traces: ToolExecutionTrace[] = [
            {
                tool: 'Researcher',
                requestedBy: 'Socrates',
                mode: 'support',
                status: 'success',
                reason: '用户明确要求补充外部材料',
                input: {
                    query: 'AI时代创作的主体性 最新研究',
                    goal: '补近两年外部讨论与研究线索',
                },
                output: {
                    query: 'AI时代创作的主体性 最新研究',
                    connected: true,
                    sources: [{ title: 'Result A', url: 'https://example.com/a', snippet: 'Snippet A' }],
                },
                startedAt: '2026-04-02T10:00:00.000Z',
                finishedAt: '2026-04-02T10:00:01.000Z',
            },
        ];

        const prompt = buildSocratesCompositionPrompt(
            {
                topicTitle: 'AI 时代创作的主体性',
                previousCards: [],
                roundIndex: 3,
                seedPrompt: 'AI 正在逼近内容生产主链',
                latestUserReply: '我希望你通过互联网给我一些新的输入，然后我们继续讨论。',
            },
            pair,
            '保持追问定义、真实困惑与边界。',
            '老张：冷静、锐利、不讨好。',
            decision,
            traces,
        );

        expect(prompt).toContain('工具执行结果（真实 runtime trace）');
        expect(prompt).toContain('https://example.com/a');
        expect(prompt).toContain('不能假装某工具成功执行过');
    });
});
