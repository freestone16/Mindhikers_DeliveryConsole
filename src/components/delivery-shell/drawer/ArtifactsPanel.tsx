import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  FileCode,
  Image,
  Video,
  File,
  Lightbulb,
  Palette,
  Film,
  Download,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react';

interface ArtifactFile {
  name: string;
  format: string;
  size: number;
  mtime: string;
  path: string;
}

interface ArtifactPhase {
  phase: string;
  label: string;
  files: ArtifactFile[];
}

interface ArtifactsResponse {
  success: boolean;
  artifacts: ArtifactPhase[];
}

interface ArtifactsPanelProps {
  projectId: string;
}

const PHASE_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  P1: { label: 'P1 — 视觉概念', icon: Lightbulb, color: '#c97545' },
  P2: { label: 'P2 — 视觉执行', icon: Palette, color: '#7c6f5b' },
  P3: { label: 'P3 — 视频渲染', icon: Film, color: '#5b7c6f' },
  P4: { label: 'P4 — 序列导出', icon: Download, color: '#5b6f7c' },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function getFileIcon(format: string): { icon: LucideIcon; label: string } {
  const ext = format.startsWith('.') ? format.slice(1).toLowerCase() : format.toLowerCase();
  switch (ext) {
    case 'md':
      return { icon: FileText, label: 'Markdown' };
    case 'json':
      return { icon: FileCode, label: 'JSON' };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
      return { icon: Image, label: 'Image' };
    case 'mp4':
    case 'mov':
      return { icon: Video, label: 'Video' };
    case 'xml':
      return { icon: FileCode, label: 'XML' };
    case 'srt':
      return { icon: FileText, label: 'SRT' };
    default:
      return { icon: File, label: ext.toUpperCase() || 'File' };
  }
}

export function ArtifactsPanel({ projectId }: ArtifactsPanelProps) {
  const [phases, setPhases] = useState<ArtifactPhase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});

  const fetchArtifacts = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/director/artifacts?projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ArtifactsResponse = await res.json();
      if (data.success) {
        setPhases(data.artifacts);
      } else {
        setError('获取产出物失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  const togglePhase = (phase: string) => {
    setCollapsedPhases(prev => ({ ...prev, [phase]: !prev[phase] }));
  };

  const totalFiles = phases.reduce((sum, p) => sum + p.files.length, 0);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#e4dbcc] p-4 bg-[rgba(255,252,247,0.78)] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#c97545] animate-spin mr-2" />
        <span className="text-sm text-[#8f8372]">正在扫描 Director 产出物...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 p-4 bg-red-50 text-center">
        <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-2" />
        <div className="text-sm text-red-600 mb-3">产出物读取失败：{error}</div>
        <button
          onClick={fetchArtifacts}
          className="inline-flex items-center gap-1.5 rounded border border-red-200 bg-white px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          重试扫描
        </button>
      </div>
    );
  }

  if (phases.length === 0 || totalFiles === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#8f8372] rounded-lg border border-[#e4dbcc] bg-[rgba(255,252,247,0.78)]">
        <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-sm text-[#342d24] font-medium">暂无产出物</span>
        <span className="text-xs mt-1">生成视觉概念、分镜、渲染或导出后会出现在这里。</span>
        <button
          onClick={fetchArtifacts}
          className="mt-3 inline-flex items-center gap-1.5 rounded border border-[#e4dbcc] bg-[#fffcf7] px-2.5 py-1.5 text-xs text-[#342d24] hover:bg-[#f8f4ec]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          刷新
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto">
      <div className="rounded-lg border border-[#e4dbcc] p-3 bg-[rgba(255,252,247,0.78)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold text-[#342d24]">产出物清单</div>
          <div className="text-[10px] text-[#8f8372] mt-0.5">
            {totalFiles} 个文件，来自 {phases.filter(phase => phase.files.length > 0).length} 个阶段
          </div>
        </div>
        <button
          onClick={fetchArtifacts}
          className="inline-flex items-center gap-1.5 rounded border border-[#e4dbcc] bg-[#fffcf7] px-2.5 py-1.5 text-xs text-[#342d24] hover:bg-[#f8f4ec] shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          刷新
        </button>
      </div>

      {phases.map(phase => {
        const meta = PHASE_META[phase.phase] || {
          label: phase.label || phase.phase,
          icon: FolderOpen,
          color: '#8f8372',
        };
        const isCollapsed = collapsedPhases[phase.phase] ?? false;
        const PhaseIcon = meta.icon;

        return (
          <div key={phase.phase} className="rounded-lg border border-[#e4dbcc] overflow-hidden">
            <button
              onClick={() => togglePhase(phase.phase)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-[rgba(255,252,247,0.78)] hover:bg-[rgba(255,252,247,0.95)] transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <PhaseIcon className="w-4 h-4" style={{ color: meta.color }} />
                <span className="text-xs font-bold text-[#342d24]">{meta.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8f8372] bg-[#f0ebe2] px-1.5 py-0.5 rounded">
                  {phase.files.length} 文件
                </span>
                {isCollapsed
                  ? <ChevronDown className="w-3.5 h-3.5 text-[#8f8372]" />
                  : <ChevronUp className="w-3.5 h-3.5 text-[#8f8372]" />
                }
              </div>
            </button>

            {!isCollapsed && (
              <div className="border-t border-[#e4dbcc] p-2 space-y-1.5">
                {phase.files.map(file => {
                  const { icon: FileIcon, label: typeLabel } = getFileIcon(file.format);
                  return (
                    <div
                      key={file.path}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded bg-[rgba(255,252,247,0.78)] hover:bg-[rgba(255,252,247,0.95)] transition-colors"
                    >
                      <FileIcon className="w-3.5 h-3.5 text-[#8f8372] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#342d24] truncate font-medium">{file.name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-[#8f8372]">
                          <span>{typeLabel}</span>
                          <span className="opacity-50">·</span>
                          <span>{formatSize(file.size)}</span>
                          <span className="opacity-50">·</span>
                          <span>{formatRelativeTime(file.mtime)}</span>
                        </div>
                        <div className="text-[10px] text-[#8f8372] truncate font-mono mt-0.5">{file.path}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled
                          title="当前 API 尚未提供打开文件端点"
                          className="grid place-items-center w-7 h-7 rounded border border-[#e4dbcc] text-[#b8aa96] bg-[#f8f4ec] cursor-not-allowed"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled
                          title="当前 API 尚未提供下载文件端点"
                          className="grid place-items-center w-7 h-7 rounded border border-[#e4dbcc] text-[#b8aa96] bg-[#f8f4ec] cursor-not-allowed"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
