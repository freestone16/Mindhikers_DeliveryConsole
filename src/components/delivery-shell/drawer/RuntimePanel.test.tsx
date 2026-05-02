import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RuntimePanel } from './RuntimePanel';
import type { RuntimeActionEvent } from '../../../types';

const action: RuntimeActionEvent = {
  id: 'action-1',
  timestamp: new Date('2026-05-02T12:00:00+08:00').getTime(),
  type: 'approve',
  label: '确认',
  message: 'P2 确认方案 ch1/ch1-opt1',
  status: 'success',
  phase: 2,
  target: 'ch1/ch1-opt1',
};

describe('RuntimePanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ version: 'test-version' }),
    })));
  });

  it('renders structured runtime actions in the action trace', async () => {
    render(
      <RuntimePanel
        currentModel={{ provider: 'kimi', model: 'moonshot' }}
        logs={[]}
        actions={[action]}
        isLoading={false}
      />
    );

    expect(await screen.findByText('test-version')).toBeInTheDocument();
    expect(screen.getByText('动作追踪')).toBeInTheDocument();
    expect(screen.getByText('确认')).toBeInTheDocument();
    expect(screen.getByText('P2 确认方案 ch1/ch1-opt1')).toBeInTheDocument();
  });

  it('surfaces a pending active action as current work', async () => {
    const pendingAction: RuntimeActionEvent = {
      ...action,
      id: 'action-2',
      label: '生成',
      message: 'P2 开始生成视觉执行方案',
      status: 'pending',
    };

    render(
      <RuntimePanel
        logs={[]}
        actions={[pendingAction]}
        activeAction={pendingAction}
        isLoading
        startTime={pendingAction.timestamp}
      />
    );

    expect(await screen.findByText('test-version')).toBeInTheDocument();
    expect(screen.getByText(/当前动作：/)).toBeInTheDocument();
    expect(screen.getAllByText('P2 开始生成视觉执行方案').length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to log-derived action trace when structured actions are absent', async () => {
    render(
      <RuntimePanel
        logs={[{
          timestamp: action.timestamp,
          type: 'info',
          message: 'P2 生成视觉执行方案完成',
        }]}
        actions={[]}
        isLoading={false}
      />
    );

    expect(await screen.findByText('test-version')).toBeInTheDocument();
    expect(screen.getAllByText('P2 生成视觉执行方案完成').length).toBeGreaterThanOrEqual(1);
  });
});
