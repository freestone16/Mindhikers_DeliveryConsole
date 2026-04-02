import { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    CheckCircle,
    ExternalLink,
    QrCode,
    RefreshCw,
    Shield,
    Sparkles,
    Unlink,
    XCircle
} from 'lucide-react';

interface PlatformAccount {
    platform: string;
    status: 'connected' | 'expired' | 'needs_refresh' | 'offline' | 'draft_ready';
    target?: string;
    authType: 'oauth' | 'cookie' | 'appkey';
    lastAuth?: string;
}

interface PlatformGroup {
    name: string;
    platforms: PlatformAccount[];
}

interface AccountsPayload {
    A: PlatformGroup;
    B: PlatformGroup;
    C: PlatformGroup;
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

const GROUP_META: Record<'A' | 'B' | 'C', { emoji: string; summary: string }> = {
    A: {
        emoji: '📌',
        summary: '图文平台优先看 OAuth、Cookie 和草稿型凭证的可用性。',
    },
    B: {
        emoji: '📺',
        summary: '长视频平台更依赖长期稳定授权，过期要优先补齐。',
    },
    C: {
        emoji: '📱',
        summary: '竖屏池通常刷新频率更高，适合集中管理扫码型账号。',
    },
};

const STATUS_CONFIG: Record<
    PlatformAccount['status'],
    { color: string; bg: string; icon: React.ReactNode; label: string }
> = {
    connected: {
        color: 'text-emerald-300',
        bg: 'bg-emerald-500/10 border-emerald-500/25',
        icon: <CheckCircle className="h-4 w-4" />,
        label: '已连接',
    },
    expired: {
        color: 'text-red-300',
        bg: 'bg-red-500/10 border-red-500/25',
        icon: <XCircle className="h-4 w-4" />,
        label: '已过期',
    },
    needs_refresh: {
        color: 'text-amber-200',
        bg: 'bg-amber-500/10 border-amber-500/25',
        icon: <AlertCircle className="h-4 w-4" />,
        label: '需刷新',
    },
    offline: {
        color: 'text-text-muted',
        bg: 'bg-surface-alt/60 border-border',
        icon: <XCircle className="h-4 w-4" />,
        label: '离线',
    },
    draft_ready: {
        color: 'text-sky-300',
        bg: 'bg-sky-500/10 border-sky-500/25',
        icon: <CheckCircle className="h-4 w-4" />,
        label: '草稿就绪',
    },
};

const ACTION_BUTTONS: Record<PlatformAccount['authType'], { label: string; icon: React.ReactNode }> = {
    oauth: {
        label: '重新授权',
        icon: <RefreshCw className="h-3.5 w-3.5" />,
    },
    cookie: {
        label: '扫码刷新',
        icon: <QrCode className="h-3.5 w-3.5" />,
    },
    appkey: {
        label: '编辑凭证',
        icon: <ExternalLink className="h-3.5 w-3.5" />,
    },
};

function formatDate(dateValue?: string) {
    if (!dateValue) {
        return '暂无记录';
    }

    return new Date(dateValue).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export const AccountsHub = () => {
    const [groups, setGroups] = useState<AccountsPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState<string | null>(null);
    const [lastChecked, setLastChecked] = useState<string | null>(null);

    const fetchAuthStatus = async () => {
        try {
            const res = await fetch('/api/distribution/auth/status');
            const data = await res.json();
            if (data.success) {
                setGroups(data.data);
                setLastChecked(data.lastChecked ?? null);
            }
        } catch (error) {
            console.error('Failed to fetch auth status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchAuthStatus();
    }, []);

    const handleYoutubeAuth = async (platform: string) => {
        const res = await fetch(`/api/distribution/auth/url?platform=${encodeURIComponent(platform)}`);
        const data = await res.json();

        if (!data.success || !data.authUrl) {
            throw new Error(data.error || 'Failed to get YouTube auth URL');
        }

        const popup = window.open(data.authUrl, 'youtube-oauth', 'width=640,height=760');
        if (!popup) {
            throw new Error('OAuth popup was blocked. Please allow popups and try again.');
        }

        await new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(() => {
                cleanup();
                reject(new Error('Timed out waiting for YouTube authorization.'));
            }, 120000);

            const popupCheck = window.setInterval(() => {
                if (popup.closed) {
                    cleanup();
                    reject(new Error('Authorization window was closed before completion.'));
                }
            }, 500);

            const handleMessage = (event: MessageEvent) => {
                if (event.data?.type !== 'youtube-auth-success') {
                    return;
                }

                cleanup();
                resolve();
            };

            const cleanup = () => {
                window.clearTimeout(timeout);
                window.clearInterval(popupCheck);
                window.removeEventListener('message', handleMessage);
            };

            window.addEventListener('message', handleMessage);
        });
    };

    const handleRefresh = async (platform: string) => {
        setRefreshing(platform);
        try {
            if (platform === 'youtube' || platform === 'youtube_shorts') {
                await handleYoutubeAuth(platform);
                await fetchAuthStatus();
                return;
            }

            const res = await fetch('/api/distribution/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform }),
            });
            const data = await res.json();
            if (data.success) {
                await fetchAuthStatus();
            }
        } catch (error) {
            console.error('Failed to refresh:', error);
            alert(error instanceof Error ? error.message : '授权刷新失败');
        } finally {
            setRefreshing(null);
        }
    };

    const handleRevoke = async (platform: string) => {
        if (!confirm('确定要解除该平台的授权吗？')) {
            return;
        }

        try {
            const res = await fetch('/api/distribution/auth/revoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform }),
            });
            const data = await res.json();
            if (data.success) {
                await fetchAuthStatus();
            }
        } catch (error) {
            console.error('Failed to revoke:', error);
        }
    };

    const allPlatforms = useMemo(() => {
        if (!groups) {
            return [];
        }

        return [groups.A, groups.B, groups.C].flatMap((group) => group.platforms);
    }, [groups]);

    const healthSnapshot = useMemo(() => {
        const total = allPlatforms.length;
        const connected = allPlatforms.filter((platform) => platform.status === 'connected').length;
        const draftReady = allPlatforms.filter((platform) => platform.status === 'draft_ready').length;
        const risky = allPlatforms.filter((platform) =>
            ['expired', 'needs_refresh', 'offline'].includes(platform.status)
        ).length;

        return {
            total,
            connected,
            draftReady,
            risky,
        };
    }, [allPlatforms]);

    const priorityPlatforms = useMemo(() => {
        return allPlatforms.filter((platform) => platform.status !== 'connected' && platform.status !== 'draft_ready');
    }, [allPlatforms]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-module-mid" />
            </div>
        );
    }

    const renderGroup = (group: PlatformGroup, groupKey: 'A' | 'B' | 'C') => {
        const groupMeta = GROUP_META[groupKey];
        const connectedCount = group.platforms.filter((platform) => platform.status === 'connected').length;

        return (
            <section key={groupKey} className="rounded-3xl border border-border bg-surface/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-text">
                            <span className="text-lg">{groupMeta.emoji}</span>
                            {group.name}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-text-secondary">{groupMeta.summary}</p>
                    </div>
                    <div className="inline-flex items-center rounded-full border border-border bg-bg/60 px-3 py-1 text-xs text-text-secondary">
                        {connectedCount}/{group.platforms.length} 已连接
                    </div>
                </div>

                <div className="mt-4 space-y-3">
                    {group.platforms.map((platform) => {
                        const statusConfig = STATUS_CONFIG[platform.status];
                        const actionButton = ACTION_BUTTONS[platform.authType];

                        return (
                            <div
                                key={platform.platform}
                                className="rounded-2xl border border-border bg-bg/55 p-4 transition-colors hover:border-module/20"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center ${statusConfig.color}`}>{statusConfig.icon}</span>
                                            <span className="text-sm font-medium text-text">
                                                {PLATFORM_LABELS[platform.platform] || platform.platform}
                                            </span>
                                            <span
                                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusConfig.bg} ${statusConfig.color}`}
                                            >
                                                {statusConfig.label}
                                            </span>
                                            <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text-secondary">
                                                {platform.authType.toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-2">
                                            <div className="rounded-xl border border-border bg-surface/40 px-3 py-2">
                                                目标：{platform.target || '未命名目标'}
                                            </div>
                                            <div className="rounded-xl border border-border bg-surface/40 px-3 py-2">
                                                最近授权：{formatDate(platform.lastAuth)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => handleRefresh(platform.platform)}
                                            disabled={refreshing === platform.platform}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-module/30 bg-gradient-to-r from-module to-module-secondary px-3 py-2 text-xs font-medium text-white transition-all hover:brightness-110 disabled:border-border disabled:bg-surface-alt disabled:text-text-muted"
                                        >
                                            {refreshing === platform.platform ? (
                                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                actionButton.icon
                                            )}
                                            {actionButton.label}
                                        </button>

                                        {platform.status === 'connected' && (
                                            <button
                                                onClick={() => handleRevoke(platform.platform)}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border/80 hover:bg-surface-alt"
                                            >
                                                <Unlink className="h-3.5 w-3.5" />
                                                解除
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        );
    };

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-module/15 bg-gradient-to-r from-module/10 via-module-secondary/5 to-transparent p-6">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center rounded-full border border-module/30 bg-module/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-module-light">
                        Authorization Center
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-text-secondary">
                        Last Check · {formatDate(lastChecked ?? undefined)}
                    </span>
                </div>
                <h1 className="mt-4 text-3xl font-bold text-text">Accounts Hub</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                    统一查看账号状态、授权类型与风险边界，让分发动作先建立在可用账号之上，再进入内容和队列。
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border bg-surface/60 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Total Platforms</div>
                    <div className="mt-3 text-3xl font-semibold text-text">{healthSnapshot.total}</div>
                    <div className="mt-1 text-sm text-text-secondary">当前纳入统一分发台的账号池</div>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80">Connected</div>
                    <div className="mt-3 text-3xl font-semibold text-emerald-200">{healthSnapshot.connected}</div>
                    <div className="mt-1 text-sm text-text-secondary">可直接进入真实发布链路</div>
                </div>
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-sky-300/80">Draft Ready</div>
                    <div className="mt-3 text-3xl font-semibold text-sky-200">{healthSnapshot.draftReady}</div>
                    <div className="mt-1 text-sm text-text-secondary">适合保持一期的草稿/物料交付语义</div>
                </div>
                <div className="rounded-2xl border border-module/20 bg-module/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-module-light/80">Needs Attention</div>
                    <div className="mt-3 text-3xl font-semibold text-module-light">{healthSnapshot.risky}</div>
                    <div className="mt-1 text-sm text-text-secondary">过期、离线或需刷新，建议优先处理</div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                    {groups && (
                        <>
                            {renderGroup(groups.A, 'A')}
                            {renderGroup(groups.B, 'B')}
                            {renderGroup(groups.C, 'C')}
                        </>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="rounded-2xl border border-module/15 bg-bg/60 p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-module-light/80">Health Snapshot</div>
                        <div className="mt-4 space-y-3">
                            {priorityPlatforms.length === 0 ? (
                                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">
                                    当前所有账号都处于可用或草稿可交付状态。
                                </div>
                            ) : (
                                priorityPlatforms.slice(0, 4).map((platform) => {
                                    const statusConfig = STATUS_CONFIG[platform.status];
                                    return (
                                        <div key={platform.platform} className="rounded-2xl border border-border bg-surface/60 px-4 py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-sm font-medium text-text">
                                                    {PLATFORM_LABELS[platform.platform] || platform.platform}
                                                </div>
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] ${statusConfig.bg} ${statusConfig.color}`}
                                                >
                                                    {statusConfig.label}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xs leading-5 text-text-secondary">
                                                {platform.target ? `目标：${platform.target}` : '建议先补目标配置'}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-bg/60 p-4">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                            <Shield className="h-4 w-4 text-module-light" />
                            Safety Playbook
                        </div>
                        <ul className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
                            <li className="flex items-start gap-2">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-module-mid/80" />
                                <span>OAuth 平台优先走官方授权，不存储账号密码。</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-module-mid/80" />
                                <span>Cookie 型平台适合集中在这里做扫码刷新，不要到发布页再补救。</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-module-mid/80" />
                                <span>`draft_ready` 代表可产出草稿或物料，但不等于已经具备真实直发能力。</span>
                            </li>
                        </ul>
                    </div>

                    <div className="rounded-2xl border border-module/15 bg-module/5 p-4">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-module-light/80">
                            <Sparkles className="h-4 w-4" />
                            Next Moves
                        </div>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
                            <p>先把高风险账号清干净，再进入 `Publish Composer` 做内容提稿。</p>
                            <p>需要真实外发时，优先确认 `connected`；只做一期交付时，可接受 `draft_ready`。</p>
                        </div>
                        <button
                            onClick={() => void fetchAuthStatus()}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-module/30 bg-gradient-to-r from-module to-module-secondary px-3 py-2 text-xs font-medium text-white transition-all hover:brightness-110"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            刷新账号快照
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
};
