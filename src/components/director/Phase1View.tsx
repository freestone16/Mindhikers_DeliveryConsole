import { useState, useRef } from 'react';
import { Sparkles, RefreshCw, CheckCircle, Upload, Copy, Check, FileText, Lightbulb } from 'lucide-react';
import type { DirectorChapter } from '../../types';
import { PhasePanel, PhasePanelHeader, PhasePanelBody, PhasePanelFooter, PhaseEmptyState, PhaseLoadingState } from './phase-layouts/PhasePanel';

const SimpleMarkdown = ({ text }: { text: string }) => {
  if (!text) return null;
  const normalizedText = text.replace(/\\n/g, '\n');
  const lines = normalizedText.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#### ')) return <h5 key={i} className="text-md font-bold text-[#342d24] mt-4 mb-2">{parseInline(trimmed.replace('#### ', ''))}</h5>;
        if (trimmed.startsWith('### ')) return <h4 key={i} className="text-lg font-bold text-[#342d24] mt-4 mb-2">{parseInline(trimmed.replace('### ', ''))}</h4>;
        if (trimmed.startsWith('## ')) return <h3 key={i} className="text-xl font-bold text-[#342d24] mt-6 mb-3">{parseInline(trimmed.replace('## ', ''))}</h3>;
        if (trimmed.startsWith('# ')) return <h2 key={i} className="text-2xl font-bold text-[#c97545] mt-6 mb-4">{parseInline(trimmed.replace('# ', ''))}</h2>;
        if (trimmed.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-[#c97545] pl-4 py-1 my-4 text-[#6b5e4f] italic bg-[#c97545]/10 rounded-r">{parseInline(trimmed.replace('> ', ''))}</blockquote>;
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) return <li key={i} className="ml-6 list-disc text-[#6b5e4f] my-1 pb-1">{parseInline(trimmed.replace(/^(\*|-)\s+/, ''))}</li>;
        if (trimmed.match(/^\d+\.\s/)) return <li key={i} className="ml-6 list-decimal text-[#6b5e4f] my-1 pb-1">{parseInline(trimmed.replace(/^\d+\.\s+/, ''))}</li>;
        if (trimmed === '') return <div key={i} className="h-2"></div>;
        return <p key={i} className="text-[#6b5e4f] mb-1 leading-relaxed">{parseInline(trimmed)}</p>;
      })}
    </div>
  );
};

const parseInline = (text: string) => {
  if (!text) return text;
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return <>{parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-[#c97545]">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-slate-800 text-[#c97545] px-1.5 py-0.5 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
    }
    return <span key={i}>{part}</span>;
  })}</>;
};

interface Phase1ViewProps {
  projectId: string;
  scriptPath: string;
  concept: string | null;
  isGenerating: boolean;
  isApproved: boolean;
  onGenerate: () => void;
  onRevise: (comment: string) => void;
  onApprove: () => void;
  onImportChapters?: (chapters: DirectorChapter[]) => void;
}

export const Phase1View = ({
  projectId,
  scriptPath,
  concept,
  isGenerating,
  isApproved,
  onGenerate,
  onRevise,
  onApprove,
  onImportChapters,
}: Phase1ViewProps) => {
  const [feedback, setFeedback] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const templatePath = "~/.gemini/antigravity/skills/Director/prompts/broll.md";

  const handleCopyPath = () => {
    navigator.clipboard.writeText(templatePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let content = e.target?.result as string;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
          content = jsonMatch[1];
        }
        const raw = JSON.parse(content);
        let chapters: DirectorChapter[];
        if (Array.isArray(raw)) chapters = raw;
        else if (raw?.chapters && Array.isArray(raw.chapters)) chapters = raw.chapters;
        else throw new Error('顶层结构必须是 { "chapters": [...] } 或直接数组');
        for (let i = 0; i < chapters.length; i++) {
          const ch = chapters[i];
          if (!ch.chapterId) throw new Error(`第 ${i + 1} 章缺少 chapterId`);
          if (!ch.chapterName) throw new Error(`第 ${i + 1} 章缺少 chapterName`);
          if (!Array.isArray(ch.options)) throw new Error(`第 ${i + 1} 章缺少 options 数组`);
        }
        onImportChapters?.(chapters);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        alert('导入失败: 无法正确读取或解析JSON格式\n\n具体错误: ' + message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const isConceptEmpty = !concept || concept.trim() === '' ||
    (concept.includes('等待导演大师的视觉概念提案') && concept.length < 100);

  if (isConceptEmpty && !isGenerating) {
    if (!projectId || projectId === '' || !scriptPath || scriptPath === '') {
      return (
        <PhasePanel>
          <PhaseEmptyState
            icon={<Lightbulb className="w-12 h-12" />}
            title="欢迎使用影视导演"
            description="请先在顶部面板选择项目和视频剧本，开始概念提案。"
          />
        </PhasePanel>
      );
    }

    const displayPath = scriptPath.length > 100 ? "当前剧本" : scriptPath.split('/').pop();

    return (
      <PhasePanel>
        <PhaseEmptyState
          icon={<Sparkles className="w-12 h-12" />}
          title="Visual Concept Architect"
          description={
            <>
              准备为当前剧本<strong className="text-[#c97545]">「{displayPath}」</strong>进行概念提案...
            </>
          }
          actions={
            <>
              <button
                onClick={onGenerate}
                className="px-6 py-2.5 bg-[#c97545] hover:bg-[#b26135] text-white font-medium rounded-lg transition-all shadow-sm"
              >
                开始头脑风暴
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-[#24324a] hover:bg-[#1f2b40] border border-[#4c5d7a] text-[#f6ead6] rounded-lg font-medium flex items-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4" />
                导入离线分镜 JSON
              </button>
            </>
          }
        />
        <div className="flex items-center justify-center pb-6">
          <div
            className="flex items-center gap-2 bg-[#f2e7d4] px-3.5 py-2 rounded-lg border border-[#dbc9af] shadow-sm cursor-pointer hover:border-[#c9a574] hover:bg-[#f7eddd] transition-colors"
            onClick={handleCopyPath}
            title="点击复制路径，在 Antigravity 中向导演大师提交时可用"
          >
            <span className="text-[11px] font-medium tracking-[0.08em] text-[#8f6f4f] uppercase">模板</span>
            <code className="text-[11px] text-[#8d5730] font-mono">{templatePath}</code>
            {copied ? <Check className="w-3.5 h-3.5 text-[#5f8a58]" /> : <Copy className="w-3.5 h-3.5 text-[#9d7d5a]" />}
          </div>
        </div>
      </PhasePanel>
    );
  }

  if (isGenerating) {
    return (
      <PhasePanel>
        <PhaseLoadingState
          title="Generating Visual Concept..."
          subtitle="Analyzing script structure and style..."
        />
      </PhasePanel>
    );
  }

  return (
    <div className="flex gap-5 h-full">
      <div className="flex-1 min-w-0">
        <PhasePanel className="h-full flex flex-col">
          <PhasePanelHeader
            title={
              <>
                <FileText className="w-4 h-4 text-[#c97545]" />
                <span className="text-sm font-bold text-[#342d24]">Visual Concept Proposal</span>
              </>
            }
            actions={
              isApproved && (
                <span className="text-xs text-[#5b7c6f] flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Approved
                </span>
              )
            }
          />
          <PhasePanelBody className="flex-1 overflow-auto">
            <div className="prose prose-invert max-w-none text-[#6b5e4f]">
              <SimpleMarkdown text={concept || ''} />
            </div>
          </PhasePanelBody>

          {!isApproved && (
            <PhasePanelFooter>
              <label className="text-xs text-[#8f8372] block mb-2">Feedback / Adjustments</label>
              <textarea
                className="w-full bg-[#faf6ef] border border-[#e4dbcc] rounded-lg p-3 text-[#342d24] placeholder-[#c9baa3] focus:outline-none focus:border-[#c97545] text-sm"
                rows={3}
                placeholder="Describe changes you'd like to see..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => onRevise(feedback)}
                  className="px-4 py-2 bg-[#f4efe5] hover:bg-[#e4dbcc] text-[#342d24] rounded-lg flex items-center gap-2 border border-[#e4dbcc] text-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Revise
                </button>
                <button
                  onClick={onApprove}
                  className="px-4 py-2 bg-[#c97545] hover:bg-[#b26135] text-white rounded-lg flex items-center gap-2 font-medium text-sm transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve & Continue
                </button>
              </div>
            </PhasePanelFooter>
          )}
        </PhasePanel>
      </div>

      <div className="w-72 flex-shrink-0 flex flex-col gap-4">
        <PhasePanel>
          <PhasePanelHeader
            title={
              <>
                <Lightbulb className="w-4 h-4 text-[#c97545]" />
                <span className="text-sm font-bold text-[#342d24]">当前上下文</span>
              </>
            }
          />
          <PhasePanelBody className="space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] text-[#8f8372] uppercase tracking-wider font-bold">项目</span>
              <div className="text-sm text-[#342d24] font-medium truncate">{projectId || '未选择'}</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-[#8f8372] uppercase tracking-wider font-bold">剧本</span>
              <div className="text-sm text-[#342d24] font-medium truncate">{scriptPath ? scriptPath.split('/').pop() : '未选择'}</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-[#8f8372] uppercase tracking-wider font-bold">状态</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isApproved ? 'bg-[#62835c]' : 'bg-[#c97545]'}`} />
                <span className="text-sm text-[#342d24]">{isApproved ? '概念已确认' : '概念待确认'}</span>
              </div>
            </div>
          </PhasePanelBody>
        </PhasePanel>

        <PhasePanel>
          <PhasePanelHeader
            title={
              <>
                <Upload className="w-4 h-4 text-[#c97545]" />
                <span className="text-sm font-bold text-[#342d24]">输入来源</span>
              </>
            }
          />
          <PhasePanelBody className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-[#6b5e4f]">
              <span className="w-5 h-5 rounded bg-[#f4efe5] flex items-center justify-center text-[10px] font-bold text-[#8f8372]">1</span>
              <span>剧本结构分析</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#6b5e4f]">
              <span className="w-5 h-5 rounded bg-[#f4efe5] flex items-center justify-center text-[10px] font-bold text-[#8f8372]">2</span>
              <span>视觉风格推理</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#6b5e4f]">
              <span className="w-5 h-5 rounded bg-[#f4efe5] flex items-center justify-center text-[10px] font-bold text-[#8f8372]">3</span>
              <span>B-roll 类型匹配</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#6b5e4f]">
              <span className="w-5 h-5 rounded bg-[#f4efe5] flex items-center justify-center text-[10px] font-bold text-[#8f8372]">4</span>
              <span>章节分段建议</span>
            </div>
          </PhasePanelBody>
        </PhasePanel>
      </div>
    </div>
  );
};
