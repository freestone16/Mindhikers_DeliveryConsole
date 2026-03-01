import { useState, useEffect } from 'react';
import { Check, Lock, Loader2, Image } from 'lucide-react';
import type { DirectorChapter, SceneOption } from '../../types';

interface ChapterCardProps {
  chapter: DirectorChapter;
  projectId: string;
  onSelect: (chapterId: string, optionId: string) => void;
  onComment: (chapterId: string, comment: string) => void;
  onLock: (chapterId: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  remotion: 'bg-blue-500/20 text-blue-300',
  seedance: 'bg-purple-500/20 text-purple-300',
  generative: 'bg-purple-500/20 text-purple-300',
  artlist: 'bg-green-500/20 text-green-300',
  'internet-clip': 'bg-orange-500/20 text-orange-300',
  'user-capture': 'bg-cyan-500/20 text-cyan-300',
};

const TYPE_LABELS: Record<string, string> = {
  remotion: 'Remotion动画',
  seedance: '文生视频',
  generative: 'AI生成',
  artlist: 'Artlist实拍',
  'internet-clip': '🌐 互联网素材',
  'user-capture': '📸 用户截图/录屏',
};

// Artlist 和互联网/用户截图不需要 AI 预览
const PREVIEW_SUPPORTED_TYPES = ['remotion', 'generative', 'seedance'];

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
  onComment: (chapterId: string, comment: string) => void;
  onLock: (chapterId: string) => void;
}

const OptionRow = ({ chapter, option, index, projectId, onSelect, onComment, onLock }: OptionRowProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(option.previewUrl || null);
  const [thumbStatus, setThumbStatus] = useState<'idle' | 'generating' | 'processing' | 'completed' | 'failed'>('idle');
  const isSelected = chapter.selectedOptionId === option.id;
  const rowId = `${chapter.chapterIndex + 1}-${index + 1}`;
  const quoteText = option.quote || getScriptPreview(chapter.scriptText);
  const taskKey = `${chapter.chapterId}-${option.id}`;

  useEffect(() => {
    if (option.previewUrl) {
      setPreviewUrl(option.previewUrl);
      setThumbStatus('completed');
    }
  }, [option.previewUrl]);

  const handleGenerateThumbnail = async () => {
    if (!option.imagePrompt && !option.prompt) return;

    console.log('[Thumbnail] Starting generation for:', option.id, option.type);
    setThumbStatus('generating');

    try {
      const res = await fetch('http://localhost:3002/api/director/phase2/thumbnail', {
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
            imagePrompt: option.imagePrompt,
            rationale: option.rationale,
          },
          chapterId: chapter.chapterId,
          projectId: projectId
        })
      });

      const data = await res.json();
      console.log('[Thumbnail] Response:', { success: data.success, hasImageUrl: !!data.imageUrl, hasTaskId: !!data.taskId, status: data.status });

      if (data.success && data.imageUrl) {
        // 同步直出 (Remotion)
        setPreviewUrl(data.imageUrl);
        setThumbStatus('completed');
      } else if (data.success && data.taskId) {
        // 异步轮询 (Volcengine)
        pollThumbnail(taskKey);
      } else {
        console.error('[Thumbnail] Failed:', data.error || data);
        setThumbStatus('failed');
      }
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      setThumbStatus('failed');
    }
  };

  const pollThumbnail = async (key: string) => {
    setThumbStatus('processing');

    const poll = async () => {
      try {
        const res = await fetch(`http://localhost:3002/api/director/phase2/thumbnail/${key}`);
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
      } ${chapter.isLocked ? 'opacity-60' : ''}`}>
      <div className="col-span-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-bold">
          {rowId}
        </div>
      </div>

      <div className="col-span-3 flex items-center">
        <p className="text-slate-300 text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap">
          {quoteText}
        </p>
      </div>

      {/* 方案描述/提示词 (col 2) */}
      <div
        className="col-span-2 flex flex-col justify-center gap-1 cursor-pointer hover:bg-slate-700/30 rounded px-2 -mx-2 transition-colors"
        onClick={() => !chapter.isLocked && onSelect(chapter.chapterId, option.id)}
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

      {/* 缩略图预览 (col 3 = 150%) */}
      <div className="col-span-3 flex items-center justify-center">
        <div className="w-full aspect-video bg-slate-700/50 rounded overflow-hidden relative group border border-slate-700">
          {thumbStatus === 'completed' && previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
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
          ) : option.type && !PREVIEW_SUPPORTED_TYPES.includes(option.type) ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/80">
              <span className={`text-xs font-medium mb-1 ${option.type === 'internet-clip' ? 'text-orange-400' : option.type === 'user-capture' ? 'text-cyan-400' : 'text-green-400'}`}>
                {option.type === 'internet-clip' ? '🌐 互联网素材建议' : option.type === 'user-capture' ? '📸 截图/录屏建议' : '🎬 实拍素材'}
              </span>
              <span className="text-slate-500 text-[10px]">用户自行采集</span>
            </div>
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

      {/* 反馈 (col 2) */}
      <div className="col-span-2 flex items-stretch">
        <textarea
          className="flex-1 w-full bg-slate-800/50 border border-slate-700 rounded p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-slate-800 transition-colors resize-none"
          placeholder="反馈意见... (Ctrl+Enter 提交)"
          defaultValue={chapter.userComment || ''}
          onBlur={(e) => onComment(chapter.chapterId, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault();
              onComment(chapter.chapterId, (e.target as HTMLTextAreaElement).value);
            }
          }}
          disabled={chapter.isLocked}
        />
      </div>

      <div className="col-span-1 flex items-center justify-center">
        <button
          onClick={() => onLock(chapter.chapterId)}
          disabled={chapter.isLocked || !chapter.selectedOptionId}
          className={`w-full h-full flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs font-medium transition-all
            ${chapter.isLocked
              ? 'bg-green-600 text-white cursor-default'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed'}`}
        >
          {chapter.isLocked ? (
            <><Lock className="w-4 h-4" /><span>已锁定</span></>
          ) : (
            <><Check className="w-4 h-4" /><span>锁定</span></>
          )}
        </button>
      </div>
    </div>
  );
};

export const ChapterCard = ({ chapter, projectId, onSelect, onComment, onLock }: ChapterCardProps) => {
  // 如果章节名中已包含"第X章"前缀，去掉它以避免重复
  let cleanChapterName = chapter.chapterName;
  const prefixMatch = chapter.chapterName.match(/^第\d+章\s+(.+)$/);
  if (prefixMatch) {
    cleanChapterName = prefixMatch[1]; // 只保留"第X章"后面的部分
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center gap-3">
        <span className="text-blue-400 font-bold text-sm">第{chapter.chapterIndex + 1}章</span>
        <span className="text-white font-medium">{cleanChapterName}</span>
        {chapter.isLocked && <Lock className="w-4 h-4 text-green-400" />}
      </div>

      <div className="p-3">
        <div className="grid grid-cols-12 gap-3 mb-2 px-1">
          <div className="col-span-1 text-xs text-slate-500 font-bold text-center">序号</div>
          <div className="col-span-3 text-xs text-slate-500 font-bold">原文一句话</div>
          <div className="col-span-2 text-xs text-slate-500 font-bold">设计方案 / 提示词</div>
          <div className="col-span-3 text-xs text-slate-500 font-bold text-center">预览图</div>
          <div className="col-span-2 text-xs text-slate-500 font-bold">反馈意见</div>
          <div className="col-span-1 text-xs text-slate-500 font-bold text-center">锁定</div>
        </div>

        <div className="flex flex-col gap-2">
          {chapter.options.map((option, idx) => (
            <OptionRow
              key={option.id}
              chapter={chapter}
              option={option}
              index={idx}
              projectId={projectId}
              onSelect={onSelect}
              onComment={onComment}
              onLock={onLock}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
