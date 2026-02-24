import { Eye, Music, Image, Video, Megaphone, CheckCircle, FileText, RotateCcw, ExternalLink } from 'lucide-react';
import { EXPERTS, getExpertColorClass } from '../../config/experts';
import { useState } from 'react';

const iconMap: Record<string, React.ElementType> = {
    Eye,
    Music,
    Image,
    Video,
    Megaphone
};

interface CompletedStateProps {
    expertId: string;
    outputPath?: string;
    outputContent?: string;
    completedAt: string;
    onRerun: () => void;
}

export const CompletedState = ({ expertId, outputPath, outputContent, completedAt, onRerun }: CompletedStateProps) => {
    const expert = EXPERTS.find(e => e.id === expertId);
    const [showFullContent, setShowFullContent] = useState(false);
    
    if (!expert) return null;

    const Icon = iconMap[expert.icon] || Eye;
    const colorClass = getExpertColorClass(expert.color);

    const formatTime = (iso: string) => {
        const date = new Date(iso);
        return date.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const truncateContent = (content: string, maxLength: number = 500) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    return (
        <div className="flex flex-col min-h-[60vh] py-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className={`
                        w-16 h-16 rounded-full flex items-center justify-center
                        ${colorClass.split(' ')[1]} border-2 border-emerald-500
                    `}>
                        <Icon className={`w-8 h-8 ${colorClass.split(' ')[0]}`} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{expert.name}</h2>
                        <div className="flex items-center gap-2 text-emerald-400">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">已完成 · {formatTime(completedAt)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {outputPath && (
                        <button
                            onClick={() => window.open(`file://${outputPath}`, '_blank')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            查看完整文件
                        </button>
                    )}
                    <button
                        onClick={onRerun}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        重新生成
                    </button>
                </div>
            </div>

            {outputPath && (
                <div className="bg-slate-800/50 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    <span className="text-slate-400">输出文件：</span>
                    <code className="text-cyan-400 font-mono text-sm">{outputPath}</code>
                </div>
            )}

            {outputContent && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="bg-slate-900/50 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                        <span className="text-slate-400 text-sm">生成结果预览</span>
                        <button
                            onClick={() => setShowFullContent(!showFullContent)}
                            className="text-blue-400 text-sm hover:text-blue-300"
                        >
                            {showFullContent ? '收起' : '展开全部'}
                        </button>
                    </div>
                    <div className="p-4 max-h-[50vh] overflow-y-auto">
                        <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono">
                            {showFullContent ? outputContent : truncateContent(outputContent || '')}
                        </pre>
                    </div>
                </div>
            )}

            {!outputContent && !outputPath && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center">
                    <p className="text-slate-400">暂无输出内容</p>
                    <p className="text-slate-500 text-sm mt-2">输出文件可能在 {expert.outputDir}/ 目录下</p>
                </div>
            )}
        </div>
    );
};
