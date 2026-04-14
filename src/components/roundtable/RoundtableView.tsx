import { PERSONA_EMOJI_MAP, PERSONA_NAME_MAP } from './types';
import type { SidebarTab } from './types';
import { useRoundtableSse } from './useRoundtableSse';
import { PropositionInput } from './PropositionInput';
import { ThinkingIndicator } from './ThinkingIndicator';
import { DirectorControls } from './DirectorControls';
import { SpikeLibrary } from './SpikeLibrary';

interface RoundtableViewProps {
  activeTab: SidebarTab;
}

const ACTION_COLORS: Record<string, string> = {
  '陈述': '#16a34a',
  '质疑': '#dc2626',
  '补充': '#2563eb',
  '反驳': '#ea580c',
  '修正': '#d97706',
  '综合': '#7c3aed',
};

export const RoundtableView = ({ activeTab }: RoundtableViewProps) => {
  const { state, startSession, sendDirectorCommand, startDeepDive } = useRoundtableSse();

  const handleStartSession = (proposition: string) => {
    startSession(proposition);
  };

  const handleDirectorCommand = (command: Parameters<typeof sendDirectorCommand>[0]) => {
    if (!state.sessionId || state.sessionId === 'pending') return;
    sendDirectorCommand({ ...command, sessionId: state.sessionId });
  };

  const handleStartDeepDive = (spikeId: string, openingQuestion?: string) => {
    if (!state.sessionId || state.sessionId === 'pending') return;
    startDeepDive(state.sessionId, spikeId, openingQuestion);
  };

  if (activeTab === 'settings') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-sm text-[var(--ink-3)]">
          <p>设置面板开发中</p>
        </div>
      </div>
    );
  }

  if (activeTab === 'spikes') {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <h2 className="mh-display text-xl text-[var(--ink-1)]">Spike 库</h2>
        {state.spikes.length > 0 ? (
          <SpikeLibrary spikes={state.spikes} onStartDeepDive={handleStartDeepDive} />
        ) : (
          <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-0)] p-8 text-center text-sm text-[var(--ink-3)]">
            尚未提取 Spike。先发起一场圆桌讨论吧。
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 overflow-y-auto p-6">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <PropositionInput
        onStartSession={handleStartSession}
        disabled={state.isStreaming}
      />

      {state.selectedSlugs.length > 0 && (
        <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-0)] p-4">
          <div className="text-xs text-[var(--ink-3)] mb-2">参与哲人</div>
          <div className="flex flex-wrap gap-2">
            {state.selectedSlugs.map((slug) => (
              <span
                key={slug}
                className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm text-[var(--ink-2)]"
              >
                {PERSONA_EMOJI_MAP[slug] ?? '💬'} {PERSONA_NAME_MAP[slug] ?? slug}
              </span>
            ))}
          </div>
        </div>
      )}

      {state.rounds.map((round) => (
        <div key={`round-${round.roundIndex}`} className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-[var(--ink-3)]">
            <div className="h-px flex-1 bg-[var(--line-soft)]" />
            <span>第 {round.roundIndex + 1} 轮</span>
            <div className="h-px flex-1 bg-[var(--line-soft)]" />
          </div>

          {round.turns.map((turn, idx) => {
            const emoji = PERSONA_EMOJI_MAP[turn.speakerSlug] ?? '💬';
            const name = PERSONA_NAME_MAP[turn.speakerSlug] ?? turn.speakerSlug;
            const actionColor = ACTION_COLORS[turn.action] ?? 'var(--ink-3)';

            return (
              <div
                key={`${round.roundIndex}-${turn.speakerSlug}-${idx}`}
                className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-0)] p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{emoji}</span>
                    <span className="text-sm font-medium text-[var(--ink-1)]">
                      {name}
                    </span>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${actionColor}18`,
                      color: actionColor,
                    }}
                  >
                    {turn.action}
                  </span>
                </div>

                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink-1)]">
                  {turn.utterance}
                </p>

                {turn.briefSummary && (
                  <p className="mt-2 text-xs text-[var(--ink-3)] italic">
                    简言之：{turn.briefSummary}
                  </p>
                )}
              </div>
            );
          })}

          {round.synthesis && (
            <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-2)] p-4">
              <div className="mb-2 text-xs font-medium text-[var(--accent)]">
                轮次综合
              </div>
              <p className="text-sm text-[var(--ink-1)]">
                {round.synthesis.summary}
              </p>
              {round.synthesis.focusPoint && (
                <p className="mt-2 text-xs text-[var(--ink-2)]">
                  焦点：{round.synthesis.focusPoint}
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      {state.streamingTurn && (
        <div className="rounded-xl border border-[var(--accent-soft)] bg-[var(--surface-0)] p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">
              {PERSONA_EMOJI_MAP[state.streamingTurn.speakerSlug] ?? '💬'}
            </span>
            <span className="text-sm font-medium text-[var(--ink-1)]">
              {PERSONA_NAME_MAP[state.streamingTurn.speakerSlug] ?? state.streamingTurn.speakerSlug}
            </span>
            <span className="text-xs text-[var(--ink-3)]">发言中…</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink-1)]">
            {state.streamingTurn.utterance}
            <span className="inline-block w-0.5 animate-pulse bg-[var(--ink-1)]">&nbsp;</span>
          </p>
        </div>
      )}

      {state.isStreaming && !state.streamingTurn && state.rounds.length > 0 && (() => {
        const lastRound = state.rounds[state.rounds.length - 1];
        const lastSpeaker = lastRound?.turns[lastRound.turns.length - 1]?.speakerSlug;
        const nextIdx = lastSpeaker
          ? state.selectedSlugs.indexOf(lastSpeaker)
          : -1;
        const nextSpeaker = state.selectedSlugs[(nextIdx + 1) % state.selectedSlugs.length];

        return nextSpeaker ? (
          <ThinkingIndicator
            speakerName={PERSONA_NAME_MAP[nextSpeaker] ?? nextSpeaker}
            avatarEmoji={PERSONA_EMOJI_MAP[nextSpeaker] ?? '💬'}
          />
        ) : null;
      })()}

      {state.awaitingDirector && state.sessionId && state.sessionId !== 'pending' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--accent-soft)] bg-[var(--surface-0)] p-4">
            <div className="mb-3 text-sm font-medium text-[var(--accent)]">
              🎬 导演指令 — 等待决策
            </div>
            <DirectorControls
              sessionId={state.sessionId}
              currentRound={state.currentRound}
              spikes={state.spikes}
              onCommand={handleDirectorCommand}
              disabled={!state.awaitingDirector}
            />
          </div>
        </div>
      )}

      {state.spikes.length > 0 && (
        <SpikeLibrary spikes={state.spikes} onStartDeepDive={handleStartDeepDive} />
      )}
    </div>
  );
};
