import { useState, useEffect } from 'react';
import { CheckCircle, Play, Loader2 } from 'lucide-react';
import { BRollSelector } from './BRollSelector';
import { ChapterCard } from './ChapterCard';
import { StoryboardSummaryStrip } from './phase-layouts/StoryboardSummaryStrip';
import { ChapterRail } from './phase-layouts/ChapterRail';
import { PhasePanel, PhasePanelHeader, PhasePanelBody } from './phase-layouts/PhasePanel';
import type { DirectorChapter, BRollType, SceneOption } from '../../types';

interface Phase2ViewProps {
  projectId: string;
  chapters: DirectorChapter[];
  isLoading: boolean;
  onConfirmBRoll: (types: BRollType[]) => void;
  onSelect: (chapterId: string, optionId: string) => void;
  onToggleCheck: (chapterId: string, optionId: string) => void;
  onBatchSetCheck: (filterFn: (opt: SceneOption) => boolean, checked: boolean) => void;
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
  const [activeChapterId, setActiveChapterId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (chapters.length > 0 && !brollConfirmed && !isLoading && !wasLoading) {
      setBrollConfirmed(true);
      setBrollSelections([]);
    }
  }, [chapters.length, brollConfirmed, isLoading, wasLoading]);

  useEffect(() => {
    if (isLoading) {
      setWasLoading(true);
    } else if (wasLoading && !isLoading) {
      setBrollSelections([]);
      setWasLoading(false);
    }
  }, [isLoading, wasLoading]);

  useEffect(() => {
    if (chapters.length > 0 && !activeChapterId) {
      setActiveChapterId(chapters[0].chapterId);
    }
  }, [chapters, activeChapterId]);

  const isShowAll = brollConfirmed && brollSelections.length === 0;
  const matchesFilter = (type: string) => isShowAll || brollSelections.includes(type as BRollType);

  const visibleOptionsCount = chapters.reduce(
    (sum, ch) => sum + ch.options.filter(o => matchesFilter(o.type)).length,
    0
  );
  const visibleCheckedCount = chapters.reduce(
    (sum, ch) => sum + ch.options.filter(o => matchesFilter(o.type) && o.isChecked).length,
    0
  );

  const totalOptions = chapters.reduce((sum, ch) => sum + ch.options.length, 0);
  const checkedCount = chapters.reduce(
    (sum, ch) => sum + ch.options.filter(o => o.isChecked).length,
    0
  );
  const allChecked = chapters.length > 0 && chapters.every(c => c.options.some(o => o.isChecked));

  const handleConfirmBRoll = () => {
    if (brollSelections.length === 0) return;
    setBrollConfirmed(true);
    onConfirmBRoll(brollSelections);
  };

  const getFilterLabel = () => {
    if (!brollConfirmed) return undefined;
    if (brollSelections.length === 0) return '全部类型';
    return `已筛选 ${brollSelections.length} 类`;
  };

  const getChapterStatus = (ch: DirectorChapter) => {
    const checked = ch.options.filter(o => o.isChecked).length;
    if (checked === 0) return 'pending' as const;
    if (checked < ch.options.length) return 'partial' as const;
    return 'complete' as const;
  };

  const filteredChapters = chapters.map(ch => {
    const filteredOptions = ch.options.filter(o => matchesFilter(o.type));
    return { ...ch, options: filteredOptions };
  }).filter(ch => ch.options.length > 0);

  const activeChapter = filteredChapters.find(c => c.chapterId === activeChapterId) || filteredChapters[0];

  if (!brollConfirmed) {
    return (
      <PhasePanel>
        <PhasePanelHeader
          title={<span className="text-sm font-bold text-[#342d24]">选择 B-Roll 类型</span>}
        />
        <PhasePanelBody className="space-y-5">
          <BRollSelector
            selected={brollSelections}
            onChange={setBrollSelections}
            disabled={isLoading}
          />
          <button
            onClick={handleConfirmBRoll}
            disabled={brollSelections.length === 0}
            className="px-5 py-2.5 bg-[#c97545] hover:bg-[#b5653a] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> 生成中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4" /> 确认并生成预览
              </span>
            )}
          </button>
        </PhasePanelBody>
      </PhasePanel>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <StoryboardSummaryStrip
        chapters={chapters}
        visibleCheckedCount={visibleCheckedCount}
        visibleOptionsCount={visibleOptionsCount}
        totalCheckedCount={checkedCount}
        totalOptionsCount={totalOptions}
        filterLabel={getFilterLabel()}
      />

      <div className="flex gap-4 flex-1 min-h-0">
        <ChapterRail
          chapters={chapters}
          activeChapterId={activeChapter?.chapterId}
          onChapterClick={(id) => setActiveChapterId(id)}
          getChapterStatus={getChapterStatus}
        />

        <div className="flex-1 min-w-0 overflow-auto">
          <div className="flex flex-col gap-4">
            <PhasePanel>
              <PhasePanelHeader
                title={<span className="text-sm font-bold text-[#342d24]">过滤视觉方案</span>}
                actions={
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
                      清空过滤
                    </button>
                  </div>
                }
              />
              <PhasePanelBody>
                <BRollSelector
                  selected={brollSelections}
                  onChange={setBrollSelections}
                  disabled={isLoading}
                />
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
                        onBatchSetCheck((opt) => matchesFilter(opt.type), isChecked);
                      }}
                    />
                    <span className="text-xs text-[#6b5e4f] group-hover:text-[#342d24] select-none flex items-center gap-1">
                      全选当前视图方案 <span className="text-[#8f8372]">({visibleCheckedCount}/{visibleOptionsCount})</span>
                    </span>
                  </label>
                </div>
              </PhasePanelBody>
            </PhasePanel>

            {allChecked && (
              <div className="flex justify-end">
                <button
                  onClick={onProceed}
                  className="px-5 py-2.5 bg-[#5b7c6f] hover:bg-[#4d6b5f] text-white font-medium rounded-lg flex items-center gap-2 transition-colors text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  提交 → Phase 3
                </button>
              </div>
            )}

            {filteredChapters.map(chapter => (
              <ChapterCard
                key={chapter.chapterId}
                chapter={chapter}
                projectId={projectId}
                onSelect={onSelect}
                onToggleCheck={onToggleCheck}
                pendingTaskKeys={pendingTaskKeys}
                isActive={chapter.chapterId === activeChapterId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
