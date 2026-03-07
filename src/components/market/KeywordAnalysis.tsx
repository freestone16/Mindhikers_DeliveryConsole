/**
 * KeywordAnalysis.tsx — AI Strategy Analysis Card
 *
 * Displays the LLM strategy commentary for keyword selection.
 * Shown as a standalone card with loading and empty states.
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

interface KeywordAnalysisProps {
    analysis: string | undefined;
    isLoading: boolean;
}

export const KeywordAnalysis: React.FC<KeywordAnalysisProps> = ({ analysis, isLoading }) => {
    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="text-lg leading-none">🧠</span>
                AI 策略点评
            </h4>

            {isLoading && (
                <div className="flex items-center gap-3 py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-400 flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                        <div className="h-3 bg-slate-700 rounded animate-pulse w-full" />
                        <div className="h-3 bg-slate-700 rounded animate-pulse w-4/5" />
                        <div className="h-3 bg-slate-700 rounded animate-pulse w-3/5" />
                    </div>
                </div>
            )}

            {!isLoading && !analysis && (
                <p className="text-slate-500 text-sm italic py-2">
                    完成 TubeBuddy 评分后，LLM 将生成整体策略点评
                </p>
            )}

            {!isLoading && analysis && (
                <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                    {analysis}
                </p>
            )}
        </div>
    );
};
