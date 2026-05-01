/**
 * DescriptionEditor.tsx — Sprint 4: 视频描述 8 子区块编辑器
 *
 * 子区块：
 *   hook / series / geo_qa / timeline / references / action_plan / pinned_comment / hashtags
 *
 * 功能：
 * - 每个区块可折叠展开
 * - 内联 textarea 编辑
 * - 字数统计 + emoji 计数
 * - 纯文本（严禁 ## / ** / - 等 Markdown 符号提示）
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit3, AlertCircle } from 'lucide-react';
import type { DescriptionBlock } from '../../types';

interface DescriptionEditorProps {
    blocks: DescriptionBlock[];
    onChange: (blocks: DescriptionBlock[]) => void;
    readOnly?: boolean;
}

const BLOCK_META: Record<string, { icon: string; hint: string }> = {
    hook:          { icon: '🎣', hint: '前两行搜索摘要，1-2句，自然包含主关键词' },
    series:        { icon: '📚', hint: '视频价值说明：这期解决什么问题，为什么值得看' },
    geo_qa:        { icon: '🤖', hint: 'GEO问答，供AI引擎索引，格式：问？答。' },
    timeline:      { icon: '⏱️', hint: '章节时间轴，每行：MM:SS 章节名' },
    references:    { icon: '📎', hint: '参考书目/工具，每行一条' },
    action_plan:   { icon: '📢', hint: '订阅/点赞/评论引导，含emoji' },
    pinned_comment:{ icon: '📌', hint: '置顶评论文字，引导查看描述' },
    hashtags:      { icon: '#️⃣', hint: 'Hashtags，空格分隔，建议2-4个核心标签' },
};

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

function countChars(text: string): { chars: number; emojis: number; hasMarkdown: boolean } {
    const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
    const mdRegex = /#{1,6}\s|[*_]{1,2}[^*_]+[*_]{1,2}|^\s*[-*+]\s/m;
    return {
        chars: text.length,
        emojis: (text.match(emojiRegex) || []).length,
        hasMarkdown: mdRegex.test(text),
    };
}

const BlockItem: React.FC<{
    block: DescriptionBlock;
    onChange: (block: DescriptionBlock) => void;
    readOnly: boolean;
}> = ({ block, onChange, readOnly }) => {
    const meta = BLOCK_META[block.type] || { icon: '📝', hint: '' };
    const content = toText(block.content);
    const stats = countChars(content);

    return (
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
            {/* Header */}
            <button
                onClick={() => onChange({ ...block, isCollapsed: !block.isCollapsed })}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
            >
                <span className="text-base leading-none">{meta.icon}</span>
                <span className="text-sm font-medium text-slate-300 flex-1">{block.label}</span>
                {content && !block.isCollapsed && (
                    <span className="text-xs text-slate-600">{stats.chars}字</span>
                )}
                {stats.hasMarkdown && (
                    <span title="包含Markdown符号，描述应为纯文本">
                        <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                    </span>
                )}
                {block.isCollapsed
                    ? <ChevronRight className="w-4 h-4 text-slate-600" />
                    : <ChevronDown className="w-4 h-4 text-slate-600" />
                }
            </button>

            {/* Content */}
            {!block.isCollapsed && (
                <div className="bg-slate-900/40">
                    {readOnly ? (
                        <div className="px-3 py-2 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {content || <span className="text-slate-600 italic">（空）</span>}
                        </div>
                    ) : (
                        <div className="relative">
                            <textarea
                                value={content}
                                onChange={e => onChange({ ...block, content: e.target.value })}
                                placeholder={meta.hint}
                                rows={Math.max(3, Math.ceil(content.length / 60))}
                                className="w-full bg-transparent px-3 py-2 text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:bg-slate-800/30 leading-relaxed"
                            />
                            <div className="flex items-center justify-between px-3 pb-2 text-xs text-slate-600">
                                <span className="italic">{meta.hint}</span>
                                <span>{stats.chars} 字 {stats.emojis > 0 && `· ${stats.emojis} emoji`}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const DescriptionEditor: React.FC<DescriptionEditorProps> = ({
    blocks,
    onChange,
    readOnly = false,
}) => {
    const [allExpanded, setAllExpanded] = useState(false);
    const normalizedBlocks = (Array.isArray(blocks) ? blocks : []).map((block, index) => ({
        ...block,
        id: block.id || `block-${index}`,
        type: block.type || 'hook',
        label: block.label || block.type || `区块 ${index + 1}`,
        content: toText(block.content),
        isCollapsed: Boolean(block.isCollapsed),
    })) as DescriptionBlock[];

    const handleBlockChange = (index: number, block: DescriptionBlock) => {
        const next = [...normalizedBlocks];
        next[index] = block;
        onChange(next);
    };

    const toggleAll = () => {
        const next = normalizedBlocks.map(b => ({ ...b, isCollapsed: allExpanded }));
        onChange(next);
        setAllExpanded(!allExpanded);
    };

    const totalChars = normalizedBlocks.reduce((sum, b) => sum + toText(b.content).length, 0);

    return (
        <div className="space-y-1.5">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-1 mb-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Edit3 className="w-3 h-3" />
                    <span>视频描述</span>
                    <span className="text-slate-600">·</span>
                    <span>共 {totalChars} 字</span>
                </div>
                <button
                    onClick={toggleAll}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                    {allExpanded ? '全部折叠' : '全部展开'}
                </button>
            </div>

            {/* Block List */}
            {normalizedBlocks.map((block, i) => (
                <BlockItem
                    key={block.id}
                    block={block}
                    onChange={b => handleBlockChange(i, b)}
                    readOnly={readOnly}
                />
            ))}
        </div>
    );
};
