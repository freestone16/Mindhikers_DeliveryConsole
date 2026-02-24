import React from 'react';
import { TrendingUp, Globe, Search, MessageSquare, Check, Twitter } from 'lucide-react';
import type { MarketingModule } from '../types';

interface MarketingSectionProps {
    data: MarketingModule;
    onUpdate: (newData: MarketingModule) => void;
}

export const MarketingSection = ({ data, onUpdate }: MarketingSectionProps) => {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const feedbackRef = React.useRef<string>('');

    // If strategy is missing (init state), provide blank structure to avoid crash
    const strategy = data.strategy || {
        seo: { titleCandidates: [], description: '', keywords: [], competitorAnalysis: '' },
        social: { twitterThread: '', redditPost: '' },
        geo: { locationTags: [], culturalRelevance: '' }
    };

    const handleFeedbackChange = (val: string) => {
        onUpdate({ ...data, feedback: val });
    };

    const handleSubmit = () => {
        feedbackRef.current = data.feedback; // Snapshot feedback as "submitted version"
        onUpdate({ ...data, isSubmitted: true });
        setIsSubmitting(true);
    };

    // Simulate backend processing reset (mock) or rely on real backend update to clear exact-match
    // For now, let's keep it green if isSubmitted is true
    React.useEffect(() => {
        if (isSubmitting && data.feedback !== feedbackRef.current) {
            setIsSubmitting(false); // Reset if user changes feedback after submit
            onUpdate({ ...data, isSubmitted: false });
        }
    }, [data.feedback, isSubmitting, onUpdate]);


    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-6">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                    <h2 className="font-semibold text-white">Marketing Master (Results)</h2>
                    <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-xs ml-2">Full Strategy Report</span>
                </div>
            </div>

            <div className="p-6 space-y-6">

                {/* 1. SEO Card */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-4">
                        <Search className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">SEO Matrix</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">High-CTR Title Candidates</label>
                            <ul className="space-y-2">
                                {strategy.seo.titleCandidates?.map((title, i) => (
                                    <li key={i} className="text-sm text-white bg-slate-800 p-2 rounded border border-slate-700/50">
                                        {title}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Killer Keywords</label>
                            <div className="flex flex-wrap gap-2">
                                {strategy.seo.keywords?.map((kw, i) => (
                                    <span key={i} className="text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                        #{kw}
                                    </span>
                                ))}
                            </div>
                            <label className="text-xs text-slate-500 block mt-4 mb-1">Description</label>
                            <p className="text-xs text-slate-400 bg-slate-800 p-2 rounded">{strategy.seo.description}</p>
                        </div>
                    </div>
                </div>

                {/* 2. Social & Geo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center gap-2 mb-4">
                            <Twitter className="w-4 h-4 text-sky-400" />
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Social Thread</h3>
                        </div>
                        <div className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-800 p-3 rounded h-40 overflow-y-auto">
                            {strategy.social.twitterThread}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center gap-2 mb-4">
                            <Globe className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">GEO Compliance</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Location Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {strategy.geo.locationTags?.map((tag, i) => (
                                        <span key={i} className="text-xs text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Cultural Relevance</label>
                                <p className="text-xs text-slate-400">{strategy.geo.culturalRelevance}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feedback Area */}
                <div className="pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Strategy Feedback / Approval:</span>
                    </div>
                    <textarea
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-orange-500 mb-2"
                        placeholder="Approve this strategy or request specific SEO adjustments..."
                        rows={2}
                        value={data.feedback || ''}
                        onChange={(e) => handleFeedbackChange(e.target.value)}
                    />
                    <button
                        className={`w-full py-2 text-sm font-medium rounded transition-all duration-300 flex items-center justify-center gap-2
                            ${data.isSubmitted
                                ? 'bg-green-600 text-white cursor-default'
                                : 'bg-orange-600 hover:bg-orange-500 text-white'}`}
                        onClick={handleSubmit}
                        disabled={data.isSubmitted}
                    >
                        {data.isSubmitted ? (
                            <>
                                <Check className="w-4 h-4" />
                                Strategy Approved & Queued
                            </>
                        ) : 'Confirm Marketing Strategy'}
                    </button>
                </div>

            </div>
        </div>
    );
};
