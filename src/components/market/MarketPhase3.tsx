import React, { useState, useEffect } from 'react';
import { Check, Edit3, Save } from 'lucide-react';
import type { TitleTagSet } from '../../types';

interface MarketPhase3Props {
    selectedSet?: TitleTagSet;
    onConfirm: (editedTitle: string, editedTags: string) => void;
    isConfirming: boolean;
}

export const MarketPhase3: React.FC<MarketPhase3Props> = ({
    selectedSet,
    onConfirm,
    isConfirming
}) => {
    const [editedTitle, setEditedTitle] = useState(selectedSet?.title || '');
    const [editedTags, setEditedTags] = useState(selectedSet?.tags?.join(', ') || '');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (selectedSet) {
            setEditedTitle(selectedSet.title);
            setEditedTags(selectedSet.tags.join(', '));
        }
    }, [selectedSet]);

    if (!selectedSet) {
        return (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
                <p className="text-slate-400">请先在 Phase 2 中选择一个方案</p>
            </div>
        );
    }

    const handleConfirm = () => {
        onConfirm(editedTitle, editedTags);
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-6">
                <Check className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Phase 3: 确认输出</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-slate-400">最终标题</label>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                        >
                            <Edit3 className="w-3 h-3" />
                            {isEditing ? '完成编辑' : '编辑'}
                        </button>
                    </div>
                    {isEditing ? (
                        <textarea
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="w-full bg-slate-900 border border-orange-500 rounded-lg p-3 text-white"
                            rows={2}
                        />
                    ) : (
                        <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                            <p className="text-white">{editedTitle}</p>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-2">最终标签</label>
                    {isEditing ? (
                        <textarea
                            value={editedTags}
                            onChange={(e) => setEditedTags(e.target.value)}
                            className="w-full bg-slate-900 border border-orange-500 rounded-lg p-3 text-white"
                            rows={2}
                            placeholder="标签1, 标签2, 标签3"
                        />
                    ) : (
                        <div className="flex flex-wrap gap-2 bg-slate-900 rounded-lg p-3 border border-slate-700">
                            {editedTags.split(',').filter(Boolean).map((tag, i) => (
                                <span key={i} className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded">
                                    #{tag.trim()}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {selectedSet.tubeBuddyScore && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                            <span className="text-green-400 font-medium">TubeBuddy 综合评分</span>
                            <span className="text-2xl font-bold text-green-300">
                                {selectedSet.tubeBuddyScore.overallScore}
                            </span>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleConfirm}
                    disabled={isConfirming || !editedTitle.trim()}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-700
                               disabled:text-slate-500 rounded-lg font-medium text-white transition-colors
                               flex items-center justify-center gap-2"
                >
                    {isConfirming ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            保存中...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            确认并保存到 05_Marketing
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
