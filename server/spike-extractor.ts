import { randomUUID } from 'crypto';
import { callRoundtableLlm } from './llm';
import type {
  PhilosopherTurn,
  RoundtableSession,
  Spike,
} from './roundtable-types';

interface SpikeCandidate {
  turn: PhilosopherTurn;
  roundIndex: number;
  score: number;
  tensionLevel?: 1 | 2 | 3 | 4 | 5;
  focusPointMatch: boolean;
}

const DEFAULT_MAX_SPIKES = 5;
const MAX_CANDIDATE_MULTIPLIER = 2;

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, ' ');

const truncateText = (value: string, maxLength: number): string => {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.slice(0, maxLength);
};

const buildTurnSignature = (turn: PhilosopherTurn, roundIndex: number): string => {
  return `${turn.speakerSlug}-${roundIndex}`;
};

const getCandidateScore = (
  turn: PhilosopherTurn,
  tensionLevel: 1 | 2 | 3 | 4 | 5 | undefined,
  focusPointMatch: boolean
): number => {
  let score = 0;

  if (turn.action === '反驳') {
    score += 3;
  } else if (turn.action === '质疑') {
    score += 2;
  } else if (turn.action === '修正') {
    score += 1;
  }

  if (turn.stanceVector) {
    score += 1;
  }

  if (tensionLevel && tensionLevel >= 4) {
    score += 2;
  } else if (tensionLevel === 3) {
    score += 1;
  }

  if (turn.challengedTarget) {
    score += 2;
  }

  if (focusPointMatch) {
    score += 1;
  }

  return score;
};

const buildCandidates = (session: RoundtableSession): SpikeCandidate[] => {
  const candidates: SpikeCandidate[] = [];

  for (const round of session.rounds) {
    const tensionLevel = round.synthesis?.tensionLevel;
    const focusPoint = round.synthesis?.focusPoint || '';

    for (const turn of round.turns) {
      const focusPointMatch = focusPoint.includes(turn.speakerSlug);
      const isActionCandidate = ['质疑', '反驳', '修正'].includes(turn.action);
      const hasStance = Boolean(turn.stanceVector);

      if (!isActionCandidate && !hasStance && !focusPointMatch) {
        continue;
      }

      const score = getCandidateScore(turn, tensionLevel, focusPointMatch);

      candidates.push({
        turn,
        roundIndex: round.roundIndex,
        score,
        tensionLevel,
        focusPointMatch,
      });
    }
  }

  return candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const tensionDiff = (b.tensionLevel || 0) - (a.tensionLevel || 0);
    if (tensionDiff !== 0) {
      return tensionDiff;
    }
    return b.turn.timestamp - a.turn.timestamp;
  });
};

const buildCandidatePrompt = (candidates: SpikeCandidate[]): string => {
  return candidates
    .map((candidate, index) => {
      const { turn, roundIndex } = candidate;
      return `${index}. speaker: ${turn.speakerSlug} | round: ${roundIndex + 1} | action: ${turn.action}
summary: ${normalizeText(turn.briefSummary)}
utterance: ${normalizeText(turn.utterance)}`;
    })
    .join('\n\n');
};

const parseJsonArray = (response: string): unknown => {
  let content = response.trim();

  if (content.startsWith('```json')) {
    content = content.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (content.startsWith('```')) {
    content = content.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    const startIndex = content.indexOf('[');
    const endIndex = content.lastIndexOf(']');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const jsonStr = content.substring(startIndex, endIndex + 1);
      return JSON.parse(jsonStr);
    }
    throw error;
  }
};

const buildSpikeFromCandidate = (
  candidate: SpikeCandidate,
  payload: {
    title: string;
    summary: string;
    content: string;
    bridgeHint: string;
  },
  isFallback: boolean
): Spike => {
  const { turn, roundIndex, tensionLevel } = candidate;

  return {
    id: randomUUID(),
    title: truncateText(payload.title || turn.briefSummary, 15),
    summary: truncateText(payload.summary || turn.briefSummary, 30),
    content: truncateText(payload.content || turn.utterance || turn.briefSummary, 80),
    bridgeHint: normalizeText(payload.bridgeHint || '该发言触及关键分歧，适合继续深聊'),
    sourceSpeaker: turn.speakerSlug,
    roundIndex,
    timestamp: turn.timestamp,
    sourceTurnIds: [buildTurnSignature(turn, roundIndex)],
    tensionLevel,
    isFallback: isFallback ? true : undefined,
  };
};

const buildFallbackPayload = (candidate: SpikeCandidate) => {
  const { turn, roundIndex, tensionLevel } = candidate;
  const baseSummary = turn.briefSummary || turn.utterance;
  const title = truncateText(baseSummary || '关键分歧', 15);
  const summary = truncateText(baseSummary || '讨论出现关键分歧', 30);
  const content = truncateText(turn.utterance || baseSummary || '讨论出现关键分歧', 80);
  const tensionHint = tensionLevel ? `张力等级 ${tensionLevel}/5` : '张力等级未知';

  return {
    title,
    summary,
    content,
    bridgeHint: `第 ${roundIndex + 1} 轮出现${turn.action}，${tensionHint}，值得继续深聊`,
  };
};

const buildFallbackSpikes = (candidates: SpikeCandidate[], maxSpikes: number): Spike[] => {
  return candidates.slice(0, maxSpikes).map(candidate => {
    return buildSpikeFromCandidate(candidate, buildFallbackPayload(candidate), true);
  });
};

const buildSpikesFromLlm = (
  candidates: SpikeCandidate[],
  response: string,
  maxSpikes: number
): Spike[] => {
  const parsed = parseJsonArray(response);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('LLM spike response invalid');
  }

  const spikes: Spike[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const sourceIndex = Number((item as { sourceIndex?: number }).sourceIndex);
    if (Number.isNaN(sourceIndex) || sourceIndex < 0 || sourceIndex >= candidates.length) {
      continue;
    }
    const payload = item as {
      title?: string;
      summary?: string;
      content?: string;
      bridgeHint?: string;
    };

    spikes.push(
      buildSpikeFromCandidate(
        candidates[sourceIndex],
        {
          title: payload.title || '',
          summary: payload.summary || '',
          content: payload.content || '',
          bridgeHint: payload.bridgeHint || '',
        },
        false
      )
    );

    if (spikes.length >= maxSpikes) {
      break;
    }
  }

  if (spikes.length === 0) {
    throw new Error('LLM spike response empty');
  }

  return spikes;
};

export async function extractSpikesFromSession(
  session: RoundtableSession,
  options?: { maxSpikes?: number }
): Promise<Spike[]> {
  const maxSpikes = options?.maxSpikes ?? DEFAULT_MAX_SPIKES;
  if (!session.rounds.length || maxSpikes <= 0) {
    return [];
  }

  // Step A — 规则初筛
  const candidates = buildCandidates(session);
  if (candidates.length === 0) {
    return [];
  }

  const limitedCandidates = candidates.slice(0, maxSpikes * MAX_CANDIDATE_MULTIPLIER);
  const candidatesFormatted = buildCandidatePrompt(limitedCandidates);

  const prompt = `你是圆桌讨论的 Spike 提取专家。以下是从一场圆桌讨论中筛选出的高价值候选发言。
你的任务是将它们压缩为结构化 Spike，每个 Spike 必须包含足够信息供后续深聊桥接。

【讨论命题】${session.proposition}

【候选发言】
${candidatesFormatted}

【输出要求】严格 JSON 数组，1-${maxSpikes} 条：
[
  {
    "sourceIndex": 0,
    "title": "≤15字标题",
    "summary": "≤30字摘要",
    "content": "≤80字核心洞察",
    "bridgeHint": "为什么这条值得继续深聊"
  }
]`;

  // Step B — LLM 精炼
  try {
    const response = await callRoundtableLlm({
      messages: [
        { role: 'system', content: '你是圆桌讨论的 Spike 提取专家，只输出 JSON 数组。' },
        { role: 'user', content: prompt },
      ],
      tier: 'standard',
      maxTokens: 900,
    });

    return buildSpikesFromLlm(limitedCandidates, response, maxSpikes);
  } catch (error) {
    // Step C — 规则兜底
    console.error('[extractSpikesFromSession] LLM failed, fallback to deterministic rules:', error);
    return buildFallbackSpikes(limitedCandidates, Math.min(maxSpikes, limitedCandidates.length));
  }
}
