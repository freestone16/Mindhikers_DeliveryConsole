import { useState, useEffect, useRef } from 'react';
import {
  Upload, FileText, Loader2, Download, CheckCircle, RefreshCw, Sparkles,
  FolderOpen, ArrowRight, Package, AlertTriangle, Check
} from 'lucide-react';
import {
  PhasePanel, PhasePanelHeader, PhasePanelBody
} from './phase-layouts/PhasePanel';
import type { DirectorChapter } from '../../types';

interface AlignResult {
  brollId: string;
  brollName: string;
  keySentence: string;
  matchedText: string;
  startTime: string;
  endTime: string;
  duration?: string;
  hasVideo?: boolean;
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
        setSrtFile(null);
        setError(null);
        (window as unknown as Record<string, unknown>).__loadedSrtName = file.name;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`加载 SRT 文件失败: ${message}`);
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
  const currentSrtName = srtFile?.name || (window as unknown as Record<string, unknown>).__loadedSrtName as string || '已加载 SRT';

  const selectedBrolls = chapters.flatMap(c =>
    c.options
      .filter(o => o.isChecked)
      .map(o => ({
        brollId: c.chapterId,
        brollName: o.name || c.chapterName,
        keySentence: o.quote || c.scriptText.split(/[。！？\n]/)[0],
      }))
  );

  const missingVideoCount = alignResults.filter(r => r.hasVideo === false).length;
  const hasVideoCount = alignResults.filter(r => r.hasVideo !== false).length;

  const handleAlign = async () => {
    if (!hasSrt) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const content = srtContent || (srtFile ? await srtFile.text() : '');

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || '比照分析时发生错误');
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || '生成 XML 时发生错误');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (format: 'premiere' | 'jianying') => {
    window.open(`/api/director/phase4/download-xml/${projectId}/${format}`, '_blank');
  };

  const handleSkipSrt = async () => {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || '生成 XML 时发生错误');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setAlignResults([]);
    setXmlGenerated(false);
    setSrtFile(null);
    setSrtContent('');
    setError(null);
  };

  const stepIndex = !hasSrt && alignResults.length === 0 ? 0
    : hasSrt && alignResults.length === 0 ? 1
    : alignResults.length > 0 && !xmlGenerated ? 2
    : xmlGenerated ? 3
    : 0;

  const STEPS = [
    { label: '找到 SRT', icon: FolderOpen },
    { label: '对齐时轴', icon: ArrowRight },
    { label: '生成 XML', icon: Sparkles },
    { label: '下载交付', icon: Package },
  ];

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Delivery Sequence Stepper */}
      <div className="flex items-center justify-between px-5 py-3 rounded-xl border border-[#e4dbcc]" style={{ background: 'rgba(255, 252, 247, 0.78)' }}>
        <div className="flex items-center gap-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === stepIndex;
            const isDone = i < stepIndex;
            return (
              <>
                <div key={step.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-[#c97545]/10 text-[#c97545]' : isDone ? 'text-[#62835c]' : 'text-[#8f8372]'
                }`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{step.label}</span>
                  {isDone && <Check className="w-3 h-3" />}
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight className={`w-3 h-3 ${isDone ? 'text-[#62835c]' : 'text-[#e4dbcc]'}`} />
                )}
              </>
            );
          })}
        </div>

        {xmlGenerated && (
          <div className="flex items-center gap-2 text-[#62835c]">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">交付完成</span>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Step 0: Find / Upload SRT */}
      {!alignResults.length && (
        <PhasePanel>
          <PhasePanelHeader
            title={<>
              <FileText className="w-4 h-4 text-[#c97545]" />
              <span className="text-sm font-bold text-[#342d24]">步骤 1: 找到 SRT 字幕文件</span>
            </>
            }
            actions={
              !xmlGenerated && !alignResults.length && (
                <button
                  onClick={handleSkipSrt}
                  disabled={isGenerating}
                  className="text-xs text-[#8f8372] hover:text-[#342d24] underline underline-offset-2 disabled:opacity-50"
                >
                  跳过 SRT，直接生成 XML
                </button>
              )
            }
          />
          <PhasePanelBody className="space-y-5">
            {/* Auto-found SRT files */}
            {isScanningDir ? (
              <div className="flex items-center gap-2 text-[#8f8372] text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在扫描项目目录寻找 SRT 文件...
              </div>
            ) : foundSrtFiles.length > 0 ? (
              <div className="rounded-lg border border-[#e4dbcc] p-4" style={{ background: 'rgba(249, 244, 236, 0.6)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen className="w-4 h-4 text-[#62835c]" />
                  <span className="text-sm font-medium text-[#62835c]">找到 {foundSrtFiles.length} 个 SRT 文件</span>
                </div>
                <div className="flex flex-col gap-2">
                  {foundSrtFiles.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => loadFoundSrt(f)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-left ${
                        srtContent && (window as unknown as Record<string, unknown>).__loadedSrtName === f.name
                          ? 'border-[#c97545] bg-[#c97545]/5'
                          : 'border-[#e4dbcc] hover:border-[#d8c8ae] hover:bg-[#f4efe5]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#c97545] flex-shrink-0" />
                        <span className="text-sm text-[#342d24]">{f.name}</span>
                        <span className="text-xs text-[#8f8372]">({(f.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      {srtContent && (window as unknown as Record<string, unknown>).__loadedSrtName === f.name && (
                        <CheckCircle className="w-4 h-4 text-[#c97545]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-[#8f8372]">
                <AlertTriangle className="w-4 h-4" />
                未在项目中找到 SRT 文件，请手动上传
              </div>
            )}

            {/* Manual upload */}
            <div>
              {foundSrtFiles.length > 0 && (
                <p className="text-xs text-[#8f8372] mb-2">或者手动上传其他 SRT 文件：</p>
              )}
              <div
                className="w-full p-8 border-2 border-dashed border-[#d8c8ae] rounded-xl hover:border-[#c97545] hover:bg-[#f4efe5]/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-4"
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
                <FileText className={`w-12 h-12 ${hasSrt ? 'text-[#c97545]' : 'text-[#d8c8ae]'}`} />
                <div className="text-center">
                  <p className="text-[#342d24] font-medium mb-1">
                    {hasSrt ? currentSrtName : '点击或拖拽 SRT 文件到此处'}
                  </p>
                  <p className="text-xs text-[#8f8372]">仅支持 .srt 格式</p>
                </div>
              </div>
            </div>

            {/* Next step action */}
            <div className="flex justify-center">
              <button
                onClick={handleAlign}
                disabled={!hasSrt || isAnalyzing}
                className="px-8 py-3 bg-[#c97545] hover:bg-[#b26135] disabled:opacity-50 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> 分析中...</>
                ) : (
                  <><Upload className="w-5 h-5" /> 开始比照</>
                )}
              </button>
            </div>
          </PhasePanelBody>
        </PhasePanel>
      )}

      {/* Step 2-3: Align Results / XML Generation */}
      {alignResults.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Delivery summary */}
          <PhasePanel>
            <PhasePanelHeader
              title={
                <>
                  <CheckCircle className="w-4 h-4 text-[#62835c]" />
                  <span className="text-sm font-bold text-[#342d24]">步骤 2: 时轴比照完成</span>
                </>
              }
              actions={
                <button
                  onClick={handleReset}
                  className="text-xs text-[#8f8372] hover:text-[#342d24] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> 重新上传
                </button>
              }
            />
            <PhasePanelBody>
              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8f8372] uppercase tracking-wider font-bold">总条目</span>
                  <span className="text-lg font-bold text-[#342d24]">{alignResults.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8f8372] uppercase tracking-wider font-bold">有视频</span>
                  <span className="text-lg font-bold text-[#62835c]">{hasVideoCount}</span>
                </div>
                {missingVideoCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#8f8372] uppercase tracking-wider font-bold">缺失视频</span>
                    <span className="text-lg font-bold text-red-500">{missingVideoCount}</span>
                    <span className="text-xs text-red-500">将跳过</span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto border border-[#e4dbcc] rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f4efe5] text-xs uppercase font-semibold text-[#8f8372]">
                    <tr>
                      <th className="px-4 py-3">B-Roll 条目</th>
                      <th className="px-4 py-3 w-1/4">Key Sentence</th>
                      <th className="px-4 py-3 w-1/4">匹配 SRT 文本</th>
                      <th className="px-4 py-3">时间码</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4dbcc]">
                    {alignResults.map((res, i) => (
                      <tr key={i} className={`${res.hasVideo === false ? 'opacity-40' : 'hover:bg-[#f4efe5]/50'}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium flex items-center gap-2">
                            <span className={res.hasVideo === false ? 'text-[#8f8372]' : 'text-[#342d24]'}>{res.brollName}</span>
                            {res.hasVideo === false && (
                              <span className="text-[10px] bg-[#e4dbcc] text-[#8f8372] px-1.5 py-0.5 rounded">未渲染</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6b5e4f]">{res.keySentence}</td>
                        <td className={`px-4 py-3 text-xs ${res.hasVideo === false ? 'text-[#8f8372]' : 'text-[#c97545]'}`}>{res.matchedText}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="bg-[#f4efe5] px-2 py-1 rounded text-xs font-mono text-[#342d24]">{res.startTime} - {res.endTime}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PhasePanelBody>
          </PhasePanel>

          {/* Step 3: XML Generation / Download */}
          <PhasePanel>
            <PhasePanelHeader
              title={
                <>
                  <Sparkles className="w-4 h-4 text-[#c97545]" />
                  <span className="text-sm font-bold text-[#342d24]">步骤 3: 生成 XML 交付包</span>
                </>
              }
            />
            <PhasePanelBody>
              {!xmlGenerated ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <p className="text-sm text-[#6b5e4f] text-center">
                    基于 {hasVideoCount} 条有视频的时轴对齐结果生成剪辑软件导入文件
                  </p>
                  <button
                    onClick={handleGenerateXML}
                    disabled={isGenerating}
                    className="px-6 py-3 bg-[#c97545] hover:bg-[#b26135] disabled:opacity-50 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                  >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    生成 XML
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5 py-6">
                  <div className="flex items-center gap-2 text-[#62835c]">
                    <CheckCircle className="w-6 h-6" />
                    <span className="text-lg font-bold">XML 交付包已生成</span>
                  </div>
                  <p className="text-sm text-[#6b5e4f] text-center">
                    包含 {hasVideoCount} 条时轴对齐结果，可直接导入剪辑软件
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleDownload('premiere')}
                      className="px-6 py-3 bg-[#c97545] hover:bg-[#b26135] text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-5 h-5" /> 下载 Premiere XML
                    </button>
                    <button
                      onClick={() => handleDownload('jianying')}
                      className="px-6 py-3 bg-[#f4efe5] hover:bg-[#e4dbcc] text-[#342d24] font-medium rounded-lg flex items-center gap-2 transition-colors border border-[#e4dbcc]"
                    >
                      <Download className="w-5 h-5" /> 下载剪映 XML
                    </button>
                  </div>

                  {/* Next handoff hint */}
                  <div className="mt-4 p-4 rounded-lg border border-[#e4dbcc] bg-[#f4efe5]/50 w-full max-w-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-[#c97545]" />
                      <span className="text-xs font-bold text-[#342d24] uppercase tracking-wider">下一步 Handoff</span>
                    </div>
                    <p className="text-xs text-[#6b5e4f]">
                      下载 XML 后，请在右侧 Handoff 面板中确认交付物清单，
                      或切换到 TimelineWeaver 进行时间线编排。
                    </p>
                  </div>
                </div>
              )}
            </PhasePanelBody>
          </PhasePanel>
        </div>
      )}
    </div>
  );
};
