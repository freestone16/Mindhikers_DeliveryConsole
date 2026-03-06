/**
 * CandidateKeywordList.tsx — Phase 1, Sub-step 1.1
 *
 * Generates candidate keywords via SSE from LLM analysis of selected script.
 * Supports manual keyword addition and deletion before proceeding to scoring.
 */
import React, { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Loader2, Sparkles, ChevronRight, Languages } from 'lucide-react';
import type { CandidateKeyword, MarketModule_V3 } from '../../types';

interface CandidateKeywordListProps {
    data: MarketModule_V3;
    projectId: string;
    scriptPath: string;
    onUpdate: (newData: MarketModule_V3) => void;
    onGoToScoring: () => void;
}

export const CandidateKeywordList: React.FC<CandidateKeywordListProps> = ({
    data,
    projectId,
    scriptPath,
    onUpdate,
    onGoToScoring,
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [manualInput, setManualInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Use a ref to accumulate candidates during streaming to avoid stale closure issues
    const accumulatedCandidatesRef = useRef<CandidateKeyword[]>([...data.candidates]);

    const handleGenerate = useCallback(async () => {
        if (!scriptPath) return;

        setIsGenerating(true);
        setError(null);
        accumulatedCandidatesRef.current = [];
        onUpdate({ ...data, candidates: [] });

        try {
            const response = await fetch('/api/market/v3/generate-candidates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, scriptPath }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6).trim();
                    if (payload === '[DONE]') break;

                    try {
                        const event = JSON.parse(payload);
                        if (event.type === 'candidate' && event.keyword) {
                            accumulatedCandidatesRef.current = [
                                ...accumulatedCandidatesRef.current,
                                event.keyword as CandidateKeyword,
                            ];
                            // Snapshot the current array for the update call
                            const snapshot = [...accumulatedCandidatesRef.current];
                            onUpdate({ ...data, candidates: snapshot });
                        } else if (event.type === 'error') {
                            setError(event.message ?? '生成时发生未知错误');
                        }
                    } catch {
                        // Ignore malformed JSON lines
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '网络请求失败，请重试');
        } finally {
            setIsGenerating(false);
        }
    }, [projectId, scriptPath, data, onUpdate]);

    const handleDeleteKeyword = (id: string) => {
        const updated = data.candidates.filter((k) => k.id !== id);
        onUpdate({ ...data, candidates: updated });
    };

    const handleAddManual = () => {
        const text = manualInput.trim();
        if (!text) return;

        const newKeyword: CandidateKeyword = {
            id: `user-${Date.now()}`,
            keyword: text,
            variants: [
                { text, script: 'simplified', status: 'pending' },
                { text, script: 'traditional', status: 'pending' },
            ],
            source: 'user',
            isGolden: false,
        };

        onUpdate({ ...data, candidates: [...data.candidates, newKeyword] });
        setManualInput('');
    };

    const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleAddManual();
    };

    const canProceed = data.candidates.length > 0 && !isGenerating;
    const hasScript = Boolean(scriptPath);

    return (
        <div className="space-y-4">
            {/* Header card */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-slate-200 font-semibold mb-1 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-orange-400" />
                            候选关键词生成
                        </h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            LLM 将分析脚本内容，生成 10 个候选关键词（含简繁体变体）。你可以手动补充或删除。
                        </p>
                    </div>
                    {data.selectedScript && (
                        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 rounded-lg text-xs text-slate-400 border border-slate-700/50">
                            <span>📄</span>
                            <span className="font-mono">{data.selectedScript.filename}</span>
                        </div>
                    )}
                </div>

                {!hasScript && (
                    <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                        <span>⚠️</span>
                        <span>请先在左侧选择一个脚本文件，才能生成候选关键词</span>
                    </div>
                )}

                {error && (
                    <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        <span>❌</span>
                        <span>{error}</span>
                    </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={!hasScript || isGenerating}
                    className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            正在分析脚本…
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            分析脚本，生成候选关键词
                        </>
                    )}
                </button>
            </div>

            {/* Keyword list */}
            {(data.candidates.length > 0 || isGenerating) && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">
                            候选关键词
                            {data.candidates.length > 0 && (
                                <span className="ml-2 text-xs text-slate-500">({data.candidates.length} 个)</span>
                            )}
                        </span>
                        {isGenerating && (
                            <span className="flex items-center gap-1.5 text-xs text-orange-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                生成中…
                            </span>
                        )}
                    </div>

                    <div className="divide-y divide-slate-700/50">
                        {data.candidates.map((kw, idx) => (
                            <div
                                key={kw.id}
                                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-700/30 transition-colors group"
                            >
                                {/* Index */}
                                <span className="w-5 text-xs text-slate-600 text-right flex-shrink-0">
                                    {idx + 1}
                                </span>

                                {/* Keyword text */}
                                <span className="flex-1 text-slate-200 text-sm font-medium">
                                    {kw.keyword}
                                </span>

                                {/* Tags */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {/* Source tag */}
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        kw.source === 'user'
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                                            : 'bg-slate-700 text-slate-400 border border-slate-600/50'
                                    }`}>
                                        {kw.source === 'user' ? '用户' : 'LLM'}
                                    </span>

                                    {/* Script variant tags */}
                                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-700/60 text-slate-400 rounded-full border border-slate-600/30">
                                        <Languages className="w-3 h-3" />
                                        {kw.variants.some((v) => v.script === 'simplified') && (
                                            <span>简</span>
                                        )}
                                        {kw.variants.some((v) => v.script === 'traditional') && (
                                            <span>繁</span>
                                        )}
                                    </span>
                                </div>

                                {/* Delete button */}
                                <button
                                    onClick={() => handleDeleteKeyword(kw.id)}
                                    className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                                    title="删除关键词"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}

                        {isGenerating && data.candidates.length === 0 && (
                            <div className="px-5 py-8 text-center text-slate-500 text-sm">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-400/60" />
                                正在分析脚本，关键词将逐个显示…
                            </div>
                        )}
                    </div>

                    {/* Manual input */}
                    <div className="px-5 py-3 border-t border-slate-700 bg-slate-900/30">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                onKeyDown={handleManualKeyDown}
                                placeholder="手动添加关键词（Enter 或点击 + 添加）"
                                className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-colors"
                            />
                            <button
                                onClick={handleAddManual}
                                disabled={!manualInput.trim()}
                                className="flex-shrink-0 p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-slate-600"
                                title="添加关键词"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Proceed button */}
            {canProceed && (
                <div className="flex justify-end">
                    <button
                        onClick={onGoToScoring}
                        className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                    >
                        提交候选词进行 TubeBuddy 评估
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};
