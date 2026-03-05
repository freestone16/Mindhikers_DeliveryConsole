import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, Download, CheckCircle, RefreshCw } from 'lucide-react';
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

interface Phase3ViewProps {
  projectId: string;
  chapters: DirectorChapter[];
  onProceed: () => void;
}

export const Phase3View = ({ projectId, chapters, onProceed }: Phase3ViewProps) => {
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [alignResults, setAlignResults] = useState<AlignResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [xmlGenerated, setXmlGenerated] = useState(false);
  const [errorError, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith('.srt') || file.type === 'application/x-subrip')) {
      setSrtFile(file);
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
      setError(null);
    } else {
      setError('请上传有效的 .srt 格式字幕文件');
    }
  };

  const handleAlign = async () => {
    if (!srtFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // 1. 读取文件内容
      const srtContent = await srtFile.text();

      // 我们收集已选的 options，因为我们需要比较
      // 我们收集所有已确认方案的视觉条目，我们需要与 SRT 比较
      const selectedBrolls = chapters.flatMap(c =>
        c.options
          .filter(o => o.isChecked)
          .map(o => ({
            brollId: c.chapterId, // We might need optionId eventually if multiple per chapter, but keeping existing key logic
            brollName: o.name || c.chapterName,
            keySentence: o.quote || c.scriptText.split(/[。！？\n]/)[0],
          }))
      );

      if (selectedBrolls.length === 0) {
        throw new Error('没有检测到已确认并选择方案的视觉条目');
      }

      const res = await fetch('http://localhost:3002/api/director/phase3/align-srt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          srtContent,
          brolls: selectedBrolls
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '分析失败');

      setAlignResults(data.alignments || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '比照分析时发生错误');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateXML = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3002/api/director/phase3/generate-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          alignments: alignResults
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'XML生成失败');

      setXmlGenerated(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '生成 XML 时发生错误');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (format: 'premiere' | 'jianying') => {
    window.open(`http://localhost:3002/api/director/phase3/download-xml/${projectId}/${format}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
        <h3 className="text-lg font-bold text-white mb-2">Phase 3: 终态时轴比照与 XML 输出</h3>
        <p className="text-sm text-slate-400 mb-6">
          上传包含解说词的 SRT 字幕文件，AI将自动比照视觉方案剧本并生成可一键导入剪辑软件的 XML 文件。
        </p>

        {errorError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded mb-4 text-sm">
            {errorError}
          </div>
        )}

        {!alignResults.length ? (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-full max-w-2xl p-8 border-2 border-dashed border-slate-600 rounded-xl hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-4"
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
              <FileText className={`w-12 h-12 ${srtFile ? 'text-blue-400' : 'text-slate-500'}`} />
              <div className="text-center">
                <p className="text-white font-medium mb-1">
                  {srtFile ? srtFile.name : '点击或拖拽 SRT 文件到此处'}
                </p>
                <p className="text-xs text-slate-400">仅支持 .srt 格式</p>
              </div>
            </div>

            <button
              onClick={handleAlign}
              disabled={!srtFile || isAnalyzing}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg flex items-center gap-2 transition-colors mt-4"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> 分析中...</>
              ) : (
                <><Upload className="w-5 h-5" /> 开始比照</>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                比照完成 (共 {alignResults.length} 条)
              </h4>
              <button
                onClick={() => setAlignResults([])}
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
