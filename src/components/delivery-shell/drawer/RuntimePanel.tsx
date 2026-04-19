import { useState, useEffect } from 'react';
import { Info, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface LogEntry {
  timestamp: number;
  type: string;
  message: string;
}

interface RuntimePanelProps {
  currentModel?: { provider: string; model: string } | null;
  logs?: LogEntry[];
  isLoading?: boolean;
  startTime?: number | null;
}

export function RuntimePanel({ currentModel, logs = [], isLoading = false, startTime }: RuntimePanelProps) {
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500';
      case 'warning': return 'text-amber-600';
      case 'info': return 'text-blue-600';
      default: return 'text-[#8f8372]';
    }
  };

  const getLogBg = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-50';
      case 'warning': return 'bg-amber-50';
      case 'info': return 'bg-blue-50';
      default: return 'bg-[#f8f4ec]';
    }
  };

  const providerLabel = (provider?: string) => {
    switch (provider) {
      case 'siliconflow': return 'SiliconFlow';
      case 'deepseek': return 'DeepSeek';
      case 'yinli': return 'Yinli';
      default: return provider || 'Unknown';
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {currentModel && (
        <div className="rounded-lg border border-[#e4dbcc] p-3 bg-[rgba(255,252,247,0.78)]">
          <div className="flex items-center justify-between">
            <h3 className="text-xs text-[#8f8372] uppercase font-bold flex items-center gap-2">
              <Info className="w-3.5 h-3.5" />
              当前模型
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#8f8372]">{providerLabel(currentModel.provider)}</span>
              <span className="text-[#8f8372] opacity-60">({currentModel.model})</span>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-[#e4dbcc] p-3 bg-[rgba(255,252,247,0.78)]">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-[#c97545] animate-spin" />
            <span className="text-sm text-[#342d24]">正在为你的剧本生成视觉方案...</span>
            <span className="text-[#8f8372] font-mono text-xs ml-auto">
              ⏱ {formatElapsed(elapsedSeconds)}
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col">
        <button
          onClick={() => setIsLogsCollapsed(!isLogsCollapsed)}
          className="text-xs text-[#8f8372] hover:text-[#342d24] flex items-center gap-1 mb-2 transition-colors"
        >
          <span>{isLogsCollapsed ? '展开' : '收起'}日志 ({logs.length})</span>
          {isLogsCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        {!isLogsCollapsed && logs.length > 0 && (
          <div className="flex-1 overflow-y-auto rounded-lg border border-[#e4dbcc] bg-[#f8f4ec] p-2 space-y-1">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`text-xs font-mono px-2 py-1 rounded ${getLogBg(log.type)} ${getLogColor(log.type)}`}
              >
                <span className="text-[#8f8372] mr-2 opacity-60">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                {log.message}
              </div>
            ))}
          </div>
        )}

        {!isLogsCollapsed && logs.length === 0 && (
          <div className="text-xs text-[#8f8372] text-center py-4">暂无日志</div>
        )}
      </div>
    </div>
  );
}
