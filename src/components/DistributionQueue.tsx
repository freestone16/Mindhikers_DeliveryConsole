import { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    Copy,
    Loader2,
    Play,
    RefreshCw,
    Send,
    Trash2,
    XCircle
} from 'lucide-react';

interface DistributionTask {
    taskId: string;
    projectId: string;
    platforms: string[];
    assets: {
        mediaUrl: string;
        textDraft: string;
        title: string;
        tags: string[];
    };
    scheduleTime?: string;
    timezone?: string;
    status: 'queued' | 'scheduled' | 'processing' | 'succeeded' | 'failed' | 'retryable';
    createdAt: string;
    updatedAt?: string;
    scheduledAt?: string;
    completedAt?: string;
    error?: string;
    results?: Record<
        string,
        {
            platform: string;
            status: 'success' | 'failed';
            deliveryMode?: 'published' | 'draft_ready' | 'artifact_ready';
            remoteId?: string;
            url?: string;
            publishedAt?: string;
            artifactPath?: string;
            message?: string;
        }
    >;
    latestEvent?: {
        type: 'job_created' | 'job_deleted' | 'job_retried' | 'job_started' | 'job_progress' | 'job_failed' | 'job_succeeded';
        status: DistributionTask['status'];
        platform?: string;
        message?: string;
        progress?: {
            stage: 'validating_auth' | 'uploading_media' | 'finalizing_result';
            current?: number;
            total?: number;
        };
        timestamp: string;
    };
}

interface DistributionTaskEvent {
    type: 'job_created' | 'job_deleted' | 'job_retried' | 'job_started' | 'job_progress' | 'job_failed' | 'job_succeeded';
    taskId: string;
    projectId: string;
    status: DistributionTask['status'];
    platform?: string;
    message?: string;
    progress?: {
        stage: 'validating_auth' | 'uploading_media' | 'finalizing_result';
        current?: number;
        total?: number;
    };
    result?: {
        platform: string;
        status: 'success' | 'failed';
        remoteId?: string;
        url?: string;
        publishedAt?: string;
        artifactPath?: string;
        message?: string;
    };
    timestamp: string;
    task?: DistributionTask;
}

const STATUS_CONFIG: Record<
    DistributionTask['status'],
    { color: string; bg: string; icon: React.ReactNode; label: string }
> = {
    queued: {
        color: 'text-text-secondary',
        bg: 'bg-surface-alt/50 border-border',
        icon: <Clock className="h-4 w-4" />,
        label: '待执行',
    },
    scheduled: {
        color: 'text-amber-200',
        bg: 'bg-amber-500/10 border-amber-500/30',
        icon: <Calendar className="h-4 w-4" />,
        label: '已定时',
    },
    processing: {
        color: 'text-amber-300',
        bg: 'bg-amber-500/12 border-amber-500/30',
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        label: '执行中',
    },
    succeeded: {
        color: 'text-emerald-300',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        icon: <CheckCircle className="h-4 w-4" />,
        label: '已发布',
    },
    failed: {
        color: 'text-red-300',
        bg: 'bg-red-500/10 border-red-500/30',
        icon: <XCircle className="h-4 w-4" />,
        label: '失败',
    },
    retryable: {
        color: 'text-amber-200',
        bg: 'bg-amber-500/10 border-amber-500/30',
        icon: <AlertCircle className="h-4 w-4" />,
        label: '待重试',
    },
};

const PLATFORM_ICONS: Record<string, string> = {
    twitter: '🐦',
    youtube_shorts: '📱',
    youtube: '📺',
    bilibili: '📺',
    douyin: '🎵',
    wechat_video: '💬',
    weibo: '🌐',
    wechat_mp: '📝',
};

const CONNECTION_STATUS = {
    connecting: {
        color: 'text-amber-200',
        bg: 'bg-amber-500/10 border-amber-500/30',
        label: '连接中',
    },
    live: {
        color: 'text-emerald-300',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        label: '实时同步中',
    },
    offline: {
        color: 'text-red-300',
        bg: 'bg-red-500/10 border-red-500/30',
        label: '连接断开',
    },
} as const;

function formatProgressStage(stage?: 'validating_auth' | 'uploading_media' | 'finalizing_result') {
    switch (stage) {
        case 'validating_auth':
            return '校验账号';
        case 'uploading_media':
            return '上传媒体';
        case 'finalizing_result':
            return '整理结果';
        default:
            return '状态更新';
    }
}

function updateTasksFromEvent(queue: DistributionTask[], event: DistributionTaskEvent) {
    if (event.type === 'job_deleted') {
        return queue.filter((task) => task.taskId !== event.taskId);
    }

    const incomingTask = event.task;
    if (!incomingTask) {
        return queue;
    }

    const existingIndex = queue.findIndex((task) => task.taskId === event.taskId);
    if (existingIndex === -1) {
        return [incomingTask, ...queue];
    }

    const nextQueue = [...queue];
    nextQueue[existingIndex] = incomingTask;
    return nextQueue;
}

export const DistributionQueue = ({ projectId }: { projectId?: string }) => {
    const [tasks, setTasks] = useState<DistributionTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [eventConnection, setEventConnection] = useState<'connecting' | 'live' | 'offline'>('connecting');
    const [recentEvents, setRecentEvents] = useState<DistributionTaskEvent[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | DistributionTask['status']>('all');
    const [platformFilter, setPlatformFilter] = useState<'all' | string>('all');

    const fetchQueue = async () => {
        if (!projectId) {
            setTasks([]);
            setLoading(false);
            return;
        }

        try {
            const params = new URLSearchParams({ projectId });
            const res = await fetch(`/api/distribution/queue?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setTasks(data.queue || []);
            }
        } catch (error) {
            console.error('Failed to fetch queue:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        setRecentEvents([]);
        void fetchQueue();
    }, [projectId]);

    useEffect(() => {
        if (!projectId) {
            setEventConnection('offline');
            return;
        }

        setEventConnection('connecting');
        const params = new URLSearchParams({ projectId });
        const source = new EventSource(`/api/distribution/events?${params.toString()}`);
        const eventTypes: DistributionTaskEvent['type'][] = [
            'job_created',
            'job_deleted',
            'job_retried',
            'job_started',
            'job_progress',
            'job_failed',
            'job_succeeded',
        ];

        const handlers = eventTypes.map((eventType) => {
            const handler = (rawEvent: MessageEvent<string>) => {
                try {
                    const payload = JSON.parse(rawEvent.data) as DistributionTaskEvent;
                    setEventConnection('live');
                    setTasks((current) => updateTasksFromEvent(current, payload));
                    setRecentEvents((current) => {
                        const next = [
                            payload,
                            ...current.filter((item) => item.timestamp !== payload.timestamp || item.taskId !== payload.taskId),
                        ];
                        return next.slice(0, 6);
                    });
                } catch (error) {
                    console.error('Failed to parse distribution event:', error);
                }
            };

            source.addEventListener(eventType, handler as EventListener);
            return { eventType, handler };
        });

        source.onopen = () => setEventConnection('live');
        source.onerror = () => setEventConnection('offline');

        return () => {
            handlers.forEach(({ eventType, handler }) => {
                source.removeEventListener(eventType, handler as EventListener);
            });
            source.close();
        };
    }, [projectId]);

    const todayCount = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return tasks.filter((task) => task.createdAt.startsWith(today)).length;
    }, [tasks]);

    const upcomingCount = useMemo(() => tasks.filter((task) => task.status === 'scheduled').length, [tasks]);

    const availablePlatforms = useMemo(() => {
        return Array.from(new Set(tasks.flatMap((task) => task.platforms)));
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => {
            const statusMatch = statusFilter === 'all' || task.status === statusFilter;
            const platformMatch = platformFilter === 'all' || task.platforms.includes(platformFilter);
            return statusMatch && platformMatch;
        });
    }, [platformFilter, statusFilter, tasks]);

    const latestEvent = recentEvents[0];
    const connectionConfig = CONNECTION_STATUS[eventConnection];

    const handleDelete = async (taskId: string) => {
        if (!confirm('确定要删除这个任务吗？')) {
            return;
        }

        setActionLoading(taskId);
        try {
            if (!projectId) {
                return;
            }

            const params = new URLSearchParams({ projectId });
            const res = await fetch(`/api/distribution/queue/${taskId}?${params.toString()}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                await fetchQueue();
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRetry = async (taskId: string) => {
        setActionLoading(taskId);
        try {
            if (!projectId) {
                return;
            }

            const params = new URLSearchParams({ projectId });
            const res = await fetch(`/api/distribution/queue/${taskId}/retry?${params.toString()}`, {
                method: 'POST',
            });
            const data = await res.json();
            if (data.success) {
                await fetchQueue();
            }
        } catch (error) {
            console.error('Failed to retry task:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleExecute = async (taskId: string) => {
        setActionLoading(taskId);
        try {
            if (!projectId) {
                return;
            }

            const res = await fetch(`/api/distribution/queue/${taskId}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ projectId }),
            });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || '执行发布失败');
            }

            if (eventConnection !== 'live') {
                await fetchQueue();
            }
        } catch (error) {
            console.error('Failed to execute task:', error);
            alert(error instanceof Error ? error.message : '执行发布失败');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            console.error('Failed to copy path:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-module-mid" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-module/15 bg-gradient-to-r from-module/10 via-module-secondary/5 to-transparent p-6">
                <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${connectionConfig.bg} ${connectionConfig.color}`}>
                        {connectionConfig.label}
                    </span>
                    {projectId && (
                        <span className="inline-flex items-center rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-text-secondary">
                            Project · {projectId}
                        </span>
                    )}
                </div>
                <h1 className="mt-4 text-3xl font-bold text-text">Distribution Queue</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                    把事件流、结果与动作统一收在一个发布工作台里。顶部不再只是日志，而是帮助你快速发现可执行任务和已产出物料。
                </p>
            </div>

            {!projectId && (
                <div className="rounded-xl border border-module/30 bg-module/10 px-4 py-3 text-sm text-module-light">
                    请先在顶部选择项目，再查看分发队列。
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                    <section className="rounded-3xl border border-border bg-surface/60 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <div className="text-sm font-semibold text-text">筛选与视图</div>
                                <p className="mt-1 text-sm text-text-secondary">优先扫描状态与平台，再深入单个任务。</p>
                            </div>
                            <button
                                onClick={fetchQueue}
                                className="inline-flex items-center gap-2 rounded-2xl border border-module/20 bg-module/10 px-4 py-2 text-sm text-module-light transition-colors hover:bg-module/15"
                            >
                                <RefreshCw className="h-4 w-4" />
                                刷新
                            </button>
                        </div>

                        <div className="mt-4 space-y-4">
                            <div>
                                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-text-muted">状态筛选</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['all', 'queued', 'processing', 'succeeded', 'retryable', 'failed', 'scheduled'] as const).map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setStatusFilter(status)}
                                            className={`rounded-full border px-3 py-1 text-xs transition-all ${statusFilter === status
                                                ? 'border-module/40 bg-module/10 text-module-light'
                                                : 'border-border bg-bg/50 text-text-secondary hover:border-module/20'
                                                }`}
                                        >
                                            {status === 'all' ? '全部' : STATUS_CONFIG[status].label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-text-muted">平台筛选</div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setPlatformFilter('all')}
                                        className={`rounded-full border px-3 py-1 text-xs transition-all ${platformFilter === 'all'
                                            ? 'border-module/40 bg-module/10 text-module-light'
                                            : 'border-border bg-bg/50 text-text-secondary hover:border-module/20'
                                            }`}
                                    >
                                        全部平台
                                    </button>
                                    {availablePlatforms.map((platform) => (
                                        <button
                                            key={platform}
                                            onClick={() => setPlatformFilter(platform)}
                                            className={`rounded-full border px-3 py-1 text-xs transition-all ${platformFilter === platform
                                                ? 'border-module/40 bg-module/10 text-module-light'
                                                : 'border-border bg-bg/50 text-text-secondary hover:border-module/20'
                                                }`}
                                        >
                                            {PLATFORM_ICONS[platform] || '📦'} {platform}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-border bg-surface/60 overflow-hidden">
                        <div className="border-b border-border px-5 py-4">
                            <h2 className="text-sm font-semibold text-text">发布任务</h2>
                            <p className="mt-1 text-sm text-text-muted">让任务、结果与动作出现在同一张卡片上。</p>
                        </div>

                        {filteredTasks.length === 0 ? (
                            <div className="px-6 py-10 text-center text-text-muted">
                                <Clock className="mx-auto mb-3 h-8 w-8 opacity-50" />
                                <p>当前筛选条件下暂无任务</p>
                                <p className="mt-1 text-xs">前往 Publish Composer 创建新任务</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {filteredTasks.map((task) => {
                                    const statusConfig = STATUS_CONFIG[task.status];
                                    const latestTaskEvent = task.latestEvent;

                                    return (
                                        <div key={task.taskId} className="p-5 transition-colors hover:bg-surface-alt/20">
                                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${statusConfig.bg} ${statusConfig.color}`}>
                                                            {statusConfig.icon}
                                                            {statusConfig.label}
                                                        </span>
                                                        <span className="text-xs text-text-muted">{formatDate(task.createdAt)}</span>
                                                        <span className="rounded-full border border-border bg-bg/60 px-2 py-1 text-[11px] text-text-muted">
                                                            {task.taskId}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 text-lg font-semibold text-text">
                                                        {task.assets.title || task.assets.mediaUrl}
                                                    </div>

                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {task.platforms.map((platform) => (
                                                            <span key={platform} className="rounded-full border border-border bg-bg/50 px-3 py-1 text-xs text-text-secondary">
                                                                {PLATFORM_ICONS[platform] || '📦'} {platform}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    {task.scheduledAt && task.status === 'scheduled' && (
                                                        <div className="mt-3 flex items-center gap-2 text-xs text-module-light">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            定时 {formatDate(task.scheduledAt)} ({task.timezone})
                                                        </div>
                                                    )}

                                                    {task.error && (
                                                        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-500/15 bg-red-500/5 p-3 text-xs text-red-200">
                                                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                                            <span>{task.error}</span>
                                                        </div>
                                                    )}

                                                    {latestTaskEvent && (
                                                        <div className="mt-3 text-xs text-text-secondary">
                                                            <span className="text-text-muted">最近事件：</span>
                                                            {latestTaskEvent.platform ? `${latestTaskEvent.platform} · ` : ''}
                                                            {formatProgressStage(latestTaskEvent.progress?.stage)}
                                                            {latestTaskEvent.message ? ` · ${latestTaskEvent.message}` : ''}
                                                        </div>
                                                    )}

                                                    {task.results && Object.values(task.results).length > 0 && (
                                                        <div className="mt-4 space-y-3">
                                                            {Object.values(task.results).map((result) => (
                                                                <div key={result.platform} className="rounded-2xl border border-border bg-bg/50 p-3">
                                                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                                                        <span className={result.status === 'success' ? 'text-emerald-300' : 'text-red-300'}>
                                                                            {result.platform}
                                                                        </span>
                                                                        {result.deliveryMode && (
                                                                            <span className="rounded-full border border-module/20 bg-module/8 px-2 py-0.5 text-[11px] text-module-light">
                                                                                {result.deliveryMode}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="mt-2 text-sm text-text-secondary">
                                                                        {result.message || (result.status === 'success' ? '发布成功' : '发布失败')}
                                                                    </div>

                                                                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
                                                                        {result.publishedAt && <span>发布于 {formatDate(result.publishedAt)}</span>}
                                                                        {result.url && (
                                                                            <a
                                                                                href={result.url}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="text-module-light hover:text-module-light"
                                                                            >
                                                                                打开链接
                                                                            </a>
                                                                        )}
                                                                        {result.artifactPath && (
                                                                            <button
                                                                                onClick={() => void handleCopy(result.artifactPath!)}
                                                                                className="inline-flex items-center gap-1 text-module-light hover:text-module-light"
                                                                            >
                                                                                <Copy className="h-3.5 w-3.5" />
                                                                                复制物料路径
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-2 xl:w-[220px] xl:flex-col">
                                                    {task.status === 'queued' && (
                                                        <button
                                                            onClick={() => handleExecute(task.taskId)}
                                                            disabled={actionLoading === task.taskId}
                                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-module to-module-secondary px-4 py-2 text-xs font-semibold text-white transition-all hover:brightness-110 disabled:bg-surface-alt disabled:text-text-muted"
                                                        >
                                                            {actionLoading === task.taskId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                                            立即执行
                                                        </button>
                                                    )}

                                                    {task.status === 'retryable' && (
                                                        <button
                                                            onClick={() => handleRetry(task.taskId)}
                                                            disabled={actionLoading === task.taskId}
                                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-module/25 bg-module/10 px-4 py-2 text-xs font-semibold text-module-light transition-colors hover:bg-module/15 disabled:border-border disabled:bg-surface disabled:text-text-muted"
                                                        >
                                                            {actionLoading === task.taskId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                                                            重试
                                                        </button>
                                                    )}

                                                    {(task.status === 'queued' ||
                                                        task.status === 'scheduled' ||
                                                        task.status === 'retryable' ||
                                                        task.status === 'failed') && (
                                                            <button
                                                                onClick={() => handleDelete(task.taskId)}
                                                                disabled={actionLoading === task.taskId}
                                                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface/70 px-4 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-alt disabled:text-text-muted"
                                                            >
                                                                {actionLoading === task.taskId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                                删除
                                                            </button>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>

                <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
                    <div className="rounded-3xl border border-module/20 bg-bg/70 p-5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-module-light/80">Live Pulse</div>
                        <div className="mt-4 text-sm text-text-secondary">
                            {latestEvent
                                ? `${formatProgressStage(latestEvent.progress?.stage)} · ${latestEvent.message || latestEvent.type}`
                                : '等待新的分发事件'}
                        </div>
                        {recentEvents.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {recentEvents.slice(0, 4).map((event) => (
                                    <div key={`${event.taskId}-${event.timestamp}`} className="rounded-2xl border border-border bg-surface/60 p-3 text-xs text-text-secondary">
                                        <div className="text-text-muted">{formatDate(event.timestamp)}</div>
                                        <div className="mt-1">
                                            {event.platform || event.taskId} · {event.message || event.type}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-3xl border border-border bg-surface/60 p-5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">Snapshot</div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-border bg-bg/50 p-4">
                                <div className="text-2xl font-bold text-text">{tasks.length}</div>
                                <div className="mt-1 text-xs text-text-muted">总任务数</div>
                            </div>
                            <div className="rounded-2xl border border-border bg-bg/50 p-4">
                                <div className="text-2xl font-bold text-module-light">{todayCount}</div>
                                <div className="mt-1 text-xs text-text-muted">今日任务</div>
                            </div>
                            <div className="rounded-2xl border border-border bg-bg/50 p-4">
                                <div className="text-2xl font-bold text-emerald-300">
                                    {tasks.filter((task) => task.status === 'succeeded').length}
                                </div>
                                <div className="mt-1 text-xs text-text-muted">成功任务</div>
                            </div>
                            <div className="rounded-2xl border border-border bg-bg/50 p-4">
                                <div className="text-2xl font-bold text-module-light">{upcomingCount}</div>
                                <div className="mt-1 text-xs text-text-muted">定时任务</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-border bg-surface/60 p-5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">Queue Notes</div>
                        <ul className="mt-4 space-y-2 text-sm leading-6 text-text-secondary">
                            <li className="flex items-start gap-2">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-module-mid/80" />
                                <span>把实时事件降为辅助层，任务卡片才是主视图。</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-module-mid/80" />
                                <span>对 `artifact_ready / draft_ready / published` 给出不同结果信号。</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-module-mid/80" />
                                <span>用筛选而不是长列表滚动，提升运营扫描效率。</span>
                            </li>
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    );
};
