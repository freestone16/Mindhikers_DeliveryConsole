import { useState } from 'react';
import { Button } from '../../../components/primitives';
import { Textarea } from '../../../components/primitives';

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
    <div className="rounded-xl border border-[var(--gc-line-subtle)] bg-[var(--gc-bg-raised)] p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-[var(--gc-text-secondary)]" htmlFor="roundtable-proposition">
            输入命题
          </label>
          <Textarea
            id="roundtable-proposition"
            value={proposition}
            onChange={(event) => setProposition(event.target.value)}
            placeholder="例如：AI 是否应该拥有道德责任？"
            className="min-h-32 w-full resize-none rounded-lg border border-[var(--gc-line-subtle)] bg-[var(--gc-bg-sunken)] px-4 py-3 text-[var(--gc-text-primary)] outline-none transition focus:border-[var(--gc-accent)]"
            disabled={disabled || isStarting}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
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
          </Button>
          
          {(disabled || isStarting) && (
            <span className="text-sm text-[var(--gc-text-tertiary)]">
              {isStarting ? '正在连接哲人，请稍候（约需 30-60 秒）…' : '处理中…'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
