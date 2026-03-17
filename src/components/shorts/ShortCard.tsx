import { useState } from 'react';
import { Upload, Play, Check, RefreshCw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { ShortScript, ShortRenderUnit, ShortBRoll } from '../../types';
import { buildApiUrl } from '../../config/runtime';

interface ShortCardProps {
    projectId: string;
    script?: ShortScript;
    renderUnit: ShortRenderUnit;
    onUpdate: (updates: Partial<ShortRenderUnit>) => void;
}

export const ShortCard = ({ projectId, script, renderUnit, onUpdate }: ShortCardProps) => {
    const [expanded, setExpanded] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isGeneratingBrolls, setIsGeneratingBrolls] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const handleArollUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('videoFile', file);
        formData.append('projectId', projectId);
        formData.append('shortId', renderUnit.id);

        try {
            const response = await fetch(buildApiUrl('/api/shorts/phase3/upload-aroll'), {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            onUpdate({
                aroll: {
                    originalPath: result.originalPath,
                    croppedPath: result.croppedPath,
                    confirmed: false
                }
            });
        } catch (e) {
            console.error('Upload error:', e);
            alert('上传失败');
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmAroll = () => {
        onUpdate({
            aroll: { ...renderUnit.aroll, confirmed: true }
        });
    };

    const handleGenerateBrolls = async () => {
        setIsGeneratingBrolls(true);
        try {
            const response = await fetch(buildApiUrl('/api/shorts/phase3/generate-brolls'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, shortId: renderUnit.id })
            });

            if (!response.ok) throw new Error('Generate brolls failed');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            const brolls: ShortBRoll[] = [];

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const dataStr = line.replace('data: ', '');
                                const jsonData = JSON.parse(dataStr);

                                if (jsonData.type === 'broll') {
                                    brolls.push(jsonData.broll);
                                    onUpdate({ brolls: [...brolls] });
                                }
                            } catch (e) {
                                // Ignore partial JSON
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Generate brolls error:', e);
            alert('B-Roll 生成失败');
        } finally {
            setIsGeneratingBrolls(false);
        }
    };

    const handleTranscribe = async () => {
        if (!renderUnit.aroll.croppedPath) {
            alert('请先上传并确认 A-Roll');
            return;
        }

        setIsTranscribing(true);
        try {
            const response = await fetch(buildApiUrl('/api/shorts/phase3/transcribe'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, shortId: renderUnit.id })
            });

            if (!response.ok) throw new Error('Transcribe failed');

            const result = await response.json();
            onUpdate({
                subtitle: {
                    ...renderUnit.subtitle,
                    segments: result.segments,
                    srtPath: result.srtPath
                }
            });
        } catch (e) {
            console.error('Transcribe error:', e);
            alert('字幕识别失败');
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleConfirmSubtitle = () => {
        onUpdate({
            subtitle: { ...renderUnit.subtitle, confirmed: true }
        });
    };

    const handleRender = async () => {
        onUpdate({ renderStatus: 'rendering' });
        try {
            const response = await fetch(buildApiUrl('/api/shorts/phase3/render'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, shortId: renderUnit.id })
            });

            if (!response.ok) throw new Error('Render failed');

            const result = await response.json();
            onUpdate({
                renderStatus: 'completed',
                outputPaths: result.outputPaths
            });
        } catch (e) {
            console.error('Render error:', e);
            onUpdate({ renderStatus: 'failed' });
            alert('渲染失败');
        }
    };

    const canRender = 
        renderUnit.aroll.confirmed && 
        renderUnit.subtitle.confirmed && 
        renderUnit.renderStatus === 'pending';

    const getStatusColor = () => {
        switch (renderUnit.renderStatus) {
            case 'completed': return 'border-green-500/50';
            case 'rendering': return 'border-yellow-500/50';
            case 'failed': return 'border-red-500/50';
            default: return 'border-slate-700';
        }
    };

    return (
        <div className={`bg-slate-800/50 rounded-lg border ${getStatusColor()} overflow-hidden`}>
            <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/30"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <span className="text-cyan-400 font-medium">#{script?.index || '?'}</span>
                    <span className="text-sm text-slate-300 line-clamp-1 max-w-md">
                        {script?.scriptText?.slice(0, 80)}...
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                        renderUnit.renderStatus === 'completed' ? 'bg-green-500/20 text-green-400' :
                        renderUnit.renderStatus === 'rendering' ? 'bg-yellow-500/20 text-yellow-400' :
                        renderUnit.renderStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-700 text-slate-400'
                    }`}>
                        {renderUnit.renderStatus}
                    </span>
                </div>
                {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {expanded && (
                <div className="p-4 border-t border-slate-700 space-y-4">
                    {/* A-Roll Section */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-slate-300">A-Roll (主视频)</h4>
                        <div className="flex items-center gap-3">
                            {renderUnit.aroll.croppedPath ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-green-400">已裁切</span>
                                    {!renderUnit.aroll.confirmed && (
                                        <button
                                            onClick={handleConfirmAroll}
                                            className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
                                        >
                                            <Check className="w-3 h-3" /> 确认
                                        </button>
                                    )}
                                    {renderUnit.aroll.confirmed && (
                                        <span className="text-xs text-green-400 flex items-center gap-1">
                                            <Check className="w-3 h-3" /> 已确认
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <label className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded cursor-pointer text-sm text-slate-300">
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            上传中...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" />
                                            上传视频
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="video/mp4,video/quicktime"
                                        onChange={handleArollUpload}
                                        className="hidden"
                                        disabled={isUploading}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* B-Roll Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-slate-300">B-Roll ({renderUnit.brolls.length})</h4>
                            <button
                                onClick={handleGenerateBrolls}
                                disabled={isGeneratingBrolls || !renderUnit.aroll.confirmed}
                                className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs text-slate-300 rounded"
                            >
                                {isGeneratingBrolls ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        生成中...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-3 h-3" />
                                        生成 B-Roll
                                    </>
                                )}
                            </button>
                        </div>
                        {renderUnit.brolls.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {renderUnit.brolls.map((broll, i) => (
                                    <div key={broll.id || i} className="bg-slate-900/50 rounded p-2 text-xs">
                                        <div className="text-slate-400">{broll.timeRange}</div>
                                        <div className="text-slate-300 line-clamp-2">{broll.scriptContext}</div>
                                        <div className="text-cyan-400 mt-1">{broll.type}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Subtitle Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-slate-300">
                                字幕 ({renderUnit.subtitle.segments.length} 段)
                            </h4>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleTranscribe}
                                    disabled={isTranscribing || !renderUnit.aroll.confirmed}
                                    className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs text-slate-300 rounded"
                                >
                                    {isTranscribing ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            识别中...
                                        </>
                                    ) : (
                                        'Whisper 识别'
                                    )}
                                </button>
                                {renderUnit.subtitle.segments.length > 0 && !renderUnit.subtitle.confirmed && (
                                    <button
                                        onClick={handleConfirmSubtitle}
                                        className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
                                    >
                                        <Check className="w-3 h-3" /> 确认字幕
                                    </button>
                                )}
                                {renderUnit.subtitle.confirmed && (
                                    <span className="text-xs text-green-400 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> 字幕已确认
                                    </span>
                                )}
                            </div>
                        </div>
                        {renderUnit.subtitle.segments.length > 0 && (
                            <div className="bg-slate-900/50 rounded p-2 max-h-32 overflow-y-auto text-xs space-y-1">
                                {renderUnit.subtitle.segments.map((seg, i) => (
                                    <div key={i} className="flex gap-2">
                                        <span className="text-slate-500 w-16">{seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s</span>
                                        <span className="text-slate-300">{seg.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Render Button */}
                    <div className="pt-2 border-t border-slate-700">
                        <button
                            onClick={handleRender}
                            disabled={!canRender}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                                canRender
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            }`}
                        >
                            {renderUnit.renderStatus === 'rendering' ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    渲染中...
                                </>
                            ) : renderUnit.renderStatus === 'completed' ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    已完成
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    提交渲染
                                </>
                            )}
                        </button>
                        {renderUnit.outputPaths?.finalVideoPath && (
                            <div className="mt-2 text-xs text-green-400">
                                输出: {renderUnit.outputPaths.finalVideoPath}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
