import { useState, useEffect } from 'react';
import { Loader2, ChevronDown, ChevronUp, Info } from 'lucide-react';
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
  startTime: number | null;
  onConfirmBRoll: (types: BRollType[]) => void;
  onSelect: (chapterId: string, optionId: string) => void;
  onToggleCheck: (chapterId: string, optionId: string) => void;
  onBatchSetCheck: (filterFn: (opt: any) => boolean, checked: boolean) => void;
  onProceed: () => void;
  currentModel?: { provider: string; model: string };
  logs?: LogEntry[];
  pendingTaskKeys?: Set<string>;
}
export const Phase2View = ({
  projectId,
  chapters,
  isLoading,
  startTime,
  onConfirmBRoll,
  onSelect,
  onToggleCheck,
  onBatchSetCheck,
  onProceed,
  currentModel,
  logs = [],
  pendingTaskKeys,
}: Phase2ViewProps) => {
  const [brollConfirmed, setBrollConfirmed] = useState(chapters.length > 0);
  const [brollSelections, setBrollSelections] = useState<BRollType[]>(
    chapters.length > 0 ? [] : ['remotion', 'seedance', 'artlist', 'infographic']
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(true);
  const [wasLoading, setWasLoading] = useState(false);

  useEffect(() => {
    let interval: number;
    if (isLoading && startTime) {
      interval = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => window.clearInterval(interval);
  }, [isLoading, startTime]);

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

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };


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

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Debug Panel - 模型信息 + 日志 */}
      {currentModel && (
        <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm text-slate-400 uppercase font-bold flex items-center gap-2">
              <Info className="w-4 h-4" />
              调试面板
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">模型:</span>
              <span className="text-white font-medium">
                {currentModel.provider === 'siliconflow' ? 'SiliconFlow / Kimi-K2.5' :
                  currentModel.provider === 'deepseek' ? 'DeepSeek' :
                    currentModel.provider === 'kimi' ? 'Kimi' :
                      currentModel.provider === 'yinli' ? 'Yinli / Claude-Sonnet-4-6-Th' :
                        'Unknown'}
              </span>
              <span className="text-slate-500 text-xs">({currentModel.model})</span>
            </div>
          </div>

          {/* 日志面板 */}
          <div>
            <button
              onClick={() => setIsLogsCollapsed(!isLogsCollapsed)}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 mb-2"
            >
              <span>{isLogsCollapsed ? '展开' : '收起'}日志 ({logs.length})</span>
              {isLogsCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>

            {!isLogsCollapsed && logs.length > 0 && (
              <div className="bg-slate-950 rounded p-3 max-h-64 overflow-y-auto space-y-1">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={`text-xs font-mono ${getLogColor(log.type)}`}
                  >
                    <span className="text-slate-500 mr-2">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* B-Roll 类型选择与过滤 */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm text-slate-400 uppercase font-bold">
            {brollConfirmed ? '过滤视觉方案 (Excel 式筛选)' : 'Select B-Roll Types'}
          </h3>
          {brollConfirmed && (
            <div className="flex gap-2">
              <button
                onClick={() => setBrollSelections(['remotion', 'seedance', 'generative', 'artlist', 'internet-clip', 'user-capture', 'infographic'])}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition-colors"
              >
                显示全部
              </button>
              <button
                onClick={() => setBrollSelections([])}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition-colors"
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
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium"
          >
            Confirm & Generate Previews
          </button>
        ) : (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-800">
            <span className="text-xs text-slate-500 font-medium">批量操作:</span>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-800/80 p-1.5 -ml-1.5 rounded transition-colors group">
              <input
                type="checkbox"
                className="w-4 h-4 cursor-pointer accent-blue-500 rounded border-slate-600 bg-slate-800 focus:ring-0 focus:ring-offset-0 disabled:opacity-50"
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
              <span className="text-xs text-slate-400 group-hover:text-slate-300 select-none flex items-center gap-1">
                全选当前视图方案 <span className="text-slate-500">({visibleCheckedCount}/{visibleOptionsCount})</span>
              </span>
            </label>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-white">正在为你的剧本生成视觉方案...</span>
            <span className="text-slate-400 font-mono text-sm">⏱ 已用时 {formatElapsed(elapsedSeconds)}</span>
          </div>
        </div>
      )}

      {chapters.length > 0 && (
        <>
          {/* 进度头工具栏 */}
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 flex items-center justify-between sticky top-4 z-10 shadow-lg">
            <div className="flex items-center gap-4">
              <span className="text-slate-400 font-medium whitespace-nowrap">筛选结果:</span>
              <div className="flex gap-4">
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${visibleCheckedCount > 0 ? 'text-green-400' : 'text-slate-500'}`}>{visibleCheckedCount}</span>
                  <span className="text-slate-500 font-medium">/ {visibleOptionsCount} (当前显示)</span>
                </div>
                <div className="w-px h-6 bg-slate-700 mx-2"></div>
                {brollSelections.length > 0 && (
                  <div className="flex items-baseline gap-1 opacity-60">
                    <span className="text-lg font-bold text-slate-400">{checkedCount}</span>
                    <span className="text-slate-500 text-sm">/ {totalOptions} (全局总计)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {allChecked && (
                <button
                  onClick={onProceed}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg flex items-center gap-2 transition-colors text-sm"
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
