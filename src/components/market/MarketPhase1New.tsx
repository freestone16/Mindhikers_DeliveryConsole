/**
 * MarketPhase1New.tsx — Phase 1: 黄金关键词发掘
 *
 * Sprint 2: 完整实现
 * Sub-steps:
 *   1.1 候选关键词生成 (CandidateKeywordList)
 *   1.2 TubeBuddy 评分  (KeywordScoreTable)
 *   1.3 黄金词选择      (inline selection table)
 *
 * Scoring flow:
 *   POST /api/market/v3/score-candidates  (SSE)
 *   POST /api/market/v3/score-single      (retry one keyword)
 *   POST /api/market/v3/analyze-keywords  (SSE text stream → llmAnalysis)
 */
import React, { useCallback, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { CandidateKeyword, KeywordVariant, MarketModule_V3 } from '../../types';
import { CandidateKeywordList } from './CandidateKeywordList';
import { KeywordScoreTable } from './KeywordScoreTable';

export interface MarketPhase1NewProps {
    data: MarketModule_V3;
    projectId: string;
    scriptPath: string;
    onUpdate: (newData: MarketModule_V3) => void;
    onGoToPhase2: () => void;
}

const SUB_STEP_LABELS: Record<MarketModule_V3['phase1SubStep'], string> = {
    candidates: '1.1 候选关键词生成',
    scoring:    '1.2 TubeBuddy 评分',
    selection:  '1.3 黄金词选择',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
    if (score >= 80) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
}

function topCandidateIds(candidates: CandidateKeyword[], max = 3): string[] {
    return [...candidates]
        .filter((k) => k.bestScore !== undefined)
        .sort((a, b) => (b.bestScore ?? 0) - (a.bestScore ?? 0))
        .slice(0, max)
        .map((k) => k.id);
}

// ── Component ──────────────────────────────────────────────────────────────

export const MarketPhase1New: React.FC<MarketPhase1NewProps> = ({
    data,
    projectId,
    scriptPath,
    onUpdate,
    onGoToPhase2,
}) => {
    const subSteps: MarketModule_V3['phase1SubStep'][] = ['candidates', 'scoring', 'selection'];
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Ref for accumulating scored data during SSE to avoid stale closures
    const scoringDataRef = useRef<MarketModule_V3 | null>(null);

    // ── Sub-step navigation helpers ──────────────────────────────────────

    const goToSubStep = (step: MarketModule_V3['phase1SubStep']) => {
        onUpdate({ ...data, phase1SubStep: step });
    };

    // ── 1.1 → 1.2: go to scoring ────────────────────────────────────────

    const handleGoToScoring = useCallback(() => {
        onUpdate({ ...data, phase1SubStep: 'scoring' });
    }, [data, onUpdate]);

    // ── 1.2: start scoring via SSE ───────────────────────────────────────

    const handleStartScoring = useCallback(async () => {
        // Mark all variants as 'scoring'
        const initialData: MarketModule_V3 = {
            ...data,
            candidates: data.candidates.map((kw) => ({
                ...kw,
                variants: kw.variants.map((v) => ({ ...v, status: 'scoring' as KeywordVariant['status'] })),
            })),
        };
        onUpdate(initialData);
        scoringDataRef.current = initialData;

        try {
            const response = await fetch('/api/market/v3/score-candidates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, candidates: data.candidates }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

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
                        const current = scoringDataRef.current ?? initialData;

                        if (event.type === 'scoring') {
                            // Mark specific variant as scoring
                            const updated: MarketModule_V3 = {
                                ...current,
                                candidates: current.candidates.map((kw) =>
                                    kw.id !== event.keywordId ? kw : {
                                        ...kw,
                                        variants: kw.variants.map((v) =>
                                            v.script !== event.variantScript ? v : {
                                                ...v,
                                                status: 'scoring' as KeywordVariant['status'],
                                            }
                                        ),
                                    }
                                ),
                            };
                            scoringDataRef.current = updated;
                            onUpdate(updated);

                        } else if (event.type === 'scored') {
                            const updated: MarketModule_V3 = {
                                ...current,
                                candidates: current.candidates.map((kw) => {
                                    if (kw.id !== event.keywordId) return kw;
                                    const updatedVariants = kw.variants.map((v) =>
                                        v.script !== event.variantScript ? v : {
                                            ...v,
                                            status: 'scored' as KeywordVariant['status'],
                                            tubeBuddyScore: event.score,
                                            scoredAt: new Date().toISOString(),
                                        }
                                    );
                                    // Recalculate bestScore
                                    const scores = updatedVariants
                                        .map((v) => v.tubeBuddyScore?.overall)
                                        .filter((s): s is number => s !== undefined);
                                    return {
                                        ...kw,
                                        variants: updatedVariants,
                                        bestScore: scores.length > 0 ? Math.max(...scores) : kw.bestScore,
                                    };
                                }),
                            };
                            scoringDataRef.current = updated;
                            onUpdate(updated);

                        } else if (event.type === 'error') {
                            const updated: MarketModule_V3 = {
                                ...current,
                                candidates: current.candidates.map((kw) =>
                                    kw.id !== event.keywordId ? kw : {
                                        ...kw,
                                        variants: kw.variants.map((v) =>
                                            v.script !== event.variantScript ? v : {
                                                ...v,
                                                status: 'error' as KeywordVariant['status'],
                                                errorMessage: event.message,
                                            }
                                        ),
                                    }
                                ),
                            };
                            scoringDataRef.current = updated;
                            onUpdate(updated);

                        } else if (event.type === 'complete') {
                            // Scoring done — fetch LLM analysis
                            await handleAnalyzeKeywords(scoringDataRef.current ?? current);
                        }
                    } catch {
                        // Ignore malformed JSON
                    }
                }
            }
        } catch (err) {
            console.error('[MarketPhase1New] Scoring SSE error:', err);
        }
    }, [data, projectId, onUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── 1.2: LLM analysis after scoring ─────────────────────────────────

    const handleAnalyzeKeywords = async (latestData: MarketModule_V3) => {
        setIsAnalyzing(true);
        let analysis = '';

        try {
            const response = await fetch('/api/market/v3/analyze-keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, candidates: latestData.candidates }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

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
                        if (event.type === 'analysis' && event.content) {
                            analysis = event.content;
                            onUpdate({ ...(scoringDataRef.current ?? latestData), llmAnalysis: analysis });
                        }
                    } catch {
                        // Ignore malformed JSON
                    }
                }
            }
        } catch (err) {
            console.error('[MarketPhase1New] Analysis SSE error:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ── 1.2: retry a single keyword ──────────────────────────────────────

    const handleRetryKeyword = useCallback(async (keywordId: string) => {
        const kw = data.candidates.find((k) => k.id === keywordId);
        if (!kw) return;

        // Mark error variants of this keyword back to 'scoring'
        const markedData: MarketModule_V3 = {
            ...data,
            candidates: data.candidates.map((k) =>
                k.id !== keywordId ? k : {
                    ...k,
                    variants: k.variants.map((v) =>
                        v.status !== 'error' ? v : { ...v, status: 'scoring' as KeywordVariant['status'], errorMessage: undefined }
                    ),
                }
            ),
        };
        onUpdate(markedData);

        try {
            // score-single uses SSE — iterate each error variant
            const errorVariants = kw.variants.filter((v) => v.status === 'error');
            for (const variant of errorVariants) {
                const response = await fetch('/api/market/v3/score-single', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId,
                        keywordId,
                        variantText: variant.text,
                        variantScript: variant.script,
                    }),
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const reader = response.body?.getReader();
                if (!reader) continue;
                const decoder = new TextDecoder();
                let buf = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buf += decoder.decode(value, { stream: true });
                    const lines = buf.split('\n');
                    buf = lines.pop() ?? '';
                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const payload = line.slice(6).trim();
                        try {
                            const ev = JSON.parse(payload);
                            if (ev.type === 'scored') {
                                const current = scoringDataRef.current ?? markedData;
                                const updated: MarketModule_V3 = {
                                    ...current,
                                    candidates: current.candidates.map((k) => {
                                        if (k.id !== ev.keywordId) return k;
                                        const updatedVariants = k.variants.map((v) =>
                                            v.script !== ev.variantScript ? v : {
                                                ...v,
                                                status: 'scored' as KeywordVariant['status'],
                                                tubeBuddyScore: ev.score,
                                                scoringDuration: ev.scoringDuration,
                                                scoredAt: ev.scoredAt,
                                                errorMessage: undefined,
                                            }
                                        );
                                        const scores = updatedVariants
                                            .map((v) => v.tubeBuddyScore?.overall)
                                            .filter((s): s is number => s !== undefined);
                                        return { ...k, variants: updatedVariants, bestScore: scores.length ? Math.max(...scores) : k.bestScore };
                                    }),
                                };
                                scoringDataRef.current = updated;
                                onUpdate(updated);
                            }
                        } catch { /* ignore */ }
                    }
                }
            }
        } catch (err) {
            console.error('[MarketPhase1New] Retry keyword error:', err);
            onUpdate({
                ...markedData,
                candidates: markedData.candidates.map((k) =>
                    k.id !== keywordId ? k : {
                        ...k,
                        variants: k.variants.map((v) =>
                            v.status !== 'scoring' ? v : { ...v, status: 'error' as KeywordVariant['status'], errorMessage: '重试失败，请再试' }
                        ),
                    }
                ),
            });
        }
    }, [data, projectId, onUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── 1.2: rescore all ─────────────────────────────────────────────────

    const handleRescoreAll = useCallback(() => {
        // Reset all variants to pending then start scoring
        const reset: MarketModule_V3 = {
            ...data,
            llmAnalysis: undefined,
            candidates: data.candidates.map((kw) => ({
                ...kw,
                bestScore: undefined,
                variants: kw.variants.map((v) => ({
                    ...v,
                    status: 'pending' as KeywordVariant['status'],
                    tubeBuddyScore: undefined,
                    errorMessage: undefined,
                    scoredAt: undefined,
                    scoringDuration: undefined,
                })),
            })),
        };
        onUpdate(reset);
        // Kick off scoring with reset data
        setTimeout(() => handleStartScoring(), 0);
    }, [data, onUpdate, handleStartScoring]);

    // ── 1.2: append a new keyword and score it immediately ───────────────

    const handleAddAndScore = useCallback(async (keyword: string) => {
        const newKeyword: CandidateKeyword = {
            id: `user-${Date.now()}`,
            keyword,
            variants: [
                { text: keyword, script: 'simplified', status: 'scoring' },
                { text: keyword, script: 'traditional', status: 'scoring' },
            ],
            source: 'user',
            isGolden: false,
        };

        const withNew: MarketModule_V3 = {
            ...data,
            candidates: [...data.candidates, newKeyword],
        };
        onUpdate(withNew);

        try {
            // Score each variant via score-single SSE
            let currentData = withNew;
            for (const variant of newKeyword.variants) {
                const response = await fetch('/api/market/v3/score-single', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId,
                        keywordId: newKeyword.id,
                        variantText: variant.text,
                        variantScript: variant.script,
                    }),
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const reader = response.body?.getReader();
                if (!reader) continue;
                const decoder = new TextDecoder();
                let buf = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buf += decoder.decode(value, { stream: true });
                    const lines = buf.split('\n');
                    buf = lines.pop() ?? '';
                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const ev = JSON.parse(line.slice(6).trim());
                            if (ev.type === 'scored') {
                                const updated: MarketModule_V3 = {
                                    ...currentData,
                                    candidates: currentData.candidates.map((k) => {
                                        if (k.id !== newKeyword.id) return k;
                                        const updatedVariants = k.variants.map((v) =>
                                            v.script !== ev.variantScript ? v : {
                                                ...v, status: 'scored' as KeywordVariant['status'],
                                                tubeBuddyScore: ev.score, scoredAt: ev.scoredAt,
                                            }
                                        );
                                        const scores = updatedVariants
                                            .map((v) => v.tubeBuddyScore?.overall)
                                            .filter((s): s is number => s !== undefined);
                                        return { ...k, variants: updatedVariants, bestScore: scores.length ? Math.max(...scores) : k.bestScore };
                                    }),
                                };
                                currentData = updated;
                                onUpdate(updated);
                            }
                        } catch { /* ignore */ }
                    }
                }
            }
        } catch (err) {
            console.error('[MarketPhase1New] AddAndScore error:', err);
            onUpdate({
                ...withNew,
                candidates: withNew.candidates.map((k) =>
                    k.id !== newKeyword.id ? k : {
                        ...k,
                        variants: k.variants.map((v) => ({
                            ...v, status: 'error' as KeywordVariant['status'], errorMessage: '评分失败，请重试',
                        })),
                    }
                ),
            });
        }
    }, [data, projectId, onUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── 1.2 → 1.3: go to selection ──────────────────────────────────────

    const handleGoToSelection = useCallback(() => {
        // Auto-select top 3 by bestScore if no golden keywords chosen yet
        const autoGolden =
            data.goldenKeywords.length === 0
                ? topCandidateIds(data.candidates, 3)
                : data.goldenKeywords;

        onUpdate({
            ...data,
            phase1SubStep: 'selection',
            // Mark isGolden on candidates
            candidates: data.candidates.map((kw) => ({
                ...kw,
                isGolden: autoGolden.includes(kw.id),
            })),
            goldenKeywords: autoGolden,
        });
    }, [data, onUpdate]);

    // ── 1.3: toggle golden keyword ───────────────────────────────────────

    const handleToggleGolden = (id: string) => {
        const current = data.goldenKeywords;
        let next: string[];

        if (current.includes(id)) {
            next = current.filter((g) => g !== id);
        } else {
            if (current.length >= 3) return; // max 3
            next = [...current, id];
        }

        onUpdate({
            ...data,
            goldenKeywords: next,
            candidates: data.candidates.map((kw) => ({
                ...kw,
                isGolden: next.includes(kw.id),
            })),
        });
    };

    // ── 1.3: confirm golden keywords → Phase 2 ───────────────────────────

    const handleConfirmGolden = () => {
        if (data.goldenKeywords.length === 0) return;
        onGoToPhase2();
    };

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* ── 子步骤导航 ── */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center gap-2 flex-wrap">
                    {subSteps.map((step, idx) => {
                        const isActive = data.phase1SubStep === step;
                        const isDone = subSteps.indexOf(data.phase1SubStep) > idx;
                        return (
                            <React.Fragment key={step}>
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                    isActive
                                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                        : isDone
                                        ? 'text-slate-400'
                                        : 'text-slate-600'
                                }`}>
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                        isActive ? 'bg-orange-500 text-white'
                                        : isDone ? 'bg-green-600 text-white'
                                        : 'bg-slate-700 text-slate-500'
                                    }`}>
                                        {isDone ? '✓' : idx + 1}
                                    </span>
                                    <span>{SUB_STEP_LABELS[step]}</span>
                                </div>
                                {idx < subSteps.length - 1 && (
                                    <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* ── 内容区域 ── */}
            {data.phase1SubStep === 'candidates' && (
                <CandidateKeywordList
                    data={data}
                    projectId={projectId}
                    scriptPath={scriptPath}
                    onUpdate={onUpdate}
                    onGoToScoring={handleGoToScoring}
                />
            )}

            {data.phase1SubStep === 'scoring' && (
                <KeywordScoreTable
                    data={data}
                    projectId={projectId}
                    onUpdate={onUpdate}
                    onStartScoring={handleStartScoring}
                    onRetryKeyword={handleRetryKeyword}
                    onRescoreAll={handleRescoreAll}
                    onAddAndScore={handleAddAndScore}
                    onGoToSelection={handleGoToSelection}
                />
            )}

            {data.phase1SubStep === 'selection' && (
                <SelectionView
                    data={data}
                    onToggleGolden={handleToggleGolden}
                    onConfirm={handleConfirmGolden}
                    isAnalyzing={isAnalyzing}
                />
            )}
        </div>
    );
};

// ── Sub-component: SelectionView (1.3) ────────────────────────────────────

interface SelectionViewProps {
    data: MarketModule_V3;
    onToggleGolden: (id: string) => void;
    onConfirm: () => void;
    isAnalyzing: boolean;
}

const SelectionView: React.FC<SelectionViewProps> = ({
    data,
    onToggleGolden,
    onConfirm,
    isAnalyzing: _isAnalyzing,
}) => {
    const maxGolden = 3;
    const goldenCount = data.goldenKeywords.length;

    return (
        <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                <h3 className="text-slate-200 font-semibold mb-1 flex items-center gap-2">
                    <span>🔑</span>
                    选择黄金关键词
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                    基于 TubeBuddy 评分和 AI 策略点评，选择 1–3 个黄金关键词进入 Phase 2 方案生成。
                    系统已为你预选得分最高的词，可自行调整。
                </p>
                <div className="mt-3 text-xs text-slate-500">
                    已选 <span className={goldenCount > 0 ? 'text-orange-400 font-semibold' : ''}>{goldenCount}</span> / {maxGolden} 个
                </div>
            </div>

            {/* LLM Analysis card */}
            {data.llmAnalysis && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <span>🧠</span>
                        AI 策略点评
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                        {data.llmAnalysis}
                    </p>
                </div>
            )}

            {/* Selection table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700 text-left">
                            <th className="px-4 py-2.5 text-xs font-medium text-slate-500 w-8">选</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-slate-500">关键词</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-slate-500">来源</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">最高综合分</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">简体分</th>
                            <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">繁体分</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {[...data.candidates]
                            .sort((a, b) => (b.bestScore ?? 0) - (a.bestScore ?? 0))
                            .map((kw) => {
                                const isGolden = data.goldenKeywords.includes(kw.id);
                                const isDisabled = !isGolden && goldenCount >= maxGolden;
                                const simpVariant = kw.variants.find((v) => v.script === 'simplified');
                                const tradVariant = kw.variants.find((v) => v.script === 'traditional');
                                const simpScore = simpVariant?.tubeBuddyScore?.overall;
                                const tradScore = tradVariant?.tubeBuddyScore?.overall;

                                return (
                                    <tr
                                        key={kw.id}
                                        onClick={() => !isDisabled && onToggleGolden(kw.id)}
                                        className={`transition-colors ${
                                            isGolden
                                                ? 'bg-orange-500/10 hover:bg-orange-500/15'
                                                : isDisabled
                                                ? 'opacity-40 cursor-not-allowed'
                                                : 'hover:bg-slate-700/30 cursor-pointer'
                                        }`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                                isGolden
                                                    ? 'bg-orange-500 border-orange-500'
                                                    : 'border-slate-600'
                                            }`}>
                                                {isGolden && (
                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                                                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-200 font-medium">{kw.keyword}</span>
                                                {isGolden && (
                                                    <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">🔑 黄金词</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                kw.source === 'user'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-slate-700 text-slate-400'
                                            }`}>
                                                {kw.source === 'user' ? '用户' : 'LLM'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {kw.bestScore !== undefined ? (
                                                <span className={`font-bold ${scoreColor(kw.bestScore)}`}>
                                                    {kw.bestScore}
                                                </span>
                                            ) : (
                                                <span className="text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {simpScore !== undefined ? (
                                                <span className={`text-sm ${scoreColor(simpScore)}`}>{simpScore}</span>
                                            ) : (
                                                <span className="text-slate-600 text-sm">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {tradScore !== undefined ? (
                                                <span className={`text-sm ${scoreColor(tradScore)}`}>{tradScore}</span>
                                            ) : (
                                                <span className="text-slate-600 text-sm">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>

            {/* Confirm button */}
            <div className="flex justify-end">
                <button
                    onClick={onConfirm}
                    disabled={goldenCount === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    确认黄金关键词，进入 Phase 2
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
