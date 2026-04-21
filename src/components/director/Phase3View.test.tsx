import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Phase3View } from './Phase3View';
import type { DirectorChapter } from '../../types';

const createChapters = (): DirectorChapter[] => [
  {
    chapterId: 'ch1',
    chapterIndex: 0,
    chapterName: '第一章 开篇',
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
        isChecked: true,
        videoUrl: 'http://example.com/video1.mp4',
        phase3Approved: false,
      },
    ],
    selectedOptionId: 'ch1-opt1',
    isLocked: false,
  },
];

describe('Phase3View', () => {
  const baseProps = {
    projectId: 'CSET-Test',
    chapters: [] as DirectorChapter[],
    onApproveOption: vi.fn(),
    onUpdateOption: vi.fn(),
    onBatchApprove: vi.fn(),
    onProceed: vi.fn(),
  };

  it('shows empty state when no chapters', () => {
    render(<Phase3View {...baseProps} />);
    expect(screen.getByText(/暂无可渲染的视觉方案/)).toBeInTheDocument();
  });

  it('shows render pipeline board with stats', () => {
    render(<Phase3View {...baseProps} chapters={createChapters()} />);
    expect(screen.getAllByText(/待渲染/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/已通过/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows chapter cards with cleaned names', () => {
    render(<Phase3View {...baseProps} chapters={createChapters()} />);
    expect(screen.getByText('开篇')).toBeInTheDocument();
  });

  it('shows type labels with icons', () => {
    render(<Phase3View {...baseProps} chapters={createChapters()} />);
    expect(screen.getByText('Remotion动画')).toBeInTheDocument();
  });

  it('calls onProceed when proceed button clicked', () => {
    const handleProceed = vi.fn();
    render(<Phase3View {...baseProps} chapters={createChapters()} onProceed={handleProceed} />);
    fireEvent.click(screen.getByText(/进入 Phase 4/));
    expect(handleProceed).toHaveBeenCalled();
  });

  it('displays correct status labels', () => {
    render(<Phase3View {...baseProps} chapters={createChapters()} />);
    expect(screen.getByText('已渲染')).toBeInTheDocument();
    expect(screen.getByText('已通过')).toBeInTheDocument();
  });
});
