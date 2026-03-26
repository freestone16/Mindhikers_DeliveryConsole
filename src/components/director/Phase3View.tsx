import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Maximize2, X, Loader2, CheckCircle, AlertCircle, Check,
  RefreshCw, MessageSquare, Sparkles, Video, ChevronDown, ChevronUp
} from 'lucide-react';
import { BRollSelector } from './BRollSelector';
import type { DirectorChapter, SceneOption, BRollType } from '../../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const RENDERABLE_TYPES: BRollType[] = ['remotion', 'seedance', 'generative', 'infographic'];

const TYPE_COLORS: Record<string, string> = {
  remotion: 'bg-blue-500/20 text-blue-300',
  seedance: 'bg-purple-500/20 text-purple-300',
  generative: 'bg-purple-500/20 text-purple-300',
  infographic: 'bg-amber-500/20 text-amber-300',
};

const TYPE_LABELS: Record<string, string> = {
  remotion: 'Remotion动画',
  seedance: '文生视频',
  generative: 'AI生成',
  infographic: '📊 信息图',
};

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

// ─── Phase3OptionRow ─────────────────────────────────────────────────────────
// Mirrors Phase2's OptionRow layout (12-col grid), but col-4 = video player

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
  const isProcessing = isPolling || taskStatus?.status === 'processing' || taskStatus?.status === 'pending';
  const isFailed = taskStatus?.status === 'failed';
  const isCompleted = !!videoUrl || taskStatus?.status === 'completed';

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
    } as any);
    setShowFeedback(false);
    setFeedbackText('');
    onRetry(chapter.chapterId, option);
  };

  // ── Render ──
  return (
    <div className={`grid grid-cols-12 gap-3 p-3 rounded-lg border transition-all ${
      option.phase3Approved
        ? 'border-emerald-500/50 bg-emerald-500/5'
        : 'border-slate-700 bg-slate-800/30 hover:border-slate-500'
    }`}>
      {/* 序号 (col 1) */}
      <div className="col-span-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-bold">
          {rowId}
        </div>
      </div>

      {/* 原文一句话 (col 2) */}
      <div className="col-span-2 flex items-center">
        <p className="text-slate-300 text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap">
          {quoteText}
        </p>
      </div>

      {/* 设计方案/提示词 (col 3) */}
      <div className="col-span-3 flex flex-col justify-center gap-1 px-2 -mx-2">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[option.type] || 'bg-slate-600 text-slate-300'}`}>
            {TYPE_LABELS[option.type] || option.type}
          </span>
        </div>
        <p className="text-white text-xs leading-relaxed line-clamp-3">
          {option.prompt || option.imagePrompt || '暂无方案描述'}
        </p>
        {(option as any).rationale && (
          <p className="text-slate-500 text-[10px] italic mt-1 line-clamp-2">
            💡 {(option as any).rationale}
          </p>
        )}
      </div>

      {/* 视频播放区 (col 5) — Phase3 核心：替代 Phase2 的预览图 */}
      <div className="col-span-5 flex flex-col gap-2">
        <div className="w-full aspect-video bg-slate-700/50 rounded overflow-hidden relative group border border-slate-700">
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
          ) : isProcessing ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-[10px] text-blue-400 mt-2">渲染中...</span>
              {taskStatus?.progress != null && (
                <div className="mt-2 w-24 bg-slate-700 rounded-full h-1">
                  <div
                    className="bg-blue-500 h-1 rounded-full transition-all"
                    style={{ width: `${taskStatus.progress}%` }}
                  />
                </div>
              )}
              {taskStatus?.retryCount != null && taskStatus.retryCount > 0 && (
                <span className="text-[9px] text-yellow-400 mt-1">第 {taskStatus.retryCount} 次重试</span>
              )}
            </div>
          ) : isFailed ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800">
              <AlertCircle className="w-5 h-5 text-red-400 mb-1" />
              <span className="text-red-400 text-xs font-medium bg-red-500/10 px-2 py-1 rounded">
                {taskStatus?.error || '渲染失败'}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onRetry(chapter.chapterId, option); }}
                className="text-[10px] text-slate-400 mt-2 hover:text-white underline decoration-slate-500 underline-offset-2"
              >
                重试渲染
              </button>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <button
                onClick={(e) => { e.stopPropagation(); onRetry(chapter.chapterId, option); }}
                className="flex flex-col items-center gap-1 group cursor-pointer hover:scale-105 transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/20 group-hover:bg-blue-500/30 flex items-center justify-center transition-colors">
                  <Play className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-blue-300 font-medium">单条渲染</span>
              </button>
            </div>
          )}
        </div>

        {/* Feedback section removed — retry via single render button */}
      </div>

      {/* 审阅通过 (col 1) */}
      <div className="col-span-1 flex items-center justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApprove(chapter.chapterId, option.id);
          }}
          disabled={!isCompleted}
          title={isCompleted ? (option.phase3Approved ? '取消通过' : '标记通过') : '请先完成渲染'}
          className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-all ${
            option.phase3Approved
              ? 'bg-green-600 border-green-500 text-white hover:bg-green-700'
              : isCompleted
                ? 'border-slate-500 hover:border-slate-300 opacity-60 hover:opacity-100 hover:bg-slate-700'
                : 'border-slate-700 opacity-30 cursor-not-allowed'
          }`}
        >
          {option.phase3Approved && <Check className="w-4 h-4" />}
        </button>
      </div>

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
    </div>
  );
};

// ─── Phase3ChapterCard ───────────────────────────────────────────────────────
// Mirrors Phase2's ChapterCard layout

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

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* Chapter header — same as Phase2's ChapterCard */}
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center gap-3">
        <span className="text-blue-400 font-bold text-sm">第{chapter.chapterIndex + 1}章</span>
        <span className="text-white font-medium">{displayName}</span>
        {approvedAll && <Check className="w-4 h-4 text-green-400" />}
        <span className="ml-auto text-xs text-slate-500">
          {chapter.options.filter(o => o.phase3Approved).length}/{chapter.options.length} 通过
        </span>
      </div>

      <div className="p-3">
        {/* Column headers — same grid as Phase2 but col-4→col-3 方案, col-4→col-5 视频 */}
        <div className="grid grid-cols-12 gap-3 mb-2 px-1">
          <div className="col-span-1 text-xs text-slate-500 font-bold text-center">序号</div>
          <div className="col-span-2 text-xs text-slate-500 font-bold">原文一句话</div>
          <div className="col-span-3 text-xs text-slate-500 font-bold">设计方案 / 提示词</div>
          <div className="col-span-5 text-xs text-slate-500 font-bold text-center">视频</div>
          <div className="col-span-1 text-xs text-slate-500 font-bold text-center">审阅</div>
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
      </div>
    </div>
  );
};

// ─── Phase3View ──────────────────────────────────────────────────────────────
// Mirrors Phase2View structure: BRollSelector filter → sticky toolbar → ChapterCards

interface Phase3ViewProps {
  projectId: string;
  chapters: DirectorChapter[];
  onProceed: () => void;
}

export const Phase3View = ({ projectId, chapters, onProceed }: Phase3ViewProps) => {
  const [localChapters, setLocalChapters] = useState<DirectorChapter[] | null>(null);
  const [pendingTaskKeys, setPendingTaskKeys] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brollSelections, setBrollSelections] = useState<BRollType[]>([]);

  const displayedChapters = localChapters || chapters;

  // ── Filter logic (same as Phase2) ──
  const isShowAll = brollSelections.length === 0;
  const matchesFilter = (type: string) => isShowAll || brollSelections.includes(type as BRollType);

  // Only count renderable types
  const allRenderableOptions = displayedChapters.flatMap(c =>
    c.options.filter(o => RENDERABLE_TYPES.includes(o.type as BRollType))
  );

  const visibleOptions = allRenderableOptions.filter(o => matchesFilter(o.type));
  const visibleApprovedCount = visibleOptions.filter(o => o.phase3Approved).length;
  const visibleCount = visibleOptions.length;

  const totalApproved = allRenderableOptions.filter(o => o.phase3Approved).length;
  const totalCount = allRenderableOptions.length;
  const allApproved = totalCount > 0 && totalApproved === totalCount;

  const visibleUnrenderedCount = visibleOptions.filter(o => !o.videoUrl).length;

  // ── Batch render (respects current filter) ──
  const handleBatchRender = async () => {
    const items = displayedChapters.flatMap(c =>
      c.options
        .filter(o => RENDERABLE_TYPES.includes(o.type as BRollType) && matchesFilter(o.type) && !o.videoUrl)
        .map(o => ({
          chapterId: c.chapterId,
          option: {
            id: o.id,
            type: o.type,
            template: (o as any).template,
            props: (o as any).props,
            name: o.name,
            prompt: (o as any).prompt,
            imagePrompt: (o as any).imagePrompt || (o as any).revisedPrompt,
            infographicLayout: (o as any).infographicLayout,
            infographicStyle: (o as any).infographicStyle,
            infographicUseMode: (o as any).infographicUseMode,
          }
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
      option: {
        id: option.id,
        type: option.type,
        template: (option as any).template,
        props: (option as any).props,
        name: option.name,
        prompt: (option as any).prompt,
        imagePrompt: option.revisedPrompt || (option as any).imagePrompt,
        infographicLayout: (option as any).infographicLayout,
        infographicStyle: (option as any).infographicStyle,
        infographicUseMode: (option as any).infographicUseMode,
      }
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

  const handleApproveOption = (chapterId: string, optionId: string) => {
    const updated = displayedChapters.map(c =>
      c.chapterId === chapterId
        ? { ...c, options: c.options.map(o => o.id === optionId ? { ...o, phase3Approved: !o.phase3Approved } : o) }
        : c
    );
    setLocalChapters(updated);
  };

  const handleUpdateOption = (chapterId: string, optionId: string, updates: Partial<SceneOption>) => {
    const updated = displayedChapters.map(c =>
      c.chapterId === chapterId
        ? { ...c, options: c.options.map(o => o.id === optionId ? { ...o, ...updates } : o) }
        : c
    );
    setLocalChapters(updated);
  };

  // ── Clear completed/failed task keys ──
  const handleTaskComplete = useCallback((taskKey: string) => {
    setPendingTaskKeys(prev => {
      const next = new Set(prev);
      next.delete(taskKey);
      return next;
    });
  }, []);

  // ── Batch approve (all visible filtered options) ──
  const handleBatchApprove = (approved: boolean) => {
    const updated = displayedChapters.map(c => ({
      ...c,
      options: c.options.map(o => {
        if (!RENDERABLE_TYPES.includes(o.type as BRollType)) return o;
        if (!matchesFilter(o.type)) return o;
        // Only approve items that have video
        if (approved && !o.videoUrl) return o;
        return { ...o, phase3Approved: approved };
      })
    }));
    setLocalChapters(updated);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* B-Roll 类型筛选 — same as Phase2 */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm text-slate-400 uppercase font-bold">
            过滤视觉方案 (Excel 式筛选)
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setBrollSelections([...RENDERABLE_TYPES])}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition-colors"
            >
              显示全部
            </button>
            <button
              onClick={() => setBrollSelections([])}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition-colors"
            >
              清空过滤 (显示全部)
            </button>
          </div>
        </div>
        <BRollSelector
          selected={brollSelections}
          onChange={setBrollSelections}
          types={RENDERABLE_TYPES}
        />

        {/* Batch operations */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-800">
          <span className="text-xs text-slate-500 font-medium">批量操作:</span>
          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-800/80 p-1.5 -ml-1.5 rounded transition-colors group">
            <input
              type="checkbox"
              className="w-4 h-4 cursor-pointer accent-blue-500 rounded border-slate-600 bg-slate-800 focus:ring-0 focus:ring-offset-0 disabled:opacity-50"
              ref={el => {
                if (el) el.indeterminate = visibleApprovedCount > 0 && visibleApprovedCount < visibleCount;
              }}
              checked={visibleApprovedCount === visibleCount && visibleCount > 0}
              disabled={visibleCount === 0}
              onChange={(e) => handleBatchApprove(e.target.checked)}
            />
            <span className="text-xs text-slate-400 group-hover:text-slate-300 select-none flex items-center gap-1">
              全选通过当前视图 <span className="text-slate-500">({visibleApprovedCount}/{visibleCount})</span>
            </span>
          </label>
        </div>
      </div>

      {/* Sticky progress toolbar — same style as Phase2 */}
      {displayedChapters.length > 0 && (
        <>
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 flex items-center justify-between sticky top-4 z-10 shadow-lg">
            <div className="flex items-center gap-4">
              <span className="text-slate-400 font-medium whitespace-nowrap">筛选结果:</span>
              <div className="flex gap-4">
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${visibleApprovedCount > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                    {visibleApprovedCount}
                  </span>
                  <span className="text-slate-500 font-medium">/ {visibleCount} (当前显示)</span>
                </div>
                <div className="w-px h-6 bg-slate-700 mx-2"></div>
                {brollSelections.length > 0 && (
                  <div className="flex items-baseline gap-1 opacity-60">
                    <span className="text-lg font-bold text-slate-400">{totalApproved}</span>
                    <span className="text-slate-500 text-sm">/ {totalCount} (全局总计)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Render button */}
              <button
                onClick={handleBatchRender}
                disabled={isSubmitting || pendingTaskKeys.size > 0 || visibleUnrenderedCount === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 触发中...</>
                ) : pendingTaskKeys.size > 0 ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 渲染中...</>
                ) : (
                  <><Play className="w-4 h-4" /> 渲染当前筛选 ({visibleUnrenderedCount}条)</>
                )}
              </button>

              {/* Proceed button */}
              {allApproved && (
                <button
                  onClick={onProceed}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg flex items-center gap-2 transition-colors text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  提交 → Phase 4
                </button>
              )}
            </div>
          </div>

          {/* Overall progress bar */}
          {totalCount > 0 && (
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-3 -mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>审阅进度</span>
                <span>{totalApproved}/{totalCount} 已通过</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full">
                <div
                  className="h-1.5 bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(totalApproved / totalCount) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Chapter cards */}
          <div className="flex flex-col gap-4">
            {displayedChapters.map(chapter => {
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
        </>
      )}

      {displayedChapters.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无可渲染的视觉方案</p>
          <p className="text-xs mt-1">请先在 Phase 2 生成并选择 B-roll 方案</p>
        </div>
      )}
    </div>
  );
};
