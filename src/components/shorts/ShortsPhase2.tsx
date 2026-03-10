import { useState } from 'react';
import { Check, RefreshCw, Loader2, CheckCircle } from 'lucide-react';
import type { ShortScript } from '../../types';

interface ShortsPhase2Props {
    projectId: string;
    scripts: ShortScript[];
    onScriptsUpdate: (scripts: ShortScript[]) => void;
    onConfirmAll: () => void;
    highlightedScriptId?: string | null;
}

export const ShortsPhase2 = ({ projectId, scripts, onScriptsUpdate, onConfirmAll, highlightedScriptId }: ShortsPhase2Props) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [comments, setComments] = useState<Record<string, string>>({});

    const handleEdit = (script: ShortScript) => {
        setEditingId(script.id);
        setEditText(script.scriptText);
    };

    const handleSaveEdit = async (scriptId: string) => {
        try {
            await fetch('/api/shorts/phase2/save-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, shortId: scriptId, scriptText: editText })
            });

            onScriptsUpdate(scripts.map(s =>
                s.id === scriptId ? { ...s, scriptText: editText, status: 'confirmed' as const } : s
            ));
            setEditingId(null);
        } catch (e) {
            console.error('Save failed:', e);
            alert('保存失败');
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditText('');
    };

    const handleRegenerate = async (scriptId: string) => {
        const comment = comments[scriptId] || '';
        if (!comment.trim()) {
            alert('请先填写修改意见');
            return;
        }

        onScriptsUpdate(scripts.map(s =>
            s.id === scriptId ? { ...s, status: 'regenerating' as const } : s
        ));

        try {
            const response = await fetch('/api/shorts/phase2/regenerate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, shortId: scriptId, userComment: comment })
            });

            if (!response.ok) {
                throw new Error('Regenerate failed');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

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

                                if (jsonData.type === 'script') {
                                    onScriptsUpdate(scripts.map(s =>
                                        s.id === scriptId 
                                            ? { ...jsonData.script, status: 'confirmed' as const } 
                                            : s
                                    ));
                                } else if (jsonData.type === 'error') {
                                    throw new Error(jsonData.message);
                                }
                            } catch (e) {
                                // Ignore partial JSON
                            }
                        }
                    }
                }
            }
        } catch (e: any) {
            console.error(e);
            alert('重生成失败: ' + e.message);
            onScriptsUpdate(scripts.map(s =>
                s.id === scriptId ? { ...s, status: 'draft' as const } : s
            ));
        } finally {
            setComments(prev => ({ ...prev, [scriptId]: '' }));
        }
    };

    const handleConfirm = (scriptId: string) => {
        onScriptsUpdate(scripts.map(s =>
            s.id === scriptId ? { ...s, status: 'confirmed' as const } : s
        ));
    };

    const allConfirmed = scripts.every(s => s.status === 'confirmed');
    const confirmedCount = scripts.filter(s => s.status === 'confirmed').length;

    const getStatusBadge = (status: ShortScript['status']) => {
        switch (status) {
            case 'confirmed':
                return <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle className="w-3 h-3" /> 已确认</span>;
            case 'editing':
                return <span className="text-xs text-blue-400">编辑中</span>;
            case 'regenerating':
                return <span className="flex items-center gap-1 text-xs text-yellow-400"><Loader2 className="w-3 h-3 animate-spin" /> 重生成中</span>;
            default:
                return <span className="text-xs text-slate-400">草稿</span>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="text-sm text-slate-400">
                    已确认 {confirmedCount}/{scripts.length} 条脚本
                </div>
                <button
                    onClick={onConfirmAll}
                    disabled={!allConfirmed}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        allConfirmed 
                            ? 'bg-green-600 hover:bg-green-500 text-white' 
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                >
                    <Check className="w-4 h-4" />
                    全部确认，进入 Phase 3
                </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-700">
                <table className="w-full">
                    <thead className="bg-slate-900/50">
                        <tr>
                            <th className="w-12 px-3 py-2 text-left text-xs font-medium text-slate-400">#</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">文案内容</th>
                            <th className="w-24 px-3 py-2 text-left text-xs font-medium text-slate-400">CTA</th>
                            <th className="w-48 px-3 py-2 text-left text-xs font-medium text-slate-400">修改意见</th>
                            <th className="w-20 px-3 py-2 text-left text-xs font-medium text-slate-400">状态</th>
                            <th className="w-28 px-3 py-2 text-left text-xs font-medium text-slate-400">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {scripts.map((script, index) => (
                            <tr 
                                key={script.id} 
                                className={`hover:bg-slate-800/50 transition-colors ${
                                    highlightedScriptId === script.id 
                                        ? 'bg-cyan-900/30 ring-2 ring-cyan-500/50' 
                                        : ''
                                }`}
                            >
                                <td className="px-3 py-3 text-sm text-slate-300">{index + 1}</td>
                                <td className="px-3 py-3">
                                    {editingId === script.id ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                rows={4}
                                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white resize-none"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSaveEdit(script.id)}
                                                    className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
                                                >
                                                    保存
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded"
                                                >
                                                    取消
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div 
                                            className="text-sm text-slate-300 cursor-pointer hover:text-white"
                                            onClick={() => handleEdit(script)}
                                        >
                                            {script.scriptText}
                                        </div>
                                    )}
                                </td>
                                <td className="px-3 py-3">
                                    <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                                        {script.cta}
                                    </span>
                                </td>
                                <td className="px-3 py-3">
                                    <input
                                        type="text"
                                        value={comments[script.id] || ''}
                                        onChange={(e) => setComments(prev => ({ ...prev, [script.id]: e.target.value }))}
                                        placeholder="输入修改意见..."
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                        disabled={script.status === 'regenerating'}
                                    />
                                </td>
                                <td className="px-3 py-3">
                                    {getStatusBadge(script.status)}
                                </td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center gap-1">
                                        {script.status !== 'confirmed' && (
                                            <>
                                                <button
                                                    onClick={() => handleRegenerate(script.id)}
                                                    disabled={script.status === 'regenerating'}
                                                    className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-yellow-400 disabled:opacity-50"
                                                    title="重新生成"
                                                >
                                                    {script.status === 'regenerating' 
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <RefreshCw className="w-4 h-4" />
                                                    }
                                                </button>
                                                <button
                                                    onClick={() => handleConfirm(script.id)}
                                                    className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400"
                                                    title="确认"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
