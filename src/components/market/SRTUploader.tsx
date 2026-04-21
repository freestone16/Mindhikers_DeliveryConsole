/**
 * SRTUploader.tsx — Sprint 4: SRT 字幕文件上传
 *
 * 功能：
 * - 拖拽或点击上传 .srt 文件
 * - POST /api/market/v3/upload-srt 解析章节
 * - 显示解析出的章节列表
 * - 可清除
 */
import React, { useRef, useState } from 'react';
import { FileText, Upload, X, CheckCircle2, Loader2 } from 'lucide-react';
import type { SRTChapter } from '../../types';

interface SRTUploaderProps {
    projectId: string;
    chapters: SRTChapter[];
    onChaptersLoaded: (chapters: SRTChapter[], timeline: string) => void;
}

export const SRTUploader: React.FC<SRTUploaderProps> = ({
    projectId: _projectId,
    chapters,
    onChaptersLoaded,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filename, setFilename] = useState<string | null>(null);

    const handleFile = async (file: File) => {
        if (!file.name.endsWith('.srt')) {
            setError('请上传 .srt 格式的字幕文件');
            return;
        }
        setError(null);
        setIsUploading(true);
        setFilename(file.name);

        try {
            const formData = new FormData();
            formData.append('srt', file);

            const res = await fetch('/api/market/v3/upload-srt', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error(`上传失败 (${res.status})`);
            const data = await res.json();
            onChaptersLoaded(data.chapters || [], data.timeline || '');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleClear = () => {
        setFilename(null);
        setError(null);
        onChaptersLoaded([], '');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const hasChapters = chapters.length > 0;

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-300">SRT 字幕上传</span>
                <span className="text-xs text-slate-500 ml-1">（可选 — 自动填充章节时间轴）</span>
                {hasChapters && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle2 className="w-3 h-3" />
                        {chapters.length} 个章节
                    </span>
                )}
            </div>

            {!hasChapters ? (
                <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                        isDragging
                            ? 'border-orange-400/50 bg-orange-400/5'
                            : 'border-slate-600/50 hover:border-slate-500 hover:bg-slate-700/30'
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".srt"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                    {isUploading ? (
                        <Loader2 className="w-4 h-4 text-orange-400 animate-spin flex-shrink-0" />
                    ) : (
                        <Upload className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    )}
                    <span className="text-sm text-slate-500">
                        {isUploading ? '解析中...' : '拖拽或点击上传 .srt 文件'}
                    </span>
                </div>
            ) : (
                <div className="flex items-start gap-3">
                    <div className="flex-1 bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-slate-400 font-medium">{filename}</span>
                            <button onClick={handleClear} className="text-slate-600 hover:text-slate-400 transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="space-y-0.5 max-h-28 overflow-y-auto">
                            {chapters.slice(0, 12).map((ch, i) => (
                                <div key={i} className="flex gap-2 text-xs">
                                    <span className="text-orange-400/80 font-mono flex-shrink-0 w-12">{ch.startTime}</span>
                                    <span className="text-slate-400 truncate">{ch.title}</span>
                                </div>
                            ))}
                            {chapters.length > 12 && (
                                <div className="text-xs text-slate-600">...还有 {chapters.length - 12} 个章节</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
    );
};
