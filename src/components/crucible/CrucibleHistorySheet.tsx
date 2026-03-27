import { useEffect, useMemo, useState } from 'react';
import { Download, History, Loader2, MessageSquareQuote, X } from 'lucide-react';
import {
    activatePersistedCrucibleConversation,
    exportPersistedCrucibleArtifacts,
    listPersistedCrucibleConversations,
} from './storage';
import type { CrucibleConversationSummary, CrucibleSnapshot } from './types';

interface CrucibleHistorySheetProps {
    isOpen: boolean;
    onClose: () => void;
    onRestoreSnapshot: (snapshot: CrucibleSnapshot) => void;
}

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

export const CrucibleHistorySheet = ({
    isOpen,
    onClose,
    onRestoreSnapshot,
}: CrucibleHistorySheetProps) => {
    const [items, setItems] = useState<CrucibleConversationSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [exportingId, setExportingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        void listPersistedCrucibleConversations()
            .then((nextItems) => {
                if (cancelled) {
                    return;
                }
                setItems(nextItems);
            })
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
    }, [isOpen]);

    const hasItems = useMemo(() => items.length > 0, [items.length]);

    const handleRestore = async (conversationId: string) => {
        setLoadingId(conversationId);
        setError(null);

        try {
            const detail = await activatePersistedCrucibleConversation(conversationId);
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
                format: 'bundle-json',
            });
        } catch (err) {
            console.warn('[CrucibleHistory] Failed to export artifacts:', err);
            setError('导出产物失败了，请稍后再试。');
        } finally {
            setExportingId(null);
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

            <aside className="relative flex h-full w-full max-w-[420px] flex-col border-l border-[var(--line-soft)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98)_0%,rgba(246,236,222,0.96)_100%)] shadow-[-24px_0_60px_rgba(92,67,43,0.16)]">
                <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-5 py-4">
                    <div>
                        <div className="flex items-center gap-2 text-[var(--ink-1)]">
                            <History className="h-4 w-4" />
                            <h2 className="text-base font-semibold">历史对话</h2>
                        </div>
                        <p className="mt-1 text-xs text-[var(--ink-3)]">按当前 workspace 恢复最近的黄金坩埚会话。</p>
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
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center gap-2 text-sm text-[var(--ink-3)]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            正在读取历史对话...
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
                            <p className="mt-3 text-sm text-[var(--ink-2)]">当前还没有可恢复的历史对话。</p>
                            <p className="mt-1 text-xs text-[var(--ink-3)]">等你在黄金坩埚里走过一轮，对话就会开始按 workspace 留档。</p>
                        </div>
                    ) : null}

                    {!isLoading && hasItems ? (
                        <div className="space-y-3">
                            {items.map((item) => {
                                const isRestoring = loadingId === item.id;
                                const isExporting = exportingId === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        className="rounded-[26px] border border-[rgba(156,117,76,0.14)] bg-[rgba(255,255,255,0.72)] px-4 py-4 shadow-[0_10px_24px_rgba(133,101,69,0.06)]"
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
                                                    {item.lastSpeaker || '最近一轮'}
                                                </div>
                                            )}
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">
                                            {summarizeFocus(item.lastFocus)}
                                        </p>
                                        <div className="mt-4 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void handleRestore(item.id)}
                                                disabled={isRestoring}
                                                className="inline-flex items-center gap-2 rounded-full border border-[rgba(156,117,76,0.18)] bg-[rgba(246,236,221,0.7)] px-3 py-1.5 text-xs font-medium text-[var(--ink-1)] transition-colors hover:bg-[rgba(246,236,221,0.94)] disabled:cursor-wait"
                                            >
                                                {isRestoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                                恢复对话
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleExportArtifacts(item.id)}
                                                disabled={isExporting}
                                                className="inline-flex items-center gap-2 rounded-full border border-[rgba(156,117,76,0.14)] bg-[rgba(255,255,255,0.88)] px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] transition-colors hover:border-[rgba(156,117,76,0.28)] hover:text-[var(--ink-1)] disabled:cursor-wait"
                                                title="当前先导出结构化 bundle，format 参数已预留给后续 markdown/docx/pdf 等文档形态。"
                                            >
                                                {isExporting ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Download className="h-3.5 w-3.5" />
                                                )}
                                                导出产物
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            </aside>
        </div>
    );
};
