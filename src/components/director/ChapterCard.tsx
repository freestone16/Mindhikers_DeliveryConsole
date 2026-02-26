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
};

const TYPE_LABELS: Record<string, string> = {
  remotion: 'Remotion动画',
  seedance: '文生视频',
  generative: 'AI生成',
  artlist: 'Artlist实拍',
};

// Artlist 不需要 AI 预览，只需展示关键词搜索方向
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
    if (!option.imagePrompt) return;

    setThumbStatus('generating');

    try {
      const res = await fetch('http://localhost:3002/api/director/phase2/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: option.imagePrompt,
          type: option.type,
          textPrompt: option.prompt, // Pass the Remotion text component description as well
          optionId: option.id,
          chapterId: chapter.chapterId,
          projectId: projectId
        })
      });

      const data = await res.json();

      if (data.success && data.taskId) {
        pollThumbnail(taskKey);
      } else if (data.success && data.imageUrl) {
        setPreviewUrl(data.imageUrl);
        setThumbStatus('completed');
      } else {
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

      <div className="col-span-4">
        <button
          onClick={() => !chapter.isLocked && onSelect(chapter.chapterId, option.id)}
          disabled={chapter.isLocked}
          className="w-full text-left"
        >
          <div className="flex items-start gap-3">
            <div className="w-24 h-16 bg-slate-700 rounded flex-shrink-0 overflow-hidden relative">
              {thumbStatus === 'completed' && previewUrl ? (
                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
              ) : thumbStatus === 'generating' || thumbStatus === 'processing' ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  <span className="text-xs text-blue-400 mt-1">{thumbStatus === 'generating' ? '生成中...' : '处理中...'}</span>
                </div>
              ) : thumbStatus === 'failed' ? (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-red-400 text-xs">失败</span>
                </div>
              ) : option.type && !PREVIEW_SUPPORTED_TYPES.includes(option.type) ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/50">
                  <span className="text-green-400 text-xs">🎬 实拍素材</span>
                  <span className="text-slate-500 text-[10px] mt-0.5">无需预览</span>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateThumbnail();
                  }}
                  disabled={!option.imagePrompt}
                  className="w-full h-full flex flex-col items-center justify-center hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  <Image className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-500 mt-1">生成预览</span>
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
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
                <p className="text-slate-500 text-[10px] mt-1 italic">
                  💡 {(option as any).rationale}
                </p>
              )}
            </div>
          </div>
        </button>
      </div>

      <div className="col-span-3 flex flex-col gap-2">
        <textarea
          className="flex-1 bg-slate-800/50 border border-slate-700 rounded p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          placeholder="反馈意见..."
          defaultValue={chapter.userComment || ''}
          onBlur={(e) => onComment(chapter.chapterId, e.target.value)}
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
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center gap-3">
        <span className="text-blue-400 font-bold text-sm">第{chapter.chapterIndex + 1}章</span>
        <span className="text-white font-medium">{chapter.chapterName}</span>
        {chapter.isLocked && <Lock className="w-4 h-4 text-green-400" />}
      </div>

      <div className="p-3">
        <div className="grid grid-cols-12 gap-3 mb-2 px-1">
          <div className="col-span-1 text-xs text-slate-500 font-bold">序号</div>
          <div className="col-span-3 text-xs text-slate-500 font-bold">原文</div>
          <div className="col-span-4 text-xs text-slate-500 font-bold">Visual Option (图+文)</div>
          <div className="col-span-3 text-xs text-slate-500 font-bold">Feedback</div>
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
