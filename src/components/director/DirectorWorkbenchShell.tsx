import type { ReactNode } from 'react';
import type { Phase } from '../../types';
import { DirectorStageHeader } from './DirectorStageHeader';

interface DirectorWorkbenchShellProps {
  phase: Phase;
  conceptApproved: boolean;
  hasChapters: boolean;
  onPhaseChange: (phase: Phase) => void;
  children: ReactNode;
}

export function DirectorWorkbenchShell({
  phase,
  conceptApproved,
  hasChapters,
  onPhaseChange,
  children,
}: DirectorWorkbenchShellProps) {
  return (
    <div className="director-workbench">
      <DirectorStageHeader
        phase={phase}
        conceptApproved={conceptApproved}
        hasChapters={hasChapters}
        onPhaseChange={onPhaseChange}
      />

      <div className="director-workbench__content">
        {children}
      </div>
    </div>
  );
}
