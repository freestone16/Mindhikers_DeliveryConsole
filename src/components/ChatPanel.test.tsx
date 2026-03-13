import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPanel } from './ChatPanel';

function createMockSocket() {
  const handlers = new Map<string, Set<(payload: any) => void>>();

  return {
    emitted: [] as Array<{ event: string; payload: any }>,
    on(event: string, handler: (payload: any) => void) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
    },
    off(event: string, handler: (payload: any) => void) {
      handlers.get(event)?.delete(handler);
    },
    emit(event: string, payload: any) {
      this.emitted.push({ event, payload });
    },
    trigger(event: string, payload: any) {
      handlers.get(event)?.forEach(handler => handler(payload));
    },
  };
}

describe('ChatPanel', () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('keeps the textarea editable while streaming and flushes assistant text once on done', async () => {
    const socket = createMockSocket();

    render(
      <ChatPanel
        isOpen={true}
        onToggle={() => {}}
        expertId="Director"
        projectId="CSET-Seedance2"
        socket={socket}
      />
    );

    const textarea = screen.getByPlaceholderText('输入消息或指令（Shift+Enter 换行）...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '把 1-2 改成 D' } });
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    expect(textarea.disabled).toBe(false);

    fireEvent.change(textarea, { target: { value: '下一条先别发' } });
    expect(textarea.value).toBe('下一条先别发');

    await act(async () => {
      socket.trigger('chat-chunk', { expertId: 'Director', chunk: '第一段' });
      socket.trigger('chat-chunk', { expertId: 'Director', chunk: '第二段' });
      socket.trigger('chat-done', { expertId: 'Director' });
    });

    await waitFor(() => {
      expect(screen.getAllByText('第一段第二段')).toHaveLength(1);
    });
  });

  it('renders structured confirm details and flushes any streaming text before the card', async () => {
    const socket = createMockSocket();

    render(
      <ChatPanel
        isOpen={true}
        onToggle={() => {}}
        expertId="Director"
        projectId="CSET-Seedance2"
        socket={socket}
      />
    );

    await act(async () => {
      socket.trigger('chat-chunk', { expertId: 'Director', chunk: '先给你看一下' });
      socket.trigger('chat-action-confirm', {
        expertId: 'Director',
        confirmId: 'confirm_1',
        actionName: 'update_option_fields',
        actionArgs: { updates: { type: 'internet-clip' } },
        title: '确认修改',
        description: '将把 1-4 改为 D. 互联网素材',
        targetLabel: '第 1 章 · 方案 4',
        diffLabel: 'type -> internet-clip',
      });
    });

    await waitFor(() => {
      expect(screen.getAllByText('先给你看一下')).toHaveLength(1);
    });

    expect(screen.getByText(/确认修改/)).toBeInTheDocument();
    expect(screen.getByText('将把 1-4 改为 D. 互联网素材')).toBeInTheDocument();
    expect(screen.getByText('第 1 章 · 方案 4')).toBeInTheDocument();
    expect(screen.getByText('type -> internet-clip')).toBeInTheDocument();
  });

  it('renders clarification as a system card instead of an assistant chat bubble', async () => {
    const socket = createMockSocket();

    render(
      <ChatPanel
        isOpen={true}
        onToggle={() => {}}
        expertId="Director"
        projectId="CSET-Seedance2"
        socket={socket}
      />
    );

    await act(async () => {
      socket.trigger('chat-confirmation', {
        expertId: 'Director',
        message: '你同时表达了“D. 互联网素材”和“E. 我自己上传”，请明确保留哪一种。',
      });
    });

    expect(screen.getByText('系统澄清')).toBeInTheDocument();
    expect(screen.getByText('你同时表达了“D. 互联网素材”和“E. 我自己上传”，请明确保留哪一种。')).toBeInTheDocument();
  });

  it('persists confirm cards before executing actions', async () => {
    const socket = createMockSocket();

    render(
      <ChatPanel
        isOpen={true}
        onToggle={() => {}}
        expertId="Director"
        projectId="CSET-Seedance2"
        socket={socket}
      />
    );

    await act(async () => {
      socket.trigger('chat-action-confirm', {
        expertId: 'Director',
        confirmId: 'confirm_1',
        actionName: 'update_option_fields',
        actionArgs: { chapterId: 'ch1', optionId: 'ch1-opt2', updates: { type: 'internet-clip' } },
        title: '确认修改',
        description: '将把 1-2 改为 D. 互联网素材',
      });
    });

    fireEvent.click(screen.getByText('确认执行'));

    expect(socket.emitted.some(entry => entry.event === 'chat-save')).toBe(true);
    expect(socket.emitted.some(entry => entry.event === 'chat-action-execute')).toBe(true);
  });

  it('persists cancelled confirm cards', async () => {
    const socket = createMockSocket();

    render(
      <ChatPanel
        isOpen={true}
        onToggle={() => {}}
        expertId="Director"
        projectId="CSET-Seedance2"
        socket={socket}
      />
    );

    await act(async () => {
      socket.trigger('chat-action-confirm', {
        expertId: 'Director',
        confirmId: 'confirm_2',
        actionName: 'update_option_fields',
        actionArgs: { chapterId: 'ch1', optionId: 'ch1-opt2', updates: { type: 'internet-clip' } },
        title: '确认修改',
        description: '将把 1-2 改为 D. 互联网素材',
      });
    });

    fireEvent.click(screen.getByText('取消'));

    expect(socket.emitted.some(entry => entry.event === 'chat-save')).toBe(true);
    expect(screen.getByText('✕ 已取消')).toBeInTheDocument();
  });
});
