import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Pause, Maximize2, X, Loader2, CheckCircle, AlertCircle,
  RefreshCw, MessageSquare, Sparkles, Video, ChevronDown, ChevronUp
} from 'lucide-react';
import type { DirectorChapter, SceneOption } from '../../types';

interface VideoTaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  progress?: number;
  error?: string;
  retryCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoCard: individual option row with video player + feedback chatbox
// ─────────────────────────────────────────────────────────────────────────────
interface VideoCardProps {
  projectId: string;
  chapterId: string;
  option: SceneOption;
  isPendingTask: boolean;
  onApprove: (optionId: string, approved: boolean) => void;
  onUpdateOption: (optionId: string, updates: Partial<SceneOption>) => void;
  onRetry: (optionId: string) => void;
}

const VideoCard = ({
  projectId, chapterId, option, isPendingTask,
  onApprove, onUpdateOption, onRetry
}: VideoCardProps) => {
  const [taskStatus, setTaskStatus] = useState<VideoTaskStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [revisedPrompt, setRevisedPrompt] = useState(option.revisedPrompt || '');
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const taskKey = `${chapterId}::${option.id}`;

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/director/phase3/video/${encodeURIComponent(taskKey)}`);
      const data = await res.json();
      if (data.success) {
        setTaskStatus(data.task);
        if (data.task.status === 'completed' && data.task.videoUrl) {
          onUpdateOption(option.id, { videoUrl: data.task.videoUrl });
          setIsPolling(false);
        } else if (data.task.status === 'failed') {
          setIsPolling(false);
        }
      }
    } catch {}
  }, [taskKey, option.id, onUpdateOption]);

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

  // Close fullscreen on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowFullscreen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const videoUrl = option.videoUrl || taskStatus?.videoUrl;
  const isProcessing = isPolling || taskStatus?.status === 'processing' || taskStatus?.status === 'pending';
  const isFailed = taskStatus?.status === 'failed';
  const isCompleted = !!videoUrl || taskStatus?.status === 'completed';

  const handleRevise = async () => {
    if (!feedbackText.trim()) return;
    setIsRevising(true);
    try {
      const res = await fetch('/api/director/phase2/revise-option', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, chapterId, optionId: option.id, userFeedback: feedbackText })
      });
      const data = await res.json();
      if (data.success) {
        setRevisedPrompt(data.revisedPrompt || '');
        onUpdateOption(option.id, { revisedPrompt: data.revisedPrompt });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRevising(false);
    }
  };

  const handleApplyAndRender = () => {
    // Update option with revised prompt and trigger re-render
    onUpdateOption(option.id, {
      videoUrl: undefined,
      phase3Approved: false,
      revisedPrompt,
      ...(revisedPrompt && { imagePrompt: revisedPrompt })
    } as any);
    setShowFeedback(false);
    setFeedbackText('');
    onRetry(option.id);
  };

  const renderStatus = () => {
    if (isProcessing) {
      const progress = taskStatus?.progress;
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-8 bg-slate-800/60 rounded-lg">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <div className="text-center">
            <p className="text-sm text-slate-300">渲染中...</p>
            {progress != null && (
              <div className="mt-2 w-32 bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {taskStatus?.retryCount != null && taskStatus.retryCount > 0 && (
              <p className="text-xs text-yellow-400 mt-1">第 {taskStatus.retryCount} 次重试</p>
            )}
          </div>
        </div>
      );
    }

    if (isFailed) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-8 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-red-300 text-center px-4">{taskStatus?.error || '渲染失败'}</p>
          <button
            onClick={() => onRetry(option.id)}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> 重试
          </button>
        </div>
      );
    }

    if (!videoUrl) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 bg-slate-800/40 rounded-lg border border-dashed border-slate-600">
          <Video className="w-8 h-8 text-slate-500" />
          <p className="text-xs text-slate-500">等待渲染</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`bg-slate-800/50 rounded-lg border transition-all ${
      option.phase3Approved ? 'border-emerald-500/50' : 'border-slate-700'
    }`}>
      <div className="p-3 flex gap-3">
        {/* Type badge */}
        <div className="flex-shrink-0 w-16 text-center">
          <span className={`text-xs px-1.5 py-0.5 rounded font-mono uppercase ${
            option.type === 'remotion' ? 'bg-blue-500/20 text-blue-300' :
            option.type === 'seedance' ? 'bg-purple-500/20 text-purple-300' :
            option.type === 'generative' ? 'bg-pink-500/20 text-pink-300' :
            'bg-slate-600 text-slate-300'
          }`}>
            {option.type}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white mb-1 truncate">{option.name || option.id}</p>
          {option.imagePrompt && (
            <p className="text-xs text-slate-400 line-clamp-2 mb-2">{option.imagePrompt}</p>
          )}

          {/* Video player area */}
          {videoUrl ? (
            <div className="relative group rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full max-h-48 object-contain"
                preload="metadata"
              />
              <button
                onClick={() => setShowFullscreen(true)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            renderStatus()
          )}

          {/* Feedback chatbox */}
          <div className="mt-2">
            <button
              onClick={() => setShowFeedback(v => !v)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
            >
              <MessageSquare className="w-3 h-3" />
              对视频不满意？提意见重新渲染
              {showFeedback ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showFeedback && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="描述你的修改需求，如：画面更有动感，颜色更鲜艳..."
                  className="w-full p-2 text-xs bg-slate-900 border border-slate-600 rounded text-slate-200 placeholder-slate-500 resize-none"
                  rows={2}
                />
                <button
                  onClick={handleRevise}
                  disabled={!feedbackText.trim() || isRevising}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs rounded flex items-center gap-1"
                >
                  {isRevising ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  AI 优化提示词
                </button>

                {revisedPrompt && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">AI 优化后的提示词（可继续修改）：</p>
                    <textarea
                      value={revisedPrompt}
                      onChange={e => setRevisedPrompt(e.target.value)}
                      className="w-full p-2 text-xs bg-slate-900 border border-blue-500/50 rounded text-blue-200 resize-none"
                      rows={3}
                    />
                    <button
                      onClick={handleApplyAndRender}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> 使用此提示词重新渲染
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Approve checkbox */}
        <div className="flex-shrink-0">
          <button
            onClick={() => onApprove(option.id, !option.phase3Approved)}
            disabled={!isCompleted}
            title={isCompleted ? (option.phase3Approved ? '取消通过' : '标记通过') : '请先完成渲染'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              option.phase3Approved
                ? 'bg-emerald-500 text-white'
                : isCompleted
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-400'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Fullscreen video portal */}
      {showFullscreen && videoUrl && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"
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

// ─────────────────────────────────────────────────────────────────────────────
// ChapterBlock: one chapter's options grouped
// ─────────────────────────────────────────────────────────────────────────────
interface ChapterBlockProps {
  projectId: string;
  chapter: DirectorChapter;
  pendingTaskKeys: Set<string>;
  onApproveOption: (chapterId: string, optionId: string, approved: boolean) => void;
  onUpdateOption: (chapterId: string, optionId: string, updates: Partial<SceneOption>) => void;
  onRetryOption: (chapterId: string, option: SceneOption) => void;
}

const ChapterBlock = ({
  projectId, chapter, pendingTaskKeys,
  onApproveOption, onUpdateOption, onRetryOption
}: ChapterBlockProps) => {
  const renderableOptions = chapter.options.filter(o =>
    ['remotion', 'seedance', 'generative', 'infographic'].includes(o.type)
  );

  if (renderableOptions.length === 0) return null;

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs text-slate-500 font-mono">CH{chapter.chapterIndex + 1}</span>
            <h4 className="text-sm font-semibold text-white mt-0.5">{chapter.chapterName}</h4>
          </div>
          <span className="text-xs text-slate-500">
            {renderableOptions.filter(o => o.phase3Approved).length}/{renderableOptions.length} 通过
          </span>
        </div>
      </div>
      <div className="p-3 space-y-3">
        {renderableOptions.map(opt => (
          <VideoCard
            key={opt.id}
            projectId={projectId}
            chapterId={chapter.chapterId}
            option={opt}
            isPendingTask={pendingTaskKeys.has(`${chapter.chapterId}::${opt.id}`)}
            onApprove={(optionId, approved) => onApproveOption(chapter.chapterId, optionId, approved)}
            onUpdateOption={(optionId, updates) => onUpdateOption(chapter.chapterId, optionId, updates)}
            onRetry={(optionId) => onRetryOption(chapter.chapterId, chapter.options.find(o => o.id === optionId)!)}
          />
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase3View: main orchestrator
// ─────────────────────────────────────────────────────────────────────────────
interface Phase3ViewProps {
  projectId: string;
  chapters: DirectorChapter[];
  onProceed: () => void;
}

export const Phase3View = ({ projectId, chapters, onProceed }: Phase3ViewProps) => {
  const [localChapters, setLocalChapters] = useState<DirectorChapter[] | null>(null);
  const [pendingTaskKeys, setPendingTaskKeys] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedChapters = localChapters || chapters;

  const RENDERABLE_TYPES = ['remotion', 'seedance', 'generative', 'infographic'];

  const renderableOptions = displayedChapters.flatMap(c =>
    c.options.filter(o => RENDERABLE_TYPES.includes(o.type)).map(o => ({ chapter: c, option: o }))
  );

  const approvedCount = renderableOptions.filter(({ option }) => option.phase3Approved).length;
  const totalCount = renderableOptions.length;
  const allApproved = totalCount > 0 && approvedCount === totalCount;

  const completedCount = renderableOptions.filter(({ option }) =>
    option.videoUrl || pendingTaskKeys.has(`${option.id}`)
  ).length;

  const handleBatchRender = async () => {
    const items = displayedChapters.flatMap(c =>
      c.options
        .filter(o => RENDERABLE_TYPES.includes(o.type) && !o.videoUrl)
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
      alert('所有视频已渲染，无需重复触发');
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

  const handleApproveOption = (chapterId: string, optionId: string, approved: boolean) => {
    const updated = displayedChapters.map(c =>
      c.chapterId === chapterId
        ? { ...c, options: c.options.map(o => o.id === optionId ? { ...o, phase3Approved: approved } : o) }
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

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky control bar */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Phase 3: 视频二审</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              渲染 MP4 视频，逐条审阅后打勾通过，全部通过后提交 Phase 4
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress */}
            <div className="text-right">
              <p className="text-xs text-slate-400">审阅进度</p>
              <p className="text-sm font-bold text-white">
                <span className={approvedCount === totalCount && totalCount > 0 ? 'text-emerald-400' : 'text-white'}>
                  {approvedCount}
                </span>
                <span className="text-slate-500">/{totalCount}</span>
              </p>
            </div>

            {/* Render all button */}
            <button
              onClick={handleBatchRender}
              disabled={isSubmitting || pendingTaskKeys.size > 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-2"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 触发中...</>
              ) : pendingTaskKeys.size > 0 ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 渲染中 {pendingTaskKeys.size} 条...</>
              ) : (
                <><Play className="w-4 h-4" /> 渲染所有视频</>
              )}
            </button>

            {/* Proceed button */}
            <button
              onClick={onProceed}
              disabled={!allApproved}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                allApproved
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              提交 → Phase 4
            </button>
          </div>
        </div>

        {/* Overall progress bar */}
        {totalCount > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>批次进度</span>
              <span>{approvedCount}/{totalCount} 已通过</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full">
              <div
                className="h-1.5 bg-emerald-500 rounded-full transition-all"
                style={{ width: totalCount > 0 ? `${(approvedCount / totalCount) * 100}%` : '0%' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chapter blocks */}
      {displayedChapters.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无可渲染的视觉方案</p>
          <p className="text-xs mt-1">请先在 Phase 2 生成并选择 B-roll 方案</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedChapters.map(chapter => (
            <ChapterBlock
              key={chapter.chapterId}
              projectId={projectId}
              chapter={chapter}
              pendingTaskKeys={pendingTaskKeys}
              onApproveOption={handleApproveOption}
              onUpdateOption={handleUpdateOption}
              onRetryOption={handleRetryOption}
            />
          ))}
        </div>
      )}
    </div>
  );
};
