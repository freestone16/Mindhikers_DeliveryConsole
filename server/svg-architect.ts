/**
 * svg-architect.ts
 * DC 桥接层：将 Director LLM 输出的 SVG 代码通过 SVG-Architect Python 管线
 * 验证、优化并转换为 PNG 图片，供 Remotion 模板使用。
 *
 * DC 不生成 SVG 内容（纯透传），SVG 来自 Director LLM。
 */
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const SKILL_SEARCH_PATHS = [
  process.env.SKILLS_BASE,
  path.join(os.homedir(), '.gemini/antigravity/skills'),
];

const PROFILES: Record<string, { width: number; height: number; safeArea: { x: number; y: number; w: number; h: number } }> = {
  remotion_bg: { width: 3840, height: 2160, safeArea: { x: 200, y: 120, w: 3440, h: 1920 } },
  remotion_overlay: { width: 3840, height: 2160, safeArea: { x: 200, y: 120, w: 3440, h: 1920 } },
};

function resolveSvgArchitectDir(): string | null {
  for (const base of SKILL_SEARCH_PATHS) {
    if (!base) {
      continue;
    }

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

  const slug = options.slug.replace(/[^a-zA-Z0-9_-]/g, '_');
  const tmpSvg = path.join(tmpDir, `${slug}_input.svg`);
  fs.writeFileSync(tmpSvg, svgCode, 'utf-8');

  const tmpPlan = path.join(tmpDir, `${slug}_plan.json`);
  const plan = {
    canvas: {
      viewBox: `0 0 ${profile.width} ${profile.height}`,
      safe_area: {
        x: profile.safeArea.x,
        y: profile.safeArea.y,
        width: profile.safeArea.w,
        height: profile.safeArea.h,
      },
    },
    metadata: {
      theme: 'tech-dark',
      platform: options.profile || 'remotion_bg',
      language: 'zh',
    },
    slots: [],
    palette: {
      background: '#0A0A0B',
      primary: '#3B82F6',
      text: '#F8FAFC',
    },
  };
  fs.writeFileSync(tmpPlan, JSON.stringify(plan, null, 2), 'utf-8');

  const pipelineScript = path.join(skillDir, 'scripts', 'run_pipeline.py');
  const args = [
    pipelineScript,
    '--svg',
    tmpSvg,
    '--plan',
    tmpPlan,
    '--slug',
    slug,
    '--export-format',
    'all',
    '--output-dir',
    tmpDir,
    '--max-retries',
    '2',
  ];

  try {
    console.log(`[SVG-Architect] ▶ Pipeline: ${slug}`);
    const { stdout, stderr } = await execFileAsync('python3', args, {
      timeout: 30_000,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    });

    const lines = stdout.split('\n');
    const pngLine = lines.find((line) => line.startsWith('png_abs_path:'));
    const svgLine = lines.find((line) => line.startsWith('svg_abs_path:'));
    const statusLine = lines.find((line) => line.startsWith('status:'));
    const status = statusLine?.replace('status:', '').trim();

    if (status === 'SUCCESS' && pngLine) {
      const pngPath = pngLine.replace('png_abs_path:', '').trim();
      const svgPath = svgLine?.replace('svg_abs_path:', '').trim();
      console.log(`[SVG-Architect] ✅ PNG generated: ${pngPath}`);
      return { success: true, pngPath, svgPath };
    }

    if (status === 'PARTIAL_SUCCESS' && svgLine) {
      const svgPath = svgLine.replace('svg_abs_path:', '').trim();
      const fallbackPng = await fallbackSvgToPng(svgPath, tmpDir, slug, profile.width);
      if (fallbackPng) {
        return { success: true, pngPath: fallbackPng, svgPath };
      }
    }

    const reason = lines.find((line) => line.startsWith('reason:'))?.replace('reason:', '').trim();
    console.warn(`[SVG-Architect] ⚠️ Pipeline ${status}: ${reason || stderr}`);
    return { success: false, pngPath: '', error: reason || `Pipeline status: ${status}` };
  } catch (error: any) {
    console.error(`[SVG-Architect] ❌ Pipeline failed: ${error.message}`);
    return { success: false, pngPath: '', error: error.message };
  } finally {
    try {
      fs.unlinkSync(tmpPlan);
    } catch {
      // ignore temp cleanup failure
    }
  }
}

async function fallbackSvgToPng(
  svgPath: string,
  outputDir: string,
  slug: string,
  width: number
): Promise<string | null> {
  const pngPath = path.join(outputDir, `${slug}_fallback.png`);

  try {
    await execFileAsync('cairosvg', [svgPath, '-o', pngPath, '-W', String(width)], { timeout: 15_000 });
    if (fs.existsSync(pngPath)) {
      console.log(`[SVG-Architect] ✅ Fallback PNG (cairosvg): ${pngPath}`);
      return pngPath;
    }
  } catch {
    // cairosvg not available
  }

  try {
    await execFileAsync('resvg', [svgPath, pngPath, '-w', String(width)], { timeout: 15_000 });
    if (fs.existsSync(pngPath)) {
      console.log(`[SVG-Architect] ✅ Fallback PNG (resvg): ${pngPath}`);
      return pngPath;
    }
  } catch {
    // resvg not available
  }

  return null;
}
