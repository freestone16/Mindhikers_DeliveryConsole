import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { BRollSelector } from './BRollSelector';
import { ChapterCard } from './ChapterCard';
import type { DirectorChapter, BRollType } from '../../types';

interface Phase2ViewProps {
  projectId: string;
  chapters: DirectorChapter[];
  isLoading: boolean;
  loadingProgress: string;
  onConfirmBRoll: (types: BRollType[]) => void;
  onSelect: (chapterId: string, optionId: string) => void;
  onComment: (chapterId: string, comment: string) => void;
  onLock: (chapterId: string) => void;
  onProceed: () => void;
}

export const Phase2View = ({
  projectId,
  chapters,
  isLoading,
  loadingProgress,
  onConfirmBRoll,
  onSelect,
  onComment,
  onLock,
  onProceed,
}: Phase2ViewProps) => {
  const [brollSelections, setBrollSelections] = useState<BRollType[]>(['remotion', 'seedance', 'artlist']);
  const [brollConfirmed, setBrollConfirmed] = useState(false);

  const allLocked = chapters.length > 0 && chapters.every(c => c.isLocked);

  const handleConfirmBRoll = () => {
    if (brollSelections.length === 0) return;
    setBrollConfirmed(true);
    onConfirmBRoll(brollSelections);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
        <h3 className="text-sm text-slate-400 uppercase font-bold mb-3">
          Select B-Roll Types
        </h3>
        <BRollSelector
          selected={brollSelections}
          onChange={setBrollSelections}
          disabled={brollConfirmed}
        />
        {!brollConfirmed && (
          <button
            onClick={handleConfirmBRoll}
            disabled={brollSelections.length === 0}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium"
          >
            Confirm & Generate Previews
          </button>
        )}
      </div>

      {isLoading && (
        <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-white">Generating previews...</span>
          </div>
        </div>
      )}

      {chapters.length > 0 && (
        <div className="flex flex-col gap-4">
          {chapters.map(chapter => (
            <ChapterCard
              key={chapter.chapterId}
              chapter={chapter}
              projectId={projectId}
              onSelect={onSelect}
              onComment={onComment}
              onLock={onLock}
            />
          ))}
        </div>
      )}

      {allLocked && (
        <div className="flex justify-end">
          <button
            onClick={onProceed}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            Proceed to Render Console
          </button>
        </div>
      )}
    </div>
  );
};
