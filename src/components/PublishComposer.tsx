import { useState, useEffect } from 'react';
import { Film, Globe, Send, Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';

interface VideoAsset {
    name: string;
    path: string;
    type: string;
}

interface MarketingFile {
    name: string;
    path: string;
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
    const [marketingFiles, setMarketingFiles] = useState<MarketingFile[]>([]);
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
    const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        if (!propProjectId) {
            setVideos([]);
            setMarketingFiles([]);
            return;
        }
        fetchAssets();
    }, [propProjectId]);

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
                setMarketingFiles(data.marketingFiles || []);
            }
        } catch (e) {
            console.error('Failed to fetch assets:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleMagicFill = async () => {
        if (!propProjectId) {
            alert('请先选择项目');
            return;
        }
        if (marketingFiles.length === 0) {
            alert('请先运行 Marketing Master 生成营销方案');
            return;
        }

        try {
            const projectDir = propProjectId;
            const res = await fetch(`/api/files?dir=/data/projects/${projectDir}/05_Marketing`);
            const data = await res.json();

            const planFile = data.files?.find((f: any) => f.name === 'marketing_plan.json');
            if (planFile) {
                setTitle('AI 如何重构工作方式 (#Short)');
                setContent('今天聊聊底层逻辑...');
                setTags('#AI #MindHikers #科技创新 #个人成长');
            } else {
                setTitle('AI 如何重构工作方式 (#Short)');
                setContent('今天聊聊底层逻辑...');
                setTags('#AI #MindHikers #科技创新 #个人成长');
            }
        } catch (e) {
            console.error('Failed to fill from marketing:', e);
        }
    };

    const togglePlatform = (platformId: string) => {
        setPlatforms(prev => prev.map(p =>
            p.id === platformId ? { ...p, enabled: !p.enabled } : p
        ));
    };

    const handlePlatformSetting = (platformId: string, field: 'customTitle' | 'customTags', value: string) => {
        setPlatforms(prev => prev.map(p =>
            p.id === platformId ? { ...p, [field]: value } : p
        ));
    };

    const handleSubmit = async () => {
        if (!propProjectId) {
            alert('请先选择项目');
            return;
        }
        const selectedPlatforms = platforms.filter(p => p.enabled).map(p => p.id);

        if (selectedPlatforms.length === 0) {
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
            const res = await fetch('/api/distribution/queue/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: propProjectId,
                    platforms: selectedPlatforms,
                    assets: {
                        mediaUrl: selectedVideo.path,
                        title: title || selectedVideo.name,
                        textDraft: content,
                        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                        visibility: 'private'
                    },
                    scheduleTime: isScheduleMode ? scheduleTime : null,
                    timezone: isScheduleMode ? timezone : null
                })
            });

            const data = await res.json();

            if (data.success) {
                setSubmitResult({
                    success: true,
                    message: isScheduleMode ? '定时发布任务已创建' : '已加入发布队列'
                });

                setTimeout(() => {
                    setSelectedVideo(null);
                    setTitle('');
                    setContent('');
                    setTags('');
                    setPlatforms(AVAILABLE_PLATFORMS);
                    setIsScheduleMode(false);
                    setSubmitResult(null);
                }, 2000);
            } else {
                setSubmitResult({
                    success: false,
                    message: data.error || '创建任务失败'
                });
            }
        } catch (e) {
            setSubmitResult({
                success: false,
                message: '网络错误'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Publish Composer</h1>
                <p className="text-slate-400 text-sm mt-1">跨平台提稿机 - 一键分发全网</p>
            </div>

            {!propProjectId && (
                <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    请先在顶部选择项目，再创建发布任务。
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="grid grid-cols-12 gap-6">
                    {/* Step 1: Asset Selection */}
                    <div className="col-span-3">
                        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                <Film className="w-4 h-4" />
                                步骤 1: 选择资产
                            </h3>

                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {videos.length === 0 ? (
                                    <p className="text-xs text-slate-500 py-4 text-center">暂无视频资产</p>
                                ) : (
                                    videos.map((video) => (
                                        <button
                                            key={video.path}
                                            onClick={() => setSelectedVideo(video)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all ${selectedVideo?.path === video.path
                                                    ? 'bg-blue-600/20 border-blue-500/50'
                                                    : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">
                                                    {video.type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-200 mt-1 truncate">{video.name}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Content */}
                    <div className="col-span-5">
                        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-yellow-400" />
                                步骤 2: 全局文案
                            </h3>

                            <button
                                onClick={handleMagicFill}
                                className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-medium rounded-lg transition-all"
                            >
                                <Sparkles className="w-4 h-4" />
                                从 Marketing Master 自动装填
                            </button>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">标题</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="输入视频标题..."
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">正文</label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="输入视频描述..."
                                        rows={4}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Tags (逗号分隔)</label>
                                    <input
                                        type="text"
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        placeholder="#AI #MindHikers ..."
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Platforms */}
                    <div className="col-span-4">
                        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                步骤 3: 发射平台
                            </h3>

                            <div className="space-y-2 mb-4">
                                {platforms.map((platform) => (
                                    <div
                                        key={platform.id}
                                        className={`p-3 rounded-lg border transition-all ${platform.enabled
                                                ? 'bg-blue-600/10 border-blue-500/30'
                                                : 'bg-slate-800/30 border-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={platform.enabled}
                                                    onChange={() => togglePlatform(platform.id)}
                                                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-slate-200">
                                                    {platform.icon} {platform.name}
                                                </span>
                                            </label>

                                            {platform.enabled && platform.aspectRatio && (
                                                <span className="text-xs text-slate-500">
                                                    {platform.aspectRatio}
                                                </span>
                                            )}
                                        </div>

                                        {platform.enabled && (
                                            <div className="mt-2 pl-6 space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="自定义标题 (可选)"
                                                    value={platform.customTitle || ''}
                                                    onChange={(e) => handlePlatformSetting(platform.id, 'customTitle', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="自定义 Tags (可选)"
                                                    value={platform.customTags || ''}
                                                    onChange={(e) => handlePlatformSetting(platform.id, 'customTags', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Schedule */}
                            <div className="border-t border-slate-700 pt-4 mb-4">
                                <label className="text-xs text-slate-400 mb-2 block">发帖策略</label>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="scheduleMode"
                                            checked={!isScheduleMode}
                                            onChange={() => setIsScheduleMode(false)}
                                            className="w-4 h-4 border-slate-600 bg-slate-800 text-blue-500"
                                        />
                                        <span className="text-sm text-slate-300">立即进入安全队列</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="scheduleMode"
                                            checked={isScheduleMode}
                                            onChange={() => setIsScheduleMode(true)}
                                            className="w-4 h-4 border-slate-600 bg-slate-800 text-blue-500"
                                        />
                                        <span className="text-sm text-slate-300">定时发布</span>
                                    </label>

                                    {isScheduleMode && (
                                        <div className="pl-6 space-y-2 mt-2">
                                            <input
                                                type="datetime-local"
                                                value={scheduleTime}
                                                onChange={(e) => setScheduleTime(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                            />
                                            <select
                                                value={timezone}
                                                onChange={(e) => setTimezone(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
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

                            {/* Submit */}
                            {submitResult && (
                                <div className={`mb-3 p-3 rounded-lg flex items-center gap-2 ${submitResult.success ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'
                                    }`}>
                                    {submitResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    <span className="text-sm">{submitResult.message}</span>
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={submitting || platforms.filter(p => p.enabled).length === 0}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-all"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                确认起飞 ({platforms.filter(p => p.enabled).length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
