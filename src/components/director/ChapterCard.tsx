import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, Image, Upload, FileVideo, ZoomIn, X } from 'lucide-react';
import type { DirectorChapter, SceneOption } from '../../types';

interface ChapterCardProps {
  chapter: DirectorChapter;
  projectId: string;
  onSelect: (chapterId: string, optionId: string) => void;
  onToggleCheck: (chapterId: string, optionId: string) => void;
  pendingTaskKeys?: Set<string>;
}

const TYPE_COLORS: Record<string, string> = {
  remotion: 'bg-blue-500/20 text-blue-300',
  seedance: 'bg-purple-500/20 text-purple-300',
  generative: 'bg-purple-500/20 text-purple-300',
  artlist: 'bg-green-500/20 text-green-300',
  'internet-clip': 'bg-orange-500/20 text-orange-300',
  'user-capture': 'bg-cyan-500/20 text-cyan-300',
  infographic: 'bg-amber-500/20 text-amber-300',
};

const TYPE_LABELS: Record<string, string> = {
  remotion: 'Remotion动画',
  seedance: '文生视频',
  generative: 'AI生成',
  artlist: 'Artlist实拍',
  'internet-clip': '🌐 互联网素材',
  'user-capture': '📸 用户截图/录屏',
  infographic: '📊 信息图',
};

// Artlist、互联网/用户截图不需要 AI 预览；infographic static 模式由后端直接生图
const PREVIEW_SUPPORTED_TYPES = ['remotion', 'generative', 'seedance', 'infographic'];

// Types that require manual upload (non-AI sources)
const UPLOAD_REQUIRED_TYPES = ['internet-clip', 'user-capture', 'artlist'];

function getScriptPreview(text: string): string {
  const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
  if (sentences.length >= 2) {
    return sentences.slice(0, 2).join('。') + '。';
  }
  return text.slice(0, 150) + (text.length > 150 ? '...' : '');
}

interface OptionRowProps {
  chapter: DirectorChapter;
  option: SceneOption;
  index: number;
  projectId: string;
  onSelect: (chapterId: string, optionId: string) => void;
  onToggleCheck: (chapterId: string, optionId: string) => void;
  isPendingBatch?: boolean;
}

const OptionRow = ({ chapter, option, index, projectId, onSelect, onToggleCheck, isPendingBatch }: OptionRowProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(option.previewUrl || null);
  const [thumbStatus, setThumbStatus] = useState<'idle' | 'generating' | 'processing' | 'completed' | 'failed'>('idle');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'completed' | 'failed'>('idle');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSelected = chapter.selectedOptionId === option.id;
  const rowId = `${chapter.chapterIndex + 1}-${index + 1}`;
  const quoteText = option.quote || getScriptPreview(chapter.scriptText);
  const taskKey = `${chapter.chapterId}-${option.id}`;
  const requiresUpload = UPLOAD_REQUIRED_TYPES.includes(option.type);
  const isChecked = option.isChecked;

  // DEBUG: track option type during render
  if (option.id === 'ch1-opt1' || option.id === 'ch2-opt4') {
    console.log(`[OptionRow RENDER] ${option.id} type=${option.type} requiresUpload=${requiresUpload} previewUrl=${option.previewUrl}`);
  }

  // Lightbox state
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    if (option.previewUrl) {
      setPreviewUrl(option.previewUrl);
      setThumbStatus('completed');
    } else if (option.previewUrl === null || option.previewUrl === undefined) {
      // Expert action cleared previewUrl → thumbnail is stale, reset to idle
      if (thumbStatus === 'completed') {
        setPreviewUrl(null);
        setThumbStatus('idle');
      }
    }
  }, [option.previewUrl]);

  // Auto-start polling when batch render has registered this task as pending
  useEffect(() => {
    if (isPendingBatch && thumbStatus === 'idle') {
      console.log('[BatchPoll] Auto-starting poll for:', taskKey);
      pollThumbnail(taskKey);
    }
  }, [isPendingBatch]);

  // Check if material already exists when option is checked
  useEffect(() => {
    if (requiresUpload && isChecked) {
      checkMaterialExists();
    }
  }, [requiresUpload, isChecked]);

  const checkMaterialExists = async () => {
    try {
      const res = await fetch(`/api/director/material-exists?projectId=${projectId}&chapterId=${chapter.chapterId}&optionId=${option.id}`);
      const data = await res.json();
      if (data.success && data.data.exists) {
        setUploadStatus('completed');
      } else {
        setUploadStatus('idle'); // Ensure it resets to idle if not exists
      }
    } catch (error) {
      console.error('Check material exists failed:', error);
      setUploadStatus('idle'); // Set idle on error
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      alert('请选择视频文件 (MP4, WebM, MOV 等)');
      return;
    }

    setUploadStatus('uploading');

    try {
      const formData = new FormData();
      formData.append('videoFile', file);
      formData.append('projectId', projectId);
      formData.append('chapterId', chapter.chapterId);
      formData.append('optionId', option.id);

      const res = await fetch('/api/director/upload-material', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        setUploadStatus('completed');
        setUploadedFile(data.data.filename);
        console.log('[Upload] Success:', data.message);
      } else {
        throw new Error(data.error || '上传失败');
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadStatus('failed');
      alert(`上传失败: ${error.message}`);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // ESC to close lightbox
  useEffect(() => {
    if (!showLightbox) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLightbox(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showLightbox]);

  const handleGenerateThumbnailWithPrompt = async (promptOverride?: string) => {
    const effectivePrompt = promptOverride || option.imagePrompt || option.prompt;
    if (!effectivePrompt) return;

    setThumbStatus('generating');

    try {
      const res = await fetch('/api/director/phase2/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          option: {
            id: option.id,
            type: option.type,
            template: option.template,
            props: option.props,
            name: option.name,
            prompt: option.prompt,
            imagePrompt: effectivePrompt,
            rationale: option.rationale,
            infographicLayout: option.infographicLayout,
            infographicStyle: option.infographicStyle,
            infographicUseMode: option.infographicUseMode,
          },
          chapterId: chapter.chapterId,
          projectId
        })
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setPreviewUrl(data.imageUrl);
        setThumbStatus('completed');
      } else if (data.success && data.taskId) {
        pollThumbnail(taskKey);
      } else {
        setThumbStatus('failed');
      }
    } catch {
      setThumbStatus('failed');
    }
  };

  const handleGenerateThumbnail = () => {
    handleGenerateThumbnailWithPrompt();
  };

  const pollThumbnail = async (key: string) => {
    setThumbStatus('processing');

    const poll = async () => {
      try {
        const res = await fetch(`/api/director/phase2/thumbnail/${key}`);
        const data = await res.json();

        if (data.status === 'completed' && data.imageUrl) {
          setPreviewUrl(data.imageUrl);
          setThumbStatus('completed');
        } else if (data.status === 'failed') {
          setThumbStatus('failed');
        } else if (data.status === 'processing' || data.status === 'pending') {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        setThumbStatus('failed');
      }
    };

    poll();
  };

  return (
    <div className={`grid grid-cols-12 gap-3 p-3 rounded-lg border transition-all ${isSelected
      ? 'border-blue-500 bg-blue-500/5'
      : 'border-slate-700 bg-slate-800/30 hover:border-slate-500'
      }`}>
      {/* 序号 (col 1) */}
      <div className="col-span-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-bold">
          {rowId}
        </div>
      </div>

      {/* 原文一句话 (col 2 instead of 3 - ~70% width) */}
      <div className="col-span-2 flex items-center">
        <p className="text-slate-300 text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap">
          {quoteText}
        </p>
      </div>

      {/* 设计方案/提示词 (col 4 instead of 3 - more space) */}
      <div
        className="col-span-4 flex flex-col justify-center gap-1 cursor-pointer hover:bg-slate-700/30 rounded px-2 -mx-2 transition-colors"
        onClick={() => onSelect(chapter.chapterId, option.id)}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[option.type]}`}>
            {TYPE_LABELS[option.type] || option.type}
          </span>
          {isSelected && <Check className="w-4 h-4 text-blue-400" />}
        </div>
        <p className="text-white text-xs leading-relaxed">
          {option.prompt || '暂无方案描述'}
        </p>
        {(option as any).rationale && (
          <p className="text-slate-500 text-[10px] italic mt-1">
            💡 {(option as any).rationale}
          </p>
        )}
      </div>

      {/* 预览图 (col 4) */}
      <div className="col-span-4 flex flex-col gap-2">
        <div className="w-full aspect-video bg-slate-700/50 rounded overflow-hidden relative group border border-slate-700">
          {thumbStatus === 'completed' && previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setShowLightbox(true)}
              />
              {/* Zoom overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 cursor-zoom-in"
                onClick={() => setShowLightbox(true)}
              >
                <ZoomIn className="w-8 h-8 text-white drop-shadow" />
              </div>
            </>
          ) : thumbStatus === 'generating' || thumbStatus === 'processing' ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-[10px] text-blue-400 mt-2">{thumbStatus === 'generating' ? '生成中...' : '处理中...'}</span>
            </div>
          ) : thumbStatus === 'failed' ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800">
              <span className="text-red-400 text-xs font-medium bg-red-500/10 px-2 py-1 rounded">失败</span>
              <button onClick={(e) => { e.stopPropagation(); handleGenerateThumbnail(); }} className="text-[10px] text-slate-400 mt-2 hover:text-white underline decoration-slate-500 underline-offset-2">重试生成</button>
            </div>
          ) : requiresUpload && isChecked ? (
            // Non-AI sources (internet-clip, user-capture) with upload capability
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/80 relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
              />
              {uploadStatus === 'completed' ? (
                <div className="flex flex-col items-center">
                  <FileVideo className="w-8 h-8 text-green-400 mb-1" />
                  <span className="text-green-400 text-xs font-medium">已上传</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">{uploadedFile || `${chapter.chapterId}_${option.id}_rendered.mp4`}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerFileInput();
                    }}
                    className="text-[10px] text-slate-400 mt-1 hover:text-white underline"
                  >
                    重新上传
                  </button>
                </div>
              ) : uploadStatus === 'uploading' ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-1" />
                  <span className="text-blue-400 text-[10px]">上传中...</span>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFileInput();
                  }}
                  className="flex flex-col items-center hover:bg-slate-700/50 p-3 rounded-lg transition-colors"
                >
                  <Upload className={`w-6 h-6 mb-1 ${option.type === 'internet-clip' ? 'text-orange-400' : option.type === 'artlist' ? 'text-green-400' : 'text-cyan-400'}`} />
                  <span className={`text-xs font-medium ${option.type === 'internet-clip' ? 'text-orange-400' : option.type === 'artlist' ? 'text-green-400' : 'text-cyan-400'}`}>
                    {option.type === 'internet-clip' ? '🌐 上传网络素材' : option.type === 'artlist' ? '🎬 上传实拍素材' : '📸 上传录屏/截图'}
                  </span>
                  <span className="text-[9px] text-slate-500 mt-1">点击选择视频文件</span>
                </button>
              )}
            </div>
          ) : option.type && !PREVIEW_SUPPORTED_TYPES.includes(option.type) ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/80">
              <span className={`text-xs font-medium mb-1 ${option.type === 'internet-clip' ? 'text-orange-400' : option.type === 'user-capture' ? 'text-cyan-400' : 'text-green-400'}`}>
                {option.type === 'internet-clip' ? '🌐 互联网素材建议' : option.type === 'user-capture' ? '📸 截图/录屏建议' : '🎬 实拍素材建议'}
              </span>
              <span className="text-slate-500 text-[10px]">确认后上传</span>
            </div>
          ) : option.type === 'infographic' && option.infographicUseMode === 'static' && thumbStatus === 'idle' ? (
            // infographic static 模式：可生成静态预览图
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateThumbnail();
              }}
              disabled={!option.imagePrompt && !option.prompt}
              className="w-full h-full flex flex-col items-center justify-center hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              <span className="text-amber-400 text-lg mb-1">📊</span>
              <span className="text-[10px] text-amber-400 font-medium">静态信息图</span>
              <span className="text-[9px] text-slate-500 mt-0.5">点击生成预览</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateThumbnail();
              }}
              disabled={!option.imagePrompt && !option.prompt}
              className="w-full h-full flex flex-col items-center justify-center hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              <Image className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors mb-2" />
              <span className="text-[10px] text-slate-400 group-hover:text-slate-200 font-medium">生成预览</span>
            </button>
          )}
        </div>

      </div>

      {/* Lightbox Portal */}
      {showLightbox && previewUrl && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 overflow-auto flex items-start justify-center p-8"
          onClick={() => setShowLightbox(false)}
        >
          <button
            className="fixed top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10"
            onClick={() => setShowLightbox(false)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={previewUrl}
            alt="Preview fullsize"
            style={{ maxWidth: 'none', width: 'auto', height: 'auto' }}
            className="rounded shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

      {/* 确认 Checkbox (col 1) */}
      <div className="col-span-1 flex items-center justify-center">
        {/* 已经不需要强绑定 isSelected 才能发确认了，每行都有自己独立的 isChecked */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCheck(chapter.chapterId, option.id);
          }}
          title={option.isChecked ? '取消确认' : '确认该方案，加入渲染队列'}
          className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-all ${option.isChecked
            ? 'bg-green-600 border-green-500 text-white hover:bg-green-700'
            : 'border-slate-500 hover:border-slate-300 opacity-60 hover:opacity-100 hover:bg-slate-700'
            }`}
        >
          {option.isChecked && <Check className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

/** Strip redundant "第X章" prefix from chapter names at render time */
const cleanChapterName = (name: string) =>
  name.replace(/^(?:[\d\-\.]+\s+)?第[一二三四五六七八九十百\d\s]+章[：:\s]*/u, '').trim();

export const ChapterCard = ({ chapter, projectId, onSelect, onToggleCheck, pendingTaskKeys }: ChapterCardProps) => {
  const isAnyOptionChecked = chapter.options.length > 0 && chapter.options.every(opt => opt.isChecked);
  const displayName = cleanChapterName(chapter.chapterName);

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center gap-3">
        <span className="text-blue-400 font-bold text-sm">第{chapter.chapterIndex + 1}章</span>
        <span className="text-white font-medium">{displayName}</span>
        {isAnyOptionChecked && <Check className="w-4 h-4 text-green-400" />}
      </div>

      <div className="p-3">
        <div className="grid grid-cols-12 gap-3 mb-2 px-1">
          <div className="col-span-1 text-xs text-slate-500 font-bold text-center">序号</div>
          <div className="col-span-2 text-xs text-slate-500 font-bold">原文一句话</div>
          <div className="col-span-4 text-xs text-slate-500 font-bold">设计方案 / 提示词</div>
          <div className="col-span-4 text-xs text-slate-500 font-bold text-center">预览图</div>
          <div className="col-span-1 text-xs text-slate-500 font-bold text-center">确认</div>
        </div>

        <div className="flex flex-col gap-2">
          {chapter.options.map((option, idx) => {
            // Content-based key: when expert action changes imagePrompt/props, OptionRow remounts
            // with fresh thumbStatus='idle', clearing the stale preview automatically
            const contentKey = `${(option.imagePrompt || option.prompt || '').slice(0, 60)}|${JSON.stringify(option.props || {}).slice(0, 60)}`;
            return (
              <OptionRow
                key={`${option.id}::${contentKey}`}
                chapter={chapter}
                option={option}
                index={idx}
                projectId={projectId}
                onSelect={onSelect}
                onToggleCheck={onToggleCheck}
                isPendingBatch={pendingTaskKeys?.has(`${chapter.chapterId}-${option.id}`) ?? false}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
