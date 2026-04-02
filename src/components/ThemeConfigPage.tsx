import { useState } from 'react';
import { ArrowLeft, Check, Palette, RotateCcw } from 'lucide-react';
import { useTheme, applyThemeToElement } from '../hooks/useTheme';
import {
    THEME_PRESETS,
    MODULE_LABELS,
    MODULE_GROUPS,
    DEFAULT_MODULE_THEMES,
    getPresetById,
    type ModuleId,
    type ThemeColors,
} from '../config/theme-presets';
import { useEffect, useRef } from 'react';

interface ThemeConfigPageProps {
    onClose: () => void;
}

export const ThemeConfigPage = ({ onClose }: ThemeConfigPageProps) => {
    const { themeState, setModuleTheme, getModuleColors } = useTheme();
    const [activeModule, setActiveModule] = useState<ModuleId>('distribution');
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customColors, setCustomColors] = useState<ThemeColors>(() => getModuleColors(activeModule));
    const [saved, setSaved] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const currentConfig = themeState[activeModule];

    const previewColors = isCustomMode ? customColors : getModuleColors(activeModule);

    // Apply CSS vars to wrapper so var(--color-*) works in children
    useEffect(() => {
        if (wrapperRef.current) {
            applyThemeToElement(wrapperRef.current, previewColors);
        }
    }, [previewColors]);

    const handleModuleSwitch = (moduleId: ModuleId) => {
        setActiveModule(moduleId);
        setIsCustomMode(!!themeState[moduleId].custom);
        setCustomColors(getModuleColors(moduleId));
    };

    const handlePresetSelect = (presetId: string) => {
        setIsCustomMode(false);
        setModuleTheme(activeModule, presetId);
        const preset = getPresetById(presetId);
        if (preset) {
            setCustomColors(preset.colors);
        }
        flashSaved();
    };

    const handleCustomColorChange = (key: keyof ThemeColors, value: string) => {
        const next = { ...customColors, [key]: value };
        setCustomColors(next);
        setIsCustomMode(true);
        setModuleTheme(activeModule, currentConfig.presetId, next);
    };

    const handleEnterCustom = () => {
        setIsCustomMode(true);
        setModuleTheme(activeModule, currentConfig.presetId, customColors);
    };

    const handleReset = () => {
        const defaultPresetId = DEFAULT_MODULE_THEMES[activeModule];
        setIsCustomMode(false);
        setModuleTheme(activeModule, defaultPresetId);
        const preset = getPresetById(defaultPresetId);
        if (preset) {
            setCustomColors(preset.colors);
        }
        flashSaved();
    };

    const flashSaved = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    };

    const colorFields: { key: keyof ThemeColors; label: string; desc: string }[] = [
        { key: 'module', label: '主色调', desc: '按钮、徽章、边框高亮' },
        { key: 'moduleLight', label: '浅色调', desc: '标题文字、图标' },
        { key: 'moduleMid', label: '中间色', desc: '小圆点、次要文字' },
        { key: 'moduleSecondary', label: '辅助色', desc: '渐变终点、双色搭配' },
        { key: 'bg', label: '主背景', desc: '页面整体背景色' },
        { key: 'surface', label: '面板背景', desc: '卡片、面板底色' },
    ];

    const c = previewColors;

    return (
        <div
            ref={wrapperRef}
            className="min-h-screen"
            style={{ backgroundColor: c.bg, color: c.text }}
        >
            {/* Header */}
            <header
                className="border-b backdrop-blur-xl px-6 py-4"
                style={{ backgroundColor: c.surface, borderColor: c.border }}
            >
                <div className="mx-auto flex max-w-5xl items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors"
                            style={{
                                borderColor: c.border,
                                backgroundColor: c.surfaceAlt,
                                color: c.textSecondary,
                            }}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            返回
                        </button>
                        <div className="flex items-center gap-2">
                            <Palette className="h-5 w-5" style={{ color: c.moduleLight }} />
                            <h1 className="text-lg font-bold">Theme Configuration</h1>
                        </div>
                    </div>

                    {saved && (
                        <div
                            className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                            style={{
                                borderColor: `${c.module}50`,
                                backgroundColor: `${c.module}18`,
                                color: c.moduleLight,
                            }}
                        >
                            <Check className="h-4 w-4" />
                            已保存
                        </div>
                    )}
                </div>
            </header>

            <div className="mx-auto max-w-5xl px-6 py-8">
                <div className="mb-8">
                    <p className="text-sm" style={{ color: c.textMuted }}>
                        为每个模块选择预设配色或自定义颜色。修改会实时生效并自动保存到本地。
                    </p>
                </div>

                {/* Module Selector */}
                <div className="mb-8 space-y-4">
                    {MODULE_GROUPS.map((group) => (
                        <div key={group.label}>
                            <div
                                className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
                                style={{ color: c.textMuted }}
                            >
                                {group.label}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {group.ids.map((moduleId) => {
                                    const meta = MODULE_LABELS[moduleId];
                                    const colors = getModuleColors(moduleId);
                                    const isActive = activeModule === moduleId;
                                    return (
                                        <button
                                            key={moduleId}
                                            onClick={() => handleModuleSwitch(moduleId)}
                                            className="rounded-2xl border px-4 py-2.5 text-left transition-all"
                                            style={
                                                isActive
                                                    ? {
                                                          borderColor: `${c.module}60`,
                                                          backgroundColor: `${c.module}18`,
                                                          color: c.text,
                                                      }
                                                    : {
                                                          borderColor: c.border,
                                                          backgroundColor: c.surfaceAlt,
                                                          color: c.textSecondary,
                                                      }
                                            }
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className="h-3.5 w-3.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: colors.module }}
                                                />
                                                <div className="text-xs font-medium whitespace-nowrap">
                                                    {meta.emoji} {meta.nameZh}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="space-y-6">
                        {/* Preset Selector */}
                        <section
                            className="rounded-3xl border p-6"
                            style={{ borderColor: c.border, backgroundColor: c.surface }}
                        >
                            <div className="mb-4 text-sm font-semibold" style={{ color: c.text }}>
                                预设方案
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {THEME_PRESETS.map((preset) => {
                                    const isActive = currentConfig.presetId === preset.id && !isCustomMode;
                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => handlePresetSelect(preset.id)}
                                            className="group rounded-2xl border p-4 text-left transition-all"
                                            style={
                                                isActive
                                                    ? {
                                                          borderColor: `${c.module}60`,
                                                          backgroundColor: `${c.module}18`,
                                                      }
                                                    : {
                                                          borderColor: c.border,
                                                          backgroundColor: c.surfaceAlt,
                                                      }
                                            }
                                        >
                                            <div className="mb-3 flex gap-1.5">
                                                <span
                                                    className="h-5 w-5 rounded-full"
                                                    style={{ backgroundColor: preset.colors.module }}
                                                />
                                                <span
                                                    className="h-5 w-5 rounded-full"
                                                    style={{ backgroundColor: preset.colors.moduleLight }}
                                                />
                                                <span
                                                    className="h-5 w-5 rounded-full"
                                                    style={{ backgroundColor: preset.colors.moduleSecondary }}
                                                />
                                            </div>
                                            {/* Mini bg/surface preview strip */}
                                            <div className="mb-3 flex gap-1 rounded-lg overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
                                                <div
                                                    className="flex-1 h-4"
                                                    style={{ backgroundColor: preset.colors.bg }}
                                                />
                                                <div
                                                    className="flex-1 h-4"
                                                    style={{ backgroundColor: preset.colors.surface }}
                                                />
                                            </div>
                                            <div className="text-sm font-medium" style={{ color: c.text }}>
                                                {preset.nameZh}
                                            </div>
                                            <div className="mt-0.5 text-xs" style={{ color: c.textMuted }}>
                                                {preset.name}
                                            </div>
                                            {isActive && (
                                                <div
                                                    className="mt-2 inline-flex items-center gap-1 text-xs"
                                                    style={{ color: c.moduleLight }}
                                                >
                                                    <Check className="h-3 w-3" />
                                                    当前
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Custom Colors */}
                        <section
                            className="rounded-3xl border p-6"
                            style={{ borderColor: c.border, backgroundColor: c.surface }}
                        >
                            <div className="mb-1 flex items-center justify-between">
                                <div className="text-sm font-semibold" style={{ color: c.text }}>
                                    自定义颜色
                                </div>
                                {!isCustomMode && (
                                    <button
                                        onClick={handleEnterCustom}
                                        className="rounded-xl border px-3 py-1.5 text-xs transition-colors"
                                        style={{
                                            borderColor: c.border,
                                            backgroundColor: c.surfaceAlt,
                                            color: c.textSecondary,
                                        }}
                                    >
                                        开始自定义
                                    </button>
                                )}
                                {isCustomMode && (
                                    <span
                                        className="rounded-full border px-2.5 py-1 text-[11px]"
                                        style={{
                                            borderColor: `${c.module}50`,
                                            backgroundColor: `${c.module}18`,
                                            color: c.moduleLight,
                                        }}
                                    >
                                        自定义模式
                                    </span>
                                )}
                            </div>
                            <p className="mb-4 text-xs" style={{ color: c.textMuted }}>
                                基于当前预设微调颜色，修改后自动切换到自定义模式。
                            </p>

                            <div className="space-y-4">
                                {colorFields.map(({ key, label, desc }) => (
                                    <div key={key} className="flex items-center gap-4">
                                        <input
                                            type="color"
                                            value={customColors[key]}
                                            onChange={(e) => handleCustomColorChange(key, e.target.value)}
                                            className="h-10 w-10 cursor-pointer rounded-xl border bg-transparent p-0.5"
                                            style={{ borderColor: c.border }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium" style={{ color: c.text }}>
                                                {label}
                                            </div>
                                            <div className="text-xs" style={{ color: c.textMuted }}>
                                                {desc}
                                            </div>
                                        </div>
                                        <code
                                            className="rounded-lg border px-2 py-1 text-xs"
                                            style={{
                                                borderColor: c.border,
                                                backgroundColor: c.surfaceAlt,
                                                color: c.textSecondary,
                                            }}
                                        >
                                            {customColors[key]}
                                        </code>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Reset */}
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors"
                            style={{
                                borderColor: c.border,
                                backgroundColor: c.surfaceAlt,
                                color: c.textSecondary,
                            }}
                        >
                            <RotateCcw className="h-4 w-4" />
                            重置 {MODULE_LABELS[activeModule].nameZh} 为默认配色
                        </button>
                    </div>

                    {/* Live Preview */}
                    <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
                        <div
                            className="rounded-3xl border p-6"
                            style={{ borderColor: c.border, backgroundColor: c.surface }}
                        >
                            <div
                                className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em]"
                                style={{ color: c.textMuted }}
                            >
                                Live Preview
                            </div>
                            <PreviewCard colors={c} moduleName={MODULE_LABELS[activeModule].nameZh} />
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

const PreviewCard = ({ colors, moduleName }: { colors: ThemeColors; moduleName: string }) => {
    return (
        <div className="space-y-4">
            {/* Background preview strip */}
            <div className="flex gap-2 rounded-xl overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
                <div
                    className="flex-1 h-8 flex items-center justify-center text-[10px] font-medium"
                    style={{ backgroundColor: colors.bg, color: `${colors.module}cc` }}
                >
                    bg
                </div>
                <div
                    className="flex-1 h-8 flex items-center justify-center text-[10px] font-medium"
                    style={{ backgroundColor: colors.surface, color: `${colors.module}cc` }}
                >
                    surface
                </div>
                <div
                    className="flex-1 h-8 flex items-center justify-center text-[10px] font-medium"
                    style={{ backgroundColor: colors.surfaceAlt, color: `${colors.module}cc` }}
                >
                    alt
                </div>
            </div>

            {/* Hero banner preview */}
            <div
                className="rounded-2xl border p-4"
                style={{
                    borderColor: `${colors.module}26`,
                    background: `linear-gradient(to right, ${colors.module}1a, ${colors.moduleSecondary}0d, transparent)`,
                    backgroundColor: colors.surfaceAlt,
                }}
            >
                <span
                    className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                    style={{
                        borderColor: `${colors.module}4d`,
                        backgroundColor: `${colors.module}1a`,
                        color: colors.moduleLight,
                    }}
                >
                    Module Badge
                </span>
                <div className="mt-2 text-lg font-bold" style={{ color: colors.text }}>
                    {moduleName}
                </div>
                <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                    预览模块的整体视觉效果
                </p>
            </div>

            {/* Button preview */}
            <div className="flex gap-3">
                <button
                    className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110"
                    style={{
                        background: `linear-gradient(to right, ${colors.module}, ${colors.moduleSecondary})`,
                    }}
                >
                    主操作按钮
                </button>
                <button
                    className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
                    style={{
                        borderColor: `${colors.module}40`,
                        backgroundColor: `${colors.module}1a`,
                        color: colors.moduleLight,
                    }}
                >
                    次要按钮
                </button>
            </div>

            {/* Card preview */}
            <div
                className="rounded-2xl border p-4"
                style={{ borderColor: `${colors.module}26`, backgroundColor: colors.surfaceAlt }}
            >
                <div
                    className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: `${colors.moduleLight}cc` }}
                >
                    Section Label
                </div>
                <div className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
                    卡片内容预览区域
                </div>
                <div className="mt-3 flex items-center gap-2">
                    <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: `${colors.moduleMid}cc` }}
                    />
                    <span className="text-xs" style={{ color: colors.textMuted }}>
                        列表项预览
                    </span>
                </div>
            </div>

            {/* Filter chips preview */}
            <div className="flex flex-wrap gap-2">
                <span
                    className="rounded-full border px-3 py-1 text-xs"
                    style={{
                        borderColor: `${colors.module}66`,
                        backgroundColor: `${colors.module}1a`,
                        color: colors.moduleLight,
                    }}
                >
                    选中标签
                </span>
                <span
                    className="rounded-full border px-3 py-1 text-xs"
                    style={{ borderColor: colors.border, backgroundColor: colors.surfaceAlt, color: colors.textMuted }}
                >
                    未选中
                </span>
            </div>
        </div>
    );
};
