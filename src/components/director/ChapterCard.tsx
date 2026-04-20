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
  remotion: 'bg-[#c97545]/15 text-[#c97545]',
  seedance: 'bg-[#9b6b9e]/15 text-[#9b6b9e]',
  generative: 'bg-[#9b6b9e]/15 text-[#9b6b9e]',
  artlist: 'bg-[#5b7c6f]/15 text-[#5b7c6f]',
  'internet-clip': 'bg-[#c97545]/15 text-[#b5653a]',
  'user-capture': 'bg-[#5b8a9b]/15 text-[#5b8a9b]',
  infographic: 'bg-[#a68b4b]/15 text-[#a68b4b]',
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

  // Check if material already exists for upload-required types
  useEffect(() => {
    if (requiresUpload) {
      checkMaterialExists();
    }
  }, [requiresUpload]);

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
      ? 'border-[#c97545] bg-[#c97545]/5'
      : 'border-[#e4dbcc] bg-[#f4efe5]/60 hover:border-[#d8c8ae]'
      }`}>
      {/* 序号 (col 1) */}
      <div className="col-span-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-[#e4dbcc] flex items-center justify-center text-[#342d24] text-sm font-bold">
          {rowId}
        </div>
      </div>

      {/* 原文一句话 (col 2 instead of 3 - ~70% width) */}
      <div className="col-span-2 flex items-center">
        <p className="text-[#342d24] text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap">
          {quoteText}
        </p>
      </div>

      {/* 设计方案/提示词 (col 4 instead of 3 - more space) */}
      <div
        className="col-span-4 flex flex-col justify-center gap-1 hover:bg-[#e4dbcc]/30 rounded px-2 -mx-2 transition-colors"
        title="点击选中此方案"
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium cursor-pointer ${TYPE_COLORS[option.type]} ${isSelected ? 'ring-1 ring-[#c97545]' : ''}`}
            onClick={() => onSelect(chapter.chapterId, option.id)}
            title={isSelected ? '已选中' : '点击选中此方案'}
          >
            {TYPE_LABELS[option.type] || option.type}
            {isSelected && ' ✓'}
          </span>
        </div>
        <p className="text-[#342d24] text-xs leading-relaxed">
          {option.prompt || '暂无方案描述'}
        </p>
        {(option as any).rationale && (
          <p className="text-[#8f8372] text-[10px] italic mt-1">
            💡 {(option as any).rationale}
          </p>
        )}
      </div>

      {/* 预览图 (col 4) */}
      <div className="col-span-4 flex flex-col gap-2">
        <div className="w-full aspect-video bg-[#f4efe5] rounded overflow-hidden relative group border border-[#e4dbcc]">
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
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#f4efe5]">
              <Loader2 className="w-5 h-5 text-[#c97545] animate-spin" />
              <span className="text-[10px] text-[#c97545] mt-2">{thumbStatus === 'generating' ? '生成中...' : '处理中...'}</span>
            </div>
          ) : thumbStatus === 'failed' ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#f4efe5]">
              <span className="text-red-600 text-xs font-medium bg-red-500/10 px-2 py-1 rounded">失败</span>
              <button onClick={(e) => { e.stopPropagation(); handleGenerateThumbnail(); }} className="text-[10px] text-[#6b5e4f] mt-2 hover:text-[#342d24] underline decoration-[#d8c8ae] underline-offset-2">重试生成</button>
            </div>
          ) : requiresUpload ? (
            // Non-AI sources (internet-clip, user-capture, artlist) — always show upload entry
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#f4efe5]/80 relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
              />
              {uploadStatus === 'completed' ? (
                <div className="flex flex-col items-center">
                  <FileVideo className="w-8 h-8 text-[#5b7c6f] mb-1" />
                  <span className="text-[#5b7c6f] text-xs font-medium">已上传</span>
                  <span className="text-[9px] text-[#8f8372] mt-0.5">{uploadedFile || `${chapter.chapterId}_${option.id}_rendered.mp4`}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerFileInput();
                    }}
                    className="text-[10px] text-[#6b5e4f] mt-1 hover:text-[#342d24] underline"
                  >
                    重新上传
                  </button>
                </div>
              ) : uploadStatus === 'uploading' ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-6 h-6 text-[#c97545] animate-spin mb-1" />
                  <span className="text-[#c97545] text-[10px]">上传中...</span>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFileInput();
                  }}
                  className="flex flex-col items-center hover:bg-[#e4dbcc]/50 p-3 rounded-lg transition-colors"
                >
                  <Upload className={`w-6 h-6 mb-1 ${option.type === 'internet-clip' ? 'text-[#b5653a]' : option.type === 'artlist' ? 'text-[#5b7c6f]' : 'text-[#5b8a9b]'}`} />
                  <span className={`text-xs font-medium ${option.type === 'internet-clip' ? 'text-[#b5653a]' : option.type === 'artlist' ? 'text-[#5b7c6f]' : 'text-[#5b8a9b]'}`}>
                    {option.type === 'internet-clip' ? '🌐 上传网络素材' : option.type === 'artlist' ? '🎬 上传实拍素材' : '📸 上传录屏/截图'}
                  </span>
                  <span className="text-[9px] text-[#8f8372] mt-1">点击选择视频文件</span>
                </button>
              )}
            </div>
          ) : option.type === 'infographic' && option.infographicUseMode === 'static' && thumbStatus === 'idle' ? (
            // infographic static 模式：可生成静态预览图
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateThumbnail();
              }}
              disabled={!option.imagePrompt && !option.prompt}
              className="w-full h-full flex flex-col items-center justify-center hover:bg-[#e4dbcc]/50 transition-colors disabled:opacity-50"
            >
              <span className="text-[#a68b4b] text-lg mb-1">📊</span>
              <span className="text-[10px] text-[#a68b4b] font-medium">静态信息图</span>
              <span className="text-[9px] text-[#8f8372] mt-0.5">点击生成预览</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateThumbnail();
              }}
              disabled={!option.imagePrompt && !option.prompt}
              className="w-full h-full flex flex-col items-center justify-center hover:bg-[#e4dbcc]/50 transition-colors disabled:opacity-50"
            >
              <Image className="w-6 h-6 text-[#8f8372] group-hover:text-[#342d24] transition-colors mb-2" />
              <span className="text-[10px] text-[#8f8372] group-hover:text-[#342d24] font-medium">生成预览</span>
            </button>
          )}
        </div>

      </div>

      {/* Lightbox Portal */}
      {showLightbox && previewUrl && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-6"
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
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', width: 'auto', height: 'auto' }}
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
            ? 'bg-[#5b7c6f] border-[#5b7c6f] text-white hover:bg-[#4d6b5f]'
            : 'border-[#d8c8ae] hover:border-[#c97545] opacity-60 hover:opacity-100 hover:bg-[#f4efe5]'
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
    <div className="rounded-lg border border-[#e4dbcc] overflow-hidden" style={{ background: 'rgba(255,252,247,0.78)' }}>
      <div className="bg-[#f4efe5] px-4 py-2 border-b border-[#e4dbcc] flex items-center gap-3">
        <span className="text-[#c97545] font-bold text-sm">第{chapter.chapterIndex + 1}章</span>
        <span className="text-[#342d24] font-medium">{displayName}</span>
        {isAnyOptionChecked && <Check className="w-4 h-4 text-[#5b7c6f]" />}
      </div>

      <div className="p-3">
        <div className="grid grid-cols-12 gap-3 mb-2 px-1">
          <div className="col-span-1 text-xs text-[#8f8372] font-bold text-center">序号</div>
          <div className="col-span-2 text-xs text-[#8f8372] font-bold">原文一句话</div>
          <div className="col-span-4 text-xs text-[#8f8372] font-bold">设计方案 / 提示词</div>
          <div className="col-span-4 text-xs text-[#8f8372] font-bold text-center">预览图</div>
          <div className="col-span-1 text-xs text-[#8f8372] font-bold text-center">确认</div>
        </div>

        <div className="flex flex-col gap-2">
          {chapter.options.map((option, idx) => {
            // Content-based key: when expert action changes imagePrompt/props, OptionRow remounts
            // with fresh thumbStatus='idle', clearing the stale preview automatically
            const contentKey = `${option.type}|${(option.imagePrompt || option.prompt || '').slice(0, 60)}|${JSON.stringify(option.props || {}).slice(0, 60)}`;
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
