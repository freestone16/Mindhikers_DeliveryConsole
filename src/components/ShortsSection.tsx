import { useState, useEffect } from 'react';
import { Video, Rocket } from 'lucide-react';
import { ShortsPhase1 } from './shorts/ShortsPhase1';
import { ShortsPhase2 } from './shorts/ShortsPhase2';
import { ShortsPhase3 } from './shorts/ShortsPhase3';
import type { ShortsModule, ShortsModule_V2, ShortScript, ShortRenderUnit, ExpertDataUpdate } from '../types';
import { useDeliveryStore } from '../hooks/useDeliveryStore';

interface ShortsSectionProps {
    data: ShortsModule | ShortsModule_V2;
    projectId: string;
    scriptPath: string;
    onUpdate: (newData: ShortsModule_V2) => void;
}

type Phase = 1 | 2 | 3;

const isV2 = (data: ShortsModule | ShortsModule_V2): data is ShortsModule_V2 => {
    return 'phase' in data && typeof data.phase === 'number';
};

export const ShortsSection = ({ data, projectId, scriptPath: _scriptPath, onUpdate }: ShortsSectionProps) => {
    const initialData = isV2(data) ? data : { phase: 1 as Phase, scripts: [], renderUnits: [], subtitleConfigs: [] };
    
    const [phase, setPhase] = useState<Phase>(initialData.phase);
    const [scripts, setScripts] = useState<ShortScript[]>(initialData.scripts);
    const [renderUnits, setRenderUnits] = useState<ShortRenderUnit[]>(initialData.renderUnits);
    const [lastModifiedId, setLastModifiedId] = useState<string | null>(null);

    // 同步 phase 从全局状态
    useEffect(() => {
        if (initialData.phase !== undefined) {
            setPhase(initialData.phase);
        }
    }, [initialData.phase]);

    const { socket } = useDeliveryStore();

    // SD-207.1: 监听来自 Chat Panel 的修改更新
    useEffect(() => {
        if (!socket) return;

        const handleExpertUpdate = ({ expertId, action, data: updateData }: ExpertDataUpdate) => {
            if (expertId !== 'ShortsMaster') return;
            
            console.log('[Shorts] Received update from Chat:', action, updateData);

            // 处理单个脚本更新
            if (updateData.scriptId && updateData.updates) {
                setScripts(prev => prev.map(s => {
                    if (s.id === updateData.scriptId) {
                        const updated = { ...s, ...updateData.updates };
                        return updated;
                    }
                    return s;
                }));
                setLastModifiedId(updateData.scriptId);
                
                // 3秒后清除高亮
                setTimeout(() => setLastModifiedId(null), 3000);
                
                // 同步到后端
                onUpdate({
                    ...initialData,
                    scripts: scripts.map(s => 
                        s.id === updateData.scriptId 
                            ? { ...s, ...updateData.updates }
                            : s
                    )
                });
            }

            // 处理批量更新
            if (updateData.scripts && Array.isArray(updateData.scripts)) {
                setScripts(prev => {
                    const updated = prev.map(s => {
                        const change = updateData.scripts!.find((c: any) => c.scriptId === s.id);
                        return change ? { ...s, ...change.updates } : s;
                    });
                    onUpdate({ ...initialData, scripts: updated });
                    return updated;
                });
            }
        };

        socket.on('expert-data-update', handleExpertUpdate);
        
        return () => {
            socket.off('expert-data-update', handleExpertUpdate);
        };
    }, [socket, initialData, scripts, onUpdate]);

    const handleGenerated = (newScripts: ShortScript[]) => {
        setScripts(newScripts);
        setPhase(2);
        onUpdate({ ...initialData, phase: 2, scripts: newScripts });
    };

    // 同步 phase 变更到全局 store
    const handlePhaseChange = (newPhase: Phase) => {
        setPhase(newPhase);
        onUpdate({ ...initialData, phase: newPhase });
    };

    const handleScriptsUpdate = (updatedScripts: ShortScript[]) => {
        setScripts(updatedScripts);
        onUpdate({ ...initialData, scripts: updatedScripts });
    };

    const handleConfirmAll = () => {
        const newRenderUnits: ShortRenderUnit[] = scripts.map(s => ({
            id: s.id,
            shortScriptId: s.id,
            aroll: { confirmed: false },
            brolls: [],
            thumbnail: { confirmed: false },
            subtitle: { segments: [], configId: 'preset-1', confirmed: false },
            bgm: { source: 'preset' as const },
            headerOverlay: true,
            renderStatus: 'pending' as const,
        }));
        setRenderUnits(newRenderUnits);
        setPhase(3);
        onUpdate({ ...initialData, phase: 3, scripts, renderUnits: newRenderUnits });
    };

    const handleRenderUnitsUpdate = (units: ShortRenderUnit[]) => {
        setRenderUnits(units);
        onUpdate({ ...initialData, renderUnits: units });
    };

    const phaseLabels: Record<Phase, string> = {
        1: 'Script Factory',
        2: 'Refinement',
        3: 'Render & Delivery'
    };

    const phaseColors: Record<Phase, string> = {
        1: 'bg-yellow-500/20 text-yellow-300',
        2: 'bg-blue-500/20 text-blue-300',
        3: 'bg-purple-500/20 text-purple-300'
    };

    const canEnterPhase = (p: Phase): boolean => {
        if (p === 1) return true;
        if (p === 2) return scripts.length > 0;
        if (p === 3) return renderUnits.length > 0;
        return false;
    };

    const hasCompletedRenders = renderUnits.some(u => u.renderStatus === 'completed');

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-cyan-400" />
                    <h2 className="font-semibold text-white">Shorts Master</h2>
                    <span className={`px-2 py-0.5 rounded text-xs ml-2 ${phaseColors[phase]}`}>
                        Phase {phase}: {phaseLabels[phase]}
                    </span>
                    {phase === 3 && hasCompletedRenders && (
                        <span className="px-2 py-0.5 rounded text-xs ml-2 bg-green-500/20 text-green-300 flex items-center gap-1">
                            <Rocket className="w-3 h-3" /> Ready for Delivery
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    {[1, 2, 3].map(p => (
                        <button
                            key={p}
                            onClick={() => canEnterPhase(p as Phase) && handlePhaseChange(p as Phase)}
                            disabled={!canEnterPhase(p as Phase)}
                            className={`px-3 py-1 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                                phase === p 
                                    ? 'bg-cyan-600 text-white' 
                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                        >
                            P{p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6">
                {phase === 1 && (
                    <ShortsPhase1
                        projectId={projectId}
                        onGenerated={handleGenerated}
                    />
                )}

                {phase === 2 && (
                    <ShortsPhase2
                        projectId={projectId}
                        scripts={scripts}
                        onScriptsUpdate={handleScriptsUpdate}
                        onConfirmAll={handleConfirmAll}
                        highlightedScriptId={lastModifiedId}
                    />
                )}

                {phase === 3 && (
                    <ShortsPhase3
                        projectId={projectId}
                        scripts={scripts}
                        renderUnits={renderUnits}
                        onRenderUnitsUpdate={handleRenderUnitsUpdate}
                    />
                )}
            </div>
        </div>
    );
};
