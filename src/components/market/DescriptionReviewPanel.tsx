/**
 * DescriptionReviewPanel.tsx — Phase 2 完整视频描述审阅台
 *
 * 目标：把视频描述从表格行内小编辑器提升为主审阅区。
 * 左侧编辑结构化区块，右侧全局预览最终 YouTube 描述顺序。
 */
import React from 'react';
import { AlertCircle, CheckCircle2, FileText, Search, Sparkles } from 'lucide-react';
import type { DescriptionBlock } from '../../types';
import { DescriptionEditor } from './DescriptionEditor';

interface DescriptionReviewPanelProps {
    keyword: string;
    blocks: DescriptionBlock[];
    onChange: (blocks: DescriptionBlock[]) => void;
}

const SEO_GEO_SEQUENCE = [
    { type: 'hook', label: '前两行钩子', reason: 'YouTube 搜索摘要优先读取，必须自然包含主关键词。' },
    { type: 'series', label: '价值说明', reason: '说明这期解决什么问题，给人和搜索引擎一个明确主题。' },
    { type: 'geo_qa', label: 'GEO 问答锚点', reason: '用问答结构帮助生成式搜索理解实体、问题与答案。' },
    { type: 'timeline', label: '章节时间轴', reason: '帮助用户跳转，也强化视频结构。' },
    { type: 'references', label: '资料与概念', reason: '承接引用、工具、书目和关键实体。' },
    { type: 'action_plan', label: '互动引导', reason: '把订阅、评论、延伸观看放在信息主体之后。' },
    { type: 'pinned_comment', label: '置顶评论', reason: '不混入主描述，但作为运营动作预览。' },
    { type: 'hashtags', label: 'Hashtags', reason: '最后放 2-4 个核心标签，不干扰正文。' },
];

function toText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(toText).filter(Boolean).join('\n');
    if (typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>)
            .map(([key, item]) => `${key}: ${toText(item)}`)
            .join('\n');
    }
    return String(value);
}

function orderedBlocks(blocks: DescriptionBlock[]) {
    return SEO_GEO_SEQUENCE
        .map(item => blocks.find(block => block.type === item.type))
        .filter(Boolean) as DescriptionBlock[];
}

export function composeDescriptionPreview(blocks: DescriptionBlock[]) {
    return orderedBlocks(blocks)
        .filter(block => block.type !== 'pinned_comment')
        .filter(block => toText(block.content).trim())
        .map(block => toText(block.content).trim())
        .join('\n\n');
}

export const DescriptionReviewPanel: React.FC<DescriptionReviewPanelProps> = ({
    keyword,
    blocks,
    onChange,
}) => {
    const normalizedBlocks = Array.isArray(blocks) ? blocks : [];
    const preview = composeDescriptionPreview(normalizedBlocks);
    const blockTypes = new Set(normalizedBlocks.map(block => block.type));
    const firstLines = preview.split('\n').slice(0, 2).join(' ');
    const hasKeyword = firstLines.includes(keyword);
    const hasQuestion = /[?？]/.test(toText(normalizedBlocks.find(block => block.type === 'geo_qa')?.content));
    const hasTimeline = /\b\d{1,2}:\d{2}\b/.test(toText(normalizedBlocks.find(block => block.type === 'timeline')?.content));
    const hashtagCount = (toText(normalizedBlocks.find(block => block.type === 'hashtags')?.content).match(/#[^\s#]+/g) || []).length;

    const checks = [
        { label: '前两行含主关键词', ok: hasKeyword },
        { label: 'GEO 问答包含问题句', ok: hasQuestion },
        { label: '章节时间轴格式可读', ok: hasTimeline },
        { label: 'Hashtags 控制在 2-4 个', ok: hashtagCount >= 2 && hashtagCount <= 4 },
    ];

    return (
        <section className="mb-4 overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900/35">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/50 bg-slate-900/50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-400" />
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-200">完整视频描述审阅台</h3>
                        <p className="text-xs text-slate-500">按 SEO/GEO 顺序编辑并预览最终 YouTube 描述</p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-md border border-slate-700/50 bg-slate-950/30 px-2.5 py-1.5 text-xs text-slate-500">
                    <Search className="h-3.5 w-3.5" />
                    <span>主关键词：{keyword}</span>
                </div>
            </div>

            <div className="grid gap-3 p-3 xl:grid-cols-[minmax(220px,0.82fr)_minmax(300px,1fr)_minmax(220px,0.78fr)]">
                <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                        <Sparkles className="h-3.5 w-3.5" />
                        结构化编辑
                    </div>
                    <DescriptionEditor blocks={normalizedBlocks} onChange={onChange} />
                </div>

                <div className="min-w-0">
                    <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">全局预览</div>
                        <div className="text-xs text-slate-600">{preview.length} 字</div>
                    </div>
                    <textarea
                        value={preview}
                        readOnly
                        rows={18}
                        className="h-[520px] w-full resize-none rounded-md border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm leading-7 text-slate-300 outline-none"
                    />
                </div>

                <aside className="min-w-0">
                    <div className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">SEO/GEO 检查</div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                        {checks.map(check => (
                            <div
                                key={check.label}
                                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                                    check.ok
                                        ? 'border-green-500/20 bg-green-500/10 text-green-300'
                                        : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'
                                }`}
                            >
                                {check.ok
                                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                                    : <AlertCircle className="h-3.5 w-3.5 text-yellow-500/70" />
                                }
                                <span>{check.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 rounded-md border border-slate-700/50 bg-slate-950/30 p-3">
                        <div className="mb-2 text-xs font-medium text-slate-400">推荐顺序</div>
                        <div className="space-y-1.5">
                            {SEO_GEO_SEQUENCE.map((item, index) => (
                                <div key={item.type} className="grid grid-cols-[22px_minmax(74px,96px)_1fr] gap-2 text-xs">
                                    <span className="font-mono text-slate-600">{index + 1}</span>
                                    <span className={blockTypes.has(item.type as any) ? 'text-slate-300' : 'text-slate-600'}>{item.label}</span>
                                    <span className="text-slate-600">{item.reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </section>
    );
};
