import { describe, expect, it } from 'vitest';
import {
    SkillOutputPayloadSchema,
    SocratesDecisionSchema,
    ToolExecutionTraceSchema,
} from '../../schemas/crucible-runtime';

describe('crucible runtime schema', () => {
    it('validates a Socrates decision payload', () => {
        const decision = SocratesDecisionSchema.parse({
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
        });

        expect(decision.toolRequests[0]?.tool).toBe('Researcher');
    });

    it('validates a tool execution trace payload', () => {
        const trace = ToolExecutionTraceSchema.parse({
            tool: 'FactChecker',
            requestedBy: 'Socrates',
            mode: 'support',
            status: 'skipped',
            reason: '当前先保留校验位',
            input: {
                goal: '核对关键事实边界',
                scope: '关于 AI 创作主体性的外部说法',
            },
            output: {
                checked: false,
                claims: [],
                error: 'FactChecker 执行器骨架已接入',
            },
            error: 'FactChecker 执行器骨架已接入',
            startedAt: '2026-04-02T10:00:00.000Z',
            finishedAt: '2026-04-02T10:00:01.000Z',
        });

        expect(trace.status).toBe('skipped');
    });

    it('validates a composed Socrates output payload', () => {
        const payload = SkillOutputPayloadSchema.parse({
            speaker: 'oldzhang',
            reflection: '老张：这次外部补线不是为了堆材料，而是为了逼出你判断的盲点。',
            focus: '外部讨论真正新增了什么约束',
            presentables: [
                {
                    type: 'reference',
                    title: '外部补线',
                    summary: '先把新约束压到黑板上',
                    content: '外部材料提示我们，主体性不是抽象立场，而是具体创作判断的可验证差异。',
                },
            ],
            topicSuggestion: '主体性补线',
        });

        expect(payload.presentables).toHaveLength(1);
    });
});
