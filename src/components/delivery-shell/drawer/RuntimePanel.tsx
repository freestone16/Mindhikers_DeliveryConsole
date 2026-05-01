import { useState, useEffect } from 'react';
import { Info, ChevronDown, ChevronUp, Loader2, Cpu, Zap, CheckCircle2, AlertCircle, ListChecks, Wrench } from 'lucide-react';

interface LogEntry {
  timestamp: number;
  type: string;
  message: string;
}

interface SkillSyncStatus {
  status: 'done' | 'error';
  synced?: string[];
  count?: number;
  message?: string;
  timestamp?: string;
}

interface RuntimePanelProps {
  currentModel?: { provider: string; model: string } | null;
  logs?: LogEntry[];
  isLoading?: boolean;
  startTime?: number | null;
  socket?: any;
}

const ALL_SKILLS = [
  { name: 'Director', label: '影视导演', kind: 'expert' },
  { name: 'MusicDirector', label: '音乐总监', kind: 'expert' },
  { name: 'ThumbnailMaster', label: '缩略图大师', kind: 'expert' },
  { name: 'ShortsMaster', label: '短视频大师', kind: 'expert' },
  { name: 'MarketingMaster', label: '营销大师', kind: 'expert' },
  { name: 'RemotionStudio', label: 'Remotion 渲染', kind: 'tool' },
  { name: 'svg-architect', label: 'SVG 架构', kind: 'tool' },
];

function SyncedSkillsCard({ socket }: { socket?: any }) {
  const [syncStatus, setSyncStatus] = useState<SkillSyncStatus | null>(null);

  useEffect(() => {
    if (!socket) return;
    const handler = (data: SkillSyncStatus) => setSyncStatus(data);
    socket.on('skill-sync-status', handler);
    return () => { socket.off('skill-sync-status', handler); };
  }, [socket]);

  const synced = new Set(syncStatus?.synced ?? []);
  const isDone = syncStatus?.status === 'done';

  return (
    <div className="rounded-lg border border-[#e4dbcc] p-3 bg-[rgba(255,252,247,0.78)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs text-[#8f8372] uppercase font-bold">已同步 Skills</h3>
        <span className="text-[10px] text-[#8f8372]">
          {syncStatus ? `${synced.size}/${ALL_SKILLS.length}` : '等待同步...'}
        </span>
      </div>
      <div className="space-y-1">
        {ALL_SKILLS.map(skill => {
          const ok = synced.has(skill.name);
          return (
            <div key={skill.name} className="flex items-center gap-2 text-xs">
              {isDone && ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#62835c] shrink-0" />
              ) : isDone ? (
                <AlertCircle className="w-3.5 h-3.5 text-[#c97545] shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-[#d8c8ae] shrink-0" />
              )}
              <span className="text-[#342d24] truncate">{skill.label}</span>
              <span className="text-[10px] text-[#8f8372] ml-auto shrink-0">
                {skill.kind === 'tool' ? '工具' : '专家'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RuntimePanel({ currentModel, logs = [], isLoading = false, startTime, socket }: RuntimePanelProps) {
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    fetch('/api/version')
      .then(res => res.json())
      .then(data => { if (data.version) setVersion(data.version); })
      .catch(() => {});
  }, []);

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

  const actionTrace = logs
    .filter(log => /generate|生成|revise|修订|approve|批准|retry|重试|render|渲染|export|导出|handoff|交接/i.test(log.message))
    .slice(-5)
    .reverse();
  const errorLogs = logs.filter(log => log.type === 'error').slice(-3).reverse();
  const latestLog = logs[logs.length - 1];

  const getActionLabel = (message: string) => {
    if (/revise|修订/i.test(message)) return '修订';
    if (/approve|批准/i.test(message)) return '批准';
    if (/retry|重试/i.test(message)) return '重试';
    if (/render|渲染/i.test(message)) return '渲染';
    if (/export|导出/i.test(message)) return '导出';
    if (/handoff|交接/i.test(message)) return '交接';
    return '生成';
  };

  const providerLabel = (provider?: string) => {
    switch (provider) {
      case 'siliconflow': return 'SiliconFlow';
      case 'deepseek': return 'DeepSeek';
      case 'yinli': return 'Yinli';
      case 'kimi': return 'Kimi';
      case 'google': return 'Google';
      default: return provider || 'Unknown';
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <SyncedSkillsCard socket={socket} />

      <div className="rounded-lg border border-[#e4dbcc] p-3 bg-[rgba(255,252,247,0.78)] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[#8f8372] font-medium">
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-[#c97545] animate-spin" />
            ) : errorLogs.length > 0 ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#62835c]" />
            )}
            当前状态
          </span>
          <span className="text-[#342d24]">
            {isLoading ? `处理中 ${formatElapsed(elapsedSeconds)}` : errorLogs.length > 0 ? '最近有错误' : '待命'}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[#8f8372] font-medium">
            <Cpu className="w-3.5 h-3.5" />
            LLM
          </span>
          <span className="text-[#342d24]">
            {currentModel ? (
              <>
                {providerLabel(currentModel.provider)}
                <span className="text-[#8f8372] ml-1">/ {currentModel.model}</span>
              </>
            ) : (
              <span className="text-[#8f8372]">未配置</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[#8f8372] font-medium">
            <Zap className="w-3.5 h-3.5" />
            Remotion
          </span>
          <span className="text-[#342d24]">RemotionStudio</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[#8f8372] font-medium">
            <Info className="w-3.5 h-3.5" />
            Console
          </span>
          <span className="text-[#342d24]">{version || '—'}</span>
        </div>

        {latestLog && (
          <div className="pt-2 mt-1 border-t border-[#e4dbcc] text-[11px] text-[#8f8372] leading-relaxed">
            最近事件：<span className="text-[#342d24]">{latestLog.message}</span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[#e4dbcc] p-3 bg-[rgba(255,252,247,0.78)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs text-[#8f8372] uppercase font-bold flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5" />
            动作追踪
          </h3>
          <span className="text-[10px] text-[#8f8372]">{actionTrace.length ? `${actionTrace.length} 条` : '等待动作'}</span>
        </div>
        {actionTrace.length > 0 ? (
          <div className="space-y-1">
            {actionTrace.map((log, i) => (
              <div key={`${log.timestamp}-${i}`} className="text-[11px] text-[#342d24] bg-[#f8f4ec] border border-[#e4dbcc] rounded px-2 py-1.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[9px] text-[#c97545] bg-[rgba(201,117,69,0.12)] px-1 rounded">
                    {getActionLabel(log.message)}
                  </span>
                  <span className="text-[#8f8372]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="leading-snug">{log.message}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#8f8372] leading-relaxed">
            生成、修订、批准、重试、渲染、导出和交接等动作会在这里形成可追踪上下文。
          </p>
        )}
      </div>

      <div className="rounded-lg border border-[#e4dbcc] p-3 bg-[rgba(255,252,247,0.78)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs text-[#8f8372] uppercase font-bold flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            工具反馈
          </h3>
          <span className="text-[10px] text-[#8f8372]">{errorLogs.length ? `${errorLogs.length} 个错误` : '正常'}</span>
        </div>
        {errorLogs.length > 0 ? (
          <div className="space-y-1">
            {errorLogs.map((log, i) => (
              <div key={`${log.timestamp}-error-${i}`} className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">
                <span className="text-red-400 mr-1">{new Date(log.timestamp).toLocaleTimeString()}</span>
                {log.message}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#8f8372] leading-relaxed">
            当前没有阻断错误。后续工具调用、渲染失败或 API 异常会在这里优先显露。
          </p>
        )}
      </div>

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
