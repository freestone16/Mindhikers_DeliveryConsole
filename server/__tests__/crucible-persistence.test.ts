import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import type {
  CrucibleConversationDetail,
  CrucibleConversationSnapshot,
  CrucibleConversationSummary,
} from '../crucible-persistence';

vi.mock('../auth', () => ({
  getAuthPool: () => ({}),
  getSessionFromRequest: vi.fn(),
  isAuthEnabled: () => false,
}), { virtual: true });

vi.mock('../auth/workspace-store', () => ({
  ensurePersonalWorkspace: vi.fn(),
}), { virtual: true });

let appendSpikesToCrucibleConversation: typeof import('../crucible-persistence').appendSpikesToCrucibleConversation;
let buildCrucibleArtifactExport: typeof import('../crucible-persistence').buildCrucibleArtifactExport;

type StoredConversation = {
  id: string;
  workspaceId: string;
  topicTitle: string;
  status: 'active' | 'archived';
  sourceContext: {
    projectId: string;
    scriptPath: string;
  };
  createdAt: string;
  updatedAt: string;
  roundIndex: number;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    speaker: string;
    content: string;
    createdAt: string;
  }>;
  turns: unknown[];
  artifacts: Array<{
    id: string;
    type: 'reference' | 'quote' | 'asset' | 'spike';
    title: string;
    summary: string;
    content: string;
    roundIndex: number;
    createdAt: string;
  }>;
  snapshot?: CrucibleConversationSnapshot;
};

const TEST_RUNTIME_DIR = path.join(process.cwd(), 'test-crucible-runtime');
const WORKSPACE_DIR = path.join(TEST_RUNTIME_DIR, 'workspace-1');
const CONVERSATION_ID = 'conversation-1';
const CONVERSATION_FILE = path.join(WORKSPACE_DIR, 'conversations', `${CONVERSATION_ID}.json`);

const createContext = () => ({
  workspaceId: 'workspace-1',
  workspaceDir: WORKSPACE_DIR,
  conversationId: CONVERSATION_ID,
  projectId: 'test-project',
  scriptPath: '/scripts/test.ts',
  mode: 'legacy' as const,
});

const ensureWorkspace = () => {
  if (fs.existsSync(TEST_RUNTIME_DIR)) {
    fs.rmSync(TEST_RUNTIME_DIR, { recursive: true });
  }
  fs.mkdirSync(path.join(WORKSPACE_DIR, 'conversations'), { recursive: true });
};

const buildSnapshot = (conversation: StoredConversation): CrucibleConversationSnapshot => ({
  conversationId: conversation.id,
  messages: [],
  presentables: [],
  crystallizedQuotes: [],
  topicTitle: conversation.topicTitle,
  roundAnchors: [],
  roundIndex: conversation.roundIndex,
  isThinking: false,
  questionSource: 'static',
  engineMode: 'roundtable_discovery',
});

const buildSummary = (conversation: StoredConversation): CrucibleConversationSummary => ({
  id: conversation.id,
  workspaceId: conversation.workspaceId,
  topicTitle: conversation.topicTitle,
  status: conversation.status,
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
  roundIndex: conversation.roundIndex,
  lastSpeaker: 'system',
  lastFocus: conversation.topicTitle,
  messageCount: conversation.messages.length,
  artifactCount: conversation.artifacts.length,
});

const buildDetail = (conversation: StoredConversation): CrucibleConversationDetail => ({
  summary: buildSummary(conversation),
  snapshot: conversation.snapshot || buildSnapshot(conversation),
  artifacts: conversation.artifacts,
  sourceContext: conversation.sourceContext,
});

describe('crucible-persistence', () => {
  beforeAll(async () => {
    const persistence = await import('../crucible-persistence');
    appendSpikesToCrucibleConversation = persistence.appendSpikesToCrucibleConversation;
    buildCrucibleArtifactExport = persistence.buildCrucibleArtifactExport;
  });
  beforeEach(() => {
    ensureWorkspace();
  });

  afterEach(() => {
    if (fs.existsSync(TEST_RUNTIME_DIR)) {
      fs.rmSync(TEST_RUNTIME_DIR, { recursive: true });
    }
  });

  it('happy path: appendSpikes writes spike artifacts with source info', () => {
    const context = createContext();
    const conversation = appendSpikesToCrucibleConversation(context, {
      sessionId: 'session-1',
      topicTitle: '正义的裂缝',
      spikes: [
        {
          id: 'spike-1',
          title: '内在秩序的正义观',
          summary: '正义源于灵魂秩序',
          content: '正义不是外部契约，而是内在的灵魂秩序。',
          sourceSpeaker: 'socrates',
          roundIndex: 0,
          bridgeHint: '内外正义的冲突值得深聊',
          tensionLevel: 4,
        },
        {
          id: 'spike-2',
          title: '共识规则的正义观',
          summary: '正义来自共识规则',
          content: '正义更像社会共识形成的规则。',
          sourceSpeaker: 'naval',
          roundIndex: 1,
          isFallback: true,
        },
      ],
    });

    expect(conversation.artifacts).toHaveLength(2);
    expect(conversation.artifacts[0].type).toBe('spike');

    const stored = JSON.parse(fs.readFileSync(CONVERSATION_FILE, 'utf-8')) as StoredConversation;
    expect(stored.artifacts).toHaveLength(2);
    expect(stored.artifacts[0].type).toBe('spike');
    expect(stored.artifacts[0].title).toBe('内在秩序的正义观');
    expect(stored.artifacts[0].content).toContain('来源：socrates，第 1 轮');
    expect(stored.artifacts[0].content).toContain('张力等级：4/5');
    expect(stored.artifacts[1].content).toContain('（规则兜底生成）');
  });

  it('edge case: legacy conversation without spike can be read and exported', () => {
    const legacyConversation: StoredConversation = {
      id: CONVERSATION_ID,
      workspaceId: 'workspace-1',
      topicTitle: '旧议题',
      status: 'active',
      sourceContext: {
        projectId: 'test-project',
        scriptPath: '/scripts/test.ts',
      },
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:00.000Z',
      roundIndex: 0,
      messages: [],
      turns: [],
      artifacts: [
        {
          id: 'legacy-1',
          type: 'quote',
          title: '旧金句',
          summary: '旧摘要',
          content: '旧内容',
          roundIndex: 0,
          createdAt: '2026-04-10T00:00:00.000Z',
        },
      ],
    };

    fs.writeFileSync(CONVERSATION_FILE, JSON.stringify(legacyConversation, null, 2), 'utf-8');

    const context = createContext();
    const conversation = appendSpikesToCrucibleConversation(context, {
      sessionId: 'session-legacy',
      topicTitle: '旧议题',
      spikes: [],
    });

    const exportResult = buildCrucibleArtifactExport(buildDetail(conversation), { format: 'markdown' });
    expect(exportResult.body).toContain('旧金句');
    expect(exportResult.body).toContain('- 类型：quote');
  });

  it('integration: markdown export contains spike artifacts', () => {
    const context = createContext();
    const conversation = appendSpikesToCrucibleConversation(context, {
      sessionId: 'session-2',
      topicTitle: '正义的裂缝',
      spikes: [
        {
          id: 'spike-3',
          title: '正义的内外张力',
          summary: '内外正义的冲突',
          content: '正义既是内在秩序，也可能是外部共识。',
          sourceSpeaker: 'socrates',
          roundIndex: 1,
          bridgeHint: '内外正义如何调和',
          tensionLevel: 3,
        },
      ],
    });

    const exportResult = buildCrucibleArtifactExport(buildDetail(conversation), { format: 'markdown' });
    expect(exportResult.body).toContain('正义的内外张力');
    expect(exportResult.body).toContain('- 类型：spike');
    expect(exportResult.body).toContain('来源：socrates，第 2 轮');
  });
});
