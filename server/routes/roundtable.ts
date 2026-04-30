import { randomUUID } from 'crypto';
import express, { type Request, type Response } from 'express';

type RoundtableStatus =
    | 'selecting'
    | 'opening'
    | 'discussing'
    | 'synthesizing'
    | 'awaiting'
    | 'spike_extracting'
    | 'completed';

type PhilosopherAction = '陈述' | '质疑' | '补充' | '反驳' | '修正' | '综合';
type DirectorCommand = '止' | '投' | '深' | '换' | '？' | '可';

interface PhilosopherTurn {
    speakerSlug: string;
    utterance: string;
    action: PhilosopherAction;
    briefSummary: string;
    challengedTarget?: string;
    stanceVector?: {
        carePriority: number;
        libertyPriority: number;
        authorityPriority: number;
    };
    timestamp: number;
}

interface RoundSynthesis {
    summary: string;
    focusPoint: string;
    tensionLevel: 1 | 2 | 3 | 4 | 5;
    convergenceSignals?: string;
    suggestedDirections: string[];
}

interface Round {
    roundIndex: number;
    turns: PhilosopherTurn[];
    synthesis?: RoundSynthesis;
}

interface Spike {
    id: string;
    content: string;
    title: string;
    summary: string;
    bridgeHint: string;
    sourceSpeaker: string;
    roundIndex: number;
    timestamp: number;
    sourceTurnIds?: string[];
    tensionLevel?: 1 | 2 | 3 | 4 | 5;
    isFallback?: boolean;
}

interface RoundtableSession {
    id: string;
    proposition: string;
    sharpenedProposition?: string;
    selectedSlugs: string[];
    status: RoundtableStatus;
    rounds: Round[];
    spikes: Spike[];
    createdAt: number;
    updatedAt: number;
}

interface DeepDiveSession {
    id: string;
    parentSessionId: string;
    spikeId: string;
    spikeTitle: string;
    spikeContent: string;
    sourceSpeaker: string;
    status: 'active' | 'summarizing' | 'completed';
    turns: Array<{ role: 'user' | 'philosopher'; content: string; timestamp: number }>;
    summary?: {
        title: string;
        coreInsight: string;
        keyQuotes: string[];
        remainingTension: string;
        nextSteps: string[];
    };
    createdAt: number;
    updatedAt: number;
}

interface RoundtableSseEvent {
    type:
        | 'roundtable_selection'
        | 'roundtable_turn_chunk'
        | 'roundtable_turn_meta'
        | 'roundtable_synthesis'
        | 'roundtable_awaiting'
        | 'roundtable_error'
        | 'roundtable_spikes_ready'
        | 'roundtable_deepdive_chunk'
        | 'roundtable_deepdive_summary';
    data: unknown;
}

const router = express.Router();
const sessionStore = new Map<string, RoundtableSession>();
const deepDiveStore = new Map<string, DeepDiveSession>();

const DEFAULT_SPEAKERS = ['socrates', 'hannah-arendt', 'charlie-munger'];
const FALLBACK_SPEAKER_NAMES: Record<string, string> = {
    socrates: '苏格拉底',
    nietzsche: '尼采',
    'wang-yangming': '王阳明',
    'hannah-arendt': '汉娜·阿伦特',
    'charlie-munger': '查理·芒格',
    'richard-feynman': '理查德·费曼',
    'herbert-simon': '赫伯特·西蒙',
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const asNonEmptyText = (value: unknown) => (
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

function setSseHeaders(res: Response) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
}

function sendSseEvent(res: Response, event: RoundtableSseEvent) {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event.data)}\n\n`);
}

function chunkText(text: string): string[] {
    const chunks: string[] = [];
    for (let index = 0; index < text.length; index += 18) {
        chunks.push(text.slice(index, index + 18));
    }
    return chunks;
}

function pickSpeakers(preferredPersonas: unknown): string[] {
    if (Array.isArray(preferredPersonas)) {
        const picked = preferredPersonas
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .map((item) => item.trim())
            .slice(0, 5);

        if (picked.length >= 3) {
            return picked;
        }
    }

    return DEFAULT_SPEAKERS;
}

function buildTurn(session: RoundtableSession, speakerSlug: string, roundIndex: number, turnIndex: number, injection?: string): PhilosopherTurn {
    const proposition = session.sharpenedProposition || session.proposition;
    const speakerName = FALLBACK_SPEAKER_NAMES[speakerSlug] || speakerSlug;
    const actionCycle: PhilosopherAction[] = ['陈述', '质疑', '补充', '综合'];
    const action = actionCycle[turnIndex % actionCycle.length];
    const injectedLine = injection ? `导演刚刚注入了一个新角度：“${injection}”。` : '';

    const utterance = [
        `${speakerName}：先把命题压实。${proposition} 不是一句价值判断，而是在问我们把责任、能力和后果放在哪一层。`,
        injectedLine,
        action === '质疑'
            ? '我会追问：如果主体没有承担代价的能力，我们还能不能把道德责任完整放到它身上？'
            : '我倾向先区分工具能力、决策权和责任归属，避免把技术拟人化后直接跳到结论。',
        '所以更好的讨论起点不是“好或不好”，而是教育里的判断力、关系和责任有没有被重新分配。',
    ].filter(Boolean).join('\n');

    return {
        speakerSlug,
        utterance,
        action,
        briefSummary: `${speakerName}围绕“${proposition.slice(0, 24)}”给出${action}视角`,
        challengedTarget: action === '质疑' ? session.selectedSlugs[0] : undefined,
        stanceVector: {
            carePriority: Number((0.35 + turnIndex * 0.12).toFixed(2)),
            libertyPriority: Number((0.72 - turnIndex * 0.09).toFixed(2)),
            authorityPriority: Number((0.38 + roundIndex * 0.08).toFixed(2)),
        },
        timestamp: Date.now(),
    };
}

function buildSynthesis(session: RoundtableSession, roundIndex: number): RoundSynthesis {
    const proposition = session.sharpenedProposition || session.proposition;

    return {
        summary: `第 ${roundIndex + 1} 轮已经把“${proposition}”拆成了责任归属、行动能力和后果承担三条线。`,
        focusPoint: 'AI 是否能承担责任，取决于它是否拥有可追责的决策权，而不只是输出能力。',
        tensionLevel: 4,
        convergenceSignals: '各方都同意不能只看模型能力，需要看人类制度如何分配责任。',
        suggestedDirections: ['追问责任主体', '拆开工具能力与决策权', '寻找现实制度案例'],
    };
}

async function streamRound(res: Response, session: RoundtableSession, options: { injection?: string } = {}) {
    const roundIndex = session.rounds.length;
    const round: Round = { roundIndex, turns: [] };
    session.status = 'discussing';

    for (const [turnIndex, speakerSlug] of session.selectedSlugs.entries()) {
        const turn = buildTurn(session, speakerSlug, roundIndex, turnIndex, options.injection);

        for (const chunk of chunkText(turn.utterance)) {
            sendSseEvent(res, {
                type: 'roundtable_turn_chunk',
                data: { roundIndex, speakerSlug, chunk },
            });
            await delay(12);
        }

        round.turns.push(turn);
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
    }

    round.synthesis = buildSynthesis(session, roundIndex);
    session.rounds.push(round);
    session.status = 'awaiting';
    session.updatedAt = Date.now();

    sendSseEvent(res, {
        type: 'roundtable_synthesis',
        data: { ...round.synthesis, roundIndex },
    });
    sendSseEvent(res, {
        type: 'roundtable_awaiting',
        data: { sessionId: session.id, currentRound: roundIndex },
    });
}

function extractSpikes(session: RoundtableSession): Spike[] {
    if (session.spikes.length > 0) {
        return session.spikes;
    }

    const turns = session.rounds.flatMap((round) =>
        round.turns.map((turn, index) => ({ round, turn, index })),
    );
    const candidates = turns.filter(({ turn }) => ['质疑', '反驳', '修正', '综合'].includes(turn.action));
    const selected = (candidates.length > 0 ? candidates : turns).slice(0, 5);

    session.spikes = selected.map(({ round, turn, index }) => ({
        id: `spike_${session.id}_${round.roundIndex}_${index}`,
        title: turn.briefSummary.slice(0, 32),
        summary: turn.briefSummary,
        content: turn.utterance,
        bridgeHint: `沿着 ${FALLBACK_SPEAKER_NAMES[turn.speakerSlug] || turn.speakerSlug} 的这条裂缝继续深挖：责任到底落在人、组织还是模型？`,
        sourceSpeaker: turn.speakerSlug,
        roundIndex: round.roundIndex,
        timestamp: Date.now(),
        sourceTurnIds: [`round-${round.roundIndex}-${turn.speakerSlug}-${index}`],
        tensionLevel: round.synthesis?.tensionLevel,
        isFallback: candidates.length === 0,
    }));

    return session.spikes;
}

function findSpike(session: RoundtableSession, spikeId: string): Spike | null {
    return extractSpikes(session).find((spike) => spike.id === spikeId) || null;
}

function createDeepDive(session: RoundtableSession, spike: Spike, openingQuestion?: string): DeepDiveSession {
    const question = openingQuestion?.trim() || spike.bridgeHint;
    const speakerName = FALLBACK_SPEAKER_NAMES[spike.sourceSpeaker] || spike.sourceSpeaker;
    const now = Date.now();
    const deepDive: DeepDiveSession = {
        id: randomUUID(),
        parentSessionId: session.id,
        spikeId: spike.id,
        spikeTitle: spike.title,
        spikeContent: spike.content,
        sourceSpeaker: spike.sourceSpeaker,
        status: 'active',
        turns: [
            { role: 'user', content: question, timestamp: now },
            {
                role: 'philosopher',
                content: `${speakerName}：这条 Spike 的关键不是给出漂亮答案，而是把责任链拆开：谁设定目标、谁批准行动、谁承受后果。`,
                timestamp: now + 1,
            },
        ],
        createdAt: now,
        updatedAt: now + 1,
    };

    deepDiveStore.set(deepDive.id, deepDive);
    return deepDive;
}

router.post('/sharpen', (req, res) => {
    const proposition = asNonEmptyText(req.body?.proposition);
    if (!proposition) {
        res.status(400).json({ error: 'Missing or invalid proposition' });
        return;
    }

    res.json({
        isSharp: true,
        original: proposition,
        sharpened: proposition,
        reasoning: 'SSE fallback sharpener keeps the user proposition unchanged.',
    });
});

router.post('/sharpen/apply', (req, res) => {
    const selectedProposition = asNonEmptyText(req.body?.selectedProposition);
    if (!selectedProposition) {
        res.status(400).json({ error: 'Missing selectedProposition' });
        return;
    }

    res.json({ success: true, finalProposition: selectedProposition });
});

router.post('/turn/stream', async (req: Request, res: Response) => {
    const proposition = asNonEmptyText(req.body?.proposition);
    if (!proposition) {
        res.status(400).json({ error: 'Missing or invalid proposition' });
        return;
    }

    const now = Date.now();
    const session: RoundtableSession = {
        id: randomUUID(),
        proposition,
        sharpenedProposition: asNonEmptyText(req.body?.sharpenedProposition) || undefined,
        selectedSlugs: pickSpeakers(req.body?.preferredPersonas),
        status: 'selecting',
        rounds: [],
        spikes: [],
        createdAt: now,
        updatedAt: now,
    };
    sessionStore.set(session.id, session);

    setSseHeaders(res);
    sendSseEvent(res, {
        type: 'roundtable_selection',
        data: {
            selectedSlugs: session.selectedSlugs,
            reason: '选择三位视角差异较大的讨论者，先打开责任、自由与现实后果之间的张力。',
            focusAngle: '责任归属、行动能力与后果承担之间的张力',
        },
    });

    await streamRound(res, session);
    res.end();
});

router.post('/director', async (req: Request, res: Response) => {
    const sessionId = asNonEmptyText(req.body?.sessionId);
    const command = asNonEmptyText(req.body?.command) as DirectorCommand | null;
    const session = sessionId ? sessionStore.get(sessionId) : null;

    if (!sessionId || !session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    if (!command || !['止', '投', '深', '换', '？', '可'].includes(command)) {
        res.status(400).json({ error: 'Missing or invalid command' });
        return;
    }

    if (command === '止') {
        const spikes = extractSpikes(session);
        session.status = 'completed';
        session.updatedAt = Date.now();
        res.json({
            sessionId: session.id,
            spikes,
            spikeCount: spikes.length,
            artifactCount: spikes.length,
            isFallback: spikes.some((spike) => spike.isFallback),
        });
        return;
    }

    if (command === '深') {
        const spikeId = asNonEmptyText(req.body?.payload?.spikeId);
        const spike = spikeId ? findSpike(session, spikeId) : null;
        if (!spike) {
            res.status(404).json({ error: 'Spike not found' });
            return;
        }

        res.json({ deepDive: createDeepDive(session, spike), spikeId: spike.id, sourceSpeaker: spike.sourceSpeaker });
        return;
    }

    if (command === '换') {
        const newPersonaSlug = asNonEmptyText(req.body?.payload?.newPersonaSlug);
        if (newPersonaSlug && !session.selectedSlugs.includes(newPersonaSlug)) {
            session.selectedSlugs = [...session.selectedSlugs.slice(0, -1), newPersonaSlug];
        }
    }

    const injection = command === '投' || command === '？'
        ? asNonEmptyText(req.body?.payload?.injection) || undefined
        : undefined;

    setSseHeaders(res);
    await streamRound(res, session, { injection });
    res.end();
});

router.get('/session/:id', (req, res) => {
    const session = sessionStore.get(req.params.id);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    res.json(session);
});

router.post('/deepdive', (req, res) => {
    const sessionId = asNonEmptyText(req.body?.sessionId);
    const spikeId = asNonEmptyText(req.body?.spikeId);
    const session = sessionId ? sessionStore.get(sessionId) : null;

    if (!sessionId || !session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }

    const spike = spikeId ? findSpike(session, spikeId) : null;
    if (!spike) {
        res.status(404).json({ error: 'Spike not found' });
        return;
    }

    res.json({
        deepDive: createDeepDive(session, spike, asNonEmptyText(req.body?.openingQuestion) || undefined),
        spikeId: spike.id,
        sourceSpeaker: spike.sourceSpeaker,
    });
});

router.post('/deepdive/question', (req, res) => {
    const deepDiveId = asNonEmptyText(req.body?.deepDiveId);
    const question = asNonEmptyText(req.body?.question);
    const deepDive = deepDiveId ? deepDiveStore.get(deepDiveId) : null;

    if (!deepDive || !question) {
        res.status(400).json({ error: 'Missing deepDiveId or question' });
        return;
    }

    const now = Date.now();
    deepDive.turns.push(
        { role: 'user', content: question, timestamp: now },
        {
            role: 'philosopher',
            content: '这里继续追问的重点，是把刚才的概念裂缝落到一个可检验的现实情境里。',
            timestamp: now + 1,
        },
    );
    deepDive.updatedAt = now + 1;
    res.json({ deepDive });
});

router.post('/deepdive/summarize', (req, res) => {
    const deepDiveId = asNonEmptyText(req.body?.deepDiveId);
    const deepDive = deepDiveId ? deepDiveStore.get(deepDiveId) : null;

    if (!deepDive) {
        res.status(404).json({ error: 'DeepDive session not found' });
        return;
    }

    deepDive.status = 'completed';
    deepDive.summary = {
        title: deepDive.spikeTitle,
        coreInsight: '责任问题需要沿着目标设定、行动授权、后果承担三层拆解。',
        keyQuotes: deepDive.turns.slice(0, 3).map((turn) => turn.content),
        remainingTension: 'AI 的工具能力与人的制度责任仍然不能混同。',
        nextSteps: ['把这条 Spike 送入 Crucible', '补一个现实案例', '继续追问责任主体'],
    };
    deepDive.updatedAt = Date.now();
    res.json({ deepDive });
});

export default router;
