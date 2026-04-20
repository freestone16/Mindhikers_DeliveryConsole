import type { Phase } from '../types';

interface DirectorStageHeaderProps {
  projectId: string;
  phase: Phase;
  conceptApproved: boolean;
}

const phaseLabels: Record<Phase, string> = {
  1: '概念定向',
  2: '视觉方案',
  3: '渲染编排',
  4: '导出交付',
};

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
}: DirectorStageHeaderProps) {
  return (
    <div className="director-stage-header">
      <div className="director-stage-header__main">
        <div className="director-stage-header__title-row">
          <h1 className="director-stage-header__title">
            视觉导演工作台
          </h1>
          <span
            className={`director-stage-header__badge director-stage-header__badge--phase-${phase}`}
          >
            {phaseLabels[phase]}
          </span>
        </div>
        <p className="director-stage-header__status">
          {phaseStatusText(phase, conceptApproved)}
        </p>
      </div>
    </div>
  );
}
