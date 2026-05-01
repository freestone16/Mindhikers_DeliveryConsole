import { Avatar } from '../../../components/primitives';

interface ThinkingIndicatorProps {
  speakerName: string;
  avatarInitial: string;
}

export const ThinkingIndicator = ({
  speakerName,
  avatarInitial,
}: ThinkingIndicatorProps) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-sm text-[var(--gc-text-tertiary)]">
        <Avatar initial={avatarInitial} />
        <span>{speakerName} 正在思考…</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--gc-line-subtle)]">
        <div
          className="h-full bg-[var(--gc-text-tertiary)]"
          style={{ animation: 'thinking-indicator-breathe 2s ease-in-out infinite' }}
        />
      </div>
      {/* 呼吸动画样式 */}
      <style>{`
        @keyframes thinking-indicator-breathe {
          0% {
            width: 0%;
          }
          50% {
            width: 100%;
          }
          100% {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};
