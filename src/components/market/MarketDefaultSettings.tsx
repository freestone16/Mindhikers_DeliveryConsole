/**
 * MarketDefaultSettings.tsx — Sprint 5: 多平台默认设置面板（持久化版）
 *
 * 持久化策略（双写）：
 *   1. localStorage key "mindhikers:market:youtube-defaults"（即时，离线可用）
 *   2. POST /api/market/v3/save-defaults → 写入 05_Marketing/market_defaults.json
 *
 * 读取顺序（挂载时）：
 *   GET /api/market/v3/load-defaults → 有则覆盖 → 同步到 localStorage
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings, Lock, Check, Loader2 } from 'lucide-react';
import type { YouTubeDefaults } from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MarketDefaultSettingsProps {
    projectId?: string;
    onClose: () => void;
}

// ─── Platform list ────────────────────────────────────────────────────────────

interface Platform {
    id: string;
    name: string;
    icon: string;
    active: boolean;
}

const PLATFORMS: Platform[] = [
    { id: 'youtube',  name: 'YouTube',      icon: '▶',  active: true  },
    { id: 'x',        name: 'X (Twitter)',  icon: '𝕏',  active: false },
    { id: 'wechat',   name: '微信公众号',   icon: '💬', active: false },
    { id: 'bilibili', name: 'Bilibili',     icon: '📺', active: false },
    { id: 'shorts',   name: 'Shorts',       icon: '📱', active: false },
    { id: 'tiktok',   name: 'TikTok',       icon: '🎵', active: false },
];

// ─── Defaults ─────────────────────────────────────────────────────────────────

const BUILT_IN_DEFAULTS: YouTubeDefaults = {
    language: 'zh-Hans',
    captionsCertification: 'none',
    alteredContent: false,
    madeForKids: false,
    category: '27',
    categoryName: 'Education',
    license: 'standard',
    allowComments: true,
    commentSort: 'newest',
    visibility: 'public',
    videoFilenamePattern: '{slug}-mindhikers-{date}',
};

const LS_KEY = 'mindhikers:market:youtube-defaults';

function readLocalStorage(): YouTubeDefaults | null {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? (JSON.parse(raw) as YouTubeDefaults) : null;
    } catch {
        return null;
    }
}

function writeLocalStorage(d: YouTubeDefaults) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch { /* ignore */ }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const MarketDefaultSettings: React.FC<MarketDefaultSettingsProps> = ({
    projectId,
    onClose,
}) => {
    const [activePlatformId, setActivePlatformId] = useState<string>('youtube');
    const [ytDefaults, setYtDefaults] = useState<YouTubeDefaults>(
        readLocalStorage() || BUILT_IN_DEFAULTS
    );
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Load from API on mount (may override localStorage if server has newer version)
    useEffect(() => {
        if (!projectId) return;
        fetch(`/api/market/v3/load-defaults?projectId=${encodeURIComponent(projectId)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.youtube) {
                    setYtDefaults({ ...BUILT_IN_DEFAULTS, ...data.youtube });
                    writeLocalStorage({ ...BUILT_IN_DEFAULTS, ...data.youtube });
                }
            })
            .catch(() => { /* non-fatal: localStorage version is fine */ });
    }, [projectId]);

    const handleSave = useCallback(async () => {
        setSaveStatus('saving');
        writeLocalStorage(ytDefaults);

        if (projectId) {
            try {
                const res = await fetch('/api/market/v3/save-defaults', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId,
                        defaults: { youtube: ytDefaults, x: null, wechat: null, bilibili: null },
                    }),
                });
                if (!res.ok) throw new Error(`${res.status}`);
                setSaveStatus('saved');
            } catch {
                setSaveStatus('error');
                return;
            }
        } else {
            setSaveStatus('saved');
        }

        setTimeout(() => setSaveStatus('idle'), 2000);
    }, [ytDefaults, projectId]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-slate-800 rounded-2xl border border-slate-700 w-[680px] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">

                {/* ── Header ── */}
                <div className="p-5 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-orange-400" />
                        <h3 className="text-white font-semibold">平台默认设置</h3>
                        <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">营销大师 · 全局</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Platform tabs ── */}
                <div className="px-5 py-3 border-b border-slate-700 flex flex-wrap gap-2 flex-shrink-0">
                    {PLATFORMS.map(platform => {
                        const isActive = activePlatformId === platform.id;
                        return (
                            <button
                                key={platform.id}
                                onClick={() => platform.active && setActivePlatformId(platform.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    platform.active
                                        ? isActive
                                            ? 'bg-orange-500 text-white shadow-sm'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                        : 'bg-slate-900/50 text-slate-600 cursor-not-allowed'
                                }`}
                                title={platform.active ? platform.name : '即将支持'}
                            >
                                <span className="text-base leading-none">{platform.icon}</span>
                                <span>{platform.name}</span>
                                {!platform.active && <Lock className="w-3 h-3 opacity-60" />}
                            </button>
                        );
                    })}
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto p-5">
                    {activePlatformId === 'youtube' ? (
                        <YouTubeSettingsForm
                            defaults={ytDefaults}
                            onChange={setYtDefaults}
                            onSave={handleSave}
                            saveStatus={saveStatus}
                        />
                    ) : (
                        <LockedPlatformPlaceholder
                            platformName={PLATFORMS.find(p => p.id === activePlatformId)?.name || ''}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── YouTube Settings Form (Controlled) ───────────────────────────────────────

interface YouTubeSettingsFormProps {
    defaults: YouTubeDefaults;
    onChange: (d: YouTubeDefaults) => void;
    onSave: () => void;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

const YouTubeSettingsForm: React.FC<YouTubeSettingsFormProps> = ({
    defaults, onChange, onSave, saveStatus,
}) => {
    const update = (key: keyof YouTubeDefaults, value: any) =>
        onChange({ ...defaults, [key]: value });

    const saveBtnClass = saveStatus === 'saved'
        ? 'bg-green-600 text-white'
        : saveStatus === 'error'
        ? 'bg-red-600 text-white'
        : 'bg-orange-500 hover:bg-orange-600 text-white';

    const saveBtnLabel =
        saveStatus === 'saving' ? '保存中...' :
        saveStatus === 'saved'  ? '✓ 已保存 YouTube 默认设置' :
        saveStatus === 'error'  ? '❌ 保存失败，请重试' :
        '保存 YouTube 默认设置';

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                {/* 视频语言 */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">视频语言</label>
                    <select
                        value={defaults.language}
                        onChange={e => update('language', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                    >
                        <option value="zh-Hans">中文（简体）</option>
                        <option value="zh-Hant">中文（繁体）</option>
                        <option value="en">English</option>
                        <option value="ja">日本語</option>
                    </select>
                </div>

                {/* 视频类别 */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">视频类别</label>
                    <select
                        value={defaults.category}
                        onChange={e => {
                            const opt = e.target.options[e.target.selectedIndex];
                            update('category', e.target.value);
                            update('categoryName', opt.text.replace(/ \(\d+\)$/, ''));
                        }}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                    >
                        <option value="27">教育 (27)</option>
                        <option value="28">科学技术 (28)</option>
                        <option value="22">人物与博客 (22)</option>
                        <option value="26">教学方法 (26)</option>
                    </select>
                </div>

                {/* 默认可见性 */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">默认可见性</label>
                    <select
                        value={defaults.visibility}
                        onChange={e => update('visibility', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                    >
                        <option value="public">公开</option>
                        <option value="unlisted">不公开</option>
                        <option value="private">私密</option>
                    </select>
                </div>

                {/* 许可证 */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">许可证</label>
                    <select
                        value={defaults.license}
                        onChange={e => update('license', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                    >
                        <option value="standard">标准 YouTube 许可证</option>
                        <option value="creativeCommon">Creative Commons - 署名</option>
                    </select>
                </div>

                {/* 字幕认证 */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">字幕认证</label>
                    <select
                        value={defaults.captionsCertification}
                        onChange={e => update('captionsCertification', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                    >
                        <option value="none">无</option>
                        <option value="verified">已认证字幕</option>
                    </select>
                </div>

                {/* 评论排序 */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">评论排序</label>
                    <select
                        value={defaults.commentSort}
                        onChange={e => update('commentSort', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                    >
                        <option value="newest">最新评论</option>
                        <option value="top">热门评论</option>
                    </select>
                </div>
            </div>

            {/* 布尔选项 */}
            <div className="border border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-700">
                <ToggleRow
                    label="AI 内容声明"
                    leftLabel="否"
                    rightLabel="是（含 AI 生成内容）"
                    value={defaults.alteredContent}
                    onTrue={() => update('alteredContent', true)}
                    onFalse={() => update('alteredContent', false)}
                />
                <ToggleRow
                    label="面向儿童"
                    leftLabel="否"
                    rightLabel="是"
                    value={defaults.madeForKids}
                    onTrue={() => update('madeForKids', true)}
                    onFalse={() => update('madeForKids', false)}
                />
                <ToggleRow
                    label="允许评论"
                    leftLabel="关闭"
                    rightLabel="允许"
                    value={defaults.allowComments}
                    onTrue={() => update('allowComments', true)}
                    onFalse={() => update('allowComments', false)}
                />
            </div>

            {/* 文件名模式 */}
            <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">视频文件名模式</label>
                <input
                    type="text"
                    value={defaults.videoFilenamePattern}
                    onChange={e => update('videoFilenamePattern', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-orange-500 focus:outline-none transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                    可用变量：<code className="bg-slate-900 px-1 rounded">{'{slug}'}</code> 关键词缩写&nbsp;·&nbsp;
                    <code className="bg-slate-900 px-1 rounded">{'{date}'}</code> YYYYMMDD&nbsp;·&nbsp;
                    <code className="bg-slate-900 px-1 rounded">{'{ep}'}</code> 集数
                </p>
            </div>

            {/* 保存按钮 */}
            <button
                onClick={onSave}
                disabled={saveStatus === 'saving'}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${saveBtnClass}`}
            >
                {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                {saveStatus === 'saved'  && <Check className="w-4 h-4" />}
                {saveBtnLabel}
            </button>

            <p className="text-center text-xs text-slate-600">
                设置保存至项目目录 <code className="bg-slate-900/50 px-1 rounded">05_Marketing/market_defaults.json</code> 及本地浏览器缓存
            </p>
        </div>
    );
};

// ─── Toggle Row (controlled) ──────────────────────────────────────────────────

const ToggleRow: React.FC<{
    label: string;
    leftLabel: string;
    rightLabel: string;
    value: boolean;
    onTrue: () => void;
    onFalse: () => void;
}> = ({ label, leftLabel, rightLabel, value, onTrue, onFalse }) => (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50">
        <span className="text-sm text-slate-300">{label}</span>
        <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm text-slate-400 cursor-pointer hover:text-slate-200 transition-colors">
                <input
                    type="radio"
                    checked={!value}
                    onChange={() => onFalse()}
                    className="accent-orange-500"
                />
                {leftLabel}
            </label>
            <label className="flex items-center gap-1.5 text-sm text-slate-400 cursor-pointer hover:text-slate-200 transition-colors">
                <input
                    type="radio"
                    checked={value}
                    onChange={() => onTrue()}
                    className="accent-orange-500"
                />
                {rightLabel}
            </label>
        </div>
    </div>
);

// ─── Locked platform placeholder ──────────────────────────────────────────────

const LockedPlatformPlaceholder: React.FC<{ platformName: string }> = ({ platformName }) => (
    <div className="text-center py-12">
        <Lock className="w-10 h-10 mx-auto mb-4 text-slate-600" />
        <h4 className="text-slate-400 font-medium mb-1">{platformName}</h4>
        <p className="text-slate-500 text-sm">即将支持，敬请期待</p>
    </div>
);
