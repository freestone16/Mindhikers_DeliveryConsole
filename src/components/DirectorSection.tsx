import { useState } from 'react';
import { MonitorPlay, Rocket } from 'lucide-react';
import { Phase1View } from './director/Phase1View';
import { Phase2View } from './director/Phase2View';
import { Phase3View } from './director/Phase3View';
import { Phase4View } from './director/Phase4View';
import type { DirectorModule, DirectorChapter, RenderJob, BRollType } from '../types';

interface DirectorSectionProps {
  data: DirectorModule;
  projectId: string;
  scriptPath: string;
  onUpdate: (newData: DirectorModule) => void;
}

type Phase = 1 | 2 | 3 | 4;

export const DirectorSection = ({ data, projectId, scriptPath, onUpdate }: DirectorSectionProps) => {
  const [phase, setPhase] = useState<Phase>(data.phase === 2 ? 2 : 1);
  const [concept, setConcept] = useState<string | null>(data.conceptProposal);
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [conceptApproved, setConceptApproved] = useState(data.isConceptApproved);

  const [chapters, setChapters] = useState<DirectorChapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');

  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [brollPaths] = useState<any[]>([]);

  const handleGenerateConcept = async () => {
    if (!scriptPath) {
      alert('Please select a script first in the header.');
      return;
    }

    setIsGeneratingConcept(true);
    setConcept('');

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
                  setConcept(fullContent);
                } else if (jsonData.type === 'done') {
                  onUpdate({ ...data, conceptProposal: fullContent });
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
        setConcept(result.data.content);
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
    setConceptApproved(true);
    onUpdate({ ...data, isConceptApproved: true });
    setPhase(2);
  };

  const handleConfirmBRoll = async (types: BRollType[]) => {
    if (!scriptPath) {
      alert('Please select a script first');
      return;
    }

    setIsLoading(true);
    setLoadingProgress('0/0');
    setChapters([]);

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
                setLoadingProgress(`${jsonData.current}/${jsonData.total}`);
              } else if (jsonData.type === 'chapter_ready') {
                allChapters.push(jsonData.chapter);
                setChapters([...allChapters]);
              } else if (jsonData.type === 'done') {
                setChapters(jsonData.chapters || allChapters);
                setLoadingProgress('completed');
              }
            } catch (e) {
              // Ignore parse errors
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
    setChapters(prev => prev.map(ch =>
      ch.chapterId === chapterId ? { ...ch, selectedOptionId: optionId } : ch
    ));
  };

  const handleComment = (chapterId: string, comment: string) => {
    setChapters(prev => prev.map(ch =>
      ch.chapterId === chapterId ? { ...ch, userComment: comment } : ch
    ));
  };

  const handleLock = (chapterId: string) => {
    setChapters(prev => prev.map(ch =>
      ch.chapterId === chapterId ? { ...ch, isLocked: true } : ch
    ));
  };

  const handleProceed = () => {
    setJobs(chapters.map(c => ({
      jobId: `job-${c.chapterId}`,
      projectId,
      chapterId: c.chapterId,
      status: 'pending' as const,
      progress: 0,
    })));
    setPhase(3);
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
                if (p === 1) setPhase(1);
                else if (p === 2 && conceptApproved) setPhase(2);
                else if (p === 3 && jobs.length > 0) setPhase(3);
                else if (p === 4 && brollPaths.length > 0) setPhase(4);
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
            chapters={chapters}
            isLoading={isLoading}
            loadingProgress={loadingProgress}
            onConfirmBRoll={handleConfirmBRoll}
            onSelect={handleSelectOption}
            onComment={handleComment}
            onLock={handleLock}
            onProceed={handleProceed}
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
