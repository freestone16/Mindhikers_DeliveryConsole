import { useState, useEffect } from 'react';
import { Play, Loader2, ChevronDown, ChevronUp, Info } from 'lucide-react';
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
  onComment: (chapterId: string, comment: string) => void;
  onLock: (chapterId: string) => void;
  onProceed: () => void;
  currentModel?: { provider: string; model: string };
  logs?: LogEntry[];
}
 export const Phase2View = ({
  projectId,
  chapters,
  isLoading,
  startTime,
  onConfirmBRoll,
  onSelect,
  onComment,
  onLock,
  onProceed,
  currentModel,
  logs = [],
}: Phase2ViewProps) => {
  const [brollSelections, setBrollSelections] = useState<BRollType[]>(['remotion', 'seedance', 'artlist']);
  const [brollConfirmed, setBrollConfirmed] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(true);

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

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const allLocked = chapters.length > 0 && chapters.every(c => c.isLocked);

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

      {/* B-Roll 类型选择 */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
        <h3 className="text-sm text-slate-400 uppercase font-bold mb-3">
          Select B-Roll Types
        </h3>
        <BRollSelector
          selected={brollSelections}
          onChange={setBrollSelections}
          disabled={brollConfirmed}
        />
        {!brollConfirmed && (
          <button
            onClick={handleConfirmBRoll}
            disabled={brollSelections.length === 0}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium"
          >
            Confirm & Generate Previews
          </button>
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
        <div className="flex flex-col gap-4">
          {chapters.map(chapter => (
            <ChapterCard
              key={chapter.chapterId}
              chapter={chapter}
              projectId={projectId}
              onSelect={onSelect}
              onComment={onComment}
              onLock={onLock}
            />
          ))}
        </div>
      )}

      {allLocked && (
        <div className="flex justify-end">
          <button
            onClick={onProceed}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            Proceed to Render Console
          </button>
        </div>
      )}
    </div>
  );
};
