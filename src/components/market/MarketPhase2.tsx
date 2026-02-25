import React from 'react';
import { TrendingUp, Target, Zap, Heart, BarChart3 } from 'lucide-react';
import type { TitleTagSet } from '../../types';

interface MarketPhase2Props {
    titleTagSets: TitleTagSet[];
    selectedSetId?: string;
    onSelect: (id: string) => void;
    onRescore: (id: string) => void;
    isScoring: boolean;
}

const ScoreBar: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({
    label, value, icon
}) => {
    const getColor = (v: number) => {
        if (v >= 80) return 'bg-green-500';
        if (v >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="flex items-center gap-2">
            <div className="w-6 text-slate-400">{icon}</div>
            <span className="text-xs text-slate-500 w-16">{label}</span>
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${getColor(value)} transition-all duration-500`}
                    style={{ width: `${value}%` }}
                />
            </div>
            <span className="text-xs text-slate-300 w-8 text-right">{value}</span>
        </div>
    );
};

const ScoreCard: React.FC<{
    set: TitleTagSet;
    isSelected: boolean;
    onSelect: () => void;
    onRescore: () => void;
    isScoring: boolean;
}> = ({ set, isSelected, onSelect, onRescore, isScoring }) => {
    const score = set.tubeBuddyScore;

    return (
        <div
            onClick={onSelect}
            className={`bg-slate-900 rounded-xl border-2 p-4 cursor-pointer transition-all
                ${isSelected 
                    ? 'border-orange-500 ring-2 ring-orange-500/30' 
                    : 'border-slate-700 hover:border-slate-600'}`}
        >
            <div className="flex justify-between items-start mb-3">
                <span className="text-xs text-slate-500">方案 #{set.index + 1}</span>
                {set.status === 'scoring' && (
                    <span className="text-xs text-orange-400 flex items-center gap-1">
                        <div className="w-3 h-3 border border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                        打分中
                    </span>
                )}
            </div>

            <h4 className="text-sm font-medium text-white mb-2 line-clamp-2">
                {set.title}
            </h4>

            <div className="flex flex-wrap gap-1 mb-4">
                {set.tags.slice(0, 4).map((tag, i) => (
                    <span key={i} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                        #{tag}
                    </span>
                ))}
                {set.tags.length > 4 && (
                    <span className="text-xs text-slate-500">+{set.tags.length - 4}</span>
                )}
            </div>

            {score && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">综合评分</span>
                        <span className="text-2xl font-bold text-white">{score.overallScore}</span>
                    </div>
                    <ScoreBar label="搜索量" value={score.metrics.searchVolume} icon={<Target className="w-3 h-3" />} />
                    <ScoreBar label="竞争度" value={100 - score.metrics.competition} icon={<Zap className="w-3 h-3" />} />
                    <ScoreBar label="优化度" value={score.metrics.optimization} icon={<TrendingUp className="w-3 h-3" />} />
                    <ScoreBar label="相关度" value={score.metrics.relevance} icon={<Heart className="w-3 h-3" />} />
                </div>
            )}

            {!score && set.status !== 'scoring' && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRescore(); }}
                    disabled={isScoring}
                    className="w-full py-2 mt-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300"
                >
                    获取分数
                </button>
            )}
        </div>
    );
};

export const MarketPhase2: React.FC<MarketPhase2Props> = ({
    titleTagSets,
    selectedSetId,
    onSelect,
    onRescore,
    isScoring
}) => {
    const sortedSets = [...titleTagSets].sort((a, b) => 
        (b.tubeBuddyScore?.overallScore || 0) - (a.tubeBuddyScore?.overallScore || 0)
    );

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-400" />
                    <h3 className="text-lg font-semibold text-white">Phase 2: TubeBuddy 打分</h3>
                </div>
                <span className="text-sm text-slate-400">
                    {titleTagSets.filter(s => s.status === 'scored').length} / {titleTagSets.length} 已打分
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedSets.map(set => (
                    <ScoreCard
                        key={set.id}
                        set={set}
                        isSelected={selectedSetId === set.id}
                        onSelect={() => onSelect(set.id)}
                        onRescore={() => onRescore(set.id)}
                        isScoring={isScoring}
                    />
                ))}
            </div>
        </div>
    );
};
