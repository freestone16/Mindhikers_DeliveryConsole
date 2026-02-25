import React, { useState } from 'react';
import { TrendingUp, ChevronRight } from 'lucide-react';
import type { MarketModule_V2 } from '../types';
import { mockMarketModuleV2 } from '../mocks/marketMockData';
import { MarketPhase1 } from './market/MarketPhase1';
import { MarketPhase2 } from './market/MarketPhase2';
import { MarketPhase3 } from './market/MarketPhase3';

interface MarketingSectionProps {
    data: MarketModule_V2;
    onUpdate: (newData: MarketModule_V2) => void;
}

type Phase = 1 | 2 | 3;

const phaseLabels: Record<Phase, string> = {
    1: '生成',
    2: '打分',
    3: '确认'
};

export const MarketingSection: React.FC<MarketingSectionProps> = ({ data, onUpdate }) => {
    const [phase, setPhase] = useState<Phase>(data.phase || 1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isScoring, setIsScoring] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    const currentData = data.titleTagSets.length > 0 ? data : mockMarketModuleV2;

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/market/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentData.selectedScript?.path?.split('/')[0] || 'default',
                    scriptPath: currentData.selectedScript?.path,
                    count: currentData.generationConfig?.count || 5,
                    focusKeywords: currentData.generationConfig?.focusKeywords || []
                })
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            const newSets: typeof currentData.titleTagSets = [];

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'generated') {
                            newSets.push(data.set);
                            onUpdate({ ...currentData, titleTagSets: [...newSets] });
                        }
                    }
                }
            }

            setPhase(2);
        } catch (error) {
            console.error('Generate error:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSelect = (id: string) => {
        onUpdate({ ...currentData, selectedSetId: id });
    };

    const handleRescore = async (id: string) => {
        setIsScoring(true);
        const setToScore = currentData.titleTagSets.find(s => s.id === id);
        if (!setToScore) {
            setIsScoring(false);
            return;
        }

        try {
            const response = await fetch('/api/market/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    setId: id,
                    keyword: setToScore.tags[0],
                    title: setToScore.title
                })
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'scored') {
                            const updatedSets = currentData.titleTagSets.map(s =>
                                s.id === id ? { ...s, tubeBuddyScore: data.score, status: 'scored' as const } : s
                            );
                            onUpdate({ ...currentData, titleTagSets: updatedSets });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Score error:', error);
        } finally {
            setIsScoring(false);
        }
    };

    const handleConfirm = async (editedTitle: string, editedTags: string) => {
        setIsConfirming(true);
        try {
            const response = await fetch('/api/market/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentData.selectedScript?.path?.split('/')[0] || 'default',
                    title: editedTitle,
                    tags: editedTags.split(',').map(t => t.trim()).filter(Boolean)
                })
            });

            const result = await response.json();
            if (result.success) {
                onUpdate({
                    ...currentData,
                    phase: 3,
                    finalOutput: result.output
                });
            }
        } catch (error) {
            console.error('Confirm error:', error);
        } finally {
            setIsConfirming(false);
        }
    };

    const selectedSet = currentData.titleTagSets.find(s => s.id === currentData.selectedSetId);

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-400" />
                        <h2 className="font-semibold text-white">营销大师 — TubeBuddy SEO 优化器</h2>
                        <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-xs">
                            SD-207
                        </span>
                    </div>
                </div>

                <div className="px-4 py-3 bg-slate-900/30 flex items-center gap-2">
                    {([1, 2, 3] as Phase[]).map((p) => (
                        <React.Fragment key={p}>
                            <button
                                onClick={() => setPhase(p)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors
                                    ${phase === p
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                            >
                                Phase {p}: {phaseLabels[p]}
                            </button>
                            {p < 3 && <ChevronRight className="w-4 h-4 text-slate-600" />}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {phase === 1 && (
                <MarketPhase1
                    data={currentData}
                    onUpdate={onUpdate}
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                />
            )}

            {phase === 2 && (
                <MarketPhase2
                    titleTagSets={currentData.titleTagSets}
                    selectedSetId={currentData.selectedSetId}
                    onSelect={handleSelect}
                    onRescore={handleRescore}
                    isScoring={isScoring}
                />
            )}

            {phase === 3 && (
                <MarketPhase3
                    selectedSet={selectedSet}
                    onConfirm={handleConfirm}
                    isConfirming={isConfirming}
                />
            )}
        </div>
    );
};
