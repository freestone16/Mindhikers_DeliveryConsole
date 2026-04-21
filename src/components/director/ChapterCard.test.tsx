import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChapterCard } from './ChapterCard';
import type { DirectorChapter } from '../../types';

const createChapter = (previewUrl?: string): DirectorChapter => ({
  chapterId: 'ch1',
  chapterIndex: 0,
  chapterName: '开篇',
  scriptText: '测试脚本内容',
  options: [
    {
      id: 'ch1-opt1',
      type: 'remotion',
      template: 'ComparisonSplit',
      props: { title: '原始标题' },
      name: '测试方案',
      prompt: 'test prompt',
      imagePrompt: 'test image prompt',
      previewUrl,
      quote: '测试引用',
      isChecked: false,
    },
  ],
  selectedOptionId: 'ch1-opt1',
  isLocked: false,
});

describe('ChapterCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders chapter header and options', () => {
    const chapter = createChapter();
    render(
      <ChapterCard
        chapter={chapter}
        projectId="CSET-Seedance2"
        onSelect={() => {}}
        onToggleCheck={() => {}}
      />
    );

    expect(screen.getByText('第1章')).toBeInTheDocument();
    expect(screen.getByText('开篇')).toBeInTheDocument();
    expect(screen.getByText('测试引用')).toBeInTheDocument();
  });

  it('calls onToggleCheck when confirm button is clicked', () => {
    const chapter = createChapter();
    const handleToggle = vi.fn();
    render(
      <ChapterCard
        chapter={chapter}
        projectId="CSET-Seedance2"
        onSelect={() => {}}
        onToggleCheck={handleToggle}
      />
    );

    const confirmBtn = screen.getByTitle('确认该方案，加入渲染队列');
    fireEvent.click(confirmBtn);
    expect(handleToggle).toHaveBeenCalledWith('ch1', 'ch1-opt1');
  });
});
