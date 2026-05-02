import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Phase1View } from './director/Phase1View';
import { Phase2View } from './director/Phase2View';
import { Phase3View } from './director/Phase3View';
import { Phase4View } from './director/Phase4View';
import { DirectorWorkbenchShell } from './director/DirectorWorkbenchShell';
import type { DirectorModule, DirectorChapter, SceneOption, BRollType, RuntimeActionEvent, RuntimeData } from '../types';
import { useLLMConfig } from '../hooks/useLLMConfig';

interface DirectorSectionProps {
  projectId: string;
  scriptPath: string;
  socket: any;
  onRuntimeDataChange?: (data: RuntimeData) => void;
}

type Phase = 1 | 2 | 3 | 4;

import { useExpertState } from '../hooks/useExpertState';

export const DirectorSection = ({ projectId, scriptPath, socket, onRuntimeDataChange }: DirectorSectionProps) => {
  const { state: data, updateState } = useExpertState<DirectorModule>('Director', { phase: 1, conceptProposal: '', conceptFeedback: '', isConceptApproved: false, items: [], renderJobs: [] }, projectId);

  const onUpdate = (newData: DirectorModule) => {
    updateState(projectId, newData);
  };

  const phase = (data.phase || 1) as Phase;
  const conceptApproved = data.isConceptApproved || false;
  const chapters = (data.items || []) as DirectorChapter[];
  // Jobs and BrollPaths replaced by Phase3 SRT -> XML flow
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [pendingBatchTaskKeys, setPendingBatchTaskKeys] = useState<Set<string>>(new Set());
  const [streamingConcept, setStreamingConcept] = useState<string | null>(null);
  const concept = isGeneratingConcept ? streamingConcept : data.conceptProposal;

  const [isLoading, setIsLoading] = useState(false);
  const [localChapters, setLocalChapters] = useState<DirectorChapter[] | null>(null);
  const displayedChapters = localChapters || chapters;

  // 当服务器广播更新 data.items 时，清除 localChapters 覆盖，让 UI 显示最新数据
  // 只在非流式生成阶段清除（isLoading 为 true 时表示正在 Phase 2 流式生成，不应清除）
  useEffect(() => {
    if (localChapters !== null && !isLoading && chapters.length > 0) {
      console.log('[DirectorSection] 🔄 Server broadcast arrived, clearing localChapters override');
      setLocalChapters(null);
    }
  }, [data.items]);

  // Feature 2: elapsed time tracking
  const [startTime, setStartTime] = useState<number | null>(null);

  // Phase2 logs for debug panel
  const [phase2Logs, setPhase2Logs] = useState<{ timestamp: number; type: string; message: string }[]>([]);
  const [runtimeActions, setRuntimeActions] = useState<RuntimeActionEvent[]>([]);
  const pushRuntimeAction = useCallback((action: Omit<RuntimeActionEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: number }) => {
    setRuntimeActions(prev => {
      const timestamp = action.timestamp ?? Date.now();
      const nextAction: RuntimeActionEvent = {
        ...action,
        id: action.id ?? `${timestamp}-${prev.length}`,
        timestamp,
      };
      return [...prev, nextAction].slice(-30);
    });
  }, []);

  // ── 重置：切换项目或脚本时，自动回到 Phase 1 ──────────────────
  // 只在「真实项目切换」时重置，不在「初始加载」时重置
  const prevProjectId = useRef(projectId);
  const prevScriptPath = useRef(scriptPath);
  useEffect(() => {
    const prevId = prevProjectId.current;
    const prevScript = prevScriptPath.current;
    prevProjectId.current = projectId;
    prevScriptPath.current = scriptPath;

    const projectChanged = projectId !== prevId;
    const scriptChanged = scriptPath !== prevScript;

    // 初始选择（'' → 实际项目）不是"切换"，不重置
    // 只有从一个真实项目切到另一个真实项目才重置
    const isInitialSelection = !prevId;
    if (isInitialSelection) return;

    if ((projectChanged || scriptChanged) && (projectId || scriptPath)) {
      // 重置 expert state (phase/chapters/concept)
      updateState(projectId, {
        phase: 1,
        conceptProposal: '',
        conceptFeedback: '',
        isConceptApproved: false,
        items: [],
        renderJobs: [],
      });
      // 重置所有本地 state
      setIsGeneratingConcept(false);
      setStreamingConcept(null);
      setIsLoading(false);
      setLocalChapters(null);
      setStartTime(null);
      setPhase2Logs([]);
      setRuntimeActions([]);
      setPendingBatchTaskKeys(new Set());
      console.log('[Director] 🔄 项目/脚本切换，已重置到 Phase 1');
    }
  }, [projectId, scriptPath]);
  // ────────────────────────────────────────────────────────────

  const { status } = useLLMConfig();
  const currentModel = useMemo(
    () => status?.global?.provider
      ? { provider: status.global.provider, model: status.global.model || 'default' }
      : undefined,
    [status?.global?.provider, status?.global?.model]
  );

  const activeAction = useMemo(
    () => runtimeActions[runtimeActions.length - 1]?.status === 'pending'
      ? runtimeActions[runtimeActions.length - 1]
      : null,
    [runtimeActions]
  );

  useEffect(() => {
    onRuntimeDataChange?.({
      currentModel: currentModel || null,
      logs: phase2Logs,
      actions: runtimeActions,
      activeAction,
      isLoading: isLoading || isGeneratingConcept,
      startTime,
      phase,
    });
  }, [activeAction, currentModel, isGeneratingConcept, isLoading, onRuntimeDataChange, phase, phase2Logs, runtimeActions, startTime]);

  const getGlobalLLMConfigError = () => {
    if (!status?.global?.provider) return null;

    const providerStatus = status.providers?.[status.global.provider];
    if (providerStatus?.configured) {
      return null;
    }

    return `当前全局模型 ${status.global.provider}/${status.global.model || 'default'} 未配置可用 API Key。请先到“全局模型网关配置”补全对应 Key，或切换到已配置的全局 Provider。`;
  };

  const handleGenerateConcept = async () => {
    if (!scriptPath) {
      alert('Please select a script first in the header.');
      return;
    }

    const llmConfigError = getGlobalLLMConfigError();
    if (llmConfigError) {
      alert(llmConfigError);
      return;
    }

    setIsGeneratingConcept(true);
    setStreamingConcept('');
    const phase1StartTime = Date.now();
    setStartTime(phase1StartTime);
    pushRuntimeAction({
      type: 'generate',
      label: '生成',
      message: 'P1 开始生成视觉概念',
      status: 'pending',
      phase: 1,
    });
    console.log('[Phase1] 🚀 开始生成概念提案...');

    try {
      const response = await fetch('/api/director/phase1/generate', {
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
                  pushRuntimeAction({
                    type: 'generate',
                    label: '生成',
                    message: `P1 视觉概念生成完成，用时 ${elapsed} 秒`,
                    status: 'success',
                    phase: 1,
                  });
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
      pushRuntimeAction({
        type: 'generate',
        label: '生成',
        message: `P1 视觉概念生成失败：${e.message}`,
        status: 'error',
        phase: 1,
      });
      alert('Generation failed: ' + e.message);
    } finally {
      setIsGeneratingConcept(false);
      setStartTime(null);
    }
  };

  const handleReviseConcept = async (comment: string) => {
    if (!comment.trim()) return;

    const llmConfigError = getGlobalLLMConfigError();
    if (llmConfigError) {
      alert(llmConfigError);
      return;
    }

    setIsGeneratingConcept(true);
    const phase1ReviseStartTime = Date.now();
    setStartTime(phase1ReviseStartTime);
    pushRuntimeAction({
      type: 'revise',
      label: '修订',
      message: 'P1 开始按反馈修订视觉概念',
      status: 'pending',
      phase: 1,
    });
    try {
      const res = await fetch('/api/director/phase1/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userComment: comment })
      });
      const result = await res.json();
      if (result.success) {
        onUpdate({ ...data, conceptProposal: result.data.content });
        pushRuntimeAction({
          type: 'revise',
          label: '修订',
          message: `P1 视觉概念修订完成，用时 ${((Date.now() - phase1ReviseStartTime) / 1000).toFixed(1)} 秒`,
          status: 'success',
          phase: 1,
        });
      } else {
        console.error('Failed to revise concept:', result.error);
        pushRuntimeAction({
          type: 'revise',
          label: '修订',
          message: `P1 视觉概念修订失败：${result.error || '未知错误'}`,
          status: 'error',
          phase: 1,
        });
      }
    } catch (e: any) {
      console.error(e);
      pushRuntimeAction({
        type: 'revise',
        label: '修订',
        message: `P1 视觉概念修订失败：${e.message || '未知错误'}`,
        status: 'error',
        phase: 1,
      });
    } finally {
      setIsGeneratingConcept(false);
      setStartTime(null);
    }
  };

  const handleApproveConcept = () => {
    pushRuntimeAction({
      type: 'approve',
      label: '批准',
      message: 'P1 视觉概念已批准，进入 Phase 2',
      status: 'success',
      phase: 1,
    });
    onUpdate({ ...data, isConceptApproved: true, phase: 2 });
  };

  const handleConfirmBRoll = async (types: BRollType[]) => {
    if (!scriptPath) {
      alert('Please select a script first');
      return;
    }

    const llmConfigError = getGlobalLLMConfigError();
    if (llmConfigError) {
      alert(llmConfigError);
      return;
    }

    setIsLoading(true);
    const phase2StartTime = Date.now();
    setStartTime(phase2StartTime);
    setLocalChapters([]);
    setPhase2Logs([]);
    pushRuntimeAction({
      type: 'generate',
      label: '生成',
      message: `P2 开始生成视觉执行方案（${types.length} 类 B-Roll）`,
      status: 'pending',
      phase: 2,
    });

    try {
      // Feature 1: Clear chat history when regenerating Phase 2
      socket?.emit('chat-clear-history', { expertId: 'Director', projectId });

      const response = await fetch('/api/director/phase2/start', {
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
                const elapsed = ((Date.now() - phase2StartTime) / 1000).toFixed(1);
                console.log(`[Phase2] ✅ 视频方案生成完成，耗时 ${elapsed} 秒`);
                pushRuntimeAction({
                  type: 'generate',
                  label: '生成',
                  message: `P2 视觉执行方案生成完成，用时 ${elapsed} 秒`,
                  status: 'success',
                  phase: 2,
                });
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
      pushRuntimeAction({
        type: 'generate',
        label: '生成',
        message: `P2 视觉执行方案生成失败：${e.message}`,
        status: 'error',
        phase: 2,
      });
      alert('Generation failed: ' + e.message);
    } finally {
      setIsLoading(false);
      setStartTime(null);
    }
  };

  const handleSelectOption = (chapterId: string, optionId: string) => {
    const updated = displayedChapters.map(ch =>
      ch.chapterId === chapterId ? { ...ch, selectedOptionId: optionId, isChecked: false } : ch
    );
    setLocalChapters(null); // switch to data.items source
    pushRuntimeAction({
      type: 'select',
      label: '选择',
      message: `P2 已选中方案 ${chapterId}/${optionId}`,
      status: 'info',
      phase: 2,
      target: `${chapterId}/${optionId}`,
    });
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
    const option = displayedChapters.flatMap(ch => ch.options).find(opt => opt.id === optionId);
    pushRuntimeAction({
      type: 'approve',
      label: option?.isChecked ? '取消确认' : '确认',
      message: `P2 ${option?.isChecked ? '取消确认' : '确认'}方案 ${chapterId}/${optionId}`,
      status: 'success',
      phase: 2,
      target: `${chapterId}/${optionId}`,
    });
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
    pushRuntimeAction({
      type: 'approve',
      label: checked ? '批量确认' : '批量取消',
      message: `P2 ${checked ? '批量确认' : '批量取消'}当前筛选方案`,
      status: 'success',
      phase: 2,
    });
    onUpdate({ ...data, items: updated });
  };

  // ── Phase 3 mutation handlers (same pattern as Phase 2: mutate → persist → sync) ──

  const handlePhase3ApproveOption = (chapterId: string, optionId: string) => {
    const updated = chapters.map(c =>
      c.chapterId === chapterId
        ? { ...c, options: c.options.map(o => o.id === optionId ? { ...o, phase3Approved: !o.phase3Approved } : o) }
        : c
    );
    setLocalChapters(null);
    pushRuntimeAction({
      type: 'approve',
      label: '渲染审阅',
      message: `P3 切换方案批准状态 ${chapterId}/${optionId}`,
      status: 'success',
      phase: 3,
      target: `${chapterId}/${optionId}`,
    });
    onUpdate({ ...data, items: updated });
  };

  const handlePhase3UpdateOption = (chapterId: string, optionId: string, updates: Partial<SceneOption>) => {
    const updated = chapters.map(c =>
      c.chapterId === chapterId
        ? { ...c, options: c.options.map(o => o.id === optionId ? { ...o, ...updates } : o) }
        : c
    );
    setLocalChapters(null);
    pushRuntimeAction({
      type: 'revise',
      label: '修订',
      message: `P3 更新方案 ${chapterId}/${optionId}`,
      status: 'success',
      phase: 3,
      target: `${chapterId}/${optionId}`,
    });
    onUpdate({ ...data, items: updated });
  };

  const handlePhase3BatchApprove = (approved: boolean, filterFn?: (opt: SceneOption) => boolean) => {
    const updated = chapters.map(c => ({
      ...c,
      options: c.options.map(o => {
        if (filterFn && !filterFn(o)) return o;
        return { ...o, phase3Approved: approved };
      })
    }));
    setLocalChapters(null);
    pushRuntimeAction({
      type: 'approve',
      label: approved ? '批量批准' : '批量取消',
      message: `P3 ${approved ? '批量批准' : '批量取消'}渲染方案`,
      status: 'success',
      phase: 3,
    });
    onUpdate({ ...data, items: updated });
  };

  // Phase 2 → 3
  const handleProceedToPhase3 = () => {
    pushRuntimeAction({
      type: 'handoff',
      label: '交接',
      message: 'P2 已提交到 Phase 3 渲染审阅',
      status: 'success',
      phase: 2,
    });
    onUpdate({ ...data, phase: 3 });
  };

  // Phase 3 → 4
  const handleProceedToPhase4 = () => {
    pushRuntimeAction({
      type: 'handoff',
      label: '交接',
      message: 'P3 已提交到 Phase 4 交付检查',
      status: 'success',
      phase: 3,
    });
    onUpdate({ ...data, phase: 4 });
  };

  // Legacy alias
  const handleProceed = handleProceedToPhase3;

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
    pushRuntimeAction({
      type: 'sync',
      label: '导入',
      message: `P2 导入 ${normalized.length} 个章节方案`,
      status: 'success',
      phase: 2,
    });
    onUpdate({ ...data, items: normalized, phase: 2 });
  };

  const handlePhaseChange = (newPhase: Phase) => {
    pushRuntimeAction({
      type: 'handoff',
      label: '阶段切换',
      message: `切换到 Phase ${newPhase}`,
      status: 'info',
      phase: newPhase,
    });
    onUpdate({ ...data, phase: newPhase });
  };

  return (
    <DirectorWorkbenchShell
      projectId={projectId}
      phase={phase}
      conceptApproved={conceptApproved}
      hasChapters={chapters.length > 0}
      onPhaseChange={handlePhaseChange}
    >
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
          onConfirmBRoll={handleConfirmBRoll}
          onSelect={handleSelectOption}
          onToggleCheck={handleToggleCheck}
          onBatchSetCheck={handleBatchSetCheck}
          onProceed={handleProceed}
          pendingTaskKeys={pendingBatchTaskKeys}
          onRuntimeAction={pushRuntimeAction}
        />
      )}

      {phase === 3 && (
        <Phase3View
          projectId={projectId}
          chapters={displayedChapters}
          onApproveOption={handlePhase3ApproveOption}
          onUpdateOption={handlePhase3UpdateOption}
          onBatchApprove={handlePhase3BatchApprove}
          onProceed={handleProceedToPhase4}
        />
      )}

      {phase === 4 && (
        <Phase4View
          projectId={projectId}
          chapters={chapters}
        />
      )}
    </DirectorWorkbenchShell>
  );
};
