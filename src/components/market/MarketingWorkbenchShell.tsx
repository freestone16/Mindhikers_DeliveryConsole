import { useEffect, useState } from 'react';
import {
    BarChart3,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Eye,
    FileText,
    Image,
    Megaphone,
    Music,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
    PenTool,
    Settings,
    Sparkles,
    Video,
} from 'lucide-react';
import type { MarketModule_V3 } from '../../types';
import '../../styles/marketing-workbench.css';

export type ProductionPhase = 1 | 2 | 3 | 4;

interface MarketingWorkbenchShellProps {
    data: MarketModule_V3;
    projectId: string;
    scriptPath: string;
    currentPhase: ProductionPhase;
    onPhaseChange: (phase: ProductionPhase) => void;
    onOpenSettings: () => void;
    children: React.ReactNode;
}

const deliveryModules = [
    { label: '影视导演', icon: PenTool },
    { label: '短视频', icon: Video },
    { label: '缩略图', icon: Image },
    { label: '音乐', icon: Music },
    { label: '营销', icon: Megaphone, active: true },
    { label: '视觉审计', icon: Eye },
];

function shortName(path: string) {
    return path.split('/').pop() || '未选择文稿';
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'green' | 'gold' | 'blue' }) {
    const toneClass = {
        default: 'text-[#342d24]',
        green: 'text-[#62835c]',
        gold: 'text-[#9a622f]',
        blue: 'text-[#5b8a9b]',
    }[tone];

    return (
        <div className="min-w-0 rounded-md border border-[#e4dbcc] bg-[#fffcf7] px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8f8372]">{label}</div>
            <div className={`mt-1 truncate text-sm font-semibold ${toneClass}`}>{value}</div>
        </div>
    );
}

export function MarketingWorkbenchShell({
    data,
    projectId,
    scriptPath,
    currentPhase,
    onPhaseChange,
    onOpenSettings,
    children,
}: MarketingWorkbenchShellProps) {
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(currentPhase === 2);
    const [rightTouched, setRightTouched] = useState(false);

    useEffect(() => {
        if (!rightTouched) {
            setRightCollapsed(currentPhase === 2);
        }
    }, [currentPhase, rightTouched]);

    const scriptName = data.selectedScript?.filename || shortName(scriptPath);
    const scoredVariants = data.candidates.flatMap(candidate => candidate.variants).filter(variant => variant.status === 'scored').length;
    const totalVariants = data.candidates.flatMap(candidate => candidate.variants).length;
    const readyPlans = data.plans.filter(plan => plan.generationStatus === 'ready').length;
    const generatingPlans = data.plans.filter(plan => plan.generationStatus === 'generating').length;
    const hasReadyPlans = readyPlans > 0;
    const phases: Array<{ phase: ProductionPhase; code: string; label: string; enabled: boolean }> = [
        { phase: 1, code: 'P1', label: '关键词与定位', enabled: true },
        { phase: 2, code: 'P2', label: '发布文案审阅', enabled: true },
        { phase: 3, code: 'P3', label: '平台适配', enabled: hasReadyPlans },
        { phase: 4, code: 'P4', label: '导出与交接', enabled: false },
    ];

    return (
        <div className="marketing-workbench-shell min-h-[calc(100vh-180px)] overflow-hidden rounded-lg border border-[#e4dbcc] bg-[#f4efe5] text-[#342d24] shadow-[0_8px_24px_rgba(88,67,42,0.06)]">
            <div className="grid h-11 grid-cols-[minmax(0,1fr)_auto] items-center border-b border-[#e4dbcc] bg-[#faf6ef]/95 px-4">
                <div className="flex min-w-0 items-center gap-3 text-sm">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#d8c8ae] bg-[#fff5ea] font-serif font-semibold text-[#c97545]">
                        M
                    </div>
                    <span className="font-serif text-base font-semibold text-[#2c2823]">营销大师工作台</span>
                    <span className="text-[#c1b5a6]">/</span>
                    <span className="truncate font-medium text-[#5f5549]">{projectId || '未选择项目'}</span>
                    <span className="text-[#c1b5a6]">/</span>
                    <FileText className="h-3.5 w-3.5 shrink-0 text-[#8f8372]" />
                    <span className="truncate text-[#6f6458]">{scriptName}</span>
                </div>
                <button
                    onClick={onOpenSettings}
                    className="grid h-8 w-8 place-items-center rounded-md text-[#8f8372] hover:bg-[#e4dbcc]/50 hover:text-[#342d24]"
                    title="平台默认设置"
                >
                    <Settings className="h-4 w-4" />
                </button>
            </div>

            <div className="flex min-h-[calc(100vh-224px)] overflow-hidden">
                <aside className={`${leftCollapsed ? 'w-[60px]' : 'w-[260px]'} shrink-0 border-r border-[#e4dbcc] bg-[#f8f4ec] transition-[width] duration-200`}>
                    <div className="flex h-full flex-col">
                        <button
                            onClick={() => setLeftCollapsed(value => !value)}
                            className="grid h-11 place-items-center border-b border-[#e4dbcc] text-[#8f8372] hover:bg-[#e4dbcc]/35 hover:text-[#342d24]"
                            title={leftCollapsed ? '展开左栏' : '收起左栏'}
                        >
                            {leftCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                        </button>

                        <div className="p-3">
                            {!leftCollapsed && (
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8f8372]">工作站</div>
                            )}
                            <nav className="space-y-1">
                                {deliveryModules.map(item => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.label}
                                            title={item.label}
                                            className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors ${
                                                item.active
                                                    ? 'border-[#d8c8ae] bg-[#fffcf7] font-semibold text-[#342d24]'
                                                    : 'border-transparent text-[#8f8372] hover:border-[#e4dbcc] hover:bg-[#fffcf7]/70 hover:text-[#342d24]'
                                            } ${leftCollapsed ? 'justify-center px-0' : ''}`}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            {!leftCollapsed && <span>{item.label}</span>}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {!leftCollapsed && (
                            <div className="mt-auto border-t border-[#e4dbcc] p-3">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f8372]">Output</div>
                                <div className="mt-1 truncate font-mono text-xs text-[#6f6458]">05_Marketing</div>
                                <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f8372]">State</div>
                                <div className="mt-1 text-xs text-[#6f6458]">{data.selectedScript ? '脚本已绑定' : '等待文稿'}</div>
                            </div>
                        )}
                    </div>
                </aside>

                <main className="flex min-w-0 flex-1 flex-col bg-[#f8f4ec]">
                    <div className="border-b border-[#e4dbcc] bg-[#faf6ef]/95 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                            {phases.map((item, index) => {
                                const isActive = item.phase === currentPhase;
                                const isDone = item.phase < currentPhase;
                                return (
                                    <div key={item.code} className="flex items-center gap-2">
                                        <button
                                            onClick={() => item.enabled && onPhaseChange(item.phase)}
                                            disabled={!item.enabled}
                                            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                                                isActive
                                                    ? 'border-[#c97545] bg-[#c97545] text-white'
                                                    : isDone
                                                    ? 'border-[#8f9d74] bg-[#eef2df] text-[#55613d]'
                                                    : item.enabled
                                                    ? 'border-[#e4dbcc] bg-[#fffcf7] text-[#6f6458] hover:border-[#d8c8ae] hover:text-[#342d24]'
                                                    : 'border-[#e4dbcc] bg-[#f2eee6] text-[#b2a797]'
                                            }`}
                                        >
                                            <span className="font-mono text-xs font-bold">{isDone ? '✓' : item.code}</span>
                                            <span>{item.label}</span>
                                        </button>
                                        {index < phases.length - 1 && <ChevronRight className="h-4 w-4 text-[#c8bcad]" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-auto p-4">
                        {children}
                    </div>
                </main>

                <aside className={`${rightCollapsed ? 'w-[44px]' : 'w-[360px]'} shrink-0 border-l border-[#e4dbcc] bg-[#f2eee6] transition-[width] duration-200`}>
                    {rightCollapsed ? (
                        <div className="flex h-full flex-col items-center py-3">
                            <button
                                onClick={() => {
                                    setRightTouched(true);
                                    setRightCollapsed(false);
                                }}
                                className="rounded-md border border-[#dfd5c8] bg-[#fffcf7] p-2 text-[#8f8372] hover:text-[#342d24]"
                                title="展开右栏"
                            >
                                <PanelRightOpen className="h-4 w-4" />
                            </button>
                            <div className="mt-6 rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.18em] text-[#8f8372]">Artifacts</div>
                        </div>
                    ) : (
                        <div className="flex h-full flex-col">
                            <div className="flex items-center justify-between border-b border-[#e4dbcc] p-3">
                                <div>
                                    <div className="text-lg font-semibold text-[#2c2823]">Artifacts</div>
                                    <div className="text-xs text-[#8f8372]">运行态、健康度与交接准备</div>
                                </div>
                                <button
                                    onClick={() => {
                                        setRightTouched(true);
                                        setRightCollapsed(true);
                                    }}
                                    className="rounded-md p-1.5 text-[#8f8372] hover:bg-[#e4dbcc]/45 hover:text-[#342d24]"
                                    title="收起右栏"
                                >
                                    <PanelRightClose className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 border-b border-[#e4dbcc] p-3">
                                <Metric label="候选词" value={String(data.candidates.length)} />
                                <Metric label="评分" value={`${scoredVariants}/${totalVariants || 0}`} tone={scoredVariants > 0 ? 'green' : 'default'} />
                                <Metric label="黄金词" value={String(data.goldenKeywords.length)} tone="gold" />
                                <Metric label="方案" value={`${readyPlans} ready`} tone={readyPlans > 0 ? 'green' : 'default'} />
                            </div>

                            <div className="border-b border-[#e4dbcc] p-3">
                                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8f8372]">
                                    <BarChart3 className="h-4 w-4" />
                                    Runtime
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 rounded-md border border-[#e4dbcc] bg-[#fffcf7] px-3 py-2">
                                        <CheckCircle2 className="h-4 w-4 text-[#62835c]" />
                                        <span className="text-[#4d443a]">TubeBuddy Studio-first 链路</span>
                                        <span className="ml-auto font-mono text-xs text-[#8f8372]">ready</span>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-md border border-[#e4dbcc] bg-[#fffcf7] px-3 py-2">
                                        {generatingPlans > 0 ? <Sparkles className="h-4 w-4 text-[#c97545]" /> : <Clock3 className="h-4 w-4 text-[#8f8372]" />}
                                        <span className="text-[#4d443a]">LLM 发布包生成</span>
                                        <span className="ml-auto font-mono text-xs text-[#8f8372]">{generatingPlans > 0 ? 'run' : 'idle'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 p-3">
                                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8f8372]">Handoff Notes</div>
                                <div className="space-y-2 text-xs leading-5 text-[#6f6458]">
                                    <div className="rounded-md border border-[#e4dbcc] bg-[#fffcf7] p-2">
                                        P2 完整视频描述作为发布文案主审阅区，预览与导出必须保持一致。
                                    </div>
                                    <div className="rounded-md border border-[#e4dbcc] bg-[#fffcf7] p-2">
                                        P3/P4 先保留为 UI 语义位，正式状态迁移后再接入 DT 交接。
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
