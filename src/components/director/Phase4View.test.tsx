import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Phase4View } from './Phase4View';
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
        phase3Approved: true,
      },
    ],
    selectedOptionId: 'ch1-opt1',
    isLocked: false,
  },
];

describe('Phase4View', () => {
  const baseProps = {
    projectId: 'CSET-Test',
    chapters: [] as DirectorChapter[],
  };

  it('shows delivery sequence stepper', () => {
    render(<Phase4View {...baseProps} />);
    expect(screen.getAllByText(/找到 SRT/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/对齐时轴/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/生成 XML/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/下载交付/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows srt upload area', () => {
    render(<Phase4View {...baseProps} chapters={createChapters()} />);
    expect(screen.getByText(/点击或拖拽 SRT 文件到此处/)).toBeInTheDocument();
    expect(screen.getByText(/仅支持 .srt 格式/)).toBeInTheDocument();
  });

  it('shows skip srt button', () => {
    render(<Phase4View {...baseProps} chapters={createChapters()} />);
    expect(screen.getByText(/跳过 SRT/)).toBeInTheDocument();
  });

  it('shows scan status when loading', () => {
    render(<Phase4View {...baseProps} chapters={createChapters()} />);
    expect(screen.getByText(/正在扫描项目目录寻找 SRT 文件/)).toBeInTheDocument();
  });

  it('shows step 1 header', () => {
    render(<Phase4View {...baseProps} chapters={createChapters()} />);
    expect(screen.getByText(/步骤 1: 找到 SRT 字幕文件/)).toBeInTheDocument();
  });
});
