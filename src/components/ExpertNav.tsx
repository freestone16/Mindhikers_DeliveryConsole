import { Eye, Music, Image, Video, Megaphone, CheckCircle, Clock, AlertCircle, PenTool, MessageSquare } from 'lucide-react';
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
    isChatOpen?: boolean;
    onToggleChat?: () => void;
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
    if (!isActive) return 'bg-[rgba(255,250,244,0.72)] hover:bg-[rgba(166,117,64,0.08)]';
    switch (status) {
        case 'completed':
            return 'bg-[rgba(133,153,104,0.18)] border-[rgba(111,127,91,0.55)]';
        case 'running':
        case 'pending':
            return 'bg-[rgba(214,170,86,0.18)] border-[rgba(192,138,47,0.52)]';
        case 'failed':
            return 'bg-[rgba(182,99,79,0.16)] border-[rgba(159,73,52,0.52)]';
        default:
            return 'bg-[rgba(166,117,64,0.12)]';
    }
};

export const ExpertNav = ({ activeExpertId, expertStatuses, onSelectExpert, isChatOpen, onToggleChat }: ExpertNavProps) => {
    return (
        <nav className="border-b border-[var(--line-soft)] bg-[rgba(250,244,235,0.92)] backdrop-blur-md">
            <div className="px-6 py-3 flex justify-between items-center">
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
                                        : 'border-[rgba(146,118,82,0.06)]'
                                    }
                                    ${getStatusBg(expertStatus, isActive)}
                                `}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? '' : 'text-[var(--ink-3)]'}`} />
                                <span className={`text-sm font-medium ${isActive ? '' : 'text-[var(--ink-2)]'}`}>
                                    {expert.name}
                                </span>
                                {StatusIcon && (
                                    <span className="ml-1">{StatusIcon}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
                {onToggleChat && (
                    <button
                        onClick={onToggleChat}
                        className={`flex items-center justify-center p-2 rounded-xl transition-colors ${isChatOpen ? 'bg-[var(--accent)] text-white shadow-[0_10px_22px_rgba(166,117,64,0.22)]' : 'text-[var(--ink-3)] hover:bg-[rgba(166,117,64,0.08)] hover:text-[var(--ink-1)]'
                            }`}
                        title="对话面板 (ChatPanel)"
                    >
                        <MessageSquare className="w-5 h-5" />
                    </button>
                )}
            </div>
        </nav>
    );
};
