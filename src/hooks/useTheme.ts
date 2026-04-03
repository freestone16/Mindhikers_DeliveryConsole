import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { THEME_PRESETS } from '../config/theme-presets';
import {
    DEFAULT_MODULE_THEMES,
    getPresetById,
    type ModuleId,
    type ThemeColors,
    type TextureConfig,
} from '../config/theme-presets';
import { textureToCss } from '../utils/texture';

const STORAGE_KEY = 'mhsdc-theme-config';

export type ModuleThemeConfig = {
    presetId: string;
    custom?: ThemeColors;
    texture?: TextureConfig;
};

type ThemeState = Record<ModuleId, ModuleThemeConfig>;

const INITIAL_STATE: ThemeState = Object.fromEntries(
    (Object.keys(DEFAULT_MODULE_THEMES) as ModuleId[]).map((id) => [
        id,
        { presetId: DEFAULT_MODULE_THEMES[id] },
    ]),
) as ThemeState;

function loadFromStorage(): ThemeState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<ThemeState>;
            // Validate each module: if presetId no longer exists, fall back to default
            const validated = Object.fromEntries(
                (Object.keys(INITIAL_STATE) as ModuleId[]).map((id) => {
                    const saved = parsed[id];
                    if (saved && (saved.custom || getPresetById(saved.presetId))) {
                        return [id, saved];
                    }
                    return [id, INITIAL_STATE[id]];
                }),
            ) as ThemeState;
            return validated;
        }
    } catch {
        // ignore
    }

    return { ...INITIAL_STATE };
}

function saveToStorage(state: ThemeState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getEffectiveColors(config: ModuleThemeConfig): ThemeColors {
    if (config.custom) {
        return config.custom;
    }

    const preset = getPresetById(config.presetId);
    if (preset) {
        return preset.colors;
    }

    return THEME_PRESETS[0].colors;
}

function getEffectiveTexture(config: ModuleThemeConfig): TextureConfig {
    // Explicit override stored in state takes priority
    if (config.texture) {
        return config.texture;
    }
    // Fall back to preset default
    const preset = getPresetById(config.presetId);
    if (preset) {
        return preset.texture;
    }
    return THEME_PRESETS[0].texture;
}

export function applyThemeToElement(element: HTMLElement, colors: ThemeColors) {
    element.style.setProperty('--color-module', colors.module);
    element.style.setProperty('--color-module-light', colors.moduleLight);
    element.style.setProperty('--color-module-mid', colors.moduleMid);
    element.style.setProperty('--color-module-secondary', colors.moduleSecondary);
    element.style.setProperty('--color-bg', colors.bg);
    element.style.setProperty('--color-surface', colors.surface);
    element.style.setProperty('--color-text', colors.text);
    element.style.setProperty('--color-text-secondary', colors.textSecondary);
    element.style.setProperty('--color-text-muted', colors.textMuted);
    element.style.setProperty('--color-border', colors.border);
    element.style.setProperty('--color-surface-alt', colors.surfaceAlt);
}

export function applyTextureToElement(
    element: HTMLElement,
    texture: TextureConfig,
    moduleColor: string,
) {
    const css = textureToCss(texture, moduleColor);
    if (css) {
        element.style.backgroundImage = css.backgroundImage;
        element.style.backgroundSize = css.backgroundSize;
        element.style.backgroundRepeat = 'repeat';
    } else {
        element.style.backgroundImage = '';
        element.style.backgroundSize = '';
        element.style.backgroundRepeat = '';
    }
}

interface ThemeContextValue {
    themeState: ThemeState;
    setModuleTheme: (moduleId: ModuleId, presetId: string, custom?: ThemeColors) => void;
    setModuleTexture: (moduleId: ModuleId, texture: TextureConfig) => void;
    getModuleColors: (moduleId: ModuleId) => ThemeColors;
    getModuleTexture: (moduleId: ModuleId) => TextureConfig;
    getModuleDataTheme: (moduleId: ModuleId) => string;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeProvider() {
    const [themeState, setThemeState] = useState<ThemeState>(loadFromStorage);

    useEffect(() => {
        saveToStorage(themeState);
    }, [themeState]);

    const setModuleTheme = useCallback(
        (moduleId: ModuleId, presetId: string, custom?: ThemeColors) => {
            setThemeState((prev) => ({
                ...prev,
                [moduleId]: { ...prev[moduleId], presetId, custom },
            }));
        },
        [],
    );

    const setModuleTexture = useCallback(
        (moduleId: ModuleId, texture: TextureConfig) => {
            setThemeState((prev) => ({
                ...prev,
                [moduleId]: { ...prev[moduleId], texture },
            }));
        },
        [],
    );

    const getModuleColors = useCallback(
        (moduleId: ModuleId): ThemeColors => {
            return getEffectiveColors(themeState[moduleId]);
        },
        [themeState],
    );

    const getModuleTexture = useCallback(
        (moduleId: ModuleId): TextureConfig => {
            return getEffectiveTexture(themeState[moduleId]);
        },
        [themeState],
    );

    const getModuleDataTheme = useCallback(
        (moduleId: ModuleId): string => {
            return themeState[moduleId].presetId;
        },
        [themeState],
    );

    return { themeState, setModuleTheme, setModuleTexture, getModuleColors, getModuleTexture, getModuleDataTheme };
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within ThemeContext.Provider');
    }

    return ctx;
}
