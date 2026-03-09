import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Loader2, Download, CheckCircle, RefreshCw, Sparkles, FolderOpen } from 'lucide-react';
import type { DirectorChapter } from '../../types';

interface AlignResult {
  brollId: string;
  brollName: string;
  keySentence: string;
  matchedText: string;
  startTime: string;
  endTime: string;
  duration?: string;
}

interface FoundSrtFile {
  name: string;
  path: string;
  size: number;
  mtime: string;
}

interface Phase4ViewProps {
  projectId: string;
  chapters: DirectorChapter[];
}

export const Phase4View = ({ projectId, chapters }: Phase4ViewProps) => {
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [srtContent, setSrtContent] = useState<string>('');
  const [foundSrtFiles, setFoundSrtFiles] = useState<FoundSrtFile[]>([]);
  const [isScanningDir, setIsScanningDir] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [alignResults, setAlignResults] = useState<AlignResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [xmlGenerated, setXmlGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scan for SRT files on mount
  useEffect(() => {
    scanForSrtFiles();
  }, [projectId]);

  const scanForSrtFiles = async () => {
    setIsScanningDir(true);
    try {
      const res = await fetch(`/api/director/phase4/scan-srt?projectId=${encodeURIComponent(projectId)}`);
      const data = await res.json();
      if (data.success) {
        setFoundSrtFiles(data.srtFiles || []);
      }
    } catch (err) {
      console.error('SRT scan failed:', err);
    } finally {
      setIsScanningDir(false);
    }
  };

  const loadFoundSrt = async (file: FoundSrtFile) => {
    try {
      const res = await fetch(`/api/director/phase4/read-srt/${encodeURIComponent(file.name)}?projectId=${encodeURIComponent(projectId)}`);
      const data = await res.json();
      if (data.success) {
        setSrtContent(data.content);
        setSrtFile(null); // clear manual upload
        setError(null);
        // synthetic file-like name for display
        (window as any).__loadedSrtName = file.name;
      }
    } catch (err: any) {
      setError(`加载 SRT 文件失败: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.srt')) {
      setSrtFile(file);
      setSrtContent('');
      setError(null);
    } else {
      setError('请上传有效的 .srt 格式字幕文件');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.srt')) {
      setSrtFile(file);
      setSrtContent('');
      setError(null);
    } else {
      setError('请上传有效的 .srt 格式字幕文件');
    }
  };

  const hasSrt = !!(srtFile || srtContent);
  const currentSrtName = srtFile?.name || (window as any).__loadedSrtName || '已加载 SRT';

  const handleAlign = async () => {
    if (!hasSrt) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const content = srtContent || (srtFile ? await srtFile.text() : '');
      const selectedBrolls = chapters.flatMap(c =>
        c.options
          .filter(o => o.isChecked)
          .map(o => ({
            brollId: c.chapterId,
            brollName: o.name || c.chapterName,
            keySentence: o.quote || c.scriptText.split(/[。！？\n]/)[0],
          }))
      );

      if (selectedBrolls.length === 0) {
        throw new Error('没有检测到已确认并选择方案的视觉条目');
      }

      const res = await fetch('/api/director/phase4/align-srt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, srtContent: content, brolls: selectedBrolls })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '分析失败');
      setAlignResults(data.alignments || []);
    } catch (err: any) {
      setError(err.message || '比照分析时发生错误');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateXML = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/director/phase4/generate-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, alignments: alignResults })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'XML生成失败');
      setXmlGenerated(true);
    } catch (err: any) {
      setError(err.message || '生成 XML 时发生错误');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (format: 'premiere' | 'jianying') => {
    window.open(`/api/director/phase4/download-xml/${projectId}/${format}`, '_blank');
  };

  const handleSkipSrt = async () => {
    // Generate XML without SRT alignment
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/director/phase4/generate-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, alignments: [] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'XML生成失败');
      setXmlGenerated(true);
    } catch (err: any) {
      setError(err.message || '生成 XML 时发生错误');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-white">Phase 4: 时轴比照与 XML 导出</h3>
          {!xmlGenerated && !alignResults.length && (
            <button
              onClick={handleSkipSrt}
              disabled={isGenerating}
              className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 disabled:opacity-50"
            >
              跳过 SRT，直接生成 XML
            </button>
          )}
        </div>
        <p className="text-sm text-slate-400 mb-6">
          上传包含解说词的 SRT 字幕文件，AI 将自动比照视觉方案并生成可导入剪辑软件的 XML 文件。
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {!alignResults.length ? (
          <div className="flex flex-col gap-6">
            {/* Auto-found SRT files */}
            {isScanningDir ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在扫描项目目录寻找 SRT 文件...
              </div>
            ) : foundSrtFiles.length > 0 ? (
              <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">找到 {foundSrtFiles.length} 个 SRT 文件</span>
                </div>
                <div className="flex flex-col gap-2">
                  {foundSrtFiles.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => loadFoundSrt(f)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-left ${
                        srtContent && (window as any).__loadedSrtName === f.name
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span className="text-sm text-white">{f.name}</span>
                        <span className="text-xs text-slate-500">({(f.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      {srtContent && (window as any).__loadedSrtName === f.name && (
                        <CheckCircle className="w-4 h-4 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Manual upload */}
            <div>
              {foundSrtFiles.length > 0 && (
                <p className="text-xs text-slate-500 mb-2">或者手动上传其他 SRT 文件：</p>
              )}
              <div
                className="w-full p-8 border-2 border-dashed border-slate-600 rounded-xl hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-4"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".srt"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <FileText className={`w-12 h-12 ${hasSrt ? 'text-blue-400' : 'text-slate-500'}`} />
                <div className="text-center">
                  <p className="text-white font-medium mb-1">
                    {hasSrt ? currentSrtName : '点击或拖拽 SRT 文件到此处'}
                  </p>
                  <p className="text-xs text-slate-400">仅支持 .srt 格式</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleAlign}
                disabled={!hasSrt || isAnalyzing}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> 分析中...</>
                ) : (
                  <><Upload className="w-5 h-5" /> 开始比照</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                比照完成（共 {alignResults.length} 条）
              </h4>
              <button
                onClick={() => { setAlignResults([]); setXmlGenerated(false); }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> 重新上传
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-700 rounded-lg">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">B-Roll 条目</th>
                    <th className="px-4 py-3 w-1/4">Key Sentence</th>
                    <th className="px-4 py-3 w-1/4">匹配 SRT 文本</th>
                    <th className="px-4 py-3">时间码</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {alignResults.map((res, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-white font-medium">{res.brollName}</td>
                      <td className="px-4 py-3 text-xs">{res.keySentence}</td>
                      <td className="px-4 py-3 text-xs text-blue-300">{res.matchedText}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-slate-800 px-2 py-1 rounded text-xs font-mono">{res.startTime} - {res.endTime}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              {!xmlGenerated ? (
                <button
                  onClick={handleGenerateXML}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg flex items-center gap-2"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  生成 XML
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleDownload('premiere')}
                    className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-5 h-5" /> 下载 Premiere XML
                  </button>
                  <button
                    onClick={() => handleDownload('jianying')}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-5 h-5" /> 下载剪映 XML
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
