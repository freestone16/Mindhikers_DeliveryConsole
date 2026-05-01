/**
 * MarketPhase2New.tsx — Sprint 4: Phase 2 完整实现
 *
 * 流程：
 *   黄金词信息条 → SRT字幕上传（可选）→ 生成营销方案（SSE） → Tab切换 → MarketPlanTable审阅
 *
 * 状态管理：
 *   MarketModule_V3.plans[] 存所有方案（每个黄金词一套）
 *   plan.generationStatus: 'pending' | 'generating' | 'ready' | 'error'
 */
import React, { useRef } from 'react';
import {
    Sparkles, Loader2, ArrowLeft, AlertCircle, CheckCircle2,
    LayoutList, RefreshCw
} from 'lucide-react';
import type { MarketModule_V3, MarketingPlan, MarketingPlanRow, SRTChapter } from '../../types';
import { SRTUploader } from './SRTUploader';
import { MarketPlanTable } from './MarketPlanTable';
import { MarketConfirmBar } from './MarketConfirmBar';

export interface MarketPhase2NewProps {
    data: MarketModule_V3;
    projectId: string;
    onUpdate: (newData: MarketModule_V3) => void;
    onGoToPhase1: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initPlan(keywordId: string, keyword: string): MarketingPlan {
    return {
        keywordId,
        keyword,
        rows: [],
        thumbnailPaths: [],
        generationStatus: 'pending',
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MarketPhase2New: React.FC<MarketPhase2NewProps> = ({
    data,
    projectId,
    onUpdate,
    onGoToPhase1,
}) => {
    // Ref to avoid stale closure during SSE streaming
    const dataRef = useRef(data);
    dataRef.current = data;

    const goldenKWs = data.candidates.filter(c => data.goldenKeywords.includes(c.id));
    const activePlan = data.plans[data.activeTabIndex] ?? null;

    // ── Helpers ───────────────────────────────────────────────────────────────

    const updatePlan = (keywordId: string, keyword: string, updates: Partial<MarketingPlan>) => {
        const current = dataRef.current;
        const existingPlan = current.plans.find(p => p.keywordId === keywordId);
        const plans = existingPlan
            ? current.plans.map(p => p.keywordId === keywordId ? { ...p, ...updates } : p)
            : [...current.plans, { ...initPlan(keywordId, keyword), ...updates }];
        const nextData = { ...current, plans };
        dataRef.current = nextData;
        onUpdate(nextData);
    };

    const updatePlanRows = (keywordId: string, rows: MarketingPlanRow[]) => {
        const current = dataRef.current;
        const plans = current.plans.map(p =>
            p.keywordId === keywordId ? { ...p, rows } : p
        );
        const nextData = { ...current, plans };
        dataRef.current = nextData;
        onUpdate(nextData);
    };

    // ── SRT ───────────────────────────────────────────────────────────────────

    const handleChaptersLoaded = (chapters: SRTChapter[], timeline: string) => {
        onUpdate({ ...dataRef.current, srtChapters: chapters });
        // Store timeline string for plan generation (passed via closure ref below)
        (window as any).__srtTimeline = timeline;
    };

    // ── Plan Generation ───────────────────────────────────────────────────────

    const generatePlanForKeyword = async (
        keywordId: string,
        keyword: string,
        bestVariantText: string
    ) => {
        const timeline: string = (window as any).__srtTimeline || '';
        const current = dataRef.current;
        const scriptPath = current.selectedScript?.path || '';

        // Mark as generating
        updatePlan(keywordId, keyword, { generationStatus: 'generating', errorMessage: undefined, rows: [] });

        try {
            const res = await fetch('/api/market/v3/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    scriptPath,
                    keyword,
                    keywordId,
                    bestVariantText,
                    srtTimeline: timeline,
                }),
            });

            if (!res.ok) {
                const message = await res.text();
                throw new Error(message || `生成请求失败 (${res.status})`);
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error('无法读取响应流');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const event = JSON.parse(line.slice(6));
                        if (event.type === 'plan_ready' && event.keywordId === keywordId) {
                            updatePlan(keywordId, keyword, {
                                rows: event.rows,
                                generationStatus: 'ready',
                                generationDuration: Date.now(),
                            });
                        } else if (event.type === 'error' && event.keywordId === keywordId) {
                            updatePlan(keywordId, keyword, {
                                generationStatus: 'error',
                                errorMessage: event.message,
                            });
                        }
                    } catch { /* ignore parse errors */ }
                }
            }
        } catch (e: any) {
            updatePlan(keywordId, keyword, { generationStatus: 'error', errorMessage: e.message });
        }
    };

    const handleGenerateAll = () => {
        // Ensure plans array is initialized for all golden keywords
        const current = dataRef.current;
        const existingIds = new Set(current.plans.map(p => p.keywordId));
        const newPlans = [...current.plans];
        for (const kw of goldenKWs) {
            if (!existingIds.has(kw.id)) {
                newPlans.push(initPlan(kw.id, kw.keyword));
            }
        }
        const nextData = { ...current, plans: newPlans };
        dataRef.current = nextData;
        onUpdate(nextData);

        // Launch all generations concurrently (each has its own SSE connection)
        for (const kw of goldenKWs) {
            const bestVariant =
                kw.variants.reduce((best, v) =>
                    (v.tubeBuddyScore?.overall ?? 0) > (best.tubeBuddyScore?.overall ?? 0) ? v : best
                , kw.variants[0]);
            generatePlanForKeyword(kw.id, kw.keyword, bestVariant?.text || kw.keyword);
        }
    };

    const handleRegeneratePlan = (keywordId: string) => {
        const kw = goldenKWs.find(k => k.id === keywordId);
        if (!kw) return;
        const bestVariant =
            kw.variants.reduce((best, v) =>
                (v.tubeBuddyScore?.overall ?? 0) > (best.tubeBuddyScore?.overall ?? 0) ? v : best
            , kw.variants[0]);
        generatePlanForKeyword(kw.id, kw.keyword, bestVariant?.text || kw.keyword);
    };

    // ── Derived State ─────────────────────────────────────────────────────────

    const hasAnyPlan = data.plans.some(p => p.generationStatus === 'ready');
    const allGenerating = goldenKWs.length > 0 &&
        goldenKWs.every(kw => {
            const p = data.plans.find(pl => pl.keywordId === kw.id);
            return p?.generationStatus === 'generating';
        });
    const anyGenerating = data.plans.some(p => p.generationStatus === 'generating');

    // ── No golden keywords ────────────────────────────────────────────────────

    if (goldenKWs.length === 0) {
        return (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
                <LayoutList className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-slate-400 font-medium mb-2">尚未选择黄金关键词</h3>
                <p className="text-slate-500 text-sm mb-4">请返回 Phase 1 完成关键词选择</p>
                <button
                    onClick={onGoToPhase1}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                >
                    ← 返回 Phase 1
                </button>
            </div>
        );
    }

    // ── Main Render ───────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">

            {/* ── 黄金词信息条 ── */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-slate-400 flex-shrink-0">黄金关键词：</span>
                    {goldenKWs.map(kw => (
                        <div
                            key={kw.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                        >
                            <span className="text-yellow-400 text-sm">🔑</span>
                            <span className="text-yellow-300 text-sm font-medium">{kw.keyword}</span>
                            {kw.bestScore !== undefined && (
                                <span className="text-xs text-yellow-600 ml-1">({kw.bestScore}分)</span>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={onGoToPhase1}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        返回 Phase 1
                    </button>
                </div>
            </div>

            {/* ── SRT 字幕上传 ── */}
            <SRTUploader
                projectId={projectId}
                chapters={data.srtChapters || []}
                onChaptersLoaded={handleChaptersLoaded}
            />

            {/* ── 生成方案按钮 ── */}
            {!hasAnyPlan && (
                <div className="flex justify-center py-2">
                    <button
                        onClick={handleGenerateAll}
                        disabled={anyGenerating}
                        className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg ${
                            anyGenerating
                                ? 'bg-orange-600/50 text-orange-300/60 cursor-not-allowed'
                                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-500/20'
                        }`}
                    >
                        {anyGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4" />
                        )}
                        {anyGenerating
                            ? `生成中（${goldenKWs.length} 套方案）...`
                            : `✨ 为 ${goldenKWs.length} 个关键词生成营销方案`
                        }
                    </button>
                </div>
            )}

            {/* ── Tab + 方案内容 ── */}
            {(hasAnyPlan || anyGenerating) && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">

                    {/* Tab Bar */}
                    <div className="flex border-b border-slate-700 bg-slate-900/40">
                        {goldenKWs.map((kw, idx) => {
                            const plan = data.plans.find(p => p.keywordId === kw.id);
                            const isActive = data.activeTabIndex === idx;
                            const status = plan?.generationStatus;

                            return (
                                <button
                                    key={kw.id}
                                    onClick={() => onUpdate({ ...data, activeTabIndex: idx })}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm border-r border-slate-700/50 transition-colors ${
                                        isActive
                                            ? 'bg-orange-500/10 text-orange-300 border-b-2 border-b-orange-500'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                                    }`}
                                >
                                    <span>🔑</span>
                                    <span className="font-medium">{kw.keyword}</span>
                                    {kw.bestScore !== undefined && (
                                        <span className="text-xs opacity-50">({kw.bestScore})</span>
                                    )}
                                    {status === 'generating' && <Loader2 className="w-3 h-3 animate-spin text-orange-400" />}
                                    {status === 'ready' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                                    {status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                                </button>
                            );
                        })}

                        {/* Re-generate all button */}
                        <div className="ml-auto flex items-center pr-3">
                            <button
                                onClick={handleGenerateAll}
                                disabled={anyGenerating}
                                title="重新生成所有方案"
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
                            >
                                <RefreshCw className={`w-3 h-3 ${anyGenerating ? 'animate-spin' : ''}`} />
                                重新生成
                            </button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4">
                        {(() => {
                            if (!activePlan) {
                                const activeKW = goldenKWs[data.activeTabIndex];
                                if (!activeKW) return null;
                                return (
                                    <div className="text-center py-8">
                                        <Loader2 className="w-8 h-8 text-orange-400/40 animate-spin mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm">正在为「{activeKW.keyword}」生成营销方案...</p>
                                    </div>
                                );
                            }

                            if (activePlan.generationStatus === 'generating') {
                                return (
                                    <div className="text-center py-8">
                                        <Loader2 className="w-8 h-8 text-orange-400/60 animate-spin mx-auto mb-3" />
                                        <p className="text-slate-400 text-sm font-medium">
                                            正在为「{activePlan.keyword}」生成营销方案...
                                        </p>
                                        <p className="text-slate-600 text-xs mt-1">LLM 正在分析脚本，通常需要 10-20 秒</p>
                                    </div>
                                );
                            }

                            if (activePlan.generationStatus === 'error') {
                                return (
                                    <div className="text-center py-8">
                                        <AlertCircle className="w-8 h-8 text-red-400/60 mx-auto mb-3" />
                                        <p className="text-red-400 text-sm font-medium">生成失败</p>
                                        <p className="text-slate-500 text-xs mt-1 mb-4">{activePlan.errorMessage}</p>
                                        <button
                                            onClick={() => handleRegeneratePlan(activePlan.keywordId)}
                                            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                                        >
                                            重试
                                        </button>
                                    </div>
                                );
                            }

                            if (activePlan.generationStatus === 'ready' && activePlan.rows.length > 0) {
                                return (
                                    <MarketPlanTable
                                        plan={activePlan}
                                        projectId={projectId}
                                        onUpdatePlan={updatedPlan => {
                                            const plans = dataRef.current.plans.map(p =>
                                                p.keywordId === updatedPlan.keywordId ? updatedPlan : p
                                            );
                                            onUpdate({ ...dataRef.current, plans });
                                        }}
                                    />
                                );
                            }

                            return (
                                <div className="text-center py-8">
                                    <LayoutList className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-500 text-sm">等待生成...</p>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* ── 确认导出栏 ── */}
            {hasAnyPlan && (
                <MarketConfirmBar
                    plans={data.plans}
                    projectId={projectId}
                    onExportDone={(paths) => {
                        onUpdate({
                            ...dataRef.current,
                            savedOutputs: { paths, savedAt: new Date().toISOString() },
                        });
                    }}
                />
            )}
        </div>
    );
};
