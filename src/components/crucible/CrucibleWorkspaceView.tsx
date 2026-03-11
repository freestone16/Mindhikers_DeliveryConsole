import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenText, Boxes, BrainCircuit, ChevronRight, Quote, RotateCcw, Sparkles } from 'lucide-react';
import type { HostRoutedAsset } from '../../types';
import { buildApiUrl } from '../../config/runtime';
import { clearCrucibleSnapshot, readCrucibleSnapshot, writeCrucibleSnapshot } from './storage';
import type { CanvasAsset, ClarificationCard } from './types';

const ASSET_META = {
    ascii: { icon: Boxes, label: '结构' },
    mindmap: { icon: BrainCircuit, label: '脑图' },
    quote: { icon: Quote, label: '金句' },
    remotion: { icon: Sparkles, label: '影像' },
    reference: { icon: BookOpenText, label: '参考' },
};

interface CrucibleWorkspaceProps {
    incomingAssets?: HostRoutedAsset[];
    topicTitle?: string;
    seedPrompt?: string;
    seedPromptVersion?: number;
    onResetWorkspace?: () => void;
    onRoundGenerated?: (payload: {
        speaker: 'laozhang' | 'laolu';
        reflection: string;
        source: 'socrates' | 'fallback';
        roundIndex: number;
    }) => void;
}

const toCanvasAsset = (asset: HostRoutedAsset): CanvasAsset => ({
    id: asset.id,
    type: asset.type,
    title: asset.title,
    subtitle: asset.subtitle,
    content: asset.content,
    summary: asset.summary,
});

const formatAssetContent = (content: string) => content
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ''))
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();

const toReadableSentences = (content: string) => formatAssetContent(content)
    .split(/[。！？!?]\s*|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const buildReferenceSections = (asset: CanvasAsset) => {
    const sentences = toReadableSentences(asset.content);
    const lead = asset.summary || sentences[0] || '当前这轮内容正在围绕一个更清晰的问题定义收束。';
    const bullets = sentences.slice(1, 4).map((sentence) => sentence.length > 42 ? `${sentence.slice(0, 42)}...` : sentence);
    const notes = sentences.slice(4).map((sentence) => sentence.length > 92 ? `${sentence.slice(0, 92)}...` : sentence);

    return { lead, bullets, notes };
};

const normalizeTopic = (topicTitle?: string) => {
    if (
        !topicTitle
        || topicTitle === '标题待收敛...'
        || topicTitle === '标题待定'
        || topicTitle.toUpperCase() === 'TBD'
    ) {
        return '标题待定';
    }
    return topicTitle;
};

const normalizePromptTopic = (topicTitle?: string) => {
    const normalized = normalizeTopic(topicTitle);
    return normalized === '标题待定' ? '当前议题' : normalized;
};

const buildClarificationCards = (topicTitle?: string): ClarificationCard[] => {
    const topic = normalizePromptTopic(topicTitle);

    return [
        {
            id: 'clarify-core-claim',
            prompt: `围绕“${topic}”，你真正要锁定的核心判断是什么？`,
            helper: '请用 2-4 句话写清你要保住的那个命题，不要泛谈背景。',
            answer: '',
            isSaved: false,
        },
        {
            id: 'clarify-counter-force',
            prompt: `这个议题当前最强的反方、反例或现实阻力是什么？`,
            helper: '优先写“最难反驳你的那股力量”，而不是弱反对意见。',
            answer: '',
            isSaved: false,
        },
        {
            id: 'clarify-reader-takeaway',
            prompt: `如果这一轮锁定成功，你希望最终读者带走什么新的判断？`,
            helper: '写成结果导向，明确“读者看完后应该如何重新理解这个问题”。',
            answer: '',
            isSaved: false,
        },
    ];
};

const shortenAnswer = (value: string, fallback: string, maxLength = 28) => {
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (!normalized) {
        return fallback;
    }
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const buildNextRoundCards = (
    topicTitle: string | undefined,
    previousCards: ClarificationCard[],
    nextRoundIndex: number
): ClarificationCard[] => {
    const promptTopic = normalizePromptTopic(topicTitle);
    const coreClaim = shortenAnswer(
        previousCards.find((card) => card.id.includes('core-claim'))?.answer || '',
        '你的核心判断'
    );
    const counterForce = shortenAnswer(
        previousCards.find((card) => card.id.includes('counter-force'))?.answer || '',
        '你识别到的最强反方'
    );
    const takeaway = shortenAnswer(
        previousCards.find((card) => card.id.includes('reader-takeaway'))?.answer || '',
        '读者最终应带走的新判断'
    );

    return [
        {
            id: `round-${nextRoundIndex}-compression`,
            prompt: `如果你要用一个具体场景说明“${coreClaim}”，你最想先讲哪个真实例子？`,
            helper: `继续围绕“${promptTopic}”往下走，但先别上理论，先拿一个你自己真正见过、感受过、能说清的例子。`,
            answer: '',
            isSaved: false,
        },
        {
            id: `round-${nextRoundIndex}-mechanism`,
            prompt: `如果有人不同意你，他最可能会抓住“${counterForce}”里的哪一点来反驳你？`,
            helper: '不要追求最强理论反方，先写那个最让你自己也会犹豫一下的反驳。',
            answer: '',
            isSaved: false,
        },
        {
            id: `round-${nextRoundIndex}-judgement`,
            prompt: `你希望读者读完后得到“${takeaway}”，那这篇东西最想帮他解决的具体困惑到底是什么？`,
            helper: '把目标读者想象成一个真实的人，写他卡住的地方，而不是写抽象的“判断升级”。',
            answer: '',
            isSaved: false,
        },
    ];
};

const hydrateCards = (cards: Array<{ prompt: string; helper: string }>, roundIndex: number) => cards.slice(0, 3).map((card, index) => ({
    id: `round-${roundIndex}-card-${index + 1}`,
    prompt: card.prompt,
    helper: card.helper,
    answer: '',
    isSaved: false,
}));

export const CrucibleWorkspace = ({
    incomingAssets = [],
    topicTitle,
    seedPrompt,
    seedPromptVersion = 0,
    onResetWorkspace,
    onRoundGenerated,
}: CrucibleWorkspaceProps) => {
    const snapshot = useMemo(() => readCrucibleSnapshot(), []);
    const [canvasAssets, setCanvasAssets] = useState<CanvasAsset[]>(() => snapshot?.canvasAssets?.length ? snapshot.canvasAssets : []);
    const [activeAssetId, setActiveAssetId] = useState<string>(() => snapshot?.activeAssetId || '');
    const [clarificationCards, setClarificationCards] = useState<ClarificationCard[]>(() => (
        snapshot?.clarificationCards?.length ? snapshot.clarificationCards : []
    ));
    const [submittedAt, setSubmittedAt] = useState<string | null>(() => snapshot?.submittedAt || null);
    const [roundIndex, setRoundIndex] = useState<number>(() => snapshot?.roundIndex || 1);
    const [isThinking, setIsThinking] = useState<boolean>(() => snapshot?.isThinking || false);
    const [questionSource, setQuestionSource] = useState<'static' | 'socrates' | 'fallback'>(() => snapshot?.questionSource || 'static');
    const [submitNotice, setSubmitNotice] = useState<{ tone: 'warning' | 'success'; message: string } | null>(null);
    const routedIdsRef = useRef<Set<string>>(new Set());
    const previousTopicRef = useRef<string>(normalizeTopic(snapshot?.topicTitle || topicTitle));
    const previousSeedVersionRef = useRef<number>(seedPromptVersion);
    const mainScrollRef = useRef<HTMLElement | null>(null);
    const thinkingTimerRef = useRef<number | null>(null);
    const requestSeqRef = useRef(0);
    const [mainScrollIndicator, setMainScrollIndicator] = useState({ visible: false, height: 0, offset: 0 });

    const activeAsset = useMemo(
        () => canvasAssets.find((asset) => asset.id === activeAssetId) ?? canvasAssets[0] ?? null,
        [activeAssetId, canvasAssets]
    );
    const referenceSections = useMemo(
        () => activeAsset?.type === 'reference' ? buildReferenceSections(activeAsset) : null,
        [activeAsset]
    );

    useEffect(() => {
        writeCrucibleSnapshot({
            messages: [],
            canvasAssets,
            activeAssetId: activeAssetId || undefined,
            topicTitle,
            clarificationCards,
            submittedAt: submittedAt || undefined,
            roundIndex,
            isThinking,
            questionSource,
        });
    }, [activeAssetId, canvasAssets, clarificationCards, submittedAt, topicTitle, roundIndex, isThinking, questionSource]);

    useEffect(() => {
        const normalizedTopic = normalizeTopic(topicTitle);
        if (normalizedTopic === previousTopicRef.current) {
            return;
        }

        previousTopicRef.current = normalizedTopic;
        setCanvasAssets([]);
        setActiveAssetId('');
        setClarificationCards([]);
        setSubmittedAt(null);
        setRoundIndex(1);
        setIsThinking(false);
        setQuestionSource('static');
        setSubmitNotice(null);
    }, [topicTitle]);

    useEffect(() => () => {
        if (thinkingTimerRef.current) {
            window.clearTimeout(thinkingTimerRef.current);
        }
    }, []);

    const requestSocraticCards = useCallback(async (
        nextRoundIndex: number,
        previousCards: ClarificationCard[],
        loadingMessage: string
    ) => {
        const requestId = ++requestSeqRef.current;
        setIsThinking(true);
        setSubmitNotice({ tone: 'success', message: loadingMessage });
        mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

        try {
            const response = await fetch(buildApiUrl('/api/crucible/socratic-questions'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topicTitle: normalizeTopic(topicTitle),
                    roundIndex: nextRoundIndex,
                    previousCards,
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || '苏格拉底问题生成失败');
            }

            const data = await response.json() as {
                cards?: Array<{ prompt: string; helper: string }>;
                source?: 'socrates' | 'fallback';
                speaker?: 'laozhang' | 'laolu';
                reflection?: string;
                warning?: string;
            };
            if (requestId !== requestSeqRef.current) {
                return;
            }

            const generatedCards = Array.isArray(data.cards) && data.cards.length > 0
                ? hydrateCards(data.cards, nextRoundIndex)
                : buildNextRoundCards(topicTitle, previousCards, nextRoundIndex);

            setClarificationCards(generatedCards);
            setRoundIndex(nextRoundIndex);
            setSubmittedAt(null);
            setIsThinking(false);
            setQuestionSource(data.source === 'socrates' ? 'socrates' : 'fallback');
            setSubmitNotice({
                tone: 'success',
                message: data.source === 'socrates'
                    ? `第 ${nextRoundIndex} 轮问题已生成，继续往下回答。`
                    : `第 ${nextRoundIndex} 轮问题已生成。当前先用临时追问继续，不会中断你的推演。`,
            });
            if (previousCards.length > 0) {
                onRoundGenerated?.({
                    speaker: data.speaker === 'laolu' ? 'laolu' : 'laozhang',
                    reflection: data.reflection || '我看到了你的上一轮回答，下面继续往里追一层。',
                    source: data.source === 'socrates' ? 'socrates' : 'fallback',
                    roundIndex: nextRoundIndex,
                });
            }
            mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error: any) {
            if (requestId !== requestSeqRef.current) {
                return;
            }

            setClarificationCards(buildNextRoundCards(topicTitle, previousCards, nextRoundIndex));
            setRoundIndex(nextRoundIndex);
            setSubmittedAt(null);
            setIsThinking(false);
            setQuestionSource('fallback');
            setSubmitNotice({
                tone: 'warning',
                message: 'Socrates 当前没有顺利返回，系统先用临时追问接住这轮，不会打断你的流程。',
            });
            if (previousCards.length > 0) {
                onRoundGenerated?.({
                    speaker: nextRoundIndex % 2 === 0 ? 'laolu' : 'laozhang',
                    reflection: '我先接住你这一轮回答，继续把问题往里压，不让这轮停在这里。',
                    source: 'fallback',
                    roundIndex: nextRoundIndex,
                });
            }
        }
    }, [topicTitle, onRoundGenerated]);

    useEffect(() => {
        if (!seedPrompt?.trim()) {
            return;
        }
        if (seedPromptVersion === previousSeedVersionRef.current) {
            return;
        }
        previousSeedVersionRef.current = seedPromptVersion;
        if (roundIndex !== 1 || clarificationCards.length > 0 || isThinking) {
            return;
        }

        void requestSocraticCards(
            1,
            [],
            'Socrates 正在根据你的命题锁定第一轮议题，马上给出问题。'
        );
    }, [seedPrompt, seedPromptVersion, roundIndex, clarificationCards.length, isThinking, requestSocraticCards]);

    useEffect(() => {
        if (incomingAssets.length === 0) {
            return;
        }

        const freshAssets = incomingAssets.filter((asset) => !routedIdsRef.current.has(asset.id));
        if (freshAssets.length === 0) {
            return;
        }

        freshAssets.forEach((asset) => routedIdsRef.current.add(asset.id));

        setCanvasAssets((prev) => {
            const nextBySlot = new Map<string, CanvasAsset>();
            for (const asset of prev) {
                nextBySlot.set(asset.type, asset);
            }
            for (const asset of freshAssets.map(toCanvasAsset)) {
                nextBySlot.set(asset.type, asset);
            }
            return Array.from(nextBySlot.values()).slice(0, 12);
        });
        setActiveAssetId(freshAssets[0].id);
    }, [incomingAssets]);

    useEffect(() => {
        const container = mainScrollRef.current;
        if (!container) {
            return;
        }

        const updateIndicator = () => {
            const { clientHeight, scrollHeight, scrollTop } = container;
            const canScroll = scrollHeight - clientHeight > 4;

            if (!canScroll) {
                setMainScrollIndicator({ visible: false, height: 0, offset: 0 });
                return;
            }

            const ratio = clientHeight / scrollHeight;
            const thumbHeight = Math.max(88, clientHeight * ratio);
            const maxOffset = clientHeight - thumbHeight;
            const scrollableHeight = scrollHeight - clientHeight;
            const thumbOffset = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * maxOffset : 0;

            setMainScrollIndicator({
                visible: true,
                height: thumbHeight,
                offset: thumbOffset,
            });
        };

        updateIndicator();
        container.addEventListener('scroll', updateIndicator, { passive: true });
        window.addEventListener('resize', updateIndicator);

        const observer = new ResizeObserver(updateIndicator);
        observer.observe(container);

        return () => {
            container.removeEventListener('scroll', updateIndicator);
            window.removeEventListener('resize', updateIndicator);
            observer.disconnect();
        };
    }, [activeAssetId, canvasAssets, clarificationCards, submittedAt, topicTitle]);

    const handleResetWorkspace = () => {
        if (thinkingTimerRef.current) {
            window.clearTimeout(thinkingTimerRef.current);
        }
        clearCrucibleSnapshot();
        routedIdsRef.current.clear();
        requestSeqRef.current += 1;
        setCanvasAssets([]);
        setActiveAssetId('');
        setClarificationCards([]);
        setSubmittedAt(null);
        setRoundIndex(1);
        setIsThinking(false);
        setQuestionSource('static');
        setSubmitNotice(null);
        onResetWorkspace?.();
    };

    const handleCardChange = (cardId: string, answer: string) => {
        if (thinkingTimerRef.current) {
            window.clearTimeout(thinkingTimerRef.current);
            thinkingTimerRef.current = null;
        }
        if (isThinking) {
            setIsThinking(false);
        }
        if (submittedAt) {
            setSubmittedAt(null);
            setSubmitNotice({
                tone: 'warning',
                message: '你已修改问题卡内容，当前提交状态已失效，需要重新保存并再次提交。',
            });
        }
        setClarificationCards((prev) => prev.map((card) => (
            card.id === cardId ? { ...card, answer, isSaved: false } : card
        )));
    };

    const handleSaveCard = (cardId: string) => {
        setClarificationCards((prev) => prev.map((card) => (
            card.id === cardId ? { ...card, isSaved: true } : card
        )));
        setSubmitNotice(null);

        if (document.activeElement instanceof HTMLTextAreaElement) {
            document.activeElement.blur();
        }
    };

    const handleSubmitAll = () => {
        if (isThinking) {
            return;
        }

        const incompleteCards = clarificationCards.filter((card) => !card.answer.trim() || !card.isSaved);
        if (incompleteCards.length > 0) {
            const firstMissingCard = incompleteCards[0];
            setSubmitNotice({
                tone: 'warning',
                message: `还不能提交。请先完成并保存 ${incompleteCards.length} 张问题卡，先处理「${firstMissingCard.prompt}」。`,
            });

            const target = document.getElementById(firstMissingCard.id);
            target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const nextRoundIndex = roundIndex + 1;
        setSubmittedAt(new Date().toISOString());
        void requestSocraticCards(
            nextRoundIndex,
            clarificationCards,
            'Socrates 正在基于你刚提交的回答继续思考，马上给出下一轮问题。'
        );
    };

    const allCardsReady = clarificationCards.every((card) => card.answer.trim() && card.isSaved);
    const hasWorkspaceStarted = clarificationCards.length > 0 || canvasAssets.length > 0 || isThinking;
    const showEmptyState = !hasWorkspaceStarted;

    return (
        <div className="flex h-full min-h-0 flex-1 overflow-hidden px-3 py-3 md:px-4 md:py-3">
            <div className="mx-auto grid h-full min-h-0 max-w-[1500px] flex-1 gap-3 xl:grid-cols-[172px_minmax(0,1fr)]">
                <aside className="order-2 h-full overflow-hidden rounded-[24px] border border-[var(--line-soft)] bg-[rgba(255,251,245,0.92)] p-2.5 shadow-[0_14px_32px_rgba(131,103,70,0.04)] xl:order-1">
                    <div className="mb-2 px-1">
                        <div className="mh-display text-[16px] font-semibold text-[var(--ink-1)]">结晶目录</div>
                    </div>
                    <div className="max-h-full space-y-1.5 overflow-y-auto pr-1">
                        {canvasAssets.length === 0 ? (
                            <div className="rounded-[18px] border border-dashed border-[var(--line-soft)] bg-[rgba(255,252,248,0.86)] px-3 py-4 text-[12px] leading-6 text-[var(--ink-3)]">
                                先在右侧抛出命题，中区才会开始沉淀结构、参考和影像提示。
                            </div>
                        ) : canvasAssets.map((asset) => {
                            const meta = ASSET_META[asset.type];
                            const Icon = meta.icon;
                            const isActive = asset.id === activeAssetId;

                            return (
                                <button
                                    key={asset.id}
                                    type="button"
                                    onClick={() => setActiveAssetId(asset.id)}
                                    className={`w-full rounded-[18px] border px-2.5 py-2 text-left transition ${isActive
                                        ? 'border-[var(--line-strong)] bg-[var(--surface-1)] shadow-[0_10px_20px_rgba(131,103,70,0.06)]'
                                        : 'border-transparent bg-transparent hover:border-[var(--line-soft)] hover:bg-[var(--surface-1)]'
                                        }`}
                                >
                                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]">
                                        <Icon className="h-3.5 w-3.5" />
                                        {meta.label}
                                    </div>
                                    <div className="mt-1 text-[12px] font-medium leading-5 text-[var(--ink-1)]">{asset.title}</div>
                                    {asset.summary && (
                                        <div className="mt-0.5 text-[10px] leading-4 text-[var(--ink-3)]">{asset.summary}</div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                <div className="relative order-1 h-full min-h-0 xl:order-2">
                    <main
                        ref={mainScrollRef}
                        className="h-full min-h-0 space-y-3 overflow-y-scroll pr-5"
                    >
                        <section className="rounded-[24px] border border-[var(--line-soft)] bg-[rgba(255,251,245,0.84)] px-4 py-3 shadow-[0_14px_32px_rgba(131,103,70,0.04)]">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <div className="mh-display text-[24px] font-semibold tracking-tight text-[var(--ink-1)] md:text-[26px]">黄金坩埚</div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--ink-2)]">
                                    <div className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-1)] px-2.5 py-1">
                                        冶炼流程
                                        <span className="mx-1.5 text-[var(--ink-3)]">定题</span>
                                        <ChevronRight className="inline h-3 w-3 text-[var(--ink-3)]" />
                                        <span className="mx-1.5 text-[var(--ink-3)]">交锋</span>
                                        <ChevronRight className="inline h-3 w-3 text-[var(--ink-3)]" />
                                        <span className="mx-1.5 text-[var(--ink-3)]">综述</span>
                                        <ChevronRight className="inline h-3 w-3 text-[var(--ink-3)]" />
                                        <span className="ml-1.5 text-[var(--ink-3)]">结晶</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleResetWorkspace}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-soft)] bg-[var(--surface-1)] px-2.5 py-1 transition hover:border-[var(--line-strong)] hover:text-[var(--ink-1)]"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        重置
                                    </button>
                                </div>
                            </div>
                        </div>
                        </section>

                        <section className="rounded-[24px] border border-[var(--line-soft)] bg-[var(--surface-0)] p-4 shadow-[0_14px_32px_rgba(131,103,70,0.04)]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">议题锁定阶段 · 第 {roundIndex} 轮</div>
                                <h2 className="mh-display mt-2 text-[20px] font-semibold text-[var(--ink-1)]">{normalizeTopic(topicTitle)}</h2>
                                <p className="mt-2 text-[12px] leading-6 text-[var(--ink-2)]">
                                    {showEmptyState
                                        ? '先在右侧抛出一句命题。黄金坩埚不会预设问题，等 Socrates 根据你的真实输入再开始锁边界。'
                                        : '本轮先锁边界。系统只给 3 个问题，你逐题填写、保存，再统一提交。'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleSubmitAll}
                                    disabled={!clarificationCards.length}
                                    className={`rounded-full px-4 py-2 text-[12px] font-medium transition ${allCardsReady
                                        ? 'bg-[var(--accent)] text-white hover:opacity-90'
                                        : 'bg-[var(--surface-2)] text-[var(--ink-3)]'
                                        }`}
                                >
                                    {isThinking ? '思考中...' : submittedAt ? '已提交，可继续修改' : '全部提交'}
                                </button>
                            </div>
                        </div>

                        {submitNotice && (
                            <div className={`mt-4 rounded-[18px] border px-4 py-3 text-[12px] leading-6 ${submitNotice.tone === 'success'
                                ? 'border-[rgba(102,165,117,0.2)] bg-[rgba(241,250,243,0.94)] text-emerald-800'
                                : 'border-[rgba(166,117,64,0.16)] bg-[rgba(255,248,238,0.94)] text-[var(--ink-2)]'
                                }`}>
                                {submitNotice.message}
                            </div>
                        )}

                        {isThinking && (
                            <div className="mt-4 rounded-[20px] border border-[rgba(166,117,64,0.18)] bg-[rgba(255,248,238,0.96)] p-4 shadow-[0_10px_24px_rgba(117,88,55,0.05)]">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">正在思考中</div>
                                <div className="mt-2 text-[15px] font-semibold text-[var(--ink-1)]">老张 / 老卢 正在咬合你的上一轮回答</div>
                                <div className="mt-2 text-[12px] leading-6 text-[var(--ink-2)]">
                                    系统正在把你上一轮的核心判断、最强反方和读者收获压缩成下一轮更尖锐的问题。
                                </div>
                            </div>
                        )}

                        {submittedAt && !isThinking && (
                            <div className="mt-4 rounded-[20px] border border-[rgba(102,165,117,0.2)] bg-[rgba(247,252,247,0.96)] p-4 text-[12px] text-[var(--ink-2)] shadow-[0_10px_24px_rgba(95,132,94,0.06)]">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700">提交结果</div>
                                <div className="mt-2 text-[15px] font-semibold text-[var(--ink-1)]">本轮回答已收下</div>
                                <div className="mt-2 leading-6">
                                    当前前端已确认 3 张问题卡都已填写并保存。
                                    下一刀应该接出“收敛判定”和“是否建立新项目”的结果面板。
                                </div>
                                <div className="mt-3 rounded-[16px] border border-[rgba(102,165,117,0.18)] bg-white/80 px-3 py-2 text-[11px] leading-6 text-[var(--ink-2)]">
                                    当前标题仍保持“标题待定”，不会因为本轮提交而自动生成标题。
                                </div>
                            </div>
                        )}

                        {showEmptyState ? (
                            <div className="mt-4 overflow-hidden rounded-[24px] border border-[rgba(166,117,64,0.14)] bg-[linear-gradient(145deg,rgba(255,251,245,0.98)_0%,rgba(247,236,218,0.95)_100%)]">
                                <div className="relative flex min-h-[360px] items-center justify-center px-6 py-10">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(208,165,102,0.22),transparent_34%),radial-gradient(circle_at_50%_82%,rgba(156,111,62,0.12),transparent_26%)]" />
                                    <div className="absolute left-1/2 top-[22%] h-32 w-32 -translate-x-1/2 rounded-full border border-[rgba(182,139,84,0.18)] bg-[radial-gradient(circle,rgba(255,244,224,0.95)_0%,rgba(244,220,184,0.24)_60%,transparent_100%)] blur-[2px]" />
                                    <div className="absolute left-1/2 top-[58%] h-28 w-44 -translate-x-1/2 rounded-[44%_44%_36%_36%] border border-[rgba(144,104,58,0.2)] bg-[linear-gradient(180deg,rgba(118,82,46,0.86)_0%,rgba(93,61,31,0.96)_100%)] shadow-[0_18px_34px_rgba(95,66,36,0.16)]" />
                                    <div className="absolute left-1/2 top-[49%] h-12 w-24 -translate-x-1/2 rounded-[50%] border border-[rgba(246,223,185,0.48)] bg-[radial-gradient(circle,rgba(255,236,203,0.96)_0%,rgba(232,183,110,0.72)_55%,rgba(179,117,58,0.32)_100%)] blur-[0.5px]" />
                                    <div className="relative z-10 max-w-[520px] text-center">
                                        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-3)]">Golden Crucible</div>
                                        <h3 className="mh-display mt-4 text-[24px] font-semibold text-[var(--ink-1)]">中区先留白</h3>
                                        <p className="mt-4 text-[13px] leading-7 text-[var(--ink-2)]">
                                            右侧先抛出你真正想问的那一句。等 Socrates 咬住命题，中区才开始长出第一轮问题、参考和结构。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                        <div className="mt-4 grid gap-3">
                            {clarificationCards.map((card, index) => (
                                <section id={card.id} key={card.id} className="rounded-[20px] border border-[var(--line-soft)] bg-[#fffdf9] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">问题 {index + 1}</div>
                                            <h3 className="mt-2 text-[15px] font-semibold text-[var(--ink-1)]">{card.prompt}</h3>
                                            <p className="mt-1.5 text-[12px] leading-6 text-[var(--ink-2)]">{card.helper}</p>
                                        </div>
                                        <span className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] ${card.isSaved
                                            ? 'bg-[rgba(102,165,117,0.14)] text-emerald-700'
                                            : 'bg-[var(--surface-1)] text-[var(--ink-3)]'
                                            }`}>
                                            {card.isSaved ? '已保存' : '未保存'}
                                        </span>
                                    </div>

                                    <textarea
                                        value={card.answer}
                                        onChange={(event) => handleCardChange(card.id, event.target.value)}
                                        placeholder="在这里写长篇反馈。右侧 chat 只负责穿针引线，不再承担长文本输入。"
                                        className="mt-4 h-40 max-h-72 w-full resize-none overflow-y-auto rounded-[18px] border border-[var(--line-soft)] bg-[rgba(255,255,255,0.82)] px-4 py-3 text-[13px] leading-7 text-[var(--ink-1)] outline-none transition placeholder:text-[var(--ink-3)] focus:border-[var(--line-strong)]"
                                    />

                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="text-[11px] text-[var(--ink-3)]">
                                            {card.answer.trim() ? `已输入 ${card.answer.trim().length} 字` : '尚未填写'}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleSaveCard(card.id)}
                                            disabled={!card.answer.trim()}
                                            className={`rounded-full px-3.5 py-1.5 text-[12px] transition ${card.answer.trim()
                                                ? 'border border-[var(--line-soft)] bg-[var(--surface-1)] text-[var(--ink-1)] hover:border-[var(--line-strong)]'
                                                : 'bg-[var(--surface-2)] text-[var(--ink-3)]'
                                                }`}
                                        >
                                            保存
                                        </button>
                                    </div>
                                </section>
                            ))}
                        </div>
                        )}
                        </section>

                        <section className="rounded-[24px] border border-[var(--line-soft)] bg-[var(--surface-0)] p-4 shadow-[0_14px_32px_rgba(131,103,70,0.04)]">
                        {!activeAsset ? (
                            <div className="rounded-[20px] border border-dashed border-[var(--line-soft)] bg-[#fffdf9] px-4 py-8 text-center text-[13px] leading-7 text-[var(--ink-3)]">
                                暂无中区资产。等右侧对话里真的长出参考、金句或结构后，这里才会刷新。
                            </div>
                        ) : (
                        <>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="mh-display text-[19px] font-semibold text-[var(--ink-1)]">{activeAsset.title}</h2>
                            </div>
                            <div className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-1)] px-2.5 py-1 text-[10px] text-[var(--ink-2)]">
                                {ASSET_META[activeAsset.type].label}
                            </div>
                        </div>

                        {activeAsset.type === 'reference' && referenceSections ? (
                            <div className="mt-4 grid max-h-[calc(100vh-420px)] gap-3 overflow-y-auto rounded-[20px] border border-[var(--line-soft)] bg-[#fffdf9] p-4">
                                <section className="rounded-[18px] border border-[rgba(146,118,82,0.12)] bg-[rgba(255,250,244,0.72)] p-4">
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">议题概述</div>
                                    <div className="mt-2 text-[14px] leading-7 text-[var(--ink-1)]">{referenceSections.lead}</div>
                                </section>

                                <section className="rounded-[18px] border border-[rgba(146,118,82,0.12)] bg-white/75 p-4">
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">关键澄清</div>
                                    <div className="mt-3 space-y-3">
                                        {referenceSections.bullets.length > 0 ? referenceSections.bullets.map((bullet, index) => (
                                            <div key={`${activeAsset.id}_bullet_${index}`} className="flex gap-3">
                                                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent)]"></div>
                                                <div className="text-[13px] leading-7 text-[var(--ink-1)]">{bullet}</div>
                                            </div>
                                        )) : (
                                            <div className="text-[13px] leading-7 text-[var(--ink-2)]">这一轮还在形成更明确的澄清要点。</div>
                                        )}
                                    </div>
                                </section>

                                <section className="rounded-[18px] border border-[rgba(146,118,82,0.12)] bg-white/75 p-4">
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">原始补充</div>
                                    <div className="mt-3 space-y-3 text-[12px] leading-7 text-[var(--ink-2)]">
                                        {referenceSections.notes.length > 0 ? referenceSections.notes.map((note, index) => (
                                            <p key={`${activeAsset.id}_note_${index}`}>{note}</p>
                                        )) : (
                                            <p>{formatAssetContent(activeAsset.content)}</p>
                                        )}
                                    </div>
                                </section>
                            </div>
                        ) : (
                            <div className="mt-4 max-h-[calc(100vh-420px)] overflow-y-auto rounded-[20px] border border-[var(--line-soft)] bg-[#fffdf9] p-4">
                                <div className="whitespace-pre-wrap text-[12px] leading-7 text-[var(--ink-1)]">
                                    {formatAssetContent(activeAsset.content)}
                                </div>
                            </div>
                        )}
                        </>
                        )}
                        </section>
                    </main>

                    {mainScrollIndicator.visible && (
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-3 justify-center">
                            <div className="my-1 w-[6px] rounded-full bg-[rgba(174,149,115,0.18)]">
                                <div
                                    className="rounded-full bg-[rgba(142,99,55,0.72)] shadow-[0_4px_10px_rgba(112,78,43,0.16)]"
                                    style={{
                                        height: `${mainScrollIndicator.height}px`,
                                        transform: `translateY(${mainScrollIndicator.offset}px)`,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
