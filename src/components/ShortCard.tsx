import { Play, FileText, Check, Clock, Upload, Film, MessageSquare, Link, Settings } from 'lucide-react';
import type { ShortItem, ShortStatus } from '../types';

interface ShortCardProps {
    item: ShortItem;
    onReviewCriteria: (id: string) => void;
    onStartRender: (id: string) => void;
    onLinkVideo: (id: string) => void;
    onSchedule: (id: string) => void;
    onUpload: (id: string) => void;
    onEdit: (id: string) => void;
}

const STATUS_CONFIG: Record<ShortStatus, { label: string; color: string; icon: any }> = {
    draft: { label: 'Draft', color: 'text-slate-400 border-slate-600', icon: FileText },
    linked: { label: 'Linked', color: 'text-indigo-400 border-indigo-500 bg-indigo-500/10', icon: Link },
    script_review: { label: 'Script Review', color: 'text-blue-400 border-blue-500 bg-blue-500/10', icon: MessageSquare },
    rendering: { label: 'Rendering...', color: 'text-orange-400 border-orange-500 bg-orange-500/10 animate-pulse', icon: Film },
    render_review: { label: 'Render Review', color: 'text-purple-400 border-purple-500 bg-purple-500/10', icon: Play },
    approved: { label: 'Approved', color: 'text-emerald-400 border-emerald-500 bg-emerald-500/10', icon: Check },
    scheduled: { label: 'Scheduled', color: 'text-cyan-400 border-cyan-500 bg-cyan-500/10', icon: Clock },
    uploading: { label: 'Uploading...', color: 'text-yellow-400 border-yellow-500 bg-yellow-500/10 animate-pulse', icon: Upload },
    published: { label: 'Published', color: 'text-green-500 border-green-600 bg-green-500/20', icon: Check }
};




export const ShortCard = ({ item, onReviewCriteria, onStartRender, onLinkVideo, onSchedule, onUpload, onEdit }: ShortCardProps) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
    const StatusIcon = status.icon;

    // Helper to format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex items-center justify-between hover:border-slate-600 transition-colors group">
            {/* Left: Info */}
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${status.color}`}>
                    <StatusIcon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-medium text-white">{item.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">#{item.id}</span>
                        <span>Updated: {formatDate(item.updatedAt)}</span>
                        {item.scheduledDate && (
                            <span className="text-cyan-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.scheduledDate} {item.scheduledTime}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full border ${status.color} font-medium`}>
                    {status.label}
                </span>

                {/* Contextual Actions */}
                {item.status === 'script_review' && (
                    <button
                        onClick={() => onReviewCriteria(item.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
                    >
                        Review Script
                    </button>
                )}

                {item.status === 'rendering' && (
                    <span className="text-xs text-slate-500 italic">Wait to finish...</span>
                )}

                {(item.status === 'draft') && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => onLinkVideo(item.id)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
                        >
                            <Link className="w-3 h-3" /> Link Video
                        </button>
                        <button
                            onClick={() => onStartRender(item.id)}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition-colors flex items-center gap-1 opacity-50 cursor-not-allowed"
                            title="Render momentarily disabled (v2.1)"
                        >
                            <Play className="w-3 h-3" /> Render
                        </button>
                    </div>
                )}

                {item.status === 'linked' && (
                    <button
                        onClick={() => onSchedule(item.id)}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded transition-colors"
                    >
                        Schedule
                    </button>
                )}

                {item.status === 'render_review' && (
                    <button
                        onClick={() => onReviewCriteria(item.id)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded transition-colors"
                    >
                        Review Video
                    </button>
                )}

                {item.status === 'approved' && (
                    <button
                        onClick={() => onSchedule(item.id)}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded transition-colors"
                    >
                        Schedule
                    </button>
                )}

                {item.status === 'scheduled' && (
                    <button
                        onClick={() => onUpload(item.id)}
                        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
                    >
                        <Upload className="w-3 h-3" /> Upload Now

                    </button>
                )}

                {/* Persistent Edit Button (v2.3) */}
                {['linked', 'approved', 'scheduled', 'published'].includes(item.status) && (
                    <button
                        onClick={() => onEdit(item.id)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        title="Edit Metadata / Settings"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div >
    );
};
