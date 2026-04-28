import type { ReactNode } from 'react';
import { CrucibleWorkspace } from '../../components/CrucibleWorkspace';
import type { CrucibleWorkspaceArtifactState } from '../../components/crucible/CrucibleWorkspaceView';
import type { HostRoutedAsset } from '../../types';
import { Stage } from '../../shell/primitives';

interface CrucibleStageProps {
  conversation?: ReactNode;
  workspaceKey: number;
  projectId: string;
  scriptPath: string;
  workspaceId: string | null;
  incomingAssets: HostRoutedAsset[];
  topicTitle: string;
  seedPrompt: string;
  seedPromptVersion: number;
  onResetWorkspace: () => void;
  onRoundGenerated: (payload: {
    speaker: string;
    reflection: string;
    source: 'socrates' | 'fallback';
    roundIndex: number;
  }) => void;
  onBlackboardStateChange: (payload: { hasContent: boolean }) => void;
  onTurnSettled: () => void;
  onConversationStateChange: (payload: { conversationId?: string; roundIndex: number }) => void;
  onTurnError: (payload: { message: string; code?: string }) => void;
  onArtifactStateChange?: (payload: CrucibleWorkspaceArtifactState) => void;
}

export function CrucibleStage({
  conversation,
  workspaceKey,
  projectId,
  scriptPath,
  workspaceId,
  incomingAssets,
  topicTitle,
  seedPrompt,
  seedPromptVersion,
  onResetWorkspace,
  onRoundGenerated,
  onBlackboardStateChange,
  onTurnSettled,
  onConversationStateChange,
  onTurnError,
  onArtifactStateChange,
}: CrucibleStageProps) {
  return (
    <Stage className="h-full">
      <Stage.Body className="p-0" style={{ padding: 0 }}>
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1">
            {conversation}
          </div>

          <div className="hidden" aria-hidden="true">
            <CrucibleWorkspace
              key={workspaceKey}
              projectId={projectId}
              scriptPath={scriptPath}
              workspaceId={workspaceId}
              incomingAssets={incomingAssets}
              topicTitle={topicTitle}
              seedPrompt={seedPrompt}
              seedPromptVersion={seedPromptVersion}
              onResetWorkspace={onResetWorkspace}
              onRoundGenerated={onRoundGenerated}
              onBlackboardStateChange={onBlackboardStateChange}
              onTurnSettled={onTurnSettled}
              onConversationStateChange={onConversationStateChange}
              onTurnError={onTurnError}
              onArtifactStateChange={onArtifactStateChange}
            />
          </div>
        </div>
      </Stage.Body>
    </Stage>
  );
}
