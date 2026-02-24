import { Eye, Music, Image, Video, Megaphone, CheckCircle, Clock, AlertCircle, PenTool } from 'lucide-react';
import { EXPERTS, getExpertColorClass } from '../config/experts';
import type { ExpertStatus } from '../types';

const iconMap: Record<string, React.ElementType> = {
    PenTool,
    Eye,
    Music,
    Image,
    Video,
    Megaphone
};

interface ExpertNavProps {
    activeExpertId: string;
    expertStatuses: Record<string, { status: ExpertStatus }>;
    onSelectExpert: (expertId: string) => void;
}

const getStatusIcon = (status: ExpertStatus) => {
    switch (status) {
        case 'completed':
            return <CheckCircle className="w-3 h-3 text-emerald-400" />;
        case 'running':
        case 'pending':
            return <Clock className="w-3 h-3 text-yellow-400 animate-spin" />;
        case 'failed':
            return <AlertCircle className="w-3 h-3 text-red-400" />;
        default:
            return null;
    }
};

const getStatusBg = (status: ExpertStatus, isActive: boolean): string => {
    if (!isActive) return 'bg-slate-800/50 hover:bg-slate-700/50';
    switch (status) {
        case 'completed':
            return 'bg-emerald-500/20 border-emerald-500';
        case 'running':
        case 'pending':
            return 'bg-yellow-500/20 border-yellow-500';
        case 'failed':
            return 'bg-red-500/20 border-red-500';
        default:
            return 'bg-slate-700/50';
    }
};

export const ExpertNav = ({ activeExpertId, expertStatuses, onSelectExpert }: ExpertNavProps) => {
    return (
        <nav className="bg-[#0b1529]/60 border-b border-blue-900/30 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 py-3">
                <div className="flex items-center gap-2">
                    {EXPERTS.map((expert) => {
                        const Icon = iconMap[expert.icon] || Eye;
                        const isActive = activeExpertId === expert.id;
                        const expertStatus = expertStatuses[expert.id]?.status || 'idle';
                        const colorClass = getExpertColorClass(expert.color);
                        const StatusIcon = getStatusIcon(expertStatus);

                        return (
                            <button
                                key={expert.id}
                                onClick={() => onSelectExpert(expert.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all
                                    ${isActive
                                        ? `${colorClass} border-l-4`
                                        : 'border-transparent hover:bg-slate-800/50'
                                    }
                                    ${getStatusBg(expertStatus, isActive)}
                                `}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? '' : 'text-slate-400'}`} />
                                <span className={`text-sm font-medium ${isActive ? '' : 'text-slate-400'}`}>
                                    {expert.name}
                                </span>
                                {StatusIcon && (
                                    <span className="ml-1">{StatusIcon}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};
