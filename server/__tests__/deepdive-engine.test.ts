import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildDeepDiveContext, askDeepDiveQuestion, summarizeDeepDive } from '../deepdive-engine';
import type { DeepDiveSession, RoundtableSession, Spike } from '../roundtable-types';
import { callRoundtableLlm } from '../llm';

vi.mock('../llm', () => ({
  callRoundtableLlm: vi.fn(),
}));

const mockCallRoundtableLlm = vi.mocked(callRoundtableLlm);

const createBaseSession = (): RoundtableSession => ({
  id: 'session-1',
  proposition: '正义是内在和谐还是外部规则？',
  sharpenedProposition: '正义的本质是内在德性还是社会契约？',
  selectedSlugs: ['socrates', 'naval'],
  status: 'completed',
  rounds: [
    {
      roundIndex: 0,
      turns: [
        {
          speakerSlug: 'socrates',
          utterance: '正义是灵魂的和谐，而非外部规则。只有当内在秩序建立，外在正义才有可能。',
          action: '反驳',
          briefSummary: '正义是灵魂和谐',
          challengedTarget: 'naval',
          stanceVector: { carePriority: 0.4, libertyPriority: 0.8, authorityPriority: 0.2 },
          timestamp: 100,
        },
        {
          speakerSlug: 'naval',
          utterance: '正义是让贡献者获益的规则体系。灵魂和谐无法量化，但规则可以。',
          action: '陈述',
          briefSummary: '正义是外部规则',
          timestamp: 110,
        },
      ],
      synthesis: {
        summary: '出现核心分歧',
        focusPoint: 'socrates 认为正义是内在和谐，naval 认为正义是外部规则',
        tensionLevel: 4,
        suggestedDirections: ['追问正义边界'],
      },
    },
  ],
  createdAt: 1,
  updatedAt: 2,
});

const createBaseSpike = (): Spike => ({
  id: 'spike-1',
  title: '正义的本质分歧',
  summary: '内在和谐与外部规则之争',
  content: 'socrates 认为正义是灵魂和谐，naval 认为正义是规则体系',
  bridgeHint: '正义的衡量标准是内在的还是外在的？',
  sourceSpeaker: 'socrates',
  roundIndex: 0,
  timestamp: 100,
  tensionLevel: 4,
});

const mockPersona = {
  displayName: '苏格拉底',
  slug: 'socrates',
  era: '古希腊',
  honestBoundary: '无知之知——我只知道我一无所知',
};

describe('deepdive-engine', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('buildDeepDiveContext', () => {
    it('includes persona info, proposition, spike context, and rules', async () => {
      const session = createBaseSession();
      const spike = createBaseSpike();

      const context = await buildDeepDiveContext({ session, spike, personaProfile: mockPersona });

      expect(context).toContain('苏格拉底');
      expect(context).toContain('古希腊');
      expect(context).toContain('正义是内在和谐还是外部规则？');
      expect(context).toContain('正义的本质分歧');
      expect(context).toContain('灵魂的和谐');
      expect(context).toContain('无知之知');
      expect(context).toContain('200-500 字');
    });

    it('handles missing round synthesis gracefully', async () => {
      const session = createBaseSession();
      session.rounds[0].synthesis = undefined;
      const spike = createBaseSpike();

      const context = await buildDeepDiveContext({ session, spike, personaProfile: mockPersona });

      expect(context).toContain('苏格拉底');
      expect(context).not.toContain('本轮综合');
    });
  });

  describe('askDeepDiveQuestion', () => {
    it('returns philosopher turn on successful LLM call', async () => {
      mockCallRoundtableLlm.mockResolvedValueOnce('正义的种子在灵魂深处发芽，而非写在法典上。');

      const session = createBaseSession();
      const spike = createBaseSpike();
      const deepDiveSession: DeepDiveSession = {
        id: 'dd-1',
        parentSessionId: session.id,
        spikeId: spike.id,
        spikeTitle: spike.title,
        spikeContent: spike.content,
        sourceSpeaker: spike.sourceSpeaker,
        status: 'active',
        turns: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = await askDeepDiveQuestion({
        deepDiveSession,
        question: '如果灵魂和谐无法被测量，你如何知道正义已经实现？',
        personaProfile: mockPersona,
        session,
        spike,
      });

      expect(result.role).toBe('philosopher');
      expect(result.content).toBe('正义的种子在灵魂深处发芽，而非写在法典上。');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('returns fallback message when LLM fails', async () => {
      mockCallRoundtableLlm.mockRejectedValueOnce(new Error('API error'));

      const session = createBaseSession();
      const spike = createBaseSpike();
      const deepDiveSession: DeepDiveSession = {
        id: 'dd-1',
        parentSessionId: session.id,
        spikeId: spike.id,
        spikeTitle: spike.title,
        spikeContent: spike.content,
        sourceSpeaker: spike.sourceSpeaker,
        status: 'active',
        turns: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = await askDeepDiveQuestion({
        deepDiveSession,
        question: '请解释',
        personaProfile: mockPersona,
        session,
        spike,
      });

      expect(result.role).toBe('philosopher');
      expect(result.content).toBe('追问未获得有效回复，请重试。');
    });

    it('includes conversation history in prompt when turns exist', async () => {
      mockCallRoundtableLlm.mockResolvedValueOnce('进一步的回答');

      const session = createBaseSession();
      const spike = createBaseSpike();
      const deepDiveSession: DeepDiveSession = {
        id: 'dd-1',
        parentSessionId: session.id,
        spikeId: spike.id,
        spikeTitle: spike.title,
        spikeContent: spike.content,
        sourceSpeaker: spike.sourceSpeaker,
        status: 'active',
        turns: [
          { role: 'user', content: '第一个问题', timestamp: 100 },
          { role: 'philosopher', content: '第一个回答', timestamp: 101 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await askDeepDiveQuestion({
        deepDiveSession,
        question: '追问',
        personaProfile: mockPersona,
        session,
        spike,
      });

      expect(mockCallRoundtableLlm).toHaveBeenCalledTimes(1);
      const callArgs = mockCallRoundtableLlm.mock.calls[0][0];
      const userMessage = callArgs.messages[1].content;
      expect(userMessage).toContain('对话历史');
      expect(userMessage).toContain('第一个问题');
      expect(userMessage).toContain('第一个回答');
    });
  });

  describe('summarizeDeepDive', () => {
    it('parses valid JSON summary from LLM', async () => {
      mockCallRoundtableLlm.mockResolvedValueOnce(JSON.stringify({
        title: '正义的本质探讨',
        coreInsight: '正义既需要内在德性也需要外在制度',
        keyQuotes: ['正义的种子在灵魂深处'],
        remainingTension: '灵魂和谐与规则正义能否统一仍未解决',
        nextSteps: ['追问制度设计的哲学基础'],
      }));

      const spike = createBaseSpike();
      const deepDiveSession: DeepDiveSession = {
        id: 'dd-1',
        parentSessionId: 'session-1',
        spikeId: spike.id,
        spikeTitle: spike.title,
        spikeContent: spike.content,
        sourceSpeaker: spike.sourceSpeaker,
        status: 'active',
        turns: [
          { role: 'user', content: '问题', timestamp: 100 },
          { role: 'philosopher', content: '回答', timestamp: 101 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = await summarizeDeepDive({ deepDiveSession, spike });

      expect(result.title).toBe('正义的本质探讨');
      expect(result.coreInsight).toContain('内在德性');
      expect(result.keyQuotes).toHaveLength(1);
      expect(result.remainingTension).toBeTruthy();
    });

    it('returns fallback summary when LLM fails', async () => {
      mockCallRoundtableLlm.mockRejectedValueOnce(new Error('API error'));

      const spike = createBaseSpike();
      const deepDiveSession: DeepDiveSession = {
        id: 'dd-1',
        parentSessionId: 'session-1',
        spikeId: spike.id,
        spikeTitle: spike.title,
        spikeContent: spike.content,
        sourceSpeaker: spike.sourceSpeaker,
        status: 'active',
        turns: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = await summarizeDeepDive({ deepDiveSession, spike });

      expect(result.title).toBe('深聊总结');
      expect(result.coreInsight).toBe('（生成失败）');
      expect(result.keyQuotes).toEqual([]);
    });

    it('handles LLM response wrapped in markdown code block', async () => {
      mockCallRoundtableLlm.mockResolvedValueOnce('```json\n' + JSON.stringify({
        title: '深聊标题',
        coreInsight: '核心洞察',
        keyQuotes: [],
        remainingTension: '未解张力',
        nextSteps: [],
      }) + '\n```');

      const spike = createBaseSpike();
      const deepDiveSession: DeepDiveSession = {
        id: 'dd-1',
        parentSessionId: 'session-1',
        spikeId: spike.id,
        spikeTitle: spike.title,
        spikeContent: spike.content,
        sourceSpeaker: spike.sourceSpeaker,
        status: 'active',
        turns: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = await summarizeDeepDive({ deepDiveSession, spike });

      expect(result.title).toBe('深聊标题');
      expect(result.coreInsight).toBe('核心洞察');
    });
  });
});
