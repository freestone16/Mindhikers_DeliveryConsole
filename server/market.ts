import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { getTubeBuddyWorker } from './workers/tubebuddy-worker';
import type { TubeBuddyScore } from '../src/types';
import { callLLM } from './llm';
import { loadConfig } from './llm-config';
import { getProjectRoot } from './project-paths';
import { setupSSE, writeSSE } from './sse';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

export const generateSEO = async (req: Request, res: Response) => {
    const { projectId, scriptPath, count, focusKeywords } = req.body;
    
    setupSSE(res);

    const mockSets: any[] = [];
    for (let i = 0; i < (count || 5); i++) {
        const set = {
            id: `tt-${Date.now()}-${i}`,
            index: i,
            title: `AI 学习方案 #${i + 1}: 深度解析神经科学与认知升级`,
            tags: ['AI学习', '神经科学', '认知升级', `方法${i}`],
            source: 'llm',
            status: 'pending' as const
        };
        mockSets.push(set);
        
        writeSSE(res, { type: 'generated', set });
        await new Promise(r => setTimeout(r, 500));
    }

    writeSSE(res, { type: 'complete', sets: mockSets });
    res.end();
};

export const scoreKeyword = async (req: Request, res: Response) => {
    const { setId, keyword, title } = req.body;
    
    setupSSE(res);

    writeSSE(res, { type: 'scoring', setId });
    
    try {
        const worker = await getTubeBuddyWorker();
        const score = await worker.scoreKeyword(keyword || title);
        
        writeSSE(res, { type: 'scored', setId, score });
    } catch (error: any) {
        writeSSE(res, { type: 'error', setId, error: error.message });
    }
    
    res.end();
};

export const scoreAllKeywords = async (req: Request, res: Response) => {
    const { sets } = req.body;
    
    setupSSE(res);

    for (const set of sets) {
        writeSSE(res, { type: 'scoring', setId: set.id });
        
        await new Promise(r => setTimeout(r, 800));
        
        const score = {
            overallScore: Math.floor(Math.random() * 30) + 65,
            weightedScore: Math.floor(Math.random() * 25) + 60,
            metrics: {
                searchVolume: Math.floor(Math.random() * 50) + 40,
                competition: Math.floor(Math.random() * 40) + 30,
                optimization: Math.floor(Math.random() * 30) + 60,
                relevance: Math.floor(Math.random() * 20) + 75
            }
        };

        writeSSE(res, { type: 'scored', setId: set.id, score });
    }

    writeSSE(res, { type: 'complete' });
    res.end();
};

export const confirmSEO = async (req: Request, res: Response) => {
    const { projectId, title, tags } = req.body;
    
    try {
        const projectRoot = getProjectRoot(projectId);
        const marketingDir = path.join(projectRoot, '05_Marketing');
        
        if (!fs.existsSync(marketingDir)) {
            fs.mkdirSync(marketingDir, { recursive: true });
        }

        const output = {
            title,
            tags,
            savedAt: new Date().toISOString(),
            savedPath: '05_Marketing/seo_final.json'
        };

        const outputPath = path.join(marketingDir, 'seo_final.json');
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

        res.json({ success: true, output });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// V2 routes
router.post('/generate', generateSEO);
router.post('/score', scoreKeyword);
router.post('/score-all', scoreAllKeywords);
router.post('/confirm', confirmSEO);

// ─────────────────────────────────────────────────────────────────────────────
// V3 Routes — MarketingMaster 营销大师 重构版
// ─────────────────────────────────────────────────────────────────────────────

/** Helper: read script content from disk */
function readScriptContent(projectId: string, scriptPath: string): string {
    const projectRoot = getProjectRoot(projectId);
    const fullPath = path.isAbsolute(scriptPath)
        ? scriptPath
        : path.join(projectRoot, scriptPath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`脚本文件不存在: ${fullPath}`);
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    return content.length > 8000 ? content.slice(0, 8000) + '\n...(已截断)' : content;
}

/**
 * Dev-mode override: force mock scoring even when Playwright is available.
 * Set env var TUBEBUDDY_DEV_MOCK=1 to enable during development without a real TubeBuddy session.
 */
const DEV_MOCK_MODE = process.env.TUBEBUDDY_DEV_MOCK === '1';

/**
 * Score a single keyword variant via TubeBuddyWorker (real Playwright) or its internal mock.
 * Returns the score or throws a typed error:
 *   { type: 'session_expired' } — user must re-login in the browser
 *   { type: 'selector_not_found' | 'timeout' | 'network_error' } — transient, can retry
 */
async function scoreSingleVariant(
    variantText: string,
    variantScript: 'simplified' | 'traditional'
): Promise<TubeBuddyScore> {
    if (DEV_MOCK_MODE) {
        // Quick deterministic mock for CI / no-browser dev sessions
        const seed = variantText.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const rng = (min: number, max: number, offset = 0) => min + ((seed + offset) % (max - min + 1));
        const sv = rng(35, 90, 1), comp = rng(25, 80, 2), opt = rng(50, 95, 3), rel = rng(60, 98, 4);
        const penalty = variantScript === 'traditional' ? -8 : 0;
        const overall = Math.max(30, Math.min(99, Math.round(sv * 0.3 + (100 - comp) * 0.2 + opt * 0.3 + rel * 0.2 + penalty)));
        await new Promise(r => setTimeout(r, 300 + Math.random() * 200)); // lightweight mock delay
        return { overall, searchVolume: sv, competition: comp, optimization: opt, relevance: rel };
    }
    const worker = await getTubeBuddyWorker();
    return worker.scoreKeyword(variantText, variantScript);
}

// ── V3: POST /api/market/v3/generate-candidates ──────────────────────────────
router.post('/v3/generate-candidates', async (req: Request, res: Response) => {
    const { projectId, scriptPath } = req.body;
    setupSSE(res);

    try {
        let scriptContent = '';
        try {
            scriptContent = readScriptContent(projectId, scriptPath);
        } catch (e: any) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: e.message })}\n\n`);
            res.end();
            return;
        }

        const config = loadConfig();
        const provider = (config.global?.provider || 'siliconflow') as any;
        const model = config.global?.model || undefined;

        const prompt = `你是一位精通中文YouTube SEO的关键词策略师。请分析以下视频脚本，生成10个最具搜索潜力的候选关键词。

脚本内容：
${scriptContent}

要求：
1. 生成10个候选关键词，每个需同时提供简体和繁体中文版本
2. 关键词具备真实搜索需求，长度3-15字
3. 覆盖不同搜索意图（信息型、导航型、商业型）
4. 避免竞争过度激烈的超热词

请严格按以下JSON格式输出（只输出JSON数组，不要其他文字）：
[{"keyword":"简体关键词","traditional":"繁體關鍵詞"}]`;

        let llmResponse = '';
        try {
            llmResponse = await callLLM([{ role: 'user', content: prompt }], provider, model);
        } catch (e: any) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: `LLM 调用失败: ${e.message}` })}\n\n`);
            res.end();
            return;
        }

        let keywords: Array<{ keyword: string; traditional: string }> = [];
        try {
            const jsonMatch = llmResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) keywords = JSON.parse(jsonMatch[0]);
        } catch {
            keywords = [];
        }

        for (let i = 0; i < Math.min(keywords.length, 10); i++) {
            const kw = keywords[i];
            if (!kw?.keyword) continue;

            const candidate = {
                id: `llm-${Date.now()}-${i}`,
                keyword: kw.keyword,
                variants: [
                    { text: kw.keyword, script: 'simplified' as const, status: 'pending' as const },
                    ...(kw.traditional && kw.traditional !== kw.keyword
                        ? [{ text: kw.traditional, script: 'traditional' as const, status: 'pending' as const }]
                        : []),
                ],
                source: 'llm' as const,
                isGolden: false,
            };

            res.write(`data: ${JSON.stringify({ type: 'candidate', keyword: candidate })}\n\n`);
            await new Promise(r => setTimeout(r, 120));
        }

        res.write(`data: [DONE]\n\n`);
    } catch (e: any) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: e.message })}\n\n`);
    } finally {
        res.end();
    }
});

// ── V3: POST /api/market/v3/score-candidates ─────────────────────────────────
router.post('/v3/score-candidates', async (req: Request, res: Response) => {
    const { candidates } = req.body as { candidates: any[] };
    setupSSE(res);

    if (!Array.isArray(candidates) || candidates.length === 0) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: '候选关键词列表为空' })}\n\n`);
        res.end();
        return;
    }

    try {
        for (const kw of candidates) {
            for (const variant of (kw.variants || [])) {
                res.write(`data: ${JSON.stringify({
                    type: 'scoring',
                    keywordId: kw.id,
                    variantScript: variant.script,
                })}\n\n`);

                const startTime = Date.now();

                let score: TubeBuddyScore;
                try {
                    score = await scoreSingleVariant(variant.text, variant.script);
                } catch (err: any) {
                    if (err.type === 'session_expired') {
                        // Broadcast session error and abort entire scoring run
                        res.write(`data: ${JSON.stringify({
                            type: 'session_expired',
                            message: err.message || 'TubeBuddy 登录已过期，请在弹出的浏览器窗口中重新登录',
                        })}\n\n`);
                        res.end();
                        return;
                    }
                    // Transient error — mark variant as error, continue with the rest
                    res.write(`data: ${JSON.stringify({
                        type: 'error',
                        keywordId: kw.id,
                        variantScript: variant.script,
                        message: err.message || 'TubeBuddy 评分失败，可点击重试',
                    })}\n\n`);
                    continue;
                }

                res.write(`data: ${JSON.stringify({
                    type: 'scored',
                    keywordId: kw.id,
                    variantScript: variant.script,
                    score,
                    scoringDuration: Date.now() - startTime,
                    scoredAt: new Date().toISOString(),
                })}\n\n`);
            }
        }
        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    } catch (e: any) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: e.message })}\n\n`);
    } finally {
        res.end();
    }
});

// ── V3: POST /api/market/v3/score-single ─────────────────────────────────────
router.post('/v3/score-single', async (req: Request, res: Response) => {
    const { keywordId, variantText, variantScript } = req.body;
    setupSSE(res);

    try {
        res.write(`data: ${JSON.stringify({ type: 'scoring', keywordId, variantScript })}\n\n`);
        const startTime = Date.now();

        let score: TubeBuddyScore;
        try {
            score = await scoreSingleVariant(variantText, variantScript);
        } catch (err: any) {
            if (err.type === 'session_expired') {
                res.write(`data: ${JSON.stringify({
                    type: 'session_expired',
                    message: err.message || 'TubeBuddy 登录已过期，请重新登录',
                })}\n\n`);
                res.end();
                return;
            }
            res.write(`data: ${JSON.stringify({ type: 'error', keywordId, variantScript, message: err.message })}\n\n`);
            res.end();
            return;
        }

        res.write(`data: ${JSON.stringify({
            type: 'scored',
            keywordId,
            variantScript,
            score,
            scoringDuration: Date.now() - startTime,
            scoredAt: new Date().toISOString(),
        })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    } catch (e: any) {
        res.write(`data: ${JSON.stringify({ type: 'error', keywordId, variantScript, message: e.message })}\n\n`);
    } finally {
        res.end();
    }
});

// ── V3: POST /api/market/v3/analyze-keywords ─────────────────────────────────
router.post('/v3/analyze-keywords', async (req: Request, res: Response) => {
    const { candidates } = req.body as { candidates: any[] };
    setupSSE(res);

    try {
        const scoredSummary = candidates
            .filter(kw => kw.bestScore !== undefined)
            .sort((a, b) => (b.bestScore ?? 0) - (a.bestScore ?? 0))
            .map((kw, i) => {
                const topVariant = kw.variants?.find((v: any) => v.status === 'scored' && v.tubeBuddyScore);
                const s = topVariant?.tubeBuddyScore;
                return `${i + 1}. "${kw.keyword}" — 综合: ${kw.bestScore}${
                    s ? `，搜索量: ${s.searchVolume}，竞争度: ${s.competition}，优化度: ${s.optimization}，相关度: ${s.relevance}` : ''
                }`;
            })
            .join('\n');

        const prompt = `你是YouTube SEO策略分析师。请基于以下TubeBuddy评分数据提供深度策略点评。

关键词评分（按综合评分降序）：
${scoredSummary}

请分析（300-400字，中文）：
1. 各关键词核心优劣势对比
2. 搜索趋势与竞争格局
3. 推荐黄金关键词（1-3个）及理由
4. 与频道定位的匹配度建议

语气专业务实，直接给出可执行建议。`;

        const config = loadConfig();
        const provider = (config.global?.provider || 'siliconflow') as any;
        const model = config.global?.model || undefined;

        let analysis = '';
        try {
            analysis = await callLLM([{ role: 'user', content: prompt }], provider, model);
        } catch (e: any) {
            analysis = `（策略点评生成失败: ${e.message}）\n\n基于评分数据，推荐选择综合评分最高的前 1-3 个关键词进入 Phase 2。`;
        }

        res.write(`data: ${JSON.stringify({ type: 'analysis', content: analysis })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    } catch (e: any) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: e.message })}\n\n`);
    } finally {
        res.end();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Sprint 4 Routes — Phase 2 营销方案生成与审阅
// ─────────────────────────────────────────────────────────────────────────────

/** Parse SRT content into plain-text timeline lines (used for description timeline block) */
function parseSRTToTimeline(srtContent: string): string {
    const lines = srtContent.split(/\r?\n/);
    const timelineEntries: string[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        // Sequence number
        if (/^\d+$/.test(line)) {
            i++;
            const tcLine = (lines[i] || '').trim();
            // Timecode line: 00:00:01,000 --> 00:00:05,000
            const tcMatch = tcLine.match(/^(\d{2}:\d{2}:\d{2})/);
            if (tcMatch) {
                const start = tcMatch[1].replace(/,\d+$/, '');  // keep HH:MM:SS
                i++;
                const textLines: string[] = [];
                while (i < lines.length && lines[i].trim() !== '') {
                    textLines.push(lines[i].trim());
                    i++;
                }
                const text = textLines.join(' ').trim();
                if (text) {
                    // Convert HH:MM:SS to MM:SS for YouTube chapters (drop leading 00:)
                    const mmss = start.replace(/^00:/, '');
                    timelineEntries.push(`${mmss} ${text.slice(0, 60)}`);
                }
            }
        }
        i++;
    }
    // Deduplicate consecutive similar entries (SRT often repeats text across frames)
    const deduped: string[] = [];
    for (const entry of timelineEntries) {
        const last = deduped[deduped.length - 1] || '';
        const lastText = last.replace(/^\d+:\d+ /, '');
        const curText = entry.replace(/^\d+:\d+ /, '');
        if (!last || lastText !== curText) deduped.push(entry);
    }
    return deduped.join('\n');
}

/** Build the LLM prompt for generating a complete marketing plan */
function buildGeneratePlanPrompt(
    keyword: string,
    bestVariant: string,
    scriptContent: string,
    timelineContent: string
): string {
    return `你是MindHikers YouTube频道营销大师，专注于科学严谨的个人成长内容。
请基于以下信息，为视频生成完整的中文营销方案。

## 目标黄金关键词
简体：${keyword}
最优变体：${bestVariant}

## 视频脚本（节选）
${scriptContent}

${timelineContent ? `## 章节时间轴（来自SRT）\n${timelineContent}\n` : ''}

## 输出要求
请严格按以下JSON格式输出（只输出JSON，不要任何其他文字）：
{
  "title": "视频标题（必须包含黄金关键词，总长40-60字符，吸引点击）",
  "description_blocks": {
    "hook": "开头钩子（1-2句激发好奇心的引导语，可含1-2个emoji，纯文本严禁Markdown）",
    "geo_qa": "GEO结构化问答（2-3组问答，以问号结尾的问题+简洁答案，供AI引擎抓取）",
    "series": "系列说明（1-2句介绍本视频在系列中的位置和价值）",
    "action_plan": "行动号召（引导订阅点赞评论，含emoji，简洁有力）",
    "timeline": "${timelineContent ? '（使用上面的SRT章节时间轴，调整为YouTube格式：00:00 章节名）' : '视频章节时间轴（00:00 开场，格式每行一个章节）'}",
    "references": "参考资料（视频中提到的书籍、论文、工具名称，每行一条）",
    "pinned_comment": "置顶评论文字（资源链接说明，引导用户查看描述中的内容）",
    "hashtags": "#Hashtag1 #Hashtag2（5-8个相关Hashtag，中英文混合，空格分隔）"
  },
  "thumbnail": "缩略图关键词（英文设计提示词，供Midjourney/DALL-E生成，突出关键视觉元素）",
  "playlist": "推荐播放列表名称（与视频内容最匹配的系列名）",
  "tags": "标签1,标签2,标签3,...（20-30个YouTube SEO标签，逗号分隔，含简繁体变体和长尾词）",
  "other": "其他营销备注（发布时机、互推建议、A/B测试提醒等）"
}`;
}

/** Convert LLM JSON response to MarketingPlanRow array */
function parsePlanFromLLM(llmOutput: string, keywordId: string, keyword: string): any[] {
    let parsed: any = {};
    try {
        const jsonMatch = llmOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
        return [];
    }

    const db = parsed.description_blocks || {};
    const blockTypes = ['hook', 'geo_qa', 'series', 'action_plan', 'timeline', 'references', 'pinned_comment', 'hashtags'] as const;
    const blockLabels: Record<string, string> = {
        hook: '开头钩子', geo_qa: 'GEO问答', series: '系列说明',
        action_plan: '行动号召', timeline: '章节时间轴', references: '参考资料',
        pinned_comment: '置顶评论', hashtags: 'Hashtags',
    };
    const descriptionBlocks = blockTypes.map(type => ({
        id: `block-${type}`,
        type,
        label: blockLabels[type] || type,
        content: db[type] || '',
        isCollapsed: type !== 'hook', // Hook expanded by default
    }));

    // Combine description blocks into a single preview string
    const descPreview = descriptionBlocks.map(b => `[${b.label}] ${b.content}`).join('\n\n');

    return [
        { id: `${keywordId}-title`,       rowType: 'title',       label: '标题',     content: parsed.title || '',     isConfirmed: false },
        { id: `${keywordId}-description`, rowType: 'description', label: '视频描述', content: descPreview,             isConfirmed: false, descriptionBlocks },
        { id: `${keywordId}-thumbnail`,   rowType: 'thumbnail',   label: '缩略图',   content: parsed.thumbnail || '',  isConfirmed: false },
        { id: `${keywordId}-playlist`,    rowType: 'playlist',    label: '播放列表', content: parsed.playlist || '',   isConfirmed: false },
        { id: `${keywordId}-tags`,        rowType: 'tags',        label: '标签',     content: parsed.tags || '',       isConfirmed: false },
        { id: `${keywordId}-other`,       rowType: 'other',       label: '其他设置', content: parsed.other || '',      isConfirmed: false },
    ];
}

// ── V3: POST /api/market/v3/upload-srt ───────────────────────────────────────
router.post('/v3/upload-srt', upload.single('srt'), (req: Request, res: Response): void => {
    if (!req.file) {
        res.status(400).json({ error: 'No SRT file uploaded' });
        return;
    }

    const srtContent = req.file.buffer.toString('utf-8');
    const timeline = parseSRTToTimeline(srtContent);
    const chapters = timeline.split('\n').filter(Boolean).map(line => {
        const m = line.match(/^(\d+:\d+(?::\d+)?) (.+)$/);
        if (m) return { startTime: m[1], title: m[2] };
        return null;
    }).filter(Boolean);

    res.json({ success: true, chapters, timeline });
});

// ── V3: POST /api/market/v3/generate-plan ────────────────────────────────────
router.post('/v3/generate-plan', async (req: Request, res: Response) => {
    const { projectId, scriptPath, keyword, keywordId, bestVariantText, srtTimeline = '' } = req.body;
    setupSSE(res);

    try {
        res.write(`data: ${JSON.stringify({ type: 'generating', keywordId, keyword })}\n\n`);

        let scriptContent = '';
        try {
            scriptContent = readScriptContent(projectId, scriptPath);
        } catch (e: any) {
            res.write(`data: ${JSON.stringify({ type: 'error', keywordId, message: `脚本读取失败: ${e.message}` })}\n\n`);
            res.end();
            return;
        }

        const prompt = buildGeneratePlanPrompt(keyword, bestVariantText || keyword, scriptContent, srtTimeline);

        const config = loadConfig();
        const provider = (config.global?.provider || 'siliconflow') as any;
        const model = config.global?.model || undefined;

        let llmOutput = '';
        try {
            llmOutput = await callLLM([{ role: 'user', content: prompt }], provider, model);
        } catch (e: any) {
            res.write(`data: ${JSON.stringify({ type: 'error', keywordId, message: `LLM生成失败: ${e.message}` })}\n\n`);
            res.end();
            return;
        }

        const rows = parsePlanFromLLM(llmOutput, keywordId, keyword);
        if (rows.length === 0) {
            res.write(`data: ${JSON.stringify({ type: 'error', keywordId, message: 'LLM返回格式无法解析，请重试' })}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({ type: 'plan_ready', keywordId, keyword, rows })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    } catch (e: any) {
        res.write(`data: ${JSON.stringify({ type: 'error', keywordId: req.body.keywordId, message: e.message })}\n\n`);
    } finally {
        res.end();
    }
});

// ── V3: POST /api/market/v3/revise-row ───────────────────────────────────────
router.post('/v3/revise-row', async (req: Request, res: Response) => {
    const { rowType, rowLabel, instruction, currentContent, keyword, keywordId } = req.body;
    setupSSE(res);

    try {
        res.write(`data: ${JSON.stringify({ type: 'revising', keywordId, rowType })}\n\n`);

        const prompt = `你是MindHikers YouTube频道营销大师。请按指令修改以下营销方案的「${rowLabel}」字段。

目标关键词：${keyword}

当前内容：
${currentContent}

修改指令：${instruction}

${rowType === 'description' ? `
请只修改描述内容，保持与原格式一致（纯文本，禁止Markdown符号 ## ** - 等）。
请以JSON格式返回修改后的description_blocks对象。` : `
请直接返回修改后的${rowLabel}文本，不要任何解释。`}`;

        const config = loadConfig();
        const provider = (config.global?.provider || 'siliconflow') as any;
        const model = config.global?.model || undefined;

        let result = '';
        try {
            result = await callLLM([{ role: 'user', content: prompt }], provider, model);
        } catch (e: any) {
            res.write(`data: ${JSON.stringify({ type: 'error', keywordId, rowType, message: e.message })}\n\n`);
            res.end();
            return;
        }

        res.write(`data: ${JSON.stringify({ type: 'row_ready', keywordId, rowType, content: result.trim() })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    } catch (e: any) {
        res.write(`data: ${JSON.stringify({ type: 'error', keywordId: req.body.keywordId, rowType: req.body.rowType, message: e.message })}\n\n`);
    } finally {
        res.end();
    }
});

// ── V3: POST /api/market/v3/confirm ──────────────────────────────────────────
// 生成双格式输出：{keyword}-{date}.md 和 {keyword}-{date}.plain.txt
// 保存到 05_Marketing/ 目录

function slugify(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s\u4e00-\u9fff]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 40)
        .toLowerCase()
        .replace(/-+$/, '');
}

function stripMarkdown(text: string): string {
    return text
        .replace(/#{1,6}\s+/g, '')      // Remove ## headings
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold**
        .replace(/\*(.*?)\*/g, '$1')     // Remove *italic*
        .replace(/^[-*+]\s+/gm, '')      // Remove - list bullets
        .replace(/`([^`]+)`/g, '$1')     // Remove `code`
        .replace(/^\s*>\s+/gm, '')       // Remove blockquotes
        .trim();
}

function generateMarkdownContent(plan: any, projectId: string): string {
    const now = new Date().toISOString();
    const titleRow   = plan.rows.find((r: any) => r.rowType === 'title');
    const descRow    = plan.rows.find((r: any) => r.rowType === 'description');
    const thumbRow   = plan.rows.find((r: any) => r.rowType === 'thumbnail');
    const listRow    = plan.rows.find((r: any) => r.rowType === 'playlist');
    const tagsRow    = plan.rows.find((r: any) => r.rowType === 'tags');
    const otherRow   = plan.rows.find((r: any) => r.rowType === 'other');

    // Description: expand blocks with Markdown sub-headers
    let descMd = '';
    if (descRow?.descriptionBlocks?.length) {
        descMd = descRow.descriptionBlocks
            .filter((b: any) => b.content?.trim())
            .map((b: any) => `### ${b.label}\n${b.content}`)
            .join('\n\n');
    } else {
        descMd = descRow?.content || '';
    }

    // Other settings table
    let otherMd = '';
    if (otherRow?.otherItems?.length) {
        otherMd = '| 项目 | 值 |\n|------|-----|\n' +
            otherRow.otherItems.map((i: any) => `| ${i.label} | ${i.value} |`).join('\n');
    } else {
        otherMd = otherRow?.content || '';
    }

    return `---
keyword: "${plan.keyword}"
project: "${projectId}"
confirmed_at: "${now}"
status: confirmed
format: obsidian
---

# YouTube 营销方案: ${plan.keyword}

## 1. 视频标题
${titleRow?.content || ''}

## 2. 视频描述
${descMd}

## 3. 缩略图
${thumbRow?.content || '（未设置）'}

## 4. Playlist
${listRow?.content || ''}

## 5. Tags
${tagsRow?.content || ''}

## 6. 其他设置
${otherMd}
`;
}

function generatePlainTxtContent(plan: any): string {
    const titleRow   = plan.rows.find((r: any) => r.rowType === 'title');
    const descRow    = plan.rows.find((r: any) => r.rowType === 'description');
    const tagsRow    = plan.rows.find((r: any) => r.rowType === 'tags');
    const otherRow   = plan.rows.find((r: any) => r.rowType === 'other');

    let pinnedComment = '';
    let hashtags = '';
    let descPlain = '';

    if (descRow?.descriptionBlocks?.length) {
        const mainBlocks = descRow.descriptionBlocks.filter((b: any) =>
            !['pinned_comment', 'hashtags'].includes(b.type) && b.content?.trim()
        );
        descPlain = mainBlocks.map((b: any) => stripMarkdown(b.content)).join('\n\n');

        const pinnedBlock  = descRow.descriptionBlocks.find((b: any) => b.type === 'pinned_comment');
        const hashtagBlock = descRow.descriptionBlocks.find((b: any) => b.type === 'hashtags');
        pinnedComment = pinnedBlock?.content || '';
        hashtags      = hashtagBlock?.content || '';
    } else {
        descPlain = stripMarkdown(descRow?.content || '');
    }

    let out = '';
    out += `=== TITLE ===\n${stripMarkdown(titleRow?.content || '')}\n\n`;
    out += `=== DESCRIPTION ===\n${descPlain}\n\n`;
    out += `=== TAGS ===\n${tagsRow?.content || ''}\n\n`;

    if (pinnedComment) out += `=== PINNED_COMMENT ===\n${stripMarkdown(pinnedComment)}\n\n`;
    if (hashtags)      out += `=== HASHTAGS ===\n${hashtags}\n\n`;

    if (otherRow?.otherItems?.length) {
        out += `=== OTHER ===\n`;
        out += otherRow.otherItems.map((i: any) => `${i.key}: ${i.value}`).join('\n');
    } else if (otherRow?.content) {
        out += `=== OTHER ===\n${otherRow.content}`;
    }

    return out.trimEnd();
}

router.post('/v3/confirm', async (req: Request, res: Response) => {
    const { projectId, plans } = req.body;
    if (!projectId || !Array.isArray(plans) || plans.length === 0) {
        res.status(400).json({ error: 'projectId and plans are required' });
        return;
    }

    const projectRoot  = getProjectRoot(projectId);
    const marketingDir = path.join(projectRoot, '05_Marketing');

    try {
        await fs.promises.mkdir(marketingDir, { recursive: true });

        const datestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, (c) => c === 'T' ? '-' : c);
        const savedPaths: string[] = [];

        for (const plan of plans) {
            const slug = slugify(plan.keyword) || 'plan';
            const baseName = `marketing_plan_${slug}_${datestamp}`;

            const mdContent   = generateMarkdownContent(plan, projectId);
            const txtContent  = generatePlainTxtContent(plan);

            const mdPath  = path.join(marketingDir, `${baseName}.md`);
            const txtPath = path.join(marketingDir, `${baseName}.plain.txt`);

            await fs.promises.writeFile(mdPath, mdContent, 'utf-8');
            await fs.promises.writeFile(txtPath, txtContent, 'utf-8');

            // Relative paths for display
            savedPaths.push(`05_Marketing/${baseName}.md`);
            savedPaths.push(`05_Marketing/${baseName}.plain.txt`);
        }

        res.json({ success: true, paths: savedPaths, savedAt: new Date().toISOString() });
    } catch (e: any) {
        console.error('[market/confirm] error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ── V3: GET /api/market/v3/load-defaults ─────────────────────────────────────
router.get('/v3/load-defaults', async (req: Request, res: Response) => {
    const { projectId } = req.query as { projectId?: string };
    if (!projectId) {
        res.status(400).json({ error: 'projectId is required' });
        return;
    }

    const projectRoot   = getProjectRoot(projectId);
    const defaultsPath  = path.join(projectRoot, '05_Marketing', 'market_defaults.json');

    try {
        if (!fs.existsSync(defaultsPath)) {
            // Return built-in defaults
            res.json({
                youtube: {
                    language: 'zh-Hans',
                    captionsCertification: 'none',
                    alteredContent: false,
                    madeForKids: false,
                    category: '27',
                    categoryName: 'Education',
                    license: 'standard',
                    allowComments: true,
                    commentSort: 'newest',
                    visibility: 'public',
                    videoFilenamePattern: '{slug}-mindhikers-{date}',
                },
                x: null, wechat: null, bilibili: null,
            });
            return;
        }

        const raw = fs.readFileSync(defaultsPath, 'utf-8');
        res.json(JSON.parse(raw));
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ── V3: POST /api/market/v3/save-defaults ────────────────────────────────────
router.post('/v3/save-defaults', async (req: Request, res: Response) => {
    const { projectId, defaults } = req.body;
    if (!projectId || !defaults) {
        res.status(400).json({ error: 'projectId and defaults are required' });
        return;
    }

    const projectRoot   = getProjectRoot(projectId);
    const marketingDir  = path.join(projectRoot, '05_Marketing');
    const defaultsPath  = path.join(marketingDir, 'market_defaults.json');

    try {
        await fs.promises.mkdir(marketingDir, { recursive: true });
        await fs.promises.writeFile(defaultsPath, JSON.stringify(defaults, null, 2), 'utf-8');
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ── V3: GET /api/market/v3/session-status ────────────────────────────────────
router.get('/v3/session-status', async (_req: Request, res: Response) => {
    try {
        const worker = await getTubeBuddyWorker();
        res.json(worker.getSessionStatus());
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ── V3: POST /api/market/v3/clear-session ────────────────────────────────────
router.post('/v3/clear-session', async (_req: Request, res: Response) => {
    try {
        const worker = await getTubeBuddyWorker();
        await worker.credentialManager.clearCredentials('manual API call');
        res.json({ success: true, message: 'Session cleared. Worker will reinitialize on next scoring request.' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ── V3: POST /api/market/v3/test-score (dev only) ────────────────────────────
router.post('/v3/test-score', async (req: Request, res: Response) => {
    const { keyword, script = 'simplified' } = req.body;
    if (!keyword) {
        res.status(400).json({ error: 'keyword is required' });
        return;
    }
    try {
        const score = await scoreSingleVariant(keyword, script);
        res.json({ keyword, script, score });
    } catch (e: any) {
        res.status(500).json({ error: e.message, type: (e as any).type });
    }
});

// ── Dev: GET /api/market/dev/tubebuddy-test ───────────────────────────────────
// HTML debug page — only available in development
router.get('/dev/tubebuddy-test', async (_req: Request, res: Response) => {
    const workerStatus = await (async () => {
        try {
            const worker = await getTubeBuddyWorker();
            return worker.getSessionStatus();
        } catch (e: any) {
            return { error: e.message };
        }
    })();

    const statusJson = JSON.stringify(workerStatus, null, 2);
    const profileDir = (workerStatus as any).profileDir || '(unavailable)';
    const isPlaywright = (workerStatus as any).playwrightAvailable;
    const statusBadge = isPlaywright
        ? '<span class="badge ok">✅ Playwright 已安装</span>'
        : '<span class="badge warn">⚠️ Playwright 未安装 (使用 mock 模式)</span>';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <title>TubeBuddy Worker — Dev Debug</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    body { margin: 0; background: #0f1117; color: #e2e8f0; padding: 2rem; }
    h1 { color: #f6ad55; margin-bottom: 0.25rem; }
    h2 { color: #90cdf4; font-size: 1rem; margin-top: 2rem; border-bottom: 1px solid #2d3748; padding-bottom: 0.5rem; }
    .badge { padding: 2px 8px; border-radius: 9999px; font-size: 0.8rem; }
    .badge.ok { background: #276749; color: #9ae6b4; }
    .badge.warn { background: #744210; color: #fbd38d; }
    .badge.err { background: #742a2a; color: #feb2b2; }
    pre { background: #1a202c; border: 1px solid #2d3748; border-radius: 8px; padding: 1rem; font-size: 0.85rem; overflow-x: auto; white-space: pre-wrap; }
    input, select { background: #1a202c; border: 1px solid #4a5568; color: #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; }
    button { background: #4a90d9; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
    button:hover { background: #3a7bc8; }
    button.danger { background: #e53e3e; }
    button.danger:hover { background: #c53030; }
    .row { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-top: 0.5rem; }
    #result { margin-top: 1rem; }
    .section { margin-bottom: 2rem; background: #161b27; border-radius: 10px; padding: 1.25rem; border: 1px solid #2d3748; }
    .setup-steps ol { line-height: 2; }
    code { background: #2d3748; padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', monospace; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>🔬 TubeBuddy Worker — Dev Debug</h1>
  <p style="color:#718096">DeliveryConsole 内部调试页面 · 仅限开发环境</p>

  <div class="section">
    <h2>⚡ 当前状态</h2>
    ${statusBadge}
    <pre>${statusJson}</pre>
    <div class="row">
      <button onclick="clearSession()">🗑️ 清除 Session</button>
      <button onclick="refreshStatus()">🔄 刷新状态</button>
    </div>
  </div>

  <div class="section">
    <h2>🧪 测试评分</h2>
    <div class="row">
      <input id="kw" type="text" placeholder="输入关键词，如：AI学习效率" style="width:280px" />
      <select id="script">
        <option value="simplified">简体</option>
        <option value="traditional">繁體</option>
      </select>
      <button onclick="testScore()">📊 测试评分</button>
    </div>
    <div id="result"></div>
  </div>

  <div class="section setup-steps">
    <h2>📋 首次使用配置步骤</h2>
    <ol>
      <li>安装 Playwright：<code>npm install playwright</code> 然后 <code>npx playwright install chromium</code></li>
      <li>重启 dev server，浏览器将自动打开（使用 profile：<code>${profileDir}</code>）</li>
      <li>在弹出的浏览器中访问 <a href="https://www.tubebuddy.com" target="_blank" style="color:#63b3ed">tubebuddy.com</a> 并登录 TubeBuddy Pro 账户</li>
      <li>回到此页面，确认「isLoggedIn: true」</li>
      <li>测试一个关键词，确认评分返回真实数据</li>
    </ol>
    <p style="color:#718096;font-size:0.85rem">
      Chrome Profile 将保存登录状态。设置 <code>TUBEBUDDY_DEV_MOCK=1</code> 可跳过 Playwright 强制使用 mock 模式。
    </p>
  </div>

  <script>
    async function refreshStatus() {
      const r = await fetch('/api/market/v3/session-status');
      const data = await r.json();
      document.querySelector('pre').textContent = JSON.stringify(data, null, 2);
    }

    async function clearSession() {
      if (!confirm('确认清除 TubeBuddy Session（将需要重新登录）？')) return;
      const r = await fetch('/api/market/v3/clear-session', { method: 'POST' });
      const data = await r.json();
      alert(data.message || data.error);
      refreshStatus();
    }

    async function testScore() {
      const keyword = document.getElementById('kw').value.trim();
      const script = document.getElementById('script').value;
      if (!keyword) { alert('请输入关键词'); return; }

      const el = document.getElementById('result');
      el.innerHTML = '<pre>评分中，请稍候...</pre>';

      try {
        const r = await fetch('/api/market/v3/test-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword, script }),
        });
        const data = await r.json();
        el.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
      } catch (e) {
        el.innerHTML = '<pre style="color:#fc8181">请求失败: ' + e.message + '</pre>';
      }
    }
  </script>
</body>
</html>`);
});

export default router;
