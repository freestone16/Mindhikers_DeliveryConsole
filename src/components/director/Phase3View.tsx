import { useState, useEffect } from 'react';
import { Play, Loader2, CheckCircle, XCircle, Sparkles, FolderOpen, Trash2, FileVideo, RotateCcw, Download } from 'lucide-react';
import type { DirectorChapter, RenderJob_V2, ExternalAsset } from '../../types';

// ============================================================
// 渲染任务卡片
// ============================================================

interface RenderJobCardProps {
  job: RenderJob_V2;
  chapterName: string;
  onRerender: () => void;
  onApprove: () => void;
}

const statusConfig = {
  waiting: { icon: Play, color: 'text-slate-400', bg: 'bg-slate-700', label: '等待渲染' },
  rendering: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/20', label: '渲染中' },
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: '已完成' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: '失败' },
};

export const RenderJobCard = ({ job, chapterName, onRerender, onApprove }: RenderJobCardProps) => {
  const config = statusConfig[job.status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border border-slate-700 ${config.bg}`}>
      <div className={`${config.color} ${job.status === 'rendering' ? 'animate-spin' : ''}`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1">
        <div className="text-white font-medium">{chapterName}</div>
        <div className="text-xs text-slate-400 mt-1">{config.label}</div>

        {job.status === 'rendering' && (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Frame {job.frame} / {job.totalFrames}</span>
              <span>•</span>
              <span>{job.progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>
        )}

        {job.status === 'completed' && job.outputPath && (
          <div className="mt-2 flex items-center gap-2">
            <FileVideo className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400 font-mono">{job.outputPath}</span>
          </div>
        )}

        {job.status === 'failed' && job.error && (
          <div className="mt-2 text-xs text-red-400">{job.error}</div>
        )}

        {job.retryCount && job.retryCount > 0 && (
          <div className="mt-2 text-xs text-orange-400">
            重试次数: {job.retryCount}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {job.status === 'completed' && (
          <button
            onClick={onApprove}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm flex items-center gap-1 transition-colors"
          >
            <CheckCircle className="w-3 h-3" />
            落盘
          </button>
        )}

        {(job.status === 'completed' || job.status === 'failed') && (
          <button
            onClick={onRerender}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            重新渲染
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================
// 外部素材加载卡片
// ============================================================

interface AssetLoaderCardProps {
  chapterId: string;
  chapterName: string;
  type: 'artlist' | 'internet-clip' | 'user-capture';
  asset?: ExternalAsset;
  onLoad: (sourcePath: string) => void;
  onRemove: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  artlist: 'Artlist 实拍',
  'internet-clip': '互联网素材',
  'user-capture': '用户截图/录屏',
};

const TYPE_COLORS: Record<string, string> = {
  artlist: 'bg-green-500/20 text-green-300 border-green-500/30',
  'internet-clip': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'user-capture': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};

export const AssetLoaderCard = ({ chapterName, type, asset, onLoad, onRemove }: AssetLoaderCardProps) => {
  const handleLoadAsset = () => {
    // 触发文件选择对话框
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*,.mp4,.mov,.avi,.mkv,.webm';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // 将文件传递给后端上传
        // 注意：这里需要实现文件上传逻辑
        console.log('Selected file:', file.name);
        onLoad('');
      }
    };

    input.click();
  };

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border ${TYPE_COLORS[type]} border`}>
      <div className="text-2xl">
        {type === 'artlist' ? '🎬' : type === 'internet-clip' ? '🌐' : '📸'}
      </div>

      <div className="flex-1">
        <div className="text-white font-medium">{chapterName}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${TYPE_COLORS[type]}`}>
            {TYPE_LABELS[type]}
          </span>
          {asset ? (
            <span className="text-xs text-green-400">已加载</span>
          ) : (
            <span className="text-xs text-slate-400">待加载</span>
          )}
        </div>

        {asset && (
          <div className="mt-2 flex items-center gap-2">
            <FileVideo className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400 font-mono">{asset.targetPath}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {asset ? (
          <>
            <button
              onClick={() => {/* 打开视频预览 */}}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm flex items-center gap-1 transition-colors"
            >
              <Play className="w-3 h-3" />
              预览
            </button>
            <button
              onClick={onRemove}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              移除
            </button>
          </>
        ) : (
          <button
            onClick={handleLoadAsset}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm flex items-center gap-1 transition-colors"
          >
            <FolderOpen className="w-3 h-3" />
            加载素材
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Phase 3 主视图
// ============================================================

interface Phase3ViewProps {
  projectId: string;
  chapters: DirectorChapter[];
  onProceed: () => void;
}

export const Phase3View = ({ projectId, chapters, onProceed }: Phase3ViewProps) => {
  const [renderJobs, setRenderJobs] = useState<RenderJob_V2[]>([]);
  const [externalAssets, setExternalAssets] = useState<ExternalAsset[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [xmlGenerated, setXmlGenerated] = useState(false);
  const [xmlPath, setXmlPath] = useState<string | null>(null);

  // 加载 Phase 3 状态
  useEffect(() => {
    const loadPhase3State = async () => {
      try {
        // 加载渲染任务
        const jobsRes = await fetch(`http://localhost:3002/api/director/phase3/render-status?projectId=${projectId}`);
        const jobsData = await jobsRes.json();
        setRenderJobs(jobsData.renderJobs || []);

        // 加载外部素材
        const assetsRes = await fetch(`http://localhost:3002/api/director/phase3/assets?projectId=${projectId}`);
        const assetsData = await assetsRes.json();
        setExternalAssets(assetsData.assets || []);
      } catch (error) {
        console.error('Failed to load Phase 3 state:', error);
      }
    };

    loadPhase3State();
  }, [projectId]);

  const handleStartRender = async () => {
    setIsRendering(true);

    try {
      const res = await fetch('http://localhost:3002/api/director/phase3/start-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await res.json();
      setRenderJobs(data.renderJobs || []);

      // 轮询渲染状态
      if (data.renderJobs && data.renderJobs.length > 0) {
        pollRenderStatus();
      }
    } catch (error) {
      console.error('Failed to start render:', error);
    } finally {
      setIsRendering(false);
    }
  };

  const pollRenderStatus = async () => {
    const completedCount = renderJobs.filter(job => job.status === 'completed').length;

    if (completedCount === renderJobs.length) {
      setIsRendering(false);
      return;
    }

    try {
      // 更新所有渲染任务的状态
      for (const job of renderJobs) {
        if (job.status !== 'completed' && job.status !== 'failed') {
          const res = await fetch(`http://localhost:3002/api/director/phase3/render-status/${job.jobId}?projectId=${projectId}`);
          const data = await res.json();

          setRenderJobs(prev => prev.map(j =>
            j.jobId === job.jobId ? { ...j, ...data } : j
          ));
        }
      }

      setTimeout(pollRenderStatus, 2000);
    } catch (error) {
      console.error('Failed to poll render status:', error);
    }
  };

  const handleRerender = async (job: RenderJob_V2) => {
    try {
      const res = await fetch('http://localhost:3002/api/director/phase3/rerender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          chapterId: job.chapterId,
          optionId: job.optionId,
        }),
      });

      if (res.ok) {
        setRenderJobs(prev => prev.map(j =>
          j.jobId === job.jobId
            ? { ...j, status: 'waiting', progress: 0, outputPath: undefined }
            : j
        ));

        // 重新轮询
        setTimeout(pollRenderStatus, 2000);
      }
    } catch (error) {
      console.error('Failed to rerender:', error);
    }
  };

  const handleApproveRender = async (job: RenderJob_V2) => {
    try {
      const res = await fetch('http://localhost:3002/api/director/phase3/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, chapterId: job.chapterId }),
      });

      if (res.ok) {
        // 视频已落盘，更新状态
        setRenderJobs(prev => prev.map(j =>
          j.jobId === job.jobId ? { ...j } : j
        ));
      }
    } catch (error) {
      console.error('Failed to approve render:', error);
    }
  };

  const handleLoadAsset = async (chapterId: string, sourcePath: string) => {
    // TODO: 确定素材类型
    const type = 'artlist' as const;

    try {
      const res = await fetch('http://localhost:3002/api/director/phase3/load-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          chapterId,
          type,
          sourcePath,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExternalAssets(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Failed to load asset:', error);
    }
  };

  const handleRemoveAsset = async (assetId: string) => {
    try {
      const res = await fetch('http://localhost:3002/api/director/phase3/remove-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, assetId }),
      });

      if (res.ok) {
        setExternalAssets(prev => prev.filter(a => a.assetId !== assetId));
      }
    } catch (error) {
      console.error('Failed to remove asset:', error);
    }
  };

  const handleGenerateXML = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/director/phase3/generate-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await res.json();

      if (data.success) {
        setXmlGenerated(true);
        setXmlPath(data.xmlPath);
      }
    } catch (error) {
      console.error('Failed to generate XML:', error);
    }
  };

  // 计算进度
  const completedRenders = renderJobs.filter(j => j.status === 'completed').length;
  const loadedAssets = externalAssets.length;
  const totalItems = renderJobs.length + chapters.length; // 假设每个章节可能需要外部素材
  const completedItems = completedRenders + loadedAssets;
  const allReady = completedItems === totalItems && totalItems > 0;

  const getChapterName = (chapterId: string) => {
    return chapters.find(c => c.chapterId === chapterId)?.chapterName || chapterId;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 头部：进度提示 */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">渲染及二审</h3>
          <p className="text-sm text-slate-400 mt-1">
            已完成: <span className="text-blue-400 font-medium">{completedItems}</span> / {totalItems}
            {totalItems > 0 && (
              <span className="ml-2 text-slate-500">
                ({renderJobs.length > 0 && `渲染: ${completedRenders}/${renderJobs.length}`}
                {loadedAssets > 0 && ` • 素材: ${loadedAssets}`})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleStartRender}
          disabled={isRendering || renderJobs.length === 0}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded font-medium flex items-center gap-2 transition-colors"
        >
          {isRendering ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> 渲染中...</>
          ) : (
            <><Play className="w-4 h-4" /> 开始渲染</>
          )}
        </button>
      </div>

      {/* 渲染进度区 */}
      {renderJobs.length > 0 && (
        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
          <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h4 className="text-white font-semibold">Remotion & 文生视频渲染组</h4>
          </div>
          <div className="p-4 space-y-3">
            {renderJobs.map(job => (
              <RenderJobCard
                key={job.jobId}
                job={job}
                chapterName={getChapterName(job.chapterId)}
                onRerender={() => handleRerender(job)}
                onApprove={() => handleApproveRender(job)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 外部素材区 */}
      {chapters.length > 0 && (
        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
          <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-400" />
            <h4 className="text-white font-semibold">外部素材加载</h4>
          </div>
          <div className="p-4 space-y-3">
            {chapters.map(chapter => (
              <AssetLoaderCard
                key={`asset-${chapter.chapterId}`}
                chapterId={chapter.chapterId}
                chapterName={chapter.chapterName}
                type="artlist"
                asset={externalAssets.find(a => a.chapterId === chapter.chapterId)}
                onLoad={(sourcePath) => handleLoadAsset(chapter.chapterId, sourcePath)}
                onRemove={() => {
                  const asset = externalAssets.find(a => a.chapterId === chapter.chapterId);
                  if (asset) handleRemoveAsset(asset.assetId);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 底部全局按钮：生成 XML */}
      {allReady && !xmlGenerated && (
        <div className="flex justify-end bg-slate-900 rounded-lg border border-slate-700 p-6">
          <button
            onClick={handleGenerateXML}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-5 h-5" />
            生成 XML
          </button>
        </div>
      )}

      {/* XML 生成成功提示 */}
      {xmlGenerated && xmlPath && (
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-400 mt-1" />
            <div className="flex-1">
              <div className="text-white font-semibold mb-2">XML 生成成功！</div>
              <div className="space-y-2">
                <div className="text-sm text-slate-300">
                  文件路径: <code className="text-green-400 font-mono">{xmlPath}</code>
                </div>
                <div className="text-sm text-slate-400">
                  可以将此 XML 文件导入到 Premiere Pro 或 Final Cut Pro 中进行进一步编辑。
                </div>
              </div>
            </div>
            <button
              onClick={onProceed}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              完成并退出
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
