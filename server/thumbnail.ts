import express from 'express';
import type { Server } from 'socket.io';
import { callLLM } from './llm';
import { loadConfig } from './llm-config';
import { loadSkillKnowledge } from './skill-loader';
import { generateImageWithVolc, pollVolcImageResult } from './volcengine';
import { getProjectRoot } from './chat';
import { loadExpertState, saveExpertState } from './expert_state_manager';

type ThumbnailStatus = 'idle' | 'ready' | 'generating' | 'revising' | 'error';

interface ThumbnailVariantDraft {
    id: string;
    name: string;
    hook: string;
    rationale: string;
    overlayText: string;
    prompt: string;
    visualSpecs: {
        font: string;
        layout: string;
        rendering: string;
        composition: string;
        tension: string;
        colorPalette: string[];
    };
}

interface ThumbnailStateData {
    status: ThumbnailStatus;
    source?: {
        name: string;
        type: 'uploaded' | 'project-script';
        content: string;
        scriptPath?: string;
        loadedAt: string;
        wordCount: number;
        charCount: number;
    };
    variants: Array<ThumbnailVariantDraft & {
        imageUrl?: string;
        error?: string;
        status: 'draft' | 'rendering' | 'ready' | 'failed' | 'selected';
    }>;
    selectedVariantId?: string;
    logs: string[];
    lastFeedback?: string;
    error?: string;
    generatedAt?: string;
}

const MODEL_SAFE_PROVIDERS = new Set(['openai', 'deepseek', 'zhipu', 'siliconflow', 'kimi', 'yinli']);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractJson = <T>(raw: string): T => {
    const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1] || raw;
    const trimmed = candidate.trim();

    try {
        return JSON.parse(trimmed) as T;
    } catch {
        const firstBrace = trimmed.indexOf('{');
        const lastBrace = trimmed.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as T;
        }
        throw new Error('LLM 未返回合法 JSON');
    }
};

const normalizePalette = (input: unknown) => {
    if (!Array.isArray(input)) {
        return ['#F7F0E6', '#D8B07A', '#48311A'];
    }
    return input
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .slice(0, 5);
};

const normalizeVariant = (input: any, index: number): ThumbnailVariantDraft => ({
    id: input?.id ? String(input.id) : `variant_${index + 1}`,
    name: String(input?.name || `方案 ${index + 1}`),
    hook: String(input?.hook || ''),
    rationale: String(input?.rationale || ''),
    overlayText: String(input?.overlayText || ''),
    prompt: String(input?.prompt || input?.imagePrompt || ''),
    visualSpecs: {
        font: String(input?.visualSpecs?.font || input?.font || 'Bold editorial sans serif'),
        layout: String(input?.visualSpecs?.layout || input?.layout || 'Left text / right focal object'),
        rendering: String(input?.visualSpecs?.rendering || input?.rendering || 'Cinematic editorial realism'),
        composition: String(input?.visualSpecs?.composition || input?.composition || 'Single dominant focal point with strong depth'),
        tension: String(input?.visualSpecs?.tension || input?.tension || 'Cognitive conflict with emotional restraint'),
        colorPalette: normalizePalette(input?.visualSpecs?.colorPalette || input?.palette),
    },
});

const selectLlmConfig = () => {
    const config = loadConfig();
    const expertLlm = config.experts.thumbnail?.llm;
    const provider = expertLlm?.provider && MODEL_SAFE_PROVIDERS.has(expertLlm.provider)
        ? expertLlm.provider
        : config.global.provider;
    const model = expertLlm?.model || config.global.model;
    const imageModel = config.experts.thumbnail?.imageModel || config.generation.imageModel || undefined;
    return { provider, model, imageModel };
};

const buildGeneratePrompt = (skillKnowledge: string, sourceName: string, scriptContent: string) => `
你是 MindHikers 的 ThumbnailMaster。你的工作不是做普通缩略图，而是从长文里提炼出最值得点击的认知承诺。

以下是缩略图大师技能知识，请吸收其方法，但不要复述给用户：
${skillKnowledge || 'ThumbnailMaster 技能知识暂未加载，请按 MindHikers 认知承诺导向自行补足。'}

任务：
1. 阅读长文，提炼核心承诺、认知冲突、情绪峰值、适合做缩略图的视觉意象。
2. 产出两版差异明显的 YouTube 缩略图方案，适用于 MindHikers 频道。
3. 每版都必须适合直接交给火山引擎文生图。

输出要求：
- 只返回 JSON，不要返回任何额外解释。
- JSON 结构必须为：
{
  "summary": "对题材的 1 句话判断",
  "variants": [
    {
      "id": "variant_a",
      "name": "方案名",
      "hook": "1.5 秒点击钩子",
      "rationale": "为什么会被点开",
      "overlayText": "缩略图上建议出现的短文案，最多 12 个汉字或 6 个英文单词",
      "prompt": "给火山引擎的完整中文出图 prompt，明确主体、构图、光线、情绪、材质、镜头感、背景、文字区留白，禁止出现多余手指、错字、低清晰度",
      "visualSpecs": {
        "font": "字体语气",
        "layout": "版式",
        "rendering": "渲染风格",
        "composition": "构图",
        "tension": "张力来源",
        "colorPalette": ["#HEX1", "#HEX2", "#HEX3"]
      }
    }
  ]
}

约束：
- 两版必须明显不同，不能只是换词。
- 优先 MindHikers 风格：智识承诺、克制但有张力、避免廉价夸张。
- prompt 中不要出现 JSON 特殊字符转义垃圾，不要出现 markdown。
- overlayText 必须短、狠、清楚。

长文标题：${sourceName}

长文内容：
${scriptContent.slice(0, 16000)}
`;

const buildRevisePrompt = (
    skillKnowledge: string,
    sourceName: string,
    scriptContent: string,
    feedback: string,
    currentVariants: ThumbnailStateData['variants'],
    selectedVariantId?: string
) => `
你是 MindHikers 的 ThumbnailMaster。现在用户看了现有两版缩略图，给出了具体修改意见。

以下是缩略图大师技能知识：
${skillKnowledge || 'ThumbnailMaster 技能知识暂未加载。'}

任务：
1. 保留当前题材的核心认知承诺。
2. 根据用户反馈，重写两版缩略图方案。
3. 如果用户主要针对其中一版提意见，也要顺带把另一版调到更合理，不要完全不动。

只返回 JSON，结构和之前完全一致：
{
  "summary": "对本轮调整的 1 句话判断",
  "variants": [...]
}

当前题材：${sourceName}

用户反馈：
${feedback}

当前已生成方案：
${JSON.stringify(currentVariants, null, 2)}

当前主推方案 ID：
${selectedVariantId || '无'}

长文内容：
${scriptContent.slice(0, 12000)}
`;

const waitForImage = async (taskId: string) => {
    for (let attempt = 0; attempt < 16; attempt += 1) {
        const result = await pollVolcImageResult(taskId);
        if (result.image_url) {
            return result.image_url;
        }
        if (result.status === 'failed' || result.error) {
            throw new Error(result.error || '火山引擎出图失败');
        }
        await sleep(2500);
    }
    throw new Error('火山引擎出图超时');
};

const renderVariants = async (variants: ThumbnailVariantDraft[], imageModel?: string) => {
    const rendered: ThumbnailStateData['variants'] = [];

    for (const [index, variant] of variants.entries()) {
        try {
            const imageResult = await generateImageWithVolc(variant.prompt, { model: imageModel });
            let imageUrl = imageResult.image_url;
            if (!imageUrl && imageResult.task_id) {
                imageUrl = await waitForImage(imageResult.task_id);
            }

            if (!imageUrl) {
                throw new Error(imageResult.error || '未返回图片地址');
            }

            rendered.push({
                ...variant,
                imageUrl,
                status: index === 0 ? 'selected' : 'ready',
            });
        } catch (error: any) {
            rendered.push({
                ...variant,
                error: error.message,
                status: 'failed',
            });
        }
    }

    return rendered;
};

const countWords = (content: string) => {
    const normalized = content.trim();
    if (!normalized) {
        return 0;
    }
    const chineseChars = (normalized.match(/[\u4e00-\u9fff]/g) || []).length;
    const latinWords = normalized
        .replace(/[\u4e00-\u9fff]/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length;
    return chineseChars + latinWords;
};

const buildState = (input: {
    sourceName: string;
    scriptContent: string;
    scriptPath?: string;
    variants: ThumbnailStateData['variants'];
    status: ThumbnailStatus;
    logs: string[];
    selectedVariantId?: string;
    lastFeedback?: string;
    error?: string;
}) => ({
    expertId: 'ThumbnailMaster',
    lastUpdated: new Date().toISOString(),
    status: input.status,
    data: {
        status: input.status,
        source: {
            name: input.sourceName,
            type: input.scriptPath ? 'project-script' as const : 'uploaded' as const,
            content: input.scriptContent,
            scriptPath: input.scriptPath,
            loadedAt: new Date().toISOString(),
            wordCount: countWords(input.scriptContent),
            charCount: input.scriptContent.length,
        },
        variants: input.variants,
        selectedVariantId: input.selectedVariantId || input.variants.find((item) => item.status === 'selected')?.id,
        logs: input.logs.slice(-12),
        lastFeedback: input.lastFeedback,
        error: input.error,
        generatedAt: new Date().toISOString(),
    },
});

const saveAndBroadcast = (io: Server, projectId: string, nextState: ReturnType<typeof buildState>) => {
    const projectRoot = getProjectRoot(projectId);
    saveExpertState(projectRoot, 'ThumbnailMaster', nextState);
    io.to(projectId).emit('expert-data-update:ThumbnailMaster', nextState.data);
};

const generateVariants = async ({
    sourceName,
    scriptContent,
    feedback,
    currentVariants,
    selectedVariantId,
}: {
    sourceName: string;
    scriptContent: string;
    feedback?: string;
    currentVariants?: ThumbnailStateData['variants'];
    selectedVariantId?: string;
}) => {
    const skillKnowledge = loadSkillKnowledge('ThumbnailMaster');
    const { provider, model, imageModel } = selectLlmConfig();
    const prompt = feedback
        ? buildRevisePrompt(skillKnowledge, sourceName, scriptContent, feedback, currentVariants || [], selectedVariantId)
        : buildGeneratePrompt(skillKnowledge, sourceName, scriptContent);
    const llmResponse = await callLLM([{ role: 'user', content: prompt }], provider as any, model);
    const parsed = extractJson<{ summary?: string; variants?: any[] }>(llmResponse.content);
    const drafts = (parsed.variants || []).slice(0, 2).map((variant, index) => normalizeVariant(variant, index));

    if (drafts.length < 2) {
        throw new Error('LLM 没有返回两版有效缩略图方案');
    }

    const rendered = await renderVariants(drafts, imageModel || undefined);
    return {
        summary: parsed.summary || '',
        variants: rendered,
        selectedVariantId: rendered.find((item) => item.status === 'selected')?.id || rendered[0]?.id,
    };
};

export const createThumbnailRouter = (io: Server) => {
    const router = express.Router();

    router.post('/generate', async (req, res) => {
        try {
            const { projectId, sourceName, scriptContent, scriptPath } = req.body as {
                projectId?: string;
                sourceName?: string;
                scriptContent?: string;
                scriptPath?: string;
            };

            if (!projectId || !sourceName || !scriptContent?.trim()) {
                return res.status(400).json({ error: 'Missing projectId, sourceName, or scriptContent' });
            }

            const projectRoot = getProjectRoot(projectId);
            const previousState = loadExpertState(projectRoot, 'ThumbnailMaster');
            const logs = [...(previousState?.data?.logs || []), '开始生成缩略图方案'];
            const result = await generateVariants({ sourceName, scriptContent, selectedVariantId: previousState?.data?.selectedVariantId });
            const nextState = buildState({
                sourceName,
                scriptContent,
                scriptPath,
                variants: result.variants,
                selectedVariantId: result.selectedVariantId,
                status: 'ready',
                logs: [...logs, result.summary || '已生成两版缩略图方案'],
            });
            saveAndBroadcast(io, projectId, nextState);
            res.json({ success: true, state: nextState, variants: nextState.data.variants });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/revise', async (req, res) => {
        try {
            const { projectId, sourceName, scriptContent, scriptPath, feedback, currentVariants, selectedVariantId } = req.body as {
                projectId?: string;
                sourceName?: string;
                scriptContent?: string;
                scriptPath?: string;
                feedback?: string;
                currentVariants?: ThumbnailStateData['variants'];
                selectedVariantId?: string;
            };

            if (!projectId || !sourceName || !scriptContent?.trim() || !feedback?.trim()) {
                return res.status(400).json({ error: 'Missing projectId, sourceName, scriptContent, or feedback' });
            }

            const projectRoot = getProjectRoot(projectId);
            const previousState = loadExpertState(projectRoot, 'ThumbnailMaster');
            const result = await generateVariants({
                sourceName,
                scriptContent,
                feedback,
                currentVariants: currentVariants || previousState?.data?.variants || [],
                selectedVariantId: selectedVariantId || previousState?.data?.selectedVariantId,
            });

            const nextState = buildState({
                sourceName,
                scriptContent,
                scriptPath,
                variants: result.variants,
                selectedVariantId: selectedVariantId || result.selectedVariantId,
                status: 'ready',
                lastFeedback: feedback,
                logs: [...(previousState?.data?.logs || []), `用户反馈：${feedback}`, result.summary || '已按反馈重做两版缩略图'],
            });
            saveAndBroadcast(io, projectId, nextState);
            res.json({ success: true, state: nextState, variants: nextState.data.variants });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
