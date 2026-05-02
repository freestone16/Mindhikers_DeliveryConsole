/**
 * MarketingSection.tsx — 营销大师 2-Phase 编排器
 *
 * SD-207 V3 重构：
 *   Phase 1: 黄金关键词发掘（LLM候选词 → TubeBuddy评分 → 选择）
 *   Phase 2: 营销方案生成与审阅（SRT+Tab+表格+ChatPanel+双格式输出）
 *
 * 复用模式：与 DirectorSection / ShortsSection 保持一致
 *   - useExpertState hook 管理状态 + Socket.IO 持久化
 *   - Props: { projectId, scriptPath, socket }
 */
import React, { useState, useEffect, useRef } from 'react';
import type { MarketModule_V3 } from '../types';
import { useExpertState } from '../hooks/useExpertState';
import { MarketPhase1New } from './market/MarketPhase1New';
import { MarketPhase2New } from './market/MarketPhase2New';
import { MarketDefaultSettings } from './market/MarketDefaultSettings';
import { MarketingWorkbenchShell } from './market/MarketingWorkbenchShell';
import { defaultMarketV3State } from '../mocks/marketMockDataV3';

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface MarketingSectionProps {
    projectId: string;
    scriptPath: string;
    scriptSelectedAt?: string;
    socket: any;
}

// ─────────────────────────────────────────────────────────────
// 组件
// ─────────────────────────────────────────────────────────────
export const MarketingSection: React.FC<MarketingSectionProps> = ({
    projectId,
    scriptPath,
    scriptSelectedAt,
    socket: _socket,
}) => {
    // 状态管理（通过 useExpertState 实现 Socket.IO 持久化同步）
    const { state: rawData, updateState } = useExpertState<MarketModule_V3>(
        'MarketingMaster',
        defaultMarketV3State,
    );

    // 兼容性修复：合并 defaultMarketV3State，确保 V2 旧格式状态不会导致缺字段
    // （旧 V2 state 有 phase 字段但缺少 phase1SubStep / candidates 等 V3 字段）
    const data: MarketModule_V3 = { ...defaultMarketV3State, ...(rawData as Partial<MarketModule_V3>) };

    // ── 文稿变化检测：选了文稿（含重新选同一个）则 Reset 全部营销状态 ──
    const prevSelectedAtRef = useRef<string | undefined>(undefined);
    const hasHandledScriptRef = useRef(false);
    useEffect(() => {
        if (!scriptPath) return;
        const storedPath = data.selectedScript?.path;
        const storedSelectedAt = data.selectedScript?.selectedAt;
        const scriptFilename = scriptPath.split('/').pop() || scriptPath;
        const selectedScript = { filename: scriptFilename, path: scriptPath, selectedAt: scriptSelectedAt };

        // 首次挂载：记录 selectedAt，只做必要的 legacy 回填或 path 不同的 reset
        if (prevSelectedAtRef.current === undefined) {
            prevSelectedAtRef.current = scriptSelectedAt;

            if (!storedPath) {
                // Legacy state（没记录过 scriptPath）→ 只回填，不 reset
                if (data.candidates?.length > 0 && !hasHandledScriptRef.current) {
                    hasHandledScriptRef.current = true;
                    updateState(projectId, {
                        ...data,
                        selectedScript,
                    });
                }
            } else if (storedPath !== scriptPath) {
                // 挂载时发现路径已不同 → Reset
                console.log(`[MarketingMaster] 文稿已切换: ${storedPath} → ${scriptPath}，重置状态`);
                updateState(projectId, {
                    ...defaultMarketV3State,
                    selectedScript,
                });
            } else if (scriptSelectedAt && storedSelectedAt && storedSelectedAt !== scriptSelectedAt) {
                // 重新打开页面时也能识别：delivery_store 的脚本选择时间比营销状态更新。
                console.log(`[MarketingMaster] 文稿重新选择时间变化 → 重置状态回 Phase 1`);
                updateState(projectId, {
                    ...defaultMarketV3State,
                    selectedScript,
                });
            } else if (scriptSelectedAt && !storedSelectedAt && data.candidates?.length > 0 && !hasHandledScriptRef.current) {
                // 旧状态没有 selectedAt 时只补记，不重置，保证关闭窗口后能恢复历史进度。
                hasHandledScriptRef.current = true;
                updateState(projectId, {
                    ...data,
                    selectedScript,
                });
            }
            return;
        }

        // 非首次挂载：selectedAt 变了 = 用户重新点选了文稿（不管路径是否相同）→ Reset
        if (scriptSelectedAt && scriptSelectedAt !== prevSelectedAtRef.current) {
            prevSelectedAtRef.current = scriptSelectedAt;
            console.log(`[MarketingMaster] 文稿重新选择 → 重置状态回 Phase 1`);
            updateState(projectId, {
                ...defaultMarketV3State,
                selectedScript,
            });
            return;
        }

        // path 变了（可能来自其他来源的更新）→ Reset
        if (storedPath && storedPath !== scriptPath) {
            prevSelectedAtRef.current = scriptSelectedAt;
            console.log(`[MarketingMaster] 文稿路径变化: ${storedPath} → ${scriptPath}，重置状态`);
            updateState(projectId, {
                ...defaultMarketV3State,
                selectedScript,
            });
        }
    }, [scriptPath, scriptSelectedAt, data.selectedScript?.path, data.selectedScript?.selectedAt]);

    // 默认设置面板开关
    const [showSettings, setShowSettings] = useState(false);

    // ── 核心 update 函数：自动附带当前 scriptPath ──
    const onUpdate = (newData: MarketModule_V3) => {
        const scriptFilename = scriptPath.split('/').pop() || scriptPath;
        updateState(projectId, {
            ...newData,
            selectedScript: { filename: scriptFilename, path: scriptPath, selectedAt: scriptSelectedAt },
        });
    };

    // ── Phase 切换 ──
    const handleGoToPhase = (phase: 1 | 2) => {
        onUpdate({ ...data, phase });
    };

    return (
        <MarketingWorkbenchShell
            data={data}
            projectId={projectId}
            scriptPath={scriptPath}
            currentPhase={data.phase}
            onPhaseChange={handleGoToPhase}
            onOpenSettings={() => setShowSettings(true)}
        >
            {data.phase === 1 ? (
                <MarketPhase1New
                    data={data}
                    projectId={projectId}
                    scriptPath={scriptPath}
                    onUpdate={onUpdate}
                    onGoToPhase2={() => handleGoToPhase(2)}
                />
            ) : (
                <MarketPhase2New
                    data={data}
                    projectId={projectId}
                    onUpdate={onUpdate}
                    onGoToPhase1={() => handleGoToPhase(1)}
                />
            )}

            {/* ═══════════════════════════════════════════════════════
                默认设置 Modal
            ═══════════════════════════════════════════════════════ */}
            {showSettings && (
                <MarketDefaultSettings projectId={projectId} onClose={() => setShowSettings(false)} />
            )}
        </MarketingWorkbenchShell>
    );
};
