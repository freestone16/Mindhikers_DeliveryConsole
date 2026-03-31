import { useState } from 'react';
import { Loader2, LockKeyhole, LogIn, QrCode, UserPlus } from 'lucide-react';
import { authClient } from './client';
import { useAppAuth } from './useAppAuth';

type AuthMode = 'sign-in' | 'sign-up';

export const AuthScreen = () => {
    const { refresh, status } = useAppAuth();
    const [mode, setMode] = useState<AuthMode>('sign-in');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeProvider, setActiveProvider] = useState<'email' | 'google' | 'wechat' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setActiveProvider('email');
        setError(null);

        try {
            if (mode === 'sign-up') {
                await authClient.signUp.email({
                    name: name.trim(),
                    email: email.trim(),
                    password,
                });
            } else {
                await authClient.signIn.email({
                    email: email.trim(),
                    password,
                });
            }

            await refresh();
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : '登录失败，请检查输入后再试。';
            setError(message);
        } finally {
            setIsSubmitting(false);
            setActiveProvider(null);
        }
    };

    const handleSocialSignIn = async (provider: 'google' | 'wechat') => {
        setError(null);
        setActiveProvider(provider);

        try {
            await authClient.signIn.social({
                provider,
                callbackURL: '/',
                errorCallbackURL: '/',
            });
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : '第三方登录暂时不可用，请稍后再试。';
            setError(message);
            setActiveProvider(null);
        }
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(192,140,85,0.16),transparent_32%),linear-gradient(180deg,#fffaf2_0%,#f6efe5_54%,#f1e8dd_100%)] text-[var(--ink-1)]">
            <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
                <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                    <section className="rounded-[36px] border border-[rgba(125,98,67,0.14)] bg-[rgba(255,252,247,0.78)] p-8 shadow-[0_24px_80px_rgba(111,84,52,0.08)] backdrop-blur-xl lg:p-10">
                        <div className="mb-8 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(178,114,57,0.12)] text-[var(--accent)]">
                                <LockKeyhole className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm uppercase tracking-[0.24em] text-[var(--ink-3)]">Golden Crucible SaaS</p>
                                <h1 className="mh-display text-3xl font-semibold tracking-tight text-[var(--ink-1)]">账号体系已接入</h1>
                            </div>
                        </div>

                        <div className="space-y-4 text-[15px] leading-7 text-[var(--ink-2)]">
                            <p>这一版已经切到多账号底座：登录后会自动拿到一个 personal workspace，后续再把对话、黑板和产物逐步收口到 workspace 维度。</p>
                            <p>当前登录入口已按三类规划：Google、微信扫码、通用邮箱注册/登录。微信这条会优先做网站应用扫码登录，配置齐了就能直接接通。</p>
                            {status?.usingDefaultSecret ? (
                                <div className="rounded-2xl border border-[rgba(190,112,66,0.18)] bg-[rgba(255,244,236,0.88)] px-4 py-3 text-sm text-[rgb(140,78,44)]">
                                    当前仍在使用开发默认 secret。正式上 Railway 之前，记得补 `BETTER_AUTH_SECRET`。
                                </div>
                            ) : null}
                        </div>
                    </section>

                    <section className="rounded-[32px] border border-[rgba(125,98,67,0.14)] bg-[rgba(255,255,255,0.84)] p-6 shadow-[0_20px_70px_rgba(111,84,52,0.08)] backdrop-blur-xl lg:p-8">
                        <div className="mb-5 grid gap-3">
                            <button
                                type="button"
                                onClick={() => void handleSocialSignIn('google')}
                                disabled={isSubmitting || activeProvider !== null || !status?.googleEnabled}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--line-soft)] bg-white px-4 py-3 text-sm font-medium text-[var(--ink-1)] transition hover:border-[var(--line-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {activeProvider === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                                {status?.googleEnabled ? '使用 Google 登录' : 'Google 登录待配置'}
                            </button>

                            <button
                                type="button"
                                onClick={() => void handleSocialSignIn('wechat')}
                                disabled={isSubmitting || activeProvider !== null || !status?.wechatEnabled}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(82,170,91,0.22)] bg-[rgba(244,252,244,0.95)] px-4 py-3 text-sm font-medium text-[rgb(41,109,56)] transition hover:border-[rgba(82,170,91,0.38)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {activeProvider === 'wechat' ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                                {status?.wechatEnabled ? '微信扫码登录' : '微信扫码登录待接通'}
                            </button>
                        </div>

                        <div className="mb-6 rounded-2xl border border-[var(--line-soft)] bg-[rgba(247,242,235,0.72)] px-4 py-3 text-xs leading-6 text-[var(--ink-3)]">
                            {status?.wechatEnabled
                                ? '微信入口已接到网站应用登录，用户会跳到微信二维码授权页完成扫码。'
                                : '微信开放平台配置暂未补齐，当前先预留扫码登录位；你准备完 AppID / Secret 和域名后即可接通。'}
                        </div>

                        <div className="mb-6 flex rounded-full border border-[var(--line-soft)] bg-[var(--surface-0)] p-1">
                            <button
                                type="button"
                                onClick={() => setMode('sign-in')}
                                className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${mode === 'sign-in' ? 'bg-[var(--accent)] text-white' : 'text-[var(--ink-3)]'}`}
                            >
                                登录
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('sign-up')}
                                className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${mode === 'sign-up' ? 'bg-[var(--accent)] text-white' : 'text-[var(--ink-3)]'}`}
                            >
                                注册
                            </button>
                        </div>

                        <div className="space-y-4">
                            {mode === 'sign-up' ? (
                                <label className="block">
                                    <span className="mb-2 block text-sm text-[var(--ink-3)]">昵称</span>
                                    <input
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        className="w-full rounded-2xl border border-[var(--line-soft)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                                        placeholder="输入你的名字"
                                    />
                                </label>
                            ) : null}

                            <label className="block">
                                <span className="mb-2 block text-sm text-[var(--ink-3)]">邮箱</span>
                                <input
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="w-full rounded-2xl border border-[var(--line-soft)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                                    placeholder="you@example.com"
                                    type="email"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm text-[var(--ink-3)]">密码</span>
                                <input
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="w-full rounded-2xl border border-[var(--line-soft)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
                                    placeholder="至少 8 位"
                                    type="password"
                                />
                            </label>

                            {error ? (
                                <div className="rounded-2xl border border-[rgba(179,88,60,0.18)] bg-[rgba(255,241,236,0.9)] px-4 py-3 text-sm text-[rgb(149,71,50)]">
                                    {error}
                                </div>
                            ) : null}

                            <button
                                type="button"
                                onClick={() => void handleSubmit()}
                                disabled={isSubmitting || activeProvider !== null || !email.trim() || !password || (mode === 'sign-up' && !name.trim())}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting && activeProvider === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'sign-up' ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                                {mode === 'sign-up' ? '使用邮箱创建账号并进入工作区' : '使用邮箱登录并继续'}
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
