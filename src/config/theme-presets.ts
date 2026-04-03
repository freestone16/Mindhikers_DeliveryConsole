/**
 * Theme Presets - 各模块的预设配色方案
 *
 * ThemeColors 定义 11 个 CSS 变量。
 * TextureConfig 控制背景 SVG 纹理（图案/透明度/缩放）。
 */

// ─── Texture Types ─────────────────────────────────────────────────────────────

export type TexturePattern =
    | 'diamond'
    | 'triangles'
    | 'dots'
    | 'hexagons'
    | 'diagonal'
    | 'grid'
    | 'waves'
    | 'linen'
    | 'circuit'
    | 'none';

export interface TextureConfig {
    pattern: TexturePattern;
    /** 0.01 – 0.20，纹理叠加透明度 */
    opacity: number;
    /** 0.5 – 3.0，tile 尺寸倍率 */
    scale: number;
}

// ─── Color Types ───────────────────────────────────────────────────────────────

export interface ThemeColors {
    module: string;
    moduleLight: string;
    moduleMid: string;
    moduleSecondary: string;
    bg: string;
    surface: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    surfaceAlt: string;
}

export interface ThemePreset {
    id: string;
    name: string;
    nameZh: string;
    colors: ThemeColors;
    texture: TextureConfig;
}

export const THEME_PRESETS: ThemePreset[] = [
    {
        id: 'cyberpunk',
        name: 'Neon Cyberpunk',
        nameZh: '霓虹赛博',
        colors: {
            module: '#00E5FF',
            moduleLight: '#66F0FF',
            moduleMid: '#00B8CC',
            moduleSecondary: '#FF007F',
            bg: '#09090E',
            surface: '#151522',
            surfaceAlt: '#1E1E2E',
            text: '#E0F8FF',
            textSecondary: '#7CB8CC',
            textMuted: '#4A7A88',
            border: '#1E253A',
        },
        texture: { pattern: 'circuit', opacity: 0.06, scale: 1 },
    },
    {
        id: 'aurora',
        name: 'Aurora Forest',
        nameZh: '极光深林',
        colors: {
            module: '#10B981',
            moduleLight: '#34D399',
            moduleMid: '#059669',
            moduleSecondary: '#A3E635',
            bg: '#0B1210',
            surface: '#13251F',
            surfaceAlt: '#1A3028',
            text: '#D4EDDA',
            textSecondary: '#7EC4A0',
            textMuted: '#4A8A68',
            border: '#1A4030',
        },
        texture: { pattern: 'hexagons', opacity: 0.07, scale: 1.2 },
    },
    {
        id: 'sunrise',
        name: 'Sunrise Dawn',
        nameZh: '日出晨曦',
        colors: {
            module: '#FF5A1F',
            moduleLight: '#FF7A45',
            moduleMid: '#E84B12',
            moduleSecondary: '#3B82F6',
            bg: '#F3F4F6',
            surface: '#FFFFFF',
            surfaceAlt: '#E8E9EC',
            text: '#111827',
            textSecondary: '#374151',
            textMuted: '#6B7280',
            border: '#D1D5DB',
        },
        texture: { pattern: 'dots', opacity: 0.08, scale: 1 },
    },
    {
        id: 'deep-sea',
        name: 'Deep Sea Flare',
        nameZh: '深海耀斑',
        colors: {
            module: '#38BDF8',
            moduleLight: '#7DD3FC',
            moduleMid: '#0284C7',
            moduleSecondary: '#FBBF24',
            bg: '#030B16',
            surface: '#0D1B2A',
            surfaceAlt: '#122338',
            text: '#E0F2FE',
            textSecondary: '#7ABCD8',
            textMuted: '#4A7A9A',
            border: '#0E2840',
        },
        texture: { pattern: 'waves', opacity: 0.06, scale: 1.5 },
    },
    {
        id: 'miami',
        name: 'Retro Miami',
        nameZh: '复古迈阿密',
        colors: {
            module: '#A855F7',
            moduleLight: '#C084FC',
            moduleMid: '#9333EA',
            moduleSecondary: '#F43F5E',
            bg: '#1A1025',
            surface: '#2A1B38',
            surfaceAlt: '#361E4A',
            text: '#F0E8F8',
            textSecondary: '#C0A0E0',
            textMuted: '#8060A8',
            border: '#3D1F5A',
        },
        texture: { pattern: 'diagonal', opacity: 0.07, scale: 1 },
    },
    {
        id: 'magma',
        name: 'Magma Rock',
        nameZh: '赤热熔岩',
        colors: {
            module: '#EF4444',
            moduleLight: '#F87171',
            moduleMid: '#DC2626',
            moduleSecondary: '#F97316',
            bg: '#170A08',
            surface: '#24110E',
            surfaceAlt: '#321510',
            text: '#FEE2E2',
            textSecondary: '#D08080',
            textMuted: '#9A5050',
            border: '#3D1010',
        },
        texture: { pattern: 'triangles', opacity: 0.05, scale: 1 },
    },
    {
        id: 'mono',
        name: 'Monochrome Focus',
        nameZh: '极简高反差',
        colors: {
            module: '#EAB308',
            moduleLight: '#FDE047',
            moduleMid: '#CA8A04',
            moduleSecondary: '#FAFAFA',
            bg: '#000000',
            surface: '#171717',
            surfaceAlt: '#262626',
            text: '#FAFAFA',
            textSecondary: '#D4D4D4',
            textMuted: '#A3A3A3',
            border: '#2A2A2A',
        },
        texture: { pattern: 'grid', opacity: 0.06, scale: 1 },
    },
    {
        id: 'crucible',
        name: 'Golden Crucible',
        nameZh: '坩埚暖白',
        colors: {
            module: '#92400e',
            moduleLight: '#b45309',
            moduleMid: '#78350f',
            moduleSecondary: '#d97706',
            bg: '#faf6f0',
            surface: '#ffffff',
            surfaceAlt: '#f0ebe2',
            text: '#1c1309',
            textSecondary: '#4a3728',
            textMuted: '#8a6a52',
            border: '#e0d5c5',
        },
        texture: { pattern: 'linen', opacity: 0.04, scale: 1 },
    },
    {
        id: 'nebula',
        name: 'Nebula Holographic',
        nameZh: '星云全息',
        colors: {
            module: '#D946EF',
            moduleLight: '#E879F9',
            moduleMid: '#C026D3',
            moduleSecondary: '#6366F1',
            bg: '#0F172A',
            surface: '#1E293B',
            surfaceAlt: '#263548',
            text: '#F0E8FF',
            textSecondary: '#B088D8',
            textMuted: '#7060A8',
            border: '#2A2050',
        },
        texture: { pattern: 'diamond', opacity: 0.06, scale: 1 },
    },
];

// ─── Module Definitions ───────────────────────────────────────────────────────

export type ModuleId =
    | 'crucible'
    | 'delivery'
    | 'distribution'
    | 'director'
    | 'shorts'
    | 'marketing'
    | 'thumbnail'
    | 'music';

export interface ModuleMeta {
    name: string;
    nameZh: string;
    group: 'primary' | 'expert' | 'distribution';
    emoji: string;
}

export const MODULE_LABELS: Record<ModuleId, ModuleMeta> = {
    crucible:     { name: 'Golden Crucible',       nameZh: '黄金坩埚',   group: 'primary',      emoji: '🔥' },
    director:     { name: 'Director',              nameZh: '影视导演',   group: 'expert',       emoji: '🎬' },
    thumbnail:    { name: 'Thumbnail Master',       nameZh: '缩略图大师', group: 'expert',       emoji: '🖼️' },
    music:        { name: 'Music Director',         nameZh: '音乐总监',   group: 'expert',       emoji: '🎵' },
    shorts:       { name: 'Shorts Master',          nameZh: '短视频大师', group: 'expert',       emoji: '📱' },
    marketing:    { name: 'Marketing Master',       nameZh: '营销大师',   group: 'expert',       emoji: '📈' },
    delivery:     { name: 'Delivery Terminal',      nameZh: '交付终端',   group: 'primary',      emoji: '🏭' },
    distribution: { name: 'Distribution Terminal',  nameZh: '分发终端',   group: 'distribution', emoji: '📡' },
};

export const MODULE_GROUPS: { label: string; ids: ModuleId[] }[] = [
    { label: '主模块', ids: ['crucible', 'delivery', 'distribution'] },
    { label: '交付专家', ids: ['director', 'thumbnail', 'music', 'shorts', 'marketing'] },
];

export const DEFAULT_MODULE_THEMES: Record<ModuleId, string> = {
    crucible:     'crucible',
    delivery:     'nebula',
    distribution: 'cyberpunk',
    director:     'deep-sea',
    thumbnail:    'magma',
    music:        'aurora',
    shorts:       'miami',
    marketing:    'mono',
};

export function getPresetById(id: string): ThemePreset | undefined {
    return THEME_PRESETS.find((p) => p.id === id);
}
