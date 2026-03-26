/**
 * Upload Handler for Non-AI Material Upload
 * Feature: Phase 3 Loop Closure for internet-clip & user-capture
 * 
 * Endpoint: POST /api/director/upload-material
 * Saves to: projects/${projectId}/04_Visuals/${chapterId}_rendered.mp4
 */

import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getProjectRoot } from './project-root';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configure multer storage for material uploads
 * Files saved temporarily first, then moved to target location
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        // Use original filename with timestamp to avoid collisions
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

/**
 * File filter: Only accept video files
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`不支持的文件类型: ${file.mimetype}。请上传 MP4、WebM 或 MOV 格式的视频。`));
    }
};

/**
 * Multer upload middleware instance
 */
export const materialUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max file size
    }
});

/**
 * Handle material upload for non-AI sources (internet-clip, user-capture)
 * 
 * POST /api/director/upload-material
 * Body: multipart/form-data
 *   - projectId: string
 *   - chapterId: string  
 *   - videoFile: File
 */
export async function handleMaterialUpload(req: Request, res: Response) {
    try {
        const { projectId, chapterId, optionId } = req.body;
        const file = req.file;

        // Validation
        if (!projectId || !chapterId || !optionId) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: projectId, chapterId, optionId 为必填项'
            });
        }

        if (!file) {
            return res.status(400).json({
                success: false,
                error: '未找到上传的文件'
            });
        }

        // Construct target path: projects/${projectId}/04_Visuals/${chapterId}_${optionId}_rendered.mp4
        const visualsDir = path.join(getProjectRoot(projectId), '04_Visuals');
        const targetFilename = `${chapterId}_${optionId}_rendered.mp4`;
        const targetPath = path.join(visualsDir, targetFilename);

        // Ensure directory exists
        if (!fs.existsSync(visualsDir)) {
            fs.mkdirSync(visualsDir, { recursive: true });
            console.log(`[Upload] Created directory: ${visualsDir}`);
        }

        // Move file from temp location to target
        fs.renameSync(file.path, targetPath);

        console.log(`[Upload] Success: ${file.originalname} -> ${targetPath}`);

        // Return success with file info
        res.json({
            success: true,
            data: {
                projectId,
                chapterId,
                optionId,
                filename: targetFilename,
                path: targetPath,
                size: file.size,
                mimetype: file.mimetype
            },
            message: `素材上传成功: ${targetFilename}`
        });

    } catch (error: any) {
        console.error('[Upload] Error:', error);

        // Clean up temp file if exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: error.message || '上传过程中发生错误'
        });
    }
}

/**
 * Check if material exists for a chapter
 * 
 * GET /api/director/material-exists?projectId=xxx&chapterId=yyy&optionId=zzz
 */
export async function checkMaterialExists(req: Request, res: Response) {
    try {
        const { projectId, chapterId, optionId } = req.query;

        if (!projectId || !chapterId || !optionId) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数: projectId, chapterId 和 optionId'
            });
        }

        const targetPath = path.join(
            getProjectRoot(projectId as string),
            '04_Visuals',
            `${chapterId}_${optionId}_rendered.mp4`
        );

        const exists = fs.existsSync(targetPath);
        const stats = exists ? fs.statSync(targetPath) : null;

        res.json({
            success: true,
            data: {
                exists,
                path: targetPath,
                size: stats?.size || 0,
                modifiedTime: stats?.mtime?.toISOString() || null
            }
        });

    } catch (error: any) {
        console.error('[Upload] Check exists error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
