import { useState } from 'react';
import type { ShortScript, ShortRenderUnit } from '../../types';
import { ShortCard } from './ShortCard';

interface ShortsPhase3Props {
    projectId: string;
    scripts: ShortScript[];
    renderUnits: ShortRenderUnit[];
    onRenderUnitsUpdate: (units: ShortRenderUnit[]) => void;
}

export const ShortsPhase3 = ({ projectId, scripts, renderUnits, onRenderUnitsUpdate }: ShortsPhase3Props) => {
    const [headerConfig, setHeaderConfig] = useState({
        enabled: true,
        leftLogo: '',
        rightLogo: '',
        centerText: 'MindHikers'
    });

    const handleUnitUpdate = (unitId: string, updates: Partial<ShortRenderUnit>) => {
        onRenderUnitsUpdate(renderUnits.map(u =>
            u.id === unitId ? { ...u, ...updates } : u
        ));
    };

    const getScript = (unit: ShortRenderUnit): ShortScript | undefined => {
        return scripts.find(s => s.id === unit.shortScriptId);
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-white mb-3">全局页眉配置</h3>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                            type="checkbox"
                            checked={headerConfig.enabled}
                            onChange={(e) => setHeaderConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                            className="rounded border-slate-600"
                        />
                        启用页眉
                    </label>
                    <input
                        type="text"
                        value={headerConfig.centerText}
                        onChange={(e) => setHeaderConfig(prev => ({ ...prev, centerText: e.target.value }))}
                        placeholder="中间文字"
                        className="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                    />
                </div>
            </div>

            <div className="space-y-4">
                {renderUnits.map(unit => (
                    <ShortCard
                        key={unit.id}
                        projectId={projectId}
                        script={getScript(unit)}
                        renderUnit={unit}
                        onUpdate={(updates) => handleUnitUpdate(unit.id, updates)}
                    />
                ))}
            </div>
        </div>
    );
};
