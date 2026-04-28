import { useEffect } from 'react';
import { Avatar } from '../../components/primitives';
import {
  ConversationStream,
  MessageRenderer,
  Stage,
} from '../../shell/primitives';
import type { ConversationMessageNode } from '../../shell/primitives';
import { useRoundtableSse } from './hooks/useRoundtableSse';
import { PropositionInput } from './components/PropositionInput';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { DirectorControls } from './components/DirectorControls';
import { SpikeLibrary } from './components/SpikeLibrary';
import { PERSONA_NAME_MAP } from './types';
import type { Round, Spike } from './types';

interface RoundtableStageProps {
  onSendToCrucible?: (sessionId: string, spikeIds?: string[]) => void;
  onArtifactStateChange?: (payload: RoundtableStageArtifactState) => void;
}

export interface RoundtableStageArtifactState {
  sessionId?: string | null;
  rounds: Round[];
  spikes: Spike[];
  selectedSlugs: string[];
}

const ACTION_COLORS: Record<string, string> = {
  陈述: '#16a34a',
  质疑: '#dc2626',
  补充: '#2563eb',
  反驳: '#ea580c',
  修正: '#d97706',
  综合: '#7c3aed',
};

function formatTurnTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function buildRoundtableMessages(rounds: Round[]): ConversationMessageNode[] {
  return rounds.flatMap((round) =>
    round.turns.map((turn, index) => {
      const speakerName = PERSONA_NAME_MAP[turn.speakerSlug] ?? turn.speakerSlug;

      return {
        id: `round-${round.roundIndex}-${turn.speakerSlug}-${index}`,
        author: {
          name: speakerName,
          role: turn.action,
          avatar: <Avatar initial={speakerName} />,
        },
        time: formatTurnTime(turn.timestamp),
        body: (
          <div className="space-y-2">
            <p className="whitespace-pre-wrap text-[13px] leading-7 text-[var(--gc-text-primary)]">
              {turn.utterance}
            </p>
            {turn.briefSummary ? (
              <p className="text-[12px] italic text-[var(--gc-text-tertiary)]">
                简言之：{turn.briefSummary}
              </p>
            ) : null}
          </div>
        ),
        spike: {
          enabled: true,
          tag: `第 ${round.roundIndex + 1} 轮`,
        },
        meta: {
          actionColor: ACTION_COLORS[turn.action] ?? 'var(--gc-text-tertiary)',
          roundIndex: round.roundIndex,
        },
      };
    }),
  );
}

export function RoundtableStage({
  onSendToCrucible,
  onArtifactStateChange,
}: RoundtableStageProps) {
  const { state, startSession, sendDirectorCommand, startDeepDive } = useRoundtableSse();

  const messages = buildRoundtableMessages(state.rounds);

  useEffect(() => {
    onArtifactStateChange?.({
      sessionId: state.sessionId,
      rounds: state.rounds,
      spikes: state.spikes,
      selectedSlugs: state.selectedSlugs,
    });
  }, [
    onArtifactStateChange,
    state.rounds,
    state.sessionId,
    state.selectedSlugs,
    state.spikes,
  ]);

  const handleDirectorCommand = (command: Parameters<typeof sendDirectorCommand>[0]) => {
    if (!state.sessionId || state.sessionId === 'pending') return;
    sendDirectorCommand({ ...command, sessionId: state.sessionId });
  };

  const handleStartDeepDive = (spikeId: string, openingQuestion?: string) => {
    if (!state.sessionId || state.sessionId === 'pending') return;
    startDeepDive(state.sessionId, spikeId, openingQuestion);
  };

  const handleSendToCrucible = () => {
    if (!state.sessionId || state.sessionId === 'pending') return;
    onSendToCrucible?.(state.sessionId, state.spikes.map((spike) => spike.id));
  };

  return (
    <Stage className="h-full">
      <Stage.Body className="space-y-6 p-6">
        {state.error ? (
          <div className="rounded-xl border border-[rgba(201,118,81,0.28)] bg-[rgba(255,241,233,0.96)] px-4 py-3 text-sm text-[var(--gc-text-primary)]">
            {state.error}
          </div>
        ) : null}

        <PropositionInput
          onStartSession={startSession}
          disabled={state.isStreaming}
        />

        {state.selectedSlugs.length > 0 ? (
          <div className="rounded-xl border border-[var(--gc-line-subtle)] bg-[var(--gc-bg-raised)] p-4">
            <div className="mb-2 text-xs text-[var(--gc-text-tertiary)]">
              参与哲人
            </div>
            <div className="flex flex-wrap gap-2">
              {state.selectedSlugs.map((slug) => {
                const name = PERSONA_NAME_MAP[slug] ?? slug;

                return (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gc-bg-sunken)] px-3 py-1 text-sm text-[var(--gc-text-secondary)]"
                  >
                    <Avatar initial={name} />
                    {name}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}

        {messages.length > 0 ? (
          <ConversationStream
            messages={messages}
            renderer={(message) => (
              <MessageRenderer
                key={message.id}
                avatar={message.author.avatar}
                name={message.author.name}
                role={message.author.role}
                time={message.time}
                spike={message.spike?.enabled}
                spikeTag={message.spike?.tag}
                variant={message.variant}
              >
                {message.body}
              </MessageRenderer>
            )}
          />
        ) : null}

        {state.rounds
          .filter((round) => round.synthesis)
          .map((round) => (
            <div
              key={`round-synthesis-${round.roundIndex}`}
              className="rounded-xl border border-[var(--gc-line-subtle)] bg-[var(--gc-bg-sunken)] p-4"
            >
              <div className="mb-2 text-xs font-medium text-[var(--gc-accent)]">
                第 {round.roundIndex + 1} 轮综合
              </div>
              <p className="text-sm text-[var(--gc-text-primary)]">
                {round.synthesis?.summary}
              </p>
              {round.synthesis?.focusPoint ? (
                <p className="mt-2 text-xs text-[var(--gc-text-secondary)]">
                  焦点：{round.synthesis.focusPoint}
                </p>
              ) : null}
            </div>
          ))}

        {state.isStreaming && !state.streamingTurn && state.rounds.length > 0
          ? (() => {
              const lastRound = state.rounds[state.rounds.length - 1];
              const lastSpeaker = lastRound?.turns[lastRound.turns.length - 1]?.speakerSlug;
              const nextIndex = lastSpeaker
                ? state.selectedSlugs.indexOf(lastSpeaker)
                : -1;
              const nextSpeaker = state.selectedSlugs[(nextIndex + 1) % state.selectedSlugs.length];

              return nextSpeaker ? (
                <ThinkingIndicator
                  speakerName={PERSONA_NAME_MAP[nextSpeaker] ?? nextSpeaker}
                  avatarInitial={
                    PERSONA_NAME_MAP[nextSpeaker]?.charAt(0)
                    ?? nextSpeaker.charAt(0)
                  }
                />
              ) : null;
            })()
          : null}

        {state.awaitingDirector && state.sessionId && state.sessionId !== 'pending' ? (
          <div className="rounded-xl border border-[var(--gc-line-subtle)] bg-[var(--gc-bg-raised)] p-4">
            <div className="mb-3 text-sm font-medium text-[var(--gc-accent)]">
              导演指令
            </div>
            <DirectorControls
              sessionId={state.sessionId}
              currentRound={state.currentRound}
              spikes={state.spikes}
              onCommand={handleDirectorCommand}
              disabled={!state.awaitingDirector}
            />
          </div>
        ) : null}

        <SpikeLibrary
          spikes={state.spikes}
          onStartDeepDive={handleStartDeepDive}
          onSendToCrucible={onSendToCrucible ? handleSendToCrucible : undefined}
        />
      </Stage.Body>
    </Stage>
  );
}
