import { useState } from 'react';
import { MonitorPlay, Rocket } from 'lucide-react';
import { Phase1View } from './director/Phase1View';
import { Phase2View } from './director/Phase2View';
import { Phase3View } from './director/Phase3View';
import { Phase4View } from './director/Phase4View';
import type { DirectorModule, DirectorChapter, RenderJob, BRollType } from '../types';
import { useLLMConfig } from '../hooks/useLLMConfig';

interface DirectorSectionProps {
  data: DirectorModule;
  projectId: string;
  scriptPath: string;
  onUpdate: (newData: DirectorModule) => void;
}

type Phase = 1 | 2 | 3 | 4;

export const DirectorSection = ({ data, projectId, scriptPath, onUpdate }: DirectorSectionProps) => {
  const phase = (data.phase || 1) as Phase;
  const conceptApproved = data.isConceptApproved || false;
  const chapters = (data.items || []) as DirectorChapter[];
  const jobs = (data.renderJobs || []) as RenderJob[];

  // Local state for streaming to avoid overwhelming the file system / socket
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [streamingConcept, setStreamingConcept] = useState<string | null>(null);
  const concept = isGeneratingConcept ? streamingConcept : data.conceptProposal;

  const [isLoading, setIsLoading] = useState(false);
  const [localChapters, setLocalChapters] = useState<DirectorChapter[] | null>(null);
  const displayedChapters = localChapters || chapters;

  // Feature 2: elapsed time tracking
  const [startTime, setStartTime] = useState<number | null>(null);

  // Phase2 logs for debug panel
  const [phase2Logs, setPhase2Logs] = useState<{timestamp: number; type: string; message: string}[]>([]);

  const [brollPaths] = useState<any[]>([]);

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
    onUpdate({
      ...data,
      items: chapters.map(ch => ch.chapterId === chapterId ? { ...ch, selectedOptionId: optionId } : ch)
    });
  };

  const handleComment = (chapterId: string, comment: string) => {
    onUpdate({
      ...data,
      items: chapters.map(ch => ch.chapterId === chapterId ? { ...ch, userComment: comment } : ch)
    });
  };

  const handleLock = (chapterId: string) => {
    onUpdate({
      ...data,
      items: chapters.map(ch => ch.chapterId === chapterId ? { ...ch, isLocked: true } : ch)
    });
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

  const phaseLabels: Record<Phase, string> = {
    1: 'Concept',
    2: 'Storyboard',
    3: 'Render',
    4: 'Assembly'
  };

  const phaseColors: Record<Phase, string> = {
    1: 'bg-yellow-500/20 text-yellow-300',
    2: 'bg-blue-500/20 text-blue-300',
    3: 'bg-purple-500/20 text-purple-300',
    4: 'bg-orange-500/20 text-orange-300'
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
          {phase === 4 && brollPaths.length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs ml-2 bg-green-500/20 text-green-300 flex items-center gap-1">
              <Rocket className="w-3 h-3" /> Ready to Weave
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(p => (
            <button
              key={p}
              onClick={() => {
                if (p === 1) onUpdate({ ...data, phase: 1 });
                else if (p === 2 && conceptApproved) onUpdate({ ...data, phase: 2 });
                else if (p === 3 && jobs.length > 0) onUpdate({ ...data, phase: 3 });
                else if (p === 4 && brollPaths.length > 0) onUpdate({ ...data, phase: 4 });
              }}
              disabled={
                (p === 2 && !conceptApproved) ||
                (p === 3 && jobs.length === 0) ||
                (p === 4 && brollPaths.length === 0)
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
            onComment={handleComment}
            onLock={handleLock}
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

        {phase === 4 && (
          <Phase4View
            projectId={projectId}
            brollPaths={brollPaths.map(b => ({ sceneId: b.sceneId, outputPath: b.outputPath! }))}
          />
        )}
      </div>
    </div>
  );
};
