import { useState, useEffect } from 'react';
import { BRollSelector } from './BRollSelector';
import { ChapterCard } from './ChapterCard';
import type { DirectorChapter, BRollType } from '../../types';

interface LogEntry {
  timestamp: number;
  type: string;
  message: string;
  provider?: string;
  model?: string;
}

interface Phase2ViewProps {
  projectId: string;
  chapters: DirectorChapter[];
  isLoading: boolean;
  onConfirmBRoll: (types: BRollType[]) => void;
  onSelect: (chapterId: string, optionId: string) => void;
  onToggleCheck: (chapterId: string, optionId: string) => void;
  onBatchSetCheck: (filterFn: (opt: any) => boolean, checked: boolean) => void;
  onProceed: () => void;
  pendingTaskKeys?: Set<string>;
}
export const Phase2View = ({
  projectId,
  chapters,
  isLoading,
  onConfirmBRoll,
  onSelect,
  onToggleCheck,
  onBatchSetCheck,
  onProceed,
  pendingTaskKeys,
}: Phase2ViewProps) => {
  const [brollConfirmed, setBrollConfirmed] = useState(chapters.length > 0);
  const [brollSelections, setBrollSelections] = useState<BRollType[]>(
    chapters.length > 0 ? [] : ['remotion', 'seedance', 'artlist', 'infographic']
  );
  const [wasLoading, setWasLoading] = useState(false);

  // Sync state if chapters are loaded externally (e.g., initial fetch)
  useEffect(() => {
    if (chapters.length > 0 && !brollConfirmed && !isLoading && !wasLoading) {
      setBrollConfirmed(true);
      setBrollSelections([]);
    }
  }, [chapters.length, brollConfirmed, isLoading, wasLoading]);

  // Clear selections when generation finishes so the user starts with an empty filter
  useEffect(() => {
    if (isLoading) {
      setWasLoading(true);
    } else if (wasLoading && !isLoading) {
      setBrollSelections([]);
      setWasLoading(false);
    }
  }, [isLoading, wasLoading]);

  const isShowAll = brollConfirmed && brollSelections.length === 0;
  const matchesFilter = (type: string) => isShowAll || brollSelections.includes(type as BRollType);

  // Counts based on currently visible filters
  const visibleOptionsCount = chapters.reduce((sum, ch) => sum + ch.options.filter(o => matchesFilter(o.type)).length, 0);
  const visibleCheckedCount = chapters.reduce((sum, ch) =>
    sum + ch.options.filter(o => matchesFilter(o.type) && o.isChecked).length, 0
  );

  // Total counts for overall progress
  const totalOptions = chapters.reduce((sum, ch) => sum + ch.options.length, 0);
  const checkedCount = chapters.reduce((sum, ch) => sum + ch.options.filter(o => o.isChecked).length, 0);
  const allChecked = chapters.length > 0 && chapters.every(c => c.options.some(o => o.isChecked));

  const handleConfirmBRoll = () => {
    if (brollSelections.length === 0) return;
    setBrollConfirmed(true);
    onConfirmBRoll(brollSelections);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* B-Roll 类型选择与过滤 */}
      <div className="rounded-lg border border-[#e4dbcc] p-4" style={{ background: 'rgba(255,252,247,0.78)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm text-[#6b5e4f] uppercase font-bold">
            {brollConfirmed ? '过滤视觉方案 (Excel 式筛选)' : 'Select B-Roll Types'}
          </h3>
          {brollConfirmed && (
            <div className="flex gap-2">
              <button
                onClick={() => setBrollSelections(['remotion', 'seedance', 'generative', 'artlist', 'internet-clip', 'user-capture', 'infographic'])}
                className="text-xs bg-[#f4efe5] hover:bg-[#e4dbcc] text-[#342d24] px-3 py-1.5 rounded transition-colors"
              >
                显示全部
              </button>
              <button
                onClick={() => setBrollSelections([])}
                className="text-xs bg-[#f4efe5] hover:bg-[#e4dbcc] text-[#342d24] px-3 py-1.5 rounded transition-colors"
              >
                清空过滤 (显示全部)
              </button>
            </div>
          )}
        </div>
        <BRollSelector
          selected={brollSelections}
          onChange={setBrollSelections}
          disabled={!brollConfirmed && isLoading}
        />
        {!brollConfirmed ? (
          <button
            onClick={handleConfirmBRoll}
            disabled={brollSelections.length === 0}
            className="mt-4 px-4 py-2 bg-[#c97545] hover:bg-[#b5653a] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium"
          >
            Confirm & Generate Previews
          </button>
        ) : (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#e4dbcc]">
            <span className="text-xs text-[#8f8372] font-medium">批量操作:</span>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-[#f4efe5] p-1.5 -ml-1.5 rounded transition-colors group">
              <input
                type="checkbox"
                className="w-4 h-4 cursor-pointer accent-[#c97545] rounded border-[#d8c8ae] focus:ring-0 focus:ring-offset-0 disabled:opacity-50"
                style={{ backgroundColor: '#faf6ef' }}
                ref={el => {
                  if (el) el.indeterminate = visibleCheckedCount > 0 && visibleCheckedCount < visibleOptionsCount;
                }}
                checked={visibleCheckedCount === visibleOptionsCount && visibleOptionsCount > 0}
                disabled={visibleOptionsCount === 0}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  onBatchSetCheck(
                    (opt) => matchesFilter(opt.type),
                    isChecked
                  );
                }}
              />
              <span className="text-xs text-[#6b5e4f] group-hover:text-[#342d24] select-none flex items-center gap-1">
                全选当前视图方案 <span className="text-[#8f8372]">({visibleCheckedCount}/{visibleOptionsCount})</span>
              </span>
            </label>
          </div>
        )}
      </div>

      {chapters.length > 0 && (
        <>
          {/* 进度头工具栏 */}
          <div className="rounded-lg border border-[#e4dbcc] p-4 flex items-center justify-between sticky top-4 z-10 shadow-lg" style={{ background: 'rgba(255,252,247,0.78)' }}>
            <div className="flex items-center gap-4">
              <span className="text-[#6b5e4f] font-medium whitespace-nowrap">筛选结果:</span>
              <div className="flex gap-4">
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${visibleCheckedCount > 0 ? 'text-[#62835c]' : 'text-[#8f8372]'}`}>{visibleCheckedCount}</span>
                  <span className="text-[#8f8372] font-medium">/ {visibleOptionsCount} (当前显示)</span>
                </div>
                <div className="w-px h-6 bg-[#e4dbcc] mx-2"></div>
                {brollSelections.length > 0 && (
                  <div className="flex items-baseline gap-1 opacity-60">
                    <span className="text-lg font-bold text-[#6b5e4f]">{checkedCount}</span>
                    <span className="text-[#8f8372] text-sm">/ {totalOptions} (全局总计)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {allChecked && (
                <button
                  onClick={onProceed}
                  className="px-4 py-2 bg-[#5b7c6f] hover:bg-[#4d6b5f] text-white font-medium rounded-lg flex items-center gap-2 transition-colors text-sm"
                >
                  提交 → Phase 3
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {chapters.map(chapter => {
              const filteredOptions = chapter.options.filter(o => matchesFilter(o.type));
              if (filteredOptions.length === 0) return null;

              // Only pass filtered options to the chapter card
              const filteredChapter = { ...chapter, options: filteredOptions };

              return (
                <ChapterCard
                  key={chapter.chapterId}
                  chapter={filteredChapter}
                  projectId={projectId}
                  onSelect={onSelect}
                  onToggleCheck={onToggleCheck}
                  pendingTaskKeys={pendingTaskKeys}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
