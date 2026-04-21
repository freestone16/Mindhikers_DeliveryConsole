import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

export type DebugLogPhase = 'P1' | 'P2' | 'P3' | 'P4' | 'SYSTEM';
export type DebugLogLevel = 'info' | 'success' | 'warning' | 'error';

export interface DebugLogEntry {
  timestamp: number;
  phase: DebugLogPhase;
  level: DebugLogLevel;
  message: string;
}

export interface DebugMetric {
  label: string;
  value: string;
  tone?: DebugLogLevel | 'default';
}

interface DebugPanelProps {
  phase: Exclude<DebugLogPhase, 'SYSTEM'>;
  phaseLabel: string;
  projectId: string;
  scriptPath: string;
  currentModel?: { provider: string; model: string };
  imageModel?: string | null;
  videoModel?: string | null;
  metrics?: DebugMetric[];
  logs?: DebugLogEntry[];
}

const PROVIDER_LABELS: Record<string, string> = {
  siliconflow: 'SiliconFlow',
  deepseek: 'DeepSeek',
  yinli: 'Yinli',
  kimi: 'Kimi',
  openai: 'OpenAI',
  zhipu: 'Zhipu',
  volcengine: 'Volcengine',
  google: 'Google',
};

const toneClassMap: Record<NonNullable<DebugMetric['tone']> | 'default', string> = {
  default: 'border-slate-700 bg-slate-950/60 text-slate-200',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  error: 'border-red-500/30 bg-red-500/10 text-red-200',
};

const logColorMap: Record<DebugLogLevel, string> = {
  info: 'text-blue-300',
  success: 'text-emerald-300',
  warning: 'text-amber-300',
  error: 'text-red-300',
};

const formatScriptName = (scriptPath: string) => {
  if (!scriptPath) return '未选择';
  const parts = scriptPath.split('/');
  return parts[parts.length - 1] || scriptPath;
};

export const DebugPanel = ({
  phase,
  phaseLabel,
  projectId,
  scriptPath,
  currentModel,
  imageModel,
  videoModel,
  metrics = [],
  logs = [],
}: DebugPanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const visibleLogs = useMemo(() => {
    return logs
      .filter((log) => log.phase === phase || log.phase === 'SYSTEM')
      .slice(-24)
      .reverse();
  }, [logs, phase]);

  const summaryMetrics: DebugMetric[] = [
    { label: '项目', value: projectId || '未选择' },
    { label: '文稿', value: formatScriptName(scriptPath) },
    { label: '阶段', value: `${phase} · ${phaseLabel}`, tone: 'info' },
    {
      label: '文本模型',
      value: currentModel
        ? `${PROVIDER_LABELS[currentModel.provider] || currentModel.provider} / ${currentModel.model}`
        : '未加载',
    },
    { label: '文生图模型', value: imageModel || '未配置' },
    { label: '文生视频模型', value: videoModel || '未配置' },
    ...metrics,
  ];

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          <div>
            <h3 className="text-sm text-slate-300 uppercase font-bold">调试面板</h3>
            <p className="text-xs text-slate-500 mt-0.5">开发态观察当前阶段进展、模型和最近日志</p>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 self-start"
        >
          <span>{isCollapsed ? '展开' : '收起'}日志 ({visibleLogs.length})</span>
          {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
        {summaryMetrics.map((metric) => (
          <div
            key={`${metric.label}-${metric.value}`}
            className={`rounded-lg border px-3 py-2 ${toneClassMap[metric.tone || 'default']}`}
          >
            <div className="text-[11px] uppercase tracking-wide text-slate-500">{metric.label}</div>
            <div className="text-sm font-medium mt-1 break-all">{metric.value}</div>
          </div>
        ))}
      </div>

      {!isCollapsed && (
        <div className="mt-4 bg-slate-950 rounded-lg border border-slate-800 p-3 max-h-64 overflow-y-auto space-y-2">
          {visibleLogs.length > 0 ? (
            visibleLogs.map((log, index) => (
              <div key={`${log.timestamp}-${index}`} className={`text-xs font-mono ${logColorMap[log.level]}`}>
                <span className="text-slate-500 mr-2">
                  [{new Date(log.timestamp).toLocaleTimeString()}][{log.phase}]
                </span>
                {log.message}
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-500 font-mono">当前阶段暂无调试日志。</div>
          )}
        </div>
      )}
    </div>
  );
};
