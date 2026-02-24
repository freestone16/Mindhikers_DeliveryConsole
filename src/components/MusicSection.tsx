import { Music, Headphones, ListMusic, CheckSquare } from 'lucide-react';
import type { MusicModule, BaseItem } from '../types';

interface MusicSectionProps {
    data: MusicModule;
    onUpdate: (newData: MusicModule) => void;
}

export const MusicSection = ({ data, onUpdate }: MusicSectionProps) => {




    const handleItemUpdate = (id: string, field: keyof BaseItem, value: any) => {
        const newItems = data.items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        onUpdate({ ...data, items: newItems });
    };

    const togglePhase = () => {
        onUpdate({ ...data, phase: data.phase === 1 ? 2 : 1 });
    };

    const handleSubmit = () => {
        // Persist approval state to backend via onUpdate
        onUpdate({ ...data, isConceptApproved: true });
    };



    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-6">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-purple-400" />
                    <h2 className="font-semibold text-white">Music Director (Audio)</h2>
                    <span className={`px-2 py-0.5 rounded text-xs ml-2 ${data.phase === 1 ? 'bg-purple-500/20 text-purple-300' : 'bg-green-500/20 text-green-300'}`}>
                        Phase {data.phase}: {data.phase === 1 ? 'Sonic Landscape' : 'Score Execution'}
                    </span>
                </div>
                <button onClick={togglePhase} className="text-xs text-slate-400 hover:text-white underline">
                    {data.phase === 1 ? 'Confirm Landscape & Start Scoring →' : '← Back to Landscape'}
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                {data.phase === 1 ? (
                    <div className="bg-slate-900 rounded p-4 border border-slate-700/50">
                        <h3 className="text-slate-400 text-sm uppercase font-bold mb-2 tracking-wider flex items-center gap-2">
                            <Headphones className="w-4 h-4" /> Sonic Landscape Proposal
                        </h3>
                        <div className="prose prose-invert max-w-none mb-4 text-slate-300 whitespace-pre-wrap italic">
                            {data.moodProposal || "Waiting for audio proposal..."}
                        </div>
                        {/* Feedback area for Phase 1 */}
                        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-800">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Headphones className="w-4 h-4" />
                                <span>Feedback / Adjustments:</span>
                            </div>
                            <textarea
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                placeholder="E.g., Needs more electronic elements..."
                                rows={3}
                                defaultValue={data.conceptFeedback || ''}
                                onBlur={(e) => onUpdate({ ...data, conceptFeedback: e.target.value })}
                            />
                            <button
                                className={`self-end px-4 py-2 text-sm font-medium rounded transition-all duration-300 flex items-center gap-2
                                    ${data.isConceptApproved
                                        ? 'bg-green-600 text-white cursor-default'
                                        : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
                                onClick={handleSubmit}
                                disabled={data.isConceptApproved}
                            >
                                {data.isConceptApproved ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Feedback Received, Processing...
                                    </>
                                ) : 'Submit Feedback'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                                    <th className="p-3 w-16">ID</th>
                                    <th className="p-3 w-1/4">Scene/Chapter</th>
                                    <th className="p-3">Score Plan (Artlist/Suno)</th>
                                    <th className="p-3 w-1/4">Comment</th>
                                    <th className="p-3 w-16 text-center">Done</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500 italic">No music items yet...</td>
                                    </tr>
                                )}
                                {data.items.map(item => (
                                    <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                                        <td className="p-3 font-mono text-slate-500 text-sm">{item.id}</td>
                                        <td className="p-3 font-medium text-white flex items-center gap-2">
                                            <ListMusic className="w-4 h-4 text-purple-500/50" />
                                            {item.name}
                                        </td>
                                        <td className="p-3 text-slate-300 text-sm whitespace-pre-wrap">{item.content}</td>
                                        <td className="p-3">
                                            <input
                                                type="text"
                                                value={item.comment}
                                                onChange={(e) => handleItemUpdate(item.id, 'comment', e.target.value)}
                                                className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-purple-500 focus:outline-none placeholder-slate-600"
                                                placeholder="Notes..."
                                            />
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => handleItemUpdate(item.id, 'checked', !item.checked)}
                                                className={`p-1 rounded transition-colors ${item.checked ? 'text-green-400 bg-green-400/10' : 'text-slate-600 hover:text-slate-400'}`}
                                            >
                                                <CheckSquare className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
