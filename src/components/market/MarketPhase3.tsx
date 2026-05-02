import {
    AlertCircle,
    CheckCircle2,
    FileJson,
    FileText,
    Layers3,
    Send,
    Youtube,
} from 'lucide-react';
import React from 'react';
import type { MarketModule_V3, MarketingPlan, MarketingPlanRow } from '../../types';
import { composeDescriptionPreview } from './DescriptionReviewPanel';

interface MarketPhase3Props {
    data: MarketModule_V3;
    onBackToReview: () => void;
}

type ReadinessTone = 'ready' | 'attention' | 'reserved';

function row(plan: MarketingPlan | null, rowType: MarketingPlanRow['rowType']) {
    return plan?.rows.find(item => item.rowType === rowType) ?? null;
}

function text(value: string | undefined) {
    return (value || '').trim();
}

function describeTone(tone: ReadinessTone) {
    return {
        ready: 'border-[#8f9d74] bg-[#eef2df] text-[#55613d]',
        attention: 'border-[#d5a15f] bg-[#fff0d8] text-[#9a622f]',
        reserved: 'border-[#d9d0c4] bg-[#f6f0e8] text-[#81766a]',
    }[tone];
}

function StatusPill({ tone, label }: { tone: ReadinessTone; label: string }) {
    return (
        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${describeTone(tone)}`}>
            {label}
        </span>
    );
}

function CheckRow({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
    return (
        <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-2 rounded-md border border-[#e4dbcc] bg-[#fffcf7] p-3">
            {ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#62835c]" />
            ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 text-[#c97545]" />
            )}
            <div className="min-w-0">
                <div className="text-sm font-semibold text-[#342d24]">{title}</div>
                <div className="mt-1 text-xs leading-5 text-[#81766a]">{detail}</div>
            </div>
        </div>
    );
}

export const MarketPhase3: React.FC<MarketPhase3Props> = ({ data, onBackToReview }) => {
    const goldenKWs = data.candidates.filter(candidate => data.goldenKeywords.includes(candidate.id));
    const activeKW = goldenKWs[data.activeTabIndex] ?? goldenKWs[0] ?? null;
    const activePlan = activeKW
        ? data.plans.find(plan => plan.keywordId === activeKW.id) ?? null
        : data.plans.find(plan => plan.generationStatus === 'ready') ?? null;

    const readyPlans = data.plans.filter(plan => plan.generationStatus === 'ready' && plan.rows.length > 0);
    const selectedPlan = activePlan?.generationStatus === 'ready' ? activePlan : readyPlans[0] ?? null;

    const titleRow = row(selectedPlan, 'title');
    const descRow = row(selectedPlan, 'description');
    const tagsRow = row(selectedPlan, 'tags');
    const playlistRow = row(selectedPlan, 'playlist');
    const thumbnailRow = row(selectedPlan, 'thumbnail');
    const otherRow = row(selectedPlan, 'other');

    const youtubeDescription = descRow?.descriptionBlocks?.length
        ? composeDescriptionPreview(descRow.descriptionBlocks)
        : text(descRow?.content);
    const first150 = youtubeDescription.slice(0, 150);
    const hashtagCount = (youtubeDescription.match(/#[^\s#]+/g) || []).length;
    const confirmedRows = selectedPlan?.rows.filter(item => item.isConfirmed).length ?? 0;
    const totalRows = selectedPlan?.rows.length ?? 0;
    const allConfirmed = totalRows > 0 && confirmedRows === totalRows;
    const hasSavedOutputs = Boolean(data.savedOutputs?.paths?.length);

    const youtubeChecks = [
        {
            ok: Boolean(text(titleRow?.content)),
            title: '标题字段可交付',
            detail: text(titleRow?.content) || 'P2 还没有生成或确认最终标题。',
        },
        {
            ok: youtubeDescription.length > 0,
            title: '完整描述可交付',
            detail: youtubeDescription
                ? `${youtubeDescription.length} 字，导出时会使用同一套区块顺序。`
                : 'P2 还没有完整描述正文。',
        },
        {
            ok: Boolean(selectedPlan?.keyword && first150.includes(selectedPlan.keyword)),
            title: '描述前 150 字包含主关键词',
            detail: selectedPlan?.keyword
                ? `当前关键词：${selectedPlan.keyword}`
                : '请先选择一套黄金关键词方案。',
        },
        {
            ok: hashtagCount >= 2 && hashtagCount <= 4,
            title: 'Hashtags 数量适合 YouTube 描述',
            detail: `当前 ${hashtagCount} 个，建议 2-4 个核心标签。`,
        },
        {
            ok: Boolean(text(tagsRow?.content)),
            title: '后台 Tags 已准备',
            detail: text(tagsRow?.content) || '后台标签字段仍为空。',
        },
        {
            ok: allConfirmed,
            title: 'P2 字段确认完成',
            detail: `${confirmedRows}/${totalRows || 0} 个字段已确认；未确认时可以看检查结果，但不应交给 DT。`,
        },
    ];

    const platforms: Array<[string, string, string, ReadinessTone, string]> = [
        [
            'YouTube',
            '16:9',
            allConfirmed ? '标题、描述、标签和默认设置已确认，可生成发布包。' : '主链路字段已生成，但仍有字段未确认。',
            allConfirmed ? 'ready' : 'attention',
            allConfirmed ? '就绪' : '需确认',
        ],
        [
            'YouTube Shorts',
            '9:16',
            '需要从长视频描述抽取短标题、短描述和 Shorts 标签，本轮只作为预留检查项。',
            'reserved',
            '预留',
        ],
        [
            'Bilibili',
            '16:9',
            '需要中文分区、封面比例和标签语义改写，当前不误报为已完成。',
            'reserved',
            '预留',
        ],
        [
            '微信公众号',
            'article',
            '需要图文导语、小标题重排和引用格式，本轮不进入自动交付。',
            'reserved',
            '预留',
        ],
    ];
    const artifacts: Array<[string, boolean, string]> = [
        ['marketing_plan_*.md', hasSavedOutputs, 'P4 导出后生成结构化存档'],
        ['marketing_plan_*.plain.txt', hasSavedOutputs, 'P4 导出后生成 YouTube 可复制文本'],
        ['marketing_package.json', false, 'DT 正式合约待后续单元接入'],
        ['platforms.youtube', allConfirmed, '字段来源已经可被映射'],
    ];

    return (
        <div className="space-y-4 text-[#342d24]">
            <section className="overflow-hidden rounded-lg border border-[#e4dbcc] bg-[#fffcf7]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4dbcc] bg-[#faf6ef] px-4 py-3">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f8372]">P3</div>
                        <h2 className="mt-1 text-lg font-semibold text-[#2c2823]">平台适配与 DT 交接检查</h2>
                    </div>
                    <button
                        onClick={onBackToReview}
                        className="flex items-center gap-2 rounded-md border border-[#d8c8ae] bg-[#fffaf2] px-3 py-2 text-sm font-medium text-[#6f6458] hover:border-[#c97545] hover:text-[#342d24]"
                    >
                        <FileText className="h-4 w-4" />
                        返回 P2 补确认
                    </button>
                </div>

                <div className="grid gap-3 border-b border-[#e4dbcc] p-3 md:grid-cols-4">
                    <div className="rounded-md border border-[#e4dbcc] bg-[#f8f4ec] px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8f8372]">当前方案</div>
                        <div className="mt-1 truncate text-sm font-semibold">{selectedPlan?.keyword || '未生成'}</div>
                    </div>
                    <div className="rounded-md border border-[#e4dbcc] bg-[#f8f4ec] px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8f8372]">确认状态</div>
                        <div className="mt-1 text-sm font-semibold">{confirmedRows}/{totalRows || 0}</div>
                    </div>
                    <div className="rounded-md border border-[#e4dbcc] bg-[#f8f4ec] px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8f8372]">主平台</div>
                        <div className="mt-1 text-sm font-semibold">YouTube</div>
                    </div>
                    <div className="rounded-md border border-[#e4dbcc] bg-[#f8f4ec] px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8f8372]">导出包</div>
                        <div className="mt-1 truncate text-sm font-semibold">{hasSavedOutputs ? '已生成' : '待 P4 导出'}</div>
                    </div>
                </div>

                <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_330px]">
                    <div className="space-y-4">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                <Youtube className="h-4 w-4 text-[#c97545]" />
                                YouTube 主包检查
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                {youtubeChecks.map(item => (
                                    <CheckRow key={item.title} {...item} />
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                <Layers3 className="h-4 w-4 text-[#8f9d74]" />
                                平台适配矩阵
                            </div>
                            <div className="overflow-hidden rounded-md border border-[#e4dbcc]">
                                {platforms.map(([name, ratio, note, tone, label]) => (
                                    <div key={name} className="grid gap-2 border-b border-[#eee4d8] bg-[#fffcf7] px-3 py-3 last:border-b-0 md:grid-cols-[160px_80px_minmax(0,1fr)_92px] md:items-center">
                                        <div className="text-sm font-semibold">{name}</div>
                                        <div className="font-mono text-xs text-[#8f8372]">{ratio}</div>
                                        <div className="text-sm leading-5 text-[#6f6458]">{note}</div>
                                        <StatusPill tone={tone} label={label} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <aside className="space-y-3">
                        <div className="rounded-lg border border-[#e4dbcc] bg-[#f8f4ec] p-3">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                <Send className="h-4 w-4 text-[#8f9d74]" />
                                DT Contract
                            </div>
                            <div className="space-y-2 text-xs leading-5 text-[#6f6458]">
                                <div className="rounded-md border border-[#e4dbcc] bg-[#fffcf7] p-2">
                                    P3 只判断是否可交给 DT，不直接替代 DT 的草稿投递动作。
                                </div>
                                <div className="rounded-md border border-[#e4dbcc] bg-[#fffcf7] p-2">
                                    JSON 是技术交接物，不作为用户主审阅界面。
                                </div>
                                <div className="rounded-md border border-[#e4dbcc] bg-[#fffcf7] p-2">
                                    多平台暂为预留项，避免把未实现链路显示成 ready。
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-[#e4dbcc] bg-[#f8f4ec] p-3">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                <FileJson className="h-4 w-4 text-[#5b8a9b]" />
                                技术产物
                            </div>
                            <div className="space-y-2 text-xs">
                                {artifacts.map(([name, ready, note]) => (
                                    <div key={name} className="grid grid-cols-[18px_minmax(0,1fr)] gap-2 rounded-md border border-[#e4dbcc] bg-[#fffcf7] p-2">
                                        {ready ? (
                                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-[#62835c]" />
                                        ) : (
                                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-[#c97545]" />
                                        )}
                                        <div className="min-w-0">
                                            <div className="truncate font-mono text-[#4d443a]">{name}</div>
                                            <div className="mt-0.5 text-[#8f8372]">{note}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {(playlistRow || thumbnailRow || otherRow) && (
                            <div className="rounded-lg border border-[#e4dbcc] bg-[#f8f4ec] p-3">
                                <div className="mb-2 text-sm font-semibold">交接摘要</div>
                                <div className="space-y-2 text-xs leading-5 text-[#6f6458]">
                                    {playlistRow && <div>播放列表：{text(playlistRow.content) || '未设置'}</div>}
                                    {thumbnailRow && <div>缩略图：{text(thumbnailRow.content) || '未设置'}</div>}
                                    {otherRow && <div>默认设置：{otherRow.isConfirmed ? '已确认' : '待确认'}</div>}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </section>
        </div>
    );
};
