/**
 * MarketPhase2New.tsx — Phase 2: 营销方案生成与审阅
 *
 * Sprint 1: 骨架组件（显示黄金词信息 + 占位区域）
 * Sprint 4: 完整实现（SRT 上传 + Tab 切换 + 6 行审阅表格 + ChatPanel 辅助 + 双格式输出）
 */
import React from 'react';
import { LayoutList, Loader2, ArrowLeft } from 'lucide-react';
import type { MarketModule_V3 } from '../../types';

export interface MarketPhase2NewProps {
    data: MarketModule_V3;
    projectId: string;
    onUpdate: (newData: MarketModule_V3) => void;
    onGoToPhase1: () => void;
}

export const MarketPhase2New: React.FC<MarketPhase2NewProps> = ({
    data,
    projectId,
    onUpdate,
    onGoToPhase1,
}) => {
    // 找到已选黄金词的信息
    const goldenKWs = data.candidates.filter(c => data.goldenKeywords.includes(c.id));

    return (
        <div className="space-y-4">
            {/* ── 黄金词信息条 ── */}
            {goldenKWs.length > 0 && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm text-slate-400 flex-shrink-0">黄金关键词：</span>
                        {goldenKWs.map(kw => (
                            <div key={kw.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
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
            )}

            {/* ── SRT 字幕上传占位 ── */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 border-dashed p-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div className="flex-1">
                        <div className="text-slate-300 text-sm font-medium">SRT 字幕上传（可选）</div>
                        <div className="text-slate-500 text-xs mt-0.5">上传 .srt 字幕文件，自动填充视频描述中的时间轴部分</div>
                    </div>
                    <div className="text-xs text-slate-600 border border-slate-600 px-2 py-1 rounded">Sprint 4 开发中</div>
                </div>
            </div>

            {/* ── Tab 区域占位（1-3 套方案） ── */}
            {data.goldenKeywords.length > 0 && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    {/* Tab Bar */}
                    <div className="flex border-b border-slate-700 bg-slate-900/40">
                        {data.goldenKeywords.map((kwId, idx) => {
                            const kw = data.candidates.find(c => c.id === kwId);
                            const plan = data.plans.find(p => p.keywordId === kwId);
                            const isActive = data.activeTabIndex === idx;
                            return (
                                <button
                                    key={kwId}
                                    onClick={() => onUpdate({ ...data, activeTabIndex: idx })}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm border-r border-slate-700/50 transition-colors ${
                                        isActive
                                            ? 'bg-orange-500/10 text-orange-300 border-b-2 border-b-orange-500'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                                    }`}
                                >
                                    <span>🔑</span>
                                    <span className="font-medium">{kw?.keyword || kwId}</span>
                                    {kw?.bestScore && (
                                        <span className="text-xs opacity-60">({kw.bestScore})</span>
                                    )}
                                    {plan && plan.generationStatus === 'generating' && (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    )}
                                    {plan && plan.generationStatus === 'ready' && (
                                        <span className="text-green-400 text-xs">✓</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content — 方案表格占位 */}
                    <div className="p-8 text-center">
                        <LayoutList className="w-12 h-12 text-orange-400/40 mx-auto mb-4" />
                        <h3 className="text-slate-300 font-semibold mb-2">营销方案审阅表格</h3>
                        <p className="text-slate-500 text-sm mb-4 max-w-sm mx-auto leading-relaxed">
                            LLM 将为每个黄金关键词生成完整方案：
                            标题 / 视频描述（8 子区块） / 缩略图 / Playlist / Tags / 其他设置
                        </p>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded-full text-xs text-slate-500 border border-slate-700/50">
                            <Loader2 className="w-3 h-3" />
                            <span>Sprint 4 开发中</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 无黄金词时的引导 ── */}
            {data.goldenKeywords.length === 0 && (
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
            )}
        </div>
    );
};
