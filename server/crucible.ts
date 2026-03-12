import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import { loadConfig } from './llm-config';
import { loadSkillKnowledge } from './skill-loader';
import { PROVIDER_INFO } from '../src/schemas/llm-config';
import { loadCrucibleSoulRegistry, loadRegisteredSoulProfiles } from './crucible-soul-loader';

interface InputCard {
    id?: string;
    prompt?: string;
    answer?: string;
    isSaved?: boolean;
}

interface PresentableDraft {
    title: string;
    summary: string;
    content: string;
}

interface DialoguePayload {
    speaker: string;
    utterance: string;
    focus: string;
}

interface SkillOutputPayload {
    speaker: string;
    reflection: string;
    focus: string;
    presentables: PresentableDraft[];
}

interface PromptContext {
    topicTitle: string;
    previousCards: InputCard[];
    roundIndex: number;
    seedPrompt: string;
    latestUserReply: string;
}

interface MaterializedPresentable extends PresentableDraft {
    type: 'reference' | 'quote' | 'asset';
}

type CrucibleEngineMode = 'roundtable_discovery' | 'socratic_refinement';
type CrucibleRuntimePhase = 'topic_lock' | 'deep_dialogue' | 'crystallization';

function getDefaultCruciblePair() {
    try {
        const registry = loadCrucibleSoulRegistry();
        const profiles = loadRegisteredSoulProfiles();
        const nameBySlug = new Map(profiles.map((profile) => [profile.identity.slug, profile.identity.display_name]));
        return {
            challengerSlug: registry.default_pair.challenger,
            synthesizerSlug: registry.default_pair.synthesizer,
            challengerName: nameBySlug.get(registry.default_pair.challenger) || '老张',
            synthesizerName: nameBySlug.get(registry.default_pair.synthesizer) || '老卢',
        };
    } catch {
        return {
            challengerSlug: 'oldzhang',
            synthesizerSlug: 'oldlu',
            challengerName: '老张',
            synthesizerName: '老卢',
        };
    }
}

const DEFAULT_PAIR = getDefaultCruciblePair();

const SEARCH_INTENT_PATTERN = /(搜索|联网|查证|检索|调研|最新|现状|新闻|研究|论文)/;

const detectSearchIntent = (topicTitle: string, previousCards: InputCard[], seedPrompt?: string) => {
    const corpus = [
        topicTitle,
        seedPrompt || '',
        ...previousCards.flatMap((card) => [card.prompt || '', card.answer || '']),
    ].join('\n');
    return SEARCH_INTENT_PATTERN.test(corpus);
};

const buildEnvKeyMap = () => Object.fromEntries(
    Object.entries(PROVIDER_INFO).map(([id, info]) => [id, info.envVars[0]])
);

const PROVIDER_ENV_KEYS = buildEnvKeyMap();

const extractJsonObject = (raw: string) => {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end < start) {
        throw new Error('模型没有返回 JSON 对象');
    }
    return raw.slice(start, end + 1);
};

const normalizeText = (value: string, fallback: string) => {
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized || fallback;
};

const pickSpeaker = (roundIndex: number): string => (
    roundIndex % 2 === 1 ? DEFAULT_PAIR.challengerSlug : DEFAULT_PAIR.synthesizerSlug
);

const buildAnchorText = (value: string, fallback: string, maxLength = 42) => {
    const normalized = normalizeText(value, fallback).replace(/[""'`]/g, '');
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const summarizeText = (value: string, maxLength = 48) => {
    const normalized = normalizeText(value, '').replace(/\s+/g, ' ');
    if (!normalized) {
        return '';
    }
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const classifyPresentableType = (draft: PresentableDraft): MaterializedPresentable['type'] => {
    const text = `${draft.title}\n${draft.summary}\n${draft.content}`;
    if (text.length <= 88) {
        return 'quote';
    }
    if (/[├└│─]|^\s*[-*+]\s+/m.test(text) || /(结构|框架|分层|路径|步骤|阶段|维度)/.test(text)) {
        return 'asset';
    }
    return 'reference';
};

const materializePresentables = (drafts: PresentableDraft[], utterance: string): MaterializedPresentable[] => {
    const normalizedUtterance = normalizeText(utterance, '');
    return drafts
        .filter((draft) => draft?.title && draft?.summary && draft?.content)
        .map((draft) => ({
            title: normalizeText(draft.title, '当前上板内容'),
            summary: summarizeText(draft.summary, 56) || '这一轮的关键焦点',
            content: normalizeText(draft.content, draft.summary || draft.title),
            type: classifyPresentableType(draft),
        }))
        .filter((draft) => normalizeText(draft.content, '') !== normalizedUtterance)
        .slice(0, 2);
};

const sanitizeFileSegment = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const resolveEngineMode = (roundIndex: number, previousCards: InputCard[]): CrucibleEngineMode => (
    roundIndex === 1 && previousCards.length === 0 ? 'roundtable_discovery' : 'socratic_refinement'
);

const deriveRuntimePhase = (roundIndex: number): CrucibleRuntimePhase => {
    if (roundIndex <= 2) {
        return 'topic_lock';
    }
    if (roundIndex <= 4) {
        return 'deep_dialogue';
    }
    return 'crystallization';
};

const buildRoundtableDiscoveryPrompt = ({
    topicTitle,
    seedPrompt,
    latestUserReply,
}: PromptContext) => {
    const openingPrompt = seedPrompt || topicTitle;
    const turnFocus = latestUserReply || seedPrompt || topicTitle;

    return `你正在为 DeliveryConsole 的“黄金坩埚”生成第一轮“圆桌寻刺”结果。

这一轮不是直接进入苏格拉底式死磕，也不是直接给结论，而是先把一个模糊命题里真正值得继续追打的刺找出来。

当前任务：
1. 先模拟后台圆桌已经对用户命题做了一轮高压扫描。
2. 你要生成一段前台可说出的右侧对话 utterance，只允许老张或老卢发言。
3. utterance 必须像真人追问，不能暴露“后台圆桌”“系统分层”“工程术语”。
4. utterance 的职责不是给答案，而是把最值得继续打的那根刺挑出来。
5. 再生成 2-3 条适合挂到中屏黑板的 presentables。
6. presentables 应优先是：
   - 冲突地图
   - 刺点候选
   - 下一刀最该继续追的问题
7. presentables 不能直接复制 utterance。
8. speaker 只能是 "${DEFAULT_PAIR.challengerSlug}" 或 "${DEFAULT_PAIR.synthesizerSlug}"。
9. reflection 必须贴着用户原始命题，先指出哪股力量在打架，再追一个最值得继续咬的问题。
10. 输出严格 JSON，不要带任何解释：
{
  "speaker": "${DEFAULT_PAIR.challengerSlug}",
  "reflection": "${DEFAULT_PAIR.challengerName}：这个题先别急着立场，我先帮你找真正打架的那根刺。",
  "focus": "这一轮最值得继续追打的矛盾",
  "presentables": [
    { "title": "...", "summary": "...", "content": "..." },
    { "title": "...", "summary": "...", "content": "..." }
  ]
}

议题标题：${topicTitle}
用户原始命题：${openingPrompt}
用户刚刚最新一句：${turnFocus}`;
};

const appendTurnLog = (params: {
    projectId: string;
    scriptPath?: string;
    roundIndex: number;
    phase: CrucibleRuntimePhase;
    engineMode: CrucibleEngineMode;
    source: 'socrates' | 'fallback';
    seedPrompt: string;
    latestUserReply: string;
    searchRequested: boolean;
    searchConnected: boolean;
    speaker: string;
    utterance: string;
    focus: string;
    presentables: MaterializedPresentable[];
    skillPresentables: PresentableDraft[];
}) => {
    if (!params.projectId) {
        return;
    }

    const baseDir = path.join(process.cwd(), 'runtime', 'crucible', sanitizeFileSegment(params.projectId));
    fs.mkdirSync(baseDir, { recursive: true });
    const logFile = path.join(baseDir, 'turn_log.json');

    const existing = fs.existsSync(logFile)
        ? JSON.parse(fs.readFileSync(logFile, 'utf-8'))
        : { projectId: params.projectId, scriptPath: params.scriptPath || '', updatedAt: '', turns: [] as any[] };

    existing.scriptPath = params.scriptPath || existing.scriptPath || '';
    existing.updatedAt = new Date().toISOString();
    existing.turns = Array.isArray(existing.turns) ? existing.turns : [];
    existing.turns.push({
        turnId: `turn_${Date.now()}`,
        createdAt: new Date().toISOString(),
        phase: params.phase,
        source: params.source,
        engineMode: params.engineMode,
        roundIndex: params.roundIndex,
        userInput: {
            openingPrompt: params.seedPrompt,
            latestUserReply: params.latestUserReply,
        },
        skillOutput: {
            speaker: params.speaker,
            utterance: params.utterance,
            focus: params.focus,
            candidatePresentables: params.skillPresentables,
        },
        bridgeOutput: {
            dialogue: {
                speaker: params.speaker,
                utterance: params.utterance,
                focus: params.focus,
            },
            presentables: params.presentables,
        },
        meta: {
            searchRequested: params.searchRequested,
            searchConnected: params.searchConnected,
        },
    });

    fs.writeFileSync(logFile, JSON.stringify(existing, null, 2));
};

const buildFallbackPayload = (
    topicTitle: string,
    previousCards: InputCard[],
    roundIndex: number,
    seedPrompt: string,
    latestUserReply: string
): SkillOutputPayload => {
    const previousAnswers = previousCards.map((card) => normalizeText(card.answer || '', '')).filter(Boolean);
    const firstAnswer = previousAnswers[0] || buildAnchorText(latestUserReply || seedPrompt || topicTitle, '你当前最想说清的那个判断');
    const secondAnswer = previousAnswers[1] || '那个最让你犹豫、也最有杀伤力的反方';
    const thirdAnswer = previousAnswers[2] || '读者真正会卡住的那个困惑';
    const speaker = pickSpeaker(roundIndex);
    const openingAnchor = buildAnchorText(seedPrompt || topicTitle, '你刚才抛出来的那句判断');
    const replyAnchor = buildAnchorText(latestUserReply || seedPrompt || topicTitle, '你刚才那句最新回答');

    if (roundIndex <= 1) {
        return {
            speaker: DEFAULT_PAIR.challengerSlug,
            reflection: `${DEFAULT_PAIR.challengerName}：你刚才真正抛出来的，不是一个抽象的大题，而是“${openingAnchor}”背后那个具体判断。我先顺着这里追一个最关键的问题：到底是哪一个真实场景，让你开始觉得这个判断非掰清不可？`,
            focus: '先把最先刺痛你的那个真实场景说出来',
            presentables: [
                {
                    title: '当前上板焦点',
                    summary: '不要先谈宏大主题，先钉住最具体的起点场景。',
                    content: `先围绕“${openingAnchor}”找一个真实场景：是什么场面、什么作品、什么遭遇，让你第一次觉得这个判断必须掰清？`,
                },
                {
                    title: '这一轮先别着急扩题',
                    summary: '把最不服气的那一点先挑出来。',
                    content: '你现在最想咬住的，应该是那个最让你不服气的点，例如内容太像、判断太空、还是技术完成度上去了但思想没跟上。',
                },
            ],
        };
    }

    if (roundIndex === 2) {
        return {
            speaker,
            reflection: speaker === DEFAULT_PAIR.challengerSlug
                ? `${DEFAULT_PAIR.challengerName}：我听到了你刚才这句“${replyAnchor}”。现在别急着再开新题，我想继续追你一句：你最看不惯的那个例子，到底是因为它表面漂亮但里面空，还是因为它从一开始就没站稳判断？`
                : `${DEFAULT_PAIR.synthesizerName}：你刚才这句“${replyAnchor}”已经把一条线托出来了。下一步别再铺，我先帮你把对象、边界和判断标准扣得更准一点。`,
            focus: '把对象、压力点和误判分开',
            presentables: [
                {
                    title: '对象先说窄',
                    summary: `先把“${firstAnswer}”到底在说谁讲清楚。`,
                    content: `先别继续铺陈，把对象收窄：你现在批评或讨论的，到底是哪类内容、哪类创作者、哪种处境？`,
                },
                {
                    title: '最强阻力',
                    summary: `“${secondAnswer}”为什么足以顶住你现在这条线？`,
                    content: `别只写“有人会反对”，要说清它为什么有杀伤力，以及它最容易把你的论点打歪到哪一步。`,
                },
            ],
        };
    }

    if (roundIndex === 3) {
        return {
            speaker,
            reflection: speaker === DEFAULT_PAIR.challengerSlug
                ? `${DEFAULT_PAIR.challengerName}：你前两轮已经把表层困惑说出来了。现在我更关心的是，你到底准备舍弃什么，才能保住“${firstAnswer}”。没有取舍，这个命题就还只是感觉。`
                : `${DEFAULT_PAIR.synthesizerName}：你前两轮已经给出材料了。现在别再加枝叶，我想帮你把主线、证据和读者最终拿走的那句话分开。`,
            focus: '开始收束，明确要保留什么、舍弃什么',
            presentables: [
                {
                    title: '收束的前提是取舍',
                    summary: '先明确什么必须保，什么可以主动放掉。',
                    content: `真正的收束一定伴随取舍。你现在最该保住的是“${firstAnswer}”里的哪一层意思？哪些相关说法可以主动放掉？`,
                },
                {
                    title: '最硬的一根支撑',
                    summary: '先找到那条最能让这篇东西站住的证据或观察。',
                    content: '不用急着凑很多材料，先找出那条最让你敢继续往下讲的经历、证据或观察。',
                },
            ],
        };
    }

    return {
        speaker,
        reflection: speaker === DEFAULT_PAIR.challengerSlug
            ? `${DEFAULT_PAIR.challengerName}：我听到了你上一轮那句“${replyAnchor}”。现在继续追，不是为了把问题弄复杂，而是为了逼出更硬的边界和更清楚的判断。`
            : `${DEFAULT_PAIR.synthesizerName}：我听到了你上一轮那句“${replyAnchor}”。下面这轮我继续帮你把主线、读者困惑和表达顺序收紧。`,
        focus: '继续收紧边界、断点和读者带走的动作',
        presentables: [
            {
                title: '边界比扩题更重要',
                summary: '先写清这篇东西不打算解决什么。',
                content: `围绕“${firstAnswer}”，先把最该守住的一条边界写清。边界越清楚，中心越稳。`,
            },
            {
                title: '最危险的断点',
                summary: `如果“${secondAnswer}”处理不好，整篇内容会从哪里塌掉？`,
                content: `想想最危险的断点在哪：定义不清、证据不够、还是读者根本不买账。最后要落回“${thirdAnswer}”到底对应什么动作或判断。`,
            },
        ],
    };
};

const buildRoundtableFallbackPayload = (
    topicTitle: string,
    seedPrompt: string,
    latestUserReply: string
): SkillOutputPayload => {
    const openingAnchor = buildAnchorText(seedPrompt || topicTitle, '你刚才抛出来的那句判断');
    const replyAnchor = buildAnchorText(latestUserReply || seedPrompt || topicTitle, '你刚才那句最新回答');

    return {
        speaker: DEFAULT_PAIR.challengerSlug,
        reflection: `${DEFAULT_PAIR.challengerName}：这个题先别急着站队。你刚才说的“${replyAnchor}”背后，至少有两股力量正在打架。我现在更想先挑出那根真正扎人的刺：你最不服的，到底是内容变得更快了，还是判断开始变得更空了？`,
        focus: '先从命题里挑出最值得继续死磕的那根刺',
        presentables: [
            {
                title: '冲突地图',
                summary: '先别急着立结论，先看哪几股力量真的在打架。',
                content: [
                    `议题起点：${openingAnchor}`,
                    '对撞一：表达更快 vs 判断更空',
                    '对撞二：产能更高 vs 值得输出的内容更少',
                    '对撞三：工具更强 vs 创作者更容易滑向平均值',
                ].join('\n'),
            },
            {
                title: '刺点候选',
                summary: '这一轮不是要找大标题，而是要先找最该继续咬的那根刺。',
                content: '最值得继续追的不是“AI 好不好”，而是“当工具把表达门槛压低之后，真正稀缺的到底变成了什么”。',
            },
            {
                title: '下一刀',
                summary: '先把最该继续深挖的问题钉住。',
                content: '下一轮不要扩题，直接追：你见过的最典型例子里，究竟是哪一种“空”最让你难受？',
            },
        ],
    };
};

const buildSocratesPrompt = ({
    topicTitle,
    previousCards,
    roundIndex,
    seedPrompt,
    latestUserReply,
}: PromptContext) => {
    const skill = loadSkillKnowledge('Socrates');
    const openingPrompt = seedPrompt || topicTitle;
    const turnFocus = latestUserReply || seedPrompt || topicTitle;
    const previousSummary = previousCards.length === 0
        ? '这是第一轮议题锁定，请先顺着用户原始命题澄清定义、具体场景和真正卡住的地方。'
        : previousCards.map((card, index) => (
            `${index + 1}. 问题：${normalizeText(card.prompt || '', '无')} | 用户回答：${normalizeText(card.answer || '', '未填写')}`
        )).join('\n');

    return `你正在为 DeliveryConsole 的“黄金坩埚”生成一轮苏格拉底对话结果。

以下是 Socrates 技能知识摘要，请遵循其“先澄清定义、明确困惑、划定边界”的路数：
${skill || 'Socrates skill 缺失，请保持追问定义、真实困惑与边界。'}

当前任务：
1. 先生成一段右侧对话 utterance，由老张或老卢继续追问用户。
2. 第一锚点永远是“用户原始命题”和“用户刚刚最新一句”，不是产品名、系统词或空泛大标题。
3. 除非用户自己明确说了“黄金坩埚 / DeliveryConsole / 标题待定 / 老张 / 老卢”等词，否则不要把这些系统词写进问题。
4. utterance 必须像真人追问，普通人可以直接回答。
5. 优先从具体例子、真实困惑、边界、反方切入。
6. 严禁一上来问“第一性原理、机制链条、可验证判断、哲学抽象压缩”这类太学术的话。
7. 再生成 1-3 条适合挂到中屏的 presentables。
8. presentables 不是右侧原话的复制，而是“黑板内容”，应该是被整理过的焦点、参考、结构或金句。
9. presentables 的 content 不得直接等于 utterance。
10. speaker 只能是 "${DEFAULT_PAIR.challengerSlug}" 或 "${DEFAULT_PAIR.synthesizerSlug}"。
11. reflection 必须直接面向用户说话，不能写成系统说明，不能提“中屏 / 卡片 / 回合 / 系统 / 已同步”等操作提示。
12. reflection 里要先贴着用户刚说的焦点复述半句，再追一个最关键的问题。
13. focus 是这一轮右侧对话真正要咬住的中心。
14. 必须输出 JSON，格式严格如下，不要加任何额外解释：
{
  "speaker": "${DEFAULT_PAIR.challengerSlug}",
  "reflection": "${DEFAULT_PAIR.challengerName}：我看到了你的回答，接下来我想继续追问……",
  "focus": "这一轮真正要盯住的焦点",
  "presentables": [
    { "title": "...", "summary": "...", "content": "..." },
    { "title": "...", "summary": "...", "content": "..." }
  ]
}

议题标题：${topicTitle}
用户原始命题：${openingPrompt}
用户刚刚最新一句：${turnFocus}
当前轮次：第 ${roundIndex} 轮
上一轮信息：
${previousSummary}`;
};

const callConfiguredLlm = async (prompt: string) => {
    const config = loadConfig();
    const provider = config.experts.crucible?.llm?.provider || config.global.provider;
    const model = config.experts.crucible?.llm?.model || config.global.model;
    const baseUrl = config.experts.crucible?.llm?.baseUrl || config.global.baseUrl || PROVIDER_INFO[provider]?.baseUrl;
    const apiKey = process.env[PROVIDER_ENV_KEYS[provider] || ''];

    if (!provider || !model || !baseUrl) {
        throw new Error('黄金坩埚当前缺少可用的 LLM 配置');
    }
    if (!apiKey) {
        throw new Error(`未找到 ${provider} 的 API Key`);
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: '你必须只返回 JSON，不要输出任何解释。' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error: ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
};

export const generateCrucibleTurn = async (req: Request, res: Response) => {
    const topicTitle = normalizeText(req.body?.topicTitle || '', '标题待定');
    const roundIndex = Number(req.body?.roundIndex || 1);
    const previousCards = Array.isArray(req.body?.previousCards) ? req.body.previousCards as InputCard[] : [];
    const seedPrompt = normalizeText(req.body?.seedPrompt || '', '');
    const latestUserReply = normalizeText(req.body?.latestUserReply || '', seedPrompt || topicTitle);
    const projectId = normalizeText(req.body?.projectId || '', '');
    const scriptPath = normalizeText(req.body?.scriptPath || '', '');
    const searchRequested = detectSearchIntent(topicTitle, previousCards, seedPrompt);
    const phase = deriveRuntimePhase(roundIndex);
    const engineMode = resolveEngineMode(roundIndex, previousCards);

    try {
        const prompt = engineMode === 'roundtable_discovery'
            ? buildRoundtableDiscoveryPrompt({
                topicTitle,
                previousCards,
                roundIndex,
                seedPrompt,
                latestUserReply,
            })
            : buildSocratesPrompt({
                topicTitle,
                previousCards,
                roundIndex,
                seedPrompt,
                latestUserReply,
            });
        const raw = await callConfiguredLlm(prompt);
        const jsonText = extractJsonObject(raw);
        const parsed = JSON.parse(jsonText) as Partial<SkillOutputPayload>;
        const speaker = parsed.speaker === DEFAULT_PAIR.synthesizerSlug ? DEFAULT_PAIR.synthesizerSlug : DEFAULT_PAIR.challengerSlug;
        const reflection = normalizeText(
            parsed.reflection || '',
            speaker === DEFAULT_PAIR.synthesizerSlug
                ? `${DEFAULT_PAIR.synthesizerName}：我看到了你的回答，下面我帮你把主线和结构继续收紧。`
                : `${DEFAULT_PAIR.challengerName}：我看到了你的回答，下面我继续逼你把问题说得更清楚。`
        );
        const focus = normalizeText(parsed.focus || '', '继续贴着你刚才那句，把真正的焦点说清。');
        const presentables = materializePresentables(Array.isArray(parsed.presentables) ? parsed.presentables : [], reflection);
        const dialogue: DialoguePayload = {
            speaker,
            utterance: reflection,
            focus,
        };

        if (presentables.length === 0) {
            throw new Error('模型返回的 presentables 为空');
        }

        appendTurnLog({
            projectId,
            scriptPath,
            roundIndex,
            phase,
            engineMode,
            source: 'socrates',
            seedPrompt,
            latestUserReply,
            searchRequested,
            searchConnected: false,
            speaker,
            utterance: reflection,
            focus,
            presentables,
            skillPresentables: Array.isArray(parsed.presentables) ? parsed.presentables : [],
        });

        res.json({
            engineMode,
            phase,
            source: 'socrates',
            searchRequested,
            searchConnected: false,
            dialogue,
            presentables,
        });
    } catch (error: any) {
        console.error('[Crucible] Turn generation failed:', error.message);
        const fallback = engineMode === 'roundtable_discovery'
            ? buildRoundtableFallbackPayload(topicTitle, seedPrompt, latestUserReply)
            : buildFallbackPayload(topicTitle, previousCards, roundIndex, seedPrompt, latestUserReply);
        const presentables = materializePresentables(fallback.presentables, fallback.reflection);
        const dialogue: DialoguePayload = {
            speaker: fallback.speaker,
            utterance: fallback.reflection,
            focus: fallback.focus,
        };
        appendTurnLog({
            projectId,
            scriptPath,
            roundIndex,
            phase,
            engineMode,
            source: 'fallback',
            seedPrompt,
            latestUserReply,
            searchRequested,
            searchConnected: false,
            speaker: fallback.speaker,
            utterance: fallback.reflection,
            focus: fallback.focus,
            presentables,
            skillPresentables: fallback.presentables,
        });
        res.json({
            engineMode,
            phase,
            source: 'fallback',
            warning: error.message,
            searchRequested,
            searchConnected: false,
            dialogue,
            presentables,
        });
    }
};

export const generateSocraticQuestions = generateCrucibleTurn;
