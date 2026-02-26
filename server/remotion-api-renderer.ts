import path from 'path';
import os from 'os';
import fs from 'fs';

const REMOTION_STUDIO_DIR = process.env.REMOTION_STUDIO_DIR ||
    path.join(os.homedir(), '.gemini/antigravity/skills/RemotionStudio');

/**
 * 直接调用 Remotion Node API 进行渲染，绕过 npx CLI 的端口绑定限制 (EPERM)
 */
export async function renderStillWithApi(
    compositionId: string,
    outputPath: string,
    inputProps: any
) {
    try {
        // 动态加载 Remotion 渲染器 (从 Studio 目录的 node_modules 中读取)
        const rendererPath = path.join(REMOTION_STUDIO_DIR, 'node_modules/@remotion/renderer');
        const bundlerPath = path.join(REMOTION_STUDIO_DIR, 'node_modules/@remotion/bundler');

        if (!fs.existsSync(rendererPath) || !fs.existsSync(bundlerPath)) {
            throw new Error('Remotion dependencies not found in Studio directory');
        }

        // 动态 require
        const { renderStill, getCompositions } = require(rendererPath);
        const { bundle } = require(bundlerPath);

        console.log(`[Remotion API] Bundling ${REMOTION_STUDIO_DIR}...`);
        const bundleLocation = await bundle({
            entryPoint: path.join(REMOTION_STUDIO_DIR, 'src/index.tsx'),
        });

        console.log(`[Remotion API] Fetching compositions...`);
        const comps = await getCompositions(bundleLocation, { inputProps });
        const composition = comps.find((c: any) => c.id === compositionId);

        if (!composition) {
            throw new Error(`Composition ${compositionId} not found`);
        }

        console.log(`[Remotion API] Rendering still to ${outputPath}...`);
        await renderStill({
            composition,
            outputLocation: outputPath,
            serveUrl: bundleLocation,
            frame: 0,
            inputProps,
            imageFormat: 'png',
        });

        return { success: true, outputPath };
    } catch (error: any) {
        console.error('[Remotion API Error]', error);
        throw error;
    }
}
