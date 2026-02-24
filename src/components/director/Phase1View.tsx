import { useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle } from 'lucide-react';

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

  if (!concept && !isGenerating) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-8 text-center">
        <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Visual Concept Architect</h3>
        <p className="text-slate-400 text-sm mb-6">
          Generate a visual concept proposal based on your script.
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
        <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap">
          {concept}
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
