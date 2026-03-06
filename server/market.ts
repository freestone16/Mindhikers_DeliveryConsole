import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getTubeBuddyWorker } from './workers/tubebuddy-worker';
import { callLLM } from './llm';
import { loadConfig } from './llm-config';

const router = Router();

const getProjectRoot = (projectId: string) => {
    const PROJECTS_BASE = process.env.PROJECTS_BASE || path.resolve(__dirname, '../../Projects');
    return path.resolve(PROJECTS_BASE, projectId);
};

export const generateSEO = async (req: Request, res: Response) => {
    const { projectId, scriptPath, count, focusKeywords } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

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
        
        res.write(`data: ${JSON.stringify({ type: 'generated', set })}\n\n`);
        await new Promise(r => setTimeout(r, 500));
    }

    res.write(`data: ${JSON.stringify({ type: 'complete', sets: mockSets })}\n\n`);
    res.end();
};

export const scoreKeyword = async (req: Request, res: Response) => {
    const { setId, keyword, title } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`data: ${JSON.stringify({ type: 'scoring', setId })}\n\n`);
    
    try {
        const worker = await getTubeBuddyWorker();
        const score = await worker.scoreKeyword(keyword || title);
        
        res.write(`data: ${JSON.stringify({ type: 'scored', setId, score })}\n\n`);
    } catch (error: any) {
        res.write(`data: ${JSON.stringify({ type: 'error', setId, error: error.message })}\n\n`);
    }
    
    res.end();
};

export const scoreAllKeywords = async (req: Request, res: Response) => {
    const { sets } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for (const set of sets) {
        res.write(`data: ${JSON.stringify({ type: 'scoring', setId: set.id })}\n\n`);
        
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

        res.write(`data: ${JSON.stringify({ type: 'scored', setId: set.id, score })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
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
    const PROJECTS_BASE = process.env.PROJECTS_BASE || path.resolve(__dirname, '../../Projects');
    const projectRoot = path.resolve(PROJECTS_BASE, projectId);
    const fullPath = path.isAbsolute(scriptPath)
        ? scriptPath
        : path.join(projectRoot, scriptPath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`脚本文件不存在: ${fullPath}`);
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    return content.length > 8000 ? content.slice(0, 8000) + '\n...(已截断)' : content;
}

/** Helper: SSE setup */
function setupSSE(res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
}

/** Helper: deterministic mock TubeBuddy score (Sprint 2 placeholder, Sprint 3 = real DOM) */
function mockTubeBuddyScore(keyword: string, script: 'simplified' | 'traditional') {
    const seed = keyword.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const rng = (min: number, max: number, offset = 0) => min + ((seed + offset) % (max - min + 1));
    const searchVolume = rng(35, 90, 1);
    const competition = rng(25, 80, 2);
    const optimization = rng(50, 95, 3);
    const relevance = rng(60, 98, 4);
    const penalty = script === 'traditional' ? -8 : 0;
    const overall = Math.round(
        searchVolume * 0.3 + (100 - competition) * 0.2 + optimization * 0.3 + relevance * 0.2 + penalty
    );
    return {
        overall: Math.max(30, Math.min(99, overall)),
        searchVolume,
        competition,
        optimization,
        relevance,
    };
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
                // Sprint 2: realistic delay simulation (Sprint 3 replaces with Playwright)
                const delay = 2500 + Math.random() * 2000;
                await new Promise(r => setTimeout(r, delay));

                // Simulate 1-in-8 error rate for UI testing
                if (Math.random() < 0.125) {
                    res.write(`data: ${JSON.stringify({
                        type: 'error',
                        keywordId: kw.id,
                        variantScript: variant.script,
                        message: 'TubeBuddy 评分超时，请重试',
                    })}\n\n`);
                    continue;
                }

                const score = mockTubeBuddyScore(variant.text, variant.script);
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
        await new Promise(r => setTimeout(r, 2500 + Math.random() * 2000));

        const score = mockTubeBuddyScore(variantText, variantScript);
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

export default router;
