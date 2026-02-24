import { useState } from 'react';
import { Play, Loader2, CheckCircle, XCircle, Sparkles, Video } from 'lucide-react';
import type { RenderJob, DirectorChapter } from '../../types';

interface RenderJobCardProps {
  job: RenderJob;
  chapterName: string;
  onRender: () => void;
}

const statusConfig = {
  pending: { icon: Play, color: 'text-slate-400', bg: 'bg-slate-700' },
  rendering: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
};

export const RenderJobCard = ({ job, chapterName, onRender }: RenderJobCardProps) => {
  const config = statusConfig[job.status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border border-slate-700 ${config.bg}`}>
      <div className={`${config.color} ${job.status === 'rendering' ? 'animate-spin' : ''}`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1">
        <div className="text-white font-medium">{chapterName}</div>
        {job.status === 'rendering' && (
          <div className="text-xs text-slate-400 mt-1">
            Frame {job.frame} / {job.totalFrames} ({job.progress}%)
          </div>
        )}
        {job.status === 'completed' && job.outputPath && (
          <div className="text-xs text-green-400 mt-1">{job.outputPath}</div>
        )}
        {job.status === 'failed' && job.error && (
          <div className="text-xs text-red-400 mt-1">{job.error}</div>
        )}
      </div>

      {job.status === 'rendering' && (
        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      )}

      {job.status === 'pending' && (
        <button
          onClick={onRender}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
        >
          Render
        </button>
      )}
    </div>
  );
};

interface BrollResult {
  sceneId: string;
  success: boolean;
  outputPath?: string;
  gifPath?: string;
  error?: string;
}

interface Phase3ViewProps {
  projectId: string;
  chapters: DirectorChapter[];
  jobs: RenderJob[];
  isBatchRendering: boolean;
  onRenderOne: (chapterId: string) => void;
  onRenderAll: () => void;
  onRemotionRenderComplete?: (results: BrollResult[]) => void;
}

export const Phase3View = ({
  projectId,
  chapters,
  jobs,
  isBatchRendering,
  onRenderOne,
  onRenderAll,
  onRemotionRenderComplete,
}: Phase3ViewProps) => {
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const allCompleted = jobs.length > 0 && completedCount === jobs.length;

  const [isRemotionRendering, setIsRemotionRendering] = useState(false);
  const [remotionResults, setRemotionResults] = useState<BrollResult[]>([]);
  const [remotionError, setRemotionError] = useState<string | null>(null);

  const getChapterName = (chapterId: string) => {
    return chapters.find(c => c.chapterId === chapterId)?.chapterName || chapterId;
  };

  const handleRemotionRender = async () => {
    setIsRemotionRendering(true);
    setRemotionError(null);
    setRemotionResults([]);

    try {
      const res = await fetch('/api/pipeline/render-brolls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Remotion render failed');
      }

      let attempts = 0;
      const maxAttempts = 60;

      const pollStatus = async (): Promise<void> => {
        const statusRes = await fetch(`/api/pipeline/render-status/${data.taskId}?projectId=${projectId}`);
        const statusData = await statusRes.json();

        if (statusData.status === 'completed') {
          setRemotionResults(statusData.results || []);
          onRemotionRenderComplete?.(statusData.results || []);
          setIsRemotionRendering(false);
          return;
        }

        if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Render failed');
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, 2000);
        } else {
          throw new Error('Render timeout');
        }
      };

      setTimeout(pollStatus, 1000);

    } catch (err) {
      setRemotionError(err instanceof Error ? err.message : 'Unknown error');
      setIsRemotionRendering(false);
    }
  };

  const remotionSuccessCount = remotionResults.filter(r => r.success).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Render Console</h3>
          <p className="text-sm text-slate-400">
            {completedCount} / {jobs.length} completed
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRenderAll}
            disabled={isBatchRendering || allCompleted}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded font-medium flex items-center gap-2"
          >
            {isBatchRendering ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Rendering...</>
            ) : (
              <><Play className="w-4 h-4" /> Render All</>
            )}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/50 p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <div>
              <h4 className="text-white font-semibold">Remotion B-Roll 引擎</h4>
              <p className="text-sm text-slate-400">
                调用 RemotionStudio 生成动态 B-roll 视频
              </p>
            </div>
          </div>
          <button
            onClick={handleRemotionRender}
            disabled={isRemotionRendering}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            {isRemotionRendering ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> 渲染中...</>
            ) : (
              <><Video className="w-5 h-5" /> 启动 Remotion 渲染组</>
            )}
          </button>
        </div>

        {remotionError && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">{remotionError}</span>
          </div>
        )}

        {remotionResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {remotionResults.map((result) => (
              <div 
                key={result.sceneId}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">{result.sceneId}</div>
                  {result.outputPath && (
                    <div className="text-xs text-green-400">{result.outputPath}</div>
                  )}
                  {result.error && (
                    <div className="text-xs text-red-400">{result.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {remotionResults.length > 0 && remotionSuccessCount === remotionResults.length && (
          <div className="mt-4 bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <div className="text-white font-medium">
                🎬 Remotion 渲染完成！{remotionSuccessCount} 个 B-roll 已就绪
              </div>
              <div className="text-sm text-slate-400">
                输出目录：<code className="text-green-400">06_Video_Broll/</code>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {jobs.map(job => (
          <RenderJobCard
            key={job.jobId}
            job={job}
            chapterName={getChapterName(job.chapterId)}
            onRender={() => onRenderOne(job.chapterId)}
          />
        ))}
      </div>

      {allCompleted && (
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-400" />
          <div>
            <div className="text-white font-medium">All renders completed!</div>
            <div className="text-sm text-slate-400">
              Videos saved to <code className="text-green-400">06_Video_Broll/</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
