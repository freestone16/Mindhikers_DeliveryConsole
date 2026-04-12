 

export type RoundtableStatus =
  | 'selecting'
  | 'opening'
  | 'discussing'
  | 'synthesizing'
  | 'awaiting'
  | 'spike_extracting'
  | 'completed';

export type PhilosopherAction = '陈述' | '质疑' | '补充' | '反驳' | '修正' | '综合';

export interface StanceVector {
  carePriority: number;
  libertyPriority: number;
  authorityPriority: number;
}

export interface PhilosopherTurn {
  speakerSlug: string;
  utterance: string;
  action: PhilosopherAction;
  briefSummary: string;
  challengedTarget?: string;
  stanceVector?: StanceVector;
  timestamp: number;
}

export interface SpeakerSelection {
  selectedSlugs: string[];
  reason: string;
  focusAngle: string;
}

export interface RoundSynthesis {
  summary: string;
  focusPoint: string;
  tensionLevel: 1 | 2 | 3 | 4 | 5;
  convergenceSignals?: string;
  suggestedDirections: string[];
}

export interface Round {
  roundIndex: number;
  turns: PhilosopherTurn[];
  synthesis?: RoundSynthesis;
}

export interface RoundtableSession {
  id: string;
  proposition: string;
  sharpenedProposition?: string;
  contrastAnchor?: string;
  selectedSlugs: string[];
  status: RoundtableStatus;
  rounds: Round[];
  createdAt: number;
  updatedAt: number;
  metadata?: {
    totalTokens?: number;
    latencyMs?: number;
  };
}

export interface Spike {
  id: string;
  content: string;
  title: string;
  summary: string;
  bridgeHint: string;
  sourceSpeaker: string;
  roundIndex: number;
  timestamp: number;
  sourceTurnIds?: string[];
  tensionLevel?: 1 | 2 | 3 | 4 | 5;
  isFallback?: boolean;
}

export interface DirectorStopResult {
  spikes: Spike[];
  sessionId: string;
  spikeCount: number;
  artifactCount: number;
  isFallback: boolean;
}

export interface RoundtableSelectionEvent {
  type: 'roundtable_selection';
  data: SpeakerSelection;
}

export interface RoundtableSynthesisEvent {
  type: 'roundtable_synthesis';
  data: RoundSynthesis & { roundIndex: number };
}

export interface RoundtableTurnChunkEvent {
  type: 'roundtable_turn_chunk';
  data: {
    roundIndex: number;
    speakerSlug: string;
    chunk: string;
  };
}

export interface RoundtableTurnMetaEvent {
  type: 'roundtable_turn_meta';
  data: Omit<PhilosopherTurn, 'utterance'>;
}

export interface RoundtableAwaitingEvent {
  type: 'roundtable_awaiting';
  data: {
    sessionId: string;
    currentRound: number;
  };
}

export interface RoundtableErrorEvent {
  type: 'roundtable_error';
  data: {
    message: string;
    recoverable: boolean;
  };
}

export interface RoundtableSpikesReadyEvent {
  type: 'roundtable_spikes_ready';
  data: {
    spikes: Spike[];
  };
}

export type RoundtableSseEvent =
  | RoundtableSelectionEvent
  | RoundtableSynthesisEvent
  | RoundtableTurnChunkEvent
  | RoundtableTurnMetaEvent
  | RoundtableAwaitingEvent
  | RoundtableErrorEvent
  | RoundtableSpikesReadyEvent;

export interface StartRoundtableRequest {
  proposition: string;
  sharpenedProposition?: string;
  contrastAnchor?: string;
  preferredPersonas?: string[];
}

export type DirectorCommand = '止' | '投' | '深' | '换' | '？' | '可';

export interface DirectorCommandRequest {
  sessionId: string;
  command: DirectorCommand;
  payload?: {
    injection?: string;
    newPersonaSlug?: string;
    targetPersona?: string;
  };
}

export interface CompressionConfig {
  modelName: string;
  contextWindowTokens: number;
  effectiveInputTokens: number;
  costBreakpoint?: number;
  hasBuiltinCompaction: boolean;
  l0Threshold: number;
  l1Threshold: number;
}

export interface StreamParseState {
  buffer: string;
  utterance: string;
  metaParsed: boolean;
  chunksSent: number;
}

export interface PreloadCache {
  speakerSlug: string;
  promise: Promise<PhilosopherTurn>;
  partialContext: string;
  timestamp: number;
}
