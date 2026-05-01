import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Archive,
    ArrowDownUp,
    Download,
    History,
    Loader2,
    MessageSquareQuote,
    Pencil,
    Plus,
    RefreshCcw,
    Save,
    Search,
    X,
} from 'lucide-react';
import {
    activatePersistedCrucibleConversation,
    exportPersistedCrucibleArtifacts,
    getPersistedCrucibleConversationDetail,
    listPersistedCrucibleConversations,
    updatePersistedCrucibleConversation,
} from './storage';
import type { CrucibleConversationDetail, CrucibleConversationSummary, CrucibleSnapshot } from './types';

interface CrucibleHistorySheetProps {
    isOpen: boolean;
    workspaceId?: string | null;
    onClose: () => void;
    onStartNewTopic: () => void;
    onRestoreSnapshot: (snapshot: CrucibleSnapshot) => void;
}

type SortMode = 'recent' | 'oldest' | 'rounds';

const formatUpdatedAt = (value: string) => {
    try {
        return new Intl.DateTimeFormat('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    } catch {
        return value;
    }
};

const summarizeFocus = (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
        return '这段对话已经留下了一个清晰焦点。';
    }
    return normalized.length > 64 ? `${normalized.slice(0, 64)}...` : normalized;
};

const getConversationStateLabel = (item: Pick<CrucibleConversationSummary, 'status' | 'saveMode' | 'hasDraftInput'>) => {
    if (item.status === 'archived') {
        return '已归档';
    }
    if (item.hasDraftInput) {
        return '草稿未发送';
    }
    if (item.saveMode === 'manual') {
        return '已手动保存';
    }
    if (item.saveMode === 'autosave') {
        return '自动保存';
    }
    return '对话沉淀';
};

const getConversationStateHint = (item: Pick<CrucibleConversationSummary, 'status' | 'saveMode' | 'hasDraftInput'>) => {
    if (item.status === 'archived') {
        return '这条话题已归档，不会再作为当前活跃话题自动恢复。';
    }
    if (item.hasDraftInput) {
        return '这条话题还有未发送输入，恢复后会直接回到草稿状态。';
    }
    if (item.saveMode === 'manual') {
        return '这条话题已经被明确保存，适合随时切回继续推进。';
    }
    if (item.saveMode === 'autosave') {
        return '这条话题当前主要依赖自动保存快照恢复。';
    }
    return '这条话题已沉淀为常规对话状态，可继续往下聊。';
};

const TOOL_STATUS_COPY: Record<'success' | 'failed' | 'skipped', string> = {
    success: '已执行',
    failed: '执行失败',
    skipped: '已跳过',
};

const normalizeConversationList = (items: CrucibleConversationSummary[]) => (
    items
        .slice()
        .sort((left, right) => {
            if (Boolean(left.isActive) !== Boolean(right.isActive)) {
                return left.isActive ? -1 : 1;
            }
            return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        })
);

export const CrucibleHistorySheet = ({
    isOpen,
    workspaceId,
    onClose,
    onStartNewTopic,
    onRestoreSnapshot,
}: CrucibleHistorySheetProps) => {
    const [items, setItems] = useState<CrucibleConversationSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [exportingId, setExportingId] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<CrucibleConversationDetail | null>(null);
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [draftTitle, setDraftTitle] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState<SortMode>('recent');
    const [exportFormat, setExportFormat] = useState('bundle-json');

    const patchConversationSummary = useCallback((summary: CrucibleConversationSummary) => {
        setItems((prev) => {
            const next = prev.map((item) => {
                if (item.id === summary.id) {
                    return summary;
                }
                if (summary.isActive && item.isActive) {
                    return { ...item, isActive: false };
                }
                return item;
            });

            if (!next.some((item) => item.id === summary.id)) {
                next.unshift(summary);
            }

            return normalizeConversationList(next);
        });
    }, []);

    const loadConversationList = useCallback(async (options?: { preserveSelection?: boolean }) => {
        const nextItems = normalizeConversationList(await listPersistedCrucibleConversations());
        setItems(nextItems);
        setSelectedConversationId((prev) => {
            if (options?.preserveSelection && prev && nextItems.some((item) => item.id === prev)) {
                return prev;
            }
            return nextItems[0]?.id || null;
        });
        return nextItems;
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        void loadConversationList()
            .catch((err) => {
                if (cancelled) {
                    return;
                }
                console.warn('[CrucibleHistory] Failed to list conversations:', err);
                setError('历史对话暂时读取失败，请稍后再试。');
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, loadConversationList]);

    useEffect(() => {
        if (!isOpen || !selectedConversationId) {
            setSelectedDetail(null);
            return;
        }

        let cancelled = false;
        setIsDetailLoading(true);
        setError(null);

        void getPersistedCrucibleConversationDetail(selectedConversationId)
            .then((detail) => {
                if (cancelled) {
                    return;
                }
                setSelectedDetail(detail);
                setDraftTitle(detail.summary.topicTitle || '');
                patchConversationSummary(detail.summary);
            })
            .catch((err) => {
                if (cancelled) {
                    return;
                }
                console.warn('[CrucibleHistory] Failed to read conversation detail:', err);
                setError('历史详情暂时读取失败，请稍后再试。');
            })
            .finally(() => {
                if (!cancelled) {
                    setIsDetailLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, patchConversationSummary, selectedConversationId]);

    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const nextItems = items.filter((item) => {
            if (!query) {
                return true;
            }

            const haystack = [
                item.topicTitle,
                item.lastFocus,
                item.lastSpeaker,
            ].join(' ').toLowerCase();
            return haystack.includes(query);
        });

        nextItems.sort((left, right) => {
            if (Boolean(left.isActive) !== Boolean(right.isActive)) {
                return left.isActive ? -1 : 1;
            }
            if (sortMode === 'oldest') {
                return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
            }
            if (sortMode === 'rounds') {
                return right.roundIndex - left.roundIndex;
            }
            return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        });

        return nextItems;
    }, [items, searchQuery, sortMode]);

    const hasItems = filteredItems.length > 0;
    const handleRefresh = async () => {
        setIsRefreshing(true);
        setError(null);

        try {
            await loadConversationList({ preserveSelection: true });
        } catch (err) {
            console.warn('[CrucibleHistory] Failed to refresh conversations:', err);
            setError('刷新历史对话失败了，请稍后再试。');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleRestore = async (conversationId: string) => {
        setLoadingId(conversationId);
        setError(null);

        try {
            const detail = await activatePersistedCrucibleConversation(conversationId);
            patchConversationSummary(detail.summary);
            onRestoreSnapshot(detail.snapshot);
            onClose();
        } catch (err) {
            console.warn('[CrucibleHistory] Failed to restore conversation:', err);
            setError('恢复这段历史失败了，请再试一次。');
        } finally {
            setLoadingId(null);
        }
    };

    const handleExportArtifacts = async (conversationId: string) => {
        setExportingId(conversationId);
        setError(null);

        try {
            await exportPersistedCrucibleArtifacts(conversationId, {
                format: exportFormat,
            });
        } catch (err) {
            console.warn('[CrucibleHistory] Failed to export artifacts:', err);
            setError('导出产物失败了，请稍后再试。');
        } finally {
            setExportingId(null);
        }
    };

    const handleSaveTitle = async () => {
        if (!selectedDetail?.summary.id) {
            return;
        }

        const nextTitle = draftTitle.trim();
        if (!nextTitle) {
            setError('标题不能为空。');
            return;
        }

        setSavingId(selectedDetail.summary.id);
        setError(null);

        try {
            const detail = await updatePersistedCrucibleConversation(selectedDetail.summary.id, {
                topicTitle: nextTitle,
            });
            setSelectedDetail(detail);
            setDraftTitle(detail.summary.topicTitle);
            setEditingTitleId(null);
            patchConversationSummary(detail.summary);
        } catch (err) {
            console.warn('[CrucibleHistory] Failed to rename conversation:', err);
            setError('更新标题失败了，请稍后再试。');
        } finally {
            setSavingId(null);
        }
    };

    const handleToggleArchive = async () => {
        if (!selectedDetail?.summary.id) {
            return;
        }

        const nextStatus = selectedDetail.summary.status === 'archived' ? 'active' : 'archived';
        setSavingId(selectedDetail.summary.id);
        setError(null);

        try {
            const detail = await updatePersistedCrucibleConversation(selectedDetail.summary.id, {
                status: nextStatus,
            });
            setSelectedDetail(detail);
            patchConversationSummary(detail.summary);
        } catch (err) {
            console.warn('[CrucibleHistory] Failed to update archive status:', err);
            setError(nextStatus === 'archived' ? '归档失败了，请稍后再试。' : '恢复会话失败了，请稍后再试。');
        } finally {
            setSavingId(null);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[160] flex justify-end bg-[rgba(30,24,18,0.24)] backdrop-blur-[2px]">
            <button
                type="button"
                aria-label="关闭历史对话面板"
                className="flex-1"
                onClick={onClose}
            />

            <aside className="relative flex h-full w-full max-w-[440px] flex-col border-l border-[var(--line-soft)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98)_0%,rgba(246,236,222,0.96)_100%)] shadow-[-24px_0_60px_rgba(92,67,43,0.16)]">
                <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-5 py-4">
                    <div>
                        <div className="flex items-center gap-2 text-[var(--ink-1)]">
                            <History className="h-4 w-4" />
                            <h2 className="text-base font-semibold">话题中心</h2>
                        </div>
                        <p className="mt-1 text-xs text-[var(--ink-3)]">在这里切换话题、继续旧讨论，或者直接开一个新话题。</p>
                        <p className="mt-1 text-[11px] text-[var(--ink-3)]">口径说明：草稿未发送 = 输入框里还有内容；自动保存 = 系统临时保进度；已手动保存 = 你明确按过保存。</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-2xl border border-[var(--line-soft)] bg-[rgba(255,255,255,0.72)] text-[var(--ink-2)] transition-colors hover:text-[var(--ink-1)]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="mb-4 space-y-3">
                        <div className="grid gap-2 rounded-[26px] border border-[rgba(156,117,76,0.14)] bg-[rgba(255,255,255,0.7)] px-4 py-4 shadow-[0_10px_24px_rgba(133,101,69,0.05)]">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-3)]">
                                <span className="rounded-full bg-[rgba(246,236,221,0.8)] px-2.5 py-1">共 {items.length} 段会话</span>
                                <span className="rounded-full bg-[rgba(246,236,221,0.8)] px-2.5 py-1">当前展示 {filteredItems.length} 段</span>
                                <span className="rounded-full bg-[rgba(246,236,221,0.8)] px-2.5 py-1">workspace {workspaceId?.slice(0, 8) || 'legacy'}</span>
                            </div>
                            <label className="flex items-center gap-2 rounded-2xl border border-[rgba(156,117,76,0.14)] bg-[rgba(255,252,247,0.9)] px-3 py-2">
                                <Search className="h-4 w-4 text-[var(--ink-3)]" />
                                <input
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="搜索议题、焦点或发言人"
                                    className="w-full bg-transparent text-sm text-[var(--ink-1)] outline-none placeholder:text-[var(--ink-3)]"
                                />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 rounded-2xl border border-[rgba(156,117,76,0.14)] bg-[rgba(255,252,247,0.9)] px-3 py-2">
                                    <ArrowDownUp className="h-4 w-4 text-[var(--ink-3)]" />
                                    <select
                                        value={sortMode}
                                        onChange={(event) => setSortMode(event.target.value as SortMode)}
                                        className="w-full bg-transparent text-sm text-[var(--ink-1)] outline-none"
                                    >
                                        <option value="recent">最近更新</option>
                                        <option value="rounds">轮次最多</option>
                                        <option value="oldest">最早开始</option>
                                    </select>
                                </label>
                                <label className="flex items-center gap-2 rounded-2xl border border-[rgba(156,117,76,0.14)] bg-[rgba(255,252,247,0.9)] px-3 py-2">
                                    <Download className="h-4 w-4 text-[var(--ink-3)]" />
                                    <select
                                        value={exportFormat}
                                        onChange={(event) => setExportFormat(event.target.value)}
                                        className="w-full bg-transparent text-sm text-[var(--ink-1)] outline-none"
                                    >
                                        <option value="bundle-json">bundle-json</option>
                                        <option value="markdown">markdown</option>
                                    </select>
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={() => void handleRefresh()}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(156,117,76,0.14)] bg-[rgba(255,252,247,0.9)] px-3 py-2 text-sm text-[var(--ink-2)] transition-colors hover:text-[var(--ink-1)]"
                            >
                                {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                                刷新列表
                            </button>
                            <button
                                type="button"
                                onClick={onStartNewTopic}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(156,117,76,0.16)] bg-[rgba(255,252,247,0.9)] px-3 py-2 text-sm font-medium text-[var(--ink-1)] transition-colors hover:bg-[rgba(246,236,221,0.96)]"
                            >
                                <Plus className="h-4 w-4" />
                                开始新话题
                            </button>
                        </div>
                    </div>

                    {selectedDetail || isDetailLoading ? (
                        <div className="mb-4 rounded-[26px] border border-[rgba(156,117,76,0.14)] bg-[rgba(255,255,255,0.74)] px-4 py-4 shadow-[0_10px_24px_rgba(133,101,69,0.05)]">
                            {isDetailLoading ? (
                                <div className="flex items-center gap-2 text-sm text-[var(--ink-3)]">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    正在加载会话详情...
                                </div>
                            ) : selectedDetail ? (
                                <>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            {editingTitleId === selectedDetail.summary.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        value={draftTitle}
                                                        onChange={(event) => setDraftTitle(event.target.value)}
                                                        className="w-full rounded-2xl border border-[rgba(156,117,76,0.16)] bg-[rgba(255,252,247,0.9)] px-3 py-2 text-sm text-[var(--ink-1)] outline-none"
                                                        placeholder="输入会话标题"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleSaveTitle()}
                                                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(156,117,76,0.16)] bg-[rgba(246,236,221,0.82)] text-[var(--ink-1)]"
                                                        disabled={savingId === selectedDetail.summary.id}
                                                    >
                                                        {savingId === selectedDetail.summary.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <h3 className="truncate text-sm font-semibold text-[var(--ink-1)]">
                                                        {selectedDetail.summary.topicTitle || '未命名议题'}
                                                    </h3>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingTitleId(selectedDetail.summary.id)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-[var(--ink-3)] transition-colors hover:bg-[rgba(246,236,221,0.82)] hover:text-[var(--ink-1)]"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ink-3)]">
                                                <span className="rounded-full bg-[rgba(246,236,221,0.72)] px-2.5 py-1">{selectedDetail.summary.isActive ? '当前活跃' : '历史会话'}</span>
                                                <span className="rounded-full bg-[rgba(246,236,221,0.72)] px-2.5 py-1">{getConversationStateLabel(selectedDetail.summary)}</span>
                                                <span className="rounded-full bg-[rgba(246,236,221,0.72)] px-2.5 py-1">轮次 {selectedDetail.summary.roundIndex}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-3 text-sm text-[var(--ink-2)]">
                                        <div>
                                            <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)]">焦点摘要</div>
                                            <p className="mt-1 leading-6">{summarizeFocus(selectedDetail.summary.lastFocus)}</p>
                                            <p className="mt-2 text-xs text-[var(--ink-3)]">{getConversationStateHint(selectedDetail.summary)}</p>
                                        </div>
                                        {selectedDetail.snapshot.decisionSummary ? (
                                            <div className="rounded-2xl bg-[rgba(255,252,247,0.86)] px-3 py-3">
                                                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)]">决策摘要</div>
                                                <div className="mt-2 space-y-2 text-[12px] text-[var(--ink-2)]">
                                                    {selectedDetail.snapshot.decisionSummary.stageLabel ? (
                                                        <div>阶段：{selectedDetail.snapshot.decisionSummary.stageLabel}</div>
                                                    ) : null}
                                                    <div>Research：{selectedDetail.snapshot.decisionSummary.needsResearch ? '需要' : '未请求'}</div>
                                                    <div>FactCheck：{selectedDetail.snapshot.decisionSummary.needsFactCheck ? '需要' : '未请求'}</div>
                                                </div>
                                            </div>
                                        ) : null}
                                        {selectedDetail.snapshot.toolTraces?.length ? (
                                            <div className="rounded-2xl bg-[rgba(255,252,247,0.86)] px-3 py-3">
                                                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-3)]">本轮执行工具</div>
                                                <div className="mt-2 space-y-2">
                                                    {selectedDetail.snapshot.toolTraces.map((trace) => (
                                                        <div key={`${trace.tool}-${trace.startedAt}`} className="rounded-xl border border-[rgba(156,117,76,0.12)] bg-[rgba(255,255,255,0.72)] px-3 py-2 text-[12px] text-[var(--ink-2)]">
                                                            <div className="font-medium text-[var(--ink-1)]">{trace.tool}</div>
                                                            <div className="mt-1">{TOOL_STATUS_COPY[trace.status]} · {trace.mode === 'primary' ? '主执行位' : '支援位'}</div>
                                                            {trace.input.query ? (
                                                                <div className="mt-1 break-words text-[var(--ink-3)]">Query: {trace.input.query}</div>
                                                            ) : null}
                                                            {trace.error ? (
                                                                <div className="mt-1 break-words text-[rgb(127,84,53)]">{trace.error}</div>
                                                            ) : null}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                        <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--ink-3)]">
                                            <div className="rounded-2xl bg-[rgba(255,252,247,0.86)] px-3 py-2">
                                                <div>Project</div>
                                                <div className="mt-1 break-all text-[var(--ink-2)]">{selectedDetail.sourceContext.projectId || '-'}</div>
                                            </div>
                                            <div className="rounded-2xl bg-[rgba(255,252,247,0.86)] px-3 py-2">
                                                <div>Script</div>
                                                <div className="mt-1 break-all text-[var(--ink-2)]">{selectedDetail.sourceContext.scriptPath || '-'}</div>
                                            </div>
                                        </div>
                                        <div className="rounded-2xl bg-[rgba(255,252,247,0.86)] px-3 py-2 text-[11px] text-[var(--ink-3)]">
                                            最近更新时间：{formatUpdatedAt(selectedDetail.summary.updatedAt)} · 消息 {selectedDetail.summary.messageCount} · 产物 {selectedDetail.summary.artifactCount}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void handleRestore(selectedDetail.summary.id)}
                                            disabled={loadingId === selectedDetail.summary.id}
                                            className="inline-flex items-center gap-2 rounded-full border border-[rgba(156,117,76,0.18)] bg-[rgba(246,236,221,0.7)] px-3 py-1.5 text-xs font-medium text-[var(--ink-1)] transition-colors hover:bg-[rgba(246,236,221,0.94)] disabled:cursor-wait"
                                        >
                                            {loadingId === selectedDetail.summary.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                            恢复对话
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleExportArtifacts(selectedDetail.summary.id)}
                                            disabled={exportingId === selectedDetail.summary.id}
                                            className="inline-flex items-center gap-2 rounded-full border border-[rgba(156,117,76,0.14)] bg-[rgba(255,255,255,0.88)] px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] transition-colors hover:border-[rgba(156,117,76,0.28)] hover:text-[var(--ink-1)] disabled:cursor-wait"
                                        >
                                            {exportingId === selectedDetail.summary.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                            导出 {exportFormat}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleToggleArchive()}
                                            disabled={savingId === selectedDetail.summary.id}
                                            className="inline-flex items-center gap-2 rounded-full border border-[rgba(156,117,76,0.14)] bg-[rgba(255,255,255,0.88)] px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] transition-colors hover:border-[rgba(156,117,76,0.28)] hover:text-[var(--ink-1)] disabled:cursor-wait"
                                        >
                                            {savingId === selectedDetail.summary.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                                            {selectedDetail.summary.status === 'archived' ? '恢复为活动' : '归档会话'}
                                        </button>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    ) : null}

                    {isLoading ? (
                        <div className="flex h-full items-center justify-center gap-2 text-sm text-[var(--ink-3)]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            正在读取话题列表...
                        </div>
                    ) : null}

                    {!isLoading && error ? (
                        <div className="rounded-3xl border border-[rgba(176,119,74,0.16)] bg-[rgba(255,248,240,0.88)] px-4 py-3 text-sm text-[rgb(127,84,53)]">
                            {error}
                        </div>
                    ) : null}

                    {!isLoading && !error && !hasItems ? (
                        <div className="rounded-[28px] border border-dashed border-[var(--line-soft)] bg-[rgba(255,255,255,0.48)] px-5 py-8 text-center">
                            <MessageSquareQuote className="mx-auto h-6 w-6 text-[var(--ink-3)]" />
                            <p className="mt-3 text-sm text-[var(--ink-2)]">当前还没有可恢复的话题。</p>
                            <p className="mt-1 text-xs text-[var(--ink-3)]">等你在黄金坩埚里走过一轮，对话就会按 workspace 自动沉淀成新话题。</p>
                        </div>
                    ) : null}

                    {!isLoading && hasItems ? (
                        <div className="space-y-3">
                            {filteredItems.map((item) => {
                                const isRestoring = loadingId === item.id;
                                const isExporting = exportingId === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            setSelectedConversationId(item.id);
                                            setEditingTitleId(null);
                                        }}
                                        className={`w-full rounded-[26px] border px-4 py-4 text-left shadow-[0_10px_24px_rgba(133,101,69,0.06)] transition-colors ${
                                            item.id === selectedConversationId
                                                ? 'border-[rgba(156,117,76,0.26)] bg-[rgba(255,250,240,0.92)]'
                                                : 'border-[rgba(156,117,76,0.14)] bg-[rgba(255,255,255,0.72)]'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-[var(--ink-1)]">
                                                    {item.topicTitle || '未命名议题'}
                                                </div>
                                                <div className="mt-1 text-xs text-[var(--ink-3)]">
                                                    第 {item.roundIndex} 轮 · {formatUpdatedAt(item.updatedAt)}
                                                </div>
                                            </div>
                                            {isRestoring ? (
                                                <Loader2 className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin text-[var(--accent)]" />
                                            ) : (
                                                <div className="rounded-full border border-[rgba(166,117,64,0.14)] bg-[rgba(246,236,221,0.72)] px-2 py-0.5 text-[10px] text-[var(--ink-2)]">
                                                    {item.isActive ? '当前活跃' : item.lastSpeaker || '最近一轮'}
                                                </div>
                                            )}
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">
                                            {summarizeFocus(item.lastFocus)}
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ink-3)]">
                                            <span className="rounded-full bg-[rgba(246,236,221,0.72)] px-2.5 py-1">消息 {item.messageCount}</span>
                                            <span className="rounded-full bg-[rgba(246,236,221,0.72)] px-2.5 py-1">产物 {item.artifactCount}</span>
                                            <span className="rounded-full bg-[rgba(246,236,221,0.72)] px-2.5 py-1">{getConversationStateLabel(item)}</span>
                                        </div>
                                        <div className="mt-4 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void handleRestore(item.id);
                                                }}
                                                disabled={isRestoring}
                                                className="inline-flex items-center gap-2 rounded-full border border-[rgba(156,117,76,0.18)] bg-[rgba(246,236,221,0.7)] px-3 py-1.5 text-xs font-medium text-[var(--ink-1)] transition-colors hover:bg-[rgba(246,236,221,0.94)] disabled:cursor-wait"
                                            >
                                                {isRestoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                                恢复对话
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void handleExportArtifacts(item.id);
                                                }}
                                                disabled={isExporting}
                                                className="inline-flex items-center gap-2 rounded-full border border-[rgba(156,117,76,0.14)] bg-[rgba(255,255,255,0.88)] px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] transition-colors hover:border-[rgba(156,117,76,0.28)] hover:text-[var(--ink-1)] disabled:cursor-wait"
                                            >
                                                {isExporting ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Download className="h-3.5 w-3.5" />
                                                )}
                                                导出
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}

                    {!isLoading && !hasItems && items.length > 0 ? (
                        <div className="rounded-[24px] border border-dashed border-[rgba(156,117,76,0.16)] bg-[rgba(255,252,247,0.86)] px-4 py-6 text-center">
                            <p className="text-sm text-[var(--ink-2)]">没有匹配当前搜索条件的历史会话。</p>
                            <p className="mt-1 text-xs text-[var(--ink-3)]">试试换个关键词，或者把排序切回“最近更新”。</p>
                        </div>
                    ) : null}
                </div>
            </aside>
        </div>
    );
};
