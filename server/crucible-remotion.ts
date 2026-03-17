import { Request, Response } from 'express';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { renderStillWithApi } from './remotion-api-renderer';

interface PreviewLayer {
    id: string;
    type: 'text';
    text: string;
    x: number;
    y: number;
    animation: 'fade-in' | 'slide-up';
    startFrame: number;
    endFrame: number;
    fontSize: number;
    color: string;
    zIndex?: number;
}

const ensureDir = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const normalizeLine = (value: string, maxLength = 34) => {
    const normalized = value
        .replace(/^[-*+•]\s+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!normalized) {
        return '';
    }

    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const simplifyNode = (value: string, maxLength = 10) => {
    const normalized = value
        .replace(/^[-*+•]\s+/g, '')
        .replace(/^(一极|另一极|一边|另一边|左侧|右侧|冲突点在于|核心冲突点|核心矛盾|核心张力)[:：]?\s*/g, '')
        .replace(/[，。；：、]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!normalized) {
        return '';
    }

    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const extractConflictNodes = (title: string, bullets: string[]) => {
    const nodes: string[] = [];
    const joined = [title, ...bullets].join(' ');
    const patterns = [
        /一极(?:是)?([^，。；]+)/,
        /另一极(?:是)?([^，。；]+)/,
        /一边(?:是)?([^，。；]+)/,
        /另一边(?:是)?([^，。；]+)/,
        /左侧[:：]?([^，。；]+)/,
        /右侧[:：]?([^，。；]+)/,
    ];

    for (const pattern of patterns) {
        const match = joined.match(pattern);
        if (match?.[1]) {
            const candidate = simplifyNode(match[1]);
            if (candidate && !nodes.includes(candidate)) {
                nodes.push(candidate);
            }
        }
    }

    if (nodes.length >= 2) {
        return nodes.slice(0, 2);
    }

    const titleMatch = title.match(/[:：]\s*(.+)$/)?.[1] || title;
    const vsMatch = titleMatch.match(/(.+?)\s*(?:vs\.?|VS|与|和)\s*(.+)/i);
    if (vsMatch) {
        const left = simplifyNode(vsMatch[1]);
        const right = simplifyNode(vsMatch[2]);
        return [left, right].filter(Boolean).slice(0, 2);
    }

    for (const bullet of bullets) {
        const candidate = simplifyNode(bullet);
        if (candidate && !nodes.includes(candidate)) {
            nodes.push(candidate);
        }
        if (nodes.length >= 2) {
            break;
        }
    }

    return nodes.slice(0, 2);
};

const extractTensionLabel = (bullets: string[]) => {
    const joined = bullets.join(' ');
    const match = joined.match(/(?:冲突点在于|核心冲突点|核心矛盾|核心张力)[:：]?\s*([^，。；]+)/);
    if (match?.[1]) {
        return simplifyNode(match[1], 14);
    }
    return '核心拉扯';
};

const extractAtmosphereLine = (bullets: string[]) => {
    const candidate = bullets.find((bullet) => bullet.trim().length > 0) || '';
    return normalizeLine(candidate, 22);
};

const buildPreviewLayers = (title: string, bullets: string[]): PreviewLayer[] => {
    const [leftNode = '此岸', rightNode = '彼岸'] = extractConflictNodes(title, bullets);
    const tensionLabel = extractTensionLabel(bullets);
    const atmosphereLine = extractAtmosphereLine(bullets);

    return [
        {
            id: 'left-node',
            type: 'text',
            text: leftNode,
            x: 180,
            y: 255,
            animation: 'fade-in',
            startFrame: 8,
            endFrame: 72,
            fontSize: 42,
            color: '#f5dfb7',
            zIndex: 10,
        },
        {
            id: 'right-node',
            type: 'text',
            text: rightNode,
            x: 1220,
            y: 255,
            animation: 'fade-in',
            startFrame: 14,
            endFrame: 72,
            fontSize: 42,
            color: '#f5dfb7',
            zIndex: 10,
        },
        {
            id: 'tension-label',
            type: 'text',
            text: tensionLabel,
            x: 690,
            y: 420,
            animation: 'slide-up',
            startFrame: 20,
            endFrame: 72,
            fontSize: 54,
            color: '#fdfbf7',
            zIndex: 12,
        },
        {
            id: 'axis-hint',
            type: 'text',
            text: '← 冲突场 →',
            x: 700,
            y: 540,
            animation: 'fade-in',
            startFrame: 28,
            endFrame: 72,
            fontSize: 28,
            color: '#c7a874',
            zIndex: 11,
        },
        {
            id: 'atmosphere-line',
            type: 'text',
            text: atmosphereLine,
            x: 450,
            y: 790,
            animation: 'fade-in',
            startFrame: 34,
            endFrame: 72,
            fontSize: 26,
            color: '#bca88a',
            zIndex: 9,
        },
    ];
};

export const generateCrucibleRemotionPreview = async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const {
        projectId,
        topicTitle,
        title,
        subtitle,
        bullets = [],
    } = req.body || {};

    if (!projectId || !title) {
        return res.status(400).json({ error: 'Missing projectId or title' });
    }

    const normalizedTitle = normalizeLine(title, 24) || '黑板焦点';
    const normalizedSubtitle = normalizeLine(subtitle || topicTitle || '', 42);
    const normalizedBullets = Array.isArray(bullets)
        ? bullets.map((item) => normalizeLine(String(item))).filter(Boolean).slice(0, 3)
        : [];

    const previewPayload = {
        renderVersion: 'structure-v2',
        topicTitle: normalizeLine(topicTitle || '', 24),
        title: normalizedTitle,
        subtitle: normalizedSubtitle,
        bullets: normalizedBullets,
    };

    const cacheKey = createHash('sha1')
        .update(JSON.stringify(previewPayload))
        .digest('hex');

    const outputDir = path.resolve(process.cwd(), 'runtime', 'crucible', String(projectId), 'remotion_previews');
    ensureDir(outputDir);

    const outputPath = path.join(outputDir, `${cacheKey}.png`);

    try {
        if (!fs.existsSync(outputPath)) {
            console.log(`[CruciblePreview] render-start project=${projectId} cacheKey=${cacheKey} title="${normalizedTitle}"`);
            await renderStillWithApi('SceneComposer', outputPath, {
                title: '',
                subtitle: '',
                theme: 'warm-gold',
                layers: buildPreviewLayers(previewPayload.title, previewPayload.bullets),
            });
            console.log(`[CruciblePreview] render-done project=${projectId} cacheKey=${cacheKey} duration=${Date.now() - startedAt}ms`);
        } else {
            console.log(`[CruciblePreview] cache-hit project=${projectId} cacheKey=${cacheKey} duration=${Date.now() - startedAt}ms`);
        }

        const imageBuffer = fs.readFileSync(outputPath);
        return res.json({
            cacheKey,
            imageUrl: `data:image/png;base64,${imageBuffer.toString('base64')}`,
        });
    } catch (error: any) {
        console.error(`[Crucible Remotion Preview] Failed after ${Date.now() - startedAt}ms:`, error);
        return res.status(500).json({ error: error?.message || 'Crucible remotion preview failed' });
    }
};
