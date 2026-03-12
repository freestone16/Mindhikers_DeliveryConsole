import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('auto-regenerates thumbnail when previewUrl is cleared by an expert action', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ success: true, imageUrl: 'data:image/png;base64,fake-thumbnail' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const chapterWithPreview = createChapter('https://example.com/original-preview.png');
    const { rerender } = render(
      <ChapterCard
        chapter={chapterWithPreview}
        projectId="CSET-Seedance2"
        onSelect={() => {}}
        onToggleCheck={() => {}}
      />
    );

    const chapterWithoutPreview = createChapter(undefined);
    rerender(
      <ChapterCard
        chapter={chapterWithoutPreview}
        projectId="CSET-Seedance2"
        onSelect={() => {}}
        onToggleCheck={() => {}}
      />
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/director/phase2/thumbnail',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('auto-regenerates thumbnail when render-affecting fields change even if previewUrl stays undefined', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        json: async () => ({ success: true, imageUrl: 'data:image/png;base64,first-thumbnail' }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, imageUrl: 'data:image/png;base64,first-thumbnail' }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, imageUrl: 'data:image/png;base64,second-thumbnail' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const chapter = createChapter(undefined);
    const { rerender } = render(
      <ChapterCard
        chapter={chapter}
        projectId="CSET-Seedance2"
        onSelect={() => {}}
        onToggleCheck={() => {}}
      />
    );

    fireEvent.click(screen.getByText('生成预览'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const updatedChapter = createChapter(undefined);
    updatedChapter.options[0].props = { title: '修改后的标题', noWrap: true };

    rerender(
      <ChapterCard
        chapter={updatedChapter}
        projectId="CSET-Seedance2"
        onSelect={() => {}}
        onToggleCheck={() => {}}
      />
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
