/**
 * 外部素材加载 API
 * 用于加载、复制、管理外部素材（Artlist 实拍、互联网素材、用户截图/录屏）
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { ExternalAsset } from '../src/types';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface UploadedFileInfo {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    destination: string;
    filename: string;
    path: string;
    size: number;
}

// 项目路径管理
const getProjectRoot = (projectId: string): string => {
    const PROJECTS_BASE = process.env.PROJECTS_BASE || path.join(process.cwd(), 'Projects');
    return path.join(PROJECTS_BASE, projectId);
};

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * 加载外部素材到项目目录
 * @param projectId 项目 ID
 * @param chapterId 章节 ID
 * @param type 素材类型
 * @param sourcePath 原始文件路径
 * @returns 外部素材记录
 */
export async function loadExternalAsset(
    projectId: string,
    chapterId: string,
    type: 'artlist' | 'internet-clip' | 'user-capture',
    sourcePath: string
): Promise<ExternalAsset> {
    const projectRoot = getProjectRoot(projectId);
    const brollDir = path.join(projectRoot, '06_Video_Broll');
    ensureDir(brollDir);

    // 验证源文件存在
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`源文件不存在: ${sourcePath}`);
    }

    // 获取文件扩展名
    const ext = path.extname(sourcePath).toLowerCase();
    const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

    if (!validExtensions.includes(ext)) {
        throw new Error(`不支持的文件格式: ${ext}，仅支持 ${validExtensions.join(', ')}`);
    }

    // 生成目标文件名
    const fileName = `${chapterId}_${type}${ext}`;
    const targetPath = path.join(brollDir, fileName);

    // 如果目标文件已存在，添加时间戳避免覆盖
    let finalTargetPath = targetPath;
    if (fs.existsSync(targetPath)) {
        const timestamp = Date.now();
        const nameWithoutExt = path.basename(fileName, ext);
        finalTargetPath = path.join(brollDir, `${nameWithoutExt}_${timestamp}${ext}`);
    }

    // 复制文件
    try {
        await fs.promises.copyFile(sourcePath, finalTargetPath);
    } catch (error) {
        throw new Error(`文件复制失败: ${error}`);
    }

    return {
        assetId: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chapterId,
        type,
        sourcePath,
        targetPath: finalTargetPath,
        loadedAt: new Date().toISOString()
    };
}

/**
 * 获取项目已加载的外部素材列表
 * @param projectId 项目 ID
 * @returns 外部素材列表
 */
export async function getExternalAssets(projectId: string): Promise<ExternalAsset[]> {
    const projectRoot = getProjectRoot(projectId);
    const statePath = path.join(projectRoot, '04_Visuals', 'phase3_render_state.json');

    // 读取渲染状态文件
    let state: { externalAssets?: ExternalAsset[] } = {};

    if (fs.existsSync(statePath)) {
        try {
            const content = await fs.promises.readFile(statePath, 'utf-8');
            state = JSON.parse(content);
        } catch (error) {
            console.error('Failed to read phase3_render_state.json:', error);
        }
    }

    return state.externalAssets || [];
}

/**
 * 移除已加载的外部素材
 * @param projectId 项目 ID
 * @param assetId 素材 ID
 * @returns 是否成功
 */
export async function removeExternalAsset(projectId: string, assetId: string): Promise<boolean> {
    const projectRoot = getProjectRoot(projectId);
    const statePath = path.join(projectRoot, '04_Visuals', 'phase3_render_state.json');

    // 读取渲染状态文件
    if (!fs.existsSync(statePath)) {
        throw new Error('渲染状态文件不存在');
    }

    const content = await fs.promises.readFile(statePath, 'utf-8');
    const state = JSON.parse(content);

    if (!state.externalAssets) {
        return false;
    }

    // 查找要移除的素材
    const assetIndex = state.externalAssets.findIndex((a: ExternalAsset) => a.assetId === assetId);
    if (assetIndex === -1) {
        return false;
    }

    const asset = state.externalAssets[assetIndex];

    // 删除物理文件
    if (fs.existsSync(asset.targetPath)) {
        await fs.promises.unlink(asset.targetPath);
    }

    // 从状态中移除
    state.externalAssets.splice(assetIndex, 1);

    // 保存状态
    await fs.promises.writeFile(statePath, JSON.stringify(state, null, 2));

    return true;
}

/**
 * 打开 Finder 到指定目录
 * @param dirPath 目录路径
 */
export async function openFinder(dirPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(dirPath)) {
            reject(new Error(`目录不存在: ${dirPath}`));
            return;
        }

        // 使用 open 命令打开 Finder
        const openProcess = spawn('open', [dirPath]);

        openProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`open 命令失败，退出码: ${code}`));
            }
        });

        openProcess.on('error', (error) => {
            reject(new Error(`无法打开 Finder: ${error.message}`));
        });
    });
}

/**
 * 打开 Finder 到项目的 B-roll 目录
 * @param projectId 项目 ID
 */
export async function openBRollFinder(projectId: string): Promise<void> {
    const projectRoot = getProjectRoot(projectId);
    const brollDir = path.join(projectRoot, '06_Video_Broll');
    ensureDir(brollDir);

    await openFinder(brollDir);
}

/**
 * 获取支持的文件扩展名列表
 * @returns 扩展名列表
 */
export function getSupportedExtensions(): string[] {
    return ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
}

/**
 * 验证文件是否为支持的视频格式
 * @param filePath 文件路径
 * @returns 是否支持
 */
export function isSupportedVideoFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return getSupportedExtensions().includes(ext);
}

/**
 * 处理上传的视频文件
 * @param projectId 项目 ID
 * @param chapterId 章节 ID
 * @param type 素材类型
 * @param file 上传的文件信息
 * @returns 外部素材记录
 */
export async function handleUploadedFile(
    projectId: string,
    chapterId: string,
    type: 'artlist' | 'internet-clip' | 'user-capture',
    file: UploadedFileInfo
): Promise<ExternalAsset> {
    const projectRoot = getProjectRoot(projectId);
    const brollDir = path.join(projectRoot, '06_Video_Broll');
    ensureDir(brollDir);

    // 验证文件类型
    if (!file.mimetype.startsWith('video/')) {
        throw new Error(`不支持的文件类型: ${file.mimetype}`);
    }

    // 验证文件扩展名
    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];

    if (!validExtensions.includes(ext)) {
        throw new Error(`不支持的文件格式: ${ext}，仅支持 ${validExtensions.join(', ')}`);
    }

    // 验证文件大小（最大 500MB）
    const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`文件过大，最大支持 500MB，当前文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // 生成目标文件名
    const fileName = `${chapterId}_${type}${ext}`;
    const targetPath = path.join(brollDir, fileName);

    // 如果目标文件已存在，添加时间戳避免覆盖
    let finalTargetPath = targetPath;
    if (fs.existsSync(targetPath)) {
        const timestamp = Date.now();
        const nameWithoutExt = path.basename(fileName, ext);
        finalTargetPath = path.join(brollDir, `${nameWithoutExt}_${timestamp}${ext}`);
    }

    // 移动上传的文件到目标位置
    try {
        await fs.promises.rename(file.path, finalTargetPath);
    } catch (error) {
        // 如果 rename 失败，尝试复制
        await fs.promises.copyFile(file.path, finalTargetPath);
        // 删除临时文件
        try {
            await fs.promises.unlink(file.path);
        } catch {
            // 忽略删除失败
        }
    }

    return {
        assetId: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chapterId,
        type,
        sourcePath: file.originalname,
        targetPath: finalTargetPath,
        loadedAt: new Date().toISOString()
    };
}

/**
 * 清理临时上传文件
 * @param tempPath 临时文件路径
 */
export async function cleanupTempFile(tempPath: string): Promise<void> {
    if (fs.existsSync(tempPath)) {
        try {
            await fs.promises.unlink(tempPath);
        } catch (error) {
            console.error(`Failed to cleanup temp file ${tempPath}:`, error);
        }
    }
}

