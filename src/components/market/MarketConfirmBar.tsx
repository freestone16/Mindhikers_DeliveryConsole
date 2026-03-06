/**
 * MarketConfirmBar.tsx — Sprint 5: Phase 2 确认并导出操作栏
 *
 * 当所有 plans 至少有一套为 'ready' 时出现在 Phase 2 底部。
 * 点击导出按钮调用 POST /api/market/v3/confirm，
 * 生成双格式文件（.md + .plain.txt）并显示成功路径。
 */
import React, { useState } from 'react';
import { Download, CheckCircle2, Loader2, FileText, ExternalLink } from 'lucide-react';
import type { MarketingPlan } from '../../types';

interface MarketConfirmBarProps {
    plans: MarketingPlan[];
    projectId: string;
    onExportDone?: (paths: string[]) => void;
}

export const MarketConfirmBar: React.FC<MarketConfirmBarProps> = ({
    plans,
    projectId,
    onExportDone,
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportedPaths, setExportedPaths] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const readyPlans = plans.filter(p => p.generationStatus === 'ready' && p.rows.length > 0);
    const confirmedPlans = readyPlans.filter(p => p.rows.every(r => r.isConfirmed));

    if (readyPlans.length === 0) return null;

    const allConfirmed = confirmedPlans.length === readyPlans.length;

    const handleExport = async () => {
        setIsExporting(true);
        setError(null);
        setExportedPaths([]);

        try {
            const res = await fetch('/api/market/v3/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, plans: readyPlans }),
            });

            if (!res.ok) throw new Error();
            const data = await res.json();
            const paths: string[] = data.paths || [];
            setExportedPaths(paths);
            onExportDone?.(paths);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="mt-4 rounded-xl border border-slate-700 overflow-hidden">
            {/* Status summary */}
            <div className="bg-slate-800/60 px-4 py-3 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${allConfirmed ? 'text-green-400' : 'text-slate-500'}`} />
                    <span className="text-sm text-slate-300">
                        已确认方案：
                        <span className={allConfirmed ? 'text-green-400 font-semibold' : 'text-slate-400'}>
                            {confirmedPlans.length}
                        </span>
                        <span className="text-slate-600"> / {readyPlans.length}</span>
                    </span>
                </div>

                {readyPlans.map(plan => {
                    const allRowsConfirmed = plan.rows.every(r => r.isConfirmed);
                    const confirmedRows = plan.rows.filter(r => r.isConfirmed).length;
                    return (
                        <div key={plan.keywordId} className="flex items-center gap-1.5 text-xs">
                            <span className={allRowsConfirmed ? 'text-green-400' : 'text-slate-500'}>
                                {allRowsConfirmed ? '✅' : '○'}
                            </span>
                            <span className="text-slate-400">{plan.keyword}</span>
                            {!allRowsConfirmed && (
                                <span className="text-slate-600">({confirmedRows}/{plan.rows.length}项)</span>
                            )}
                        </div>
                    );
                })}

                <div className="ml-auto flex items-center gap-2">
                    {!allConfirmed && (
                        <span className="text-xs text-slate-500">确认所有方案行后可导出</span>
                    )}
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            isExporting
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : allConfirmed
                                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                    >
                        {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        {isExporting ? '导出中...' : allConfirmed ? '✅ 确认并导出' : '导出当前方案'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="px-4 py-2 bg-red-900/20 border-t border-red-900/30 text-xs text-red-400">
                    ❌ 导出失败：{error}
                </div>
            )}

            {/* Success */}
            {exportedPaths.length > 0 && (
                <div className="px-4 py-3 bg-green-900/15 border-t border-green-900/20">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-300 font-medium">导出成功！已生成 {exportedPaths.length} 个文件</span>
                    </div>
                    <div className="space-y-1">
                        {exportedPaths.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                                <FileText className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                <span className="text-slate-400 font-mono truncate">{p}</span>
                                <ExternalLink className="w-3 h-3 text-slate-600 flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        .md 文件：结构化存档 · .plain.txt 文件：可直接复制到 YouTube Studio
                    </p>
                </div>
            )}
        </div>
    );
};
