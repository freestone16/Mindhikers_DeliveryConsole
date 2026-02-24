import { useState } from 'react';
import { X, Check, MessageSquare, AlertCircle, FileText, Video } from 'lucide-react';
import type { ShortItem } from '../types';

interface ReviewModalProps {
    item: ShortItem;
    isOpen: boolean;
    onClose: () => void;
    onApprove: (id: string, stage: 'script' | 'render') => void;
    onReject: (id: string, stage: 'script' | 'render', comment: string) => void;
}

export const ReviewModal = ({ item, isOpen, onClose, onApprove, onReject }: ReviewModalProps) => {
    const [comment, setComment] = useState('');
    const [activeTab, setActiveTab] = useState<'content' | 'history'>('content');

    if (!isOpen) return null;

    const currentStage = item.status === 'script_review' ? 'script' :
        item.status === 'render_review' ? 'render' : null;

    if (!currentStage) return null; // Should not happen if modal is open only for review states

    const handleApprove = () => {
        onApprove(item.id, currentStage);
        onClose();
    };

    const handleReject = () => {
        if (!comment.trim()) {
            alert('Please provide a comment for rejection (required for AI fix).');
            return;
        }
        onReject(item.id, currentStage, comment);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${currentStage === 'script' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {currentStage === 'script' ? <FileText className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Review {currentStage === 'script' ? 'Script' : 'Render'}</h2>
                            <p className="text-xs text-slate-400">{item.title} (ID: {item.id})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
                        {activeTab === 'content' ? (
                            <div className="space-y-4">
                                {currentStage === 'script' ? (
                                    <div className="prose prose-invert max-w-none">
                                        <div className="bg-slate-900 p-4 rounded border border-slate-800 font-mono text-sm whitespace-pre-wrap">
                                            {/* In real app, we might load content from file. For now showing path */}
                                            <p className="text-slate-500 italic mb-2">Script Source: {item.scriptPath}</p>
                                            <p>[Script content would be loaded here...]</p>
                                            <p>{item.description}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aspect-[9/16] max-w-xs mx-auto bg-black rounded-lg overflow-hidden border border-slate-800">
                                        <video className="w-full h-full object-cover" controls src={`http://localhost:3002/video/${item.id}.mp4`}>
                                            <p className="text-white text-center mt-10">Video Preview Placeholder</p>
                                            <p className="text-xs text-slate-500 text-center">({item.videoPath})</p>
                                        </video>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-400 text-xs uppercase mb-4">Review History</h3>
                                {item.reviewHistory.length === 0 ? (
                                    <p className="text-slate-500 italic text-sm">No history yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {item.reviewHistory.map((entry, idx) => (
                                            <div key={idx} className="flex gap-3 text-sm bg-slate-900 p-3 rounded border border-slate-800">
                                                <div className={`mt-1 ${entry.action === 'approve' ? 'text-green-500' : 'text-red-500'}`}>
                                                    {entry.action === 'approve' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`font-bold uppercase text-xs ${entry.action === 'approve' ? 'text-green-400' : 'text-red-400'}`}>
                                                            {entry.action}d
                                                        </span>
                                                        <span className="text-slate-500 text-xs">{entry.stage} stage</span>
                                                        <span className="text-slate-600 text-xs">• {new Date(entry.timestamp).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-slate-300">{entry.comment}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Action Area */}
                    <div className="w-full md:w-80 bg-slate-900 border-l border-slate-700 p-6 flex flex-col gap-6">
                        {/* Tabs */}
                        <div className="flex bg-slate-950 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('content')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'content' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Preview
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                History
                            </button>
                        </div>

                        {/* Feedback Input */}
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                Feedback / Instructions
                            </label>
                            <textarea
                                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500 resize-none placeholder:text-slate-600"
                                placeholder={currentStage === 'script' ? "Example: The hook is too long, make it punchier..." : "Example: The subtitles are cut off in frame..."}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                                * Detailed feedback helps the AI fix issues automatically.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleReject}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg font-medium transition-colors border border-red-500/20"
                            >
                                <MessageSquare className="w-4 h-4" />
                                Request Changes
                            </button>
                            <button
                                onClick={handleApprove}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-green-500/20"
                            >
                                <Check className="w-4 h-4" />
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
