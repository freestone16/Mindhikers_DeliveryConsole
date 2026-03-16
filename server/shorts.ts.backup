import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { callLLM } from './llm';
import { loadConfig } from './llm-config';
import { transcribeAudio, segmentsToSRT } from './whisper';

const getProjectRoot = (projectId: string): string => {
    const PROJECTS_BASE = process.env.PROJECTS_BASE || path.join(process.cwd(), 'Projects');
    return path.join(PROJECTS_BASE, projectId);
};

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function loadShortsState(projectRoot: string): any {
    const statePath = path.join(projectRoot, '05_Shorts_Output', 'shorts_state.json');
    if (fs.existsSync(statePath)) {
        return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
    return null;
}

function saveShortsState(projectRoot: string, state: any) {
    const outputDir = path.join(projectRoot, '05_Shorts_Output');
    ensureDir(outputDir);
    const statePath = path.join(outputDir, 'shorts_state.json');
    console.log(`[Shorts] Saving state to: ${statePath}`);
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    console.log(`[Shorts] State saved successfully`);
}

const SHORTS_SYSTEM_PROMPT = `你是一个专业的短视频脚本策划师。根据用户提供的主题和风格，批量生成竖屏短视频 (Shorts) 脚本。

要求：
- 每条脚本控制在 80-150 字（约 30-60 秒口播量）
- 开头 3 秒必须有强钩子 (hook)
- 结尾根据指定的 CTA 类型写对应的行动号召
- 语言风格根据指定的风格偏好调整
- 输出纯 JSON 数组，不要有其他内容

CTA 类型说明：
- follow: 结尾引导关注
- share: 引导分享
- comment: 引导评论互动
- link: 引导点击链接
- subscribe: 引导订阅

Hook 类型说明：
- question: 用提问开场
- shock: 用震惊性陈述开场
- claim: 用大胆断言开场
- contrast: 用对比开场
- story: 用故事开头

输出格式：
[
  {
    "index": 1,
    "scriptText": "完整脚本文案...",
    "cta": "follow",
    "hookType": "question"
  }
]`;

const BROLL_SYSTEM_PROMPT = `你是一个专业的短视频 B-Roll 规划师。根据给定的脚本文案，拆分出 3-5 个 B-Roll 插入点。

要求：
- 每个插入点包含时间范围（相对于脚本朗读时间）、上下文引用、视觉类型和提示词
- type 只能是 "remotion" 或 "seedance"
- remotion 适合数据可视化、图表、简单动画
- seedance 适合需要 AI 生成的复杂场景
- prompt 用中文描述视觉内容
- 时间范围格式为 "开始秒-结束秒"，根据脚本内容估算

输出 JSON 数组格式：
[
  {
    "timeRange": "0:05-0:08",
    "scriptContext": "引用的原文片段",
    "type": "remotion",
    "prompt": "视觉描述..."
  }
]`;

const RECOMMEND_SYSTEM_PROMPT = `你是一个专业的短视频策略师。分析给定的长文案，为指定数量的短视频推荐最优的 CTA 策略和风格偏好组合。

CTA 类型：
- follow: 引导关注
- share: 引导分享
- comment: 引导评论互动
- link: 引导点击链接
- subscribe: 引导订阅

风格偏好：
- suspense: 悬疑开场，制造悬念
- knowledge: 知识科普，干货输出
- emotion: 情绪共鸣，引发共情
- contrast: 对比冲击，强化反差
- narrative: 叙事讲述，娓娓道来

推荐原则：
1. CTA 要多样化，但 follow/share/comment 应占多数
2. 开头适合 suspense 或 contrast
3. 中间适合 knowledge
4. 结尾适合 emotion 或 narrative
5. 根据文案内容特点灵活调整

输出纯 JSON 数组：
[
  { "index": 1, "cta": "follow", "style": "suspense" },
  { "index": 2, "cta": "share", "style": "knowledge" },
  ...
]`;

export const recommend = async (req: Request, res: Response) => {
    const { projectId, content, count } = req.body;

    if (!content || !count) {
        return res.status(400).json({ error: 'Missing content or count' });
    }

    try {
        const truncatedContent = content.slice(0, 8000);
        const { global: g } = loadConfig();

        const response = await callLLM(
            [
                { role: 'system', content: RECOMMEND_SYSTEM_PROMPT },
                { role: 'user', content: `请为以下长文案推荐 ${count} 条短视频的 CTA 和风格组合：\n\n${truncatedContent}` }
            ],
            g.provider as any, g.model
        );

        let recommendations: any[] = [];
        try {
            const jsonMatch = response.content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                recommendations = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('Parse recommendations error:', e);
        }

        while (recommendations.length < count) {
            recommendations.push({
                index: recommendations.length + 1,
                cta: ['follow', 'share', 'comment'][recommendations.length % 3],
                style: ['knowledge', 'suspense', 'emotion'][recommendations.length % 3]
            });
        }

        res.json({ success: true, recommendations: recommendations.slice(0, count) });
    } catch (error: any) {
        console.error('Recommend error:', error);
        const fallback = Array.from({ length: count }, (_, i) => ({
            index: i + 1,
            cta: ['follow', 'share', 'comment', 'link', 'subscribe'][i % 5],
            style: ['suspense', 'knowledge', 'emotion', 'contrast', 'narrative'][i % 5]
        }));
        res.json({ success: true, recommendations: fallback });
    }
};

export const generateScripts = async (req: Request, res: Response) => {
    const { projectId, count, ctaDistribution, styleDistribution, topic, userComment } = req.body;

    if (!projectId || !count) {
        return res.status(400).json({ error: 'Missing projectId or count' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const styleInfo = styleDistribution
        ? `每条脚本的风格偏好：${JSON.stringify(styleDistribution.map((s: string, i: number) => ({ index: i + 1, style: s })))}`
        : '';

    const commentInfo = userComment ? `\n\n用户补充说明：${userComment}` : '';

    const userMessage = `
长文案内容：
${topic?.slice(0, 10000) || ''}

生成数量: ${count}
CTA 分配: ${JSON.stringify(ctaDistribution)}
${styleInfo}
${commentInfo}

请根据长文案内容，为每条短视频生成脚本。注意：
1. 每条脚本要符合指定的 CTA 类型和风格偏好
2. 从长文案中提取核心观点，拆分为 ${count} 个独立但连贯的短视频
3. 每条控制在 80-150 字

输出 JSON 数组格式。`;

    try {
        const { global: g } = loadConfig();
        const response = await callLLM(
            [
                { role: 'system', content: SHORTS_SYSTEM_PROMPT },
                { role: 'user', content: userMessage }
            ],
            g.provider as any, g.model
        );

        let scripts: any[] = [];
        try {
            const jsonMatch = response.content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                scripts = JSON.parse(jsonMatch[0]);
            }
        } catch (parseError) {
            console.error('Failed to parse LLM response:', parseError);
            res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to parse scripts' })}\n\n`);
            res.end();
            return;
        }

        const formattedScripts = scripts.map((item, i) => ({
            id: `short-${String(i + 1).padStart(3, '0')}`,
            index: i + 1,
            scriptText: item.scriptText || '',
            cta: item.cta || ctaDistribution?.[i] || 'follow',
            hookType: item.hookType || 'generic',
            status: 'draft' as const,
        }));

        for (const script of formattedScripts) {
            res.write(`data: ${JSON.stringify({ type: 'script', script })}\n\n`);
        }

        const projectRoot = getProjectRoot(projectId);
        const state = {
            phase: 2,
            scripts: formattedScripts,
            renderUnits: [],
            subtitleConfigs: [
                { id: 'preset-1', name: '经典白字', fontFamily: 'Noto Sans SC', fontSize: 48, fontColor: '#FFFFFF', strokeColor: '#000000', strokeWidth: 2, position: 'bottom' as const, animation: 'none' as const },
                { id: 'preset-2', name: '卡拉OK', fontFamily: 'Noto Sans SC', fontSize: 52, fontColor: '#FFD700', strokeColor: '#000000', strokeWidth: 3, position: 'center' as const, animation: 'karaoke' as const },
                { id: 'preset-3', name: '打字机', fontFamily: 'Noto Sans SC', fontSize: 44, fontColor: '#00FF00', strokeColor: '#000000', strokeWidth: 2, position: 'bottom' as const, animation: 'typewriter' as const }
            ],
            generationConfig: req.body
        };
        saveShortsState(projectRoot, state);

        res.write(`data: ${JSON.stringify({ type: 'done', scripts: formattedScripts })}\n\n`);
        res.end();
    } catch (error: any) {
        console.error('Generate scripts error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
    }
};

export const saveScript = (req: Request, res: Response) => {
    const { projectId, shortId, scriptText } = req.body;
    const projectRoot = getProjectRoot(projectId);
    const state = loadShortsState(projectRoot);

    if (!state) {
        return res.status(404).json({ error: 'State not found' });
    }

    const script = state.scripts.find((s: any) => s.id === shortId);
    if (script) {
        script.scriptText = scriptText;
        script.status = 'confirmed';
    }

    saveShortsState(projectRoot, state);
    res.json({ success: true });
};

export const regenerateScript = async (req: Request, res: Response) => {
    const { projectId, shortId, userComment } = req.body;
    const projectRoot = getProjectRoot(projectId);
    const state = loadShortsState(projectRoot);

    if (!state) {
        return res.status(404).json({ error: 'State not found' });
    }

    const script = state.scripts.find((s: any) => s.id === shortId);
    if (!script) {
        return res.status(404).json({ error: 'Script not found' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        const { global: g } = loadConfig();
        const response = await callLLM(
            [
                { role: 'system', content: SHORTS_SYSTEM_PROMPT },
                { role: 'user', content: `原脚本:\n${script.scriptText}\n\n修改意见: ${userComment}\n\n请根据修改意见重新生成单条脚本，输出单个 JSON 对象。` }
            ],
            g.provider as any, g.model
        );

        let newScript: any = null;
        try {
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                newScript = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('Parse error:', e);
        }

        if (newScript) {
            const updatedScript = {
                ...script,
                scriptText: newScript.scriptText || script.scriptText,
                cta: newScript.cta || script.cta,
                hookType: newScript.hookType || script.hookType,
                status: 'confirmed' as const
            };

            const scriptIndex = state.scripts.findIndex((s: any) => s.id === shortId);
            state.scripts[scriptIndex] = updatedScript;
            saveShortsState(projectRoot, state);

            res.write(`data: ${JSON.stringify({ type: 'script', script: updatedScript })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
    } catch (error: any) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
    }
};

export const confirmAll = (req: Request, res: Response) => {
    const { projectId } = req.body;
    const projectRoot = getProjectRoot(projectId);
    const state = loadShortsState(projectRoot);

    if (!state) {
        return res.status(404).json({ error: 'State not found' });
    }

    const merged = state.scripts.map((s: any) =>
        `## Short #${s.index}\n\n${s.scriptText}\n\n> CTA: ${s.cta} | Hook: ${s.hookType}\n`
    ).join('\n---\n\n');

    const outputDir = path.join(projectRoot, '05_Shorts_Output');
    ensureDir(outputDir);
    const mergedPath = path.join(outputDir, 'shorts_scripts.md');
    fs.writeFileSync(mergedPath, `# Shorts 提词器版\n\n${merged}`);

    state.phase = 3;
    state.renderUnits = state.scripts.map((s: any) => ({
        id: s.id,
        shortScriptId: s.id,
        aroll: { confirmed: false },
        brolls: [],
        thumbnail: { confirmed: false },
        subtitle: { segments: [], configId: 'preset-1', confirmed: false },
        bgm: { source: 'preset' },
        headerOverlay: true,
        renderStatus: 'pending',
    }));

    saveShortsState(projectRoot, state);
    res.json({ success: true, mergedFilePath: mergedPath, shortCount: state.scripts.length });
};

export const uploadAroll = async (req: Request, res: Response) => {
    const { projectId, shortId } = req.body;
    const file = (req as any).file;

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const projectRoot = getProjectRoot(projectId);
    const shortDir = path.join(projectRoot, '05_Shorts_Output', shortId);
    ensureDir(shortDir);

    const inputPath = file.path;
    const outputPath = path.join(shortDir, 'aroll_9x16.mp4');
    const previewPath = path.join(shortDir, 'aroll_preview.png');

    try {
        await new Promise<void>((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-y', '-i', inputPath,
                '-vf', 'crop=ih*9/16:ih:(iw-ih*9/16)/2:0',
                '-c:a', 'copy',
                outputPath
            ]);
            ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg crop exit ${code}`)));
            ffmpeg.stderr.on('data', d => console.error('[FFmpeg crop]', d.toString().trim()));
        });

        await new Promise<void>((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-y', '-i', outputPath,
                '-vframes', '1',
                previewPath
            ]);
            ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg preview exit ${code}`)));
        });

        fs.unlinkSync(inputPath);

        res.json({
            croppedPath: path.relative(projectRoot, outputPath),
            previewFrame: path.relative(projectRoot, previewPath)
        });
    } catch (error: any) {
        console.error('Upload A-Roll error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const generateBrolls = async (req: Request, res: Response) => {
    const { projectId, shortId } = req.body;
    const projectRoot = getProjectRoot(projectId);
    const state = loadShortsState(projectRoot);

    if (!state) {
        return res.status(404).json({ error: 'State not found' });
    }

    const script = state.scripts.find((s: any) => s.id === shortId);
    if (!script) {
        return res.status(404).json({ error: 'Script not found' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        const { global: g } = loadConfig();
        const response = await callLLM(
            [
                { role: 'system', content: BROLL_SYSTEM_PROMPT },
                { role: 'user', content: `脚本文案:\n${script.scriptText}\n\n请为这条短视频拆分 B-Roll 插入点。` }
            ],
            g.provider as any, g.model
        );

        let brolls: any[] = [];
        try {
            const jsonMatch = response.content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                brolls = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('Parse brolls error:', e);
        }

        const formattedBrolls = brolls.map((b, i) => ({
            id: `${shortId}-broll-${i + 1}`,
            ...b,
            confirmed: false
        }));

        const renderUnit = state.renderUnits.find((u: any) => u.id === shortId);
        if (renderUnit) {
            renderUnit.brolls = formattedBrolls;
            saveShortsState(projectRoot, state);
        }

        for (const broll of formattedBrolls) {
            res.write(`data: ${JSON.stringify({ type: 'broll', broll })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ type: 'done', brolls: formattedBrolls })}\n\n`);
        res.end();
    } catch (error: any) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
    }
};

export const transcribe = async (req: Request, res: Response) => {
    const { projectId, shortId } = req.body;
    const projectRoot = getProjectRoot(projectId);
    const arollPath = path.join(projectRoot, '05_Shorts_Output', shortId, 'aroll_9x16.mp4');

    if (!fs.existsSync(arollPath)) {
        return res.status(404).json({ error: 'A-Roll video not found' });
    }

    try {
        const result = await transcribeAudio(arollPath);

        const shortDir = path.join(projectRoot, '05_Shorts_Output', shortId);
        const srtPath = path.join(shortDir, 'subtitle.srt');
        const srtContent = segmentsToSRT(result.segments);
        fs.writeFileSync(srtPath, srtContent);

        const state = loadShortsState(projectRoot);
        if (state) {
            const renderUnit = state.renderUnits.find((u: any) => u.id === shortId);
            if (renderUnit) {
                renderUnit.subtitle.segments = result.segments;
                renderUnit.subtitle.srtPath = path.relative(projectRoot, srtPath);
                saveShortsState(projectRoot, state);
            }
        }

        res.json({
            success: true,
            segments: result.segments,
            srtPath: path.relative(projectRoot, srtPath)
        });
    } catch (error: any) {
        console.error('Transcribe error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateSubtitleSegments = (req: Request, res: Response) => {
    const { shortId } = req.params;
    const { projectId, segments } = req.body;
    const projectRoot = getProjectRoot(projectId);
    const state = loadShortsState(projectRoot);

    if (!state) {
        return res.status(404).json({ error: 'State not found' });
    }

    const renderUnit = state.renderUnits.find((u: any) => u.id === shortId);
    if (renderUnit) {
        renderUnit.subtitle.segments = segments;
        saveShortsState(projectRoot, state);
    }

    res.json({ success: true });
};

export const getSubtitleConfigs = (req: Request, res: Response) => {
    const { projectId } = req.query;
    const projectRoot = getProjectRoot(projectId as string);
    const state = loadShortsState(projectRoot);

    if (!state || !state.subtitleConfigs) {
        return res.json({ configs: [] });
    }

    res.json({ configs: state.subtitleConfigs });
};

export const updateSubtitleConfig = (req: Request, res: Response) => {
    const { id } = req.params;
    const { projectId, config } = req.body;
    const projectRoot = getProjectRoot(projectId);
    const state = loadShortsState(projectRoot);

    if (!state) {
        return res.status(404).json({ error: 'State not found' });
    }

    const configIndex = state.subtitleConfigs.findIndex((c: any) => c.id === id);
    if (configIndex >= 0) {
        state.subtitleConfigs[configIndex] = { ...state.subtitleConfigs[configIndex], ...config };
        saveShortsState(projectRoot, state);
    }

    res.json({ success: true });
};

export const getHeaderConfig = (req: Request, res: Response) => {
    const { projectId } = req.query;
    const projectRoot = getProjectRoot(projectId as string);
    const configPath = path.join(projectRoot, '05_Shorts_Output', 'header_config.json');

    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return res.json(config);
    }

    res.json({ enabled: true, centerText: 'MindHikers' });
};

export const updateHeaderConfig = (req: Request, res: Response) => {
    const { projectId } = req.body;
    const projectRoot = getProjectRoot(projectId);
    const outputDir = path.join(projectRoot, '05_Shorts_Output');
    ensureDir(outputDir);

    const configPath = path.join(outputDir, 'header_config.json');
    const config = { ...req.body };
    delete config.projectId;

    if ((req as any).files) {
        const files = (req as any).files as { [fieldname: string]: { path: string }[] };
        if (files.leftLogo?.[0]) {
            const logoPath = path.join(outputDir, 'header_left_logo.png');
            fs.renameSync(files.leftLogo[0].path, logoPath);
            config.leftLogo = path.relative(projectRoot, logoPath);
        }
        if (files.rightLogo?.[0]) {
            const logoPath = path.join(outputDir, 'header_right_logo.png');
            fs.renameSync(files.rightLogo[0].path, logoPath);
            config.rightLogo = path.relative(projectRoot, logoPath);
        }
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    res.json({ success: true, config });
};

export const renderShort = async (req: Request, res: Response) => {
    const { projectId, shortId } = req.body;
    const projectRoot = getProjectRoot(projectId);
    const shortDir = path.join(projectRoot, '05_Shorts_Output', shortId);

    const state = loadShortsState(projectRoot);
    if (!state) {
        return res.status(404).json({ error: 'State not found' });
    }

    const renderUnit = state.renderUnits.find((u: any) => u.id === shortId);
    if (!renderUnit) {
        return res.status(404).json({ error: 'Render unit not found' });
    }

    renderUnit.renderStatus = 'rendering';
    saveShortsState(projectRoot, state);

    try {
        const outputPath = path.join(shortDir, `final_${shortId}.mp4`);
        const arollPath = path.join(shortDir, 'aroll_9x16.mp4');
        const srtPath = path.join(shortDir, 'subtitle.srt');

        await new Promise<void>((resolve, reject) => {
            const args = ['-y', '-i', arollPath];

            if (fs.existsSync(srtPath)) {
                args.push('-vf', `subtitles=${srtPath}`);
            }

            args.push('-c:a', 'copy', outputPath);

            const ffmpeg = spawn('ffmpeg', args);
            ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg exit ${code}`)));
            ffmpeg.stderr.on('data', d => console.error('[FFmpeg render]', d.toString().trim()));
        });

        renderUnit.renderStatus = 'completed';
        renderUnit.outputPaths = {
            brollDir: path.relative(projectRoot, path.join(shortDir, 'brolls')),
            fcpxmlPath: path.relative(projectRoot, path.join(shortDir, 'timeline.fcpxml')),
            finalVideoPath: path.relative(projectRoot, outputPath)
        };
        saveShortsState(projectRoot, state);

        res.json({
            success: true,
            jobId: `render-${Date.now()}`,
            status: 'completed',
            outputPaths: renderUnit.outputPaths
        });
    } catch (error: any) {
        renderUnit.renderStatus = 'failed';
        saveShortsState(projectRoot, state);
        res.status(500).json({ error: error.message });
    }
};

export const getRenderStatus = (req: Request, res: Response) => {
    const { jobId } = req.params;
    res.json({ jobId, status: 'completed', progress: 100 });
};
