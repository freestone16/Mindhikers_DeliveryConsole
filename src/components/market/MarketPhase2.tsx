import React from 'react';
import { BarChart3, Check, Loader2 } from 'lucide-react';
import type { TitleTagSet } from '../../types';

interface MarketPhase2Props {
    titleTagSets: TitleTagSet[];
    selectedSetId?: string;
    onSelect: (id: string) => void;
    onRescore: (id: string) => void;
    isScoring: boolean;
}

export const MarketPhase2: React.FC<MarketPhase2Props> = ({
    titleTagSets,
    selectedSetId,
    onSelect,
    onRescore,
    isScoring
}) => {
    const sortedSets = [...titleTagSets].sort((a, b) =>
        (b.tubeBuddyScore?.overall || 0) - (a.tubeBuddyScore?.overall || 0)
    );

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-0 overflow-hidden">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-400" />
                    <h3 className="text-lg font-semibold text-white">Phase 2: LLM 返回与 TubeBuddy 打分评估</h3>
                </div>
                <span className="text-sm text-slate-400">
                    {titleTagSets.filter(s => s.status === 'scored').length} / {titleTagSets.length} 已打分
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/50 text-slate-400 text-sm">
                            <th className="p-4 font-medium border-b border-slate-700 w-16 text-center">序号</th>
                            <th className="p-4 font-medium border-b border-slate-700 w-32">条目名称</th>
                            <th className="p-4 font-medium border-b border-slate-700">内容</th>
                            <th className="p-4 font-medium border-b border-slate-700 w-32 text-center">用户确认</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-sm">
                        {sortedSets.map((set, i) => {
                            const isSelected = selectedSetId === set.id;
                            const rowSpan = set.description ? 3 : 2;
                            const rowBg = isSelected ? 'bg-orange-500/10' : 'hover:bg-slate-800/80 transition-colors';

                            return (
                                <React.Fragment key={set.id}>
                                    {/* 视频 Title 行 */}
                                    <tr className={rowBg}>
                                        <td className="p-4 align-top text-slate-500 font-mono text-center border-b border-slate-700/50" rowSpan={rowSpan}>
                                            <div className="font-bold text-lg">{i + 1}</div>
                                            {set.tubeBuddyScore && (
                                                <div className="mt-2 flex flex-col items-center">
                                                    <span className="text-[10px] text-slate-400">黄金得分</span>
                                                    <span className="text-orange-400 font-bold">{set.tubeBuddyScore.overall}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 align-top text-slate-300 font-medium">视频 Title</td>
                                        <td className="p-4 align-top">
                                            <div className="text-white font-medium text-base mb-1">{set.title}</div>
                                            {set.tubeBuddyScore && (
                                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 bg-slate-900/50 p-2 rounded">
                                                    <span>搜索量: <span className="text-blue-400">{set.tubeBuddyScore.searchVolume}</span></span>
                                                    <span>竞争机会: <span className="text-yellow-400">{set.tubeBuddyScore.competition ?? '待校准'}</span></span>
                                                    <span>相关度: <span className="text-green-400">{set.tubeBuddyScore.relevance ?? '-'}</span></span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle text-center border-b border-slate-700/50" rowSpan={rowSpan}>
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <button
                                                    onClick={() => onSelect(set.id)}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSelected
                                                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 scale-110'
                                                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-green-400'
                                                        }`}
                                                >
                                                    <Check className="w-6 h-6" />
                                                </button>
                                                {!set.tubeBuddyScore && set.status !== 'scoring' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onRescore(set.id); }}
                                                        disabled={isScoring}
                                                        className="py-1 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-[11px] text-orange-400 whitespace-nowrap transition-colors"
                                                    >
                                                        TubeBuddy 评估
                                                    </button>
                                                )}
                                                {set.status === 'scoring' && (
                                                    <span className="text-[11px] text-orange-400 flex items-center gap-1 border border-orange-400/30 px-2 py-1 rounded bg-orange-400/10">
                                                        <Loader2 className="w-3 h-3 animate-spin" /> 打分中
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* 视频描述 行 (如果存在) */}
                                    {set.description && (
                                        <tr className={rowBg}>
                                            <td className="p-4 align-top text-slate-300 font-medium">视频描述</td>
                                            <td className="p-4 align-top text-slate-400 text-sm whitespace-pre-wrap">{set.description}</td>
                                        </tr>
                                    )}

                                    {/* Hash Tags 行 */}
                                    <tr className={rowBg}>
                                        <td className="p-4 align-top text-slate-300 font-medium border-b border-slate-700/50">Hash Tags</td>
                                        <td className="p-4 align-top border-b border-slate-700/50">
                                            <div className="flex flex-wrap gap-2">
                                                {set.tags.map((tag, j) => (
                                                    <span key={j} className="text-xs font-mono bg-slate-900/80 border border-slate-700 text-blue-400 px-2.5 py-1 rounded-md">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                        {sortedSets.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">
                                    尚无 LLM 生成结果，请在 Phase 1 生成
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
