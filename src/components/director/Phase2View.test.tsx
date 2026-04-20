import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Phase2View } from './Phase2View';
import type { DirectorChapter } from '../../types';

const createChapters = (): DirectorChapter[] => [
  {
    chapterId: 'ch1',
    chapterIndex: 0,
    chapterName: '开篇',
    scriptText: '测试脚本内容',
    options: [
      {
        id: 'ch1-opt1',
        type: 'remotion',
        template: 'ComparisonSplit',
        props: {},
        name: '方案1',
        prompt: 'prompt1',
        imagePrompt: 'img1',
        isChecked: false,
      },
      {
        id: 'ch1-opt2',
        type: 'seedance',
        name: '方案2',
        prompt: 'prompt2',
        isChecked: true,
      },
    ],
    selectedOptionId: 'ch1-opt1',
    isLocked: false,
  },
  {
    chapterId: 'ch2',
    chapterIndex: 1,
    chapterName: '发展',
    scriptText: '测试脚本2',
    options: [
      {
        id: 'ch2-opt1',
        type: 'artlist',
        name: '方案3',
        prompt: 'prompt3',
        isChecked: false,
      },
    ],
    selectedOptionId: 'ch2-opt1',
    isLocked: false,
  },
];

describe('Phase2View', () => {
  const baseProps = {
    projectId: 'CSET-Test',
    chapters: [] as DirectorChapter[],
    isLoading: false,
    onConfirmBRoll: vi.fn(),
    onSelect: vi.fn(),
    onToggleCheck: vi.fn(),
    onBatchSetCheck: vi.fn(),
    onProceed: vi.fn(),
  };

  it('shows B-Roll selector when not confirmed', () => {
    render(<Phase2View {...baseProps} />);
    expect(screen.getByText('Select B-Roll Types')).toBeInTheDocument();
  });

  it('shows summary strip and chapter rail when confirmed', () => {
    render(<Phase2View {...baseProps} chapters={createChapters()} />);
    expect(screen.getByText('章节导航')).toBeInTheDocument();
    expect(screen.getAllByText(/第1章/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/第2章/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows filter panel with BRollSelector', () => {
    render(<Phase2View {...baseProps} chapters={createChapters()} />);
    expect(screen.getByText('过滤视觉方案')).toBeInTheDocument();
    expect(screen.getByText('A. Remotion 动画')).toBeInTheDocument();
  });

  it('calls onProceed when proceed button clicked', () => {
    const chapters = createChapters();
    chapters.forEach(ch => ch.options.forEach(o => (o.isChecked = true)));
    const handleProceed = vi.fn();
    render(<Phase2View {...baseProps} chapters={chapters} onProceed={handleProceed} />);
    fireEvent.click(screen.getByText('提交 → Phase 3'));
    expect(handleProceed).toHaveBeenCalled();
  });

  it('shows chapter cards for active and other chapters', () => {
    render(<Phase2View {...baseProps} chapters={createChapters()} />);
    expect(screen.getAllByText('开篇').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('发展').length).toBeGreaterThanOrEqual(1);
  });

  it('displays correct counts in summary strip', () => {
    render(<Phase2View {...baseProps} chapters={createChapters()} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('calls onBatchSetCheck when select all checkbox clicked', () => {
    const handleBatch = vi.fn();
    render(<Phase2View {...baseProps} chapters={createChapters()} onBatchSetCheck={handleBatch} />);
    const checkbox = screen.getByLabelText(/全选当前视图方案/);
    fireEvent.click(checkbox);
    expect(handleBatch).toHaveBeenCalled();
  });
});
