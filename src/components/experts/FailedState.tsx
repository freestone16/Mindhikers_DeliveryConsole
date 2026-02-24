import { Eye, Music, Image, Video, Megaphone, AlertTriangle, RotateCcw } from 'lucide-react';
import { EXPERTS, getExpertColorClass } from '../../config/experts';

const iconMap: Record<string, React.ElementType> = {
    Eye,
    Music,
    Image,
    Video,
    Megaphone
};

interface FailedStateProps {
    expertId: string;
    error?: string;
    logs: string[];
    onRerun: () => void;
}

export const FailedState = ({ expertId, error, logs, onRerun }: FailedStateProps) => {
    const expert = EXPERTS.find(e => e.id === expertId);
    if (!expert) return null;

    const Icon = iconMap[expert.icon] || Eye;
    const colorClass = getExpertColorClass(expert.color);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-16">
            <div className={`
                w-32 h-32 rounded-full flex items-center justify-center mb-8
                bg-red-500/10 border-2 border-red-500
            `}>
                <AlertTriangle className="w-16 h-16 text-red-400" />
            </div>

            <h2 className="text-3xl font-bold text-white mb-2">{expert.name}</h2>
            
            <div className="flex items-center gap-2 text-red-400 mb-4">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-lg">执行失败</span>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-6 py-4 mb-6 max-w-lg">
                    <p className="text-red-400 text-center">{error}</p>
                </div>
            )}

            {logs.length > 0 && (
                <div className="bg-slate-800/80 rounded-xl p-4 max-w-lg mb-8 border border-slate-700 w-full">
                    <p className="text-slate-400 text-sm mb-3">执行日志：</p>
                    <div className="bg-slate-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                        {logs.map((log, i) => (
                            <p key={i} className="text-slate-400 text-sm font-mono">{log}</p>
                        ))}
                    </div>
                </div>
            )}

            <button
                onClick={onRerun}
                className="flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-semibold
                    bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25
                    transition-all transform hover:scale-105 active:scale-95"
            >
                <RotateCcw className="w-6 h-6" />
                重新执行
            </button>
        </div>
    );
};
