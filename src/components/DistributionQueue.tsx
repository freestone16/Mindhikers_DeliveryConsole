import { useEffect, useMemo, useState } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2, Loader2, Play, Calendar, Send } from 'lucide-react';

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
    results?: Record<string, {
        platform: string;
        status: 'success' | 'failed';
        remoteId?: string;
        url?: string;
        publishedAt?: string;
        message?: string;
    }>;
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

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    queued: {
        color: 'text-slate-400',
        bg: 'bg-slate-500/10 border-slate-500/30',
        icon: <Clock className="w-4 h-4" />,
        label: '待执行'
    },
    scheduled: {
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/30',
        icon: <Calendar className="w-4 h-4" />,
        label: '已定时'
    },
    processing: {
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10 border-yellow-500/30',
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        label: '执行中'
    },
    succeeded: {
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        icon: <CheckCircle className="w-4 h-4" />,
        label: '已发布'
    },
    failed: {
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/30',
        icon: <XCircle className="w-4 h-4" />,
        label: '失败'
    },
    retryable: {
        color: 'text-amber-300',
        bg: 'bg-amber-500/10 border-amber-500/30',
        icon: <AlertCircle className="w-4 h-4" />,
        label: '待重试'
    }
};

const PLATFORM_ICONS: Record<string, string> = {
    twitter: '🐦',
    youtube_shorts: '📱',
    youtube: '📺',
    bilibili: '📺',
    douyin: '🎵',
    wechat_video: '💬',
    weibo: '🌐',
    wechat_mp: '📝'
};

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
        message?: string;
    };
    timestamp: string;
    task?: DistributionTask;
}

const CONNECTION_STATUS = {
    connecting: {
        color: 'text-blue-300',
        bg: 'bg-blue-500/10 border-blue-500/30',
        label: '连接中'
    },
    live: {
        color: 'text-emerald-300',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        label: '实时同步中'
    },
    offline: {
        color: 'text-amber-200',
        bg: 'bg-amber-500/10 border-amber-500/30',
        label: '连接断开'
    }
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
        } catch (e) {
            console.error('Failed to fetch queue:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        setRecentEvents([]);
        fetchQueue();
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
                        const next = [payload, ...current.filter((item) => item.timestamp !== payload.timestamp || item.taskId !== payload.taskId)];
                        return next.slice(0, 5);
                    });
                } catch (error) {
                    console.error('Failed to parse distribution event:', error);
                }
            };

            source.addEventListener(eventType, handler as EventListener);
            return { eventType, handler };
        });

        source.onopen = () => {
            setEventConnection('live');
        };

        source.onerror = () => {
            setEventConnection('offline');
        };

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

    const upcomingCount = useMemo(
        () => tasks.filter((task) => task.status === 'scheduled').length,
        [tasks]
    );

    const handleDelete = async (taskId: string) => {
        if (!confirm('确定要删除这个任务吗？')) return;
        
        setActionLoading(taskId);
        try {
            if (!projectId) return;
            const params = new URLSearchParams({ projectId });
            const res = await fetch(`/api/distribution/queue/${taskId}?${params.toString()}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                await fetchQueue();
            }
        } catch (e) {
            console.error('Failed to delete task:', e);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRetry = async (taskId: string) => {
        setActionLoading(taskId);
        try {
            if (!projectId) return;
            const params = new URLSearchParams({ projectId });
            const res = await fetch(`/api/distribution/queue/${taskId}/retry?${params.toString()}`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                await fetchQueue();
            }
        } catch (e) {
            console.error('Failed to retry task:', e);
        } finally {
            setActionLoading(null);
        }
    };

    const handleExecute = async (taskId: string) => {
        setActionLoading(taskId);
        try {
            if (!projectId) return;
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
        } catch (e) {
            console.error('Failed to execute task:', e);
            alert(e instanceof Error ? e.message : '执行发布失败');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatScheduleTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const latestEvent = recentEvents[0];
    const connectionConfig = CONNECTION_STATUS[eventConnection];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Distribution Queue</h1>
                <p className="text-slate-400 text-sm mt-1">任务队列与发布进度追踪</p>
            </div>

            {!projectId && (
                <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    请先在顶部选择项目，再查看分发队列。
                </div>
            )}

            {projectId && (
                <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${connectionConfig.bg} ${connectionConfig.color}`}>
                            {connectionConfig.label}
                        </span>
                        <span className="text-sm text-slate-300">
                            {latestEvent
                                ? `${formatProgressStage(latestEvent.progress?.stage)} · ${latestEvent.message || latestEvent.type}`
                                : '等待新的分发事件'}
                        </span>
                    </div>
                    {recentEvents.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                            {recentEvents.slice(0, 3).map((event) => (
                                <span key={`${event.taskId}-${event.timestamp}`} className="rounded-full bg-slate-800 px-2.5 py-1">
                                    {formatDate(event.timestamp)} · {event.platform || event.taskId} · {event.message || event.type}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                    <div className="text-2xl font-bold text-white">{tasks.length}</div>
                    <div className="text-sm text-slate-400">总任务数</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                    <div className="text-2xl font-bold text-blue-400">{todayCount}</div>
                    <div className="text-sm text-slate-400">今日任务</div>
                </div>
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                    <div className="text-2xl font-bold text-emerald-400">{upcomingCount}</div>
                    <div className="text-sm text-slate-400">定时任务</div>
                </div>
            </div>

            {/* Task List */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-3 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-200">发布任务</h2>
                    <button
                        onClick={fetchQueue}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        刷新
                    </button>
                </div>

                {tasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>暂无发布任务</p>
                        <p className="text-xs mt-1">前往 Publish Composer 创建新任务</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {tasks.map((task) => {
                            const statusConfig = STATUS_CONFIG[task.status];
                            const latestTaskEvent = task.latestEvent;
                            
                            return (
                                <div key={task.taskId} className="p-4 hover:bg-slate-800/30 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className={`flex-shrink-0 mt-0.5 ${statusConfig.color}`}>
                                            {statusConfig.icon}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                                                    {statusConfig.label}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {formatDate(task.createdAt)}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {task.platforms.map(platform => (
                                                    <span key={platform} className="text-sm text-slate-300">
                                                        {PLATFORM_ICONS[platform] || '📦'} {platform}
                                                    </span>
                                                ))}
                                            </div>
                                            
                                            <div className="mt-1 text-sm text-slate-400 truncate">
                                                {task.assets.title || task.assets.mediaUrl}
                                            </div>
                                            
                                            {task.scheduledAt && task.status === 'scheduled' && (
                                                <div className="mt-1 text-xs text-blue-400 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    定时: {formatScheduleTime(task.scheduledAt)} ({task.timezone})
                                                </div>
                                            )}
                                            
                                            {task.error && (
                                                <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {task.error}
                                                </div>
                                            )}

                                            {latestTaskEvent && (
                                                <div className="mt-2 text-xs text-slate-300">
                                                    <span className="text-slate-500">最近事件：</span>
                                                    {latestTaskEvent.platform ? `${latestTaskEvent.platform} · ` : ''}
                                                    {formatProgressStage(latestTaskEvent.progress?.stage)}
                                                    {latestTaskEvent.message ? ` · ${latestTaskEvent.message}` : ''}
                                                </div>
                                            )}

                                            {task.results && Object.values(task.results).length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    {Object.values(task.results).map((result) => (
                                                        <div key={result.platform} className="text-xs text-slate-400">
                                                            <span className={result.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                                                                {result.platform}
                                                            </span>
                                                            {' · '}
                                                            {result.message || (result.status === 'success' ? '发布成功' : '发布失败')}
                                                            {result.publishedAt && (
                                                                <>
                                                                    {' · '}
                                                                    发布于 {formatDate(result.publishedAt)}
                                                                </>
                                                            )}
                                                            {result.url && (
                                                                <>
                                                                    {' · '}
                                                                    <a
                                                                        href={result.url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-blue-400 hover:text-blue-300"
                                                                    >
                                                                        打开链接
                                                                    </a>
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {task.status === 'queued' && (
                                                <button
                                                    onClick={() => handleExecute(task.taskId)}
                                                    disabled={actionLoading === task.taskId}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading === task.taskId ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Send className="w-3.5 h-3.5" />
                                                    )}
                                                    立即执行
                                                </button>
                                            )}

                                            {task.status === 'retryable' && (
                                                <button
                                                    onClick={() => handleRetry(task.taskId)}
                                                    disabled={actionLoading === task.taskId}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-yellow-600 hover:bg-yellow-500 text-white rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading === task.taskId ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Play className="w-3.5 h-3.5" />
                                                    )}
                                                    重试
                                                </button>
                                            )}
                                            
                                            {(task.status === 'queued' || task.status === 'scheduled' || task.status === 'retryable' || task.status === 'failed') && (
                                                <button
                                                    onClick={() => handleDelete(task.taskId)}
                                                    disabled={actionLoading === task.taskId}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading === task.taskId ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
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
            </div>
        </div>
    );
};
