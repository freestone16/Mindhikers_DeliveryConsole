import type { ReactNode } from 'react';
import type { Phase } from '../../types';
import { DirectorStageHeader } from './DirectorStageHeader';

interface DirectorWorkbenchShellProps {
  projectId: string;
  phase: Phase;
  conceptApproved: boolean;
  hasChapters: boolean;
  onPhaseChange: (phase: Phase) => void;
  onBackToSessions?: () => void;
  children: ReactNode;
}

export function DirectorWorkbenchShell({
  projectId,
  phase,
  conceptApproved,
  hasChapters,
  onPhaseChange,
  onBackToSessions,
  children,
}: DirectorWorkbenchShellProps) {
  return (
    <div className="director-workbench">
      <DirectorStageHeader
        projectId={projectId}
        phase={phase}
        conceptApproved={conceptApproved}
        hasChapters={hasChapters}
        onPhaseChange={onPhaseChange}
        onBackToSessions={onBackToSessions}
      />

      <div className="director-workbench__content">
        {children}
      </div>
    </div>
  );
}
