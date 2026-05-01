import { useState, useEffect, useCallback } from 'react';
import {
  Image,
  Video,
  Megaphone,
  Music,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';

interface PhaseStatus {
  currentPhase: number;
  P1: { ready: boolean; approved: boolean; summary: string };
  P2: { ready: boolean; summary: string };
  P3: { ready: boolean; summary: string };
  P4: { ready: boolean; summary: string };
}

interface CrossModuleItem {
  target: string;
  label: string;
  needs: string;
  ready: boolean;
  outputDir: string;
}

interface HandoffResponse {
  success: boolean;
  phaseStatus: PhaseStatus;
  crossModuleReadiness: CrossModuleItem[];
}

interface HandoffPanelProps {
  projectId: string;
}

const MODULE_ICONS: Record<string, LucideIcon> = {
  ThumbnailMaster: Image,
  ShortsMaster: Video,
  MarketingMaster: Megaphone,
  MusicDirector: Music,
};

const PHASE_LABELS: Record<string, string> = {
  P1: 'P1 — 视觉概念',
  P2: 'P2 — 视觉执行',
  P3: 'P3 — 视频渲染',
  P4: 'P4 — 序列导出',
};

export function HandoffPanel({ projectId }: HandoffPanelProps) {
  const [data, setData] = useState<HandoffResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHandoff = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/director/handoff?projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: HandoffResponse = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError('获取交接状态失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchHandoff();
  }, [fetchHandoff]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#e4dbcc] p-4 bg-[rgba(255,252,247,0.78)] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#c97545] animate-spin mr-2" />
        <span className="text-sm text-[#8f8372]">加载交接状态...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 p-4 bg-red-50 text-center">
        <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
        <div className="text-sm text-red-600 mb-3">交接状态读取失败：{error}</div>
        <button
          onClick={fetchHandoff}
          className="inline-flex items-center gap-1.5 rounded border border-red-200 bg-white px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          重试读取
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#8f8372] rounded-lg border border-[#e4dbcc] bg-[rgba(255,252,247,0.78)]">
        <Circle className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-sm text-[#342d24] font-medium">暂无交接数据</span>
        <button
          onClick={fetchHandoff}
          className="mt-3 inline-flex items-center gap-1.5 rounded border border-[#e4dbcc] bg-[#fffcf7] px-2.5 py-1.5 text-xs text-[#342d24] hover:bg-[#f8f4ec]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          刷新
        </button>
      </div>
    );
  }

  const { phaseStatus, crossModuleReadiness } = data;
  const phases = ['P1', 'P2', 'P3', 'P4'] as const;
  const readyTargets = crossModuleReadiness.filter(item => item.ready);
  const currentPhaseKey = phases.find(phase => phase === `P${phaseStatus.currentPhase}`) || 'P1';
  const currentStatus = phaseStatus[currentPhaseKey];
  const nextAction = (() => {
    if (!phaseStatus.P1.ready) return '从 P1 生成视觉概念，建立后续模块共用的创意事实源。';
    if (!phaseStatus.P1.approved) return '审阅并批准 P1 视觉概念，再进入分镜执行。';
    if (!phaseStatus.P2.ready) return '继续 P2 生成分段视觉执行方案，并选择关键方案。';
    if (!phaseStatus.P3.ready) return '继续 P3 渲染或审阅视频预览，补齐可交付素材。';
    if (!phaseStatus.P4.ready) return '继续 P4 导出 XML/序列文件，准备下游交接。';
    return 'Director 交付链路已具备交接条件，可以进入下游模块或归档验收。';
  })();

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      <div className="rounded-lg border border-[#e4dbcc] p-3 bg-[rgba(255,252,247,0.78)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#342d24]">
              <ClipboardCheck className="w-3.5 h-3.5 text-[#c97545]" />
              当前可继续状态
            </div>
            <p className="text-xs text-[#8f8372] leading-relaxed mt-1">
              Phase {phaseStatus.currentPhase}：{currentStatus?.summary || '等待状态同步'}。
              下游就绪 {readyTargets.length}/{crossModuleReadiness.length}。
            </p>
          </div>
          <button
            onClick={fetchHandoff}
            className="inline-flex items-center gap-1 rounded border border-[#e4dbcc] bg-[#fffcf7] px-2 py-1 text-[11px] text-[#342d24] hover:bg-[#f8f4ec] shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </button>
        </div>
        <div className="mt-3 rounded border border-[#e4dbcc] bg-[#f8f4ec] px-2.5 py-2 text-xs text-[#342d24] leading-relaxed flex gap-2">
          <ArrowRight className="w-3.5 h-3.5 text-[#c97545] mt-0.5 shrink-0" />
          <span>{nextAction}</span>
        </div>
      </div>

      <div className="rounded-lg border border-[#e4dbcc] overflow-hidden">
        <div className="px-3 py-2 bg-[rgba(255,252,247,0.95)] border-b border-[#e4dbcc]">
          <span className="text-xs font-bold text-[#342d24]">阶段状态</span>
          <span className="text-[10px] text-[#8f8372] ml-2">
            当前 Phase {phaseStatus.currentPhase}
          </span>
        </div>
        <div className="p-2 space-y-1.5">
          {phases.map(phase => {
            const status = phaseStatus[phase];
            const isCurrent = phaseStatus.currentPhase === parseInt(phase.slice(1));
            return (
              <div
                key={phase}
                className={`flex items-center gap-2 px-2 py-1.5 rounded ${
                  isCurrent ? 'bg-[rgba(201,117,69,0.08)]' : 'bg-[rgba(255,252,247,0.78)]'
                }`}
              >
                {status.ready ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5b7c6f] flex-shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-[#e4dbcc] flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-[#342d24]">
                      {PHASE_LABELS[phase]}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] text-[#c97545] bg-[rgba(201,117,69,0.12)] px-1 rounded">
                        当前
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#8f8372]">{status.summary}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-[#e4dbcc] overflow-hidden">
        <div className="px-3 py-2 bg-[rgba(255,252,247,0.95)] border-b border-[#e4dbcc]">
          <span className="text-xs font-bold text-[#342d24]">跨模块交接</span>
          <span className="text-[10px] text-[#8f8372] ml-2">只读预览</span>
        </div>
        <div className="p-2 space-y-1.5">
          {crossModuleReadiness.map(item => {
            const Icon = MODULE_ICONS[item.target] || Circle;
            return (
              <div
                key={item.target}
                className="flex items-center gap-2 px-2 py-2 rounded bg-[rgba(255,252,247,0.78)]"
              >
                <Icon className="w-4 h-4 text-[#8f8372] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-[#342d24]">{item.label}</span>
                    {item.ready ? (
                      <span className="text-[9px] text-[#5b7c6f] bg-[rgba(91,124,111,0.12)] px-1 rounded">
                        就绪
                      </span>
                    ) : (
                      <span className="text-[9px] text-[#8f8372] bg-[#f0ebe2] px-1 rounded">
                        未就绪
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#8f8372]">需要：{item.needs}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
