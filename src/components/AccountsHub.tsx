import { useState, useEffect } from 'react';
import { RefreshCw, Unlink, CheckCircle, XCircle, AlertCircle, QrCode, ExternalLink } from 'lucide-react';

interface PlatformAccount {
    platform: string;
    status: 'connected' | 'expired' | 'needs_refresh' | 'offline' | 'draft_ready';
    target?: string;
    authType: 'oauth' | 'cookie' | 'appkey';
}

interface PlatformGroup {
    name: string;
    platforms: PlatformAccount[];
}

const PLATFORM_LABELS: Record<string, string> = {
    twitter: 'X / Twitter',
    weibo: '新浪微博',
    wechat_mp: '微信公众号',
    youtube: 'YouTube',
    bilibili: 'Bilibili',
    youtube_shorts: 'YT Shorts',
    douyin: '抖音',
    wechat_video: '微信视频号'
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    connected: {
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        icon: <CheckCircle className="w-4 h-4" />,
        label: '已连接'
    },
    expired: {
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/30',
        icon: <XCircle className="w-4 h-4" />,
        label: '已过期'
    },
    needs_refresh: {
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10 border-yellow-500/30',
        icon: <AlertCircle className="w-4 h-4" />,
        label: '需刷新'
    },
    offline: {
        color: 'text-slate-400',
        bg: 'bg-slate-700/30 border-slate-600/30',
        icon: <XCircle className="w-4 h-4" />,
        label: '离线'
    },
    draft_ready: {
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/30',
        icon: <CheckCircle className="w-4 h-4" />,
        label: '草稿就绪'
    }
};

const ACTION_BUTTONS: Record<string, { label: string; icon: React.ReactNode; action: string }> = {
    oauth: {
        label: '重新授权',
        icon: <RefreshCw className="w-3.5 h-3.5" />,
        action: 'refresh'
    },
    cookie: {
        label: '扫码刷新',
        icon: <QrCode className="w-3.5 h-3.5" />,
        action: 'refresh'
    },
    appkey: {
        label: '编辑凭证',
        icon: <ExternalLink className="w-3.5 h-3.5" />,
        action: 'edit'
    }
};

export const AccountsHub = () => {
    const [groups, setGroups] = useState<{ A: PlatformGroup; B: PlatformGroup; C: PlatformGroup } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState<string | null>(null);

    const fetchAuthStatus = async () => {
        try {
            const res = await fetch('/api/distribution/auth/status');
            const data = await res.json();
            if (data.success) {
                setGroups(data.data);
            }
        } catch (e) {
            console.error('Failed to fetch auth status:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuthStatus();
    }, []);

    const handleRefresh = async (platform: string) => {
        setRefreshing(platform);
        try {
            const res = await fetch('/api/distribution/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform })
            });
            const data = await res.json();
            if (data.success) {
                await fetchAuthStatus();
            }
        } catch (e) {
            console.error('Failed to refresh:', e);
        } finally {
            setRefreshing(null);
        }
    };

    const handleRevoke = async (platform: string) => {
        if (!confirm('确定要解除该平台的授权吗？')) return;
        
        try {
            const res = await fetch('/api/distribution/auth/revoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform })
            });
            const data = await res.json();
            if (data.success) {
                await fetchAuthStatus();
            }
        } catch (e) {
            console.error('Failed to revoke:', e);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const renderGroup = (group: PlatformGroup, groupKey: 'A' | 'B' | 'C') => {
        const groupEmoji = groupKey === 'A' ? '📌' : groupKey === 'B' ? '📺' : '📱';
        
        return (
            <div key={groupKey} className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-3 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
                    <span className="text-lg">{groupEmoji}</span>
                    <h2 className="text-sm font-semibold text-slate-200">{group.name}</h2>
                    <span className="ml-auto text-xs text-slate-500">
                        {group.platforms.filter(p => p.status === 'connected').length}/{group.platforms.length} 已连接
                    </span>
                </div>
                
                <div className="divide-y divide-slate-800">
                    {group.platforms.map((platform) => {
                        const statusConfig = STATUS_CONFIG[platform.status];
                        const actionButton = ACTION_BUTTONS[platform.authType];
                        
                        return (
                            <div
                                key={platform.platform}
                                className="px-5 py-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors"
                            >
                                <div className={`flex-shrink-0 ${statusConfig.color}`}>
                                    {statusConfig.icon}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-200">
                                            {PLATFORM_LABELS[platform.platform] || platform.platform}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                                            {statusConfig.label}
                                        </span>
                                    </div>
                                    {platform.target && (
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            目标: {platform.target}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleRefresh(platform.platform)}
                                        disabled={refreshing === platform.platform}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors disabled:opacity-50"
                                    >
                                        {refreshing === platform.platform ? (
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            actionButton.icon
                                        )}
                                        {actionButton.label}
                                    </button>
                                    
                                    {platform.status === 'connected' && (
                                        <button
                                            onClick={() => handleRevoke(platform.platform)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors"
                                        >
                                            <Unlink className="w-3.5 h-3.5" />
                                            解除
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Accounts Hub</h1>
                <p className="text-slate-400 text-sm mt-1">全局社交账号授权中心</p>
            </div>
            
            {groups && (
                <div className="space-y-4">
                    {renderGroup(groups.A, 'A')}
                    {renderGroup(groups.B, 'B')}
                    {renderGroup(groups.C, 'C')}
                </div>
            )}
            
            <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-400">
                        <p className="font-medium text-slate-300 mb-1">安全说明</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>API 授权：通过 OAuth 2.0 安全授权，不存储账号密码</li>
                            <li>Cookie 授权：本地浏览器扫码，Cookie 加密存储</li>
                            <li>系统每天自动检查一次授权状态</li>
                            <li>授权过期后将无法使用该平台发布</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
