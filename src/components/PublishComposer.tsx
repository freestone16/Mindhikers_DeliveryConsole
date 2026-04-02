import { useEffect, useState } from 'react';
import { AlertCircle, Check, Film, Globe, Loader2, Send, Sparkles } from 'lucide-react';

interface VideoAsset {
    name: string;
    path: string;
    type: string;
}

interface PlatformConfig {
    id: string;
    name: string;
    icon: string;
    enabled: boolean;
    aspectRatio?: string;
    customTitle?: string;
    customTags?: string;
}

interface ComposerSources {
    suggestedTitle: string;
    suggestedBody: string;
    suggestedTags: string[];
    sourceFiles: Array<{
        name: string;
        path: string;
        category: 'marketing' | 'script' | 'video';
    }>;
    warnings: string[];
}

interface PublishComposerProps {
    projectId?: string;
}

const AVAILABLE_PLATFORMS: PlatformConfig[] = [
    { id: 'twitter', name: 'X / Twitter', icon: '🐦', enabled: false },
    { id: 'youtube_shorts', name: 'YouTube Shorts', icon: '📱', enabled: false, aspectRatio: '9:16' },
    { id: 'youtube', name: 'YouTube', icon: '📺', enabled: false, aspectRatio: '16:9' },
    { id: 'bilibili', name: 'Bilibili', icon: '📺', enabled: false, aspectRatio: '16:9' },
    { id: 'douyin', name: '抖音', icon: '🎵', enabled: false, aspectRatio: '9:16' },
    { id: 'wechat_video', name: '微信视频号', icon: '💬', enabled: false, aspectRatio: '9:16' },
    { id: 'weibo', name: '新浪微博', icon: '🌐', enabled: false },
    { id: 'wechat_mp', name: '微信公众号', icon: '📝', enabled: false }
];

export const PublishComposer = ({ projectId: propProjectId }: PublishComposerProps) => {
    const [videos, setVideos] = useState<VideoAsset[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<VideoAsset | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [platforms, setPlatforms] = useState<PlatformConfig[]>(AVAILABLE_PLATFORMS);
    const [isScheduleMode, setIsScheduleMode] = useState(false);
    const [scheduleTime, setScheduleTime] = useState('');
    const [timezone, setTimezone] = useState('Asia/Shanghai');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [magicFillLoading, setMagicFillLoading] = useState(false);
    const [composerSources, setComposerSources] = useState<ComposerSources | null>(null);
    const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        if (!propProjectId) {
            setVideos([]);
            setComposerSources(null);
            return;
        }

        void fetchAssets();
    }, [propProjectId]);

    useEffect(() => {
        setPlatforms((current) =>
            current.map((platform) => {
                if (!selectedVideo || !platform.aspectRatio) {
                    return platform;
                }

                if (platform.aspectRatio === selectedVideo.type) {
                    return platform;
                }

                return {
                    ...platform,
                    enabled: false,
                };
            })
        );
    }, [selectedVideo]);

    const fetchAssets = async () => {
        if (!propProjectId) {
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({ projectId: propProjectId });
            const res = await fetch(`/api/distribution/assets?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setVideos(data.videos || []);
            }
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMagicFill = async () => {
        if (!propProjectId) {
            alert('请先选择项目');
            return;
        }

        setMagicFillLoading(true);
        try {
            const params = new URLSearchParams({ projectId: propProjectId });
            if (selectedVideo?.path) {
                params.set('selectedVideoPath', selectedVideo.path);
            }

            const res = await fetch(`/api/distribution/composer-sources?${params.toString()}`);
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Magic Fill 失败');
            }

            const sources = data.sources as ComposerSources;
            setComposerSources(sources);
            if (sources.suggestedTitle) {
                setTitle(sources.suggestedTitle);
            }
            if (sources.suggestedBody) {
                setContent(sources.suggestedBody);
            }
            if (sources.suggestedTags.length > 0) {
                setTags(sources.suggestedTags.join(', '));
            }
        } catch (error) {
            console.error('Failed to fill from marketing:', error);
            alert(error instanceof Error ? error.message : 'Magic Fill 失败');
        } finally {
            setMagicFillLoading(false);
        }
    };

    const togglePlatform = (platformId: string) => {
        setPlatforms((current) =>
            current.map((platform) => {
                const isCompatible =
                    !selectedVideo || !platform.aspectRatio || platform.aspectRatio === selectedVideo.type;

                if (platform.id !== platformId || !isCompatible) {
                    return platform;
                }

                return {
                    ...platform,
                    enabled: !platform.enabled,
                };
            })
        );
    };

    const handlePlatformSetting = (platformId: string, field: 'customTitle' | 'customTags', value: string) => {
        setPlatforms((current) =>
            current.map((platform) => (platform.id === platformId ? { ...platform, [field]: value } : platform))
        );
    };

    const handleSubmit = async () => {
        if (!propProjectId) {
            alert('请先选择项目');
            return;
        }

        const activePlatforms = platforms.filter((platform) => platform.enabled).map((platform) => platform.id);
        if (activePlatforms.length === 0) {
            alert('请至少选择一个发布平台');
            return;
        }

        if (!selectedVideo) {
            alert('请选择一个视频');
            return;
        }

        setSubmitting(true);
        setSubmitResult(null);

        try {
            const platformOverrides = platforms.reduce<Record<string, { title?: string; tags?: string[] }>>((acc, platform) => {
                if (!platform.enabled) {
                    return acc;
                }

                const nextEntry: { title?: string; tags?: string[] } = {};
                if (platform.customTitle?.trim()) {
                    nextEntry.title = platform.customTitle.trim();
                }
                if (platform.customTags?.trim()) {
                    nextEntry.tags = platform.customTags
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean);
                }

                if (nextEntry.title || nextEntry.tags?.length) {
                    acc[platform.id] = nextEntry;
                }

                return acc;
            }, {});

            const res = await fetch('/api/distribution/queue/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: propProjectId,
                    platforms: activePlatforms,
                    assets: {
                        mediaUrl: selectedVideo.path,
                        title: title || selectedVideo.name,
                        textDraft: content,
                        tags: tags
                            .split(',')
                            .map((item) => item.trim())
                            .filter(Boolean),
                        sourceFiles: composerSources?.sourceFiles.map((source) => source.path) || [],
                        platformOverrides,
                        visibility: 'private',
                    },
                    scheduleTime: isScheduleMode ? scheduleTime : null,
                    timezone: isScheduleMode ? timezone : null,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setSubmitResult({
                    success: true,
                    message: isScheduleMode ? '定时发布任务已创建' : '已加入发布队列',
                });

                window.setTimeout(() => {
                    setSelectedVideo(null);
                    setTitle('');
                    setContent('');
                    setTags('');
                    setPlatforms(AVAILABLE_PLATFORMS);
                    setIsScheduleMode(false);
                    setComposerSources(null);
                    setSubmitResult(null);
                }, 2000);
                return;
            }

            setSubmitResult({
                success: false,
                message: data.error || '创建任务失败',
            });
        } catch (error) {
            console.error('Failed to create distribution task:', error);
            setSubmitResult({
                success: false,
                message: '网络错误',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const selectedPlatforms = platforms.filter((platform) => platform.enabled);
    const incompatiblePlatforms = selectedVideo
        ? platforms.filter((platform) => platform.aspectRatio && platform.aspectRatio !== selectedVideo.type)
        : [];
    const validationItems = [
        selectedVideo ? '已选择视频资产' : '请选择一个视频资产',
        title.trim() ? '标题已就绪' : '标题仍为空',
        content.trim() ? '正文已就绪' : '正文仍为空',
        selectedPlatforms.length > 0 ? `已选择 ${selectedPlatforms.length} 个平台` : '尚未选择发布平台',
        composerSources?.sourceFiles.length
            ? `已命中 ${composerSources.sourceFiles.length} 个真实来源`
            : '可选：使用真实产物自动装填',
    ];

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-module/15 bg-gradient-to-r from-module/10 via-module-secondary/5 to-transparent p-6">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center rounded-full border border-module/30 bg-module/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-module-light">
                        Mixpost-style Composer
                    </span>
                    {propProjectId && (
                        <span className="inline-flex items-center rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-text-secondary">
                            Project · {propProjectId}
                        </span>
                    )}
                </div>
                <h1 className="mt-4 text-3xl font-bold text-text">Publish Composer</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                    围绕一条内容组织全局文案与平台差异。左侧专注内容编辑，右侧固定承接发射策略与最终 CTA。
                </p>
            </div>

            {!propProjectId && (
                <div className="rounded-xl border border-module/30 bg-module/10 px-4 py-3 text-sm text-module-light">
                    请先在顶部选择项目，再创建发布任务。
                </div>
            )}

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-module-mid" />
                </div>
            ) : (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-6">
                        <section className="rounded-3xl border border-border bg-surface/60 p-5">
                            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-text">
                                <Film className="h-4 w-4 text-module-light" />
                                内容身份
                            </div>

                            <div className="space-y-3">
                                {videos.length === 0 ? (
                                    <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
                                        暂无视频资产
                                    </p>
                                ) : (
                                    videos.map((video) => (
                                        <button
                                            key={video.path}
                                            onClick={() => setSelectedVideo(video)}
                                            className={`w-full rounded-2xl border p-4 text-left transition-all ${
                                                selectedVideo?.path === video.path
                                                    ? 'border-module/40 bg-gradient-to-r from-module/12 to-module-secondary/8'
                                                    : 'border-border bg-bg/40 hover:border-module/20'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-medium text-text">{video.name}</div>
                                                    <div className="mt-1 truncate text-xs text-text-muted">{video.path}</div>
                                                </div>
                                                <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text-secondary">
                                                    {video.type}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </section>

                        <section className="rounded-3xl border border-border bg-surface/60 p-5">
                            <div className="mb-4 flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-text">
                                        <Sparkles className="h-4 w-4 text-module-light" />
                                        核心文案
                                    </div>
                                    <p className="mt-1 text-sm text-text-secondary">先把这条内容本身编辑清楚，再处理平台差异。</p>
                                </div>

                                <button
                                    onClick={handleMagicFill}
                                    disabled={magicFillLoading || !propProjectId}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-module/30 bg-gradient-to-r from-module to-module-secondary px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110 disabled:border-border disabled:bg-surface-alt disabled:text-text-muted"
                                >
                                    {magicFillLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    从真实产物自动装填
                                </button>
                            </div>

                            {composerSources && (
                                <div className="mb-4 rounded-2xl border border-module/15 bg-module/5 p-4">
                                    <div className="text-xs uppercase tracking-[0.18em] text-module-light/80">Source Files</div>
                                    <div className="mt-2 text-sm text-text">
                                        {composerSources.sourceFiles.map((source) => source.name).join(' · ') || '未命中'}
                                    </div>
                                    {composerSources.warnings.length > 0 && (
                                        <div className="mt-3 space-y-1">
                                            {composerSources.warnings.map((warning) => (
                                                <div key={warning} className="text-xs text-module-light">
                                                    {warning}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-text-muted">标题</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(event) => setTitle(event.target.value)}
                                        placeholder="输入视频标题..."
                                        className="w-full rounded-2xl border border-border bg-bg/60 px-4 py-3 text-sm text-text placeholder-text-muted focus:border-module focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-text-muted">正文</label>
                                    <textarea
                                        value={content}
                                        onChange={(event) => setContent(event.target.value)}
                                        placeholder="输入视频描述..."
                                        rows={12}
                                        className="w-full rounded-2xl border border-border bg-bg/60 px-4 py-3 text-sm leading-6 text-text placeholder-text-muted focus:border-module focus:outline-none resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-text-muted">Tags</label>
                                    <input
                                        type="text"
                                        value={tags}
                                        onChange={(event) => setTags(event.target.value)}
                                        placeholder="#AI #MindHikers ..."
                                        className="w-full rounded-2xl border border-border bg-bg/60 px-4 py-3 text-sm text-text placeholder-text-muted focus:border-module focus:outline-none"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="rounded-3xl border border-border bg-surface/60 p-5">
                            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-text">
                                <Globe className="h-4 w-4 text-module-light" />
                                Platform Versions
                            </div>

                            <div className="grid gap-3 lg:grid-cols-2">
                                {platforms.map((platform) => {
                                    const isCompatible =
                                        !selectedVideo || !platform.aspectRatio || platform.aspectRatio === selectedVideo.type;

                                    return (
                                        <div
                                            key={platform.id}
                                            className={`rounded-2xl border p-4 transition-all ${
                                                platform.enabled
                                                    ? 'border-module/35 bg-gradient-to-br from-module/10 to-module-secondary/5'
                                                    : !isCompatible
                                                        ? 'border-border bg-bg/20 opacity-55'
                                                        : 'border-border bg-bg/40 hover:border-module/15'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <label className="flex cursor-pointer items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={platform.enabled}
                                                        onChange={() => togglePlatform(platform.id)}
                                                        disabled={!isCompatible}
                                                        className="mt-1 h-4 w-4 rounded border-border bg-surface-alt text-module focus:ring-module"
                                                    />
                                                    <div>
                                                        <div className="text-sm font-medium text-text">
                                                            {platform.icon} {platform.name}
                                                        </div>
                                                        <div className="mt-1 text-xs text-text-muted">
                                                            {platform.aspectRatio
                                                                ? !isCompatible && selectedVideo
                                                                    ? `当前素材不兼容，仅支持 ${platform.aspectRatio}`
                                                                    : `支持 ${platform.aspectRatio}`
                                                                : '通用图文平台'}
                                                        </div>
                                                    </div>
                                                </label>

                                                {platform.aspectRatio && (
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-[11px] ${
                                                            isCompatible ? 'bg-surface-alt text-text-secondary' : 'bg-module/10 text-module-light'
                                                        }`}
                                                    >
                                                        {isCompatible ? platform.aspectRatio : `仅 ${platform.aspectRatio}`}
                                                    </span>
                                                )}
                                            </div>

                                            {platform.enabled && (
                                                <div className="mt-4 space-y-3">
                                                    <input
                                                        type="text"
                                                        placeholder="自定义标题 (可选)"
                                                        value={platform.customTitle || ''}
                                                        onChange={(event) => handlePlatformSetting(platform.id, 'customTitle', event.target.value)}
                                                        className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs text-text placeholder-text-muted focus:border-module focus:outline-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="自定义 Tags (可选)"
                                                        value={platform.customTags || ''}
                                                        onChange={(event) => handlePlatformSetting(platform.id, 'customTags', event.target.value)}
                                                        className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs text-text placeholder-text-muted focus:border-module focus:outline-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
                        <div className="rounded-3xl border border-module/20 bg-bg/70 p-5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-module-light/80">Platform Summary</div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {selectedPlatforms.length > 0 ? (
                                    selectedPlatforms.map((platform) => (
                                        <span key={platform.id} className="rounded-full border border-module/25 bg-module/10 px-3 py-1 text-xs text-module-light">
                                            {platform.icon} {platform.name}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-text-muted">尚未选择平台</span>
                                )}
                            </div>

                            {incompatiblePlatforms.length > 0 && (
                                <div className="mt-4 rounded-2xl border border-module/10 bg-module/5 p-3 text-xs leading-6 text-module-light">
                                    当前素材为 <span className="font-semibold">{selectedVideo?.type}</span>，
                                    {incompatiblePlatforms.map((platform) => platform.name).join('、')} 暂不可选。
                                </div>
                            )}
                        </div>

                        <div className="rounded-3xl border border-border bg-surface/60 p-5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">Publish Mode</div>
                            <div className="mt-4 space-y-3">
                                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-bg/40 px-4 py-3">
                                    <input
                                        type="radio"
                                        name="scheduleMode"
                                        checked={!isScheduleMode}
                                        onChange={() => setIsScheduleMode(false)}
                                        className="h-4 w-4 border-border bg-surface-alt text-module"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-text">加入安全队列</div>
                                        <div className="text-xs text-text-muted">保持当前一期的审慎发射策略</div>
                                    </div>
                                </label>

                                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-bg/40 px-4 py-3">
                                    <input
                                        type="radio"
                                        name="scheduleMode"
                                        checked={isScheduleMode}
                                        onChange={() => setIsScheduleMode(true)}
                                        className="h-4 w-4 border-border bg-surface-alt text-module"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-text">定时发布</div>
                                        <div className="text-xs text-text-muted">为后续 queue slot / calendar 预留入口</div>
                                    </div>
                                </label>

                                {isScheduleMode && (
                                    <div className="space-y-3 rounded-2xl border border-module/10 bg-module/5 p-3">
                                        <input
                                            type="datetime-local"
                                            value={scheduleTime}
                                            onChange={(event) => setScheduleTime(event.target.value)}
                                            className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-sm text-text focus:border-module focus:outline-none"
                                        />
                                        <select
                                            value={timezone}
                                            onChange={(event) => setTimezone(event.target.value)}
                                            className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-sm text-text focus:border-module focus:outline-none"
                                        >
                                            <option value="Asia/Shanghai">🌎 上海 (Asia/Shanghai)</option>
                                            <option value="America/New_York">🌎 纽约 (America/New_York)</option>
                                            <option value="America/Los_Angeles">🌎 洛杉矶 (America/Los_Angeles)</option>
                                            <option value="Europe/London">🌎 伦敦 (Europe/London)</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-border bg-surface/60 p-5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">Validation</div>
                            <div className="mt-4 space-y-2">
                                {validationItems.map((item) => (
                                    <div key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-module-mid/80" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {submitResult && (
                            <div
                                className={`rounded-2xl border p-4 ${
                                    submitResult.success
                                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                        : 'border-red-500/20 bg-red-500/10 text-red-300'
                                }`}
                            >
                                <div className="flex items-center gap-2 text-sm">
                                    {submitResult.success ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                    <span>{submitResult.message}</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={submitting || selectedPlatforms.length === 0}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-module to-module-secondary px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:bg-surface-alt disabled:text-text-muted"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            确认起飞 ({selectedPlatforms.length})
                        </button>
                    </aside>
                </div>
            )}
        </div>
    );
};
