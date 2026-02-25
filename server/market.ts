import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getTubeBuddyWorker } from './workers/tubebuddy-worker';

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

router.post('/generate', generateSEO);
router.post('/score', scoreKeyword);
router.post('/score-all', scoreAllKeywords);
router.post('/confirm', confirmSEO);

export default router;
