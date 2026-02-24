import { Image, Trash2, Plus, Palette, Layout, Type, Check } from 'lucide-react';
import type { ThumbnailModule, ThumbnailVariant } from '../types';

interface ThumbnailSectionProps {
    data: ThumbnailModule;
    onUpdate: (newData: ThumbnailModule) => void;
}

export const ThumbnailSection = ({ data, onUpdate }: ThumbnailSectionProps) => {

    const handleVariantUpdate = (id: string, field: keyof ThumbnailVariant, value: any) => {
        const newVariants = data.variants.map(v =>
            v.id === id ? { ...v, [field]: value } : v
        );
        onUpdate({ ...data, variants: newVariants });
    };

    const deleteVariant = (id: string) => {
        const newVariants = data.variants.map(v =>
            v.id === id ? { ...v, status: 'deleted' as const } : v
        );
        onUpdate({ ...data, variants: newVariants });
    };

    const activeVariants = data.variants.filter(v => v.status !== 'deleted');

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-6">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <Image className="w-5 h-5 text-pink-400" />
                    <h2 className="font-semibold text-white">Thumbnail Master (Visual Specs)</h2>
                    <span className="bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded text-xs ml-2">Pro Specs</span>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 gap-6">
                    {activeVariants.length === 0 && (
                        <div className="text-center p-8 text-slate-500 italic bg-slate-900/30 rounded border border-slate-700 border-dashed">
                            Waiting for Thumbnail Master to propose visual concepts...
                        </div>
                    )}

                    {activeVariants.map(variant => (
                        <div key={variant.id} className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col md:flex-row">
                            {/* Left: Content & Specs */}
                            <div className="flex-1 p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-lg font-bold text-white">{variant.name}</h3>
                                    <button
                                        onClick={() => deleteVariant(variant.id)}
                                        className="text-slate-600 hover:text-red-400 transition-colors"
                                        title="Discard"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <p className="text-slate-300 text-sm mb-4 leading-relaxed">{variant.content}</p>

                                {/* Visual Specs Grid */}
                                <div className="grid grid-cols-3 gap-3 text-xs bg-slate-950/50 p-3 rounded border border-slate-800">
                                    <div>
                                        <div className="flex items-center gap-1 text-slate-500 mb-1">
                                            <Type className="w-3 h-3" /> <span className="uppercase font-bold tracking-wider">Font</span>
                                        </div>
                                        <div className="text-slate-300">{variant.visualSpecs?.font || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1 text-slate-500 mb-1">
                                            <Layout className="w-3 h-3" /> <span className="uppercase font-bold tracking-wider">Layout</span>
                                        </div>
                                        <div className="text-slate-300">{variant.visualSpecs?.layout || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1 text-slate-500 mb-1">
                                            <Palette className="w-3 h-3" /> <span className="uppercase font-bold tracking-wider">Palette</span>
                                        </div>
                                        <div className="flex gap-1">
                                            {variant.visualSpecs?.colorPalette?.map((c, i) => (
                                                <div key={i} className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: c }} title={c} />
                                            )) || <span className="text-slate-500">N/A</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Feedback & Action */}
                            <div className="md:w-72 bg-slate-950/30 border-l border-slate-700 p-4 flex flex-col gap-3">
                                <label className="text-xs text-slate-500 uppercase font-bold">Feedback / Tweaks</label>
                                <textarea
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:border-pink-500 focus:outline-none resize-none"
                                    placeholder="Need different font? Brighter colors?"
                                    value={variant.comment}
                                    onChange={(e) => handleVariantUpdate(variant.id, 'comment', e.target.value)}
                                />
                                <button className="bg-pink-600 hover:bg-pink-500 text-white text-sm font-medium py-2 rounded transition-colors flex items-center justify-center gap-2">
                                    <Check className="w-4 h-4" /> Select This Plan
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 text-xs text-slate-500 flex items-center gap-2 justify-center">
                    <Plus className="w-3 h-3" />
                    <span>Real-time: Experts are generating new variants...</span>
                </div>
            </div>
        </div>
    );
};
