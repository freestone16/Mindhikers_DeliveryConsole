import { Clock, FileText, Loader2 } from 'lucide-react';
import { EXPERTS, getExpertColorClass } from '../../config/experts';
import type { SelectedScript } from '../../types';


interface PendingStateProps {
    expertId: string;
    projectId: string;
    selectedScript?: SelectedScript;
    startedAt: string;
    logs?: string[];
    onCancel: () => void;
}

export const PendingState = ({ expertId, projectId, selectedScript, startedAt, logs = [], onCancel }: PendingStateProps) => {
    const expert = EXPERTS.find(e => e.id === expertId);
    if (!expert) return null;

    const colorClass = getExpertColorClass(expert.color);

    const formatTime = (iso: string) => {
        const date = new Date(iso);
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-16">
            <div className={`
                w-32 h-32 rounded-full flex items-center justify-center mb-8
                ${colorClass.split(' ')[1]} border-2
                border-${expert.color}-500
            `}>
                <Loader2 className={`w-16 h-16 ${colorClass.split(' ')[0]} animate-spin`} />
            </div>

            <h2 className="text-3xl font-bold text-white mb-2">{expert.name}</h2>
            
            <div className="flex items-center gap-2 text-blue-400 mb-4">
                <Clock className="w-5 h-5" />
                <span className="text-lg">正在执行中...</span>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-6 max-w-lg mb-8 border border-slate-700">
                <p className="text-slate-300 mb-4 text-center">
                    <span className="text-emerald-400 font-semibold">{expert.skillName}</span> 正在自动执行
                </p>
                
                {selectedScript && (
                    <div className="bg-slate-900 rounded-lg p-4 mb-4 flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-slate-400 text-sm">输入文稿：</p>
                            <code className="text-emerald-400 font-mono text-sm">{selectedScript.path}</code>
                        </div>
                    </div>
                )}

                <div className="bg-slate-900 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-2">输出目录：</p>
                    <code className="text-cyan-400 font-mono text-sm">Projects/{projectId}/{expert.outputDir}/</code>
                </div>
                
                {logs.length > 0 && (
                    <div className="bg-slate-900 rounded-lg p-4 mt-4">
                        <p className="text-slate-400 text-sm mb-2">执行日志：</p>
                        <div className="text-slate-300 text-sm font-mono max-h-32 overflow-y-auto">
                            {logs.map((log, i) => (
                                <div key={i}>{log}</div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <p className="text-slate-500 text-sm mb-4">
                开始时间：{formatTime(startedAt)}
            </p>

            <button
                onClick={onCancel}
                className="px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
                取消任务
            </button>

            <p className="text-slate-600 text-xs mt-6">
                完成后此页面将自动更新
            </p>
        </div>
    );
};
