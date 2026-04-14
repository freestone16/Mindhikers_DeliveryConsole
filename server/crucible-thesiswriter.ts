import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { loadSkillKnowledge } from './skill-loader';
import { loadConfig } from './llm-config';
import { PROVIDER_INFO } from '../src/schemas/llm-config';
import {
    resolveCruciblePersistenceContext,
    getCrucibleConversationDetail,
    appendCrucibleThesisArtifact,
} from './crucible-persistence';
import type {
    CruciblePersistenceContext,
    CrucibleConversationDetail,
    CrucibleConversationArtifact,
} from './crucible-persistence';
import { getCrucibleByokConfig } from './crucible-byok';
import { assertCrucibleThesisTrialAccess } from './crucible-trial';
import { detectThesisConvergence } from './crucible';
import type { SocratesDecision } from './crucible-orchestrator';

interface ThesisGenerateRequest {
    conversationId: string;
    projectId?: string;
    scriptPath?: string;
}

interface ThesisGenerateResponse {
    artifact: {
        id: string;
        type: 'asset';
        title: string;
        summary: string;
    };
    content: string;
}

interface StoredCrucibleTurn {
    roundIndex: number;
    source: 'socrates' | 'fallback';
    userInput?: {
        openingPrompt?: string;
        latestUserReply?: string;
    };
    skillOutput?: {
        speaker?: string;
        utterance?: string;
        focus?: string;
    };
    bridgeOutput?: {
        presentables?: CrucibleConversationArtifact[];
        dialogue?: {
            speaker?: string;
            utterance?: string;
            focus?: string;
        };
    };
    decision?: SocratesDecision;
}

interface StoredCrucibleConversation {
    id: string;
    topicTitle?: string;
    turns: StoredCrucibleTurn[];
}

const sanitizePathSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');

const getConversationFile = (workspaceDir: string, conversationId: string) => (
    path.join(workspaceDir, 'conversations', `${sanitizePathSegment(conversationId)}.json`)
);

const readStoredConversation = (context: CruciblePersistenceContext): StoredCrucibleConversation | null => {
    const conversationFile = getConversationFile(context.workspaceDir, context.conversationId);
    if (!fs.existsSync(conversationFile)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(conversationFile, 'utf-8')) as StoredCrucibleConversation;
    } catch {
        return null;
    }
};

const buildThesisGenerationPrompt = (skillKnowledge: string, dialecticMap: string): string => {
    return `# 任务
你是一位学术论文写作专家（ThesisWriter）。请根据以下方法论和辩证对谈记录，生成一篇深度论文。

# 方法论
${skillKnowledge}

# 辩证对谈记录
${dialecticMap}

# 输出要求
1. 生成一篇 4000-6000 字的学术论文
2. 结构包含：摘要、引言、论辩实录、核心发现、结论
3. 使用 Markdown 格式
4. 直接输出论文全文，不要输出任何解释`;
};
const summarizeText = (value: string, maxLength = 96) => {
    const normalized = value.replace(/[\r\n]/g, '').trim();
    if (!normalized) {
        return '';
    }
    const firstLine = normalized.split('\n').find((line) => line.trim().length > 0) || '';
    const cleaned = firstLine.replace(/^#+\s*/g, '').trim();
    if (!cleaned) {
        return '';
    }
    return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned;
};

const buildDecisionSummary = (decision?: SocratesDecision): string => {
    if (!decision) {
        return '无显式决策记录';
    }
    const toolRequests = decision.toolRequests?.length
        ? decision.toolRequests.map((request) => `${request.tool}(${request.mode})：${request.reason}`).join('；')
        : '无外部工具调用';
    return `阶段：${decision.stageLabel || '未标注'}；需要研究：${decision.needsResearch ? '是' : '否'}；需要查证：${decision.needsFactCheck ? '是' : '否'}；工具：${toolRequests}`;
};

const buildPresentableSummary = (presentables: CrucibleConversationArtifact[] = []) => {
    const core = presentables.filter((item) => item.type !== 'quote');
    const quotes = presentables.filter((item) => item.type === 'quote');
    const corePoints = core.length > 0
        ? core.map((item) => `- ${item.title}: ${item.summary || summarizeText(item.content, 80) || '未提供摘要'}`).join('\n')
        : '- （无显式核心论点，沿用焦点）';
    const quoteLines = quotes.length > 0
        ? quotes.map((item) => `> ${item.content.replace(/\n+/g, ' ').trim()}`).join('\n')
        : '（无显式引用）';
    return { corePoints, quoteLines };
};

const buildDialecticMapFromConversation = (
    detail: CrucibleConversationDetail,
    conversation?: StoredCrucibleConversation | null,
): string => {
    const topicTitle = detail.summary?.topicTitle || detail.snapshot?.topicTitle || conversation?.topicTitle || '未命名议题';
    const lines: string[] = [];

    lines.push(`# 核心议题\n${topicTitle}\n`);

    const turns = conversation?.turns || [];
    if (turns.length > 0) {
        turns
            .slice()
            .sort((a, b) => a.roundIndex - b.roundIndex)
            .forEach((turn) => {
                const userInput = turn.userInput?.latestUserReply?.trim()
                    || turn.userInput?.openingPrompt?.trim()
                    || '（未记录用户原话）';
                const reflection = turn.skillOutput?.utterance?.trim() || '（未记录老卢反思）';
                const focus = turn.skillOutput?.focus?.trim() || '（未记录老张聚焦）';
                const decisionSummary = buildDecisionSummary(turn.decision);
                const presentables = Array.isArray(turn.bridgeOutput?.presentables) ? turn.bridgeOutput?.presentables || [] : [];
                const { corePoints, quoteLines } = buildPresentableSummary(presentables);

                lines.push(`## 第 ${turn.roundIndex} 轮`);
                lines.push(`- 用户发言：${userInput}`);
                lines.push(`- 老卢反思：${reflection}`);
                lines.push(`- 老张聚焦：${focus}`);
                lines.push(`- Socrates 决策：${decisionSummary}`);
                lines.push(`- 核心论点：\n${corePoints}`);
                lines.push(`- 交锋点：${focus}`);
                lines.push(`- 引用：\n${quoteLines}`);
                lines.push('');
            });
    } else {
        lines.push('## 轮次摘要');
        detail.snapshot?.messages?.forEach((message) => {
            const speaker = message.speaker || message.name || 'unknown';
            lines.push(`- ${speaker}：${message.content}`);
        });
        lines.push('');
    }

    const crystallizedQuotes = detail.snapshot?.crystallizedQuotes || [];
    if (crystallizedQuotes.length > 0) {
        lines.push('## 结晶引用');
        crystallizedQuotes.forEach((quote) => {
            lines.push(`> ${quote.content.replace(/\n+/g, ' ').trim()}`);
        });
        lines.push('');
    }

    return lines.join('\n');
};

const callConfiguredLlm = async (
    prompt: string,
    override?: { providerLabel?: string; model: string; baseUrl: string; apiKey: string },
) => {
    const config = loadConfig();
    const expert = config.experts?.crucible?.llm;
    const provider = override?.providerLabel || expert?.provider || config.global?.provider || 'deepseek';
    const model = override?.model || expert?.model || config.global?.model || 'deepseek-chat';
    const apiKey = override?.apiKey || (provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY) || '';
    const baseUrl = override?.baseUrl || PROVIDER_INFO[provider]?.baseUrl || 'https://api.deepseek.com';

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: '你是一位学术论文写作专家。请直接输出 Markdown 格式的论文全文，不要输出任何解释或 JSON 包裹。' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 8000,
        }),
    });
    if (!response.ok) throw new Error(`LLM 调用失败: ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
};

const resolveThesisReady = (
    detail: CrucibleConversationDetail,
    conversation?: StoredCrucibleConversation | null,
): boolean => {
    if (detail.snapshot?.thesisReady === true) {
        return true;
    }
    return Boolean(conversation?.turns?.some((turn) => detectThesisConvergence(
        turn.roundIndex,
        turn.source,
        turn.decision,
    )));
};

export const generateCrucibleThesis = async (req: Request, res: Response) => {
    try {
        const payload = req.body as ThesisGenerateRequest;
        const conversationId = typeof payload?.conversationId === 'string' ? payload.conversationId.trim() : '';
        const projectId = typeof payload?.projectId === 'string' ? payload.projectId : undefined;
        const scriptPath = typeof payload?.scriptPath === 'string' ? payload.scriptPath : undefined;

        if (!conversationId) {
            return res.status(400).json({ error: 'conversationId is required' });
        }

        const detail = await getCrucibleConversationDetail(req, { conversationId, projectId, scriptPath });
        if (!detail) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const context = await resolveCruciblePersistenceContext(req, { conversationId, projectId, scriptPath });
        const storedConversation = readStoredConversation(context);
        const thesisReady = resolveThesisReady(detail, storedConversation);

        if (!thesisReady) {
            return res.status(400).json({ error: '对话尚未收敛，无法生成论文' });
        }

        const byokConfig = await getCrucibleByokConfig(req);
        if (!byokConfig) {
            await assertCrucibleThesisTrialAccess(req, { projectId, scriptPath });
        }

        const dialecticMap = buildDialecticMapFromConversation(detail, storedConversation);
        const skillKnowledge = loadSkillKnowledge('ThesisWriter');
        const prompt = buildThesisGenerationPrompt(skillKnowledge, dialecticMap);

        const content = await callConfiguredLlm(prompt, byokConfig ? {
            providerLabel: byokConfig.providerLabel || undefined,
            model: byokConfig.model,
            baseUrl: byokConfig.baseUrl,
            apiKey: byokConfig.apiKey,
        } : undefined);
        const normalizedContent = content.trim();
        if (!normalizedContent) {
            return res.status(500).json({ error: 'LLM 返回空内容' });
        }

        const topicTitle = detail.summary?.topicTitle?.trim() || '黄金坩埚论文';
        const title = `${topicTitle}｜论文初稿`;
        const summary = summarizeText(normalizedContent, 120) || '论文初稿已生成';

        const { artifactId } = await appendCrucibleThesisArtifact(req, {
            conversationId,
            title,
            summary,
            content: normalizedContent,
            projectId,
            scriptPath,
        });

        const response: ThesisGenerateResponse = {
            artifact: {
                id: artifactId,
                type: 'asset',
                title,
                summary,
            },
            content: normalizedContent,
        };

        return res.json(response);
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        return res.status(statusCode).json({
            error: (error as Error).message || 'Failed to generate thesis',
        });
    }
};
