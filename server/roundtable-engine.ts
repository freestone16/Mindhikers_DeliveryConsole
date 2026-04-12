import { randomUUID } from 'crypto';
import { Response } from 'express';
import { loadAllPersonas, loadPersonaBySlug } from './persona-loader';
import { callRoundtableLlm } from './llm';
import { activeConfig, estimateHistoryTokens } from './compression-config';
import { appendSpikesToCrucibleConversation, CruciblePersistenceContext } from './crucible-persistence';
import { extractSpikesFromSession } from './spike-extractor';
import { buildDeepDiveContext, askDeepDiveQuestion } from './deepdive-engine';
import type {
  PersonaProfile,
} from '../src/schemas/persona';
import type {
  DeepDiveSession,
  DeepDiveTurn,
  DirectorDeepResult,
  DirectorStopResult,
  DirectorCommandRequest,
  PhilosopherAction,
  PhilosopherTurn,
  Round,
  RoundSynthesis,
  RoundtableSession,
  RoundtableSseEvent,
  SpeakerSelection,
  Spike,
  StartRoundtableRequest,
} from './roundtable-types';

const sessionStore = new Map<string, RoundtableSession>();
const deepDiveSessionStore = new Map<string, DeepDiveSession>();

interface DirectorCommandContext {
  persistenceContext?: CruciblePersistenceContext;
}

export function getDeepDiveSession(deepDiveId: string): DeepDiveSession | null {
  return deepDiveSessionStore.get(deepDiveId) || null;
}

export function saveDeepDiveSession(session: DeepDiveSession): void {
  deepDiveSessionStore.set(session.id, session);
}

function findSpikeInSession(session: RoundtableSession, spikeId: string): Spike | null {
  for (const round of session.rounds) {
    for (const turn of round.turns) {
      if (turn.speakerSlug) continue;
    }
  }
  return null;
}

export function getSpikeFromSession(session: RoundtableSession, spikeId: string): Spike | null {
  const allSpikes = extractSpikesFromSession(session);
  return allSpikes.find(s => s.id === spikeId) || null;
}

export function getSession(sessionId: string): RoundtableSession | null {
  return sessionStore.get(sessionId) || null;
}

export function saveSession(session: RoundtableSession): void {
  sessionStore.set(session.id, session);
}

function sendSseEvent(res: Response, event: RoundtableSseEvent): void {
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event.data)}\n\n`);
}

export async function selectSpeakers(
  proposition: string,
  sharpenedProposition: string | undefined,
  contrastAnchor: string | undefined,
  preferredPersonas: string[] | undefined
): Promise<SpeakerSelection> {
  const allPersonas = loadAllPersonas();
  
  if (allPersonas.length === 0) {
    throw new Error('No personas available');
  }

  if (preferredPersonas && preferredPersonas.length >= 3) {
    return {
      selectedSlugs: preferredPersonas.slice(0, 5),
      reason: 'User selected',
      focusAngle: 'User preference',
    };
  }

  const personasList = allPersonas.map(p => `
slug: ${p.slug}
displayName: ${p.displayName}（${p.era}）
核心哲学: ${p.corePhilosophy}
立场锚点: care=${p.anchors.carePriority} liberty=${p.anchors.libertyPriority} authority=${p.anchors.authorityPriority} fairness=${p.anchors.fairnessPriority}
关键对比轴:
${p.contrastPoints.map(cp => `  - ${cp.dimension}: ${cp.stance}`).join('\n')}
`).join('\n---\n');

  const prompt = `【角色】你是圆桌讨论的选角导演，任务是从候选哲人中挑出最能产生真实分歧的组合。

【候选哲人档案】
${personasList}

【讨论命题】
原始命题：${proposition}
${sharpenedProposition ? `锐化命题：${sharpenedProposition}` : ''}
${contrastAnchor ? `对比锚点：${contrastAnchor}` : ''}

【选择标准——按优先级排序】
1. 锚点对立：在 carePriority / libertyPriority / authorityPriority 上至少存在两组 ≥0.4 的差值
2. 对比轴碰撞：至少有一个 contrastPoints.dimension 被两位候选人以相反 stance 覆盖
3. 时代/文化互补：东西方、古代/现代至少各一位
4. 人数：3-5 人。3 人时偏好三角张力（A↔B, B↔C, C↔A），不要出现 2v1 抱团

【反模式——不要这样选】
- 不要选 3 个立场接近的人"友好交流"
- 不要因为哲人有名就选，要因为在该命题上有真实分歧才选

【输出格式】严格 JSON，不要添加任何额外文字：
\`\`\`json
{
  "selectedSlugs": ["slug1", "slug2", "slug3"],
  "reason": "20-50字：谁和谁在哪个维度对立",
  "focusAngle": "讨论最可能撕裂的核心角度"
}
\`\`\``;

  const response = await callRoundtableLlm({
    messages: [
      { role: 'system', content: '你是一个专业的圆桌讨论选角导演。只输出 JSON，不要其他文字。' },
      { role: 'user', content: prompt },
    ],
    tier: 'fast',
    maxTokens: 500,
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    
    return {
      selectedSlugs: parsed.selectedSlugs || allPersonas.slice(0, 3).map(p => p.slug),
      reason: parsed.reason || 'Auto selected',
      focusAngle: parsed.focusAngle || 'General discussion',
    };
  } catch (error) {
    console.error('[selectSpeakers] Failed to parse LLM response:', error);
    const shuffled = [...allPersonas].sort(() => Math.random() - 0.5);
    return {
      selectedSlugs: shuffled.slice(0, 3).map(p => p.slug),
      reason: 'Fallback random selection',
      focusAngle: 'General discussion',
    };
  }
}

function buildFullHistory(
  persona: PersonaProfile,
  session: RoundtableSession,
  upToRound: number
): string {
  const lines: string[] = [];
  for (let i = 0; i < upToRound; i++) {
    const round = session.rounds[i];
    lines.push(`--- 第 ${i + 1} 轮 ---`);
    for (const turn of round.turns) {
      const marker = turn.speakerSlug === persona.slug ? '【你】' : '';
      lines.push(`${marker}${turn.speakerSlug}（${turn.action}）：${turn.utterance}`);
    }
    if (round.synthesis) {
      lines.push(`[主持人综合] ${round.synthesis.summary}`);
    }
  }
  return lines.join('\n');
}

function buildBriefSummaryHistory(
  persona: PersonaProfile,
  session: RoundtableSession,
  upToRound: number
): string {
  const lines: string[] = [];
  for (let i = 0; i < upToRound; i++) {
    const round = session.rounds[i];
    lines.push(`--- 第 ${i + 1} 轮摘要 ---`);
    const myTurn = round.turns.find(t => t.speakerSlug === persona.slug);
    const others = round.turns.filter(t => t.speakerSlug !== persona.slug);
    if (myTurn) lines.push(`【你】说：${myTurn.briefSummary}`);
    for (const t of others) {
      lines.push(`${t.speakerSlug} 说：${t.briefSummary}`);
    }
  }
  return lines.join('\n');
}

function buildSynthesisHistory(
  session: RoundtableSession,
  upToRound: number
): string {
  const latestSynthesis = session.rounds[upToRound - 1]?.synthesis;
  if (!latestSynthesis) return '';
  return `【之前讨论的核心裂缝】${latestSynthesis.focusPoint}\n` +
    `【张力度】${latestSynthesis.tensionLevel || '?'}/5\n` +
    `【你之前的核心立场】保持连贯，除非你主动承认被说服。`;
}

export function buildRoundMemory(
  persona: PersonaProfile,
  session: RoundtableSession,
  currentRoundIndex: number
): string {
  if (currentRoundIndex <= 1) return '';

  const estimatedTokens = estimateHistoryTokens(session, currentRoundIndex - 1);

  if (estimatedTokens < activeConfig.l0Threshold) {
    return buildFullHistory(persona, session, currentRoundIndex - 1);
  }
  if (estimatedTokens < activeConfig.l1Threshold) {
    return buildBriefSummaryHistory(persona, session, currentRoundIndex - 1);
  }
  return buildSynthesisHistory(session, currentRoundIndex - 1);
}

function buildTargetContext(
  session: RoundtableSession,
  currentRoundIndex: number,
  currentSpeakerIndex: number
): string {
  const currentRound = session.rounds[currentRoundIndex];
  
  if (currentSpeakerIndex === 0) {
    const synthesis = currentRoundIndex > 0 
      ? session.rounds[currentRoundIndex - 1].synthesis
      : null;
    if (synthesis) {
      return `【上一位主持人的综合】\n核心裂缝：${synthesis.focusPoint}\n张力度：${synthesis.tensionLevel}/5`;
    }
    return '【这是第一轮，你是第一位发言者】';
  }

  const previousTurn = currentRound.turns[currentSpeakerIndex - 1];
  return `【你需要回应的内容】\n${previousTurn.speakerSlug}（${previousTurn.action}）：${previousTurn.utterance}\n\n简要概括：${previousTurn.briefSummary}`;
}

function buildPhilosopherPrompt(
  persona: PersonaProfile,
  session: RoundtableSession,
  currentRoundIndex: number,
  currentSpeakerIndex: number
): string {
  const roundMemory = buildRoundMemory(persona, session, currentRoundIndex);
  const targetContext = buildTargetContext(session, currentRoundIndex, currentSpeakerIndex);
  const proposition = session.sharpenedProposition || session.proposition;

  return `【你是谁】
你是 ${persona.displayName}（${persona.slug}），${persona.era}的思想者。
你不是在"扮演角色"——你就是这个人，带着你真实的信念发言。

【你的哲学内核】
${persona.corePhilosophy}

【你的思考方式】
${persona.thinkingStyle}

【你的招牌追问】
当你觉得对方定义模糊或论证空洞时，你倾向于问：
"${persona.signatureQuestion}"

【你的语言风格】
语气：${persona.voiceRules.tone.join('、')}
语言习惯：${persona.voiceRules.habits.join('、') || '无特殊习惯'}
绝对不要：${persona.voiceRules.avoid.join('、') || '无'}

【你的立场坐标】
care=${persona.anchors.carePriority} liberty=${persona.anchors.libertyPriority} authority=${persona.anchors.authorityPriority} fairness=${persona.anchors.fairnessPriority}

【你的底线】
${persona.honestBoundary}

【你的关键维度立场】
${persona.contrastPoints.map(cp => `- ${cp.dimension}: ${cp.stance}`).join('\n')}

================================

${roundMemory ? `【历史记忆】\n${roundMemory}\n\n` : ''}【当前讨论命题】
${proposition}

${targetContext}

【发言规则】
1. 从你的哲学内核出发，不要泛泛而谈
2. 你的 preferredActions 是 [${persona.preferredActions.join(', ')}]，优先使用这些动作
3. 如果你要反驳，必须指出对方论证的具体漏洞，而不是"我不同意"
4. 如果你要认同，必须说出对方的哪句话说服了你，且解释为什么这与你的哲学一致。禁止无根据的"我同意你的看法"
5. 可以使用你的招牌追问来逼对方澄清
6. 保持你的底线——如果讨论方向违反你的 honestBoundary，明确拒绝
7. 150-400 字。宁可犀利简短，不要冗长平庸

【输出格式 - 两阶段】

第一阶段：直接输出你的发言内容（150-400 字），不要任何 JSON、不要 markdown 代码块。
发言结束后单独一行写 "---META---"，然后紧跟 JSON 元数据块：

---META---
{
  "action": "陈述|质疑|补充|反驳|修正|综合",
  "briefSummary": "≤15字核心压缩",
  "challengedTarget": "你回应的哪一位及其哪一点（无则 null）",
  "stanceVector": { "carePriority": 0-1, "libertyPriority": 0-1, "authorityPriority": 0-1 }
}`;
}

export async function callPhilosopher(
  persona: PersonaProfile,
  session: RoundtableSession,
  currentRoundIndex: number,
  currentSpeakerIndex: number,
  onChunk: (chunk: string) => void
): Promise<PhilosopherTurn> {
  const prompt = buildPhilosopherPrompt(persona, session, currentRoundIndex, currentSpeakerIndex);

  const response = await callRoundtableLlm({
    messages: [
      { role: 'system', content: '你是圆桌讨论中的哲人。严格遵循两阶段输出格式。' },
      { role: 'user', content: prompt },
    ],
    tier: 'premium',
    maxTokens: 1000,
  });

  const metaIndex = response.indexOf('---META---');
  
  let utterance: string;
  let metaStr: string;
  
  if (metaIndex === -1) {
    utterance = response.trim();
    metaStr = '{}';
  } else {
    utterance = response.substring(0, metaIndex).trim();
    metaStr = response.substring(metaIndex + 10).trim();
  }

  const chunks = utterance.split(/(?=[，。！？\n])/);
  for (const chunk of chunks) {
    onChunk(chunk);
  }

  let meta: Partial<PhilosopherTurn> = {};
  try {
    const jsonMatch = metaStr.match(/\{[\s\S]*\}/);
    meta = JSON.parse(jsonMatch ? jsonMatch[0] : metaStr);
  } catch (error) {
    console.error('[callPhilosopher] Failed to parse meta:', error);
  }

  return {
    speakerSlug: persona.slug,
    utterance,
    action: (meta.action as PhilosopherAction) || '陈述',
    briefSummary: meta.briefSummary || utterance.slice(0, 15),
    challengedTarget: meta.challengedTarget,
    stanceVector: meta.stanceVector,
    timestamp: Date.now(),
  };
}

export async function startRoundtable(
  req: StartRoundtableRequest,
  res: Response
): Promise<void> {
  const { proposition, sharpenedProposition, contrastAnchor, preferredPersonas } = req;

  const session: RoundtableSession = {
    id: randomUUID(),
    proposition,
    sharpenedProposition,
    contrastAnchor,
    selectedSlugs: [],
    status: 'selecting',
    rounds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const selection = await selectSpeakers(proposition, sharpenedProposition, contrastAnchor, preferredPersonas);
    session.selectedSlugs = selection.selectedSlugs;
    session.status = 'opening';
    saveSession(session);

    sendSseEvent(res, {
      type: 'roundtable_selection',
      data: selection,
    });

    const openingSynthesis: RoundSynthesis = {
      summary: `讨论开始：${sharpenedProposition || proposition}`,
      focusPoint: '初始命题陈述',
      tensionLevel: 1,
      suggestedDirections: ['各自陈述立场', '质疑命题定义', '引入对比锚点'],
    };

    session.rounds.push({
      roundIndex: 0,
      turns: [],
      synthesis: openingSynthesis,
    });

    sendSseEvent(res, {
      type: 'roundtable_synthesis',
      data: { ...openingSynthesis, roundIndex: 0 },
    });

    await runDiscussionLoop(session, res);

    session.status = 'awaiting';
    saveSession(session);

    sendSseEvent(res, {
      type: 'roundtable_awaiting',
      data: { sessionId: session.id, currentRound: session.rounds.length },
    });

    res.end();
  } catch (error) {
    console.error('[startRoundtable] Error:', error);
    sendSseEvent(res, {
      type: 'roundtable_error',
      data: { message: error instanceof Error ? error.message : 'Unknown error', recoverable: false },
    });
    res.end();
  }
}

async function runDiscussionLoop(
  session: RoundtableSession,
  res: Response
): Promise<void> {
  const maxRounds = 3;

  for (let roundIndex = 0; roundIndex < maxRounds; roundIndex++) {
    session.status = 'discussing';

    const round: Round = {
      roundIndex,
      turns: [],
    };

    for (let i = 0; i < session.selectedSlugs.length; i++) {
      const slug = session.selectedSlugs[i];
      const persona = loadPersonaBySlug(slug);

      if (!persona) {
        console.warn(`[runDiscussionLoop] Persona not found: ${slug}`);
        continue;
      }

      try {
        const turn = await callPhilosopher(
          persona,
          session,
          roundIndex,
          i,
          (chunk) => {
            sendSseEvent(res, {
              type: 'roundtable_turn_chunk',
              data: { roundIndex, speakerSlug: slug, chunk },
            });
          }
        );

        round.turns.push(turn);
        saveSession(session);

        sendSseEvent(res, {
          type: 'roundtable_turn_meta',
          data: {
            speakerSlug: turn.speakerSlug,
            action: turn.action,
            briefSummary: turn.briefSummary,
            challengedTarget: turn.challengedTarget,
            stanceVector: turn.stanceVector,
            timestamp: turn.timestamp,
          },
        });
      } catch (error) {
        console.error(`[runDiscussionLoop] Error calling philosopher ${slug}:`, error);
        sendSseEvent(res, {
          type: 'roundtable_error',
          data: { message: `Philosopher ${slug} failed to respond`, recoverable: true },
        });
      }
    }

    session.rounds.push(round);

    session.status = 'synthesizing';
    const synthesis = await synthesizeRound(session, roundIndex);
    round.synthesis = synthesis;
    saveSession(session);

    sendSseEvent(res, {
      type: 'roundtable_synthesis',
      data: { ...synthesis, roundIndex },
    });
  }

  session.status = 'completed';
  saveSession(session);
}

export async function handleDirectorCommand(
  req: DirectorCommandRequest,
  res: Response,
  context?: DirectorCommandContext
): Promise<void> {
  const { sessionId, command, payload } = req;
  const session = getSession(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  switch (command) {
    case '止': {
      session.status = 'spike_extracting';
      saveSession(session);

      const spikes = await extractSpikes(session);
      let artifactCount = spikes.length;

      if (context?.persistenceContext) {
        try {
          const topicTitle = session.sharpenedProposition || session.proposition;
          const persisted = appendSpikesToCrucibleConversation(context.persistenceContext, {
            sessionId: session.id,
            topicTitle,
            spikes: spikes.map((spike) => ({
              id: spike.id,
              title: spike.title,
              summary: spike.summary,
              content: spike.content,
              sourceSpeaker: spike.sourceSpeaker,
              roundIndex: spike.roundIndex,
              bridgeHint: spike.bridgeHint,
              tensionLevel: spike.tensionLevel,
              isFallback: spike.isFallback,
            })),
          });
          artifactCount = persisted.artifacts.length;
        } catch (error) {
          console.error('[handleDirectorCommand] Failed to persist spikes:', error);
        }
      }

      const result: DirectorStopResult = {
        spikes,
        sessionId: session.id,
        spikeCount: spikes.length,
        artifactCount,
        isFallback: spikes.some((spike) => spike.isFallback),
      };

      session.status = 'completed';
      session.updatedAt = Date.now();
      saveSession(session);

      res.json(result);
      break;
    }

    case '投': {
      if (payload?.injection) {
        const roundIndex = session.rounds.length;
        const injectionSynthesis: RoundSynthesis = {
          summary: `导演注入观点：${payload.injection}`,
          focusPoint: payload.injection,
          tensionLevel: 3,
          suggestedDirections: ['回应导演注入的观点'],
        };

        session.rounds.push({
          roundIndex,
          turns: [],
          synthesis: injectionSynthesis,
        });
        saveSession(session);

        res.setHeader('Content-Type', 'text/event-stream');
        await runAdditionalRound(session, res);
      }
      break;
    }

    case '深': {
      const spikeId = payload?.spikeId;
      const hasSpikes = session.status === 'completed';

      if (hasSpikes && spikeId) {
        const spike = getSpikeFromSession(session, spikeId);
        if (spike) {
          const persona = loadPersonaBySlug(spike.sourceSpeaker);
          if (!persona) {
            res.status(400).json({ error: `Persona not found: ${spike.sourceSpeaker}` });
            break;
          }

          const deepDiveSession: DeepDiveSession = {
            id: randomUUID(),
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

          const openingQuestion = spike.bridgeHint;

          try {
            const philosopherTurn = await askDeepDiveQuestion({
              deepDiveSession,
              question: openingQuestion,
              personaProfile: persona,
              session,
              spike,
            });

            deepDiveSession.turns.push(
              { role: 'user', content: openingQuestion, timestamp: Date.now() },
              philosopherTurn,
            );
            deepDiveSession.updatedAt = Date.now();
            saveDeepDiveSession(deepDiveSession);

            const result: DirectorDeepResult = {
              deepDive: deepDiveSession,
              spikeId: spike.id,
              sourceSpeaker: spike.sourceSpeaker,
            };

            res.json(result);
          } catch (error) {
            console.error('[handleDirectorCommand] DeepDive failed:', error);
            res.status(500).json({ error: 'Failed to start DeepDive' });
          }
          break;
        }
      }

      res.setHeader('Content-Type', 'text/event-stream');
      await runAdditionalRound(session, res);
      break;
    }

    case '换': {
      if (payload?.newPersonaSlug) {
        const index = session.selectedSlugs.indexOf(payload.targetPersona || session.selectedSlugs[0]);
        if (index !== -1) {
          session.selectedSlugs[index] = payload.newPersonaSlug;
          saveSession(session);
        }
      }
      res.json({ success: true, selectedSlugs: session.selectedSlugs });
      break;
    }

    case '？': {
      res.setHeader('Content-Type', 'text/event-stream');
      await runAdditionalRound(session, res, payload?.targetPersona);
      break;
    }

    case '可': {
      res.setHeader('Content-Type', 'text/event-stream');
      await runAdditionalRound(session, res);
      break;
    }

    default: {
      res.status(400).json({ error: 'Unknown command' });
    }
  }
}

async function runAdditionalRound(
  session: RoundtableSession,
  res: Response,
  targetPersona?: string
): Promise<void> {
  const roundIndex = session.rounds.length;
  session.status = 'discussing';

  const round: Round = {
    roundIndex,
    turns: [],
  };

  for (let i = 0; i < session.selectedSlugs.length; i++) {
    const slug = session.selectedSlugs[i];
    const persona = loadPersonaBySlug(slug);

    if (!persona) continue;

    if (targetPersona && slug !== targetPersona) {
      continue;
    }

    try {
      const turn = await callPhilosopher(
        persona,
        session,
        roundIndex,
        i,
        (chunk) => {
          sendSseEvent(res, {
            type: 'roundtable_turn_chunk',
            data: { roundIndex, speakerSlug: slug, chunk },
          });
        }
      );

      round.turns.push(turn);
      saveSession(session);

      sendSseEvent(res, {
        type: 'roundtable_turn_meta',
        data: {
          speakerSlug: turn.speakerSlug,
          action: turn.action,
          briefSummary: turn.briefSummary,
          challengedTarget: turn.challengedTarget,
          stanceVector: turn.stanceVector,
          timestamp: turn.timestamp,
        },
      });
    } catch (error) {
      console.error(`[runAdditionalRound] Error:`, error);
      sendSseEvent(res, {
        type: 'roundtable_error',
        data: { message: `Philosopher ${slug} failed`, recoverable: true },
      });
    }
  }

  session.rounds.push(round);

  session.status = 'synthesizing';
  const synthesis = await synthesizeRound(session, roundIndex);
  round.synthesis = synthesis;
  saveSession(session);

  sendSseEvent(res, {
    type: 'roundtable_synthesis',
    data: { ...synthesis, roundIndex },
  });

  session.status = 'awaiting';
  saveSession(session);

  sendSseEvent(res, {
    type: 'roundtable_awaiting',
    data: { sessionId: session.id, currentRound: session.rounds.length },
  });

  res.end();
}

async function extractSpikes(session: RoundtableSession): Promise<Spike[]> {
  return extractSpikesFromSession(session);
}

export async function synthesizeRound(
  session: RoundtableSession,
  roundIndex: number
): Promise<RoundSynthesis> {
  const round = session.rounds[roundIndex];
  const previousSynthesis = roundIndex > 0 ? session.rounds[roundIndex - 1].synthesis : null;

  const turnsSummary = round.turns.map(t => 
    `${t.speakerSlug}（${t.action}）：${t.briefSummary}\n  → 完整发言：${t.utterance}`
  ).join('\n\n');

  const prompt = `【角色】你是圆桌主持人。你不参与辩论，你的工作是精确诊断讨论的结构。

【当前状态】
命题：${session.proposition}
第 ${roundIndex + 1} 轮，共 ${session.selectedSlugs.length} 位哲人参与。

${previousSynthesis ? `【上一轮综合】
核心裂缝：${previousSynthesis.focusPoint}
张力度：${previousSynthesis.tensionLevel}/5
你需要对比：本轮裂缝是否位移？张力是升温还是降温？
` : ''}

【本轮发言记录】
${turnsSummary}

【你需要做的分析】
1. **summary**：客观概括本轮核心论点（30-50字），不要评价对错
2. **focusPoint**：提炼最有张力的争议点。格式："A 认为……而 B 认为……"，必须点名
3. **convergenceSignals**：哪些哲人的立场在靠近？靠近了多少？（如果没有就写"无明显收敛"）
4. **tensionLevel**：1-5 打分
   - 1=大家在各说各话，无交锋
   - 2=有礼貌分歧，但没有直接回应
   - 3=有明确的论点对论点交锋
   - 4=出现了对核心信念的挑战
   - 5=有人的底线被触及，讨论白热化
5. **suggestedDirections**：3 个可能的下轮走向，每个必须基于本轮实际出现的未解分歧，不要凭空编造

【输出格式】严格 JSON，不要添加任何额外文字：
\`\`\`json
{
  "summary": "30-50字客观概括",
  "focusPoint": "A 认为……而 B 认为……",
  "convergenceSignals": "描述收敛趋势或'无明显收敛'",
  "tensionLevel": 3,
  "suggestedDirections": [
    "基于X分歧继续深入：……",
    "引入Y维度扩展：……",
    "追问Z的定义模糊：……"
  ]
}
\`\`\``;

  const response = await callRoundtableLlm({
    messages: [
      { role: 'system', content: '你是圆桌主持人。只输出 JSON，不要其他文字。' },
      { role: 'user', content: prompt },
    ],
    tier: 'standard',
    maxTokens: 800,
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    
    return {
      summary: parsed.summary || 'No summary available',
      focusPoint: parsed.focusPoint || 'No focus point identified',
      convergenceSignals: parsed.convergenceSignals,
      tensionLevel: Math.min(5, Math.max(1, parsed.tensionLevel || 3)) as 1 | 2 | 3 | 4 | 5,
      suggestedDirections: parsed.suggestedDirections || ['Continue discussion'],
    };
  } catch (error) {
    console.error('[synthesizeRound] Failed to parse LLM response:', error);
    return {
      summary: 'Failed to synthesize',
      focusPoint: 'Unknown',
      tensionLevel: 3,
      suggestedDirections: ['Continue discussion'],
    };
  }
}
