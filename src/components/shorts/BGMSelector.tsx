import { useState, useEffect } from 'react';
import { Music, Upload } from 'lucide-react';

interface BGMSelectorProps {
    projectId: string;
    currentBgm: { source: 'preset' | 'custom'; path?: string; name?: string };
    onBgmChange: (bgm: { source: 'preset' | 'custom'; path?: string; name?: string }) => void;
}

const PRESET_BGMS = [
    { id: 'upbeat-1', name: '轻快节奏 1', path: '/bgm/upbeat-1.mp3' },
    { id: 'upbeat-2', name: '轻快节奏 2', path: '/bgm/upbeat-2.mp3' },
    { id: 'chill-1', name: '舒缓氛围 1', path: '/bgm/chill-1.mp3' },
    { id: 'chill-2', name: '舒缓氛围 2', path: '/bgm/chill-2.mp3' },
    { id: 'dramatic-1', name: '戏剧张力 1', path: '/bgm/dramatic-1.mp3' },
    { id: 'tech-1', name: '科技感 1', path: '/bgm/tech-1.mp3' },
];

export const BGMSelector = ({ projectId, currentBgm, onBgmChange }: BGMSelectorProps) => {
    const [selectedPreset, setSelectedPreset] = useState<string | null>(
        currentBgm.source === 'preset' ? currentBgm.path || null : null
    );
    const [customFileName, setCustomFileName] = useState<string | null>(
        currentBgm.source === 'custom' ? currentBgm.name || null : null
    );

    useEffect(() => {
        if (currentBgm.source === 'preset') {
            setSelectedPreset(currentBgm.path || null);
            setCustomFileName(null);
        } else {
            setSelectedPreset(null);
            setCustomFileName(currentBgm.name || null);
        }
    }, [currentBgm]);

    const handlePresetSelect = (preset: typeof PRESET_BGMS[0]) => {
        setSelectedPreset(preset.path);
        setCustomFileName(null);
        onBgmChange({ source: 'preset', path: preset.path, name: preset.name });
    };

    const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('bgmFile', file);
        formData.append('projectId', projectId);

        try {
            const response = await fetch('/api/shorts/upload-bgm', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                setSelectedPreset(null);
                setCustomFileName(file.name);
                onBgmChange({ source: 'custom', path: result.path, name: file.name });
            }
        } catch (e) {
            console.error('BGM upload error:', e);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-medium text-white">背景音乐</h4>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {PRESET_BGMS.map(preset => (
                    <button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset)}
                        className={`p-2 rounded text-xs text-left transition-colors ${
                            selectedPreset === preset.path
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        {preset.name}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
                <span className="text-xs text-slate-400">或上传自定义:</span>
                <label className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded cursor-pointer text-xs text-slate-300">
                    <Upload className="w-3 h-3" />
                    {customFileName ? customFileName : '选择文件'}
                    <input
                        type="file"
                        accept="audio/mp3,audio/mpeg"
                        className="hidden"
                        onChange={handleCustomUpload}
                    />
                </label>
            </div>
        </div>
    );
};
