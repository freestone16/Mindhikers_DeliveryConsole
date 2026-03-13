import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import { loadConfig } from './llm-config';
import { loadSkillKnowledge } from './skill-loader';
import { PROVIDER_INFO } from '../src/schemas/llm-config';
import { loadCrucibleSoulRegistry, loadRegisteredSoulProfiles } from './crucible-soul-loader';
import {
    buildRoundtableDiscoveryPrompt,
    buildRoundtableFallbackPayload,
    buildSocraticFallbackPayload,
    buildSocratesPrompt,
    createCrucibleOrchestratorPlan,
    type CrucibleEngineMode,
    type CruciblePair,
    type CrucibleRuntimePhase,
    type DialoguePayload,
    type InputCard,
    type PresentableDraft,
    type PromptContext,
    type SkillOutputPayload,
    type CrucibleToolRoute,
} from './crucible-orchestrator';

interface MaterializedPresentable extends PresentableDraft {
    type: 'reference' | 'quote' | 'asset';
}

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
    return drafts
        .filter((draft) => draft?.title && draft?.summary && draft?.content)
        .map((draft) => ({
            title: normalizeText(draft.title, '当前上板内容'),
            summary: summarizeText(draft.summary, 32) || '本轮焦点',
            content: compressBoardContent(draft),
            type: classifyPresentableType(draft),
        }))
        .filter((draft) => !isBoardDuplicateOfDialogue(draft.content, utterance))
        .slice(0, 1);
};

const sanitizeFileSegment = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

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
    toolRoutes: CrucibleToolRoute[];
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
        orchestrator: {
            engineMode: params.engineMode,
            phase: params.phase,
            toolRoutes: params.toolRoutes,
        },
    });

    fs.writeFileSync(logFile, JSON.stringify(existing, null, 2));
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
    const promptContext: PromptContext = {
        topicTitle,
        previousCards,
        roundIndex,
        seedPrompt,
        latestUserReply,
    };
    const turnPlan = createCrucibleOrchestratorPlan(promptContext);
    const skillSummary = loadSkillKnowledge('Socrates');

    try {
        const prompt = turnPlan.engineMode === 'roundtable_discovery'
            ? buildRoundtableDiscoveryPrompt(promptContext, DEFAULT_PAIR)
            : buildSocratesPrompt(promptContext, DEFAULT_PAIR, skillSummary);
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
            phase: turnPlan.phase,
            engineMode: turnPlan.engineMode,
            source: 'socrates',
            seedPrompt,
            latestUserReply,
            searchRequested: turnPlan.searchRequested,
            searchConnected: false,
            toolRoutes: turnPlan.toolRoutes,
            speaker,
            utterance: reflection,
            focus,
            presentables,
            skillPresentables: Array.isArray(parsed.presentables) ? parsed.presentables : [],
        });

        res.json({
            engineMode: turnPlan.engineMode,
            phase: turnPlan.phase,
            source: 'socrates',
            searchRequested: turnPlan.searchRequested,
            searchConnected: false,
            orchestrator: {
                engineMode: turnPlan.engineMode,
                phase: turnPlan.phase,
                toolRoutes: turnPlan.toolRoutes,
            },
            dialogue,
            presentables,
        });
    } catch (error: any) {
        console.error('[Crucible] Turn generation failed:', error.message);
        const fallback = turnPlan.engineMode === 'roundtable_discovery'
            ? buildRoundtableFallbackPayload(promptContext, DEFAULT_PAIR)
            : buildSocraticFallbackPayload(promptContext, DEFAULT_PAIR);
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
            phase: turnPlan.phase,
            engineMode: turnPlan.engineMode,
            source: 'fallback',
            seedPrompt,
            latestUserReply,
            searchRequested: turnPlan.searchRequested,
            searchConnected: false,
            toolRoutes: turnPlan.toolRoutes,
            speaker: fallback.speaker,
            utterance: fallback.reflection,
            focus: fallback.focus,
            presentables,
            skillPresentables: fallback.presentables,
        });
        res.json({
            engineMode: turnPlan.engineMode,
            phase: turnPlan.phase,
            source: 'fallback',
            warning: error.message,
            searchRequested: turnPlan.searchRequested,
            searchConnected: false,
            orchestrator: {
                engineMode: turnPlan.engineMode,
                phase: turnPlan.phase,
                toolRoutes: turnPlan.toolRoutes,
            },
            dialogue,
            presentables,
        });
    }
};

export const generateSocraticQuestions = generateCrucibleTurn;
