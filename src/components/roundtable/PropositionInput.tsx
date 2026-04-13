import { useState } from 'react';

interface PropositionInputProps {
  onStartSession: (proposition: string) => void;
  disabled: boolean;
}

export const PropositionInput = ({
  onStartSession,
  disabled,
}: PropositionInputProps) => {
  const [proposition, setProposition] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = () => {
    const trimmed = proposition.trim();
    if (!trimmed || disabled || isStarting) {
      return;
    }

    setIsStarting(true);
    onStartSession(trimmed);
  };

  return (
    <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-0)] p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-[var(--ink-2)]" htmlFor="roundtable-proposition">
            输入命题
          </label>
          <textarea
            id="roundtable-proposition"
            value={proposition}
            onChange={(event) => setProposition(event.target.value)}
            placeholder="例如：AI 是否应该拥有道德责任？"
            className="min-h-32 w-full resize-none rounded-lg border border-[var(--line-soft)] bg-[var(--surface-1)] px-4 py-3 text-[var(--ink-1)] outline-none transition focus:border-[var(--accent)]"
            disabled={disabled || isStarting}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-[var(--surface-1)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-2"
            onClick={handleStart}
            disabled={disabled || isStarting || !proposition.trim()}
          >
            {isStarting ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                正在启动圆桌…
              </>
            ) : (
              '开始圆桌'
            )}
          </button>
          
          {(disabled || isStarting) && (
            <span className="text-sm text-[var(--ink-3)]">
              {isStarting ? '正在连接哲人，请稍候（约需 30-60 秒）…' : '处理中…'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
