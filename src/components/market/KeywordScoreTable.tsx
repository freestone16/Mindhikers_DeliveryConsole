/**
 * KeywordScoreTable.tsx — Phase 1, Sub-step 1.2
 *
 * Shows TubeBuddy scoring results for all candidate keywords.
 * Supports retry per keyword, rescore all, and append new keywords for scoring.
 */
import React, { useState } from 'react';
import { Loader2, RefreshCw, Plus, ChevronRight } from 'lucide-react';
import type { CandidateKeyword, KeywordVariant, MarketModule_V3 } from '../../types';

interface KeywordScoreTableProps {
    data: MarketModule_V3;
    projectId: string;
    onUpdate: (newData: MarketModule_V3) => void;
    onStartScoring: () => void;
    onRetryKeyword: (keywordId: string) => void;
    onRescoreAll: () => void;
    onAddAndScore: (keyword: string) => void;
    onGoToSelection: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
    if (score >= 80) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
}

function scoreBg(score: number): string {
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 70) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
}

function ScoreCell({
    value,
    label,
    pendingText = '—',
}: {
    value: number | undefined;
    label?: string;
    pendingText?: string;
}) {
    if (value === undefined) {
        return <span className="text-xs text-slate-500">{label ?? pendingText}</span>;
    }
    return (
        <span className="inline-flex flex-col items-end leading-tight">
            <span className={`font-semibold ${scoreColor(value)}`}>{value}</span>
            {label && <span className="text-[10px] text-slate-500">{label}</span>}
        </span>
    );
}

function VariantStatusBadge({ variant }: { variant: KeywordVariant }) {
    switch (variant.status) {
        case 'pending':
            return <span title="等待评分">⏳</span>;
        case 'scoring':
            return <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400 inline" />;
        case 'scored':
            return <span title="已完成">✅</span>;
        case 'error':
            return <span title={variant.errorMessage ?? '评分失败'}>⚠️</span>;
        default:
            return null;
    }
}

function isScoringDone(candidates: CandidateKeyword[]): boolean {
    if (candidates.length === 0) return false;
    return candidates.every((kw) =>
        kw.variants.every((v) => v.status === 'scored' || v.status === 'error')
    );
}

function scoringProgress(candidates: CandidateKeyword[]): { done: number; total: number } {
    let done = 0;
    let total = 0;
    for (const kw of candidates) {
        for (const v of kw.variants) {
            total++;
            if (v.status === 'scored' || v.status === 'error') done++;
        }
    }
    return { done, total };
}

function isCurrentlyScoring(candidates: CandidateKeyword[]): boolean {
    return candidates.some((kw) => kw.variants.some((v) => v.status === 'scoring'));
}

function estimateRemainingSeconds(
    candidates: CandidateKeyword[],
    avgMs: number
): number {
    const remaining = candidates.reduce(
        (sum, kw) => sum + kw.variants.filter((v) => v.status === 'pending' || v.status === 'scoring').length,
        0
    );
    return Math.round((remaining * avgMs) / 1000);
}

// ── Component ──────────────────────────────────────────────────────────────

export const KeywordScoreTable: React.FC<KeywordScoreTableProps> = ({
    data,
    projectId: _projectId,
    onUpdate: _onUpdate,
    onStartScoring,
    onRetryKeyword,
    onRescoreAll,
    onAddAndScore,
    onGoToSelection,
}) => {
    const [appendInput, setAppendInput] = useState('');

    const { done, total } = scoringProgress(data.candidates);
    const allDone = isScoringDone(data.candidates);
    const scoring = isCurrentlyScoring(data.candidates);
    const notStarted = data.candidates.every((kw) => kw.variants.every((v) => v.status === 'pending'));

    // Estimate based on average scored variant duration
    const scoredVariants = data.candidates.flatMap((kw) =>
        kw.variants.filter((v) => v.status === 'scored' && v.scoringDuration)
    );
    const avgMs =
        scoredVariants.length > 0
            ? scoredVariants.reduce((s, v) => s + (v.scoringDuration ?? 0), 0) / scoredVariants.length
            : 8000; // fallback 8s per variant
    const estSeconds = scoring ? estimateRemainingSeconds(data.candidates, avgMs) : 0;

    const handleAppend = () => {
        const text = appendInput.trim();
        if (!text) return;
        onAddAndScore(text);
        setAppendInput('');
    };

    const handleAppendKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleAppend();
    };

    return (
        <div className="space-y-4">
            {/* Progress bar */}
            {(scoring || (total > 0 && !allDone && !notStarted)) && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                            正在评估关键词… ({done}/{total})
                        </span>
                        {scoring && estSeconds > 0 && (
                            <span className="text-xs text-slate-500">
                                预计还需 ~{estSeconds}s
                            </span>
                        )}
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div
                            className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
                        />
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">TubeBuddy 评分结果</span>
                    <div className="flex items-center gap-2">
                        {notStarted && (
                            <button
                                onClick={onStartScoring}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors"
                            >
                                <RefreshCw className="w-3 h-3" />
                                开始 TubeBuddy 评分
                            </button>
                        )}
                        {allDone && (
                            <button
                                onClick={onRescoreAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600 transition-colors border border-slate-600"
                            >
                                <RefreshCw className="w-3 h-3" />
                                全部重新评分
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700 text-left">
                                <th className="px-4 py-2.5 text-xs font-medium text-slate-500 w-8">#</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-slate-500">关键词</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-slate-500">语言</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">综合评分</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">搜索量</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">竞争机会</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">优化机会</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">相关度</th>
                                <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-center">状态</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {data.candidates.map((kw, kwIdx) =>
                                kw.variants.map((variant, vIdx) => {
                                    const score = variant.tubeBuddyScore;
                                    const isFirstVariant = vIdx === 0;
                                    return (
                                        <tr
                                            key={`${kw.id}-${variant.script}`}
                                            className={`hover:bg-slate-700/20 transition-colors ${
                                                score ? scoreBg(score.overall) : ''
                                            }`}
                                        >
                                            {/* Index — only on first variant row */}
                                            <td className="px-4 py-2.5 text-xs text-slate-600">
                                                {isFirstVariant ? kwIdx + 1 : ''}
                                            </td>

                                            {/* Keyword text — only on first variant row */}
                                            <td className="px-4 py-2.5">
                                                {isFirstVariant ? (
                                                    <span className="text-slate-200 font-medium">{kw.keyword}</span>
                                                ) : (
                                                    <span className="text-slate-500 text-xs pl-2">↳ {variant.text}</span>
                                                )}
                                            </td>

                                            {/* Script tag */}
                                            <td className="px-4 py-2.5">
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                    variant.script === 'simplified'
                                                        ? 'bg-blue-500/15 text-blue-400'
                                                        : 'bg-purple-500/15 text-purple-400'
                                                }`}>
                                                    {variant.script === 'simplified' ? '简' : '繁'}
                                                </span>
                                            </td>

                                            {/* Scores */}
                                            <td className="px-4 py-2.5 text-right">
                                                <ScoreCell value={score?.overall} />
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <ScoreCell value={score?.searchVolume} label={score?.searchVolumeLabel} />
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <ScoreCell
                                                    value={score?.competition}
                                                    label={score?.competitionLabel}
                                                    pendingText="待校准"
                                                />
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <ScoreCell
                                                    value={score?.optimization}
                                                    label={score?.optimizationLabel}
                                                    pendingText="待校准"
                                                />
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <ScoreCell value={score?.relevance} />
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-2.5 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <VariantStatusBadge variant={variant} />
                                                    {variant.status === 'error' && (
                                                        <button
                                                            onClick={() => onRetryKeyword(kw.id)}
                                                            className="text-xs text-orange-400 hover:text-orange-300 underline"
                                                            title={variant.errorMessage}
                                                        >
                                                            重试
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}

                            {data.candidates.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500 text-sm">
                                        暂无候选关键词，请先完成 1.1 候选词生成
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Append input */}
                <div className="px-5 py-3 border-t border-slate-700 bg-slate-900/30">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 flex-shrink-0">追加关键词</span>
                        <input
                            type="text"
                            value={appendInput}
                            onChange={(e) => setAppendInput(e.target.value)}
                            onKeyDown={handleAppendKeyDown}
                            placeholder="输入关键词后点击追加评分"
                            className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-colors"
                        />
                        <button
                            onClick={handleAppend}
                            disabled={!appendInput.trim()}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-slate-600"
                        >
                            <Plus className="w-3 h-3" />
                            追加评分
                        </button>
                    </div>
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

            {/* Proceed button */}
            {allDone && (
                <div className="flex justify-end">
                    <button
                        onClick={onGoToSelection}
                        className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                    >
                        确认选择黄金关键词
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};
