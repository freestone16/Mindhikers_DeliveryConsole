import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawn } from 'child_process';

const REMOTION_STUDIO_DIR = process.env.REMOTION_STUDIO_DIR ||
    path.join(os.homedir(), '.gemini/antigravity/skills/RemotionStudio');

export async function renderStillWithApi(
    compositionId: string,
    outputPath: string,
    inputProps: any
): Promise<{ success: boolean; outputPath: string; size?: number }> {
    const tmpPropsPath = `/tmp/remotion-props-${Date.now()}.json`;
    fs.writeFileSync(tmpPropsPath, JSON.stringify(inputProps), 'utf-8');

    return new Promise((resolve, reject) => {
        const remotionBin = path.join(REMOTION_STUDIO_DIR, 'node_modules', '.bin', 'remotion');
        const args = [
            'still',
            'src/index.tsx',
            compositionId,
            outputPath,
            '--frame=50',  // 改为中间帧，适用于大多数短动画
            '--scale=1.5',  // 提高分辨率以获得更清晰的预览
            '--jpeg-quality=90',  // 提高图片质量
            `--props=${tmpPropsPath}`
        ];

        console.log(`[Remotion CLI] Command: ${remotionBin} ${args.join(' ')}`);
        console.log(`[Remotion CLI] Working dir: ${REMOTION_STUDIO_DIR}`);
        console.log(`[Remotion CLI] Props:`, JSON.stringify(inputProps, null, 2));

        const proc = spawn(remotionBin, args, {
            cwd: REMOTION_STUDIO_DIR,
            shell: true,
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
            fs.unlinkSync(tmpPropsPath);

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
            fs.unlinkSync(tmpPropsPath);
            console.error(`[Remotion CLI Spawn Error] ${err.message}`);
            console.error(`[Remotion CLI Spawn Error] Stack:`, err.stack);
            reject(new Error(`Failed to spawn: ${err.message}`));
        });
    });
}
