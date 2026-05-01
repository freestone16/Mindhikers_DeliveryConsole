import { useState } from 'react';
import {
    BarChart3,
    CheckCircle2,
    ChevronLeft,
    Clock3,
    Eye,
    FileText,
    FolderOpen,
    Gauge,
    GripVertical,
    Image,
    LayoutDashboard,
    ListChecks,
    Megaphone,
    Music,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
    PenTool,
    Play,
    Radio,
    RefreshCw,
    Send,
    Settings2,
    Sparkles,
    Tags,
    Video,
} from 'lucide-react';
import '../../styles/marketing-redesign-demo.css';

type DemoView = 'keywords' | 'review' | 'handoff' | 'export';
type ResizeSide = 'left' | 'right';

const phaseItems = [
    { id: 'keywords' as DemoView, code: 'P1', label: '关键词' },
    { id: 'review' as DemoView, code: 'P2', label: '方案' },
    { id: 'handoff' as DemoView, code: 'P3', label: '交接' },
    { id: 'export' as DemoView, code: 'P4', label: '导出' },
];

const deliveryModules = [
    { label: '影视导演', icon: PenTool },
    { label: '短视频', icon: Video },
    { label: '缩略图', icon: Image },
    { label: '音乐', icon: Music },
    { label: '营销', icon: Megaphone, active: true },
    { label: '视觉审计', icon: Eye },
];

const draftItems = [
    { title: 'CSET-seedance2', age: '43天前', active: true },
    { title: 'CSET-seedance2 深度文稿', age: '43天前' },
    { title: 'Seedance 发布包', age: '47天前' },
];

const keywords = [
    { text: '黄金精神 自洽性', score: 58, volume: 15, fit: '强叙事', status: 'selected' },
    { text: '注意力经济 抖音', score: 47, volume: 3, fit: '标题强', status: 'candidate' },
    { text: '奶头乐 内容工业化', score: 47, volume: 3, fit: '风险词', status: 'candidate' },
    { text: 'AI 创作意义 熵减', score: 46, volume: 1, fit: '解释型', status: 'candidate' },
];

const rows = [
    { label: '标题', icon: FileText, value: '注意力经济 抖音：AI大片时代，你的黄金精神在哪？', state: 'confirmed' },
    { label: '视频描述', icon: Megaphone, value: '当 Seedance 2.0 能用一句话生成完美大片，真正稀缺的是自洽与意义。', state: 'editing' },
    { label: '缩略图', icon: LayoutDashboard, value: 'Split screen hourglass, neon data stream, human silhouette', state: 'pending' },
    { label: '播放列表', icon: ListChecks, value: '硅基进化论 CSET 系列', state: 'confirmed' },
    { label: '标签', icon: Tags, value: '注意力经济, 抖音, AI视频, Seedance 2.0, 自洽性', state: 'pending' },
    { label: '其他设置', icon: Settings2, value: '周四 20:00 发布，启用双缩略图 A/B 测试', state: 'pending' },
];

const descriptionSections = [
    {
        label: '前两行钩子',
        text: '注意力经济 抖音正在进入 AI 大片时代。Seedance 2.0 可以一键生成视觉奇观，但真正稀缺的，反而是人的黄金精神与自洽性。',
    },
    {
        label: '价值说明',
        text: '这期视频讨论一个更底层的问题：当内容工业化越来越强，创作者如何避免只追逐注意力，而是重新建立作品的主体性、意义感和长期价值。',
    },
    {
        label: 'GEO 问答锚点',
        text: '问：AI 视频生成会让创作变得廉价吗？\n答：工具会降低生产门槛，但不会自动生成判断、立场和意义。真正稀缺的是创作者如何组织经验、问题和价值。',
    },
    {
        label: '章节时间轴',
        text: '00:00 AI 大片时代的注意力经济\n03:18 为什么完美画面仍然不够\n07:42 黄金精神、自洽性与主体性\n12:06 内容工业化之后，创作者还剩什么\n16:40 如何建立长期内容资产',
    },
    {
        label: '参考与概念',
        text: 'Seedance 2.0\nSora / TikTok / YouTube Studio\n注意力经济、内容工业化、主体性、自洽性、黄金精神',
    },
    {
        label: '行动引导',
        text: '如果你也在用 AI 做内容，欢迎在评论区写下一个问题：你现在最怕被 AI 替代的，是技术，还是判断？',
    },
    {
        label: 'Hashtags',
        text: '#AI视频 #Seedance2 #注意力经济',
    },
];

const fullDescriptionPreview = descriptionSections.map(section => section.text).join('\n\n');

const logs = [
    { time: '14:38:02', type: 'score', text: 'TubeBuddy Keyword Explorer opened from Studio menu' },
    { time: '14:38:09', type: 'score', text: '黄金精神 自洽性 scored: overall 58, search 15' },
    { time: '14:39:21', type: 'llm', text: 'Generated 3 marketing plans from selected golden keywords' },
    { time: '14:40:04', type: 'save', text: 'Draft saved to marketingmaster_state.json' },
];

function statusClass(state: string) {
    if (state === 'confirmed') return 'border-[#8f9d74] bg-[#eef2df] text-[#55613d]';
    if (state === 'editing') return 'border-[#d5a15f] bg-[#fff0d8] text-[#9a622f]';
    if (state === 'selected') return 'border-[#cb744c] bg-[#f9dfc2] text-[#9b4f2f]';
    return 'border-[#ded6ca] bg-[#f5efe6] text-[#9a9083]';
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function startResize(
    event: React.MouseEvent,
    side: ResizeSide,
    currentWidth: number,
    onWidthChange: (width: number) => void,
) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = currentWidth;

    const handleMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const next = side === 'left' ? startWidth + delta : startWidth - delta;
        onWidthChange(clamp(next, side === 'left' ? 220 : 280, side === 'left' ? 420 : 520));
    };

    const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
}

function ResizeHandle({
    side,
    width,
    onWidthChange,
}: {
    side: ResizeSide;
    width: number;
    onWidthChange: (width: number) => void;
}) {
    return (
        <button
            aria-label={`${side} panel resize handle`}
            onMouseDown={event => startResize(event, side, width, onWidthChange)}
            className="group z-20 flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-[#fbf7ef] hover:bg-[#efe7dc]"
        >
            <GripVertical className="h-4 w-4 text-[#c8bcad] group-hover:text-[#8b7d6c]" />
        </button>
    );
}

function ShellMetric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'green' | 'blue' | 'gold' | 'clay' }) {
    const toneClass = {
        default: 'text-[#2f2a23]',
        green: 'text-[#667247]',
        blue: 'text-[#5e6f7b]',
        gold: 'text-[#9a622f]',
        clay: 'text-[#b35e37]',
    }[tone];

    return (
        <div className="min-w-0 rounded-lg border border-[#e4dbcf] bg-[#fffaf2] px-3 py-2 shadow-[0_1px_0_rgba(77,60,42,0.04)]">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[#aaa093]">{label}</div>
            <div className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</div>
        </div>
    );
}

function ProductTopBar({
    leftWidth,
    rightWidth,
}: {
    leftWidth: number;
    rightWidth: number;
}) {
    return (
        <div
            className="marketing-demo-topbar"
            style={{ gridTemplateColumns: `${leftWidth}px minmax(0, 1fr) ${rightWidth}px` }}
        >
            <div className="marketing-demo-topbar__brand">
                <div className="marketing-demo-topbar__brandmark">D</div>
                <span>Delivery</span>
            </div>

            <div className="marketing-demo-topbar__crumbs">
                <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                <strong>CSET-Seedance2</strong>
                <span className="text-[#c1b5a6]">/</span>
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <strong className="truncate">Script: 深度文稿 v2.1</strong>
            </div>

            <div className="marketing-demo-topbar__meta">
                <button className="flex items-center gap-1.5 text-[#8f8372] hover:text-[#342d24]">
                    <Settings2 className="h-3.5 w-3.5" />
                    模型配置
                </button>
            </div>
        </div>
    );
}

function LeftRail({
    collapsed,
    onToggle,
}: {
    collapsed: boolean;
    onToggle: () => void;
}) {
    if (collapsed) {
        return (
            <aside className="marketing-demo-rail marketing-demo-rail--collapsed h-full">
                <button onClick={onToggle} className="marketing-demo-rail__collapse">
                    <PanelLeftOpen className="h-4 w-4" />
                </button>
                <div className="flex flex-col items-center gap-0.5 px-1 py-2">
                    {deliveryModules.map(item => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.label}
                                title={item.label}
                                className={`marketing-demo-workstation marketing-demo-workstation--collapsed ${item.active ? 'marketing-demo-workstation--active' : ''}`}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                            </button>
                        );
                    })}
                </div>
            </aside>
        );
    }

    return (
        <aside className="marketing-demo-rail h-full">
            <div className="marketing-demo-rail__section">
                <div className="marketing-demo-rail__label">
                    <span>工作站</span>
                    <button
                        onClick={onToggle}
                        className="grid h-7 w-7 place-items-center rounded text-[#8f8372] hover:bg-[#e4dbcc]/45 hover:text-[#342d24]"
                    >
                        <PanelLeftClose className="h-3.5 w-3.5" />
                    </button>
                </div>
                <nav className="marketing-demo-workstation-list">
                    {deliveryModules.map(item => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.label}
                                className={`marketing-demo-workstation ${item.active ? 'marketing-demo-workstation--active' : ''}`}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            <section className="marketing-demo-rail__section marketing-demo-sessionlist">
                <div className="marketing-demo-rail__label">
                    <span>文稿 · 营销</span>
                </div>
                <div className="marketing-demo-sessionlist__list">
                        {draftItems.map(item => (
                            <button
                                key={item.title}
                            className={`marketing-demo-session ${item.active ? 'marketing-demo-session--active' : ''}`}
                            >
                            <span className="marketing-demo-session__dot" style={{ opacity: item.active ? 1 : 0.35 }} />
                            <span className="marketing-demo-session__name">{item.title}</span>
                            <span className="marketing-demo-session__time">{item.age}</span>
                            </button>
                        ))}
                </div>
            </section>

            <div className="marketing-demo-dock">
                <div>
                    <div className="marketing-demo-dock__label">Project</div>
                    <div className="marketing-demo-dock__value">CSET-Seedance2</div>
                </div>
                <div>
                    <div className="marketing-demo-dock__label">Script</div>
                    <div className="marketing-demo-dock__value">深度文稿 v2.1</div>
                </div>
                <div>
                    <div className="marketing-demo-dock__label">Output</div>
                    <div className="marketing-demo-dock__value marketing-demo-mono">05_Marketing</div>
                </div>
            </div>
        </aside>
    );
}

function RightInspector({
    view,
    collapsed,
    onToggle,
}: {
    view: DemoView;
    collapsed: boolean;
    onToggle: () => void;
}) {
    const runtimeLabel = view === 'keywords' ? 'TubeBuddy' : view === 'review' ? 'LLM Writer' : view === 'handoff' ? 'DT Contract' : 'Export Gate';

    if (collapsed) {
        return (
            <aside className="flex h-full w-14 shrink-0 flex-col items-center border-l border-[#e4dbcf] bg-[#f2eee6] py-3">
                <button onClick={onToggle} className="rounded-md border border-[#dfd5c8] bg-[#fffaf2] p-2 text-[#8b7d6c] hover:text-[#2f2a23]">
                    <PanelRightOpen className="h-4 w-4" />
                </button>
                <div className="mt-5 rotate-90 whitespace-nowrap text-xs font-semibold tracking-[0.18em] text-[#aaa093]">ARTIFACTS</div>
            </aside>
        );
    }

    return (
        <aside className="h-full shrink-0 border-l border-[#e4dbcf] bg-[#f2eee6]">
            <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-[#e4dbcf] p-3">
                    <div>
                        <div className="text-xl font-semibold text-[#2f2a23]">Artifacts</div>
                        <div className="mt-1 text-xs text-[#aaa093]">运行态与下游交接</div>
                    </div>
                    <button onClick={onToggle} className="rounded-md p-1.5 text-[#aaa093] hover:bg-[#e9e1d7] hover:text-[#2f2a23]">
                        <PanelRightClose className="h-4 w-4" />
                    </button>
                </div>

                <div className="border-b border-[#e4dbcf] p-3">
                    <div className="grid grid-cols-2 gap-2">
                        <ShellMetric label="引擎" value={runtimeLabel} tone="blue" />
                        <ShellMetric label="状态" value="Ready" tone="green" />
                        <ShellMetric label="耗时" value="00:17" tone="gold" />
                        <ShellMetric label="保存" value="Auto" />
                    </div>
                </div>

                <div className="border-b border-[#e4dbcf] p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#aaa093]">当前队列</span>
                        <Radio className="h-4 w-4 text-[#667247]" />
                    </div>
                    <div className="space-y-2">
                        {['候选词评分', '策略点评', '方案生成', '发布包确认'].map((item, index) => (
                            <div key={item} className="flex items-center gap-3 text-sm">
                                <div className={`h-2 w-2 rounded-full ${index < 2 ? 'bg-[#8f9d74]' : index === 2 ? 'bg-[#cb744c]' : 'bg-[#d6cbbd]'}`} />
                                <span className={index < 3 ? 'text-[#4d443a]' : 'text-[#aaa093]'}>{item}</span>
                                <span className="ml-auto font-mono text-xs text-[#aaa093]">{index < 2 ? 'done' : index === 2 ? 'run' : 'wait'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="min-h-0 flex-1 p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#aaa093]">事件日志</span>
                        <RefreshCw className="h-3.5 w-3.5 text-[#aaa093]" />
                    </div>
                    <div className="space-y-2 overflow-hidden">
                        {logs.map(log => (
                            <div key={`${log.time}-${log.text}`} className="rounded-lg border border-[#e4dbcf] bg-[#fbf7ef] p-2">
                                <div className="flex items-center gap-2 text-[10px] font-mono text-[#aaa093]">
                                    <Clock3 className="h-3 w-3" />
                                    {log.time}
                                    <span className="ml-auto uppercase">{log.type}</span>
                                </div>
                                <div className="mt-1 text-xs leading-5 text-[#6f6458]">{log.text}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );
}

function KeywordsWorkspace() {
    return (
        <div className="grid h-full grid-rows-[auto_1fr] gap-2">
            <section className="rounded-xl border border-[#e4dbcf] bg-[#fffaf2] p-3">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-[#aaa093]">Phase 1</div>
                        <h2 className="mt-1 text-xl font-semibold text-[#2f2a23]">关键词选择与真实评分</h2>
                    </div>
                    <button className="flex items-center gap-2 rounded-lg bg-[#cb744c] px-4 py-2 text-sm font-medium text-white hover:bg-[#b9623e]">
                        <Play className="h-4 w-4" />
                        继续评分
                    </button>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                    <ShellMetric label="候选词" value="10" />
                    <ShellMetric label="已评分" value="10 / 10" tone="green" />
                    <ShellMetric label="黄金词" value="3" tone="gold" />
                    <ShellMetric label="入口" value="Studio" tone="blue" />
                </div>
            </section>

            <section className="min-h-0 overflow-hidden rounded-xl border border-[#e4dbcf] bg-[#fffaf2]">
                <div className="grid grid-cols-[1.2fr_0.8fr] border-b border-[#e4dbcf] px-4 py-3 text-xs uppercase tracking-[0.14em] text-[#aaa093]">
                    <span>关键词</span>
                    <span>评分与判断</span>
                </div>
                <div className="divide-y divide-[#eee4d8]">
                    {keywords.map(item => (
                        <button key={item.text} className="grid w-full grid-cols-[1.2fr_0.8fr] items-center px-3 py-3 text-left hover:bg-[#f7efe3]">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${statusClass(item.status)}`}>
                                    <BarChart3 className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-[#2f2a23]">{item.text}</div>
                                    <div className="mt-1 text-xs text-[#aaa093]">{item.fit}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <ShellMetric label="总分" value={String(item.score)} tone="gold" />
                                <ShellMetric label="搜索量" value={String(item.volume)} tone="blue" />
                                <ShellMetric label="选择" value={item.status === 'selected' ? 'Yes' : 'Hold'} tone={item.status === 'selected' ? 'green' : 'default'} />
                            </div>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
}

function ReviewWorkspace() {
    return (
        <div className="grid h-full grid-cols-[280px_minmax(0,1fr)] gap-2">
            <section className="overflow-hidden rounded-xl border border-[#e4dbcf] bg-[#fffaf2]">
                <div className="border-b border-[#e4dbcf] p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-[#aaa093]">Golden Keywords</div>
                    <h2 className="mt-1 text-lg font-semibold text-[#2f2a23]">三套方案</h2>
                </div>
                <div className="divide-y divide-[#eee4d8]">
                    {keywords.slice(0, 3).map((item, index) => (
                        <button key={item.text} className={`w-full p-3 text-left ${index === 0 ? 'bg-[#f9dfc2]' : 'hover:bg-[#f7efe3]'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-md border ${index === 0 ? 'border-[#cb744c] text-[#9b4f2f]' : 'border-[#ded6ca] text-[#aaa093]'}`}>
                                    {index + 1}
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-[#2f2a23]">{item.text}</div>
                                    <div className="mt-1 text-xs text-[#aaa093]">发布包完成 2 / 6</div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            <section className="grid min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-[#e4dbcf] bg-[#fffaf2]">
                <div className="flex items-center justify-between border-b border-[#e4dbcf] p-3">
                    <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-[#aaa093]">Phase 2</div>
                        <h2 className="mt-1 text-xl font-semibold text-[#2f2a23]">发布文案审阅台</h2>
                    </div>
                    <button className="flex items-center gap-2 rounded-lg border border-[#8f9d74] bg-[#eef2df] px-4 py-2 text-sm font-medium text-[#55613d]">
                        <CheckCircle2 className="h-4 w-4" />
                        确认当前方案
                    </button>
                </div>

                <div className="grid min-h-0 grid-cols-[minmax(360px,0.92fr)_minmax(420px,1.08fr)] gap-2 overflow-hidden p-3">
                    <div className="min-h-0 overflow-hidden rounded-lg border border-[#e4dbcf] bg-[#fbf7ef]">
                        <div className="flex items-center justify-between border-b border-[#e4dbcf] px-3 py-2">
                            <div className="text-sm font-semibold text-[#2f2a23]">结构化编辑</div>
                            <div className="text-xs text-[#aaa093]">SEO/GEO 顺序锁定</div>
                        </div>
                        <div className="h-full space-y-2 overflow-auto p-3 pb-12">
                            {descriptionSections.map((section, index) => (
                                <label key={section.label} className="block rounded-md border border-[#e4dbcf] bg-[#fffaf2] p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-[#4d443a]">{index + 1}. {section.label}</span>
                                        <span className="text-xs text-[#aaa093]">{section.text.length} 字</span>
                                    </div>
                                    <textarea
                                        readOnly
                                        value={section.text}
                                        rows={section.label === '章节时间轴' ? 5 : 3}
                                        className="w-full resize-none bg-transparent text-sm leading-6 text-[#6f6458] outline-none"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="min-h-0 overflow-hidden rounded-lg border border-[#e4dbcf] bg-[#fbf7ef]">
                        <div className="flex items-center justify-between border-b border-[#e4dbcf] px-3 py-2">
                            <div className="text-sm font-semibold text-[#2f2a23]">全局预览</div>
                            <div className="text-xs text-[#aaa093]">YouTube Description · {fullDescriptionPreview.length} 字</div>
                        </div>
                        <div className="grid h-full grid-rows-[1fr_auto]">
                            <textarea
                                readOnly
                                value={fullDescriptionPreview}
                                className="h-full resize-none bg-[#fffaf2] px-4 py-3 text-sm leading-7 text-[#4d443a] outline-none"
                            />
                            <div className="grid grid-cols-2 gap-2 border-t border-[#e4dbcf] p-3">
                                {['前两行含主关键词', 'GEO 问答可被 AI 引擎抓取', '章节时间轴在正文中段', 'Hashtags 放在最后且不堆砌'].map((item, index) => (
                                    <div key={item} className={`rounded-md border px-3 py-2 text-xs ${index < 3 ? 'border-[#8f9d74] bg-[#eef2df] text-[#55613d]' : 'border-[#d5a15f] bg-[#fff0d8] text-[#9a622f]'}`}>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-[#e4dbcf] bg-[#fbf7ef] px-3 py-2">
                    <div className="grid grid-cols-6 gap-2">
                        {rows.map(row => {
                            const Icon = row.icon;
                            return (
                                <button key={row.label} className={`flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 text-left ${statusClass(row.state)}`}>
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span className="truncate text-xs font-semibold">{row.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
}

function HandoffWorkspace() {
    const platforms = [
        ['YouTube', '16:9', '标题/描述/标签/播放列表完整，可进入 DT 草稿', 'confirmed'],
        ['YouTube Shorts', '9:16', '需从完整描述抽取短视频标题与短描述', 'editing'],
        ['Bilibili', '16:9', '需把 Hashtags 改写为中文分区标签', 'pending'],
        ['微信公众号', 'article', '需要图文导语与小标题重排', 'pending'],
    ];

    return (
        <div className="grid h-full grid-cols-[1fr_360px] gap-2">
            <section className="overflow-hidden rounded-xl border border-[#e4dbcf] bg-[#fffaf2]">
                <div className="flex items-center justify-between border-b border-[#e4dbcf] p-3">
                    <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-[#aaa093]">Phase 3</div>
                        <h2 className="mt-1 text-xl font-semibold text-[#2f2a23]">平台适配与交接检查</h2>
                    </div>
                    <button className="flex items-center gap-2 rounded-md bg-[#8f9d74] px-4 py-2 text-sm font-medium text-white hover:bg-[#7e8c63]">
                        <Send className="h-4 w-4" />
                        准备交给 DT
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-2 border-b border-[#e4dbcf] p-3">
                    <ShellMetric label="主平台" value="YouTube" tone="blue" />
                    <ShellMetric label="文案状态" value="Reviewed" tone="green" />
                    <ShellMetric label="下游" value="Publish Composer" tone="gold" />
                    <ShellMetric label="技术包" value="Auto" />
                </div>

                <div className="divide-y divide-[#eee4d8]">
                    {platforms.map(([name, ratio, note, state]) => (
                        <button key={name} className="grid w-full grid-cols-[180px_100px_1fr_110px] items-center gap-2 px-3 py-4 text-left hover:bg-[#f7efe3]">
                            <span className="text-sm font-semibold text-[#2f2a23]">{name}</span>
                            <span className="font-mono text-xs text-[#aaa093]">{ratio}</span>
                            <span className="truncate text-sm text-[#6f6458]">{note}</span>
                            <span className={`justify-self-end rounded-md border px-2 py-1 text-center text-xs ${statusClass(state)}`}>
                                {state === 'confirmed' ? '就绪' : state === 'editing' ? '需补齐' : '预留'}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="border-t border-[#e4dbcf] p-3">
                    <div className="rounded-md border border-[#e4dbcf] bg-[#fbf7ef] p-3">
                        <div className="mb-2 text-xs uppercase tracking-[0.14em] text-[#aaa093]">Technical Artifacts</div>
                        <div className="grid grid-cols-4 gap-2 text-sm text-[#4d443a]">
                            {['marketing_package.json', 'marketing_package.md', 'thumbnail prompt', 'platforms.youtube'].map((item, index) => (
                                <div key={item} className="flex items-center gap-2">
                                    <CheckCircle2 className={`h-4 w-4 ${index < 2 ? 'text-[#8f9d74]' : 'text-[#c8bcad]'}`} />
                                    <span className="truncate">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-[#e4dbcf] bg-[#fffaf2] p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#2f2a23]">
                    <Send className="h-4 w-4 text-[#8f9d74]" />
                    P3 的正确边界
                </div>
                <div className="space-y-3">
                    {[
                        ['不审核 JSON', '人审的是最终发布文案和平台缺口，JSON 只是自动生成的技术交接物'],
                        ['多平台适配', 'YouTube 是主链路，Shorts/Bilibili/公众号只展示需要改写的差异'],
                        ['队列意识', 'P3 只判断能否进 DT 队列，不直接替代 DT 的提稿动作'],
                        ['运行态右置', '授权、保存、导出、错误和重试统一交给右栏 Artifacts'],
                    ].map(([title, body]) => (
                        <div key={title} className="rounded-lg border border-[#e4dbcf] bg-[#fbf7ef] p-3">
                            <div className="text-sm font-semibold text-[#4d443a]">{title}</div>
                            <div className="mt-1 text-xs leading-5 text-[#81766a]">{body}</div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function ExportWorkspace() {
    return (
        <div className="grid h-full grid-cols-[1fr_380px] gap-2">
            <section className="min-h-0 overflow-hidden rounded-xl border border-[#e4dbcf] bg-[#fffaf2]">
                <div className="flex items-center justify-between border-b border-[#e4dbcf] p-3">
                    <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-[#aaa093]">Phase 4</div>
                        <h2 className="mt-1 text-xl font-semibold text-[#2f2a23]">确认与导出</h2>
                    </div>
                    <button className="flex items-center gap-2 rounded-md bg-[#cb744c] px-4 py-2 text-sm font-medium text-white hover:bg-[#b9623e]">
                        <Send className="h-4 w-4" />
                        导出当前方案
                    </button>
                </div>
                <div className="grid grid-cols-4 gap-2 border-b border-[#e4dbcf] p-3">
                    <ShellMetric label="确认项" value="6 / 6" tone="green" />
                    <ShellMetric label="主平台" value="YouTube" tone="blue" />
                    <ShellMetric label="格式" value="JSON + MD" tone="gold" />
                    <ShellMetric label="DT 接口" value="Ready" />
                </div>
                <div className="divide-y divide-[#eee4d8]">
                    {[
                        ['标题与描述', '已确认，可进入 YouTube Studio 字段'],
                        ['缩略图提示词', '保留导演大师视觉锚点，供缩略图大师继续处理'],
                        ['标签与播放列表', '标签去重完成，播放列表绑定 CSET 系列'],
                        ['发布设置', '建议周四 20:00，暂不自动发布'],
                        ['下游契约', 'marketing_package.json 字段完整'],
                    ].map(([title, body], index) => (
                        <div key={title} className="grid grid-cols-[36px_160px_1fr_100px] items-center gap-2 px-3 py-3">
                            <CheckCircle2 className={`h-4 w-4 ${index < 4 ? 'text-[#8f9d74]' : 'text-[#cb744c]'}`} />
                            <span className="text-sm font-semibold text-[#2f2a23]">{title}</span>
                            <span className="truncate text-sm text-[#6f6458]">{body}</span>
                            <span className="justify-self-end rounded-md border border-[#8f9d74] bg-[#eef2df] px-2 py-1 text-xs text-[#55613d]">通过</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-xl border border-[#e4dbcf] bg-[#fffaf2] p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#2f2a23]">
                    <Gauge className="h-4 w-4 text-[#9a622f]" />
                    出口规则
                </div>
                <div className="space-y-3">
                    {[
                        ['保存优先', '关闭窗口保留当前方案与确认状态'],
                        ['重选脚本', '只要重新点选初始脚本，业务流程从 P1 重置'],
                        ['右栏运行态', '请求、保存、异常和下游同步统一在 Artifacts 中呈现'],
                        ['左栏收口', 'Delivery 左栏只承载跨模块入口，不承载阶段流程'],
                    ].map(([title, body]) => (
                        <div key={title} className="rounded-md border border-[#e4dbcf] bg-[#fbf7ef] p-3">
                            <div className="text-sm font-semibold text-[#4d443a]">{title}</div>
                            <div className="mt-1 text-xs leading-5 text-[#81766a]">{body}</div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

export function MarketingRedesignDemo() {
    const [view, setView] = useState<DemoView>('keywords');
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);
    const [leftWidth, setLeftWidth] = useState(260);
    const [rightWidth, setRightWidth] = useState(360);
    const activePhase = phaseItems.find(item => item.id === view) ?? phaseItems[0];
    const resolvedLeftWidth = leftCollapsed ? 60 : leftWidth;
    const resolvedRightWidth = rightCollapsed ? 44 : rightWidth;

    return (
        <div className="marketing-demo-shell">
            <ProductTopBar leftWidth={resolvedLeftWidth} rightWidth={resolvedRightWidth} />
            <div className="marketing-demo-body">
                <div style={{ width: resolvedLeftWidth }}>
                    <LeftRail
                        collapsed={leftCollapsed}
                        onToggle={() => setLeftCollapsed(value => !value)}
                    />
                </div>
                {!leftCollapsed && <ResizeHandle side="left" width={leftWidth} onWidthChange={setLeftWidth} />}

                <main className="marketing-demo-center">
                    <header className="marketing-demo-stage-header">
                        <div className="flex items-center gap-3">
                            <ChevronLeft className="h-4 w-4 text-[#aaa093]" />
                            <div>
                                <div className="marketing-demo-stage-title">营销大师工作台 <span className="font-sans font-normal text-[#aaa093]">|</span> <span className="font-sans text-[#8b8175]">{activePhase.label}处理中</span></div>
                                <div className="text-xs text-[#aaa093]">CSET-Seedance2 / Script: 深度文稿 v2.1</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                {phaseItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setView(item.id)}
                                        className={`min-w-11 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                                            view === item.id
                                                ? 'bg-[#cb744c] text-white shadow-[0_1px_6px_rgba(185,98,62,0.18)]'
                                                : 'text-[#b5aa9c] hover:bg-[#f2eee6] hover:text-[#4d443a]'
                                        }`}
                                    >
                                        {item.code}
                                    </button>
                                ))}
                            </div>
                            <button className="flex items-center gap-2 rounded-md bg-[#cb744c] px-3 py-2 text-sm font-medium text-white hover:bg-[#b9623e]">
                                <Sparkles className="h-4 w-4" />
                                生成下一步
                            </button>
                        </div>
                    </header>
                    <div className="marketing-demo-content">
                        {view === 'keywords' && <KeywordsWorkspace />}
                        {view === 'review' && <ReviewWorkspace />}
                        {view === 'handoff' && <HandoffWorkspace />}
                        {view === 'export' && <ExportWorkspace />}
                    </div>
                </main>

                {!rightCollapsed && <ResizeHandle side="right" width={rightWidth} onWidthChange={setRightWidth} />}
                <div style={{ width: resolvedRightWidth }}>
                    <RightInspector
                        view={view}
                        collapsed={rightCollapsed}
                        onToggle={() => setRightCollapsed(value => !value)}
                    />
                </div>
            </div>
        </div>
    );
}
