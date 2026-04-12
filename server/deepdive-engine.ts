import { randomUUID } from 'crypto';
import { callRoundtableLlm } from './llm';
import { loadPersonaBySlug } from './persona-loader';
import type {
  DeepDiveSession,
  DeepDiveTurn,
  DeepDiveSummary,
  Spike,
  RoundtableSession,
} from './roundtable-types';

const MAX_DEEPDIVE_TURNS = 10;

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, ' ');

const truncateText = (value: string, maxLength: number): string => {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.slice(0, maxLength);
};

// ─── 上下文构建 ───

const extractSpeakerUtterances = (
  session: RoundtableSession,
  speakerSlug: string,
): string[] => {
  const utterances: string[] = [];
  for (const round of session.rounds) {
    for (const turn of round.turns) {
      if (turn.speakerSlug === speakerSlug && turn.utterance) {
        utterances.push(truncateText(turn.utterance, 200));
      }
    }
  }
  return utterances;
};

const findSpikeRoundSynthesis = (
  session: RoundtableSession,
  spike: Spike,
): string => {
  const round = session.rounds.find(r => r.roundIndex === spike.roundIndex);
  if (round?.synthesis) {
    const { summary, focusPoint, tensionLevel } = round.synthesis;
    return `焦点：${focusPoint}，张力等级 ${tensionLevel}/5，综合：${truncateText(summary, 100)}`;
  }
  return '';
};

export async function buildDeepDiveContext(params: {
  session: RoundtableSession;
  spike: Spike;
  personaProfile: {
    displayName: string;
    slug: string;
    era: string;
    honestBoundary?: string;
  };
}): Promise<string> {
  const { session, spike, personaProfile } = params;

  const speakerUtterances = extractSpeakerUtterances(session, spike.sourceSpeaker);
  const roundSynthesis = findSpikeRoundSynthesis(session, spike);

  const utterancesBlock = speakerUtterances.length > 0
    ? speakerUtterances.map((u, i) => `${i + 1}. ${u}`).join('\n')
    : '（无直接发言记录）';

  const honestBoundaryLine = personaProfile.honestBoundary
    ? `4. 如果追问触及你的诚实边界（${personaProfile.honestBoundary}），坦诚说明原因。`
    : '4. 对于触及你认知边界的问题，坦诚说明你的思考局限。';

  return `【你是谁】
你是 ${personaProfile.displayName}（${personaProfile.slug}），${personaProfile.era}的思想者。
这是从圆桌讨论延伸的一对一深聊，你需要更深入地阐述你的立场。

【圆桌背景】
讨论命题：${session.proposition}
裂缝焦点：${spike.title} — ${spike.summary}
${roundSynthesis ? `本轮综合：${roundSynthesis}\n` : ''}你在圆桌中的关键发言：
${utterancesBlock}

【深聊规则】
1. 这是追问，不是辩论。你只需要更深入地解释你的想法。
2. 用户的问题是真诚的，认真对待每一个追问。
3. 可以使用类比、思想实验、具体例子来帮助理解。
${honestBoundaryLine}
5. 200-500 字，比圆桌发言可以更深入。

直接输出你的回复，不要 JSON、不要 markdown。`;
}

// ─── 追问循环 ───

const buildQuestionUserMessage = (
  question: string,
  previousTurns: DeepDiveTurn[],
): string => {
  const parts: string[] = [];

  if (previousTurns.length > 0) {
    const historyLines = previousTurns
      .map(t => `${t.role === 'user' ? '用户' : '哲人'}：${truncateText(t.content, 150)}`)
      .join('\n');
    parts.push(`【对话历史】\n${historyLines}`);
  }

  parts.push(`【用户追问】\n${question}`);
  return parts.join('\n\n');
};

export async function askDeepDiveQuestion(params: {
  deepDiveSession: DeepDiveSession;
  question: string;
  personaProfile: {
    displayName: string;
    slug: string;
    era: string;
    honestBoundary?: string;
  };
  session: RoundtableSession;
  spike: Spike;
}): Promise<DeepDiveTurn> {
  const { deepDiveSession, question, personaProfile, session, spike } = params;

  try {
    const systemPrompt = await buildDeepDiveContext({ session, spike, personaProfile });
    const userMessage = buildQuestionUserMessage(question, deepDiveSession.turns);

    const response = await callRoundtableLlm({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      tier: 'premium',
      maxTokens: 800,
    });

    return {
      role: 'philosopher',
      content: response,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[askDeepDiveQuestion] LLM failed:', error);
    return {
      role: 'philosopher',
      content: '追问未获得有效回复，请重试。',
      timestamp: Date.now(),
    };
  }
}

// ─── 总结生成 ───

const buildSummarizePrompt = (
  deepDiveSession: DeepDiveSession,
  spike: Spike,
): string => {
  const allTurns = deepDiveSession.turns
    .map(t => `${t.role === 'user' ? '用户' : spike.sourceSpeaker}：${truncateText(t.content, 150)}`)
    .join('\n');

  return `你是圆桌讨论的分析师。以下是一场围绕特定 Spike 的深聊记录。
请生成结构化总结。

【Spike 信息】
标题：${spike.title}
内容：${spike.content}
发言者：${spike.sourceSpeaker}

【深聊记录】
${allTurns}

【输出要求】严格 JSON：
{
  "title": "≤20字标题",
  "coreInsight": "50-100字核心洞察",
  "keyQuotes": ["最多3条关键引述"],
  "remainingTension": "仍存在的分歧或未解问题",
  "nextSteps": ["2-3个可能的后续方向"]
}`;
};

const parseSummaryJson = (response: string): DeepDiveSummary => {
  let content = response.trim();
  if (content.startsWith('```json')) {
    content = content.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (content.startsWith('```')) {
    content = content.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }

  const startIndex = content.indexOf('{');
  const endIndex = content.lastIndexOf('}');
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    content = content.substring(startIndex, endIndex + 1);
  }

  const parsed = JSON.parse(content);
  return {
    title: truncateText(String(parsed.title || '深聊总结'), 20),
    coreInsight: truncateText(String(parsed.coreInsight || ''), 150),
    keyQuotes: Array.isArray(parsed.keyQuotes)
      ? parsed.keyQuotes.slice(0, 3).map((q: unknown) => truncateText(String(q), 80))
      : [],
    remainingTension: truncateText(String(parsed.remainingTension || ''), 100),
    nextSteps: Array.isArray(parsed.nextSteps)
      ? parsed.nextSteps.slice(0, 3).map((s: unknown) => truncateText(String(s), 60))
      : [],
  };
};

const FALLBACK_SUMMARY: DeepDiveSummary = {
  title: '深聊总结',
  coreInsight: '（生成失败）',
  keyQuotes: [],
  remainingTension: '',
  nextSteps: [],
};

export async function summarizeDeepDive(params: {
  deepDiveSession: DeepDiveSession;
  spike: Spike;
}): Promise<DeepDiveSummary> {
  const { deepDiveSession, spike } = params;

  try {
    const prompt = buildSummarizePrompt(deepDiveSession, spike);

    const response = await callRoundtableLlm({
      messages: [
        { role: 'system', content: '你是圆桌讨论的分析师，只输出 JSON。' },
        { role: 'user', content: prompt },
      ],
      tier: 'standard',
      maxTokens: 500,
    });

    return parseSummaryJson(response);
  } catch (error) {
    console.error('[summarizeDeepDive] LLM failed, returning fallback:', error);
    return { ...FALLBACK_SUMMARY };
  }
}
