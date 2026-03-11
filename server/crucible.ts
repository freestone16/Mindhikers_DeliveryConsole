import type { Request, Response } from 'express';
import { loadConfig } from './llm-config';
import { loadSkillKnowledge } from './skill-loader';
import { PROVIDER_INFO } from '../src/schemas/llm-config';

interface InputCard {
    id?: string;
    prompt?: string;
    answer?: string;
    isSaved?: boolean;
}

interface OutputCard {
    prompt: string;
    helper: string;
}

interface OutputPayload {
    speaker: 'laozhang' | 'laolu';
    reflection: string;
    cards: OutputCard[];
}

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

const pickSpeaker = (roundIndex: number): 'laozhang' | 'laolu' => (roundIndex % 2 === 1 ? 'laozhang' : 'laolu');

const buildFallbackPayload = (topicTitle: string, previousCards: InputCard[], roundIndex: number): OutputPayload => {
    const previousAnswers = previousCards.map((card) => normalizeText(card.answer || '', '')).filter(Boolean);
    const firstAnswer = previousAnswers[0] || '你当前最想说清的那个判断';
    const secondAnswer = previousAnswers[1] || '那个最让你犹豫的反对意见';
    const thirdAnswer = previousAnswers[2] || '读者真正会卡住的困惑';
    const speaker = pickSpeaker(roundIndex);

    if (roundIndex <= 1) {
        return {
            speaker: 'laozhang',
            reflection: `老张：我先不接你的大结论。你现在真正想掰清楚的，不是“${topicTitle}”这个大词，而是你心里卡着的那个具体判断。先把它说实，我们再往下推。`,
            cards: [
                {
                    prompt: `先别急着下结论。围绕“${topicTitle}”，你这次最想说清的到底是哪件具体事？`,
                    helper: '尽量别写大主题，先写那个你现在最想掰清楚的具体困惑或判断。',
                },
                {
                    prompt: '这件事为什么现在会卡住你？有没有一个真实场景能说明它？',
                    helper: '先讲例子，不急着讲理论。一个你亲身经历、亲眼见过或反复遇到的场景就够。',
                },
                {
                    prompt: '如果这轮聊完，你最希望自己想明白什么？',
                    helper: '写成一句人话，别写宏大目标，就写这次讨论真正想解决的那个结。',
                },
            ],
        };
    }

    if (roundIndex === 2) {
        return {
            speaker,
            reflection: speaker === 'laozhang'
                ? `老张：我看到了你的回答，核心已经露头了，尤其是“${firstAnswer}”。但它现在还像一句判断，不像一个能站住的命题。下一轮我会继续逼你把场景、反方和判断标准钉牢。`
                : `老卢：我看到了你的回答，里面已经有一根可以托起来的线，尤其是“${firstAnswer}”。但结构还松，下一轮我先帮你把对象、标准和边界托住。`,
            cards: [
                {
                    prompt: `你刚才最想保住的是“${firstAnswer}”，那这句话到底在说谁、说哪类内容、说哪种处境？`,
                    helper: '先把对象说窄一点。对象越清楚，后面越容易判断对错。',
                },
                {
                    prompt: `你提到“${secondAnswer}”，那它为什么真能构成压力？它最打到你的地方是什么？`,
                    helper: '别只写“有人会反对”，要写这股反力为什么有杀伤力。',
                },
                {
                    prompt: `如果读者最后真得到“${thirdAnswer}”，他在读之前最常犯的误判是什么？`,
                    helper: '写一个常见误判或错觉，让这篇东西的必要性更具体。',
                },
            ],
        };
    }

    if (roundIndex === 3) {
        return {
            speaker,
            reflection: speaker === 'laozhang'
                ? `老张：你前两轮已经把表层困惑说出来了。我现在更关心的是，你到底准备舍弃什么，才能保住“${firstAnswer}”。没有取舍，命题就还没成形。`
                : `老卢：你前两轮已经给出材料了。现在要开始收束，不是继续铺。我要你把最该保留的主线、最该删掉的枝叶和读者最终拿走的那一句话分开。`,
            cards: [
                {
                    prompt: `如果你只能保住一个核心结论，你会保“${firstAnswer}”的哪一层意思？另外哪些相关说法你愿意主动放掉？`,
                    helper: '真正的收束一定伴随取舍。把你愿意舍掉的东西也写出来。',
                },
                {
                    prompt: `到目前为止，最能支撑你这个判断的一条证据、经历或观察是什么？`,
                    helper: '不用凑三条证据，先写那条最让你敢继续往下讲的。',
                },
                {
                    prompt: '如果要把这篇内容写成三段，第一段破什么误解，第二段立什么判断，第三段给什么出路？',
                    helper: '别写完整大纲，只写三段各自的任务。',
                },
            ],
        };
    }

    return {
        speaker,
        reflection: speaker === 'laozhang'
            ? `老张：我看到了你的上一轮回答，尤其是“${firstAnswer}”。现在继续追问，不是为了把问题搞复杂，而是为了逼出更清晰的边界和更硬的判断。`
            : `老卢：我看到了你的上一轮回答，已经能托起一个更稳的结构了。下面这轮，我会继续帮你把主线、读者困惑和表达顺序收紧。`,
        cards: [
            {
                prompt: `先别再扩题。围绕“${firstAnswer}”，这篇内容最该守住的一条边界是什么？`,
                helper: '写“这篇东西不打算解决什么”，边界越清楚，中心越稳。',
            },
            {
                prompt: `如果把“${secondAnswer}”处理不好，整篇内容最容易塌在哪一步？`,
                helper: '想想最危险的断点在哪，是定义不清、证据不够，还是读者不买账。',
            },
            {
                prompt: `最后再收一次：你希望读者真正带走的是“${thirdAnswer}”里的哪一个动作或判断？`,
                helper: '别写感受，写读完后他会怎么想、怎么看、怎么选。',
            },
        ],
    };
};

const buildSocratesPrompt = (topicTitle: string, previousCards: InputCard[], roundIndex: number) => {
    const skill = loadSkillKnowledge('Socrates');
    const previousSummary = previousCards.length === 0
        ? '这是第一轮议题锁定，请从定义、具体场景、讨论目的切入。'
        : previousCards.map((card, index) => (
            `${index + 1}. 问题：${normalizeText(card.prompt || '', '无')} | 用户回答：${normalizeText(card.answer || '', '未填写')}`
        )).join('\n');

    return `你正在为 DeliveryConsole 的“黄金坩埚”生成苏格拉底式问题卡。

以下是 Socrates 技能知识摘要，请遵循其“先澄清定义、明确困惑、划定边界”的路数：
${skill || 'Socrates skill 缺失，请保持追问定义、真实困惑与边界。'}

当前任务：
1. 为“议题锁定阶段”生成 3 张问题卡。
2. 问题必须像真人追问，普通人可以直接回答。
3. 优先从具体例子、真实困惑、边界、反方切入。
4. 严禁一上来问“第一性原理、机制链条、可验证判断、哲学抽象压缩”这类太学术的话。
5. 每张卡只包含：
   - prompt：一句追问
   - helper：一句更接地气的说明
6. 问题风格要像 Socrates，但不要长篇说教。
7. 除了 3 张问题卡，还要输出一段 1-2 句的人话反馈，像老张或老卢已经读完用户上一轮回答，并准备继续追问。
8. speaker 只能是 "laozhang" 或 "laolu"。
9. reflection 必须直接面向用户说话，不能写成系统说明。
10. 必须输出 JSON，格式严格如下，不要加任何额外解释：
{
  "speaker": "laozhang",
  "reflection": "老张：我看到了你的回答，接下来我想继续追问……",
  "cards": [
    { "prompt": "...", "helper": "..." },
    { "prompt": "...", "helper": "..." },
    { "prompt": "...", "helper": "..." }
  ]
}

议题标题：${topicTitle}
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

export const generateSocraticQuestions = async (req: Request, res: Response) => {
    const topicTitle = normalizeText(req.body?.topicTitle || '', '标题待定');
    const roundIndex = Number(req.body?.roundIndex || 1);
    const previousCards = Array.isArray(req.body?.previousCards) ? req.body.previousCards as InputCard[] : [];

    try {
        const prompt = buildSocratesPrompt(topicTitle, previousCards, roundIndex);
        const raw = await callConfiguredLlm(prompt);
        const jsonText = extractJsonObject(raw);
        const parsed = JSON.parse(jsonText) as Partial<OutputPayload>;
        const cards = Array.isArray(parsed.cards)
            ? parsed.cards
                .filter((card) => card?.prompt && card?.helper)
                .slice(0, 3)
                .map((card) => ({
                    prompt: normalizeText(card.prompt, '请换一种更具体的人话继续追问。'),
                    helper: normalizeText(card.helper, '请继续围绕真实困惑和具体场景往下问。'),
                }))
            : [];

        if (cards.length === 0) {
            throw new Error('模型返回的 cards 为空');
        }

        const speaker = parsed.speaker === 'laolu' ? 'laolu' : 'laozhang';
        const reflection = normalizeText(
            parsed.reflection || '',
            speaker === 'laolu'
                ? '老卢：我看到了你的回答，下面我帮你把主线和结构继续收紧。'
                : '老张：我看到了你的回答，下面我继续逼你把问题说得更清楚。'
        );

        res.json({ cards, source: 'socrates', speaker, reflection });
    } catch (error: any) {
        console.error('[Crucible] Socratic question generation failed:', error.message);
        const fallback = buildFallbackPayload(topicTitle, previousCards, roundIndex);
        res.json({
            cards: fallback.cards,
            source: 'fallback',
            speaker: fallback.speaker,
            reflection: fallback.reflection,
            warning: error.message,
        });
    }
};
