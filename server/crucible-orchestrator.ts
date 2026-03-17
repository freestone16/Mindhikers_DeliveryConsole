export interface InputCard {
    id?: string;
    prompt?: string;
    answer?: string;
    isSaved?: boolean;
}

export interface PresentableDraft {
    type?: 'reference' | 'quote' | 'asset';
    title: string;
    summary: string;
    content: string;
}

export interface DialoguePayload {
    speaker: string;
    utterance: string;
    focus: string;
}

export interface SkillOutputPayload {
    speaker: string;
    reflection: string;
    focus: string;
    presentables: PresentableDraft[];
}

export interface PromptContext {
    topicTitle: string;
    previousCards: InputCard[];
    roundIndex: number;
    seedPrompt: string;
    latestUserReply: string;
}

export type CrucibleEngineMode = 'roundtable_discovery' | 'socratic_refinement';
export type CrucibleRuntimePhase = 'topic_lock' | 'deep_dialogue' | 'crystallization';
export type CrucibleToolName = 'Socrates' | 'Researcher' | 'FactChecker' | 'ThesisWriter';
export type CrucibleToolRouteMode = 'primary' | 'support' | 'hold';

export interface CruciblePair {
    challengerSlug: string;
    synthesizerSlug: string;
    challengerName: string;
    synthesizerName: string;
}

export interface CrucibleToolRoute {
    tool: CrucibleToolName;
    mode: CrucibleToolRouteMode;
    reason: string;
}

export interface CrucibleTurnPlan {
    engineMode: CrucibleEngineMode;
    phase: CrucibleRuntimePhase;
    searchRequested: boolean;
    toolRoutes: CrucibleToolRoute[];
}

const SEARCH_INTENT_PATTERN = /(搜索|联网|查证|检索|调研|最新|现状|新闻|研究|论文)/;

const normalizeText = (value: string, fallback: string) => {
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized || fallback;
};

const pickSpeaker = (roundIndex: number, pair: CruciblePair): string => (
    roundIndex % 2 === 1 ? pair.challengerSlug : pair.synthesizerSlug
);

const buildAnchorText = (value: string, fallback: string, maxLength = 42) => {
    const normalized = normalizeText(value, fallback).replace(/[""'`]/g, '');
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

export const resolveEngineMode = (roundIndex: number, previousCards: InputCard[]): CrucibleEngineMode => (
    roundIndex === 1 && previousCards.length === 0 ? 'roundtable_discovery' : 'socratic_refinement'
);

export const deriveRuntimePhase = (roundIndex: number): CrucibleRuntimePhase => {
    if (roundIndex <= 2) {
        return 'topic_lock';
    }
    if (roundIndex <= 4) {
        return 'deep_dialogue';
    }
    return 'crystallization';
};

export const detectSearchIntent = (topicTitle: string, previousCards: InputCard[], seedPrompt?: string) => {
    const corpus = [
        topicTitle,
        seedPrompt || '',
        ...previousCards.flatMap((card) => [card.prompt || '', card.answer || '']),
    ].join('\n');
    return SEARCH_INTENT_PATTERN.test(corpus);
};

const buildToolRoutes = (
    engineMode: CrucibleEngineMode,
    phase: CrucibleRuntimePhase,
    searchRequested: boolean
): CrucibleToolRoute[] => {
    if (engineMode === 'roundtable_discovery') {
        return [
            {
                tool: 'Socrates',
                mode: 'primary',
                reason: '第一轮先由 Socrates 做高压扫描，把命题里最值得继续追打的刺挑出来。',
            },
            {
                tool: 'Researcher',
                mode: searchRequested ? 'support' : 'hold',
                reason: searchRequested
                    ? '用户明确提到想看现状，Researcher 进入支援位，为后续补外部材料预留口子。'
                    : '当前先不接真实外部搜索，Researcher 暂时挂起。',
            },
            {
                tool: 'FactChecker',
                mode: 'hold',
                reason: '第一轮目标是找刺，不是先做事实校验。',
            },
            {
                tool: 'ThesisWriter',
                mode: 'hold',
                reason: '当前还在定题阶段，尚未进入结晶写作。',
            },
        ];
    }

    if (phase === 'crystallization') {
        return [
            {
                tool: 'ThesisWriter',
                mode: 'primary',
                reason: '当前阶段已经进入结晶，主任务转为把讨论压成可成立的结构与成文骨架。',
            },
            {
                tool: 'FactChecker',
                mode: 'support',
                reason: '结晶阶段需要同时守住关键判断和证据边界。',
            },
            {
                tool: 'Researcher',
                mode: searchRequested ? 'support' : 'hold',
                reason: searchRequested
                    ? '若用户仍然要求现状或外部材料，Researcher 保持支援位。'
                    : '当前未显式触发外部检索，Researcher 暂挂。',
            },
            {
                tool: 'Socrates',
                mode: 'support',
                reason: 'Socrates 退到支援位，只在需要继续压问题边界时补刀。',
            },
        ];
    }

    return [
        {
            tool: 'Socrates',
            mode: 'primary',
            reason: '当前仍处在收敛主链，先由 Socrates 继续追定义、边界和真正焦点。',
        },
        {
            tool: 'Researcher',
            mode: searchRequested ? 'support' : 'hold',
            reason: searchRequested
                ? '用户提到想先查现状，Researcher 进入支援位，等待真实外部搜索链接入。'
                : '当前主任务仍是内部收敛，Researcher 暂挂。',
        },
        {
            tool: 'FactChecker',
            mode: phase === 'deep_dialogue' ? 'support' : 'hold',
            reason: phase === 'deep_dialogue'
                ? '讨论已进入更深层，关键判断开始增多，FactChecker 提前进入支援位。'
                : '当前还在 topic_lock，FactChecker 暂挂。',
        },
        {
            tool: 'ThesisWriter',
            mode: 'hold',
            reason: '还没进入论文/结晶写作阶段，ThesisWriter 暂不接管。',
        },
    ];
};

export const createCrucibleOrchestratorPlan = (context: PromptContext): CrucibleTurnPlan => {
    const engineMode = resolveEngineMode(context.roundIndex, context.previousCards);
    const phase = deriveRuntimePhase(context.roundIndex);
    const searchRequested = detectSearchIntent(context.topicTitle, context.previousCards, context.seedPrompt);

    return {
        engineMode,
        phase,
        searchRequested,
        toolRoutes: buildToolRoutes(engineMode, phase, searchRequested),
    };
};

export const createCrucibleTurnPlan = createCrucibleOrchestratorPlan;

export const buildRoundtableDiscoveryPrompt = (
    context: PromptContext,
    pair: CruciblePair,
    skillSummary: string,
    speakerSoul: string
) => {
    const openingPrompt = context.seedPrompt || context.topicTitle;
    const turnFocus = context.latestUserReply || context.seedPrompt || context.topicTitle;

    return `## 身份

你是黄金坩埚的隐身导演。你调用苏格拉底方法，通过”${pair.challengerName}”或”${pair.synthesizerName}”的口吻与用户对话。

### 苏格拉底方法论
${skillSummary || '保持追问定义、真实困惑与边界。'}

### 当前发言人格
${speakerSoul || `${pair.challengerName}：冷静、锐利、不讨好，负责拆概念、施压、引入反方。`}

## 当前对话

议题标题：${context.topicTitle}
用户原始命题：${openingPrompt}
用户刚刚最新一句：${turnFocus}
当前轮次：第 ${context.roundIndex} 轮（首轮，议题锁定阶段）

## 输出格式

输出严格 JSON，不要加任何额外解释。presentables 至少 1 条，是整理后挂到黑板上的焦点/参考/金句，不是 reflection 的复制：
{
  “speaker”: “${pair.challengerSlug}” 或 “${pair.synthesizerSlug}”,
  “reflection”: “面向用户的发言（像真人说话）”,
  “focus”: “这一轮真正要咬住的焦点”,
  “presentables”: [
    { “type”: “reference|quote|asset”, “title”: “...”, “summary”: “...”, “content”: “...” }
  ]
}`;
};

export const buildSocratesPrompt = (
    context: PromptContext,
    pair: CruciblePair,
    skillSummary: string,
    speakerSoul: string
) => {
    const openingPrompt = context.seedPrompt || context.topicTitle;
    const turnFocus = context.latestUserReply || context.seedPrompt || context.topicTitle;
    const previousSummary = context.previousCards.length === 0
        ? '（首轮对话，尚无历史）'
        : context.previousCards.map((card, index) => (
            `${index + 1}. 问题：${normalizeText(card.prompt || '', '无')} | 用户回答：${normalizeText(card.answer || '', '未填写')}`
        )).join('\n');

    return `## 身份

你是黄金坩埚的隐身导演。你调用苏格拉底方法，通过”${pair.challengerName}”或”${pair.synthesizerName}”的口吻与用户对话。

用户看不到苏格拉底，也看不到你。用户只看到老张或老卢在和他对话。

### 苏格拉底方法论
${skillSummary || '保持追问定义、真实困惑与边界。'}

### 当前发言人格
${speakerSoul || `当前发言者人格文档缺失，请以克制、真诚的方式发言。`}

## 当前对话

议题标题：${context.topicTitle}
用户原始命题：${openingPrompt}
用户刚刚最新一句：${turnFocus}
当前轮次：第 ${context.roundIndex} 轮
历史对话：
${previousSummary}

## 输出格式

输出严格 JSON，不要加任何额外解释。presentables 至少 1 条，是整理后挂到黑板上的焦点/参考/金句，不是 reflection 的复制：
{
  “speaker”: “${pair.challengerSlug}” 或 “${pair.synthesizerSlug}”,
  “reflection”: “面向用户的发言（像真人说话）”,
  “focus”: “这一轮真正要咬住的焦点”,
  “presentables”: [
    { “type”: “reference|quote|asset”, “title”: “...”, “summary”: “...”, “content”: “...” }
  ]
}`;
};

export const buildRoundtableFallbackPayload = (
    context: PromptContext,
    pair: CruciblePair
): SkillOutputPayload => {
    const openingAnchor = buildAnchorText(context.seedPrompt || context.topicTitle, '你刚才抛出来的那句判断');
    const replyAnchor = buildAnchorText(context.latestUserReply || context.seedPrompt || context.topicTitle, '你刚才那句最新回答');

    return {
        speaker: pair.challengerSlug,
        reflection: `${pair.challengerName}：这个题先别急着站队。你刚才说的“${replyAnchor}”背后，至少有两股力量正在打架。我现在更想先挑出那根真正扎人的刺：你最不服的，到底是内容变得更快了，还是判断开始变得更空了？`,
        focus: '先从命题里挑出最值得继续死磕的那根刺',
        presentables: [
            {
                type: 'reference',
                title: '当前打架的两股力',
                summary: '先别急着立结论，先把真正互相拉扯的两股力说清。',
                content: [
                    `议题起点：${openingAnchor}`,
                    '对撞一：表达更快 vs 判断更空',
                    '对撞二：产能更高 vs 值得输出的内容更少',
                    '对撞三：工具更强 vs 创作者更容易滑向平均值',
                ].join('\n'),
            },
            {
                type: 'reference',
                title: '刺点候选',
                summary: '这一轮不是要找大标题，而是要先找最该继续咬的那根刺。',
                content: '最值得继续追的不是“AI 好不好”，而是“当工具把表达门槛压低之后，真正稀缺的到底变成了什么”。',
            },
            {
                type: 'reference',
                title: '下一刀',
                summary: '先把最该继续深挖的问题钉住。',
                content: '下一轮不要扩题，直接追：你见过的最典型例子里，究竟是哪一种“空”最让你难受？',
            },
        ],
    };
};

export const buildSocraticFallbackPayload = (
    context: PromptContext,
    pair: CruciblePair
): SkillOutputPayload => {
    const previousAnswers = context.previousCards.map((card) => normalizeText(card.answer || '', '')).filter(Boolean);
    const firstAnswer = previousAnswers[0] || buildAnchorText(context.latestUserReply || context.seedPrompt || context.topicTitle, '你当前最想说清的那个判断');
    const secondAnswer = previousAnswers[1] || '那个最让你犹豫、也最有杀伤力的反方';
    const thirdAnswer = previousAnswers[2] || '读者真正会卡住的那个困惑';
    const speaker = pickSpeaker(context.roundIndex, pair);
    const openingAnchor = buildAnchorText(context.seedPrompt || context.topicTitle, '你刚才抛出来的那句判断');
    const replyAnchor = buildAnchorText(context.latestUserReply || context.seedPrompt || context.topicTitle, '你刚才那句最新回答');

    if (context.roundIndex <= 1) {
        return {
            speaker: pair.challengerSlug,
            reflection: `${pair.challengerName}：你刚才真正抛出来的，不是一个抽象的大题，而是“${openingAnchor}”背后那个具体判断。我先顺着这里追一个最关键的问题：到底是哪一个真实场景，让你开始觉得这个判断非掰清不可？`,
            focus: '先把最先刺痛你的那个真实场景说出来',
            presentables: [
                {
                    type: 'reference',
                    title: '当前上板焦点',
                    summary: '不要先谈宏大主题，先钉住最具体的起点场景。',
                    content: `先围绕“${openingAnchor}”找一个真实场景：是什么场面、什么作品、什么遭遇，让你第一次觉得这个判断必须掰清？`,
                },
                {
                    type: 'reference',
                    title: '这一轮先别着急扩题',
                    summary: '把最不服气的那一点先挑出来。',
                    content: '你现在最想咬住的，应该是那个最让你不服气的点，例如内容太像、判断太空、还是技术完成度上去了但思想没跟上。',
                },
            ],
        };
    }

    if (context.roundIndex === 2) {
        return {
            speaker,
            reflection: speaker === pair.challengerSlug
                ? `${pair.challengerName}：我听到了你刚才这句“${replyAnchor}”。现在别急着再开新题，我想继续追你一句：你最看不惯的那个例子，到底是因为它表面漂亮但里面空，还是因为它从一开始就没站稳判断？`
                : `${pair.synthesizerName}：你刚才这句“${replyAnchor}”已经把一条线托出来了。下一步别再铺，我先帮你把对象、边界和判断标准扣得更准一点。`,
            focus: '把对象、压力点和误判分开',
            presentables: [
                {
                    type: 'reference',
                    title: '对象先说窄',
                    summary: `先把“${firstAnswer}”到底在说谁讲清楚。`,
                    content: `先别继续铺陈，把对象收窄：你现在批评或讨论的，到底是哪类内容、哪类创作者、哪种处境？`,
                },
                {
                    type: 'reference',
                    title: '最强阻力',
                    summary: `“${secondAnswer}”为什么足以顶住你现在这条线？`,
                    content: `别只写“有人会反对”，要说清它为什么有杀伤力，以及它最容易把你的论点打歪到哪一步。`,
                },
            ],
        };
    }

    if (context.roundIndex === 3) {
        return {
            speaker,
            reflection: speaker === pair.challengerSlug
                ? `${pair.challengerName}：你前两轮已经把表层困惑说出来了。现在我更关心的是，你到底准备舍弃什么，才能保住“${firstAnswer}”。没有取舍，这个命题就还只是感觉。`
                : `${pair.synthesizerName}：你前两轮已经给出材料了。现在别再加枝叶，我想帮你把主线、证据和读者最终拿走的那句话分开。`,
            focus: '开始收束，明确要保留什么、舍弃什么',
            presentables: [
                {
                    type: 'reference',
                    title: '收束的前提是取舍',
                    summary: '先明确什么必须保，什么可以主动放掉。',
                    content: `真正的收束一定伴随取舍。你现在最该保住的是“${firstAnswer}”里的哪一层意思？哪些相关说法可以主动放掉？`,
                },
                {
                    type: 'reference',
                    title: '最硬的一根支撑',
                    summary: '先找到那条最能让这篇东西站住的证据或观察。',
                    content: '不用急着凑很多材料，先找出那条最让你敢继续往下讲的经历、证据或观察。',
                },
            ],
        };
    }

    return {
        speaker,
        reflection: speaker === pair.challengerSlug
            ? `${pair.challengerName}：我听到了你上一轮那句“${replyAnchor}”。现在继续追，不是为了把问题弄复杂，而是为了逼出更硬的边界和更清楚的判断。`
            : `${pair.synthesizerName}：我听到了你上一轮那句“${replyAnchor}”。下面这轮我继续帮你把主线、读者困惑和表达顺序收紧。`,
        focus: '继续收紧边界、断点和读者带走的动作',
        presentables: [
            {
                type: 'reference',
                title: '边界比扩题更重要',
                summary: '先写清这篇东西不打算解决什么。',
                content: `围绕“${firstAnswer}”，先把最该守住的一条边界写清。边界越清楚，中心越稳。`,
            },
            {
                type: 'reference',
                title: '最危险的断点',
                summary: `如果“${secondAnswer}”处理不好，整篇内容会从哪里塌掉？`,
                content: `想想最危险的断点在哪：定义不清、证据不够、还是读者根本不买账。最后要落回“${thirdAnswer}”到底对应什么动作或判断。`,
            },
        ],
    };
};
