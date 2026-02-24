import { Check, Lock } from 'lucide-react';
import type { DirectorChapter } from '../../types';

interface ChapterCardProps {
  chapter: DirectorChapter;
  onSelect: (chapterId: string, optionId: string) => void;
  onComment: (chapterId: string, comment: string) => void;
  onLock: (chapterId: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  remotion: 'bg-blue-500/20 text-blue-300',
  seedance: 'bg-purple-500/20 text-purple-300',
  artlist: 'bg-green-500/20 text-green-300',
};

export const ChapterCard = ({ chapter, onSelect, onComment, onLock }: ChapterCardProps) => {
  return (
    <div className="grid grid-cols-3 gap-4 bg-slate-900 rounded-lg border border-slate-700 p-4">
      <div className="bg-slate-800/50 rounded p-3">
        <div className="text-xs text-slate-500 uppercase font-bold mb-2">
          {chapter.chapterName}
        </div>
        <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed line-clamp-8">
          {chapter.scriptText}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Visual Options</div>
        {chapter.options.map((option, idx) => (
          <button
            key={option.id}
            onClick={() => !chapter.isLocked && onSelect(chapter.chapterId, option.id)}
            disabled={chapter.isLocked}
            className={`flex items-center gap-3 p-2 rounded border transition-all text-left
              ${chapter.selectedOptionId === option.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 bg-slate-800/30 hover:border-slate-500'}
              ${chapter.isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <div className="w-20 h-12 bg-slate-700 rounded flex-shrink-0 overflow-hidden">
              {option.previewUrl ? (
                <img src={option.previewUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  {idx + 1}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white font-medium">Option {idx + 1}</div>
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs mt-0.5 ${TYPE_COLORS[option.type]}`}>
                {option.type}
              </span>
            </div>
            {chapter.selectedOptionId === option.id && (
              <Check className="w-4 h-4 text-blue-400" />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-xs text-slate-500 uppercase font-bold">Feedback</div>
        <textarea
          className="flex-1 bg-slate-800/50 border border-slate-700 rounded p-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          placeholder="Add feedback..."
          defaultValue={chapter.userComment || ''}
          onBlur={(e) => onComment(chapter.chapterId, e.target.value)}
          disabled={chapter.isLocked}
        />
        <button
          onClick={() => onLock(chapter.chapterId)}
          disabled={chapter.isLocked || !chapter.selectedOptionId}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all
            ${chapter.isLocked
              ? 'bg-green-600 text-white cursor-default'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed'}`}
        >
          {chapter.isLocked ? (
            <><Lock className="w-4 h-4" /> Locked</>
          ) : (
            <><Check className="w-4 h-4" /> Lock Selection</>
          )}
        </button>
      </div>
    </div>
  );
};
