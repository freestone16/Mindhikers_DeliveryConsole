import { useState } from 'react';
import { MonitorPlay, Rocket } from 'lucide-react';
import { Phase1View } from './director/Phase1View';
import { Phase2View } from './director/Phase2View';
import { Phase3View } from './director/Phase3View';
import { Phase4View } from './director/Phase4View';
import type { DirectorModule, DirectorChapter, RenderJob, BRollType } from '../types';

interface BrollResult {
  sceneId: string;
  success: boolean;
  outputPath?: string;
  gifPath?: string;
  error?: string;
}

interface DirectorSectionProps {
  data: DirectorModule;
  projectId: string;
  onUpdate: (newData: DirectorModule) => void;
}

type Phase = 1 | 2 | 3 | 4;

export const DirectorSection = ({ data, projectId, onUpdate }: DirectorSectionProps) => {
  const [phase, setPhase] = useState<Phase>(data.phase === 2 ? 2 : 1);
  const [concept, setConcept] = useState<string | null>(data.conceptProposal);
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [conceptApproved, setConceptApproved] = useState(data.isConceptApproved);

  const [chapters, setChapters] = useState<DirectorChapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('0/0');

  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [isBatchRendering, setIsBatchRendering] = useState(false);

  const [brollPaths, setBrollPaths] = useState<BrollResult[]>([]);

  const handleGenerateConcept = async () => {
    setIsGeneratingConcept(true);
    setTimeout(() => {
      setConcept('# 视觉概念提案\n\n本视频采用理性冷静的深色科技风格...');
      setIsGeneratingConcept(false);
    }, 2000);
  };

  const handleReviseConcept = async (_comment: string) => {
    setIsGeneratingConcept(true);
    setTimeout(() => {
      setConcept(prev => prev + '\n\n[已修订]');
      setIsGeneratingConcept(false);
    }, 1500);
  };

  const handleApproveConcept = () => {
    setConceptApproved(true);
    onUpdate({ ...data, isConceptApproved: true });
    setPhase(2);
  };

  const handleConfirmBRoll = async (_types: BRollType[]) => {
    setIsLoading(true);
    setLoadingProgress('1/6');
    setTimeout(() => {
      setLoadingProgress('2/6');
      setChapters([
        { chapterId: 'ch1', chapterIndex: 0, chapterName: 'Intro', scriptText: '开场白：欢迎来到...', options: [], isLocked: false },
        { chapterId: 'ch2', chapterIndex: 1, chapterName: '第一章', scriptText: '第一部分内容...', options: [], isLocked: false },
        { chapterId: 'ch3', chapterIndex: 2, chapterName: '第二章', scriptText: '第二部分内容...', options: [], isLocked: false },
      ]);
      setLoadingProgress('6/6');
      setIsLoading(false);
    }, 3000);
  };

  const handleSelect = (chapterId: string, optionId: string) => {
    setChapters(prev => prev.map(c =>
      c.chapterId === chapterId ? { ...c, selectedOptionId: optionId } : c
    ));
  };

  const handleComment = (chapterId: string, comment: string) => {
    setChapters(prev => prev.map(c =>
      c.chapterId === chapterId ? { ...c, userComment: comment } : c
    ));
  };

  const handleLock = (chapterId: string) => {
    setChapters(prev => prev.map(c =>
      c.chapterId === chapterId ? { ...c, isLocked: true } : c
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

  const handleRenderOne = (_chapterId: string) => {
  };

  const handleRenderAll = async () => {
    setIsBatchRendering(true);
    for (const job of jobs) {
      setJobs(prev => prev.map(j =>
        j.chapterId === job.chapterId ? { ...j, status: 'rendering' as const, progress: 50, frame: 45, totalFrames: 90 } : j
      ));
      await new Promise(r => setTimeout(r, 1000));
      setJobs(prev => prev.map(j =>
        j.chapterId === job.chapterId ? { ...j, status: 'completed' as const, progress: 100 } : j
      ));
    }
    setIsBatchRendering(false);
  };

  const handleRemotionRenderComplete = (results: BrollResult[]) => {
    setBrollPaths(results.filter(r => r.success && r.outputPath));
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
              className={`px-3 py-1 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                phase === p ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
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
            scriptPath={data.conceptProposal}
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
            onSelect={handleSelect}
            onComment={handleComment}
            onLock={handleLock}
            onProceed={handleProceed}
          />
        )}

        {phase === 3 && (
          <Phase3View
            projectId={projectId}
            chapters={chapters}
            jobs={jobs}
            isBatchRendering={isBatchRendering}
            onRenderOne={handleRenderOne}
            onRenderAll={handleRenderAll}
            onRemotionRenderComplete={handleRemotionRenderComplete}
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
