import { CheckCircle, Layers, ListChecks, Clock } from 'lucide-react';
import type { DirectorChapter } from '../../../types';

interface StoryboardSummaryStripProps {
  chapters: DirectorChapter[];
  visibleCheckedCount: number;
  visibleOptionsCount: number;
  totalCheckedCount: number;
  totalOptionsCount: number;
  filterLabel?: string;
}

export function StoryboardSummaryStrip({
  chapters,
  visibleCheckedCount,
  visibleOptionsCount,
  totalCheckedCount,
  totalOptionsCount,
  filterLabel,
}: StoryboardSummaryStripProps) {
  const allChaptersChecked = chapters.length > 0 && chapters.every(c => c.options.some(o => o.isChecked));
  const progressPercent = totalOptionsCount > 0 ? Math.round((totalCheckedCount / totalOptionsCount) * 100) : 0;

  return (
    <div
      className="flex items-center justify-between px-5 py-3 border-b border-[#e4dbcc]"
      style={{ background: 'rgba(250, 246, 239, 0.9)' }}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#8f8372]" />
          <span className="text-xs text-[#8f8372] uppercase tracking-wider font-bold">章节</span>
          <span className="text-sm font-bold text-[#342d24]">{chapters.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-[#8f8372]" />
          <span className="text-xs text-[#8f8372] uppercase tracking-wider font-bold">已选</span>
          <span className={`text-sm font-bold ${visibleCheckedCount > 0 ? 'text-[#62835c]' : 'text-[#8f8372]'}`}>
            {visibleCheckedCount}
          </span>
          <span className="text-xs text-[#8f8372]">/ {visibleOptionsCount}</span>
          {filterLabel && (
            <span className="text-[10px] text-[#c97545] bg-[#c97545]/10 px-1.5 py-0.5 rounded">{filterLabel}</span>
          )}
        </div>

        {totalOptionsCount > visibleOptionsCount && (
          <div className="flex items-center gap-2 opacity-60">
            <Clock className="w-4 h-4 text-[#8f8372]" />
            <span className="text-xs text-[#8f8372] uppercase tracking-wider font-bold">全局</span>
            <span className="text-sm font-bold text-[#342d24]">{totalCheckedCount}</span>
            <span className="text-xs text-[#8f8372]">/ {totalOptionsCount}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {allChaptersChecked && (
          <span className="text-xs text-[#62835c] flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> 全部确认
          </span>
        )}
        <div className="w-24 h-1.5 bg-[#e4dbcc] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#c97545] rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-[#8f8372] w-8 text-right">{progressPercent}%</span>
      </div>
    </div>
  );
}
