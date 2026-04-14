interface ThinkingIndicatorProps {
  speakerName: string;
  avatarEmoji: string;
}

export const ThinkingIndicator = ({
  speakerName,
  avatarEmoji,
}: ThinkingIndicatorProps) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm text-[var(--ink-3)]">
        <span className="mr-1">{avatarEmoji}</span>
        <span>{speakerName} 正在思考…</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--line-soft)]">
        <div
          className="h-full bg-[var(--ink-3)]"
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
