import { useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle } from 'lucide-react';

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
}: Phase1ViewProps) => {
  const [feedback, setFeedback] = useState('');

  const isConceptEmpty = !concept || concept.trim() === '' || concept.includes('等待导演大师的视觉概念提案');

  if (isConceptEmpty && !isGenerating) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-8 text-center">
        <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Visual Concept Architect</h3>
        <p className="text-slate-400 text-sm mb-6">
          Generate a visual concept proposal for project "{projectId}" using script: {scriptPath.split('/').pop()}
        </p>
        <button
          onClick={onGenerate}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all"
        >
          Generate Concept
        </button>
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
