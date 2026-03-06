/**
 * MarketDefaultSettings.tsx — 多平台默认设置面板
 *
 * Sprint 1: YouTube 设置表单（可交互，数据暂存内存）
 * Sprint 5: 完整实现（持久化到 05_Marketing/market_defaults.json）
 */
import React, { useState } from 'react';
import { X, Settings, Lock } from 'lucide-react';

interface MarketDefaultSettingsProps {
    onClose: () => void;
}

interface Platform {
    id: string;
    name: string;
    icon: string;
    active: boolean;
    type: 'video' | 'text' | 'short';
}

const PLATFORMS: Platform[] = [
    { id: 'youtube',  name: 'YouTube',    icon: '▶',  active: true,  type: 'video' },
    { id: 'x',        name: 'X (Twitter)', icon: '𝕏',  active: false, type: 'text' },
    { id: 'wechat',   name: '微信公众号',  icon: '💬', active: false, type: 'text' },
    { id: 'bilibili', name: 'Bilibili',   icon: '📺', active: false, type: 'video' },
    { id: 'shorts',   name: 'Shorts',     icon: '📱', active: false, type: 'short' },
    { id: 'wxvideo',  name: '微信视频号', icon: '🎥', active: false, type: 'short' },
    { id: 'tiktok',   name: 'TikTok',    icon: '🎵', active: false, type: 'short' },
];

export const MarketDefaultSettings: React.FC<MarketDefaultSettingsProps> = ({ onClose }) => {
    const [activePlatformId, setActivePlatformId] = useState<string>('youtube');

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-slate-800 rounded-2xl border border-slate-700 w-[680px] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">

                {/* ── 顶部标题 ── */}
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

                {/* ── 平台 Tab ── */}
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

                {/* ── 内容区 ── */}
                <div className="flex-1 overflow-y-auto p-5">
                    {activePlatformId === 'youtube' ? (
                        <YouTubeSettingsForm />
                    ) : (
                        <LockedPlatformPlaceholder platformName={PLATFORMS.find(p => p.id === activePlatformId)?.name || ''} />
                    )}
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// YouTube 设置表单
// ─────────────────────────────────────────────────────────────
const YouTubeSettingsForm: React.FC = () => {
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                {/* 视频语言 */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">视频语言</label>
                    <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors">
                        <option value="zh-Hans">中文（简体）</option>
                        <option value="zh-Hant">中文（繁体）</option>
                        <option value="en">English</option>
                        <option value="ja">日本語</option>
                    </select>
                </div>

                {/* 视频类别 */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">视频类别</label>
                    <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors">
                        <option value="27">教育 (27)</option>
                        <option value="28">科学技术 (28)</option>
                        <option value="22">人物与博客 (22)</option>
                        <option value="26">教学方法 (26)</option>
                    </select>
                </div>

                {/* 默认可见性 */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">默认可见性</label>
                    <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors">
                        <option value="public">公开</option>
                        <option value="unlisted">不公开</option>
                        <option value="private">私密</option>
                    </select>
                </div>

                {/* 许可证 */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">许可证</label>
                    <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors">
                        <option value="standard">标准 YouTube 许可证</option>
                        <option value="creativeCommon">Creative Commons - 署名</option>
                    </select>
                </div>

                {/* 字幕认证 */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">字幕认证</label>
                    <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors">
                        <option value="none">无</option>
                        <option value="verified">已认证字幕</option>
                    </select>
                </div>

                {/* 评论排序 */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">评论排序</label>
                    <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors">
                        <option value="newest">最新评论</option>
                        <option value="top">热门评论</option>
                    </select>
                </div>
            </div>

            {/* 布尔选项 */}
            <div className="space-y-0 border border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-700">
                <RadioToggleRow name="alteredContent" label="AI 内容声明" leftLabel="否" rightLabel="是（含 AI 生成内容）" defaultLeft />
                <RadioToggleRow name="madeForKids"    label="面向儿童"    leftLabel="否" rightLabel="是"                    defaultLeft />
                <RadioToggleRow name="allowComments"  label="允许评论"    leftLabel="关闭" rightLabel="允许"               defaultLeft={false} />
            </div>

            {/* 文件名模式 */}
            <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">视频文件名模式</label>
                <input
                    type="text"
                    defaultValue="{slug}-mindhikers-{date}"
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
                onClick={handleSave}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                    saved
                        ? 'bg-green-600 text-white'
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
            >
                {saved ? '✓ 已保存 YouTube 默认设置' : '保存 YouTube 默认设置'}
            </button>

            <p className="text-center text-xs text-slate-600">
                保存后，Phase 2「其他设置」行将自动读取这些默认值
            </p>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// 锁定平台占位
// ─────────────────────────────────────────────────────────────
const LockedPlatformPlaceholder: React.FC<{ platformName: string }> = ({ platformName }) => (
    <div className="text-center py-12">
        <Lock className="w-10 h-10 mx-auto mb-4 text-slate-600" />
        <h4 className="text-slate-400 font-medium mb-1">{platformName}</h4>
        <p className="text-slate-500 text-sm">即将支持，敬请期待</p>
    </div>
);

// ─────────────────────────────────────────────────────────────
// 单行 Radio Toggle
// ─────────────────────────────────────────────────────────────
const RadioToggleRow: React.FC<{
    name: string;
    label: string;
    leftLabel: string;
    rightLabel: string;
    defaultLeft: boolean;
}> = ({ name, label, leftLabel, rightLabel, defaultLeft }) => (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50">
        <span className="text-sm text-slate-300">{label}</span>
        <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm text-slate-400 cursor-pointer hover:text-slate-200 transition-colors">
                <input type="radio" name={name} defaultChecked={defaultLeft} className="accent-orange-500" />
                {leftLabel}
            </label>
            <label className="flex items-center gap-1.5 text-sm text-slate-400 cursor-pointer hover:text-slate-200 transition-colors">
                <input type="radio" name={name} defaultChecked={!defaultLeft} className="accent-orange-500" />
                {rightLabel}
            </label>
        </div>
    </div>
);
