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
  P1: 'Phase 1 — 视觉概念',
  P2: 'Phase 2 — 视觉执行',
  P3: 'Phase 3 — 视频渲染',
  P4: 'Phase 4 — 序列导出',
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-[#c97545] animate-spin mr-2" />
        <span className="text-sm text-[#8f8372]">加载交接状态...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[#e4dbcc] p-4 bg-[rgba(255,252,247,0.78)] text-center">
        <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
        <span className="text-sm text-red-500">{error}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#8f8372]">
        <Circle className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-sm">暂无交接数据</span>
      </div>
    );
  }

  const { phaseStatus, crossModuleReadiness } = data;
  const phases = ['P1', 'P2', 'P3', 'P4'] as const;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
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
