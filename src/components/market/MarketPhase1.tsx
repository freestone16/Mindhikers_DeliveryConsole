import React, { useState } from 'react';
import { Sparkles, FileText } from 'lucide-react';
import type { MarketModule_V2 } from '../../types';

interface MarketPhase1Props {
    data: MarketModule_V2;
    onUpdate: (data: MarketModule_V2) => void;
    onGenerate: () => void;
    isGenerating: boolean;
}

export const MarketPhase1: React.FC<MarketPhase1Props> = ({
    data,
    onUpdate,
    onGenerate,
    isGenerating
}) => {
    const [count, setCount] = useState(data.generationConfig?.count || 5);
    const [focusKeywords, setFocusKeywords] = useState(
        data.generationConfig?.focusKeywords?.join(', ') || ''
    );

    const handleGenerate = () => {
        onUpdate({
            ...data,
            generationConfig: {
                count,
                focusKeywords: focusKeywords.split(',').map(k => k.trim()).filter(Boolean),
                language: 'zh'
            }
        });
        onGenerate();
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-semibold text-white">Phase 1: SEO 方案生成</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-2">已选脚本</label>
                    <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-3 border border-slate-700">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-300">
                            {data.selectedScript?.filename || '未选择脚本'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">生成数量</label>
                        <input
                            type="number"
                            min={3}
                            max={10}
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value) || 5)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">聚焦关键词 (逗号分隔)</label>
                        <input
                            type="text"
                            value={focusKeywords}
                            onChange={(e) => setFocusKeywords(e.target.value)}
                            placeholder="AI, 学习, 神经科学"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !data.selectedScript}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 
                               disabled:text-slate-500 rounded-lg font-medium text-white transition-colors
                               flex items-center justify-center gap-2"
                >
                    {isGenerating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            生成中...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            生成 SEO 方案
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
