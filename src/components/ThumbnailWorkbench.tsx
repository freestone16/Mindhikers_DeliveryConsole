import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileText, ImageIcon, Loader2, RefreshCw, Sparkles, Upload, Wand2 } from 'lucide-react';
import { useExpertState } from '../hooks/useExpertState';
import { buildApiUrl } from '../config/runtime';
import type { ChatMessage, SelectedScript, ThumbnailConceptCard, ThumbnailWorkspaceState } from '../types';

const INITIAL_WORKSPACE: ThumbnailWorkspaceState = {
    status: 'idle',
    variants: [],
    logs: [],
};

interface ThumbnailCommand {
    id: number;
    content: string;
}

interface ThumbnailWorkbenchProps {
    projectId: string;
    selectedScript?: SelectedScript;
    feedbackCommand: ThumbnailCommand | null;
    onAssistantMessage: (message: ChatMessage) => void;
}

const countWords = (content: string) => {
    const normalized = content.trim();
    if (!normalized) {
        return 0;
    }

    const chineseChars = (normalized.match(/[\u4e00-\u9fff]/g) || []).length;
    const latinWords = normalized
        .replace(/[\u4e00-\u9fff]/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length;
    return chineseChars + latinWords;
};

const buildAssistantMessage = (content: string): ChatMessage => ({
    id: `thumbnail_assistant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role: 'assistant',
    content,
    timestamp: new Date().toISOString(),
    meta: {
        authorId: 'ThumbnailMaster',
        authorName: '缩略图大师',
        authorRole: '视觉提案',
        classification: 'dialogue',
    },
});

export const ThumbnailWorkbench = ({
    projectId,
    selectedScript,
    feedbackCommand,
    onAssistantMessage,
}: ThumbnailWorkbenchProps) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const lastFeedbackIdRef = useRef<number | null>(null);
    const { state, updateState } = useExpertState<ThumbnailWorkspaceState>('ThumbnailMaster', INITIAL_WORKSPACE);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const activeSource = state.source;
    const variants = state.variants || [];

    const sourceSummary = useMemo(() => {
        if (!activeSource) {
            return '尚未载入长文。你可以直接导入本地 Markdown/TXT，或者读取当前项目文稿。';
        }
        return `${activeSource.name} · ${activeSource.wordCount} 词/字 · ${activeSource.charCount} 字符`;
    }, [activeSource]);

    const pushAssistantMessage = (content: string) => {
        onAssistantMessage(buildAssistantMessage(content));
    };

    const setWorkspace = (nextState: ThumbnailWorkspaceState) => {
        if (!projectId) {
            return;
        }
        updateState(projectId, nextState);
    };

    const updateSelectedVariant = (variantId: string) => {
        const nextVariants: ThumbnailConceptCard[] = variants.map((variant) => ({
            ...variant,
            status: variant.id === variantId ? 'selected' : (variant.status === 'failed' ? 'failed' : 'ready'),
        }));
        setWorkspace({
            ...state,
            selectedVariantId: variantId,
            variants: nextVariants,
        });
        pushAssistantMessage(`已将「${nextVariants.find((item) => item.id === variantId)?.name || '当前方案'}」标记为主推方案。`);
    };

    const loadSource = (payload: { name: string; type: 'uploaded' | 'project-script'; content: string; scriptPath?: string }) => {
        const normalizedContent = payload.content.trim();
        const nextState: ThumbnailWorkspaceState = {
            status: normalizedContent ? 'ready' : 'idle',
            source: normalizedContent ? {
                name: payload.name,
                type: payload.type,
                scriptPath: payload.scriptPath,
                content: normalizedContent,
                loadedAt: new Date().toISOString(),
                wordCount: countWords(normalizedContent),
                charCount: normalizedContent.length,
            } : undefined,
            variants: [],
            logs: normalizedContent ? [`已载入长文：${payload.name}`] : [],
        };
        setWorkspace(nextState);
        if (normalizedContent) {
            pushAssistantMessage(`长文已载入，我会基于「${payload.name}」准备两版缩略图备选。`);
        }
    };

    const handleLocalFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const content = await file.text();
        loadSource({
            name: file.name,
            type: 'uploaded',
            content,
        });
        event.target.value = '';
    };

    const handleLoadCurrentScript = async () => {
        if (!projectId || !selectedScript?.path) {
            pushAssistantMessage('当前还没有选中的项目文稿，请先在顶部 Script 下拉里选一份文稿。');
            return;
        }

        try {
            const response = await fetch(buildApiUrl('/api/scripts/content'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, path: selectedScript.path }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '读取文稿失败');
            }

            loadSource({
                name: selectedScript.filename,
                type: 'project-script',
                scriptPath: selectedScript.path,
                content: data.content || '',
            });
        } catch (error: any) {
            pushAssistantMessage(`载入当前文稿失败：${error.message}`);
        }
    };

    const submitThumbnailJob = async (mode: 'generate' | 'revise', feedback?: string) => {
        if (!projectId) {
            pushAssistantMessage('请先选择项目。');
            return;
        }

        if (!activeSource?.content) {
            pushAssistantMessage('请先载入长文，再生成缩略图方案。');
            return;
        }

        const currentLogs = state.logs || [];
        const baseState: ThumbnailWorkspaceState = {
            ...state,
            status: mode === 'generate' ? 'generating' : 'revising',
            error: undefined,
            lastFeedback: feedback || state.lastFeedback,
            logs: [
                ...currentLogs,
                mode === 'generate'
                    ? `开始生成两版缩略图方案`
                    : `收到 chatbox 反馈：${feedback}`,
            ].slice(-12),
        };
        setWorkspace(baseState);
        setIsSubmitting(true);

        try {
            const endpoint = mode === 'generate' ? '/api/thumbnail/generate' : '/api/thumbnail/revise';
            const response = await fetch(buildApiUrl(endpoint), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    sourceName: activeSource.name,
                    scriptPath: activeSource.scriptPath,
                    scriptContent: activeSource.content,
                    currentVariants: state.variants,
                    selectedVariantId: state.selectedVariantId,
                    feedback,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '缩略图生成失败');
            }

            const nextState: ThumbnailWorkspaceState = data.state?.data || data.state || {
                ...state,
                status: 'ready',
                generatedAt: new Date().toISOString(),
                variants: data.variants || [],
            };
            setWorkspace(nextState);

            if (mode === 'generate') {
                pushAssistantMessage('两版缩略图备选已经生成好了。你可以直接在右侧 chatbox 说“第一版更克制一些”或“把文案改成更尖锐的句子”，我会据此改图。');
            } else {
                pushAssistantMessage(`已根据你的反馈调整缩略图：${feedback}`);
            }
        } catch (error: any) {
            const errorState: ThumbnailWorkspaceState = {
                ...state,
                status: 'error',
                error: error.message,
                logs: [...(state.logs || []), `失败：${error.message}`].slice(-12),
            };
            setWorkspace(errorState);
            pushAssistantMessage(`${mode === 'generate' ? '生成' : '修订'}失败：${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!feedbackCommand || feedbackCommand.id === lastFeedbackIdRef.current) {
            return;
        }

        lastFeedbackIdRef.current = feedbackCommand.id;
        if (!feedbackCommand.content.trim()) {
            return;
        }

        void submitThumbnailJob('revise', feedbackCommand.content.trim());
    }, [feedbackCommand]);

    const renderVariantCard = (variant: ThumbnailConceptCard, index: number) => (
        <article
            key={variant.id}
            className="overflow-hidden rounded-[28px] border border-[rgba(124,88,46,0.18)] bg-[linear-gradient(180deg,rgba(255,251,244,0.96)_0%,rgba(246,235,218,0.92)_100%)] shadow-[0_18px_45px_rgba(92,62,20,0.08)]"
        >
            <div className="border-b border-[rgba(124,88,46,0.12)] px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[rgba(119,83,39,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">
                            <Sparkles className="h-3.5 w-3.5" />
                            方案 {index + 1}
                        </div>
                        <h3 className="text-2xl font-semibold text-[var(--ink-1)]">{variant.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--ink-3)]">{variant.hook}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => updateSelectedVariant(variant.id)}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${state.selectedVariantId === variant.id
                            ? 'bg-[var(--accent)] text-white'
                            : 'bg-[rgba(119,83,39,0.08)] text-[var(--ink-2)] hover:bg-[rgba(119,83,39,0.14)]'
                            }`}
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        {state.selectedVariantId === variant.id ? '已选主推' : '设为主推'}
                    </button>
                </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="border-b border-[rgba(124,88,46,0.12)] bg-[rgba(255,247,235,0.72)] p-5 lg:border-b-0 lg:border-r">
                    <div className="aspect-video overflow-hidden rounded-[24px] border border-[rgba(124,88,46,0.12)] bg-[linear-gradient(135deg,#f9f0e3_0%,#e8d5ba_100%)]">
                        {variant.imageUrl ? (
                            <img
                                src={variant.imageUrl}
                                alt={variant.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-[var(--ink-3)]">
                                {variant.status === 'failed' ? variant.error || '出图失败' : '图片生成中...'}
                            </div>
                        )}
                    </div>
                    <div className="mt-4 rounded-[20px] border border-[rgba(124,88,46,0.12)] bg-white/70 px-4 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">缩略图文案</div>
                        <div className="mt-2 text-lg font-semibold text-[var(--ink-1)]">{variant.overlayText}</div>
                    </div>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <section>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">为什么会被点开</div>
                        <p className="mt-2 text-sm leading-6 text-[var(--ink-2)]">{variant.rationale}</p>
                    </section>

                    <section className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] border border-[rgba(124,88,46,0.1)] bg-white/70 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">布局</div>
                            <p className="mt-2 text-sm text-[var(--ink-2)]">{variant.visualSpecs.layout}</p>
                        </div>
                        <div className="rounded-[18px] border border-[rgba(124,88,46,0.1)] bg-white/70 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">张力</div>
                            <p className="mt-2 text-sm text-[var(--ink-2)]">{variant.visualSpecs.tension}</p>
                        </div>
                        <div className="rounded-[18px] border border-[rgba(124,88,46,0.1)] bg-white/70 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">字体语气</div>
                            <p className="mt-2 text-sm text-[var(--ink-2)]">{variant.visualSpecs.font}</p>
                        </div>
                        <div className="rounded-[18px] border border-[rgba(124,88,46,0.1)] bg-white/70 p-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">渲染风格</div>
                            <p className="mt-2 text-sm text-[var(--ink-2)]">{variant.visualSpecs.rendering}</p>
                        </div>
                    </section>

                    <section>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">色板</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {variant.visualSpecs.colorPalette.map((color) => (
                                <span
                                    key={`${variant.id}_${color}`}
                                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(124,88,46,0.12)] bg-white/70 px-3 py-1.5 text-xs text-[var(--ink-2)]"
                                >
                                    <span className="h-3 w-3 rounded-full border border-white/70" style={{ backgroundColor: color }} />
                                    {color}
                                </span>
                            ))}
                        </div>
                    </section>

                    <section>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">火山出图 Prompt</div>
                        <p className="mt-2 rounded-[18px] border border-[rgba(124,88,46,0.1)] bg-[rgba(255,251,244,0.86)] p-4 text-xs leading-6 text-[var(--ink-2)]">
                            {variant.prompt}
                        </p>
                    </section>
                </div>
            </div>
        </article>
    );

    return (
        <section className="space-y-6">
            <div className="rounded-[30px] border border-[rgba(124,88,46,0.14)] bg-[linear-gradient(135deg,rgba(255,252,247,0.98)_0%,rgba(246,236,220,0.94)_100%)] px-8 py-7 shadow-[0_24px_65px_rgba(95,67,27,0.08)]">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(154,102,44,0.1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-3)]">
                            <Wand2 className="h-3.5 w-3.5" />
                            ThumbnailMaster Workbench
                        </div>
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--ink-1)]">交付终端 / 缩略图大师</h2>
                        <p className="mt-3 text-sm leading-7 text-[var(--ink-3)]">
                            从长文提炼认知承诺，直接调用火山引擎产出两版 MindHikers 缩略图。右侧 chatbox 的每条意见都会被当作改图指令。
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".md,.txt,text/markdown,text/plain"
                            className="hidden"
                            onChange={handleLocalFileChange}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-full border border-[rgba(124,88,46,0.16)] bg-white/80 px-4 py-2.5 text-sm font-medium text-[var(--ink-2)] transition-colors hover:bg-white"
                        >
                            <Upload className="h-4 w-4" />
                            Load 长文本
                        </button>
                        <button
                            type="button"
                            onClick={handleLoadCurrentScript}
                            className="inline-flex items-center gap-2 rounded-full border border-[rgba(124,88,46,0.16)] bg-white/80 px-4 py-2.5 text-sm font-medium text-[var(--ink-2)] transition-colors hover:bg-white"
                        >
                            <FileText className="h-4 w-4" />
                            载入当前文稿
                        </button>
                        <button
                            type="button"
                            disabled={!activeSource?.content || isSubmitting}
                            onClick={() => void submitThumbnailJob('generate')}
                            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(166,117,64,0.26)] transition-colors hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-55"
                        >
                            {state.status === 'generating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                            生成两版缩略图
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[22px] border border-[rgba(124,88,46,0.1)] bg-white/75 p-5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">当前长文源</div>
                        <div className="mt-2 text-base font-medium text-[var(--ink-1)]">{sourceSummary}</div>
                        <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-[var(--ink-3)]">
                            {activeSource?.content?.slice(0, 420) || '载入后这里会显示长文开头预览，方便你确认当前缩略图方案对应的是哪份稿子。'}
                        </p>
                    </div>

                    <div className="rounded-[22px] border border-[rgba(124,88,46,0.1)] bg-white/75 p-5">
                        <div className="flex items-center justify-between">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-3)]">工作状态</div>
                            <span className="rounded-full bg-[rgba(124,88,46,0.08)] px-3 py-1 text-xs font-medium text-[var(--ink-2)]">
                                {state.status}
                            </span>
                        </div>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--ink-3)]">
                            {(state.logs || []).slice(-4).map((log, index) => (
                                <div key={`${log}_${index}`} className="rounded-[14px] bg-[rgba(250,245,238,0.85)] px-3 py-2">
                                    {log}
                                </div>
                            ))}
                            {state.error ? (
                                <div className="rounded-[14px] bg-[rgba(169,76,57,0.1)] px-3 py-2 text-[rgb(134,53,36)]">
                                    {state.error}
                                </div>
                            ) : null}
                            {!state.logs?.length ? (
                                <div className="rounded-[14px] bg-[rgba(250,245,238,0.85)] px-3 py-2">
                                    缩略图大师待命中。载入长文后就可以开始生成。
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6">
                {variants.length > 0 ? variants.map(renderVariantCard) : (
                    <div className="rounded-[28px] border border-dashed border-[rgba(124,88,46,0.18)] bg-[rgba(255,251,244,0.85)] px-8 py-16 text-center shadow-[0_18px_45px_rgba(92,62,20,0.05)]">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(166,117,64,0.1)] text-[var(--accent)]">
                            {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
                        </div>
                        <h3 className="mt-5 text-xl font-semibold text-[var(--ink-1)]">两版备选会显示在这里</h3>
                        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-3)]">
                            先载入长文，再点击「生成两版缩略图」。之后你就能直接在右侧 chatbox 说“把第一版人物放大一点”或“第二版别这么焦虑，换成更克制的张力”。
                        </p>
                    </div>
                )}
            </div>

            {variants.length > 0 ? (
                <div className="flex items-center gap-3 rounded-[22px] border border-[rgba(124,88,46,0.12)] bg-white/75 px-5 py-4 text-sm text-[var(--ink-3)]">
                    <RefreshCw className={`h-4 w-4 ${state.status === 'revising' ? 'animate-spin text-[var(--accent)]' : 'text-[var(--ink-3)]'}`} />
                    右侧 chatbox 已接管缩略图修订。你直接提修改意见即可，这里会自动刷新最新两版图。
                </div>
            ) : null}
        </section>
    );
};
