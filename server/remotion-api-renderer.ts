import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawn } from 'child_process';

/**
 * 按优先级链解析 RemotionStudio 路径（与 skill-sync 同源配置）：
 *   1. REMOTION_STUDIO_DIR 环境变量（显式指定）
 *   2. SKILLS_BASE/RemotionStudio（跟随 skills 配置）
 *   3. ~/.gemini/antigravity/skills/RemotionStudio（兜底默认）
 */
function resolveRemotionStudioDir(): string {
    const candidates = [
        process.env.REMOTION_STUDIO_DIR,
        process.env.SKILLS_BASE && path.join(process.env.SKILLS_BASE, 'RemotionStudio'),
        path.join(os.homedir(), '.gemini/antigravity/skills/RemotionStudio'),
    ].filter(Boolean) as string[];

    for (const dir of candidates) {
        if (fs.existsSync(path.join(dir, 'node_modules', '.bin', 'remotion'))) {
            console.log(`[Remotion] ✅ Resolved studio dir: ${dir}`);
            return dir;
        }
    }

    const fallback = candidates[candidates.length - 1] || '/missing-remotion-studio';
    console.warn(`[Remotion] ⚠️ No valid RemotionStudio found, using fallback: ${fallback}`);
    return fallback;
}

const REMOTION_STUDIO_DIR = resolveRemotionStudioDir();

/**
 * 幂等删除临时文件：spawn 失败时 error + close 都会触发，
 * 用闭包标记确保只删一次，避免第二次 ENOENT 崩进程。
 */
function makeTmpCleaner(filePath: string) {
    let cleaned = false;
    return () => {
        if (cleaned) return;
        cleaned = true;
        try { fs.unlinkSync(filePath); } catch {}
    };
}

export async function renderStillWithApi(
    compositionId: string,
    outputPath: string,
    inputProps: any
): Promise<{ success: boolean; outputPath: string; size?: number }> {
    const tmpPropsPath = `/tmp/remotion-props-${Date.now()}.json`;
    fs.writeFileSync(tmpPropsPath, JSON.stringify(inputProps), 'utf-8');
    const cleanupTmp = makeTmpCleaner(tmpPropsPath);

    return new Promise((resolve, reject) => {
        const remotionBin = path.join(REMOTION_STUDIO_DIR, 'node_modules', '.bin', 'remotion');
        const args = [
            'still',
            'src/index.tsx',
            compositionId,
            outputPath,
            '--frame=50',
            '--scale=1.5',
            '--jpeg-quality=90',
            `--props=${tmpPropsPath}`,
            '--disable-web-security'
        ];

        console.log(`[Remotion CLI] Command: ${remotionBin} ${args.join(' ')}`);
        console.log(`[Remotion CLI] Working dir: ${REMOTION_STUDIO_DIR}`);
        console.log(`[Remotion CLI] Props:`, JSON.stringify(inputProps, null, 2));

        const proc = spawn(remotionBin, args, {
            cwd: REMOTION_STUDIO_DIR,
            env: { ...process.env, NODE_ENV: 'production' }
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            console.log(`[Remotion] ${output.trim()}`);
        });

        proc.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            console.error(`[Remotion Error] ${output.trim()}`);
        });

        proc.on('close', (code) => {
            cleanupTmp();

            console.log(`[Remotion CLI] Process closed with code: ${code}`);

            if (code !== 0) {
                const errorMsg = `Remotion exited with code ${code}${stderr ? ': ' + stderr : ''}`;
                console.error(`[Remotion CLI Error] ${errorMsg}`);
                reject(new Error(errorMsg));
                return;
            }

            if (!fs.existsSync(outputPath)) {
                const errorMsg = `Render completed but file not found: ${outputPath}`;
                console.error(`[Remotion CLI Error] ${errorMsg}`);
                console.error(`[Remotion CLI Error] stdout: ${stdout}`);
                reject(new Error(errorMsg));
                return;
            }

            const stats = fs.statSync(outputPath);
            console.log(`[Remotion CLI] Success: ${outputPath} (${stats.size} bytes)`);
            resolve({ success: true, outputPath, size: stats.size });
        });

        proc.on('error', (err) => {
            cleanupTmp();
            console.error(`[Remotion CLI Spawn Error] ${err.message}`);
            reject(new Error(`Failed to spawn: ${err.message}`));
        });
    });
}

export async function renderVideoWithApi(
    compositionId: string,
    outputPath: string,
    inputProps: any,
    onProgress?: (percent: number) => void
): Promise<{ success: boolean; outputPath: string; size?: number }> {
    const tmpPropsPath = `/tmp/remotion-video-props-${Date.now()}.json`;
    fs.writeFileSync(tmpPropsPath, JSON.stringify(inputProps), 'utf-8');
    const cleanupTmp = makeTmpCleaner(tmpPropsPath);

    return new Promise((resolve, reject) => {
        const remotionBin = path.join(REMOTION_STUDIO_DIR, 'node_modules', '.bin', 'remotion');
        const args = [
            'render',
            'src/index.tsx',
            compositionId,
            outputPath,
            '--concurrency=2',
            `--props=${tmpPropsPath}`,
            '--disable-web-security'
        ];

        console.log(`[Remotion Video] Command: ${remotionBin} ${args.join(' ')}`);
        console.log(`[Remotion Video] Output: ${outputPath}`);

        const proc = spawn(remotionBin, args, {
            cwd: REMOTION_STUDIO_DIR,
            env: { ...process.env, NODE_ENV: 'production' }
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            const percentMatch = output.match(/\[(\d+)%\]/);
            if (percentMatch && onProgress) {
                onProgress(parseInt(percentMatch[1], 10));
            }
            const frameMatch = output.match(/Rendering frame (\d+)\/(\d+)/);
            if (frameMatch && onProgress) {
                const pct = Math.round((parseInt(frameMatch[1]) / parseInt(frameMatch[2])) * 100);
                onProgress(pct);
            }
            console.log(`[Remotion Video] ${output.trim()}`);
        });

        proc.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            const percentMatch = output.match(/\[(\d+)%\]/);
            if (percentMatch && onProgress) {
                onProgress(parseInt(percentMatch[1], 10));
            }
            console.error(`[Remotion Video Error] ${output.trim()}`);
        });

        proc.on('close', (code) => {
            cleanupTmp();

            if (code !== 0) {
                reject(new Error(`Remotion video render exited with code ${code}${stderr ? ': ' + stderr.slice(0, 500) : ''}`));
                return;
            }

            if (!fs.existsSync(outputPath)) {
                reject(new Error(`Render completed but video file not found: ${outputPath}`));
                return;
            }

            const stats = fs.statSync(outputPath);
            console.log(`[Remotion Video] Success: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
            resolve({ success: true, outputPath, size: stats.size });
        });

        proc.on('error', (err) => {
            cleanupTmp();
            reject(new Error(`Failed to spawn Remotion video render: ${err.message}`));
        });
    });
}
