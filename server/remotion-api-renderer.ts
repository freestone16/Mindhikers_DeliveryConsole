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
            '--frame=75',
            `--props=${tmpPropsPath}`
        ];

        console.log(`[Remotion CLI] Running in ${REMOTION_STUDIO_DIR}`);

        const proc = spawn(remotionBin, args, {
            cwd: REMOTION_STUDIO_DIR,
            shell: true,
            env: { ...process.env, NODE_ENV: 'production' }
        });

        let stderr = '';

        proc.stdout.on('data', (data) => {
            console.log(`[Remotion] ${data.toString().trim()}`);
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            fs.unlinkSync(tmpPropsPath);

            if (code !== 0) {
                reject(new Error(`Remotion exited with code ${code}: ${stderr}`));
                return;
            }

            if (!fs.existsSync(outputPath)) {
                reject(new Error(`Render completed but file not found`));
                return;
            }

            const stats = fs.statSync(outputPath);
            console.log(`[Remotion CLI] Success: ${outputPath} (${stats.size} bytes)`);
            resolve({ success: true, outputPath, size: stats.size });
        });

        proc.on('error', (err) => {
            fs.unlinkSync(tmpPropsPath);
            reject(new Error(`Failed to spawn: ${err.message}`));
        });
    });
}
