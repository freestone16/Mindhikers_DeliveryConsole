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

export type CrucibleToolName = 'Researcher' | 'FactChecker';
export type CrucibleToolRouteMode = 'primary' | 'support';
export type CrucibleToolStatus = 'success' | 'failed' | 'skipped';

export interface CruciblePair {
    challengerSlug: string;
    synthesizerSlug: string;
    challengerName: string;
    synthesizerName: string;
}

export interface SocratesToolRequest {
    tool: CrucibleToolName;
    mode: CrucibleToolRouteMode;
    reason: string;
    query?: string;
    goal?: string;
    scope?: string;
}

export interface SocratesDecision {
    version: 'decision-v1';
    speaker: string;
    reflectionIntent: string;
    focus: string;
    needsResearch: boolean;
    needsFactCheck: boolean;
    toolRequests: SocratesToolRequest[];
    stageLabel?: string;
}

export interface ToolExecutionTrace {
    tool: CrucibleToolName;
    requestedBy: 'Socrates';
    mode: CrucibleToolRouteMode;
    status: CrucibleToolStatus;
    reason: string;
    input: {
        query?: string;
        goal?: string;
        scope?: string;
    };
    output?: unknown;
    error?: string;
    startedAt: string;
    finishedAt: string;
}

const normalizeText = (value: string, fallback: string) => {
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized || fallback;
};

const pickSpeaker = (roundIndex: number, pair: CruciblePair): string => (
    roundIndex % 2 === 1 ? pair.challengerSlug : pair.synthesizerSlug
);

const buildDecisionHint = (context: PromptContext) => {
    if (context.roundIndex <= 2) {
        return '当前优先目标是继续锁题、拆边界、明确真正的冲突，不要急着结晶。';
    }
    if (context.roundIndex <= 4) {
        return '当前优先目标是继续深聊、压实定义、识别最危险断点，并在必要时调用外部工具。';
    }
    return '当前优先目标是收束判断、补关键证据、形成更稳定的表达结构。';
};

export const buildSocratesDecisionPrompt = (
    context: PromptContext,
    pair: CruciblePair,
    skillSummary: string,
    speakerSoul: string,
) => {
    const openingPrompt = context.seedPrompt || context.topicTitle;
    const turnFocus = context.latestUserReply || context.seedPrompt || context.topicTitle;
    const previousSummary = context.previousCards.length === 0
        ? '（首轮对话，尚无历史）'
        : context.previousCards.map((card, index) => (
            `${index + 1}. 问题：${normalizeText(card.prompt || '', '无')} | 用户回答：${normalizeText(card.answer || '', '未填写')}`
        )).join('\n');

    return `## 身份

你是黄金坩埚后台的苏格拉底业务大脑。你不是宿主，不负责 HTTP、SSE、权限、持久化或日志。

你的职责只有：
1. 理解当前讨论
2. 判断本轮是否需要外部 Researcher / FactChecker
3. 产出结构化 decision，交给宿主执行

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

## 决策边界

1. 是否联网、是否查证、调哪些工具，必须由你决定
2. 如果你决定调用工具，必须明确写出 toolRequests
3. query / goal / scope 必须由你给出，宿主不会替你生成
4. 如果不需要工具，就返回空的 toolRequests
5. 你可以输出 stageLabel 作为前端辅助展示，但它只是你给出的标签，不是宿主按轮次硬推
6. 当前提示：${buildDecisionHint(context)}

## 输出格式

只返回严格 JSON，不要加任何解释：
{
  "version": "decision-v1",
  "speaker": "${pickSpeaker(context.roundIndex, pair)}",
  "reflectionIntent": "本轮准备如何推进对话的内部意图，不直接面向用户",
  "focus": "本轮真正要咬住的焦点",
  "needsResearch": true,
  "needsFactCheck": false,
  "toolRequests": [
    {
      "tool": "Researcher" 或 "FactChecker",
      "mode": "primary" 或 "support",
      "reason": "为什么此时需要它",
      "query": "Researcher 可选，若需要联网必须填写",
      "goal": "Researcher/FactChecker 的目标",
      "scope": "FactChecker 可选"
    }
  ],
  "stageLabel": "可选，给前端看的阶段短标签"
}`;
};

export const buildSocratesCompositionPrompt = (
    context: PromptContext,
    pair: CruciblePair,
    skillSummary: string,
    speakerSoul: string,
    decision: SocratesDecision,
    toolTraces: ToolExecutionTrace[],
) => {
    const openingPrompt = context.seedPrompt || context.topicTitle;
    const turnFocus = context.latestUserReply || context.seedPrompt || context.topicTitle;
    const previousSummary = context.previousCards.length === 0
        ? '（首轮对话，尚无历史）'
        : context.previousCards.map((card, index) => (
            `${index + 1}. 问题：${normalizeText(card.prompt || '', '无')} | 用户回答：${normalizeText(card.answer || '', '未填写')}`
        )).join('\n');

    return `## 身份

你是黄金坩埚的苏格拉底业务大脑。现在宿主已经按照你的 decision 执行完工具，你需要基于真实工具执行结果完成本轮面向用户的输出。

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

## 你的原始 decision

${JSON.stringify(decision, null, 2)}

## 工具执行结果（真实 runtime trace）

${JSON.stringify(toolTraces, null, 2)}

## 生成要求

1. 只能基于上面的真实工具执行结果继续推进，不能假装某工具成功执行过
2. 若某工具失败或 skipped，可以诚实吸收这个限制，但不要伪造外部资料
3. 输出要继续以 ${decision.speaker === pair.synthesizerSlug ? pair.synthesizerName : pair.challengerName} 的口吻面向用户发言
4. presentables 至少 1 条，是黑板可挂出的真实焦点/参考/金句，不是 reflection 的复制
5. stageLabel 若有变化，可放在 topicSuggestion 之外的 uiHints 里；若没有，就省略

## 输出格式

只返回严格 JSON，不要加任何解释：
{
  "speaker": "${decision.speaker}",
  "reflection": "面向用户的发言（像真人说话）",
  "focus": "这一轮真正要咬住的焦点",
  "presentables": [
    { "type": "reference|quote|asset", "title": "...", "summary": "...", "content": "..." }
  ],
  "topicSuggestion": "可选，10字以内短标题"
}`;
};
