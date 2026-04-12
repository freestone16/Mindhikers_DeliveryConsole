import { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    ArrowLeft,
    Check,
    Clock,
    Eye,
    EyeOff,
    HelpCircle,
    KeyRound,
    Loader2,
    Sparkles,
    Trash2,
    XCircle,
} from 'lucide-react';
import { buildApiUrl } from '../config/runtime';

interface SaaSLLMConfigPageProps {
    onClose?: () => void;
    onSaved?: () => Promise<void> | void;
    trialStatus?: {
        enabled: boolean;
        mode: 'platform' | 'byok';
        limits: {
            conversationLimit: number;
            turnLimitPerConversation: number;
        };
        usage: {
            conversationsUsed: number;
            conversationsRemaining: number;
            currentConversationId?: string;
            currentConversationTurnsUsed: number;
            currentConversationTurnsRemaining: number;
        };
        status: 'inactive' | 'active' | 'conversation_exhausted' | 'quota_exhausted';
        requiresByok: boolean;
        message: string;
    } | null;
}

interface ByokStatusPayload {
    configured: boolean;
    baseUrl?: string;
    model?: string;
    providerLabel?: string | null;
    hasApiKey: boolean;
    updatedAt?: string | null;
    lastValidatedAt?: string | null;
}

const KIMI_DEFAULTS = {
    providerLabel: 'Kimi 原厂',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'kimi-k2.5',
};

const RECOMMENDED_PROVIDERS = [
    { label: 'Kimi 原厂', baseUrl: 'https://api.moonshot.cn/v1', model: 'kimi-k2.5', desc: '平台默认，稳定中文体验' },
    { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'deepseek/deepseek-chat-v3-0324:free', desc: '聚合多模型，有免费额度' },
    { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', desc: '性价比高，中文能力强' },
];

const ERROR_CATEGORY_META: Record<string, { icon: typeof AlertCircle; toneClass: string; suggestion?: string }> = {
    config_incomplete: {
        icon: HelpCircle,
        toneClass: 'border-[rgba(208,141,88,0.32)] bg-[rgba(255,248,237,0.95)] text-[rgb(150,96,49)]',
        suggestion: '请检查所有必填字段是否已填写',
    },
    timeout: {
        icon: Clock,
        toneClass: 'border-[rgba(204,170,96,0.32)] bg-[rgba(255,252,236,0.95)] text-[rgb(140,108,44)]',
        suggestion: '请检查 Base URL 是否正确，或网络是否可达',
    },
    key_invalid: {
        icon: XCircle,
        toneClass: 'border-[rgba(188,120,92,0.3)] bg-[rgba(255,241,238,0.95)] text-[rgb(145,84,57)]',
        suggestion: 'API Key 无效，请检查是否正确复制',
    },
    model_unavailable: {
        icon: Sparkles,
        toneClass: 'border-[rgba(156,123,191,0.3)] bg-[rgba(247,240,255,0.95)] text-[rgb(112,83,156)]',
        suggestion: '模型不可用，请确认服务商支持该模型 ID',
    },
    api_error: {
        icon: AlertCircle,
        toneClass: 'border-[rgba(188,120,92,0.24)] bg-[rgba(255,244,240,0.92)] text-[rgb(145,84,57)]',
    },
};

export const SaaSLLMConfigPage = ({ onClose, onSaved, trialStatus }: SaaSLLMConfigPageProps) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [status, setStatus] = useState<ByokStatusPayload | null>(null);
    const [providerLabel, setProviderLabel] = useState(KIMI_DEFAULTS.providerLabel);
    const [baseUrl, setBaseUrl] = useState(KIMI_DEFAULTS.baseUrl);
    const [model, setModel] = useState(KIMI_DEFAULTS.model);
    const [apiKey, setApiKey] = useState('');
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ success: boolean; latency?: number; error?: string; errorCategory?: string } | null>(null);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(buildApiUrl('/api/crucible/byok'), {
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error(`读取失败: ${response.status}`);
            }
            const payload = await response.json() as ByokStatusPayload;
            setStatus(payload);
            setProviderLabel(payload.providerLabel || KIMI_DEFAULTS.providerLabel);
            setBaseUrl(payload.baseUrl || KIMI_DEFAULTS.baseUrl);
            setModel(payload.model || KIMI_DEFAULTS.model);
            setApiKey('');
        } catch (fetchError: any) {
            setError(fetchError?.message || '读取 BYOK 状态失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
    }, []);

    const handleUseKimiTemplate = () => {
        setProviderLabel(KIMI_DEFAULTS.providerLabel);
        setBaseUrl(KIMI_DEFAULTS.baseUrl);
        setModel(KIMI_DEFAULTS.model);
    };

    const handleSave = async () => {
        if (!baseUrl.trim() || !model.trim() || !apiKey.trim()) {
            setError('Base URL、Model、API Key 都必须填写');
            return;
        }

        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            const response = await fetch(buildApiUrl('/api/crucible/byok'), {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    providerLabel: providerLabel.trim(),
                    baseUrl: baseUrl.trim(),
                    model: model.trim(),
                    apiKey: apiKey.trim(),
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || '保存失败');
            }

            setNotice('BYOK 已保存');
            setApiKey('');
            await refresh();
            await onSaved?.();
        } catch (saveError: any) {
            setError(saveError?.message || '保存失败');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!baseUrl.trim() || !model.trim() || !apiKey.trim()) {
            setError('测试前请先填写 Base URL、Model、API Key');
            return;
        }

        setTesting(true);
        setError(null);
        setTestResult(null);
        try {
            const response = await fetch(buildApiUrl('/api/crucible/byok/test'), {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    providerLabel: providerLabel.trim(),
                    baseUrl: baseUrl.trim(),
                    model: model.trim(),
                    apiKey: apiKey.trim(),
                }),
            });
            const payload = await response.json();
            setTestResult(payload);
            if (!payload.success) {
                setError(payload.error || '测试失败');
            }
        } catch (testError: any) {
            setError(testError?.message || '测试失败');
        } finally {
            setTesting(false);
        }
    };

    const handleClear = async () => {
        if (!window.confirm('确定要清除当前账号的 BYOK 配置吗？')) {
            return;
        }

        setClearing(true);
        setError(null);
        setNotice(null);
        try {
            const response = await fetch(buildApiUrl('/api/crucible/byok'), {
                method: 'DELETE',
                credentials: 'include',
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || '清除失败');
            }

            setNotice('BYOK 已清除');
            setProviderLabel(KIMI_DEFAULTS.providerLabel);
            setBaseUrl(KIMI_DEFAULTS.baseUrl);
            setModel(KIMI_DEFAULTS.model);
            setApiKey('');
            await refresh();
            await onSaved?.();
        } catch (clearError: any) {
            setError(clearError?.message || '清除失败');
        } finally {
            setClearing(false);
        }
    };

    const quotaHint = useMemo(() => {
        if (!trialStatus?.enabled) {
            return '当前环境未启用注册用户额度限制。';
        }

        if (trialStatus.mode === 'byok') {
            return '当前账号已切到你的 BYOK，对话将优先使用你自己的模型配置。';
        }

        return trialStatus.message;
    }, [trialStatus]);

    const normalizedProvider = useMemo(() => ({
        label: providerLabel.trim(),
        baseUrl: baseUrl.trim(),
        model: model.trim(),
    }), [baseUrl, model, providerLabel]);

    const errorMeta = testResult?.errorCategory
        ? (ERROR_CATEGORY_META[testResult.errorCategory] || ERROR_CATEGORY_META.api_error)
        : null;
    const ErrorIcon = errorMeta?.icon || AlertCircle;
    const errorToneClass = errorMeta?.toneClass || ERROR_CATEGORY_META.api_error.toneClass;

    return (
        <div className="min-h-screen bg-[var(--shell-bg)] text-[var(--ink-1)]">
            <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {onClose ? (
                            <button
                                onClick={onClose}
                                className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-0)] p-2 text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)]"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        ) : null}
                        <div>
                            <h1 className="mh-display text-[22px] font-semibold tracking-tight text-[var(--ink-1)]">LLM / BYOK 配置</h1>
                            <p className="mt-1 text-sm text-[var(--ink-3)]">这里只处理黄金坩埚 SaaS 的文本模型接入，不包含图生或视生配置。</p>
                        </div>
                    </div>
                </div>

                <div className="mb-5 rounded-[28px] border border-[var(--line-soft)] bg-[rgba(255,251,245,0.9)] p-5 shadow-[0_18px_40px_rgba(131,103,70,0.06)]">
                    <div className="flex items-start gap-3">
                        <KeyRound className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
                        <div>
                            <div className="text-sm font-medium text-[var(--ink-1)]">当前口径</div>
                            <div className="mt-1 text-sm leading-7 text-[var(--ink-2)]">
                                <details className="group">
                                    <summary className="cursor-pointer text-sm leading-7 text-[var(--ink-2)]">
                                        平台默认推荐 <strong>Kimi 原厂 k2.5</strong>，点击了解 BYOK 场景与字段说明。
                                    </summary>
                                    <div className="mt-2 space-y-2 text-[13px] leading-6 text-[var(--ink-2)]">
                                        <div>何时需要 BYOK：免费额度用完 / 需要特定模型 / 需要更大 token 窗口。</div>
                                        <ul className="space-y-1 text-[13px] text-[var(--ink-2)]">
                                            <li><strong>Base URL</strong>：服务商的 OpenAI-compatible API 地址</li>
                                            <li><strong>API Key</strong>：服务商后台获取</li>
                                            <li><strong>Model</strong>：服务商支持的模型 ID</li>
                                        </ul>
                                    </div>
                                </details>
                            </div>
                            <div className="mt-2 text-xs text-[var(--ink-3)]">{quotaHint}</div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                    <section className="rounded-[28px] border border-[var(--line-soft)] bg-[rgba(255,251,245,0.9)] p-5 shadow-[0_18px_40px_rgba(131,103,70,0.06)]">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-[var(--ink-1)]">你的 BYOK</h2>
                                <p className="mt-1 text-sm text-[var(--ink-3)]">支持任何 OpenAI-compatible `chat/completions` 接口。</p>
                            </div>
                            <button
                                onClick={handleUseKimiTemplate}
                                className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-xs text-[var(--ink-2)] transition-colors hover:text-[var(--ink-1)]"
                            >
                                使用 Kimi 原厂模板
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex items-center gap-2 text-sm text-[var(--ink-3)]">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                读取配置中...
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <label className="block">
                                    <div className="mb-1.5 text-sm text-[var(--ink-2)]">服务商名称（可选）</div>
                                    <input
                                        value={providerLabel}
                                        onChange={(event) => setProviderLabel(event.target.value)}
                                        className="w-full rounded-2xl border border-[var(--line-soft)] bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--line-strong)]"
                                        placeholder="例如：Kimi 原厂 / OpenRouter / 你自己的网关"
                                    />
                                </label>

                                <label className="block">
                                    <div className="mb-1.5 text-sm text-[var(--ink-2)]">Base URL</div>
                                    <input
                                        value={baseUrl}
                                        onChange={(event) => setBaseUrl(event.target.value)}
                                        className="w-full rounded-2xl border border-[var(--line-soft)] bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--line-strong)]"
                                        placeholder="https://api.moonshot.cn/v1"
                                    />
                                </label>

                                <label className="block">
                                    <div className="mb-1.5 text-sm text-[var(--ink-2)]">Model</div>
                                    <input
                                        value={model}
                                        onChange={(event) => setModel(event.target.value)}
                                        className="w-full rounded-2xl border border-[var(--line-soft)] bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--line-strong)]"
                                        placeholder="kimi-k2.5"
                                    />
                                </label>

                                <label className="block">
                                    <div className="mb-1.5 text-sm text-[var(--ink-2)]">API Key</div>
                                    <div className="relative">
                                        <input
                                            type={showApiKey ? 'text' : 'password'}
                                            value={apiKey}
                                            onChange={(event) => setApiKey(event.target.value)}
                                            className="w-full rounded-2xl border border-[var(--line-soft)] bg-white/70 px-4 py-3 pr-12 text-sm outline-none transition-colors focus:border-[var(--line-strong)]"
                                            placeholder={status?.configured ? '输入新 key 可覆盖已有配置' : '请输入你的 API Key'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey((prev) => !prev)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]"
                                        >
                                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </label>

                                <div className="flex flex-wrap gap-3 pt-2">
                                    <button
                                        onClick={handleTest}
                                        disabled={testing}
                                        className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-0)] px-4 py-2.5 text-sm text-[var(--ink-2)] transition-colors hover:text-[var(--ink-1)] disabled:opacity-60"
                                    >
                                        {testing ? '测试中...' : '测试连接'}
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                                    >
                                        {saving ? '保存中...' : '保存 BYOK'}
                                    </button>
                                    {status?.configured ? (
                                        <button
                                            onClick={handleClear}
                                            disabled={clearing}
                                            className="inline-flex items-center gap-1 rounded-2xl border border-[rgba(180,113,86,0.24)] bg-[rgba(255,244,240,0.86)] px-4 py-2.5 text-sm text-[rgb(145,84,57)] transition-opacity hover:opacity-90 disabled:opacity-60"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            {clearing ? '清除中...' : '清除'}
                                        </button>
                                    ) : null}
                                </div>

                                {testResult?.success ? (
                                    <div className="flex items-center gap-2 rounded-2xl border border-[rgba(120,156,96,0.26)] bg-[rgba(242,249,235,0.92)] px-3 py-2 text-sm text-[rgb(76,111,56)]">
                                        <Check className="h-4 w-4" />
                                        测试成功{typeof testResult.latency === 'number' ? `（${testResult.latency}ms）` : ''}
                                    </div>
                                ) : null}

                                {notice ? (
                                    <div className="rounded-2xl border border-[rgba(120,156,96,0.2)] bg-[rgba(242,249,235,0.92)] px-3 py-2 text-sm text-[rgb(76,111,56)]">{notice}</div>
                                ) : null}

                                {error ? (
                                    <div className={`flex items-start gap-2 rounded-2xl border px-3 py-2 text-sm ${errorToneClass}`}>
                                        <ErrorIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                        <div>
                                            <div>{error}</div>
                                            {errorMeta?.suggestion ? (
                                                <div className="mt-1 text-xs text-[var(--ink-3)]">建议：{errorMeta.suggestion}</div>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </section>

                    <aside className="rounded-[28px] border border-[var(--line-soft)] bg-[rgba(255,251,245,0.9)] p-5 shadow-[0_18px_40px_rgba(131,103,70,0.06)]">
                        <h2 className="text-base font-semibold text-[var(--ink-1)]">当前状态</h2>
                        <div className="mt-4 space-y-3 text-sm text-[var(--ink-2)]">
                            <div className="rounded-2xl bg-[var(--surface-0)] px-3 py-3">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-3)]">模式</div>
                                <div className="mt-1 font-medium">{trialStatus?.mode === 'byok' ? 'BYOK' : '平台试用'}</div>
                            </div>
                            <div className="rounded-2xl bg-[var(--surface-0)] px-3 py-3">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-3)]">已保存配置</div>
                                <div className="mt-1 font-medium">{status?.configured ? '已配置' : '未配置'}</div>
                                {status?.configured ? (
                                    <div className="mt-2 space-y-1 text-[12px] text-[var(--ink-3)]">
                                        <div>{status.providerLabel || '自定义提供商'}</div>
                                        <div>{status.baseUrl}</div>
                                        <div>{status.model}</div>
                                    </div>
                                ) : null}
                            </div>
                            <div className="rounded-2xl bg-[var(--surface-0)] px-3 py-3">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-3)]">推荐模板</div>
                                <div className="mt-2 space-y-2 text-[12px] text-[var(--ink-3)]">
                                    {RECOMMENDED_PROVIDERS.map((provider) => {
                                        const isSelected = provider.label === normalizedProvider.label
                                            && provider.baseUrl === normalizedProvider.baseUrl
                                            && provider.model === normalizedProvider.model;
                                        return (
                                            <button
                                                key={provider.label}
                                                type="button"
                                                onClick={() => {
                                                    setProviderLabel(provider.label);
                                                    setBaseUrl(provider.baseUrl);
                                                    setModel(provider.model);
                                                }}
                                                className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-colors ${isSelected
                                                    ? 'border-[var(--accent)] bg-[rgba(255,243,226,0.92)] text-[var(--ink-1)] shadow-[0_10px_24px_rgba(166,121,78,0.14)]'
                                                    : 'border-[var(--line-soft)] bg-white/70 text-[var(--ink-2)] hover:border-[var(--line-strong)]'
                                                }`}
                                            >
                                                <div className="text-sm font-medium text-[var(--ink-1)]">{provider.label}</div>
                                                <div className="mt-1 text-[12px] text-[var(--ink-3)]">{provider.desc}</div>
                                                <div className="mt-2 text-[12px] text-[var(--ink-2)]">{provider.baseUrl}</div>
                                                <div className="text-[11px] text-[var(--ink-3)]">{provider.model}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};
