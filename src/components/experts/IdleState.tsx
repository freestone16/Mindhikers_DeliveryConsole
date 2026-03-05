import { Eye, Music, Image, Video, Megaphone, PlayCircle, FileText } from 'lucide-react';
import { EXPERTS, getExpertColorClass } from '../../config/experts';
import type { SelectedScript } from '../../types';

const iconMap: Record<string, React.ElementType> = {
    Eye,
    Music,
    Image,
    Video,
    Megaphone
};

interface IdleStateProps {
    expertId: string;
    selectedScript?: SelectedScript;
    onStartWork: () => void;
}

export const IdleState = ({ expertId, selectedScript, onStartWork }: IdleStateProps) => {
    const expert = EXPERTS.find(e => e.id === expertId);
    if (!expert) return null;

    const Icon = iconMap[expert.icon] || Eye;
    const colorClass = getExpertColorClass(expert.color);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-16">
            <div className={`
                w-32 h-32 rounded-full flex items-center justify-center mb-8
                bg-slate-800/50 border-2 border-slate-700
            `}>
                <Icon className={`w-16 h-16 ${colorClass.split(' ')[0]}`} />
            </div>

            <h2 className="text-3xl font-bold text-white mb-2">{expert.name}</h2>
            <p className="text-slate-400 text-lg mb-8 text-center max-w-md">
                {expert.description}
            </p>

            {selectedScript ? (
                <div className="bg-slate-800/50 rounded-lg px-4 py-3 mb-8 flex items-center gap-3">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    <span className="text-slate-300">
                        文稿：<span className="text-emerald-400">{selectedScript.filename}</span>
                    </span>
                </div>
            ) : (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 mb-8">
                    <span className="text-yellow-400">⚠️ 请先在顶部选择文稿</span>
                </div>
            )}

            <button
                onClick={onStartWork}
                disabled={!selectedScript}
                className={`
                    flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-semibold
                    transition-all transform hover:scale-105 active:scale-95
                    ${selectedScript
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }
                `}
            >
                <PlayCircle className="w-6 h-6" />
                开始工作
            </button>

            {expertId !== 'MarketingMaster' && (
                <p className="text-slate-500 text-sm mt-6">
                    点击后将在 Antigravity 中执行 {expert.skillName} skill
                </p>
            )}
        </div>
    );
};
