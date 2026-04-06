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
            module: '#059669',
            moduleLight: '#10B981',
            moduleMid: '#047857',
            moduleSecondary: '#84CC16',
            bg: '#F0FBF5',
            surface: '#FFFFFF',
            surfaceAlt: '#E6F7EF',
            text: '#064E3B',
            textSecondary: '#065F46',
            textMuted: '#6B9E82',
            border: '#C6E6D5',
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
            module: '#0284C7',
            moduleLight: '#38BDF8',
            moduleMid: '#0369A1',
            moduleSecondary: '#F59E0B',
            bg: '#EFF8FF',
            surface: '#FFFFFF',
            surfaceAlt: '#DDEFFE',
            text: '#0C2A3D',
            textSecondary: '#1E4A6B',
            textMuted: '#6896B4',
            border: '#BAD9EE',
        },
        texture: { pattern: 'waves', opacity: 0.06, scale: 1.5 },
    },
    {
        id: 'miami',
        name: 'Retro Miami',
        nameZh: '复古迈阿密',
        colors: {
            module: '#9333EA',
            moduleLight: '#A855F7',
            moduleMid: '#7E22CE',
            moduleSecondary: '#F43F5E',
            bg: '#FAF5FF',
            surface: '#FFFFFF',
            surfaceAlt: '#F3E8FF',
            text: '#2E1065',
            textSecondary: '#4C1D95',
            textMuted: '#8B6EAC',
            border: '#E9D5FF',
        },
        texture: { pattern: 'diagonal', opacity: 0.07, scale: 1 },
    },
    {
        id: 'magma',
        name: 'Magma Rock',
        nameZh: '赤热熔岩',
        colors: {
            module: '#DC2626',
            moduleLight: '#EF4444',
            moduleMid: '#B91C1C',
            moduleSecondary: '#EA580C',
            bg: '#FFF5F5',
            surface: '#FFFFFF',
            surfaceAlt: '#FEE8E8',
            text: '#3B0B0B',
            textSecondary: '#7F1D1D',
            textMuted: '#B46060',
            border: '#F8CACA',
        },
        texture: { pattern: 'triangles', opacity: 0.05, scale: 1 },
    },
    {
        id: 'mono',
        name: 'Monochrome Focus',
        nameZh: '极简高反差',
        colors: {
            module: '#CA8A04',
            moduleLight: '#EAB308',
            moduleMid: '#A16207',
            moduleSecondary: '#374151',
            bg: '#FAFAFA',
            surface: '#FFFFFF',
            surfaceAlt: '#F3F4F6',
            text: '#111827',
            textSecondary: '#374151',
            textMuted: '#9CA3AF',
            border: '#E5E7EB',
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
