import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2, Loader2, Play, Calendar } from 'lucide-react';

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
    status: 'pending' | 'scheduled' | 'running' | 'completed' | 'failed';
    createdAt: string;
    scheduledAt?: string;
    completedAt?: string;
    error?: string;
    results?: Record<string, any>;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    pending: {
        color: 'text-slate-400',
        bg: 'bg-slate-500/10 border-slate-500/30',
        icon: <Clock className="w-4 h-4" />,
        label: '等待中'
    },
    scheduled: {
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/30',
        icon: <Calendar className="w-4 h-4" />,
        label: '已定时'
    },
    running: {
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10 border-yellow-500/30',
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        label: '执行中'
    },
    completed: {
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        icon: <CheckCircle className="w-4 h-4" />,
        label: '已完成'
    },
    failed: {
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/30',
        icon: <XCircle className="w-4 h-4" />,
        label: '失败'
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

export const DistributionQueue = () => {
    const [tasks, setTasks] = useState<DistributionTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [todayCount, setTodayCount] = useState(0);
    const [upcomingCount, setUpcomingCount] = useState(0);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchQueue = async () => {
        try {
            const res = await fetch('http://localhost:3002/api/distribution/queue');
            const data = await res.json();
            if (data.success) {
                setTasks(data.queue || []);
                setTodayCount(data.todayCount || 0);
                setUpcomingCount(data.upcomingCount || 0);
            }
        } catch (e) {
            console.error('Failed to fetch queue:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const handleDelete = async (taskId: string) => {
        if (!confirm('确定要删除这个任务吗？')) return;
        
        setActionLoading(taskId);
        try {
            const res = await fetch(`http://localhost:3002/api/distribution/queue/${taskId}`, {
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
            const res = await fetch(`http://localhost:3002/api/distribution/queue/${taskId}/retry`, {
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
                                        </div>
                                        
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {task.status === 'failed' && (
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
                                            
                                            {(task.status === 'pending' || task.status === 'scheduled') && (
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
