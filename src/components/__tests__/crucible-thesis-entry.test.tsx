import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatPanel } from '../ChatPanel';

window.HTMLElement.prototype.scrollIntoView = vi.fn();

const createSocketMock = () => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
});

const buildMessage = (overrides?: Partial<{ id: string; content: string; authorId: string }>) => ({
    id: overrides?.id || 'msg-1',
    role: 'assistant' as const,
    content: overrides?.content || '这里是对话内容',
    timestamp: '2026-04-12T00:00:00Z',
    meta: {
        authorId: overrides?.authorId || 'oldlu',
        authorName: '老卢',
    },
});

const renderChatPanel = (options?: {
    expertId?: string;
    thesisReady?: boolean;
    onEnterThesisWriter?: () => void;
}) => {
    const socket = createSocketMock();
    const message = buildMessage();

    return render(
        <ChatPanel
            isOpen
            onToggle={vi.fn()}
            expertId={options?.expertId || 'GoldenMetallurgist'}
            projectId="project-1"
            scriptPath="/scripts/test.md"
            resetToken={0}
            externalMessages={[message]}
            thesisReady={options?.thesisReady}
            onEnterThesisWriter={options?.onEnterThesisWriter}
            socket={socket}
        />
    );
};

describe('ChatPanel ThesisWriter CTA', () => {
    it('renders CTA when thesisReady is true in crucible mode with oldlu message', async () => {
        renderChatPanel({ thesisReady: true });

        await screen.findByText('这里是对话内容');
        expect(screen.getByText('生成论文')).toBeInTheDocument();
    });

    it('does not render CTA when thesisReady is false in crucible mode', async () => {
        renderChatPanel({ thesisReady: false });

        await screen.findByText('这里是对话内容');
        expect(screen.queryByText('生成论文')).not.toBeInTheDocument();
    });

    it('does not render CTA in non-crucible mode even when thesisReady is true', async () => {
        renderChatPanel({ expertId: 'OtherExpert', thesisReady: true });

        await screen.findByText('这里是对话内容');
        expect(screen.queryByText('生成论文')).not.toBeInTheDocument();
    });

    it('calls onEnterThesisWriter when clicking CTA', async () => {
        const onEnterThesisWriter = vi.fn();
        renderChatPanel({ thesisReady: true, onEnterThesisWriter });

        const cta = await screen.findByText('生成论文');
        fireEvent.click(cta);

        await waitFor(() => {
            expect(onEnterThesisWriter).toHaveBeenCalledTimes(1);
        });
    });
});
