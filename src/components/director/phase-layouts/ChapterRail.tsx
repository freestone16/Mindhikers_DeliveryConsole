import { BookOpen, ChevronRight } from 'lucide-react';
import type { DirectorChapter } from '../../../types';

interface ChapterRailProps {
  chapters: DirectorChapter[];
  activeChapterId?: string;
  onChapterClick?: (chapterId: string) => void;
  getChapterStatus?: (chapter: DirectorChapter) => 'pending' | 'partial' | 'complete';
}

export function ChapterRail({
  chapters,
  activeChapterId,
  onChapterClick,
  getChapterStatus,
}: ChapterRailProps) {
  const statusOf = (ch: DirectorChapter) => {
    if (getChapterStatus) return getChapterStatus(ch);
    const checked = ch.options.filter(o => o.isChecked).length;
    if (checked === 0) return 'pending' as const;
    if (checked < ch.options.length) return 'partial' as const;
    return 'complete' as const;
  };

  const statusDot = (status: 'pending' | 'partial' | 'complete') => {
    switch (status) {
      case 'complete':
        return <span className="w-2 h-2 rounded-full bg-[#62835c]" />;
      case 'partial':
        return <span className="w-2 h-2 rounded-full bg-[#c97545]" />;
      case 'pending':
      default:
        return <span className="w-2 h-2 rounded-full bg-[#e4dbcc]" />;
    }
  };

  if (chapters.length === 0) return null;

  return (
    <div className="w-40 border-r border-[#e4dbcc] flex flex-col overflow-hidden shrink-0" style={{ background: 'rgba(249, 244, 236, 0.6)' }}>
      <div className="px-4 py-3 border-b border-[#e4dbcc]">
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-[#8f8372]" />
          <span className="text-[11px] text-[#8f8372] uppercase tracking-wider font-bold">章节导航</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {chapters.map((ch) => {
          const status = statusOf(ch);
          const isActive = activeChapterId === ch.chapterId;
          const checkedCount = ch.options.filter(o => o.isChecked).length;

          return (
            <button
              key={ch.chapterId}
              onClick={() => onChapterClick?.(ch.chapterId)}
              className={`w-full text-left px-2.5 py-2 flex items-center gap-2 transition-colors ${
                isActive
                  ? 'bg-[#c97545]/8 text-[#342d24]'
                  : 'hover:bg-[#f4efe5] text-[#6b5e4f]'
              }`}
            >
              {statusDot(status)}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium truncate">
                  第{ch.chapterIndex + 1}章
                </div>
                <div className="text-[10px] text-[#8f8372] truncate leading-tight">
                  {ch.chapterName}
                </div>
              </div>
              <span className="text-[10px] text-[#8f8372] tabular-nums shrink-0">
                {checkedCount}/{ch.options.length}
              </span>
              {isActive && <ChevronRight className="w-3 h-3 text-[#c97545] shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
