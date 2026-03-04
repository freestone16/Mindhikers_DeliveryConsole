import { useState, useRef } from 'react';
import { Sparkles, RefreshCw, CheckCircle, Upload, Copy, Check } from 'lucide-react';
import type { DirectorChapter } from '../../types';

const SimpleMarkdown = ({ text }: { text: string }) => {
  if (!text) return null;
  // Replace literal '\n' strings with actual newlines in case it's escaped
  const normalizedText = text.replace(/\\n/g, '\n');
  const lines = normalizedText.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        // Headers
        if (trimmed.startsWith('#### ')) return <h5 key={i} className="text-md font-bold text-white mt-4 mb-2">{parseInline(trimmed.replace('#### ', ''))}</h5>;
        if (trimmed.startsWith('### ')) return <h4 key={i} className="text-lg font-bold text-white mt-4 mb-2">{parseInline(trimmed.replace('### ', ''))}</h4>;
        if (trimmed.startsWith('## ')) return <h3 key={i} className="text-xl font-bold text-white mt-6 mb-3">{parseInline(trimmed.replace('## ', ''))}</h3>;
        if (trimmed.startsWith('# ')) return <h2 key={i} className="text-2xl font-bold text-blue-400 mt-6 mb-4">{parseInline(trimmed.replace('# ', ''))}</h2>;

        // Blockquotes
        if (trimmed.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-blue-500 pl-4 py-1 my-4 text-slate-300 italic bg-blue-500/10 rounded-r">{parseInline(trimmed.replace('> ', ''))}</blockquote>;

        // Lists
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) return <li key={i} className="ml-6 list-disc text-slate-300 my-1 pb-1">{parseInline(trimmed.replace(/^(\*|-)\s+/, ''))}</li>;
        if (trimmed.match(/^\d+\.\s/)) return <li key={i} className="ml-6 list-decimal text-slate-300 my-1 pb-1">{parseInline(trimmed.replace(/^\d+\.\s+/, ''))}</li>;

        // Empty lines
        if (trimmed === '') return <div key={i} className="h-2"></div>;

        // Normal text
        return <p key={i} className="text-slate-300 mb-1 leading-relaxed">{parseInline(trimmed)}</p>;
      })}
    </div>
  );
};

const parseInline = (text: string) => {
  if (!text) return text;
  // Simple parser for **bold** and `code`
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return <>{parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-blue-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
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

        // Strip markdown code wrap if the user saved it exactly as LLM returns (e.g., ```json\n...\n```)
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
      } catch (err: any) {
        alert('导入失败: 无法正确读取或解析JSON格式\n\n具体错误: ' + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // A concept is considered empty if it's null, empty string, or just the default placeholder text.
  // It is NOT empty if it contains actual generated content (usually > 50 chars).
  const isConceptEmpty = !concept || concept.trim() === '' ||
    (concept.includes('等待导演大师的视觉概念提案') && concept.length < 100);

  if (isConceptEmpty && !isGenerating) {
    if (!projectId || projectId === '' || !scriptPath || scriptPath === '') {
      return (
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-12 text-center h-[200px] flex flex-col items-center justify-center">
          <h3 className="text-xl font-bold text-slate-400">欢迎使用影视导演，请先在顶部面板选择项目和视频剧本。</h3>
        </div>
      );
    }

    // Safety check: if scriptPath is weirdly long, it might be a bug from old state
    const displayPath = scriptPath.length > 100 ? "当前剧本" : scriptPath.split('/').pop();

    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-8 text-center">
        <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Visual Concept Architect</h3>
        <p className="text-slate-400 text-sm mb-6">
          准备为当前剧本<strong className="text-blue-300">「{displayPath}」</strong>进行概念提案...
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onGenerate}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]"
          >
            开始头脑风暴并生成概念提案
          </button>
          <div className="h-8 w-px bg-slate-700"></div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            导入离线分镜 JSON
          </button>
        </div>
        <div className="mt-4 flex items-center justify-center">
          <div
            className="flex items-center gap-1.5 bg-slate-800/50 px-3 py-1.5 rounded border border-slate-700 cursor-pointer hover:border-slate-500 transition-colors"
            onClick={handleCopyPath}
            title="点击复制路径，在 Antigravity 中向导演大师提交时可用"
          >
            <span className="text-[10px] text-slate-500">模板:</span>
            <code className="text-[10px] text-blue-300 font-mono">{templatePath}</code>
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
          </div>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-8 text-center">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Generating Visual Concept...</h3>
        <p className="text-slate-400 text-sm">
          Analyzing script structure and style...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Visual Concept Proposal</h3>
          {isApproved && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Approved
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="prose prose-invert max-w-none text-slate-300">
          <SimpleMarkdown text={concept || ''} />
        </div>
      </div>

      {!isApproved && (
        <div className="p-4 border-t border-slate-700">
          <label className="text-xs text-slate-500 block mb-2">Feedback / Adjustments</label>
          <textarea
            className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            rows={3}
            placeholder="Describe changes you'd like to see..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => onRevise(feedback)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Revise
            </button>
            <button
              onClick={onApprove}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Approve & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
