/**
 * MarketPlanTable.tsx — Sprint 4: Phase 2 营销方案 6 行审阅表格
 *
 * 6 行：标题 / 视频描述 / 缩略图 / 播放列表 / 标签 / 其他设置
 *
 * 功能：
 * - 每行显示类型标签 + 内容预览 + ✅ 确认按钮 + 🔄 重新生成按钮
 * - 点击行展开内联编辑器
 * - description 行展开 DescriptionEditor
 * - 其他行用 textarea/input 内联编辑
 * - 重新生成弹出 instruction 输入框
 */
import React, { useState } from 'react';
import {
    CheckCircle2, Circle, RefreshCw, ChevronDown, ChevronRight,
    Loader2, Tag, List, Image, Settings, FileText, Type
} from 'lucide-react';
import type { MarketingPlan, MarketingPlanRow, DescriptionBlock } from '../../types';
import { DescriptionEditor } from './DescriptionEditor';
import { DescriptionReviewPanel, composeDescriptionPreview } from './DescriptionReviewPanel';

interface MarketPlanTableProps {
    plan: MarketingPlan;
    projectId: string;
    onUpdatePlan: (plan: MarketingPlan) => void;
}

const ROW_ICONS: Record<string, React.ReactNode> = {
    title:       <Type className="w-4 h-4" />,
    description: <FileText className="w-4 h-4" />,
    thumbnail:   <Image className="w-4 h-4" />,
    playlist:    <List className="w-4 h-4" />,
    tags:        <Tag className="w-4 h-4" />,
    other:       <Settings className="w-4 h-4" />,
};

const ROW_COLORS: Record<string, string> = {
    title:       'text-blue-400',
    description: 'text-purple-400',
    thumbnail:   'text-pink-400',
    playlist:    'text-teal-400',
    tags:        'text-yellow-400',
    other:       'text-slate-400',
};

function toText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(', ');
    if (typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>)
            .map(([key, item]) => `${key}: ${toText(item)}`)
            .join('\n');
    }
    return String(value);
}

const DESCRIPTION_BLOCK_TYPES: DescriptionBlock['type'][] = [
    'hook',
    'series',
    'geo_qa',
    'timeline',
    'references',
    'action_plan',
    'pinned_comment',
    'hashtags',
];

function composeDescriptionContent(blocks: DescriptionBlock[]): string {
    return composeDescriptionPreview(blocks);
}

function extractJsonObject(text: string): string {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return fenced[1].trim();
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
    return trimmed;
}

function parseDescriptionRevision(text: string, previousBlocks: DescriptionBlock[]): DescriptionBlock[] | null {
    try {
        const parsed = JSON.parse(extractJsonObject(text));
        const payload = parsed.description_blocks || parsed;
        if (!payload || typeof payload !== 'object') return null;

        return previousBlocks.map((block, index) => {
            const raw = payload[block.type] ?? payload[block.label] ?? payload[DESCRIPTION_BLOCK_TYPES[index]];
            return {
                ...block,
                content: raw == null ? block.content : toText(raw),
                isCollapsed: false,
            };
        });
    } catch {
        return null;
    }
}

// ── Row Editor ────────────────────────────────────────────────────────────────
interface RowEditorProps {
    row: MarketingPlanRow;
    onChange: (row: MarketingPlanRow) => void;
    isRevising: boolean;
    onRevise: (instruction: string) => void;
}

const RowEditor: React.FC<RowEditorProps> = ({ row, onChange, isRevising, onRevise }) => {
    const [instruction, setInstruction] = useState('');
    const [showInstruction, setShowInstruction] = useState(false);
    const content = toText(row.content);

    const handleDescriptionBlocksChange = (blocks: DescriptionBlock[]) => {
        onChange({
            ...row,
            descriptionBlocks: blocks,
            content: composeDescriptionContent(blocks),
            isConfirmed: false,
        });
    };

    const submitRevise = () => {
        if (!instruction.trim()) return;
        onRevise(instruction.trim());
        setInstruction('');
        setShowInstruction(false);
    };

    return (
        <div className="border-t border-slate-700/50 bg-slate-900/30">
            <div className="p-4">
                {/* Content Editor */}
                {row.rowType === 'description' ? (
                    <DescriptionEditor
                        blocks={row.descriptionBlocks || []}
                        onChange={handleDescriptionBlocksChange}
                    />
                ) : row.rowType === 'tags' ? (
                    <div>
                        <textarea
                            value={content}
                            onChange={e => onChange({ ...row, content: e.target.value, isConfirmed: false })}
                            rows={3}
                            placeholder="标签1,标签2,标签3,... (逗号分隔)"
                            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-slate-500"
                        />
                        <div className="mt-1 text-xs text-slate-600">
                            {content.split(',').filter(Boolean).length} 个标签
                        </div>
                        {/* Tag chips preview */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {content.split(',').filter(Boolean).slice(0, 20).map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-400">
                                    {tag.trim()}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <textarea
                        value={content}
                        onChange={e => onChange({ ...row, content: e.target.value, isConfirmed: false })}
                        rows={row.rowType === 'thumbnail' || row.rowType === 'other' ? 3 : 2}
                        placeholder={`输入${row.label}...`}
                        className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-slate-500"
                    />
                )}

                {/* Title char counter */}
                {row.rowType === 'title' && (
                    <div className={`mt-1 text-xs ${content.length > 60 ? 'text-red-400' : 'text-slate-600'}`}>
                        {content.length} / 60 字符
                        {content.length > 60 && ' — 超出建议长度'}
                    </div>
                )}

                {/* Revise Section */}
                <div className="mt-3 flex items-center gap-2">
                    <button
                        onClick={() => setShowInstruction(!showInstruction)}
                        disabled={isRevising}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700/50 transition-colors disabled:opacity-50"
                    >
                        {isRevising ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3 h-3" />
                        )}
                        {isRevising ? '重新生成中...' : '🤖 AI 重新生成'}
                    </button>
                </div>

                {showInstruction && !isRevising && (
                    <div className="mt-2 flex gap-2">
                        <input
                            type="text"
                            value={instruction}
                            onChange={e => setInstruction(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submitRevise(); }}
                            placeholder="输入修改指令，如：更简洁、加入更多emoji、突出关键词..."
                            className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-orange-500/50"
                            autoFocus
                        />
                        <button
                            onClick={submitRevise}
                            disabled={!instruction.trim()}
                            className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                        >
                            执行
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Main Table ────────────────────────────────────────────────────────────────
export const MarketPlanTable: React.FC<MarketPlanTableProps> = ({
    plan,
    projectId,
    onUpdatePlan,
}) => {
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [revisingRowId, setRevisingRowId] = useState<string | null>(null);

    const updateRow = (rowId: string, updates: Partial<MarketingPlanRow>) => {
        const rows = plan.rows.map(r => r.id === rowId ? { ...r, ...updates } : r);
        onUpdatePlan({ ...plan, rows });
    };

    const toggleConfirm = (rowId: string) => {
        const row = plan.rows.find(r => r.id === rowId);
        if (!row) return;
        updateRow(rowId, { isConfirmed: !row.isConfirmed });
    };

    const toggleExpand = (rowId: string) => {
        setExpandedRowId(prev => prev === rowId ? null : rowId);
    };

    const handleRevise = async (row: MarketingPlanRow, instruction: string) => {
        setRevisingRowId(row.id);
        try {
            const res = await fetch('/api/market/v3/revise-row', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rowType: row.rowType,
                    rowLabel: row.label,
                    instruction,
                    currentContent: row.content,
                    descriptionBlocks: row.descriptionBlocks,
                    keyword: plan.keyword,
                    keywordId: plan.keywordId,
                    projectId,
                }),
            });

            const reader = res.body?.getReader();
            if (!reader) return;

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const event = JSON.parse(line.slice(6));
                        if (event.type === 'row_ready') {
                            if (row.rowType === 'description') {
                                const blocks = parseDescriptionRevision(event.content, row.descriptionBlocks || []);
                                if (blocks) {
                                    updateRow(row.id, {
                                        descriptionBlocks: blocks,
                                        content: composeDescriptionContent(blocks),
                                        isConfirmed: false,
                                    });
                                } else {
                                    updateRow(row.id, { content: toText(event.content), isConfirmed: false });
                                }
                            } else {
                                updateRow(row.id, { content: toText(event.content), isConfirmed: false });
                            }
                        }
                    } catch { /* ignore parse errors */ }
                }
            }
        } catch (e: any) {
            console.error('[MarketPlanTable] revise failed:', e);
        } finally {
            setRevisingRowId(null);
        }
    };

    const confirmedCount = plan.rows.filter(r => r.isConfirmed).length;
    const descriptionRow = plan.rows.find(row => row.rowType === 'description');

    const updateDescriptionBlocks = (blocks: DescriptionBlock[]) => {
        if (!descriptionRow) return;
        updateRow(descriptionRow.id, {
            descriptionBlocks: blocks,
            content: composeDescriptionContent(blocks),
            isConfirmed: false,
        });
    };

    return (
        <div className="space-y-4">
            {descriptionRow?.descriptionBlocks && (
                <DescriptionReviewPanel
                    keyword={plan.keyword}
                    blocks={descriptionRow.descriptionBlocks}
                    onChange={updateDescriptionBlocks}
                />
            )}

            {/* Progress bar */}
            <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-slate-500">字段确认 {confirmedCount} / {plan.rows.length}</span>
                <div className="flex-1 mx-3 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-green-500/70 rounded-full transition-all duration-500"
                        style={{ width: `${(confirmedCount / plan.rows.length) * 100}%` }}
                    />
                </div>
                {confirmedCount === plan.rows.length && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 全部完成
                    </span>
                )}
            </div>

            {/* Rows */}
            <div className="overflow-hidden rounded-lg border border-slate-700/50">
                <div className="border-b border-slate-700/50 bg-slate-900/40 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-200">发布字段确认清单</div>
                    <div className="text-xs text-slate-500">标题、描述、标签和默认设置需要逐项确认后再导出</div>
                </div>
                <div className="divide-y divide-slate-700/50">
                {plan.rows.map(row => {
                    const isExpanded = expandedRowId === row.id;
                    const isRevising = revisingRowId === row.id;
                    const iconColor = ROW_COLORS[row.rowType] || 'text-slate-400';

                    // Content preview (truncated)
                    const content = toText(row.content);
                    const preview = row.rowType === 'description'
                        ? composeDescriptionPreview(row.descriptionBlocks || []).slice(0, 80) || content.slice(0, 80)
                        : content.slice(0, 80);

                    return (
                        <div key={row.id} className={`${row.isConfirmed ? 'bg-green-900/5' : 'bg-slate-800/40'}`}>
                            {/* Row Header */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                {/* Confirm toggle */}
                                <button
                                    onClick={() => toggleConfirm(row.id)}
                                    className={`flex-shrink-0 transition-colors ${row.isConfirmed ? 'text-green-400' : 'text-slate-600 hover:text-slate-400'}`}
                                    title={row.isConfirmed ? '取消确认' : '标记确认'}
                                >
                                    {row.isConfirmed
                                        ? <CheckCircle2 className="w-5 h-5" />
                                        : <Circle className="w-5 h-5" />
                                    }
                                </button>

                                {/* Row type icon + label */}
                                <div className={`flex items-center gap-1.5 flex-shrink-0 w-24 ${iconColor}`}>
                                    {ROW_ICONS[row.rowType]}
                                    <span className="text-xs font-medium">{row.label}</span>
                                </div>

                                {/* Content preview */}
                                <button
                                    onClick={() => toggleExpand(row.id)}
                                    className="flex-1 text-left flex items-center gap-2 min-w-0"
                                >
                                    {isRevising ? (
                                        <span className="text-xs text-orange-400 flex items-center gap-1">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            AI 重新生成中...
                                        </span>
                                    ) : preview ? (
                                        <span className="text-sm text-slate-400 truncate">{preview}{content.length > 80 ? '...' : ''}</span>
                                    ) : (
                                        <span className="text-sm text-slate-600 italic">点击展开编辑</span>
                                    )}
                                </button>

                                {/* Expand toggle */}
                                <button
                                    onClick={() => toggleExpand(row.id)}
                                    className="flex-shrink-0 text-slate-600 hover:text-slate-400 transition-colors"
                                >
                                    {isExpanded
                                        ? <ChevronDown className="w-4 h-4" />
                                        : <ChevronRight className="w-4 h-4" />
                                    }
                                </button>
                            </div>

                            {/* Inline editor */}
                            {isExpanded && (
                                <RowEditor
                                    row={row}
                                    onChange={updated => updateRow(row.id, updated)}
                                    isRevising={isRevising}
                                    onRevise={instruction => handleRevise(row, instruction)}
                                />
                            )}
                        </div>
                    );
                })}
                </div>
            </div>
        </div>
    );
};
