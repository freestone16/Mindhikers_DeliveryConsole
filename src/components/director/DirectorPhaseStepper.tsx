import type { Phase } from '../types';

interface DirectorPhaseStepperProps {
  phase: Phase;
  conceptApproved: boolean;
  hasChapters: boolean;
  onPhaseChange: (phase: Phase) => void;
}

const phaseLabels: Record<Phase, string> = {
  1: 'Concept',
  2: '初审',
  3: '二审',
  4: 'XML 导出',
};

const phaseColors: Record<Phase, string> = {
  1: 'bg-[#f4d03f]/20 text-[#9a7d0a]',
  2: 'bg-[#5dade2]/20 text-[#2874a6]',
  3: 'bg-[#58d68d]/20 text-[#1e8449]',
  4: 'bg-[#af7ac5]/20 text-[#6c3483]',
};

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
