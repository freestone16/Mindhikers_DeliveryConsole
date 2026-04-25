import type { Phase } from '../../types';

interface DirectorPhaseStepperProps {
  phase: Phase;
  conceptApproved: boolean;
  hasChapters: boolean;
  onPhaseChange: (phase: Phase) => void;
}

export function DirectorPhaseStepper({
  phase,
  conceptApproved,
  hasChapters,
  onPhaseChange,
}: DirectorPhaseStepperProps) {
  const maxReachedPhase = !conceptApproved
    ? 1
    : !hasChapters
    ? 2
    : phase >= 3
    ? 4
    : 2;

  return (
    <div className="director-phase-stepper">
      <div className="director-phase-stepper__track">
        {([1, 2, 3, 4] as Phase[]).map((p) => {
          const isDisabled = p > maxReachedPhase;
          return (
            <button
              key={p}
              onClick={() => onPhaseChange(p)}
              disabled={isDisabled}
              className={`px-3 py-1 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
                phase === p
                  ? 'bg-[#c97545] text-white'
                  : 'bg-[#f4efe5] text-[#8f8372] hover:bg-[#e4dbcc]'
              }`}
            >
              P{p}
            </button>
          );
        })}
      </div>
    </div>
  );
}
