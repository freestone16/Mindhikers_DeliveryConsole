import { useCallback, useRef, useReducer } from 'react';
import type {
  RoundtableSseEvent,
  RoundtableSseState,
  DirectorCommandRequest,
} from '../types';
import { initialSseState } from '../types';

type SseAction =
  | { type: 'SSE_CONNECTED'; sessionId: string }
  | { type: 'SSE_EVENT'; event: RoundtableSseEvent }
  | { type: 'SSE_DONE' }
  | { type: 'SSE_ERROR'; message: string }
  | { type: 'DIRECTOR_SENT' }
  | { type: 'RESET' };

function sseReducer(state: RoundtableSseState, action: SseAction): RoundtableSseState {
  switch (action.type) {
    case 'SSE_CONNECTED':
      return {
        ...state,
        sessionId: action.sessionId,
        isStreaming: true,
        error: null,
        awaitingDirector: false,
        status: 'selecting',
      };

    case 'SSE_DONE':
      return {
        ...state,
        isStreaming: false,
        streamingTurn: null,
        deepDiveStreamingText: null,
      };

    case 'SSE_ERROR':
      return {
        ...state,
        isStreaming: false,
        streamingTurn: null,
        error: action.message,
      };

    case 'DIRECTOR_SENT':
      return {
        ...state,
        awaitingDirector: false,
        isStreaming: true,
        streamingTurn: null,
      };

    case 'RESET':
      return { ...initialSseState };

    case 'SSE_EVENT': {
      const evt = action.event;
      switch (evt.type) {
        case 'roundtable_selection':
          return {
            ...state,
            selectedSlugs: evt.data.selectedSlugs,
            status: 'opening',
          };

        case 'roundtable_turn_chunk': {
          const { speakerSlug, chunk, roundIndex } = evt.data;
          const existing = state.streamingTurn;

          if (existing && existing.speakerSlug === speakerSlug && existing.roundIndex === roundIndex) {
            return {
              ...state,
              status: 'discussing',
              streamingTurn: {
                ...existing,
                utterance: existing.utterance + chunk,
              },
            };
          }

          return {
            ...state,
            status: 'discussing',
            streamingTurn: { speakerSlug, utterance: chunk, roundIndex },
          };
        }

        case 'roundtable_turn_meta': {
          const meta = evt.data;
          const streaming = state.streamingTurn;
          if (!streaming || streaming.speakerSlug !== meta.speakerSlug) {
            return state;
          }

          const completedTurn = {
            speakerSlug: meta.speakerSlug,
            utterance: streaming.utterance,
            action: meta.action,
            briefSummary: meta.briefSummary,
            challengedTarget: meta.challengedTarget,
            stanceVector: meta.stanceVector,
            timestamp: meta.timestamp || Date.now(),
          };

          const newRounds = [...state.rounds];
          const roundIdx = streaming.roundIndex;

          while (newRounds.length <= roundIdx) {
            newRounds.push({ roundIndex: newRounds.length, turns: [] });
          }
          newRounds[roundIdx] = {
            ...newRounds[roundIdx],
            turns: [...newRounds[roundIdx].turns, completedTurn],
          };

          return {
            ...state,
            rounds: newRounds,
            currentRound: roundIdx,
            streamingTurn: null,
          };
        }

        case 'roundtable_synthesis': {
          const { roundIndex, ...synthesis } = evt.data;
          const newRounds = [...state.rounds];
          while (newRounds.length <= roundIndex) {
            newRounds.push({ roundIndex: newRounds.length, turns: [] });
          }
          newRounds[roundIndex] = { ...newRounds[roundIndex], synthesis };
          return { ...state, rounds: newRounds, status: 'synthesizing' };
        }

        case 'roundtable_awaiting':
          return {
            ...state,
            isStreaming: false,
            awaitingDirector: true,
            sessionId: evt.data.sessionId,
            currentRound: evt.data.currentRound,
            status: 'awaiting',
          };

        case 'roundtable_error':
          return {
            ...state,
            error: evt.data.message,
            isStreaming: false,
            streamingTurn: null,
          };

        case 'roundtable_spikes_ready':
          return {
            ...state,
            spikes: evt.data.spikes,
            status: 'spike_extracting',
          };

        case 'roundtable_deepdive_chunk':
          return {
            ...state,
            deepDiveStreamingText: (state.deepDiveStreamingText ?? '') + evt.data.chunk,
          };

        case 'roundtable_deepdive_summary':
          return {
            ...state,
            deepDiveStreamingText: null,
          };

        default:
          return state;
      }
    }

    default:
      return state;
  }
}

function parseSseLines(text: string): Array<{ event: string; data: string }> {
  const results: Array<{ event: string; data: string }> = [];
  let currentEvent = 'message';
  let currentData = '';

  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      currentData = line.slice(5).trim();
    } else if (line === '') {
      if (currentData) {
        results.push({ event: currentEvent, data: currentData });
      }
      currentEvent = 'message';
      currentData = '';
    }
  }

  return results;
}

export function useRoundtableSse() {
  const [state, dispatch] = useReducer(sseReducer, initialSseState);
  const abortRef = useRef<AbortController | null>(null);

  const startSession = useCallback(
    async (proposition: string, sharpenedProposition?: string) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      dispatch({ type: 'RESET' });
      dispatch({ type: 'SSE_CONNECTED', sessionId: 'pending' });

      try {
        const response = await fetch('/api/roundtable/turn/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposition,
            sharpenedProposition: sharpenedProposition || undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          dispatch({ type: 'SSE_ERROR', message: errorText || `HTTP ${response.status}` });
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          dispatch({ type: 'SSE_ERROR', message: 'No response body' });
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const boundary = buffer.lastIndexOf('\n\n');
          if (boundary === -1) continue;

          const completeChunk = buffer.slice(0, boundary + 2);
          buffer = buffer.slice(boundary + 2);

          const events = parseSseLines(completeChunk);
          for (const evt of events) {
            try {
              const parsed: RoundtableSseEvent = {
                type: evt.event as RoundtableSseEvent['type'],
                data: JSON.parse(evt.data),
              };
              dispatch({ type: 'SSE_EVENT', event: parsed });
            } catch {
              // Skip malformed events
            }
          }
        }

        if (buffer.trim()) {
          const events = parseSseLines(buffer);
          for (const evt of events) {
            try {
              const parsed: RoundtableSseEvent = {
                type: evt.event as RoundtableSseEvent['type'],
                data: JSON.parse(evt.data),
              };
              dispatch({ type: 'SSE_EVENT', event: parsed });
            } catch {
              // Skip
            }
          }
        }

        dispatch({ type: 'SSE_DONE' });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        dispatch({
          type: 'SSE_ERROR',
          message: err instanceof Error ? err.message : 'Unknown SSE error',
        });
      }
    },
    [],
  );

  const sendDirectorCommand = useCallback(
    async (command: DirectorCommandRequest) => {
      dispatch({ type: 'DIRECTOR_SENT' });

      try {
        const response = await fetch('/api/roundtable/director', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: command.sessionId,
            command: command.command,
            payload: command.payload,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          dispatch({ type: 'SSE_ERROR', message: errorText || `Director command failed: HTTP ${response.status}` });
          return;
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('text/event-stream')) {
          const reader = response.body?.getReader();
          if (!reader) return;

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const boundary = buffer.lastIndexOf('\n\n');
            if (boundary === -1) continue;

            const completeChunk = buffer.slice(0, boundary + 2);
            buffer = buffer.slice(boundary + 2);

            const events = parseSseLines(completeChunk);
            for (const evt of events) {
              try {
                const parsed: RoundtableSseEvent = {
                  type: evt.event as RoundtableSseEvent['type'],
                  data: JSON.parse(evt.data),
                };
                dispatch({ type: 'SSE_EVENT', event: parsed });
              } catch {
                // Skip
              }
            }
          }
        } else {
          const data = await response.json();
          if (data.spikes) {
            dispatch({
              type: 'SSE_EVENT',
              event: { type: 'roundtable_spikes_ready', data: { spikes: data.spikes } },
            });
          }
          if (data.deepDive) {
            dispatch({ type: 'SSE_DONE' });
          }
        }

        dispatch({ type: 'SSE_DONE' });
      } catch (err: unknown) {
        dispatch({
          type: 'SSE_ERROR',
          message: err instanceof Error ? err.message : 'Director command error',
        });
      }
    },
    [],
  );

  const startDeepDive = useCallback(
    async (sessionId: string, spikeId: string, openingQuestion?: string) => {
      try {
        const response = await fetch('/api/roundtable/deepdive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, spikeId, openingQuestion }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          dispatch({ type: 'SSE_ERROR', message: errorText || `DeepDive start failed: HTTP ${response.status}` });
          return;
        }

        const data = await response.json();
        if (data.deepDive) {
          dispatch({
            type: 'SSE_EVENT',
            event: {
              type: 'roundtable_awaiting' as const,
              data: { sessionId: data.deepDive.id, currentRound: state.currentRound },
            },
          });
        }
      } catch (err: unknown) {
        dispatch({
          type: 'SSE_ERROR',
          message: err instanceof Error ? err.message : 'DeepDive start error',
        });
      }
    },
    [state.currentRound],
  );

  return { state, startSession, sendDirectorCommand, startDeepDive };
}
