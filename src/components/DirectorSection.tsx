import { useState } from 'react';
import { MonitorPlay, RotateCcw } from 'lucide-react';
import { Phase1View } from './director/Phase1View';
import { Phase2View } from './director/Phase2View';
import { Phase3View } from './director/Phase3View';
import type { DirectorModule, DirectorChapter, BRollType } from '../types';
import { useLLMConfig } from '../hooks/useLLMConfig';

interface DirectorSectionProps {
  projectId: string;
  scriptPath: string;
  socket: any;
}

type Phase = 1 | 2 | 3;

import { useExpertState } from '../hooks/useExpertState';

export const DirectorSection = ({ projectId, scriptPath, socket }: DirectorSectionProps) => {
  const { state: data, updateState } = useExpertState<DirectorModule>('Director', { phase: 1, conceptProposal: '', conceptFeedback: '', isConceptApproved: false, items: [], renderJobs: [] });

  const onUpdate = (newData: DirectorModule) => {
    updateState(projectId, newData);
  };

  const phase = (data.phase || 1) as Phase;
  const conceptApproved = data.isConceptApproved || false;
  const chapters = (data.items || []) as DirectorChapter[];
  // Jobs and BrollPaths replaced by Phase3 SRT -> XML flow
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [streamingConcept, setStreamingConcept] = useState<string | null>(null);
  const concept = isGeneratingConcept ? streamingConcept : data.conceptProposal;

  const [isLoading, setIsLoading] = useState(false);
  const [localChapters, setLocalChapters] = useState<DirectorChapter[] | null>(null);
  const displayedChapters = localChapters || chapters;

  // Feature 2: elapsed time tracking
  const [startTime, setStartTime] = useState<number | null>(null);

  // Phase2 logs for debug panel
  const [phase2Logs, setPhase2Logs] = useState<{ timestamp: number; type: string; message: string }[]>([]);

  const { status } = useLLMConfig();
  const currentModel = status?.global?.provider
    ? { provider: status.global.provider, model: status.global.model || 'default' }
    : undefined;

  const handleGenerateConcept = async () => {
    if (!scriptPath) {
      alert('Please select a script first in the header.');
      return;
    }

    setIsGeneratingConcept(true);
    setStreamingConcept('');
    const phase1StartTime = Date.now();
    console.log('[Phase1] 🚀 开始生成概念提案...');

    try {
      const response = await fetch('http://localhost:3002/api/director/phase1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, scriptPath })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Server error');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const dataStr = line.replace('data: ', '');
                const jsonData = JSON.parse(dataStr);

                if (jsonData.type === 'content') {
                  fullContent += jsonData.content;
                  setStreamingConcept(fullContent);
                } else if (jsonData.type === 'done') {
                  const elapsed = ((Date.now() - phase1StartTime) / 1000).toFixed(1);
                  console.log(`[Phase1] ✅ 概念提案生成完成，耗时 ${elapsed} 秒`);
                  onUpdate({ ...data, conceptProposal: fullContent });
                  setStreamingConcept(null);
                }
              } catch (e) {
                // Ignore partial JSON
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      alert('Generation failed: ' + e.message);
    } finally {
      setIsGeneratingConcept(false);
    }
  };

  const handleReviseConcept = async (comment: string) => {
    if (!comment.trim()) return;
    setIsGeneratingConcept(true);
    try {
      const res = await fetch('http://localhost:3002/api/director/phase1/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userComment: comment })
      });
      const result = await res.json();
      if (result.success) {
        onUpdate({ ...data, conceptProposal: result.data.content });
      } else {
        console.error('Failed to revise concept:', result.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingConcept(false);
    }
  };

  const handleApproveConcept = () => {
    onUpdate({ ...data, isConceptApproved: true, phase: 2 });
  };

  const handleReset = () => {
    if (window.confirm('确定要重置所有缓存并回到 Phase 1 吗？此操作不可撤销。')) {
      socket?.emit('chat-clear-history', { expertId: 'Director', projectId });
      onUpdate({ phase: 1, conceptProposal: '', conceptFeedback: '', isConceptApproved: false, items: [], renderJobs: [] });
      setLocalChapters(null);
      setPhase2Logs([]);
    }
  };

  const handleConfirmBRoll = async (types: BRollType[]) => {
    if (!scriptPath) {
      alert('Please select a script first');
      return;
    }

    setIsLoading(true);
    setStartTime(Date.now());
    setLocalChapters([]);
    setPhase2Logs([]);

    try {
      // Feature 1: Clear chat history when regenerating Phase 2
      socket?.emit('chat-clear-history', { expertId: 'Director', projectId });

      const response = await fetch('http://localhost:3002/api/director/phase2/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, scriptPath, brollTypes: types })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Server error');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      const allChapters: DirectorChapter[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const dataStr = line.replace('data: ', '');
              const jsonData = JSON.parse(dataStr);

              if (jsonData.type === 'taskId') {
                // taskId received for polling if needed
              } else if (jsonData.type === 'progress') {
                // Ignore numeric progress UI updates
              } else if (jsonData.type === 'log') {
                console.log(`[Phase2 Log] ${jsonData.level}: ${jsonData.message}`);
                setPhase2Logs(prev => [...prev, {
                  timestamp: Date.now(),
                  type: (jsonData.level || 'info') as 'info' | 'warning' | 'error',
                  message: jsonData.message
                }].slice(-50));
              } else if (jsonData.type === 'chapter_ready') {
                allChapters.push(jsonData.chapter);
                setLocalChapters([...allChapters]);
              } else if (jsonData.type === 'done') {
                const elapsed = startTime ? ((Date.now() - startTime) / 1000).toFixed(1) : 'N/A';
                console.log(`[Phase2] ✅ 视频方案生成完成，耗时 ${elapsed} 秒`);
                onUpdate({ ...data, items: jsonData.chapters || allChapters, phase: 2 });
                setLocalChapters(null);
                setStartTime(null);
              } else if (jsonData.type === 'error') {
                throw new Error(jsonData.error || 'Unknown error');
              }
            } catch (e: any) {
              // Don't ignore errors - log them for debugging
              console.error('[SSE Parse Error]', e, 'Raw data:', line);
              // If this is a real error from server, propagate it
              if (line.includes('"type":"error"')) {
                throw new Error('Server error: ' + line);
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      alert('Generation failed: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (chapterId: string, optionId: string) => {
    const updated = displayedChapters.map(ch =>
      ch.chapterId === chapterId ? { ...ch, selectedOptionId: optionId, isChecked: false } : ch
    );
    setLocalChapters(null); // switch to data.items source
    onUpdate({ ...data, items: updated });
  };

  const handleToggleCheck = (chapterId: string, optionId: string) => {
    const updated = displayedChapters.map(ch => {
      if (ch.chapterId === chapterId) {
        return {
          ...ch,
          options: ch.options.map(opt =>
            opt.id === optionId ? { ...opt, isChecked: !opt.isChecked } : opt
          )
        };
      }
      return ch;
    });
    setLocalChapters(null); // switch to data.items source
    onUpdate({ ...data, items: updated });
  };

  const handleBatchSetCheck = (filterFn: (opt: any) => boolean, checked: boolean) => {
    const updated = displayedChapters.map(ch => ({
      ...ch,
      options: ch.options.map(opt =>
        filterFn(opt) ? { ...opt, isChecked: checked } : opt
      )
    }));
    setLocalChapters(null);
    onUpdate({ ...data, items: updated });
  };

  const handleRenderChecked = async () => {
    const RENDERABLE_TYPES = ['remotion', 'seedance', 'generative', 'infographic'];

    // Collect all checked options across all chapters, filtered by renderable type
    const checkedItems = chapters.flatMap(c =>
      c.options
        .filter(o => o.isChecked && RENDERABLE_TYPES.includes(o.type))
        .map(o => ({ chapterId: c.chapterId, optionId: o.id, type: o.type }))
    );

    if (!checkedItems.length) {
      // Check if there are other checked items that were filtered out
      const anyChecked = chapters.some(c => c.options.some(o => o.isChecked));
      if (anyChecked) {
        alert('当前选中的素材（如互联网素材/用户采集）无需触发 AI 渲染，您可以直接进入 Phase 3 进行后续处理。');
      }
      return;
    }

    // We will call the backend to start rendering
    try {
      const response = await fetch('http://localhost:3002/api/director/phase2/render_checked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          chapters: checkedItems
        })
      });
      if (response.ok) {
        alert('渲染已触发');
      } else {
        alert('渲染触发失败');
      }
    } catch (e) {
      console.error(e);
      alert('渲染请求错误');
    }
  };

  const handleProceed = () => {
    const newJobs = chapters.map(c => ({
      jobId: `job-${c.chapterId}`,
      projectId,
      chapterId: c.chapterId,
      status: 'pending' as const,
      progress: 0,
    }));
    onUpdate({ ...data, renderJobs: newJobs, phase: 3 });
  };

  const handleImportChapters = (importedChapters: DirectorChapter[]) => {
    // Normalize and inject defaults
    const normalized = importedChapters.map((ch, i) => ({
      ...ch,
      chapterIndex: ch.chapterIndex ?? i,
      isLocked: ch.isLocked ?? false,
      options: (ch.options || []).map((opt, j) => ({
        ...opt,
        id: opt.id || `${ch.chapterId}-opt-${j}`,
      })),
    }));
    onUpdate({ ...data, items: normalized, phase: 2 });
  };

  const phaseLabels: Record<Phase, string> = {
    1: 'Concept',
    2: 'Storyboard',
    3: 'XML Layout'
  };

  const phaseColors: Record<Phase, string> = {
    1: 'bg-yellow-500/20 text-yellow-300',
    2: 'bg-blue-500/20 text-blue-300',
    3: 'bg-purple-500/20 text-purple-300'
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
        <div className="flex items-center gap-2">
          <MonitorPlay className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-white">Director (Visual)</h2>
          <span className={`px-2 py-0.5 rounded text-xs ml-2 ${phaseColors[phase]}`}>
            Phase {phase}: {phaseLabels[phase]}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 mr-2 text-xs rounded text-slate-400 hover:text-red-400 hover:bg-red-900/30 transition-colors"
            title="重置模块并清空缓存"
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </button>
          {[1, 2, 3].map(p => (
            <button
              key={p}
              onClick={() => {
                if (p === 1) onUpdate({ ...data, phase: 1 });
                else if (p === 2 && conceptApproved) onUpdate({ ...data, phase: 2 });
                // We'll let users proceed to Phase 3 manually if they want for now
                else if (p === 3) onUpdate({ ...data, phase: 3 });
              }}
              disabled={
                (p === 2 && !conceptApproved)
              }
              className={`px-3 py-1 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed ${phase === p ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
            >
              P{p}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {phase === 1 && (
          <Phase1View
            projectId={projectId}
            scriptPath={scriptPath}
            concept={concept}
            isGenerating={isGeneratingConcept}
            isApproved={conceptApproved}
            onGenerate={handleGenerateConcept}
            onRevise={handleReviseConcept}
            onApprove={handleApproveConcept}
            onImportChapters={handleImportChapters}
          />
        )}

        {phase === 2 && (
          <Phase2View
            projectId={projectId}
            chapters={displayedChapters}
            isLoading={isLoading}
            startTime={startTime}
            onConfirmBRoll={handleConfirmBRoll}
            onSelect={handleSelectOption}
            onToggleCheck={handleToggleCheck}
            onBatchSetCheck={handleBatchSetCheck}
            onRenderChecked={handleRenderChecked}
            onProceed={handleProceed}
            currentModel={currentModel}
            logs={phase2Logs}
          />
        )}

        {phase === 3 && (
          <Phase3View
            projectId={projectId}
            chapters={chapters}
            onProceed={handleProceed}
          />
        )}
      </div>
    </div>
  );
};
