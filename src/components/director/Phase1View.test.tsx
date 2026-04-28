import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Phase1View } from './Phase1View';

describe('Phase1View', () => {
  const baseProps = {
    projectId: 'CSET-Test',
    scriptPath: 'projects/CSET-Test/script.md',
    concept: null,
    isGenerating: false,
    isApproved: false,
    onGenerate: vi.fn(),
    onRevise: vi.fn(),
    onApprove: vi.fn(),
  };

  it('shows empty state when no project/script selected', () => {
    render(<Phase1View {...baseProps} projectId="" scriptPath="" />);
    expect(screen.getByText('欢迎使用影视导演')).toBeInTheDocument();
  });

  it('shows generate button when project and script are set', () => {
    render(<Phase1View {...baseProps} />);
    expect(screen.getByText('开始头脑风暴')).toBeInTheDocument();
  });

  it('shows loading state when generating', () => {
    render(<Phase1View {...baseProps} isGenerating={true} />);
    expect(screen.getByText('正在生成视觉概念...')).toBeInTheDocument();
  });

  it('shows concept content and approve button when concept exists', () => {
    render(<Phase1View {...baseProps} concept="# Test Concept\nSome content" />);
    expect(screen.getByText('Test Concept')).toBeInTheDocument();
    expect(screen.getByText('批准并继续')).toBeInTheDocument();
  });

  it('calls onApprove when approve button clicked', () => {
    const handleApprove = vi.fn();
    render(<Phase1View {...baseProps} concept="Test" onApprove={handleApprove} />);
    fireEvent.click(screen.getByText('批准并继续'));
    expect(handleApprove).toHaveBeenCalled();
  });

  it('shows approved badge when isApproved is true', () => {
    render(<Phase1View {...baseProps} concept="Test" isApproved={true} />);
    expect(screen.getByText('已批准')).toBeInTheDocument();
  });

});
