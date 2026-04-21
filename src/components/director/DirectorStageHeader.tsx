import type { Phase } from '../../types';

interface DirectorStageHeaderProps {
  phase: Phase;
  conceptApproved: boolean;
  onPhaseChange: (phase: Phase) => void;
  hasChapters: boolean;
}

const phaseStatusText = (phase: Phase, approved: boolean): string => {
  if (phase === 1 && !approved) return '概念待生成';
  if (phase === 1 && approved) return '概念已确认';
  if (phase === 2) return '分镜筛选中';
  if (phase === 3) return '渲染队列运行';
  if (phase === 4) return '交付包待确认';
  return '';
};

export function DirectorStageHeader({
  phase,
  conceptApproved,
  onPhaseChange,
  hasChapters,
}: DirectorStageHeaderProps) {
  const maxReachedPhase = !conceptApproved
    ? 1
    : !hasChapters
    ? 2
    : phase >= 3
    ? 4
    : 2;

  return (
    <div className="director-stage-header">
      <div className="director-stage-header__left">
        <span className="director-stage-header__title">
          视觉导演工作台
        </span>
        <span className="director-stage-header__divider" />
        <span className="director-stage-header__status">
          {phaseStatusText(phase, conceptApproved)}
        </span>
      </div>

      <div className="director-stage-header__right">
        {([1, 2, 3, 4] as Phase[]).map((p) => {
          const isDisabled = p > maxReachedPhase;
          return (
            <button
              key={p}
              onClick={() => onPhaseChange(p)}
              disabled={isDisabled}
              className={`director-stage-header__phase-btn ${
                phase === p
                  ? 'director-stage-header__phase-btn--active'
                  : ''
              } ${isDisabled ? 'director-stage-header__phase-btn--disabled' : ''}`}
            >
              P{p}
            </button>
          );
        })}
      </div>
    </div>
  );
}
