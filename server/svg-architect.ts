/**
 * svg-architect.ts
 * DC 桥接层：将 Director LLM 输出的 SVG 代码通过 SVG-Architect Python 管线
 * 验证、优化并转换为 PNG 图片，供 Remotion 模板使用。
 *
 * DC 不生成 SVG 内容（纯透传），SVG 来自 Director LLM。
 */
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// SVG-Architect skill 搜索路径：SKILLS_BASE 是 SSOT（rules.md #7：每次调用时读取）
function getSkillSearchPaths(): string[] {
    return [process.env.SKILLS_BASE].filter(Boolean) as string[];
}

// 4K profile 规格（与 platform_profiles.json 同步）
const PROFILES: Record<string, { width: number; height: number; safeArea: { x: number; y: number; w: number; h: number } }> = {
    remotion_bg: { width: 3840, height: 2160, safeArea: { x: 200, y: 120, w: 3440, h: 1920 } },
    remotion_overlay: { width: 3840, height: 2160, safeArea: { x: 200, y: 120, w: 3440, h: 1920 } },
};

/**
 * 定位 svg-architect skill 根目录
 */
function resolveSvgArchitectDir(): string | null {
    for (const base of getSkillSearchPaths()) {
        const dir = path.join(base, 'svg-architect');
        if (fs.existsSync(path.join(dir, 'scripts', 'run_pipeline.py'))) {
            return dir;
        }
    }
    return null;
}

export interface SvgGenerateResult {
    success: boolean;
    pngPath: string;
    svgPath?: string;
    error?: string;
}

/**
 * 将 Director LLM 输出的 SVG 代码通过 SVG-Architect 管线转换为 PNG
 *
 * @param svgCode 完整的 SVG 代码（<svg>...</svg>）
 * @param options 生成选项
 * @returns PNG 文件绝对路径
 */
export async function generateSvgImage(
    svgCode: string,
    options: {
        profile?: 'remotion_bg' | 'remotion_overlay';
        outputDir: string;
        slug: string;
    }
): Promise<SvgGenerateResult> {
    const skillDir = resolveSvgArchitectDir();
    if (!skillDir) {
        return { success: false, pngPath: '', error: 'svg-architect skill not found' };
    }

    const profile = PROFILES[options.profile || 'remotion_bg'];
    const tmpDir = path.join(options.outputDir, 'svg');
    fs.mkdirSync(tmpDir, { recursive: true });

    // 1. 写入临时 SVG 文件
    const slug = options.slug.replace(/[^a-zA-Z0-9_-]/g, '_');
    const tmpSvg = path.join(tmpDir, `${slug}_input.svg`);
    fs.writeFileSync(tmpSvg, svgCode, 'utf-8');

    // 2. 生成 layout_plan.json
    const plan = {
        canvas: {
            viewBox: `0 0 ${profile.width} ${profile.height}`,
            safe_area: { x: profile.safeArea.x, y: profile.safeArea.y, width: profile.safeArea.w, height: profile.safeArea.h },
        },
        metadata: { theme: 'tech-dark', platform: options.profile || 'remotion_bg', language: 'zh' },
        slots: [],
        palette: { background: '#0A0A0B', primary: '#3B82F6', text: '#F8FAFC' },
    };
    const tmpPlan = path.join(tmpDir, `${slug}_plan.json`);
    fs.writeFileSync(tmpPlan, JSON.stringify(plan, null, 2), 'utf-8');

    // 3. 调用 Python 管线
    const pipelineScript = path.join(skillDir, 'scripts', 'run_pipeline.py');
    const args = [
        pipelineScript,
        '--svg', tmpSvg,
        '--plan', tmpPlan,
        '--slug', slug,
        '--export-format', 'all',
        '--output-dir', tmpDir,
        '--max-retries', '2',
    ];

    try {
        console.log(`[SVG-Architect] ▶ Pipeline: ${slug}`);
        const { stdout, stderr } = await execFileAsync('python3', args, {
            timeout: 30_000,
            env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
        });

        // 4. 解析输出
        const lines = stdout.split('\n');
        const pngLine = lines.find(l => l.startsWith('png_abs_path:'));
        const svgLine = lines.find(l => l.startsWith('svg_abs_path:'));
        const statusLine = lines.find(l => l.startsWith('status:'));
        const status = statusLine?.replace('status:', '').trim();

        if (status === 'SUCCESS' && pngLine) {
            const pngPath = pngLine.replace('png_abs_path:', '').trim();
            const svgPath = svgLine?.replace('svg_abs_path:', '').trim();
            console.log(`[SVG-Architect] ✅ PNG generated: ${pngPath}`);
            return { success: true, pngPath, svgPath };
        }

        // PARTIAL_SUCCESS: SVG ok but PNG failed — try direct cairosvg fallback
        if (status === 'PARTIAL_SUCCESS' && svgLine) {
            const svgPath = svgLine.replace('svg_abs_path:', '').trim();
            const fallbackPng = await fallbackSvgToPng(svgPath, tmpDir, slug, profile.width);
            if (fallbackPng) {
                return { success: true, pngPath: fallbackPng, svgPath };
            }
        }

        const reason = lines.find(l => l.startsWith('reason:'))?.replace('reason:', '').trim();
        console.warn(`[SVG-Architect] ⚠️ Pipeline ${status}: ${reason || stderr}`);
        return { success: false, pngPath: '', error: reason || `Pipeline status: ${status}` };

    } catch (err: any) {
        console.error(`[SVG-Architect] ❌ Pipeline failed: ${err.message}`);
        return { success: false, pngPath: '', error: err.message };
    } finally {
        // 清理临时 plan 文件
        try { fs.unlinkSync(tmpPlan); } catch { /* ignore */ }
    }
}

/**
 * 如果 Python 管线的 PNG 转换失败，尝试直接用 cairosvg/resvg 转换
 */
async function fallbackSvgToPng(svgPath: string, outputDir: string, slug: string, width: number): Promise<string | null> {
    const pngPath = path.join(outputDir, `${slug}_fallback.png`);

    // 尝试 cairosvg
    try {
        await execFileAsync('cairosvg', [svgPath, '-o', pngPath, '-W', String(width)], { timeout: 15_000 });
        if (fs.existsSync(pngPath)) {
            console.log(`[SVG-Architect] ✅ Fallback PNG (cairosvg): ${pngPath}`);
            return pngPath;
        }
    } catch { /* cairosvg not available */ }

    // 尝试 resvg
    try {
        await execFileAsync('resvg', [svgPath, pngPath, '-w', String(width)], { timeout: 15_000 });
        if (fs.existsSync(pngPath)) {
            console.log(`[SVG-Architect] ✅ Fallback PNG (resvg): ${pngPath}`);
            return pngPath;
        }
    } catch { /* resvg not available */ }

    return null;
}
