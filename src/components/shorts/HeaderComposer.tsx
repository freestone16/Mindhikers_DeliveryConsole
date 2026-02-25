import { useState, useEffect } from 'react';
import { Upload, Image } from 'lucide-react';
import type { HeaderOverlayConfig } from '../../types';

interface HeaderComposerProps {
    projectId: string;
    config: HeaderOverlayConfig;
    onConfigUpdate: (config: HeaderOverlayConfig) => void;
}

export const HeaderComposer = ({ projectId, config, onConfigUpdate }: HeaderComposerProps) => {
    const [localConfig, setLocalConfig] = useState<HeaderOverlayConfig>(config);

    useEffect(() => {
        setLocalConfig(config);
    }, [config]);

    const handleLogoUpload = async (position: 'left' | 'right', file: File) => {
        const formData = new FormData();
        formData.append(position === 'left' ? 'leftLogo' : 'rightLogo', file);
        formData.append('projectId', projectId);
        formData.append('enabled', String(localConfig.enabled));
        formData.append('centerText', localConfig.centerText || '');

        try {
            const response = await fetch('http://localhost:3002/api/shorts/header-config', {
                method: 'PUT',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                onConfigUpdate(result.config);
            }
        } catch (e) {
            console.error('Logo upload error:', e);
        }
    };

    const handleSave = async () => {
        try {
            const response = await fetch('http://localhost:3002/api/shorts/header-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, ...localConfig })
            });

            if (response.ok) {
                const result = await response.json();
                onConfigUpdate(result.config);
            }
        } catch (e) {
            console.error('Save config error:', e);
        }
    };

    return (
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white">页眉编排器</h4>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                        type="checkbox"
                        checked={localConfig.enabled}
                        onChange={(e) => setLocalConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="rounded border-slate-600"
                    />
                    启用页眉
                </label>
            </div>

            {localConfig.enabled && (
                <>
                    <div className="bg-slate-800 rounded-lg p-3 aspect-[13.5/1] flex items-center justify-between relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
                        
                        <div className="relative z-10 flex items-center gap-2">
                            {localConfig.leftLogo ? (
                                <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center">
                                    <Image className="w-6 h-6 text-slate-400" />
                                </div>
                            ) : (
                                <label className="w-10 h-10 bg-slate-700/50 border border-dashed border-slate-600 rounded flex items-center justify-center cursor-pointer hover:bg-slate-600/50">
                                    <Upload className="w-4 h-4 text-slate-400" />
                                    <input
                                        type="file"
                                        accept="image/png"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleLogoUpload('left', file);
                                        }}
                                    />
                                </label>
                            )}
                        </div>

                        <div className="relative z-10 flex-1 text-center">
                            <span style={{
                                fontFamily: localConfig.textFont,
                                color: localConfig.textColor || '#ffffff',
                                fontSize: `${localConfig.textSize || 24}px`
                            }}>
                                {localConfig.centerText || '中间文字'}
                            </span>
                        </div>

                        <div className="relative z-10 flex items-center gap-2">
                            {localConfig.rightLogo ? (
                                <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center">
                                    <Image className="w-6 h-6 text-slate-400" />
                                </div>
                            ) : (
                                <label className="w-10 h-10 bg-slate-700/50 border border-dashed border-slate-600 rounded flex items-center justify-center cursor-pointer hover:bg-slate-600/50">
                                    <Upload className="w-4 h-4 text-slate-400" />
                                    <input
                                        type="file"
                                        accept="image/png"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleLogoUpload('right', file);
                                        }}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">中间文字</label>
                            <input
                                type="text"
                                value={localConfig.centerText || ''}
                                onChange={(e) => setLocalConfig(prev => ({ ...prev, centerText: e.target.value }))}
                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">文字颜色</label>
                            <input
                                type="color"
                                value={localConfig.textColor || '#ffffff'}
                                onChange={(e) => setLocalConfig(prev => ({ ...prev, textColor: e.target.value }))}
                                className="w-full h-8 bg-slate-800 border border-slate-600 rounded cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">背景色</label>
                            <input
                                type="color"
                                value={localConfig.bgColor?.replace(/rgba?\([^)]+\)/, '#000000') || '#000000'}
                                onChange={(e) => setLocalConfig(prev => ({ ...prev, bgColor: e.target.value }))}
                                className="w-full h-8 bg-slate-800 border border-slate-600 rounded cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg"
                        >
                            保存配置
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
