import React, { useState } from 'react';
import { useVisualPlan } from '../hooks/useVisualPlan';
import type { VisualScene, CinematicZoomProps, BgStyle } from '../types';
import { Check, X, Film, Image as ImageIcon, Music, Clock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

export const VisualAuditPage: React.FC = () => {
    const { plan, loading, error, updateSceneStatus } = useVisualPlan();

    if (loading) return <div className="text-center p-12 text-slate-400">Loading Visual Plan...</div>;
    if (error) return <div className="text-center p-12 text-red-500">Error: {error}</div>;
    if (!plan) return <div className="text-center p-12 text-slate-400">No visual_plan.json found in current project.</div>;

    const stats = {
        total: plan.scenes.length,
        approved: plan.scenes.filter(s => s.status === 'approved').length,
        pending: plan.scenes.filter(s => s.status === 'pending_review').length,
        rejected: plan.scenes.filter(s => s.status === 'rejected').length
    };

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Scenes" value={stats.total} icon={<Film />} />
                <StatCard label="Approved" value={stats.approved} icon={<Check className="text-green-500" />} />
                <StatCard label="Pending" value={stats.pending} icon={<Clock className="text-yellow-500" />} />
                <StatCard label="Rejected" value={stats.rejected} icon={<X className="text-red-500" />} />
            </div>

            {/* Timeline */}
            <div className="space-y-4">
                {plan.scenes.map(scene => (
                    <SceneCard key={scene.id} scene={scene} onUpdate={updateSceneStatus} />
                ))}
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon }: any) => (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
        <div>
            <div className="text-slate-500 text-sm">{label}</div>
            <div className="text-2xl font-bold text-slate-200">{value}</div>
        </div>
        <div className="text-slate-400">{icon}</div>
    </div>
);

const SceneCard = ({ scene, onUpdate }: { scene: VisualScene, onUpdate: any }) => {
    const [comment, setComment] = useState(scene.review_comment || '');
    const [showVisualPrompt, setShowVisualPrompt] = useState(false);
    const [bgStyle, setBgStyle] = useState<BgStyle>(
        (scene.props as CinematicZoomProps)?.bgStyle || 'black'
    );

    const isCinematicZoom = scene.type === 'remotion' && scene.template === 'CinematicZoom';
    const zoomProps = isCinematicZoom ? (scene.props as CinematicZoomProps) : null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'border-green-900/50 bg-green-900/10';
            case 'rejected': return 'border-red-900/50 bg-red-900/10';
            default: return 'border-slate-800 bg-slate-900/50';
        }
    };

    const handleBgStyleChange = (newStyle: BgStyle) => {
        setBgStyle(newStyle);
    };

    return (
        <div className={`border rounded-lg p-4 flex gap-6 ${getStatusColor(scene.status)} transition-colors`}>
            {/* Left: Timing & Script */}
            <div className="w-1/4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span className="bg-slate-800 px-2 py-0.5 rounded">{scene.timestamp}</span>
                    <span>{scene.id}</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{scene.script_line}</p>
                <div className="mt-2">
                    {isCinematicZoom ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 rounded border border-amber-500/30 text-amber-400 bg-amber-500/10">
                            <Sparkles className="w-3 h-3" />
                            Cinematic Zoom
                        </span>
                    ) : (
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${scene.type === 'remotion' ? 'border-blue-500/30 text-blue-400' :
                            scene.type === 'seedance' ? 'border-purple-500/30 text-purple-400' :
                                'border-orange-500/30 text-orange-400'
                            }`}>
                            {scene.type}
                        </span>
                    )}
                </div>
            </div>

            {/* Center: Visual Content */}
            <div className="flex-1 space-y-3 bg-slate-950/50 p-3 rounded border border-slate-800/50">
                {isCinematicZoom && zoomProps && (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase font-bold text-amber-400/80 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                漫画推镜
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500">bgStyle:</span>
                                <select
                                    value={bgStyle}
                                    onChange={(e) => handleBgStyleChange(e.target.value as BgStyle)}
                                    className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                                >
                                    <option value="black">极简黑底</option>
                                    <option value="stripes">暗条纹底</option>
                                    <option value="dark-gradient">微弱射线底</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <div className="relative w-48 h-32 rounded-lg overflow-hidden border-2 border-amber-500/30 shadow-lg shadow-amber-500/10">
                                <img
                                    src={zoomProps.imageUrl}
                                    alt="Cinematic Zoom Preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="192" height="128"><rect fill="%231e293b" width="100%" height="100%"/><text x="50%" y="50%" fill="%2364748b" text-anchor="middle" dy=".3em" font-size="12">Image Load Error</text></svg>';
                                    }}
                                />
                                <div className="absolute bottom-1 right-1 text-[8px] bg-black/60 text-slate-300 px-1.5 py-0.5 rounded">
                                    {zoomProps.zoomStart}x → {zoomProps.zoomEnd}x
                                </div>
                            </div>
                        </div>
                        {scene.visualPrompt && (
                            <div className="mt-2">
                                <button
                                    onClick={() => setShowVisualPrompt(!showVisualPrompt)}
                                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-300 transition-colors"
                                >
                                    {showVisualPrompt ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    生图提示词
                                </button>
                                {showVisualPrompt && (
                                    <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-900/50 p-2 rounded border border-slate-800">
                                        {scene.visualPrompt}
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                )}

                {!isCinematicZoom && scene.type === 'seedance' && (
                    <>
                        <div className="text-sm font-medium text-purple-300 mb-1 flex justify-between">
                            <span>Prompt ({scene.mode || 'T2V'})</span>
                            <span className="text-xs text-slate-500 opacity-60">{scene.resolution} • {scene.duration}</span>
                        </div>
                        <p className="text-xs text-slate-400 italic mb-2">"{scene.prompt}"</p>
                        {scene.references && (
                            <div className="flex gap-2 mt-2">
                                {scene.references.images?.map((img, i) => (
                                    <div key={i} className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                        <ImageIcon className="w-3 h-3 text-slate-500" />
                                        <span className="text-[10px] text-slate-300">{img}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {!isCinematicZoom && scene.type === 'remotion' && (
                    <>
                        <div className="text-sm font-medium text-blue-300 mb-1">
                            Template: {scene.template}
                        </div>
                        <pre className="text-[10px] text-slate-500 bg-slate-900 p-2 rounded overflow-x-auto">
                            {JSON.stringify(scene.props, null, 2)}
                        </pre>
                    </>
                )}

                {!isCinematicZoom && scene.type === 'artlist' && (
                    <>
                        <div className="text-sm font-medium text-orange-300 mb-1">Stock Footage Search</div>
                        <div className="flex flex-wrap gap-1">
                            {scene.search_keywords?.map((kw, i) => (
                                <span key={i} className="text-[10px] bg-orange-950/30 text-orange-400 px-2 py-1 rounded border border-orange-900/30">
                                    {kw}
                                </span>
                            ))}
                        </div>
                        {scene.search_tips && <p className="text-xs text-slate-500 mt-1">💡 {scene.search_tips}</p>}
                    </>
                )}

                {/* SFX */}
                {scene.sfx && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/50">
                        <Music className="w-3 h-3 text-pink-500" />
                        <span className="text-xs text-pink-400">{scene.sfx}</span>
                    </div>
                )}
            </div>

            {/* Right: Actions */}
            <div className="w-48 flex flex-col gap-2">
                <div className="flex gap-2">
                    <button
                        onClick={() => onUpdate(scene.id, 'approved', comment)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors ${scene.status === 'approved'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-800 hover:bg-green-700/50 text-slate-300'
                            }`}
                    >
                        <Check className="w-3 h-3" /> Approve
                    </button>
                    <button
                        onClick={() => onUpdate(scene.id, 'rejected', comment)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors ${scene.status === 'rejected'
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-800 hover:bg-red-700/50 text-slate-300'
                            }`}
                    >
                        <X className="w-3 h-3" /> Reject
                    </button>
                </div>

                <textarea
                    className="w-full h-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Feedback..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onBlur={() => {
                        if (comment !== scene.review_comment) {
                            // Optional: auto-save comment on blur
                        }
                    }}
                />
            </div>
        </div>
    );
};
