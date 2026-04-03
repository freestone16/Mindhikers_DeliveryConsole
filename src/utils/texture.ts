/**
 * texture.ts — SVG 纹理背景生成器
 *
 * 每种图案都是纯 SVG inline data URI，零 HTTP 请求，< 1KB。
 * 颜色取自主题的 module 色，在极低透明度下叠加到背景。
 *
 * 编码规则：SVG 属性值全部用单引号，# → %23，< → %3C，> → %3E。
 * 这样可以安全地放进 CSS url("...") 里而不需要 base64。
 */

import type { TextureConfig, TexturePattern } from '../config/theme-presets';

export const TEXTURE_LABELS: Record<TexturePattern, string> = {
    diamond:   '菱形网格',
    triangles: '三角低多边形',
    dots:      '点阵',
    hexagons:  '六边形',
    diagonal:  '斜线',
    grid:      '细网格',
    waves:     '波浪线',
    linen:     '麻布纹',
    circuit:   '电路板',
    none:      '无纹理',
};

/** Encode a hex color for safe use inside a data URI SVG attribute */
function ec(hex: string): string {
    return hex.replace('#', '%23');
}

function r2(n: number): number {
    return Math.round(n * 100) / 100;
}

/** Encode a raw SVG string for safe embedding in CSS url("...") */
function encodeSvg(svg: string): string {
    return svg
        .replace(/</g, '%3C')
        .replace(/>/g, '%3E')
        .replace(/"/g, "'")   // swap remaining double-quotes to single-quotes
        .replace(/#/g, '%23');
}

type SvgResult = { svg: string; tileW: number; tileH: number };

function buildSvg(
    pattern: TexturePattern,
    moduleColor: string,
    opacity: number,
): SvgResult | null {
    const c = ec(moduleColor);
    const op = r2(opacity);

    switch (pattern) {
        case 'diamond': {
            const w = 40, h = 40;
            return {
                svg: `<svg width='${w}' height='${h}' xmlns='http://www.w3.org/2000/svg'><polygon points='20,2 38,20 20,38 2,20' fill='none' stroke='${c}' stroke-width='0.8' stroke-opacity='${op}'/></svg>`,
                tileW: w, tileH: h,
            };
        }
        case 'triangles': {
            const w = 60, h = 52;
            return {
                svg: `<svg width='${w}' height='${h}' xmlns='http://www.w3.org/2000/svg'><polygon points='30,0 60,52 0,52' fill='${c}' fill-opacity='${r2(op * 0.7)}'/><polygon points='0,0 60,0 30,52' fill='${c}' fill-opacity='${r2(op * 0.35)}'/></svg>`,
                tileW: w, tileH: h,
            };
        }
        case 'dots': {
            const w = 24, h = 24;
            return {
                svg: `<svg width='${w}' height='${h}' xmlns='http://www.w3.org/2000/svg'><circle cx='12' cy='12' r='1.5' fill='${c}' fill-opacity='${op}'/></svg>`,
                tileW: w, tileH: h,
            };
        }
        case 'hexagons': {
            const w = 28, h = 32;
            return {
                svg: `<svg width='${w}' height='${h}' xmlns='http://www.w3.org/2000/svg'><polygon points='14,1 27,8 27,24 14,31 1,24 1,8' fill='none' stroke='${c}' stroke-width='0.7' stroke-opacity='${op}'/></svg>`,
                tileW: w, tileH: h,
            };
        }
        case 'diagonal': {
            const w = 20, h = 20;
            return {
                svg: `<svg width='${w}' height='${h}' xmlns='http://www.w3.org/2000/svg'><line x1='0' y1='${h}' x2='${w}' y2='0' stroke='${c}' stroke-width='0.8' stroke-opacity='${op}'/></svg>`,
                tileW: w, tileH: h,
            };
        }
        case 'grid': {
            const w = 20, h = 20;
            return {
                svg: `<svg width='${w}' height='${h}' xmlns='http://www.w3.org/2000/svg'><path d='M ${w} 0 L 0 0 0 ${h}' fill='none' stroke='${c}' stroke-width='0.5' stroke-opacity='${op}'/></svg>`,
                tileW: w, tileH: h,
            };
        }
        case 'waves': {
            const w = 60, h = 20;
            return {
                svg: `<svg width='${w}' height='${h}' xmlns='http://www.w3.org/2000/svg'><path d='M0 10 Q15 2 30 10 Q45 18 60 10' fill='none' stroke='${c}' stroke-width='0.8' stroke-opacity='${op}'/></svg>`,
                tileW: w, tileH: h,
            };
        }
        case 'linen': {
            // feTurbulence grain — filter id uses %23 to ref itself inside SVG
            const w = 200, h = 200;
            return {
                svg: `<svg width='${w}' height='${h}' xmlns='http://www.w3.org/2000/svg'><filter id='ln'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='${w}' height='${h}' filter='url(%23ln)' opacity='${op}' fill='${c}'/></svg>`,
                tileW: w, tileH: h,
            };
        }
        case 'circuit': {
            const w = 60, h = 60;
            return {
                svg: `<svg width='${w}' height='${h}' xmlns='http://www.w3.org/2000/svg'><path d='M10 0 L10 20 L30 20 L30 10 L50 10 M50 30 L40 30 L40 50 L20 50 M0 40 L20 40' fill='none' stroke='${c}' stroke-width='0.7' stroke-opacity='${op}'/><circle cx='10' cy='20' r='1.5' fill='${c}' fill-opacity='${op}'/><circle cx='30' cy='20' r='1.5' fill='${c}' fill-opacity='${op}'/><circle cx='40' cy='30' r='1.5' fill='${c}' fill-opacity='${op}'/></svg>`,
                tileW: w, tileH: h,
            };
        }
        default:
            return null;
    }
}

/**
 * 给定主题色 + 纹理配置，返回可直接赋给 element.style 的属性值。
 * 返回 null 表示 pattern === 'none'，调用方应清除相关属性。
 */
export function textureToCss(
    config: TextureConfig,
    moduleColor: string,
): { backgroundImage: string; backgroundSize: string } | null {
    const result = buildSvg(config.pattern, moduleColor, config.opacity);
    if (!result) return null;

    const encoded = `data:image/svg+xml,${encodeSvg(result.svg)}`;
    const w = Math.round(result.tileW * config.scale);
    const h = Math.round(result.tileH * config.scale);

    return {
        backgroundImage: `url("${encoded}")`,
        backgroundSize: `${w}px ${h}px`,
    };
}
