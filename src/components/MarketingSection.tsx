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
import React, { useState } from 'react';
import { TrendingUp, ChevronRight, Settings } from 'lucide-react';
import type { MarketModule_V3 } from '../types';
import { useExpertState } from '../hooks/useExpertState';
import { MarketPhase1New } from './market/MarketPhase1New';
import { MarketPhase2New } from './market/MarketPhase2New';
import { MarketDefaultSettings } from './market/MarketDefaultSettings';
import { defaultMarketV3State } from '../mocks/marketMockDataV3';

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface MarketingSectionProps {
    projectId: string;
    scriptPath: string;
    socket: any;
}

// ─────────────────────────────────────────────────────────────
// 组件
// ─────────────────────────────────────────────────────────────
export const MarketingSection: React.FC<MarketingSectionProps> = ({
    projectId,
    scriptPath,
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

    // 默认设置面板开关
    const [showSettings, setShowSettings] = useState(false);

    // ── 核心 update 函数 ──
    const onUpdate = (newData: MarketModule_V3) => {
        updateState(projectId, newData);
    };

    // ── Phase 切换 ──
    const handleGoToPhase = (phase: 1 | 2) => {
        onUpdate({ ...data, phase });
    };

    // ── 当前 Phase 标签 ──
    const phaseConfig: Array<{ phase: 1 | 2; label: string; subLabel: string }> = [
        { phase: 1, label: 'Phase 1', subLabel: '黄金关键词发掘' },
        { phase: 2, label: 'Phase 2', subLabel: '营销方案生成与审阅' },
    ];

    return (
        <div className="space-y-6">
            {/* ═══════════════════════════════════════════════════════
                头部 — 标题 + 阶段导航 + 设置入口
            ═══════════════════════════════════════════════════════ */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                {/* 标题行 */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-400" />
                        <h2 className="font-semibold text-white">营销大师</h2>
                        <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-xs font-mono">
                            SD-207
                        </span>
                        <span className="text-slate-600 text-xs">|</span>
                        <span className="text-slate-500 text-xs">TubeBuddy SEO 优化 · YouTube Studio 全流程</span>
                    </div>
                    {/* 设置按钮 */}
                    <button
                        onClick={() => setShowSettings(true)}
                        title="平台默认设置"
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>

                {/* Phase 导航 */}
                <div className="px-4 py-3 bg-slate-900/30 flex items-center gap-2">
                    {phaseConfig.map(({ phase, label, subLabel }, idx) => {
                        const isActive = data.phase === phase;
                        const isDone = data.phase > phase;
                        return (
                            <React.Fragment key={phase}>
                                <button
                                    onClick={() => handleGoToPhase(phase)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                                            : isDone
                                            ? 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                                            : 'bg-slate-700/40 text-slate-500 hover:bg-slate-700/60'
                                    }`}
                                >
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                        isActive ? 'bg-white/20'
                                        : isDone ? 'bg-green-600 text-white'
                                        : ''
                                    }`}>
                                        {isDone ? '✓' : phase}
                                    </span>
                                    <span>{label}</span>
                                    <span className={`text-xs hidden sm:inline ${isActive ? 'text-orange-200' : 'text-slate-500'}`}>
                                        {subLabel}
                                    </span>
                                </button>
                                {idx < phaseConfig.length - 1 && (
                                    <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                                )}
                            </React.Fragment>
                        );
                    })}

                    {/* 脚本信息（右侧） */}
                    {data.selectedScript && (
                        <div className="ml-auto flex items-center gap-1.5 text-slate-500 text-xs">
                            <span>📄</span>
                            <span className="font-mono max-w-[200px] truncate" title={data.selectedScript.path}>
                                {data.selectedScript.filename}
                            </span>
                        </div>
                    )}
                    {!data.selectedScript && scriptPath && (
                        <div className="ml-auto text-slate-600 text-xs font-mono truncate max-w-[200px]" title={scriptPath}>
                            {scriptPath.split('/').pop()}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
                Phase 内容区
            ═══════════════════════════════════════════════════════ */}
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
        </div>
    );
};
