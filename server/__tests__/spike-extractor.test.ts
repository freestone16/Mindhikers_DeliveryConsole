import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractSpikesFromSession } from '../spike-extractor';
import type { RoundtableSession } from '../roundtable-types';
import { callRoundtableLlm } from '../llm';

vi.mock('../llm', () => ({
  callRoundtableLlm: vi.fn(),
}));

const createBaseSession = (rounds: RoundtableSession['rounds']): RoundtableSession => ({
  id: 'session-1',
  proposition: '什么是正义？',
  selectedSlugs: ['socrates', 'naval'],
  status: 'completed',
  rounds,
  createdAt: 1,
  updatedAt: 2,
});

describe('spike-extractor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('happy path: returns structured spikes with full fields', async () => {
    const session = createBaseSession([
      {
        roundIndex: 0,
        turns: [
          {
            speakerSlug: 'socrates',
            utterance: '正义是灵魂的和谐，而非外部规则。',
            action: '反驳',
            briefSummary: '正义是灵魂和谐而非外部规则',
            challengedTarget: 'naval',
            stanceVector: { carePriority: 0.4, libertyPriority: 0.8, authorityPriority: 0.2 },
            timestamp: 100,
          },
          {
            speakerSlug: 'naval',
            utterance: '正义是外部游戏规则，让贡献者获益。',
            action: '陈述',
            briefSummary: '正义是外部游戏规则',
            timestamp: 110,
          },
        ],
        synthesis: {
          summary: '出现核心分歧',
          focusPoint: 'socrates 认为正义是内在和谐，naval 认为正义是外部规则',
          tensionLevel: 4,
          suggestedDirections: ['继续追问正义边界'],
        },
      },
      {
        roundIndex: 1,
        turns: [
          {
            speakerSlug: 'naval',
            utterance: '规则来自共识，未必来自灵魂。',
            action: '质疑',
            briefSummary: '规则来自共识非灵魂',
            timestamp: 200,
          },
        ],
        synthesis: {
          summary: '分歧持续',
          focusPoint: 'socrates 认为正义内在，naval 强调共识规则',
          tensionLevel: 3,
          suggestedDirections: ['追问共识的来源'],
        },
      },
    ]);

    (callRoundtableLlm as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify([
        {
          sourceIndex: 0,
          title: '正义的内在性',
          summary: '正义应来自灵魂结构',
          content: '正义不是外部游戏规则，而是灵魂和谐的内在秩序。',
          bridgeHint: '外在规则与内在秩序的分歧值得继续深聊',
        },
      ])
    );

    const spikes = await extractSpikesFromSession(session, { maxSpikes: 5 });

    expect(spikes.length).toBeGreaterThan(0);
    expect(spikes.length).toBeLessThanOrEqual(5);
    for (const spike of spikes) {
      expect(spike.id).toBeTruthy();
      expect(spike.title).toBeTruthy();
      expect(spike.summary).toBeTruthy();
      expect(spike.content).toBeTruthy();
      expect(spike.bridgeHint).toBeTruthy();
      expect(spike.sourceSpeaker).toBeTruthy();
      expect(spike.roundIndex).toBeTypeOf('number');
      expect(spike.timestamp).toBeTypeOf('number');
    }
  });

  it('edge case: no conflict returns empty array', async () => {
    const session = createBaseSession([
      {
        roundIndex: 0,
        turns: [
          {
            speakerSlug: 'socrates',
            utterance: '正义是灵魂的和谐。',
            action: '陈述',
            briefSummary: '正义是灵魂和谐',
            timestamp: 100,
          },
        ],
        synthesis: {
          summary: '平稳陈述',
          focusPoint: '',
          tensionLevel: 1,
          suggestedDirections: ['继续展开定义'],
        },
      },
    ]);

    const spikes = await extractSpikesFromSession(session, { maxSpikes: 5 });

    expect(spikes).toEqual([]);
    expect(callRoundtableLlm).not.toHaveBeenCalled();
  });

  it('edge case: empty session returns empty array', async () => {
    const session = createBaseSession([]);

    const spikes = await extractSpikesFromSession(session, { maxSpikes: 5 });

    expect(spikes).toEqual([]);
    expect(callRoundtableLlm).not.toHaveBeenCalled();
  });

  it('error path: LLM failure triggers fallback spikes', async () => {
    const session = createBaseSession([
      {
        roundIndex: 0,
        turns: [
          {
            speakerSlug: 'socrates',
            utterance: '正义不是外部规则，而是灵魂结构。',
            action: '质疑',
            briefSummary: '正义是内在秩序',
            timestamp: 100,
          },
        ],
        synthesis: {
          summary: '出现分歧',
          focusPoint: 'socrates 认为正义是内在秩序',
          tensionLevel: 3,
          suggestedDirections: ['继续追问正义来源'],
        },
      },
    ]);

    (callRoundtableLlm as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('LLM down'));

    const spikes = await extractSpikesFromSession(session, { maxSpikes: 3 });

    expect(spikes.length).toBeGreaterThan(0);
    expect(spikes[0].isFallback).toBe(true);
  });

  it('integration: focusPoint mention promotes speaker spike', async () => {
    const session = createBaseSession([
      {
        roundIndex: 0,
        turns: [
          {
            speakerSlug: 'naval',
            utterance: '规则来自共识，而不是灵魂。',
            action: '陈述',
            briefSummary: '规则来自共识',
            timestamp: 100,
          },
        ],
        synthesis: {
          summary: '主持人点名',
          focusPoint: 'naval 认为规则来自共识',
          tensionLevel: 2,
          suggestedDirections: ['追问共识形成机制'],
        },
      },
    ]);

    (callRoundtableLlm as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify([
        {
          sourceIndex: 0,
          title: '共识的正义观',
          summary: '规则来自共识的主张',
          content: '正义更像共识形成的外部规则，而非内在灵魂秩序。',
          bridgeHint: '共识如何形成值得继续深聊',
        },
      ])
    );

    const spikes = await extractSpikesFromSession(session, { maxSpikes: 2 });

    expect(spikes.length).toBe(1);
    expect(spikes[0].sourceSpeaker).toBe('naval');
  });
});
