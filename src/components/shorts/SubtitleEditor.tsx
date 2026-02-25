import { useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import type { WhisperSegment } from '../../types';

interface SubtitleEditorProps {
    segments: WhisperSegment[];
    isTranscribing: boolean;
    onSegmentsUpdate: (segments: WhisperSegment[]) => void;
    onTranscribe: () => void;
    onConfirm: () => void;
}

export const SubtitleEditor = ({
    segments,
    isTranscribing,
    onSegmentsUpdate,
    onTranscribe,
    onConfirm
}: SubtitleEditorProps) => {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');

    const handleEdit = (segment: WhisperSegment) => {
        setEditingId(segment.id);
        setEditText(segment.text);
    };

    const handleSave = (id: number) => {
        onSegmentsUpdate(segments.map(s =>
            s.id === id ? { ...s, text: editText } : s
        ));
        setEditingId(null);
    };

    const handleTimeAdjust = (id: number, field: 'start' | 'end', value: number) => {
        onSegmentsUpdate(segments.map(s =>
            s.id === id ? { ...s, [field]: Math.max(0, value) } : s
        ));
    };

    const formatTime = (s: number): string => {
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        const ms = Math.floor((s % 1) * 10);
        return `${mins}:${String(secs).padStart(2, '0')}.${ms}`;
    };

    const parseTime = (str: string): number => {
        const match = str.match(/(\d+):(\d+)\.?(\d)?/);
        if (!match) return 0;
        const mins = parseInt(match[1]);
        const secs = parseInt(match[2]);
        const ms = match[3] ? parseInt(match[3]) * 100 : 0;
        return mins * 60 + secs + ms / 1000;
    };

    if (segments.length === 0) {
        return (
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 text-center">
                <p className="text-slate-400 mb-3">暂无字幕数据</p>
                <button
                    onClick={onTranscribe}
                    disabled={isTranscribing}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 text-white rounded-lg text-sm"
                >
                    {isTranscribing ? '识别中...' : 'Whisper 语音识别'}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">共 {segments.length} 个字幕段落</span>
                <div className="flex gap-2">
                    <button
                        onClick={onTranscribe}
                        disabled={isTranscribing}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-xs text-slate-300 rounded"
                    >
                        <RefreshCw className={`w-3 h-3 ${isTranscribing ? 'animate-spin' : ''}`} />
                        重新识别
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
                    >
                        <Save className="w-3 h-3" />
                        确认字幕
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg border border-slate-700 max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-800/50 sticky top-0">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 w-20">时间</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">文本</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 w-16">置信度</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 w-12">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {segments.map(segment => (
                            <tr key={segment.id} className="hover:bg-slate-800/30">
                                <td className="px-3 py-2">
                                    <div className="flex items-center gap-1 text-xs">
                                        <input
                                            type="text"
                                            value={formatTime(segment.start)}
                                            onChange={(e) => handleTimeAdjust(segment.id, 'start', parseTime(e.target.value))}
                                            className="w-12 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-center"
                                        />
                                        <span className="text-slate-500">-</span>
                                        <input
                                            type="text"
                                            value={formatTime(segment.end)}
                                            onChange={(e) => handleTimeAdjust(segment.id, 'end', parseTime(e.target.value))}
                                            className="w-12 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-center"
                                        />
                                    </div>
                                </td>
                                <td className="px-3 py-2">
                                    {editingId === segment.id ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleSave(segment.id)}
                                                className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
                                            >
                                                保存
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    ) : (
                                        <span
                                            className="cursor-pointer hover:text-white"
                                            onClick={() => handleEdit(segment)}
                                        >
                                            {segment.text}
                                        </span>
                                    )}
                                </td>
                                <td className="px-3 py-2">
                                    <span className={`text-xs ${
                                        segment.confidence > 0.9 ? 'text-green-400' :
                                        segment.confidence > 0.7 ? 'text-yellow-400' : 'text-red-400'
                                    }`}>
                                        {Math.round(segment.confidence * 100)}%
                                    </span>
                                </td>
                                <td className="px-3 py-2">
                                    {editingId !== segment.id && (
                                        <button
                                            onClick={() => handleEdit(segment)}
                                            className="text-xs text-slate-400 hover:text-white"
                                        >
                                            编辑
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
