import { IdleState } from './experts/IdleState';
import { PendingState } from './experts/PendingState';
import { CompletedState } from './experts/CompletedState';
import { FailedState } from './experts/FailedState';
import { EXPERTS } from '../config/experts';
import type { ExpertWork, SelectedScript } from '../types';

interface ExpertPageProps {
    expertId: string;
    projectId: string;
    selectedScript?: SelectedScript;
    onStartWork: (expertId: string) => void;
    onCancel: (expertId: string) => void;
    onRerun: (expertId: string) => void;
}

import { useExpertState } from '../hooks/useExpertState';

export const ExpertPage = ({
    expertId,
    projectId,
    selectedScript,
    onStartWork,
    onCancel,
    onRerun
}: ExpertPageProps) => {
    const { state: expertWork } = useExpertState<ExpertWork>(expertId, { status: 'idle', logs: [] });
    const expert = EXPERTS.find(e => e.id === expertId);
    if (!expert) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
                未找到专家配置
            </div>
        );
    }

    const status = expertWork?.status || 'idle';

    switch (status) {
        case 'idle':
            return (
                <IdleState
                    expertId={expertId}
                    selectedScript={selectedScript}
                    onStartWork={() => onStartWork(expertId)}
                />
            );

        case 'pending':
        case 'running':
            return (
                <PendingState
                    expertId={expertId}
                    projectId={projectId}
                    selectedScript={selectedScript}
                    startedAt={expertWork?.startedAt || new Date().toISOString()}
                    logs={expertWork?.logs}
                    onCancel={() => onCancel(expertId)}
                />
            );

        case 'completed':
            return (
                <CompletedState
                    expertId={expertId}
                    outputPath={expertWork?.outputPath}
                    outputContent={expertWork?.outputContent}
                    completedAt={expertWork?.completedAt || new Date().toISOString()}
                    onRerun={() => onRerun(expertId)}
                />
            );

        case 'failed':
            return (
                <FailedState
                    expertId={expertId}
                    error={expertWork?.error}
                    logs={expertWork?.logs || []}
                    onRerun={() => onRerun(expertId)}
                />
            );

        default:
            return (
                <IdleState
                    expertId={expertId}
                    selectedScript={selectedScript}
                    onStartWork={() => onStartWork(expertId)}
                />
            );
    }
};
