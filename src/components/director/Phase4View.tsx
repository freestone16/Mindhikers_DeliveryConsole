import { useState } from 'react';
import { 
  Rocket, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  FileVideo, 
  FileText, 
  Film,
  FolderOpen,
  Sparkles
} from 'lucide-react';

interface BrollItem {
  sceneId: string;
  outputPath: string;
}

interface Phase4ViewProps {
  projectId: string;
  brollPaths: BrollItem[];
}

export const Phase4View = ({ projectId, brollPaths }: Phase4ViewProps) => {
  const [arollPath, setArollPath] = useState('');
  const [srtPath, setSrtPath] = useState('');
  const [fps, setFps] = useState(30);
  
  const [isWeaving, setIsWeaving] = useState(false);
  const [weaveResult, setWeaveResult] = useState<{
    success: boolean;
    outputPath?: string;
    message?: string;
    stats?: {
      totalClips: number;
      arollClips: number;
      brollClips: number;
    };
  } | null>(null);
  const [weaveError, setWeaveError] = useState<string | null>(null);

  const handleWeaveTimeline = async () => {
    if (!arollPath || !srtPath) {
      setWeaveError('请填写 A-roll 和 SRT 路径');
      return;
    }

    setIsWeaving(true);
    setWeaveError(null);
    setWeaveResult(null);

    try {
      const res = await fetch('/api/pipeline/weave-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          arollPath,
          srtPath,
          brollPaths: brollPaths.map(b => b.outputPath),
          fps
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Timeline weave failed');
      }

      setWeaveResult(data);

    } catch (err) {
      setWeaveError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsWeaving(false);
    }
  };

  const canWeave = arollPath && srtPath && brollPaths.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-bold text-white">Timeline Assembly</h3>
        </div>
        <p className="text-sm text-slate-400">
          将 A-roll、B-roll 和字幕组装成 FCP XML 剪辑工程
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileVideo className="w-5 h-5 text-blue-400" />
            <h4 className="font-semibold text-white">A-Roll (主视频)</h4>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={arollPath}
              onChange={(e) => setArollPath(e.target.value)}
              placeholder="01_Aroll/main.mp4 或绝对路径"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <button 
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
              title="浏览文件"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-yellow-400" />
            <h4 className="font-semibold text-white">SRT 字幕文件</h4>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={srtPath}
              onChange={(e) => setSrtPath(e.target.value)}
              placeholder="08_SRT/main.srt 或绝对路径"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <button 
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
              title="浏览文件"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-green-400" />
            <h4 className="font-semibold text-white">B-Roll 素材清单</h4>
          </div>
          <span className="text-sm text-slate-400">
            {brollPaths.length} 个片段已就绪
          </span>
        </div>

        {brollPaths.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>暂无 B-roll 素材</p>
            <p className="text-xs">请先在 Phase 3 完成渲染</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {brollPaths.map((item, idx) => (
              <div 
                key={item.sceneId}
                className="flex items-center gap-3 p-2 bg-slate-900 rounded border border-slate-700"
              >
                <span className="text-xs text-slate-500 w-6">{idx + 1}</span>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white flex-1">{item.sceneId}</span>
                <span className="text-xs text-slate-400 truncate max-w-[200px]">
                  {item.outputPath.split('/').pop()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm text-slate-400">
            FPS:
            <select 
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="ml-2 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-sm"
            >
              <option value={24}>24</option>
              <option value={25}>25</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </label>
        </div>

        <button
          onClick={handleWeaveTimeline}
          disabled={isWeaving || !canWeave}
          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center gap-2 transition-all"
        >
          {isWeaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              编织中...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Weave Timeline → FCP XML
            </>
          )}
        </button>
      </div>

      {weaveError && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-400" />
          <div>
            <div className="text-red-300 font-medium">编织失败</div>
            <div className="text-sm text-red-400">{weaveError}</div>
          </div>
        </div>
      )}

      {weaveResult && weaveResult.success && (
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 rounded-xl p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-500/30 rounded-full flex items-center justify-center">
              <Rocket className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            🛸 XML 已降落！
          </h3>
          <p className="text-green-300 mb-4">
            请立即用您的 Premiere Pro 打开
          </p>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
            <code className="text-green-400 text-sm">
              {weaveResult.outputPath}
            </code>
          </div>
          {weaveResult.stats && (
            <div className="flex justify-center gap-6 text-sm text-slate-400">
              <span>总片段: {weaveResult.stats.totalClips}</span>
              <span>A-roll: {weaveResult.stats.arollClips}</span>
              <span>B-roll: {weaveResult.stats.brollClips}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
