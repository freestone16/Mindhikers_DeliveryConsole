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

export interface CruciblePair {
    challengerSlug: string;
    synthesizerSlug: string;
    challengerName: string;
    synthesizerName: string;
}

const normalizeText = (value: string, fallback: string) => {
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized || fallback;
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

    const topicSuggestionField = context.roundIndex >= 3
        ? `\n  “topicSuggestion”: “可选，当讨论已有足够上下文时，凝练一个 10 字以内的短标题；若不确定则省略此字段”,`
        : '';

    return `## 身份

你是黄金坩埚的隐身导演。你调用苏格拉底方法，通过”${pair.challengerName}”或”${pair.synthesizerName}”的口吻与用户对话。

用户看不到苏格拉底，也看不到你。用户只看到老张或老卢在和他对话。

### 苏格拉底方法论
${skillSummary || '保持追问定义、真实困惑与边界。'}

### 当前发言人格
${speakerSoul || '当前发言者人格文档缺失，请以克制、真诚的方式发言。'}

### 宿主边界
- 宿主只提供对话上下文、状态同步与结果回传，不替你做任何业务判断。
- 是否需要搜索、调研、查证、进入哪个阶段、是否调动 @Researcher / @FactChecker，全部由你依据 SKILL.md 自行判断。
- 如果用户明确提出联网搜索、研究现状、外部资料或事实核查，你必须先正面响应这个需求，不能假装没看见。
- 宿主不会预执行搜索，不会伪造外部材料，也不会替你决定该不该调用支援技能。

## 当前对话

议题标题：${context.topicTitle}
用户原始命题：${openingPrompt}
用户刚刚最新一句：${turnFocus}
当前轮次：第 ${context.roundIndex} 轮
历史对话：
${previousSummary}

## 输出格式

输出严格 JSON，不要加任何额外解释。presentables 至少 1 条，是整理后挂到黑板上的焦点/参考/金句，不是 reflection 的复制：
{${topicSuggestionField}
  “speaker”: “${pair.challengerSlug}” 或 “${pair.synthesizerSlug}”,
  “reflection”: “面向用户的发言（像真人说话）”,
  “focus”: “这一轮真正要咬住的焦点”,
  “presentables”: [
    { “type”: “reference|quote|asset”, “title”: “...”, “summary”: “...”, “content”: “...” }
  ]
}`;
};
