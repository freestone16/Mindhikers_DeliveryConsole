import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import { loadConfig } from './llm-config';
import { loadSkillKnowledge } from './skill-loader';
import { PROVIDER_INFO } from '../src/schemas/llm-config';
import {
    SkillOutputPayloadSchema,
    SocratesDecisionSchema,
    type SkillOutputPayloadShape,
} from '../src/schemas/crucible-runtime';
import { loadCrucibleSoulRegistry, loadRegisteredSoulProfiles } from './crucible-soul-loader';
import {
    buildSocratesCompositionPrompt,
    buildSocratesDecisionPrompt,
    type CruciblePair,
    type DialoguePayload,
    type InputCard,
    type PresentableDraft,
    type PromptContext,
    type SocratesDecision,
    type SkillOutputPayload,
    type ToolExecutionTrace,
} from './crucible-orchestrator';
import {
    performCrucibleExternalSearch,
    type CrucibleSearchResult,
} from './crucible-research';
import { performCrucibleFactCheck } from './crucible-factcheck';
import {
    appendTurnToCrucibleConversation,
    resolveCruciblePersistenceContext,
    type CruciblePersistenceContext,
} from './crucible-persistence';
import { getCrucibleByokConfig, markCrucibleByokValidated } from './crucible-byok';
import { CrucibleTrialLimitError, assertCrucibleTrialAccess } from './crucible-trial';

interface MaterializedPresentable extends PresentableDraft {
    type: 'reference' | 'quote' | 'asset';
}

const VISUAL_TITLE_PATTERN = /(地图|图谱|图示|示意图|结构图|关系图|可视化|表格|象限图|流程图|脑图|冲突图|比较图)/;
const STRUCTURED_ASSET_PATTERN = /[│├└─]|^\s*(左列|右列|左侧|右侧|第一列|第二列|步骤|阶段|节点|路径|对照|结论|断层)[:：]/m;

function getDefaultCruciblePair(): CruciblePair {
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

const SOUL_DOCS_DIR = path.resolve(__dirname, '../docs/02_design/crucible/souls');
const soulDocCache = new Map<string, string>();

function loadSpeakerSoul(roundIndex: number, pair: CruciblePair): string {
    const slug = roundIndex % 2 === 1 ? pair.challengerSlug : pair.synthesizerSlug;
    const cached = soulDocCache.get(slug);
    if (cached) return cached;

    const soulPath = path.join(SOUL_DOCS_DIR, `${slug}_soul.md`);
    try {
        if (fs.existsSync(soulPath)) {
            const content = fs.readFileSync(soulPath, 'utf-8');
            soulDocCache.set(slug, content);
            console.log(`[Crucible] ✅ Loaded soul: ${slug} (${content.length} chars)`);
            return content;
        }
    } catch (err: any) {
        console.warn(`[Crucible] ⚠️ Failed to load soul ${slug}:`, err.message);
    }
    return '';
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

const summarizeText = (value: string, maxLength = 48) => {
    const normalized = normalizeText(value, '').replace(/\s+/g, ' ');
    if (!normalized) {
        return '';
    }
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const stripVisualWords = (value: string) => value
    .replace(/冲突地图/g, '核心断层')
    .replace(/关系图/g, '关系梳理')
    .replace(/结构图/g, '结构梳理')
    .replace(/示意图/g, '重点梳理')
    .replace(/图谱/g, '结构梳理')
    .replace(/可视化/g, '重点梳理')
    .replace(/表格/g, '对照要点')
    .replace(/脑图/g, '要点梳理')
    .replace(/流程图/g, '步骤梳理')
    .trim();

const normalizeComparableText = (value: string) => value
    .replace(/^[^：:\n]{1,12}[：:]\s*/u, '')
    .replace(/\s+/g, '')
    .replace(/[，。！？；、“”"'`()（）【】\[\]\-—,!.?:;：]/g, '')
    .trim();

const isBoardDuplicateOfDialogue = (content: string, utterance: string) => {
    const normalizedContent = normalizeComparableText(content);
    const normalizedUtterance = normalizeComparableText(utterance);

    if (!normalizedContent || !normalizedUtterance) {
        return false;
    }

    if (normalizedContent === normalizedUtterance) {
        return true;
    }

    if (normalizedContent.length > 18 && normalizedUtterance.includes(normalizedContent)) {
        return true;
    }

    if (normalizedUtterance.length > 18 && normalizedContent.includes(normalizedUtterance)) {
        return true;
    }

    return false;
};

const toBoardSentences = (value: string) => value
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .split(/[。！？!?]\s*|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

const toBoardLines = (value: string) => value
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .split('\n')
    .map((item) => item.replace(/^[-*+•]\s*/g, '').trim())
    .filter((item) => item.length > 0);

const compressBoardContent = (draft: PresentableDraft) => {
    const lineCandidates = toBoardLines(draft.content || '');
    const preferredItems = lineCandidates.length >= 2
        ? lineCandidates
        : [
            ...toBoardSentences(draft.content || ''),
            ...toBoardSentences(draft.summary || ''),
        ];

    const uniqueSentences: string[] = [];
    for (const sentence of preferredItems) {
        const normalized = normalizeComparableText(sentence);
        if (!normalized) {
            continue;
        }
        if (uniqueSentences.some((item) => normalizeComparableText(item) === normalized)) {
            continue;
        }
        uniqueSentences.push(sentence);
        if (uniqueSentences.length >= 3) {
            break;
        }
    }

    if (uniqueSentences.length === 0) {
        return normalizeText(draft.content || draft.summary || draft.title, draft.title);
    }

    return uniqueSentences.map((sentence) => `• ${summarizeText(sentence, 54)}`).join('\n');
};

const canRenderAsStructuredAsset = (draft: PresentableDraft) => {
    const content = draft.content || '';
    const lines = toBoardLines(content);
    if (lines.length < 2) {
        return false;
    }

    const hasVisualTitle = VISUAL_TITLE_PATTERN.test(`${draft.title} ${draft.summary}`);
    const hasStructuredContent = STRUCTURED_ASSET_PATTERN.test(content) || content.includes('|');

    return hasVisualTitle && hasStructuredContent;
};

const classifyPresentableType = (draft: PresentableDraft): MaterializedPresentable['type'] => {
    if (draft.type === 'quote' || draft.type === 'reference') {
        return draft.type;
    }
    if (draft.type === 'asset') {
        return canRenderAsStructuredAsset(draft) ? 'asset' : 'reference';
    }

    const text = `${draft.title}\n${draft.summary}\n${draft.content}`;
    if (text.length <= 88) {
        return 'quote';
    }
    if (canRenderAsStructuredAsset(draft)) {
        return 'asset';
    }
    return 'reference';
};

const normalizePresentableDraft = (draft: PresentableDraft, type: MaterializedPresentable['type']): PresentableDraft => {
    if (type === 'asset') {
        return draft;
    }

    return {
        ...draft,
        title: stripVisualWords(draft.title),
        summary: stripVisualWords(draft.summary),
    };
};

const materializePresentables = (drafts: PresentableDraft[], utterance: string): MaterializedPresentable[] => {
    return drafts
        .filter((draft) => draft?.title && draft?.summary && draft?.content)
        .map((draft) => {
            const type = classifyPresentableType(draft);
            const normalizedDraft = normalizePresentableDraft(draft, type);

            return {
                title: normalizeText(normalizedDraft.title, '当前上板内容'),
                summary: summarizeText(normalizedDraft.summary, 32) || '本轮焦点',
                content: compressBoardContent(normalizedDraft),
                type,
            };
        })
        .filter((draft) => !isBoardDuplicateOfDialogue(draft.content, utterance))
        .slice(0, 1);
};

const sanitizeFileSegment = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');
const formatDurationMs = (startedAt: number) => `${Date.now() - startedAt}ms`;

interface CrucibleTurnParams {
    topicTitle: string;
    roundIndex: number;
    previousCards: InputCard[];
    seedPrompt: string;
    latestUserReply: string;
    conversationId: string;
    projectId: string;
    scriptPath: string;
}

export const detectThesisConvergence = (
    roundIndex: number,
    source: 'socrates' | 'fallback',
    decision?: SocratesDecision,
): boolean => (
    roundIndex >= 5
    && source === 'socrates'
    && !!decision?.stageLabel
    && decision.stageLabel === 'crystallization'
);

export interface CrucibleTurnResult {
    conversationId: string;
    source: 'socrates' | 'fallback';
    warning?: string;
    dialogue: DialoguePayload;
    presentables: MaterializedPresentable[];
    topicSuggestion?: string;
    decision?: SocratesDecision;
    toolTraces?: ToolExecutionTrace[];
    thesisReady?: boolean;
}

type CrucibleTurnEvent =
    | { event: 'turn'; data: CrucibleTurnResult }
    | { event: 'error'; data: { message: string } }
    | { event: 'done'; data: { roundIndex: number; source: 'socrates' | 'fallback' } };

const parseCrucibleTurnRequest = (req: Request): CrucibleTurnParams => ({
    topicTitle: normalizeText(req.body?.topicTitle || '', '标题待定'),
    roundIndex: Number(req.body?.roundIndex || 1),
    previousCards: Array.isArray(req.body?.previousCards) ? req.body.previousCards as InputCard[] : [],
    seedPrompt: normalizeText(req.body?.seedPrompt || '', ''),
    latestUserReply: normalizeText(req.body?.latestUserReply || '', normalizeText(req.body?.seedPrompt || '', '') || normalizeText(req.body?.topicTitle || '', '标题待定')),
    conversationId: normalizeText(req.body?.conversationId || '', ''),
    projectId: normalizeText(req.body?.projectId || '', ''),
    scriptPath: normalizeText(req.body?.scriptPath || '', ''),
});

const writeSseEvent = (res: Response, payload: CrucibleTurnEvent) => {
    res.write(`event: ${payload.event}\n`);
    res.write(`data: ${JSON.stringify(payload.data)}\n\n`);
};

const callConfiguredLlm = async (
    prompt: string,
    override?: {
        providerLabel?: string | null;
        model: string;
        baseUrl: string;
        apiKey: string;
    },
) => {
    const config = loadConfig();
    const provider = override?.providerLabel || config.experts.crucible?.llm?.provider || config.global.provider;
    const model = override?.model || config.experts.crucible?.llm?.model || config.global.model;
    const baseUrl = override?.baseUrl || config.experts.crucible?.llm?.baseUrl || config.global.baseUrl || PROVIDER_INFO[provider]?.baseUrl;
    const apiKey = override?.apiKey || process.env[PROVIDER_ENV_KEYS[provider] || ''];
    const llmStartedAt = Date.now();

    if (!provider || !model || !baseUrl) {
        throw new Error('黄金坩埚当前缺少可用的 LLM 配置');
    }
    if (!apiKey) {
        throw new Error(`未找到 ${provider} 的 API Key`);
    }

    const isKimiK25 = model.includes('kimi-k2') || model.includes('k2.5');
    const temperature = isKimiK25 ? 1 : 0.7;

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
            temperature,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error: ${error}`);
    }

    const data = await response.json();
    console.log(`[CrucibleTiming] llm provider=${provider} model=${model} promptChars=${prompt.length} duration=${formatDurationMs(llmStartedAt)}`);
    return data.choices?.[0]?.message?.content || '';
};

const normalizeDecision = (
    raw: Partial<SocratesDecision>,
    roundIndex: number,
): SocratesDecision => {
    const toolRequests = Array.isArray(raw.toolRequests)
        ? raw.toolRequests
            .filter((item) => item?.tool === 'Researcher' || item?.tool === 'FactChecker')
            .map((item) => ({
                tool: item.tool,
                mode: item.mode === 'primary' ? 'primary' : 'support',
                reason: normalizeText(item.reason || '', `${item.tool} 在本轮进入支援位`),
                ...(typeof item.query === 'string' && item.query.trim() ? { query: item.query.trim() } : {}),
                ...(typeof item.goal === 'string' && item.goal.trim() ? { goal: item.goal.trim() } : {}),
                ...(typeof item.scope === 'string' && item.scope.trim() ? { scope: item.scope.trim() } : {}),
            }))
        : [];

    return {
        version: 'decision-v1',
        speaker: raw.speaker === DEFAULT_PAIR.synthesizerSlug ? DEFAULT_PAIR.synthesizerSlug : DEFAULT_PAIR.challengerSlug,
        reflectionIntent: normalizeText(raw.reflectionIntent || '', '继续贴着用户刚才那句，把真正的焦点再压紧一层。'),
        focus: normalizeText(raw.focus || '', roundIndex <= 2 ? '先把命题边界说清。' : '继续收束真正的焦点。'),
        needsResearch: Boolean(raw.needsResearch || toolRequests.some((request) => request.tool === 'Researcher')),
        needsFactCheck: Boolean(raw.needsFactCheck || toolRequests.some((request) => request.tool === 'FactChecker')),
        toolRequests,
        ...(typeof raw.stageLabel === 'string' && raw.stageLabel.trim() ? { stageLabel: raw.stageLabel.trim().slice(0, 24) } : {}),
    };
};

const parseDecisionPayload = (raw: string, roundIndex: number): SocratesDecision => {
    const parsed = JSON.parse(extractJsonObject(raw));
    const validated = SocratesDecisionSchema.parse(parsed);
    return normalizeDecision(validated as Partial<SocratesDecision>, roundIndex);
};

const parseSkillOutputPayload = (raw: string): SkillOutputPayloadShape => {
    const parsed = JSON.parse(extractJsonObject(raw));
    return SkillOutputPayloadSchema.parse(parsed);
};

const buildSkippedTrace = (
    tool: 'Researcher' | 'FactChecker',
    reason: string,
    input: ToolExecutionTrace['input'],
): ToolExecutionTrace => {
    const timestamp = new Date().toISOString();
    return {
        tool,
        requestedBy: 'Socrates',
        mode: 'support',
        status: 'skipped',
        reason,
        input,
        error: reason,
        startedAt: timestamp,
        finishedAt: timestamp,
    };
};

const executeRequestedTools = async (
    decision: SocratesDecision,
): Promise<{
    toolTraces: ToolExecutionTrace[];
    researchResult?: CrucibleSearchResult;
}> => {
    const toolTraces: ToolExecutionTrace[] = [];
    let researchResult: CrucibleSearchResult | undefined;

    for (const request of decision.toolRequests) {
        const startedAt = new Date().toISOString();

        if (request.tool === 'Researcher') {
            if (!request.query) {
                toolTraces.push({
                    tool: 'Researcher',
                    requestedBy: 'Socrates',
                    mode: request.mode,
                    status: 'skipped',
                    reason: request.reason,
                    input: {
                        goal: request.goal,
                        query: request.query,
                    },
                    error: 'Socrates 未提供 research query，宿主未执行 Researcher',
                    startedAt,
                    finishedAt: new Date().toISOString(),
                });
                continue;
            }

            const result = await performCrucibleExternalSearch(request.query);
            researchResult = result;
            toolTraces.push({
                tool: 'Researcher',
                requestedBy: 'Socrates',
                mode: request.mode,
                status: result.connected ? 'success' : 'failed',
                reason: request.reason,
                input: {
                    query: request.query,
                    goal: request.goal,
                },
                output: result,
                ...(result.error ? { error: result.error } : {}),
                startedAt,
                finishedAt: new Date().toISOString(),
            });
            continue;
        }

        if (request.tool === 'FactChecker') {
            const result = await performCrucibleFactCheck({
                goal: request.goal,
                scope: request.scope,
            });
            toolTraces.push({
                tool: 'FactChecker',
                requestedBy: 'Socrates',
                mode: request.mode,
                status: result.checked ? 'success' : 'skipped',
                reason: request.reason,
                input: {
                    goal: request.goal,
                    scope: request.scope,
                },
                output: result,
                error: result.error,
                startedAt,
                finishedAt: new Date().toISOString(),
            });
        }
    }

    if (decision.needsResearch && !toolTraces.some((trace) => trace.tool === 'Researcher')) {
        toolTraces.push(buildSkippedTrace('Researcher', 'Socrates 标记 needsResearch=true，但未给出 Researcher toolRequest', {}));
    }
    if (decision.needsFactCheck && !toolTraces.some((trace) => trace.tool === 'FactChecker')) {
        toolTraces.push(buildSkippedTrace('FactChecker', 'Socrates 标记 needsFactCheck=true，但未给出 FactChecker toolRequest', {}));
    }

    return {
        toolTraces,
        researchResult,
    };
};

const resolveCrucibleTurn = async (
    params: CrucibleTurnParams,
    persistence: CruciblePersistenceContext,
    options?: {
        accessMode?: 'platform' | 'byok';
        byokConfig?: {
            providerLabel?: string | null;
            model: string;
            baseUrl: string;
            apiKey: string;
        } | null;
    },
): Promise<CrucibleTurnResult> => {
    const startedAt = Date.now();
    const {
        topicTitle,
        roundIndex,
        previousCards,
        seedPrompt,
        latestUserReply,
    } = params;
    const promptContext: PromptContext = {
        topicTitle,
        previousCards,
        roundIndex,
        seedPrompt,
        latestUserReply,
    };
    const skillSummary = loadSkillKnowledge('Socrates');
    const speakerSoul = loadSpeakerSoul(roundIndex, DEFAULT_PAIR);

    try {
        const decisionPromptStartedAt = Date.now();
        const decisionPrompt = buildSocratesDecisionPrompt(promptContext, DEFAULT_PAIR, skillSummary, speakerSoul);
        console.log(`[CrucibleTiming] decision-prompt round=${roundIndex} duration=${formatDurationMs(decisionPromptStartedAt)} promptChars=${decisionPrompt.length}`);

        const decisionRaw = await callConfiguredLlm(decisionPrompt, options?.byokConfig || undefined);
        const decision = parseDecisionPayload(decisionRaw, roundIndex);

        const toolStartedAt = Date.now();
        const { toolTraces, researchResult } = await executeRequestedTools(decision);
        const researcherTrace = toolTraces.find((trace) => trace.tool === 'Researcher');
        if (researcherTrace) {
            console.log(
                `[CrucibleTiming] research round=${roundIndex} status=${researcherTrace.status} duration=${formatDurationMs(toolStartedAt)} query="${researchResult?.query || researcherTrace.input.query || ''}" results=${researchResult?.sources.length || 0}`
            );
            if (researcherTrace.error) {
                console.warn(`[Crucible] Researcher trace: ${researcherTrace.error}`);
            }
        }

        const compositionPromptStartedAt = Date.now();
        const compositionPrompt = buildSocratesCompositionPrompt(
            promptContext,
            DEFAULT_PAIR,
            skillSummary,
            speakerSoul,
            decision,
            toolTraces,
        );
        console.log(`[CrucibleTiming] composition-prompt round=${roundIndex} duration=${formatDurationMs(compositionPromptStartedAt)} promptChars=${compositionPrompt.length}`);

        const parseStartedAt = Date.now();
        const raw = await callConfiguredLlm(compositionPrompt, options?.byokConfig || undefined);
        const parsed = parseSkillOutputPayload(raw) as SkillOutputPayload & { topicSuggestion?: string };
        const topicSuggestion = (roundIndex >= 3 && typeof parsed.topicSuggestion === 'string')
            ? parsed.topicSuggestion.trim().slice(0, 32) || undefined
            : undefined;
        const speaker = parsed.speaker === DEFAULT_PAIR.synthesizerSlug
            ? DEFAULT_PAIR.synthesizerSlug
            : (parsed.speaker === DEFAULT_PAIR.challengerSlug ? DEFAULT_PAIR.challengerSlug : decision.speaker);
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
        console.log(`[CrucibleTiming] transform round=${roundIndex} duration=${formatDurationMs(parseStartedAt)} presentables=${presentables.length}`);

        const writeStartedAt = Date.now();
        appendTurnToCrucibleConversation(persistence, {
            topicTitle,
            roundIndex,
            source: 'socrates',
            accessMode: options?.accessMode || 'platform',
            seedPrompt,
            latestUserReply,
            decision,
            toolTraces,
            searchRequested: decision.needsResearch,
            searchConnected: researchResult?.connected || false,
            research: researchResult,
            speaker,
            utterance: reflection,
            focus,
            presentables,
            skillPresentables: Array.isArray(parsed.presentables) ? parsed.presentables : [],
        });
        console.log(`[CrucibleTiming] turn-log round=${roundIndex} duration=${formatDurationMs(writeStartedAt)}`);
        console.log(`[CrucibleTiming] total round=${roundIndex} source=socrates duration=${formatDurationMs(startedAt)}`);

        return {
            conversationId: persistence.conversationId,
            source: 'socrates',
            dialogue,
            presentables,
            decision,
            toolTraces,
            ...(topicSuggestion ? { topicSuggestion } : {}),
            thesisReady: detectThesisConvergence(roundIndex, 'socrates', decision) || undefined,
        };
    } catch (error: any) {
        console.error(`[Crucible] Turn generation failed after ${formatDurationMs(startedAt)}:`, error.message);
        throw error;
    }
};

export const generateCrucibleTurn = async (req: Request, res: Response) => {
    try {
        const params = parseCrucibleTurnRequest(req);
        const byokConfig = await getCrucibleByokConfig(req);
        if (!byokConfig) {
            await assertCrucibleTrialAccess(req, {
                conversationId: params.conversationId,
                projectId: params.projectId,
                scriptPath: params.scriptPath,
            });
        }
        const persistence = await resolveCruciblePersistenceContext(req, {
            projectId: params.projectId,
            scriptPath: params.scriptPath,
            conversationId: params.conversationId,
        });
        const result = await resolveCrucibleTurn(params, persistence, {
            accessMode: byokConfig ? 'byok' : 'platform',
            byokConfig,
        });
        if (byokConfig) {
            await markCrucibleByokValidated(req);
        }
        res.json(result);
    } catch (error: any) {
        if (error instanceof CrucibleTrialLimitError) {
            return res.status(error.statusCode).json({
                code: error.code,
                message: error.message,
                trialStatus: error.trialStatus,
            });
        }
        const statusCode = error?.statusCode || 500;
        res.status(statusCode).json({ error: error.message || '坩埚主链生成失败' });
    }
};

export const streamCrucibleTurn = async (req: Request, res: Response) => {
    const params = parseCrucibleTurnRequest(req);
    const byokConfig = await getCrucibleByokConfig(req);

    if (!byokConfig) {
        try {
            await assertCrucibleTrialAccess(req, {
                conversationId: params.conversationId,
                projectId: params.projectId,
                scriptPath: params.scriptPath,
            });
        } catch (error) {
            if (error instanceof CrucibleTrialLimitError) {
                return res.status(error.statusCode).json({
                    code: error.code,
                    message: error.message,
                    trialStatus: error.trialStatus,
                });
            }
            throw error;
        }
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    try {
        const persistence = await resolveCruciblePersistenceContext(req, {
            projectId: params.projectId,
            scriptPath: params.scriptPath,
            conversationId: params.conversationId,
        });
        const result = await resolveCrucibleTurn(params, persistence, {
            accessMode: byokConfig ? 'byok' : 'platform',
            byokConfig,
        });
        if (byokConfig) {
            await markCrucibleByokValidated(req);
        }
        writeSseEvent(res, { event: 'turn', data: result });
        writeSseEvent(res, {
            event: 'done',
            data: {
                roundIndex: params.roundIndex,
                source: result.source,
            },
        });
    } catch (error: any) {
        writeSseEvent(res, {
            event: 'error',
            data: { message: error.message || '坩埚 SSE 流生成失败' },
        });
    } finally {
        res.end();
    }
};

export const generateSocraticQuestions = generateCrucibleTurn;
