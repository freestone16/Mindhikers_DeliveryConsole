import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Maximize2, X, Loader2, CheckCircle, AlertCircle, Check,
  Video, BarChart3, Layers,
  Film, Code
} from 'lucide-react';
import { BRollSelector } from './BRollSelector';
import {
  PhasePanel, PhasePanelHeader, PhasePanelBody,
  PhaseEmptyState
} from './phase-layouts/PhasePanel';
import type { DirectorChapter, SceneOption, BRollType } from '../../types';

// Re-export for DirectorSection to use
export const RENDERABLE_TYPES: BRollType[] = ['remotion', 'seedance', 'generative', 'infographic'];

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  remotion: 'bg-[#c97545]/15 text-[#c97545]',
  seedance: 'bg-[#9b6b9e]/15 text-[#9b6b9e]',
  generative: 'bg-[#9b6b9e]/15 text-[#9b6b9e]',
  infographic: 'bg-[#a68b4b]/15 text-[#a68b4b]',
};

const TYPE_LABELS: Record<string, string> = {
  remotion: 'Remotion动画',
  seedance: '文生视频',
  generative: 'AI生成',
  infographic: '信息图',
};

const TYPE_ICONS: Record<string, typeof Code> = {
  remotion: Code,
  seedance: Film,
  generative: Film,
  infographic: BarChart3,
};

const buildRenderBatchOptionPayload = (option: SceneOption) => ({
  id: option.id,
  type: option.type,
  template: option.template,
  props: option.props,
  name: option.name,
  prompt: option.prompt,
  imagePrompt: option.imagePrompt || option.revisedPrompt,
  infographicLayout: option.infographicLayout,
  infographicStyle: option.infographicStyle,
  infographicUseMode: option.infographicUseMode,
});

function getScriptPreview(text: string): string {
  const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
  if (sentences.length >= 2) {
    return sentences.slice(0, 2).join('。') + '。';
  }
  return text.slice(0, 150) + (text.length > 150 ? '...' : '');
}

/** Strip redundant "第X章" prefix from chapter names at render time */
const cleanChapterName = (name: string) =>
  name.replace(/^(?:[\d\-\.]+\s+)?第[一二三四五六七八九十百\d\s]+章[：:\s]*/u, '').trim();

// ─── Types ───────────────────────────────────────────────────────────────────

interface VideoTaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  progress?: number;
  error?: string;
  retryCount?: number;
}

// ─── Status helpers ──────────────────────────────────────────────────────────

type ItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'approved';

function getItemStatus(option: SceneOption, taskStatus: VideoTaskStatus | null, isPolling: boolean): ItemStatus {
  if (option.phase3Approved) return 'approved';
  if (isPolling || taskStatus?.status === 'processing' || taskStatus?.status === 'pending') return 'processing';
  if (taskStatus?.status === 'failed') return 'failed';
  if (option.videoUrl || taskStatus?.status === 'completed') return 'completed';
  return 'pending';
}

function statusLabel(status: ItemStatus): string {
  switch (status) {
    case 'approved': return '已通过';
    case 'completed': return '已渲染';
    case 'processing': return '渲染中';
    case 'failed': return '失败';
    case 'pending': return '待渲染';
  }
}

function statusDotClass(status: ItemStatus): string {
  switch (status) {
    case 'approved': return 'bg-[#62835c]';
    case 'completed': return 'bg-[#5b8a9b]';
    case 'processing': return 'bg-[#c97545] animate-pulse';
    case 'failed': return 'bg-red-500';
    case 'pending': return 'bg-[#e4dbcc]';
  }
}

// ─── Phase3OptionRow ─────────────────────────────────────────────────────────

interface Phase3OptionRowProps {
  chapter: DirectorChapter;
  option: SceneOption;
  index: number;
  projectId: string;
  isPendingTask: boolean;
  onApprove: (chapterId: string, optionId: string) => void;
  onUpdateOption: (chapterId: string, optionId: string, updates: Partial<SceneOption>) => void;
  onRetry: (chapterId: string, option: SceneOption) => void;
  onTaskComplete?: (taskKey: string) => void;
}

const Phase3OptionRow = ({
  chapter, option, index, projectId, isPendingTask,
  onApprove, onUpdateOption, onRetry, onTaskComplete
}: Phase3OptionRowProps) => {
  const [taskStatus, setTaskStatus] = useState<VideoTaskStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [revisedPrompt, setRevisedPrompt] = useState(option.revisedPrompt || '');
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rowId = `${chapter.chapterIndex + 1}-${index + 1}`;
  const quoteText = option.quote || getScriptPreview(chapter.scriptText);
  const taskKey = `${chapter.chapterId}-${option.id}`;

  // ── Polling ──
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/director/phase3/video/${encodeURIComponent(taskKey)}`);
      const data = await res.json();
      if (data.success) {
        setTaskStatus(data.task);
        if (data.task.status === 'completed' && data.task.videoUrl) {
          onUpdateOption(chapter.chapterId, option.id, { videoUrl: data.task.videoUrl });
          setIsPolling(false);
          onTaskComplete?.(taskKey);
        } else if (data.task.status === 'failed') {
          setIsPolling(false);
          onTaskComplete?.(taskKey);
        }
      }
    } catch {}
  }, [taskKey, chapter.chapterId, option.id, onUpdateOption]);

  useEffect(() => {
    if ((isPendingTask || isPolling) && !taskStatus?.status?.match(/completed|failed/)) {
      setIsPolling(true);
      pollIntervalRef.current = setInterval(pollStatus, 3000);
      pollStatus();
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isPendingTask, isPolling, pollStatus]);

  useEffect(() => {
    if (isPolling && taskStatus?.status?.match(/completed|failed/)) {
      setIsPolling(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
  }, [isPolling, taskStatus]);

  // ESC to close fullscreen
  useEffect(() => {
    if (!showFullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowFullscreen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showFullscreen]);

  const videoUrl = option.videoUrl || taskStatus?.videoUrl;
  const itemStatus = getItemStatus(option, taskStatus, isPolling);
  const isCompleted = itemStatus === 'completed' || itemStatus === 'approved';

  // ── Feedback / Revise ──
  const handleRevise = async () => {
    if (!feedbackText.trim()) return;
    setIsRevising(true);
    try {
      const res = await fetch('/api/director/phase2/revise-option', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, chapterId: chapter.chapterId, optionId: option.id, userFeedback: feedbackText })
      });
      const data = await res.json();
      if (data.success) {
        setRevisedPrompt(data.revisedPrompt || '');
        onUpdateOption(chapter.chapterId, option.id, { revisedPrompt: data.revisedPrompt });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRevising(false);
    }
  };

  const handleApplyAndRender = () => {
    onUpdateOption(chapter.chapterId, option.id, {
      videoUrl: undefined,
      phase3Approved: false,
      revisedPrompt,
      ...(revisedPrompt && { imagePrompt: revisedPrompt })
    } as Partial<SceneOption>);
    setShowFeedback(false);
    setFeedbackText('');
    onRetry(chapter.chapterId, option);
  };

  const TypeIcon = TYPE_ICONS[option.type] || Film;

  // ── Render ──
  return (
    <>
      <div className={`grid grid-cols-12 gap-3 p-3 rounded-lg border transition-all ${
        option.phase3Approved
          ? 'border-[#62835c]/40 bg-[#dce9d8]/30'
          : itemStatus === 'processing'
            ? 'border-[#c97545]/40 bg-[#c97545]/5'
            : itemStatus === 'failed'
              ? 'border-red-300/40 bg-red-50/30'
              : 'border-[#e4dbcc] bg-[#faf6ef]/60 hover:border-[#d8c8ae]'
      }`}>
        {/* 状态点 + 序号 (col 1) */}
        <div className="col-span-1 flex flex-col items-center justify-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${statusDotClass(itemStatus)}`} />
          <span className="text-[10px] text-[#8f8372] font-mono">{rowId}</span>
        </div>

        {/* 类型标签 + 方案名 (col 2) */}
        <div className="col-span-2 flex flex-col justify-center gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${TYPE_COLORS[option.type] || 'bg-[#e4dbcc] text-[#8f8372]'}`}>
              <TypeIcon className="w-3 h-3" />
              {TYPE_LABELS[option.type] || option.type}
            </span>
          </div>
          <p className="text-[#342d24] text-xs font-medium leading-relaxed line-clamp-2">
            {option.name || option.prompt || '暂无方案描述'}
          </p>
          <p className="text-[10px] text-[#8f8372]">{statusLabel(itemStatus)}</p>
        </div>

        {/* 原文 (col 2) */}
        <div className="col-span-2 flex items-center">
          <p className="text-[#6b5e4f] text-xs leading-relaxed line-clamp-3 whitespace-pre-wrap">
            {quoteText}
          </p>
        </div>

        {/* 提示词 (col 3) */}
        <div className="col-span-3 flex flex-col justify-center gap-1 px-2 -mx-2">
          <p className="text-[#342d24] text-xs leading-relaxed line-clamp-3">
            {option.prompt || option.imagePrompt || '暂无方案描述'}
          </p>
          {option.rationale && (
            <p className="text-[#8f8372] text-[10px] italic mt-0.5 line-clamp-2">
              {option.rationale}
            </p>
          )}
        </div>

        {/* 视频播放区 (col 3) */}
        <div className="col-span-3 flex flex-col gap-1.5">
          <div className="w-full aspect-video bg-[#f4efe5] rounded overflow-hidden relative group border border-[#e4dbcc]">
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain bg-black"
                  preload="metadata"
                />
                <button
                  onClick={() => setShowFullscreen(true)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Maximize2 className="w-4 h-4 text-white" />
                </button>
              </>
            ) : itemStatus === 'processing' ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#f4efe5]">
                <Loader2 className="w-5 h-5 text-[#c97545] animate-spin" />
                <span className="text-[10px] text-[#c97545] mt-2">渲染中...</span>
                {taskStatus?.progress != null && (
                  <div className="mt-2 w-24 bg-[#e4dbcc] rounded-full h-1">
                    <div
                      className="bg-[#c97545] h-1 rounded-full transition-all"
                      style={{ width: `${taskStatus.progress}%` }}
                    />
                  </div>
                )}
                {taskStatus?.retryCount != null && taskStatus.retryCount > 0 && (
                  <span className="text-[9px] text-[#b5653a] mt-1">第 {taskStatus.retryCount} 次重试</span>
                )}
              </div>
            ) : itemStatus === 'failed' ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#f4efe5]">
                <AlertCircle className="w-5 h-5 text-red-500 mb-1" />
                <span className="text-red-600 text-xs font-medium bg-red-500/10 px-2 py-1 rounded">
                  {taskStatus?.error || '渲染失败'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRetry(chapter.chapterId, option); }}
                  className="text-[10px] text-[#6b5e4f] mt-2 hover:text-[#342d24] underline decoration-[#d8c8ae] underline-offset-2"
                >
                  重试渲染
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onRetry(chapter.chapterId, option); }}
                className="w-full h-full flex flex-col items-center justify-center hover:bg-[#e4dbcc]/50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-[#c97545]/15 group-hover:bg-[#c97545]/25 flex items-center justify-center transition-colors">
                  <Play className="w-5 h-5 text-[#c97545] group-hover:text-[#b26135]" />
                </div>
                <span className="text-[10px] text-[#8f8372] group-hover:text-[#c97545] font-medium mt-1">单条渲染</span>
              </button>
            )}
          </div>
        </div>

        {/* 审阅通过 (col 1) */}
        <div className="col-span-1 flex flex-col items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove(chapter.chapterId, option.id);
            }}
            disabled={!isCompleted}
            title={isCompleted ? (option.phase3Approved ? '取消通过' : '标记通过') : '请先完成渲染'}
            className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all ${
              option.phase3Approved
                ? 'bg-[#62835c] border-[#62835c] text-white hover:bg-[#4d6b5f]'
                : isCompleted
                  ? 'border-[#d8c8ae] hover:border-[#62835c] opacity-60 hover:opacity-100 hover:bg-[#dce9d8]/50'
                  : 'border-[#e4dbcc] opacity-30 cursor-not-allowed'
            }`}
          >
            {option.phase3Approved && <Check className="w-4 h-4" />}
          </button>
          {!option.phase3Approved && isCompleted && (
            <span className="text-[9px] text-[#8f8372]">通过</span>
          )}
        </div>
      </div>

      {/* Feedback drawer */}
      {showFeedback && (
        <div className="mx-3 mb-2 p-3 rounded-lg border border-[#e4dbcc] bg-[#f4efe5]/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#342d24]">修订反馈</span>
            <button onClick={() => setShowFeedback(false)} className="text-[10px] text-[#8f8372] hover:text-[#342d24]">关闭</button>
          </div>
          <textarea
            className="w-full bg-[#faf6ef] border border-[#e4dbcc] rounded-lg p-2.5 text-[#342d24] text-xs placeholder-[#c9baa3] focus:outline-none focus:border-[#c97545]"
            rows={2}
            placeholder="输入修改意见..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleRevise}
              disabled={isRevising || !feedbackText.trim()}
              className="px-3 py-1.5 bg-[#f4efe5] hover:bg-[#e4dbcc] text-[#342d24] rounded text-xs border border-[#e4dbcc] disabled:opacity-50"
            >
              {isRevising ? '生成中...' : '生成修订'}
            </button>
            {revisedPrompt && (
              <button
                onClick={handleApplyAndRender}
                className="px-3 py-1.5 bg-[#c97545] hover:bg-[#b26135] text-white rounded text-xs"
              >
                应用并重新渲染
              </button>
            )}
          </div>
          {revisedPrompt && (
            <div className="mt-2 p-2 bg-[#faf6ef] rounded border border-[#e4dbcc]">
              <span className="text-[10px] text-[#8f8372] uppercase tracking-wider">修订后提示词</span>
              <p className="text-xs text-[#342d24] mt-1">{revisedPrompt}</p>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen video portal */}
      {showFullscreen && videoUrl && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            className="fixed top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10"
            onClick={() => setShowFullscreen(false)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <video
            src={videoUrl}
            controls
            autoPlay
            className="max-w-full max-h-full"
            onClick={e => e.stopPropagation()}
          />
          <p className="text-slate-400 text-xs mt-3">{option.name}</p>
        </div>,
        document.body
      )}
    </>
  );
};

// ─── Phase3ChapterCard ───────────────────────────────────────────────────────

interface Phase3ChapterCardProps {
  chapter: DirectorChapter;
  projectId: string;
  pendingTaskKeys: Set<string>;
  onApprove: (chapterId: string, optionId: string) => void;
  onUpdateOption: (chapterId: string, optionId: string, updates: Partial<SceneOption>) => void;
  onRetry: (chapterId: string, option: SceneOption) => void;
  onTaskComplete: (taskKey: string) => void;
}

const Phase3ChapterCard = ({
  chapter, projectId, pendingTaskKeys,
  onApprove, onUpdateOption, onRetry, onTaskComplete
}: Phase3ChapterCardProps) => {
  const approvedAll = chapter.options.length > 0 && chapter.options.every(o => o.phase3Approved);
  const displayName = cleanChapterName(chapter.chapterName);
  const approvedCount = chapter.options.filter(o => o.phase3Approved).length;

  return (
    <PhasePanel className="overflow-hidden">
      {/* Chapter header */}
      <PhasePanelHeader
        title={
          <>
            <span className="text-[#c97545] font-bold text-sm">第{chapter.chapterIndex + 1}章</span>
            <span className="text-[#342d24] font-medium text-sm ml-2">{displayName}</span>
            {approvedAll && <Check className="w-4 h-4 text-[#62835c] ml-2" />}
          </>
        }
        actions={
          <span className="text-xs text-[#8f8372]">
            {approvedCount}/{chapter.options.length} 通过
          </span>
        }
      />

      <PhasePanelBody className="p-3">
        {/* Column headers */}
        <div className="grid grid-cols-12 gap-3 mb-2 px-1">
          <div className="col-span-1 text-[10px] text-[#8f8372] font-bold text-center uppercase tracking-wider">状态</div>
          <div className="col-span-2 text-[10px] text-[#8f8372] font-bold uppercase tracking-wider">类型</div>
          <div className="col-span-2 text-[10px] text-[#8f8372] font-bold uppercase tracking-wider">原文</div>
          <div className="col-span-3 text-[10px] text-[#8f8372] font-bold uppercase tracking-wider">设计方案</div>
          <div className="col-span-3 text-[10px] text-[#8f8372] font-bold text-center uppercase tracking-wider">视频</div>
          <div className="col-span-1 text-[10px] text-[#8f8372] font-bold text-center uppercase tracking-wider">审阅</div>
        </div>

        <div className="flex flex-col gap-2">
          {chapter.options.map((option, idx) => (
            <Phase3OptionRow
              key={option.id}
              chapter={chapter}
              option={option}
              index={idx}
              projectId={projectId}
              isPendingTask={pendingTaskKeys.has(`${chapter.chapterId}-${option.id}`)}
              onApprove={onApprove}
              onUpdateOption={onUpdateOption}
              onRetry={onRetry}
              onTaskComplete={onTaskComplete}
            />
          ))}
        </div>
      </PhasePanelBody>
    </PhasePanel>
  );
};

// ─── RenderPipelineBoard (编排概览) ──────────────────────────────────────────

interface PipelineStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  approved: number;
}

function computePipelineStats(chapters: DirectorChapter[]): PipelineStats {
  const all = chapters.flatMap(c => c.options.filter(o => RENDERABLE_TYPES.includes(o.type as BRollType)));
  return {
    total: all.length,
    pending: all.filter(o => !o.videoUrl && !o.phase3Approved).length,
    processing: 0, // Will be tracked via pendingTaskKeys in parent
    completed: all.filter(o => !!o.videoUrl && !o.phase3Approved).length,
    failed: 0, // Will be tracked via taskStatus in children
    approved: all.filter(o => o.phase3Approved).length,
  };
}

interface RenderPipelineBoardProps {
  chapters: DirectorChapter[];
  pendingTaskKeys: Set<string>;
  totalCount: number;
  totalApproved: number;
}

function RenderPipelineBoard({
  chapters, pendingTaskKeys, totalCount, totalApproved
}: RenderPipelineBoardProps) {
  const stats = computePipelineStats(chapters);
  const processingCount = pendingTaskKeys.size;
  const completedCount = stats.completed + stats.approved;
  const progressPercent = totalCount > 0 ? Math.round((totalApproved / totalCount) * 100) : 0;

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-[#e4dbcc]" style={{ background: 'rgba(250, 246, 239, 0.9)' }}>
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#8f8372]" />
          <span className="text-[10px] text-[#8f8372] uppercase tracking-wider font-bold">待渲染</span>
          <span className="text-sm font-bold text-[#c97545]">{stats.pending}</span>
        </div>
        {processingCount > 0 && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-[#c97545] animate-spin" />
            <span className="text-[10px] text-[#8f8372] uppercase tracking-wider font-bold">渲染中</span>
            <span className="text-sm font-bold text-[#c97545]">{processingCount}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#8f8372]" />
          <span className="text-[10px] text-[#8f8372] uppercase tracking-wider font-bold">已完成</span>
          <span className="text-sm font-bold text-[#5b8a9b]">{completedCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-[#8f8372]" />
          <span className="text-[10px] text-[#8f8372] uppercase tracking-wider font-bold">已通过</span>
          <span className="text-sm font-bold text-[#62835c]">{stats.approved}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-[#8f8372]">{totalApproved}/{totalCount} 已通过</span>
        <div className="w-24 h-1.5 bg-[#e4dbcc] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#62835c] rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-[#8f8372] w-8 text-right">{progressPercent}%</span>
      </div>
    </div>
  );
}

// ─── Phase3View ──────────────────────────────────────────────────────────────

interface Phase3ViewProps {
  projectId: string;
  chapters: DirectorChapter[];
  onApproveOption: (chapterId: string, optionId: string) => void;
  onUpdateOption: (chapterId: string, optionId: string, updates: Partial<SceneOption>) => void;
  onBatchApprove: (approved: boolean, filterFn?: (opt: SceneOption) => boolean) => void;
  onProceed: () => void;
}

export const Phase3View = ({ projectId, chapters, onApproveOption, onUpdateOption, onBatchApprove, onProceed }: Phase3ViewProps) => {
  const [pendingTaskKeys, setPendingTaskKeys] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brollSelections, setBrollSelections] = useState<BRollType[]>([]);

  // ── Filter logic ──
  const isShowAll = brollSelections.length === 0;
  const matchesFilter = (type: string) => isShowAll || brollSelections.includes(type as BRollType);

  const allRenderableOptions = chapters.flatMap(c =>
    c.options.filter(o => RENDERABLE_TYPES.includes(o.type as BRollType))
  );

  const visibleOptions = allRenderableOptions.filter(o => matchesFilter(o.type));
  const visibleApprovedCount = visibleOptions.filter(o => o.phase3Approved).length;
  const visibleCount = visibleOptions.length;

  const totalApproved = allRenderableOptions.filter(o => o.phase3Approved).length;
  const totalCount = allRenderableOptions.length;
  const allApproved = totalCount > 0 && totalApproved === totalCount;

  const visibleUnrenderedCount = visibleOptions.filter(o => !o.videoUrl).length;

  // ── Batch render ──
  const handleBatchRender = async () => {
    const items = chapters.flatMap(c =>
      c.options
        .filter(o => RENDERABLE_TYPES.includes(o.type as BRollType) && matchesFilter(o.type) && !o.videoUrl)
        .map(o => ({
          chapterId: c.chapterId,
          option: buildRenderBatchOptionPayload(o)
        }))
    );

    if (!items.length) {
      alert('当前筛选范围内所有视频已渲染，无需重复触发');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/director/phase3/render-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, chapters: items })
      });
      const data = await res.json();
      if (res.ok && data.taskKeys?.length) {
        setPendingTaskKeys(new Set(data.taskKeys));
        console.log(`[Phase3] 批量渲染触发：${data.message}`);
      } else {
        alert('渲染触发失败：' + (data.error || '未知错误'));
      }
    } catch (e) {
      console.error(e);
      alert('渲染请求错误');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryOption = async (chapterId: string, option: SceneOption) => {
    const item = {
      chapterId,
      option: buildRenderBatchOptionPayload(option)
    };

    try {
      const res = await fetch('/api/director/phase3/render-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, chapters: [item] })
      });
      const data = await res.json();
      if (res.ok && data.taskKeys?.length) {
        setPendingTaskKeys(prev => new Set([...prev, ...data.taskKeys]));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveOption = onApproveOption;
  const handleUpdateOption = onUpdateOption;

  // ── Clear completed/failed task keys ──
  const handleTaskComplete = useCallback((taskKey: string) => {
    setPendingTaskKeys(prev => {
      const next = new Set(prev);
      next.delete(taskKey);
      return next;
    });
  }, []);

  // ── Batch approve ──
  const handleBatchApprove = (approved: boolean) => {
    const currentFilter = (o: SceneOption) => {
      if (!RENDERABLE_TYPES.includes(o.type as BRollType)) return false;
      if (!matchesFilter(o.type)) return false;
      if (approved && !o.videoUrl) return false;
      return true;
    };
    onBatchApprove(approved, currentFilter);
  };

  if (chapters.length === 0) {
    return (
      <PhasePanel>
        <PhaseEmptyState
          icon={<Video className="w-12 h-12" />}
          title="暂无可渲染的视觉方案"
          description="请先在 Phase 2 生成并选择 B-roll 方案"
        />
      </PhasePanel>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Pipeline Board — 编排概览 */}
        <RenderPipelineBoard
          chapters={chapters}
          pendingTaskKeys={pendingTaskKeys}
          totalCount={totalCount}
          totalApproved={totalApproved}
        />

      {/* Filter + Batch ops */}
      <PhasePanel>
        <PhasePanelHeader
          title={<span className="text-sm font-bold text-[#342d24]">过滤视觉方案</span>}
          actions={
            <div className="flex gap-2">
              <button
                onClick={() => setBrollSelections([...RENDERABLE_TYPES])}
                className="text-xs bg-[#f4efe5] hover:bg-[#e4dbcc] text-[#342d24] px-3 py-1.5 rounded transition-colors"
              >
                显示全部
              </button>
              <button
                onClick={() => setBrollSelections([])}
                className="text-xs bg-[#f4efe5] hover:bg-[#e4dbcc] text-[#342d24] px-3 py-1.5 rounded transition-colors"
              >
                清空过滤
              </button>
            </div>
          }
        />
        <PhasePanelBody>
          <BRollSelector
            selected={brollSelections}
            onChange={setBrollSelections}
            types={RENDERABLE_TYPES}
          />

          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#e4dbcc]">
            <span className="text-xs text-[#8f8372] font-medium">批量操作:</span>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-[#f4efe5] p-1.5 -ml-1.5 rounded transition-colors group">
              <input
                type="checkbox"
                className="w-4 h-4 cursor-pointer accent-[#c97545] rounded border-[#d8c8ae] focus:ring-0 focus:ring-offset-0 disabled:opacity-50"
                style={{ backgroundColor: '#faf6ef' }}
                ref={el => {
                  if (el) el.indeterminate = visibleApprovedCount > 0 && visibleApprovedCount < visibleCount;
                }}
                checked={visibleApprovedCount === visibleCount && visibleCount > 0}
                disabled={visibleCount === 0}
                onChange={(e) => handleBatchApprove(e.target.checked)}
              />
              <span className="text-xs text-[#6b5e4f] group-hover:text-[#342d24] select-none flex items-center gap-1">
                全选通过当前视图 <span className="text-[#8f8372]">({visibleApprovedCount}/{visibleCount})</span>
              </span>
            </label>
          </div>
        </PhasePanelBody>
      </PhasePanel>

      {/* Sticky progress toolbar */}
      <div className="flex items-center justify-between px-5 py-3 rounded-xl border border-[#e4dbcc]" style={{ background: 'rgba(255, 252, 247, 0.78)' }}>
        <div className="flex items-center gap-4">
          <span className="text-[#8f8372] font-medium whitespace-nowrap text-sm">筛选结果:</span>
          <div className="flex gap-4">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${visibleApprovedCount > 0 ? 'text-[#62835c]' : 'text-[#8f8372]'}`}>
                {visibleApprovedCount}
              </span>
              <span className="text-[#8f8372] font-medium text-sm">/ {visibleCount} (当前显示)</span>
            </div>
            {brollSelections.length > 0 && (
              <div className="flex items-baseline gap-1 opacity-60">
                <span className="text-lg font-bold text-[#342d24]">{totalApproved}</span>
                <span className="text-[#8f8372] text-sm">/ {totalCount} (全局总计)</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleBatchRender}
            disabled={isSubmitting || pendingTaskKeys.size > 0 || visibleUnrenderedCount === 0}
            className="px-4 py-2 bg-[#c97545] hover:bg-[#b26135] disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 触发中...</>
            ) : pendingTaskKeys.size > 0 ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 渲染中...</>
            ) : (
              <><Play className="w-4 h-4" /> 渲染当前筛选 ({visibleUnrenderedCount}条)</>
            )}
          </button>

          <button
            onClick={onProceed}
            className={`px-4 py-2 ${allApproved ? 'bg-[#62835c] hover:bg-[#4d6b5f]' : 'bg-[#c97545] hover:bg-[#b26135]'} text-white font-medium rounded-lg flex items-center gap-2 transition-colors text-sm`}
          >
            <CheckCircle className="w-4 h-4" />
            {allApproved ? '提交 → Phase 4' : `进入 Phase 4 (${totalApproved}/${totalCount})`}
          </button>
        </div>
      </div>

      {/* Chapter cards */}
      <div className="flex flex-col gap-4">
        {chapters.map(chapter => {
          const filteredOptions = chapter.options.filter(o =>
            RENDERABLE_TYPES.includes(o.type as BRollType) && matchesFilter(o.type)
          );
          if (filteredOptions.length === 0) return null;

          const filteredChapter = { ...chapter, options: filteredOptions };

          return (
            <Phase3ChapterCard
              key={chapter.chapterId}
              chapter={filteredChapter}
              projectId={projectId}
              pendingTaskKeys={pendingTaskKeys}
              onApprove={handleApproveOption}
              onUpdateOption={handleUpdateOption}
              onRetry={handleRetryOption}
              onTaskComplete={handleTaskComplete}
            />
          );
        })}
      </div>
    </div>
  );
};
