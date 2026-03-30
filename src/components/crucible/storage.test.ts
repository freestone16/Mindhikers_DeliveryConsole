import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readPersistedCrucibleSnapshot, writeCrucibleSnapshot } from './storage';
import type { CrucibleSnapshot } from './types';

const makeSnapshot = (overrides: Partial<CrucibleSnapshot> = {}): CrucibleSnapshot => ({
  conversationId: 'conv-1',
  messages: [
    {
      id: 'm1',
      speaker: 'user',
      name: '你',
      content: '默认内容',
      createdAt: '2026-03-30T08:00:00.000Z',
      timestamp: '2026-03-30T08:00:00.000Z',
    },
  ],
  presentables: [],
  crystallizedQuotes: [],
  topicTitle: '测试话题',
  roundAnchors: [],
  roundIndex: 1,
  isThinking: false,
  questionSource: 'static',
  engineMode: 'roundtable_discovery',
  ...overrides,
});

const jsonResponse = (payload: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
  text: async () => JSON.stringify(payload),
});

const textResponse = (payload: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
  text: async () => JSON.stringify(payload),
});

describe('readPersistedCrucibleSnapshot', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers a fresher local autosave over an older active conversation', async () => {
    const localSnapshot = makeSnapshot({
      messages: [
        {
          id: 'm-local',
          speaker: 'user',
          name: '你',
          content: '本地草稿更新得更晚',
          createdAt: '2026-03-30T08:10:00.000Z',
          timestamp: '2026-03-30T08:10:00.000Z',
        },
      ],
      draftInputText: '这段未发送输入应该优先恢复',
      updatedAt: '2026-03-30T16:30:00.000Z',
      saveMode: 'autosave',
    });
    const activeSnapshot = makeSnapshot({
      messages: [
        {
          id: 'm-active',
          speaker: 'user',
          name: '你',
          content: '服务端 active 比较旧',
          createdAt: '2026-03-30T08:00:00.000Z',
          timestamp: '2026-03-30T08:00:00.000Z',
        },
      ],
      updatedAt: '2026-03-30T16:00:00.000Z',
      saveMode: 'conversation',
    });

    writeCrucibleSnapshot(localSnapshot);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ snapshot: activeSnapshot }))
      .mockResolvedValueOnce(jsonResponse({ error: 'No autosave found' }, 404)));

    const restored = await readPersistedCrucibleSnapshot();

    expect(restored?.messages?.[0]?.content).toBe('本地草稿更新得更晚');
    expect(restored?.draftInputText).toBe('这段未发送输入应该优先恢复');
    expect(restored?.updatedAt).toBe('2026-03-30T16:30:00.000Z');
    expect(JSON.parse(window.localStorage.getItem('golden-crucible-workspace-v9') || '{}').messages?.[0]?.content)
      .toBe('本地草稿更新得更晚');
  });

  it('prefers a fresher remote autosave over an older active conversation', async () => {
    const activeSnapshot = makeSnapshot({
      messages: [
        {
          id: 'm-active',
          speaker: 'user',
          name: '你',
          content: '服务端 active 比较旧',
          createdAt: '2026-03-30T08:00:00.000Z',
          timestamp: '2026-03-30T08:00:00.000Z',
        },
      ],
      updatedAt: '2026-03-30T16:00:00.000Z',
      saveMode: 'conversation',
    });
    const remoteAutosave = makeSnapshot({
      messages: [
        {
          id: 'm-autosave',
          speaker: 'user',
          name: '你',
          content: '远端 autosave 更新得更晚',
          createdAt: '2026-03-30T08:20:00.000Z',
          timestamp: '2026-03-30T08:20:00.000Z',
        },
      ],
      draftInputText: '远端未发送输入也应该跟着回来',
      updatedAt: '2026-03-30T16:40:00.000Z',
      saveMode: 'autosave',
    });

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ snapshot: activeSnapshot }))
      .mockResolvedValueOnce(textResponse(remoteAutosave)));

    const restored = await readPersistedCrucibleSnapshot();

    expect(restored?.messages?.[0]?.content).toBe('远端 autosave 更新得更晚');
    expect(restored?.draftInputText).toBe('远端未发送输入也应该跟着回来');
    expect(restored?.updatedAt).toBe('2026-03-30T16:40:00.000Z');
    expect(JSON.parse(window.localStorage.getItem('golden-crucible-workspace-v9') || '{}').messages?.[0]?.content)
      .toBe('远端 autosave 更新得更晚');
  });
});
