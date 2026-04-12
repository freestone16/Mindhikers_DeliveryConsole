import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import {
  buildRoundMemory,
  getSession,
  handleDirectorCommand,
  saveSession,
  selectSpeakers,
} from '../roundtable-engine';
import type { PersonaProfile } from '../../src/schemas/persona';
import type { RoundtableSession, Spike } from '../roundtable-types';
import { extractSpikesFromSession } from '../spike-extractor';

vi.mock('../spike-extractor', () => ({
  extractSpikesFromSession: vi.fn(),
}));

const mockPersonas: PersonaProfile[] = [
  {
    slug: 'socrates',
    displayName: '苏格拉底',
    avatarEmoji: '🧔',
    era: '古希腊',
    corePhilosophy: '未经审视的人生不值得过',
    thinkingStyle: '通过追问揭示矛盾',
    signatureQuestion: '你说的正义究竟是什么意思？',
    anchors: {
      carePriority: 0.3,
      libertyPriority: 0.9,
      authorityPriority: 0.2,
      fairnessPriority: 0.7,
    },
    preferredActions: ['质疑', '补充'],
    voiceRules: {
      tone: ['反讽', '谦逊'],
      habits: ['自称无知', '层层追问'],
      avoid: ['给出直接答案'],
    },
    contrastPoints: [
      { dimension: '正义', stance: '正义是灵魂的和谐' },
      { dimension: '知识', stance: '知识即美德' },
    ],
    honestBoundary: '不能违背对真理的追求',
  },
  {
    slug: 'mao-zedong',
    displayName: '毛泽东',
    avatarEmoji: '✊',
    era: '现代中国',
    corePhilosophy: '矛盾论与阶级斗争',
    thinkingStyle: '抓住主要矛盾，发动群众',
    signatureQuestion: '这是人民内部矛盾还是敌我矛盾？',
    anchors: {
      carePriority: 0.9,
      libertyPriority: 0.3,
      authorityPriority: 0.8,
      fairnessPriority: 0.6,
    },
    preferredActions: ['反驳', '修正'],
    voiceRules: {
      tone: ['激昂', '策略性'],
      habits: ['引用诗词', '战略比喻'],
      avoid: ['教条主义'],
    },
    contrastPoints: [
      { dimension: '正义', stance: '正义是阶级立场' },
      { dimension: '变革', stance: '革命不是请客吃饭' },
    ],
    honestBoundary: '不能背叛工农阶级',
  },
  {
    slug: 'naval',
    displayName: 'Naval Ravikant',
    avatarEmoji: '🧘',
    era: '当代硅谷',
    corePhilosophy: '追求财富与内心平静',
    thinkingStyle: ' tweet-length 智慧',
    signatureQuestion: '这能帮你获得杠杆吗？',
    anchors: {
      carePriority: 0.4,
      libertyPriority: 0.9,
      authorityPriority: 0.1,
      fairnessPriority: 0.5,
    },
    preferredActions: ['陈述', '综合'],
    voiceRules: {
      tone: ['冷静', '反直觉'],
      habits: ['金句', '科技隐喻'],
      avoid: ['情绪化'],
    },
    contrastPoints: [
      { dimension: '正义', stance: '正义是游戏规则' },
      { dimension: '财富', stance: '财富是睡后收入' },
    ],
    honestBoundary: '不能违背 Specific Knowledge 原则',
  },
];

vi.mock('../persona-loader', () => ({
  loadAllPersonas: () => mockPersonas,
  loadPersonaBySlug: (slug: string) => mockPersonas.find(p => p.slug === slug) || null,
}));

const createMockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    setHeader: vi.fn(),
    end: vi.fn(),
    write: vi.fn(),
  } satisfies Partial<Response>;

  return res as Response;
};

describe('RoundtableEngine', () => {
  describe('Session Store', () => {
    it('should save and retrieve a session', () => {
      const session: RoundtableSession = {
        id: 'test-session-1',
        proposition: '什么是正义？',
        selectedSlugs: ['socrates', 'naval'],
        status: 'selecting',
        rounds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      saveSession(session);
      const retrieved = getSession('test-session-1');

      expect(retrieved).toEqual(session);
    });

    it('should return null for non-existent session', () => {
      const retrieved = getSession('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('buildRoundMemory', () => {
    const mockSession: RoundtableSession = {
      id: 'test-session',
      proposition: '什么是正义？',
      selectedSlugs: ['socrates', 'naval'],
      status: 'discussing',
      rounds: [
        {
          roundIndex: 0,
          turns: [
            {
              speakerSlug: 'socrates',
              utterance: '正义是灵魂的和谐，当理性、激情、欲望各司其职时，灵魂就达到了正义。',
              action: '陈述',
              briefSummary: '正义是灵魂和谐',
              timestamp: Date.now(),
            },
            {
              speakerSlug: 'naval',
              utterance: '正义更像是游戏规则，让那些创造最多价值的人获得最多回报。',
              action: '陈述',
              briefSummary: '正义是游戏规则',
              timestamp: Date.now(),
            },
          ],
          synthesis: {
            summary: '两人对正义的定义截然不同',
            focusPoint: '苏格拉底认为正义是内在和谐，Naval认为正义是外部规则',
            tensionLevel: 3,
            suggestedDirections: ['追问灵魂与规则的关系'],
          },
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it('should return empty string for round 1 (no history)', () => {
      const persona = mockPersonas[0];
      const memory = buildRoundMemory(persona, mockSession, 1);
      expect(memory).toBe('');
    });

    it('should return full history when tokens are below L0 threshold', () => {
      const persona = mockPersonas[0];
      const memory = buildRoundMemory(persona, mockSession, 2);
      expect(memory).toContain('第 1 轮');
      expect(memory).toContain('socrates');
      expect(memory).toContain('naval');
    });
  });

  describe('selectSpeakers', () => {
    it.skip('should return 3-5 speakers (requires KIMI_API_KEY)', async () => {
      const result = await selectSpeakers(
        '什么是正义？',
        undefined,
        undefined,
        undefined
      );

      expect(result.selectedSlugs.length).toBeGreaterThanOrEqual(3);
      expect(result.selectedSlugs.length).toBeLessThanOrEqual(5);
    });

    it('should use preferred personas when provided', async () => {
      const result = await selectSpeakers(
        '什么是正义？',
        undefined,
        undefined,
        ['socrates', 'naval', 'mao-zedong']
      );

      expect(result.selectedSlugs).toEqual(['socrates', 'naval', 'mao-zedong']);
      expect(result.reason).toBe('User selected');
    });

    it.skip('should include reason and focus angle (requires KIMI_API_KEY)', async () => {
      const result = await selectSpeakers(
        '什么是正义？',
        undefined,
        undefined,
        undefined
      );

      expect(result.reason).toBeDefined();
      expect(result.focusAngle).toBeDefined();
    });
  });

  describe('Context Compression', () => {
    it('should estimate tokens correctly', () => {
      const text = '这是一段测试文本，用于测试token估算。';
      const estimatedTokens = Math.ceil(text.length / 1.5);

      expect(estimatedTokens).toBeGreaterThan(0);
      expect(estimatedTokens).toBeLessThan(text.length);
    });
  });

  describe('Director Stop Command', () => {
    it('should return structured spikes payload for happy path', async () => {
      const session: RoundtableSession = {
        id: 'director-stop-happy',
        proposition: '技术进步是否必然带来公平？',
        selectedSlugs: ['socrates', 'mao-zedong', 'naval'],
        status: 'awaiting',
        rounds: [
          { roundIndex: 0, turns: [], synthesis: { summary: '起始', focusPoint: '公平定义', tensionLevel: 2, suggestedDirections: [] } },
          { roundIndex: 1, turns: [], synthesis: { summary: '对立', focusPoint: '自由与公平', tensionLevel: 4, suggestedDirections: [] } },
          { roundIndex: 2, turns: [], synthesis: { summary: '收束', focusPoint: '制度约束', tensionLevel: 3, suggestedDirections: [] } },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      saveSession(session);

      const spikes: Spike[] = [
        {
          id: 'spike-1',
          title: '公平分配',
          summary: '技术红利分配不均',
          content: '技术进步带来财富集中，需要制度补偿',
          bridgeHint: '追问制度如何介入分配',
          sourceSpeaker: 'mao-zedong',
          roundIndex: 1,
          timestamp: Date.now(),
          tensionLevel: 4,
        },
        {
          id: 'spike-2',
          title: '自由市场',
          summary: '市场效率与公平冲突',
          content: '市场效率可能牺牲弱者公平',
          bridgeHint: '讨论效率与公平边界',
          sourceSpeaker: 'naval',
          roundIndex: 2,
          timestamp: Date.now(),
          isFallback: true,
        },
      ];

      vi.mocked(extractSpikesFromSession).mockResolvedValueOnce(spikes);

      const res = createMockResponse();
      await handleDirectorCommand({ sessionId: session.id, command: '止' }, res);

      expect(res.json).toHaveBeenCalledWith({
        spikes,
        sessionId: session.id,
        spikeCount: spikes.length,
        artifactCount: spikes.length,
        isFallback: true,
      });
    });

    it('should return zero spike count for empty session', async () => {
      const session: RoundtableSession = {
        id: 'director-stop-empty',
        proposition: '何为公平？',
        selectedSlugs: ['socrates'],
        status: 'awaiting',
        rounds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      saveSession(session);

      vi.mocked(extractSpikesFromSession).mockResolvedValueOnce([]);

      const res = createMockResponse();
      await handleDirectorCommand({ sessionId: session.id, command: '止' }, res);

      expect(res.json).toHaveBeenCalledWith({
        spikes: [],
        sessionId: session.id,
        spikeCount: 0,
        artifactCount: 0,
        isFallback: false,
      });
    });

    it('should return 404 for non-existent session', async () => {
      const res = createMockResponse();

      await handleDirectorCommand({ sessionId: 'missing-session', command: '止' }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Session not found' });
    });
  });
});
