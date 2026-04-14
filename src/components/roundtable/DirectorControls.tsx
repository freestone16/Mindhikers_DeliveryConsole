import { useMemo, useState } from 'react';

type DirectorCommand = '止' | '投' | '深' | '换' | '？' | '可';

interface DirectorCommandRequest {
  sessionId: string;
  command: DirectorCommand;
  payload?: {
    injection?: string;
    newPersonaSlug?: string;
    targetPersona?: string;
    spikeId?: string;
  };
}

interface Spike {
  id: string;
  title: string;
  summary: string;
  sourceSpeaker: string;
}

interface DirectorControlsProps {
  sessionId: string;
  currentRound: number;
  spikes: Spike[];
  onCommand: (command: DirectorCommandRequest) => void;
  disabled: boolean;
}

const commandPalette: Record<DirectorCommand, { bg: string; text: string }> = {
  止: { bg: 'rgba(220, 38, 38, 0.16)', text: '#dc2626' },
  投: { bg: 'rgba(37, 99, 235, 0.16)', text: '#2563eb' },
  深: { bg: 'rgba(124, 58, 237, 0.16)', text: '#7c3aed' },
  换: { bg: 'rgba(8, 145, 178, 0.16)', text: '#0891b2' },
  '？': { bg: 'rgba(217, 119, 6, 0.16)', text: '#d97706' },
  可: { bg: 'rgba(22, 163, 74, 0.16)', text: '#16a34a' },
};

const commandLabels: Record<DirectorCommand, string> = {
  止: '⏹ 停止提取 Spike',
  投: '💉 注入观点',
  深: '🔬 深入裂缝',
  换: '🔄 替换哲人',
  '？': '❓ 定向提问',
  可: '▶️ 继续讨论',
};

const disabledPalette = {
  bg: 'rgba(120, 120, 120, 0.18)',
  text: 'rgba(97, 97, 97, 0.8)',
};

export const DirectorControls = ({
  sessionId,
  currentRound,
  spikes,
  onCommand,
  disabled,
}: DirectorControlsProps) => {
  const [activeCommand, setActiveCommand] = useState<DirectorCommand | null>(null);
  const [injection, setInjection] = useState('');
  const [selectedSpikeId, setSelectedSpikeId] = useState('');
  const [newPersonaSlug, setNewPersonaSlug] = useState('');
  const [targetPersona, setTargetPersona] = useState('');
  const [question, setQuestion] = useState('');

  const targetOptions = useMemo(() => {
    const uniqueTargets = new Set(spikes.map((spike) => spike.sourceSpeaker));
    return Array.from(uniqueTargets).filter((item) => item.length > 0);
  }, [spikes]);

  // 只标记使用，避免未使用告警
  void currentRound;

  const handleCommandClick = (command: DirectorCommand) => {
    if (disabled) {
      return;
    }
    if (command === '止' || command === '可') {
      onCommand({ sessionId, command });
      return;
    }
    setActiveCommand((prev) => (prev === command ? null : command));
  };

  const handleInjectionSubmit = () => {
    if (disabled) {
      return;
    }
    const trimmed = injection.trim();
    if (!trimmed) {
      return;
    }
    onCommand({ sessionId, command: '投', payload: { injection: trimmed } });
    setInjection('');
    setActiveCommand(null);
  };

  const handleDeepDiveSubmit = () => {
    if (disabled || !selectedSpikeId) {
      return;
    }
    onCommand({ sessionId, command: '深', payload: { spikeId: selectedSpikeId } });
    setSelectedSpikeId('');
    setActiveCommand(null);
  };

  const handleReplaceSubmit = () => {
    if (disabled) {
      return;
    }
    const trimmed = newPersonaSlug.trim();
    if (!trimmed) {
      return;
    }
    onCommand({ sessionId, command: '换', payload: { newPersonaSlug: trimmed } });
    setNewPersonaSlug('');
    setActiveCommand(null);
  };

  const handleQuestionSubmit = () => {
    if (disabled) {
      return;
    }
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || !targetPersona) {
      return;
    }
    onCommand({
      sessionId,
      command: '？',
      payload: {
        targetPersona,
        injection: trimmedQuestion,
      },
    });
    setQuestion('');
    setTargetPersona('');
    setActiveCommand(null);
  };

  return (
    <div className="flex flex-col gap-3 text-[var(--ink-1)]">
      {/* 导演指令按钮组 */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(commandLabels) as DirectorCommand[]).map((command) => {
          const palette = disabled ? disabledPalette : commandPalette[command];
          return (
            <button
              key={command}
              type="button"
              className="rounded-lg px-3 py-2 text-sm font-medium transition"
              style={{ backgroundColor: palette.bg, color: palette.text }}
              onClick={() => handleCommandClick(command)}
              disabled={disabled}
              aria-pressed={activeCommand === command}
            >
              {commandLabels[command]}
            </button>
          );
        })}
      </div>

      {/* 注入观点 */}
      {activeCommand === '投' ? (
        <div className="space-y-2 rounded-lg border border-[var(--line-soft)] bg-[var(--surface-1)] p-3">
          <div className="text-xs text-[var(--ink-2)]">注入观点</div>
          <textarea
            className="w-full rounded-lg border border-[var(--line-soft)] bg-white/60 p-2 text-sm text-[var(--ink-1)] outline-none"
            rows={3}
            placeholder="输入要注入的观点"
            value={injection}
            onChange={(event) => setInjection(event.target.value)}
            disabled={disabled}
          />
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={
              disabled || !injection.trim()
                ? { backgroundColor: disabledPalette.bg, color: disabledPalette.text }
                : { backgroundColor: commandPalette['投'].bg, color: commandPalette['投'].text }
            }
            onClick={handleInjectionSubmit}
            disabled={disabled || !injection.trim()}
          >
            确认注入
          </button>
        </div>
      ) : null}

      {/* 深入裂缝 */}
      {activeCommand === '深' ? (
        <div className="space-y-2 rounded-lg border border-[var(--line-soft)] bg-[var(--surface-1)] p-3">
          <div className="text-xs text-[var(--ink-2)]">选择 Spike</div>
          <select
            className="w-full rounded-lg border border-[var(--line-soft)] bg-white/60 p-2 text-sm text-[var(--ink-1)]"
            value={selectedSpikeId}
            onChange={(event) => setSelectedSpikeId(event.target.value)}
            disabled={disabled}
          >
            <option value="">请选择一个 Spike</option>
            {spikes.map((spike) => (
              <option key={spike.id} value={spike.id}>
                {spike.title} · {spike.sourceSpeaker}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={
              disabled || !selectedSpikeId
                ? { backgroundColor: disabledPalette.bg, color: disabledPalette.text }
                : { backgroundColor: commandPalette['深'].bg, color: commandPalette['深'].text }
            }
            onClick={handleDeepDiveSubmit}
            disabled={disabled || !selectedSpikeId}
          >
            确认深入
          </button>
        </div>
      ) : null}

      {/* 替换哲人 */}
      {activeCommand === '换' ? (
        <div className="space-y-2 rounded-lg border border-[var(--line-soft)] bg-[var(--surface-1)] p-3">
          <div className="text-xs text-[var(--ink-2)]">输入新 persona slug</div>
          <input
            className="w-full rounded-lg border border-[var(--line-soft)] bg-white/60 p-2 text-sm text-[var(--ink-1)]"
            type="text"
            placeholder="例如: simone-weil"
            value={newPersonaSlug}
            onChange={(event) => setNewPersonaSlug(event.target.value)}
            disabled={disabled}
          />
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={
              disabled || !newPersonaSlug.trim()
                ? { backgroundColor: disabledPalette.bg, color: disabledPalette.text }
                : { backgroundColor: commandPalette['换'].bg, color: commandPalette['换'].text }
            }
            onClick={handleReplaceSubmit}
            disabled={disabled || !newPersonaSlug.trim()}
          >
            确认替换
          </button>
        </div>
      ) : null}

      {/* 定向提问 */}
      {activeCommand === '？' ? (
        <div className="space-y-2 rounded-lg border border-[var(--line-soft)] bg-[var(--surface-1)] p-3">
          <div className="text-xs text-[var(--ink-2)]">选择目标哲人</div>
          <select
            className="w-full rounded-lg border border-[var(--line-soft)] bg-white/60 p-2 text-sm text-[var(--ink-1)]"
            value={targetPersona}
            onChange={(event) => setTargetPersona(event.target.value)}
            disabled={disabled}
          >
            <option value="">请选择目标</option>
            {targetOptions.map((target) => (
              <option key={target} value={target}>
                {target}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border border-[var(--line-soft)] bg-white/60 p-2 text-sm text-[var(--ink-1)]"
            type="text"
            placeholder="输入要提的问题"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={disabled}
          />
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={
              disabled || !targetPersona || !question.trim()
                ? { backgroundColor: disabledPalette.bg, color: disabledPalette.text }
                : { backgroundColor: commandPalette['？'].bg, color: commandPalette['？'].text }
            }
            onClick={handleQuestionSubmit}
            disabled={disabled || !targetPersona || !question.trim()}
          >
            确认提问
          </button>
        </div>
      ) : null}
    </div>
  );
};
