import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg']);

const getProjectRoot = (projectId: string): string => {
    const PROJECTS_BASE = process.env.PROJECTS_BASE || path.join(process.cwd(), 'Projects');
    return path.join(PROJECTS_BASE, projectId);
};

function walkFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

function inferProvider(filePath: string): 'ace-step' | 'music-director' | 'suno' | 'artlist' {
    const normalized = filePath.toLowerCase();
    if (normalized.includes('ace-step') || normalized.includes('ace_step') || normalized.includes('acestep')) {
        return 'ace-step';
    }
    if (normalized.includes('suno')) {
        return 'suno';
    }
    if (normalized.includes('artlist')) {
        return 'artlist';
    }
    return 'music-director';
}

export const getAssets = (req: Request, res: Response) => {
    try {
        const { projectId } = req.query;
        if (!projectId || typeof projectId !== 'string') {
            return res.status(400).json({ error: 'projectId is required' });
        }

        const projectRoot = getProjectRoot(projectId);
        const musicDir = path.join(projectRoot, '04_Music_Plan');

        if (!fs.existsSync(musicDir)) {
            return res.json({
                success: true,
                musicDir,
                markdownFiles: [],
                audioFiles: [],
                latestMarkdownContent: '',
            });
        }

        const allFiles = walkFiles(musicDir);

        const markdownFiles = allFiles
            .filter((file) => file.toLowerCase().endsWith('.md'))
            .map((file) => {
                const stats = fs.statSync(file);
                return {
                    name: path.basename(file),
                    path: path.relative(projectRoot, file),
                    modifiedAt: stats.mtime.toISOString(),
                    size: stats.size,
                };
            })
            .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

        const audioFiles = allFiles
            .filter((file) => AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase()))
            .map((file) => {
                const stats = fs.statSync(file);
                return {
                    name: path.basename(file),
                    path: path.relative(projectRoot, file),
                    modifiedAt: stats.mtime.toISOString(),
                    size: stats.size,
                    provider: inferProvider(file),
                };
            })
            .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

        const latestMarkdownContent = markdownFiles.length > 0
            ? fs.readFileSync(path.join(projectRoot, markdownFiles[0].path), 'utf-8')
            : '';

        res.json({
            success: true,
            musicDir,
            markdownFiles,
            audioFiles,
            latestMarkdownContent,
        });
    } catch (error: any) {
        console.error('Music assets API error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
