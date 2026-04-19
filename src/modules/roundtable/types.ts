/**
 * 前端类型定义 — 映射后端 SSE 事件 & 圆桌引擎状态
 *
 * 后端 SSOT: server/roundtable-types.ts
 * 本文件是前端消费端的类型镜像，保持与后端契约同步。
 */

// ========== 状态枚举 ==========

export type RoundtableStatus =
  | 'selecting'
  | 'opening'
  | 'discussing'
  | 'synthesizing'
  | 'awaiting'
  | 'spike_extracting'
  | 'completed';

export type PhilosopherAction = '陈述' | '质疑' | '补充' | '反驳' | '修正' | '综合';

// ========== 核心数据结构 ==========

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

// ========== 导演指令 ==========

export type DirectorCommand = '止' | '投' | '深' | '换' | '？' | '可';

export interface DirectorCommandRequest {
  sessionId: string;
  command: DirectorCommand;
  payload?: {
    injection?: string;
    newPersonaSlug?: string;
    targetPersona?: string;
    spikeId?: string;
  };
}

// ========== SSE 事件类型 ==========

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

export interface RoundtableDeepDiveChunkEvent {
  type: 'roundtable_deepdive_chunk';
  data: {
    deepDiveId: string;
    chunk: string;
  };
}

export interface RoundtableDeepDiveSummaryEvent {
  type: 'roundtable_deepdive_summary';
  data: DeepDiveSummary;
}

export type RoundtableSseEvent =
  | RoundtableSelectionEvent
  | RoundtableSynthesisEvent
  | RoundtableTurnChunkEvent
  | RoundtableTurnMetaEvent
  | RoundtableAwaitingEvent
  | RoundtableErrorEvent
  | RoundtableSpikesReadyEvent
  | RoundtableDeepDiveChunkEvent
  | RoundtableDeepDiveSummaryEvent;

// ========== DeepDive 类型 ==========

export interface DeepDiveSession {
  id: string;
  parentSessionId: string;
  spikeId: string;
  spikeTitle: string;
  spikeContent: string;
  sourceSpeaker: string;
  status: 'active' | 'summarizing' | 'completed';
  turns: DeepDiveTurn[];
  summary?: DeepDiveSummary;
  createdAt: number;
  updatedAt: number;
}

export interface DeepDiveTurn {
  role: 'user' | 'philosopher';
  content: string;
  timestamp: number;
}

export interface DeepDiveSummary {
  title: string;
  coreInsight: string;
  keyQuotes: string[];
  remainingTension: string;
  nextSteps: string[];
}

// ========== 前端专用状态 ==========

/** SSE Hook 返回的聚合状态 */
export interface RoundtableSseState {
  /** 会话 ID */
  sessionId: string | null;
  /** 会话状态 */
  status: RoundtableStatus | null;
  /** 选中的哲人列表 */
  selectedSlugs: string[];
  /** 各轮次数据 */
  rounds: Round[];
  /** 当前轮次 */
  currentRound: number;
  /** Spike 列表 */
  spikes: Spike[];
  /** 当前正在流式输出的发言（尚未完成） */
  streamingTurn: {
    speakerSlug: string;
    utterance: string;
    roundIndex: number;
  } | null;
  /** 是否正在等待导演指令 */
  awaitingDirector: boolean;
  /** 是否正在流式接收 */
  isStreaming: boolean;
  /** 错误信息 */
  error: string | null;
  /** DeepDive 状态 */
  deepDiveSession: DeepDiveSession | null;
  /** DeepDive 流式文本 */
  deepDiveStreamingText: string | null;
}

export const initialSseState: RoundtableSseState = {
  sessionId: null,
  status: null,
  selectedSlugs: [],
  rounds: [],
  currentRound: 0,
  spikes: [],
  streamingTurn: null,
  awaitingDirector: false,
  isStreaming: false,
  error: null,
  deepDiveSession: null,
  deepDiveStreamingText: null,
};

// ========== 哲人 Emoji 映射 ==========

export const PERSONA_EMOJI_MAP: Record<string, string> = {
  socrates: '🏛️',
  nietzsche: '⚡',
  'wang-yangming': '🌿',
  'hannah-arendt': '🔦',
  'charlie-munger': '🧠',
  'richard-feynman': '🔬',
  'herbert-simon': '🎯',
};

export const PERSONA_NAME_MAP: Record<string, string> = {
  socrates: '苏格拉底',
  nietzsche: '尼采',
  'wang-yangming': '王阳明',
  'hannah-arendt': '汉娜·阿伦特',
  'charlie-munger': '查理·芒格',
  'richard-feynman': '理查德·费曼',
  'herbert-simon': '赫伯特·西蒙',
};

/** 侧边栏 Tab 类型 */
export type SidebarTab = 'proposition' | 'roundtable' | 'spikes' | 'settings';
