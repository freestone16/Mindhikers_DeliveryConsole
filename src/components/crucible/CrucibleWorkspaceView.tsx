import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenText, Boxes, BrainCircuit, Quote, RotateCcw, Sparkles } from 'lucide-react';
import type { HostRoutedAsset } from '../../types';
import { buildApiUrl } from '../../config/runtime';
import { clearCrucibleSnapshot, readCrucibleSnapshot, writeCrucibleSnapshot } from './storage';
import type { CanvasAsset, CrucibleDialogue, CrucibleEngineMode, CrucibleTurnResponse, RoundAnchor } from './types';
import { CRUCIBLE_DEFAULT_PAIR } from './soulRegistry';

const ASSET_META = {
    ascii: { icon: Boxes, label: '结构' },
    mindmap: { icon: BrainCircuit, label: '脑图' },
    quote: { icon: Quote, label: '金句' },
    remotion: { icon: Sparkles, label: '影像' },
    reference: { icon: BookOpenText, label: '参考' },
};

interface CrucibleWorkspaceProps {
    projectId: string;
    scriptPath: string;
    incomingAssets?: HostRoutedAsset[];
    topicTitle?: string;
    seedPrompt?: string;
    seedPromptVersion?: number;
    onResetWorkspace?: () => void;
    onRoundGenerated?: (payload: {
        speaker: string;
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

const toRoundAnchor = (asset: CanvasAsset): RoundAnchor => ({
    id: `anchor_${asset.id}`,
    title: asset.title,
    summary: asset.summary || '这一轮的黑板焦点',
    content: asset.content,
});

const toGeneratedCanvasAsset = (
    item: { type?: 'reference' | 'quote' | 'asset'; title?: string; summary?: string; content?: string },
    roundIndex: number,
    index: number
): CanvasAsset => ({
    id: `turn_${roundIndex}_${index}_${(item.type || 'reference')}`,
    type: item.type === 'quote' ? 'quote' : item.type === 'asset' ? 'mindmap' : 'reference',
    title: item.title || `中屏内容 ${index + 1}`,
    subtitle: '',
    content: item.content || item.summary || '',
    summary: item.summary,
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

const truncateText = (value: string, maxLength: number) => (
    value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
);

const buildReferenceSections = (asset: CanvasAsset) => {
    const sentences = toReadableSentences(asset.content);
    const lead = truncateText(asset.summary || sentences[0] || '当前这轮内容正在围绕一个更清晰的问题定义收束。', 48);
    const bulletsSource = sentences.length > 0 ? sentences.slice(0, 3) : [];
    const bullets = bulletsSource.map((sentence) => truncateText(sentence.replace(/^•\s*/, ''), 36));

    return {
        lead,
        bullets,
    };
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

const shortenAnswer = (value: string, fallback: string, maxLength = 28) => {
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (!normalized) {
        return fallback;
    }
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const pickAnchorText = (anchors: RoundAnchor[], index: number, fallback: string) => {
    const anchor = anchors[index];
    if (!anchor) {
        return fallback;
    }

    const fromContent = shortenAnswer(anchor.content || '', '', 28);
    if (fromContent) {
        return fromContent;
    }

    const fromTitle = anchor.title.trim().replace(/\s+/g, ' ');
    if (!fromTitle) {
        return fallback;
    }
    return fromTitle.length > 28 ? `${fromTitle.slice(0, 28)}...` : fromTitle;
};

const buildFallbackPresentables = (
    topicTitle: string | undefined,
    previousAnchors: RoundAnchor[],
    nextRoundIndex: number
): CanvasAsset[] => {
    const promptTopic = normalizePromptTopic(topicTitle);
    const coreClaim = pickAnchorText(previousAnchors, 0, '你刚才最想保住的那个判断');
    const counterForce = pickAnchorText(previousAnchors, 1, '那股最难顶住的反力');
    const takeaway = pickAnchorText(previousAnchors, 2, '读者最终该带走的那个新判断');

    return [
        {
            id: `fallback_${nextRoundIndex}_1`,
            type: 'reference',
            title: `具体场景：${coreClaim}`,
            subtitle: '',
            summary: `继续围绕“${promptTopic}”往下走，但先别上理论。`,
            content: `如果你要用一个具体场景说明“${coreClaim}”，先拿一个你真正见过、感受过、能说清的例子。`,
        },
        {
            id: `fallback_${nextRoundIndex}_2`,
            type: 'reference',
            title: '最强阻力',
            subtitle: '',
            summary: '先写那个最让你自己也会犹豫一下的反驳。',
            content: `如果有人不同意你，他最可能会抓住“${counterForce}”里的哪一点来反驳你？`,
        },
        {
            id: `fallback_${nextRoundIndex}_3`,
            type: 'reference',
            title: '读者困惑',
            subtitle: '',
            summary: '把目标读者想象成一个真实的人，别写抽象判断升级。',
            content: `如果你希望读者读完后得到“${takeaway}”，那这篇东西最想帮他解决的具体困惑到底是什么？`,
        },
    ];
};

export const CrucibleWorkspace = ({
    projectId,
    scriptPath,
    incomingAssets = [],
    topicTitle,
    seedPrompt,
    seedPromptVersion = 0,
    onResetWorkspace,
    onRoundGenerated,
}: CrucibleWorkspaceProps) => {
    const snapshot = useMemo(() => readCrucibleSnapshot(), []);
    const [presentables, setPresentables] = useState<CanvasAsset[]>(() => snapshot?.presentables?.length ? snapshot.presentables : []);
    const [activePresentableId, setActivePresentableId] = useState<string>(() => snapshot?.activePresentableId || '');
    const [openingPrompt, setOpeningPrompt] = useState<string>(() => snapshot?.openingPrompt || '');
    const [roundAnchors, setRoundAnchors] = useState<RoundAnchor[]>(() => (
        snapshot?.roundAnchors?.length ? snapshot.roundAnchors : []
    ));
    const [roundIndex, setRoundIndex] = useState<number>(() => snapshot?.roundIndex || 1);
    const [isThinking, setIsThinking] = useState<boolean>(() => snapshot?.isThinking || false);
    const [questionSource, setQuestionSource] = useState<'static' | 'socrates' | 'fallback'>(() => snapshot?.questionSource || 'static');
    const [engineMode, setEngineMode] = useState<CrucibleEngineMode>(() => snapshot?.engineMode || 'socratic_refinement');
    const [lastDialogue, setLastDialogue] = useState<CrucibleDialogue | null>(() => snapshot?.lastDialogue || null);
    const routedIdsRef = useRef<Set<string>>(new Set());
    const previousTopicRef = useRef<string>(normalizeTopic(snapshot?.topicTitle || topicTitle));
    const previousSeedVersionRef = useRef<number>(seedPromptVersion);
    const mainScrollRef = useRef<HTMLElement | null>(null);
    const thinkingTimerRef = useRef<number | null>(null);
    const requestSeqRef = useRef(0);
    const [mainScrollIndicator, setMainScrollIndicator] = useState({ visible: false, height: 0, offset: 0 });

    const activePresentable = useMemo(
        () => presentables.find((asset) => asset.id === activePresentableId) ?? presentables[0] ?? null,
        [activePresentableId, presentables]
    );
    const referenceSections = useMemo(
        () => activePresentable?.type === 'reference' ? buildReferenceSections(activePresentable) : null,
        [activePresentable]
    );

    useEffect(() => {
        writeCrucibleSnapshot({
            messages: [],
            presentables,
            activePresentableId: activePresentableId || undefined,
            topicTitle,
            openingPrompt: openingPrompt || undefined,
            roundAnchors,
            lastDialogue: lastDialogue || undefined,
            roundIndex,
            isThinking,
            questionSource,
            engineMode,
        });
    }, [activePresentableId, presentables, roundAnchors, lastDialogue, openingPrompt, topicTitle, roundIndex, isThinking, questionSource, engineMode]);

    useEffect(() => {
        const normalizedTopic = normalizeTopic(topicTitle);
        if (normalizedTopic === previousTopicRef.current) {
            return;
        }

        previousTopicRef.current = normalizedTopic;
        setPresentables([]);
        setActivePresentableId('');
        setOpeningPrompt('');
        setRoundAnchors([]);
        setRoundIndex(1);
        setIsThinking(false);
        setQuestionSource('static');
        setEngineMode('socratic_refinement');
        setLastDialogue(null);
    }, [topicTitle]);

    useEffect(() => () => {
        if (thinkingTimerRef.current) {
            window.clearTimeout(thinkingTimerRef.current);
        }
    }, []);

    const requestCrucibleTurn = useCallback(async (
        nextRoundIndex: number,
        previousAnchors: RoundAnchor[],
        latestUserReply: string,
        openingSeedPrompt: string
    ) => {
        const requestId = ++requestSeqRef.current;
        setEngineMode(nextRoundIndex === 1 && previousAnchors.length === 0 ? 'roundtable_discovery' : 'socratic_refinement');
        setIsThinking(true);
        mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

        try {
            const response = await fetch(buildApiUrl('/api/crucible/turn'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    scriptPath,
                    topicTitle: normalizeTopic(topicTitle),
                    roundIndex: nextRoundIndex,
                    previousCards: previousAnchors.map((anchor) => ({
                        prompt: anchor.title,
                        answer: anchor.content,
                    })),
                    seedPrompt: openingSeedPrompt,
                    latestUserReply,
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || '苏格拉底问题生成失败');
            }

            const data = await response.json() as CrucibleTurnResponse;
            if (requestId !== requestSeqRef.current) {
                return;
            }

            const generatedPresentables = Array.isArray(data.presentables) && data.presentables.length > 0
                ? data.presentables.map((item, index) => toGeneratedCanvasAsset(item, nextRoundIndex, index))
                : [];
            const generatedAnchors = generatedPresentables.map(toRoundAnchor);
            const dialogue = {
                speaker: data.dialogue?.speaker || CRUCIBLE_DEFAULT_PAIR.challenger,
                utterance: data.dialogue?.utterance || '我先顺着你刚才这句继续追一个更关键的问题。',
                focus: data.dialogue?.focus || '继续贴着你刚才那句把焦点说清。',
            };

            setRoundAnchors(generatedAnchors);
            setPresentables(generatedPresentables);
            setActivePresentableId(generatedPresentables[0]?.id || '');
            setRoundIndex(nextRoundIndex);
            setIsThinking(false);
            setQuestionSource(data.source === 'socrates' ? 'socrates' : 'fallback');
            setEngineMode(data.engineMode === 'roundtable_discovery' ? 'roundtable_discovery' : 'socratic_refinement');
            setLastDialogue(dialogue);
            onRoundGenerated?.({
                speaker: dialogue.speaker,
                reflection: dialogue.utterance,
                source: data.source === 'socrates' ? 'socrates' : 'fallback',
                roundIndex: nextRoundIndex,
            });
            mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error: any) {
            if (requestId !== requestSeqRef.current) {
                return;
            }

            const fallbackPresentables = buildFallbackPresentables(topicTitle, previousAnchors, nextRoundIndex);
            setRoundAnchors(fallbackPresentables.map(toRoundAnchor));
            setPresentables(fallbackPresentables);
            setActivePresentableId(fallbackPresentables[0]?.id || '');
            setRoundIndex(nextRoundIndex);
            setIsThinking(false);
            setQuestionSource('fallback');
            setEngineMode('socratic_refinement');
            setLastDialogue({
                speaker: nextRoundIndex % 2 === 0 ? CRUCIBLE_DEFAULT_PAIR.synthesizer : CRUCIBLE_DEFAULT_PAIR.challenger,
                utterance: nextRoundIndex === 1
                    ? '老张：先别把题说大。我先顺着你刚才那句往下追一个最关键的问题，你就接着在右侧回答我。'
                    : '我先顺着你刚才这句把下一轮追问接上。主线还在右侧，你继续往下说。',
                focus: '先把当前最值得继续追的一点钉住。',
            });
            onRoundGenerated?.({
                speaker: nextRoundIndex % 2 === 0 ? CRUCIBLE_DEFAULT_PAIR.synthesizer : CRUCIBLE_DEFAULT_PAIR.challenger,
                reflection: nextRoundIndex === 1
                    ? '老张：先别把题说大。我先顺着你刚才那句往下追一个最关键的问题，你就接着在右侧回答我。'
                    : '我先顺着你刚才这句把下一轮追问接上。主线还在右侧，你继续往下说。',
                source: 'fallback',
                roundIndex: nextRoundIndex,
            });
        }
    }, [projectId, scriptPath, topicTitle, onRoundGenerated]);

    useEffect(() => {
        if (!seedPrompt?.trim()) {
            return;
        }
        if (isThinking) {
            return;
        }
        if (seedPromptVersion === previousSeedVersionRef.current) {
            return;
        }
        previousSeedVersionRef.current = seedPromptVersion;
        const normalizedSeed = seedPrompt.trim();
        const openingSeedPrompt = openingPrompt || normalizedSeed;
        if (!openingPrompt) {
            setOpeningPrompt(normalizedSeed);
        }

        const nextRoundIndex = roundAnchors.length === 0 ? 1 : roundIndex + 1;
        void requestCrucibleTurn(
            nextRoundIndex,
            roundAnchors,
            normalizedSeed,
            openingSeedPrompt
        );
    }, [seedPrompt, seedPromptVersion, roundIndex, roundAnchors, isThinking, requestCrucibleTurn, openingPrompt]);

    useEffect(() => {
        if (incomingAssets.length === 0) {
            return;
        }
        if (openingPrompt || questionSource !== 'static' || roundAnchors.length > 0 || presentables.length > 0) {
            return;
        }

        const freshAssets = incomingAssets.filter((asset) => !routedIdsRef.current.has(asset.id));
        if (freshAssets.length === 0) {
            return;
        }

        freshAssets.forEach((asset) => routedIdsRef.current.add(asset.id));

        setPresentables((prev) => {
            const nextBySlot = new Map<string, CanvasAsset>();
            for (const asset of prev) {
                nextBySlot.set(asset.type, asset);
            }
            for (const asset of freshAssets.map(toCanvasAsset)) {
                nextBySlot.set(asset.type, asset);
            }
            return Array.from(nextBySlot.values()).slice(0, 12);
        });
        setActivePresentableId(freshAssets[0].id);
    }, [incomingAssets, openingPrompt, questionSource, roundAnchors.length, presentables.length]);

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
    }, [activePresentableId, presentables, roundAnchors, topicTitle]);

    const handleResetWorkspace = () => {
        if (thinkingTimerRef.current) {
            window.clearTimeout(thinkingTimerRef.current);
        }
        clearCrucibleSnapshot();
        routedIdsRef.current.clear();
        requestSeqRef.current += 1;
        setPresentables([]);
        setActivePresentableId('');
        setOpeningPrompt('');
        setRoundAnchors([]);
        setRoundIndex(1);
        setIsThinking(false);
        setQuestionSource('static');
        setEngineMode('socratic_refinement');
        setLastDialogue(null);
        onResetWorkspace?.();
    };

    return (
        <div className="flex h-full min-h-0 flex-1 overflow-hidden px-3 py-3 md:px-4 md:py-3">
            <div className="mx-auto grid h-full min-h-0 max-w-[1500px] flex-1 gap-3 xl:grid-cols-[172px_minmax(0,1fr)]">
                <aside className="order-2 h-full overflow-hidden rounded-[24px] border border-[var(--line-soft)] bg-[rgba(255,251,245,0.92)] p-2.5 shadow-[0_14px_32px_rgba(131,103,70,0.04)] xl:order-1">
                    <div className="mb-2 px-1">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-3)]">结晶目录</div>
                    </div>
                    <div className="max-h-full space-y-1.5 overflow-y-auto pr-1">
                        {presentables.length === 0 ? (
                            <div className="rounded-[18px] border border-dashed border-[var(--line-soft)] bg-[rgba(255,252,248,0.86)] px-3 py-4 text-[12px] leading-6 text-[var(--ink-3)]">
                                先在右侧抛出命题。等老张或老卢真的把焦点挂上黑板时，这里才会亮起来。
                            </div>
                        ) : presentables.map((asset) => {
                            const meta = ASSET_META[asset.type];
                            const Icon = meta.icon;
                            const isActive = asset.id === activePresentableId;

                            return (
                                <button
                                    key={asset.id}
                                    type="button"
                                    onClick={() => setActivePresentableId(asset.id)}
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
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-3)]">议题锁定阶段 · 第 {roundIndex} 轮</div>
                                <div className="mh-display mt-2 text-[24px] font-semibold tracking-tight text-[var(--ink-1)] md:text-[26px]">{normalizeTopic(topicTitle)}</div>
                            </div>
                            <button
                                type="button"
                                onClick={handleResetWorkspace}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-soft)] bg-[var(--surface-1)] px-3 py-1.5 text-[12px] text-[var(--ink-2)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink-1)]"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                重置
                            </button>
                        </div>
                        {isThinking && (
                            <div className="mt-4 rounded-[18px] border border-[rgba(166,117,64,0.14)] bg-[rgba(255,248,238,0.7)] px-4 py-3">
                                <div className="text-[12px] leading-6 text-[var(--ink-2)]">
                                    {engineMode === 'roundtable_discovery'
                                        ? '正在找这一轮最值得继续追的那根刺。'
                                        : '正在继续收紧这一轮焦点。'}
                                </div>
                            </div>
                        )}
                        </section>

                        <section className="rounded-[24px] border border-[var(--line-soft)] bg-[var(--surface-0)] p-4 shadow-[0_14px_32px_rgba(131,103,70,0.04)]">
                        {!activePresentable ? (
                            <div className="rounded-[20px] border border-dashed border-[var(--line-soft)] bg-[#fffdf9] px-4 py-8 text-center text-[13px] leading-7 text-[var(--ink-3)]">
                                暂无中区资产。等右侧对话里真的长出参考、金句或结构后，这里才会刷新。
                            </div>
                        ) : (
                        <>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-3)]">黑板焦点</div>
                                <h2 className="mh-display mt-2 text-[22px] font-semibold text-[var(--ink-1)]">{activePresentable.title}</h2>
                            </div>
                        </div>

                        {activePresentable.type === 'reference' && referenceSections ? (
                            <article className="mt-4 max-h-[calc(100vh-420px)] overflow-y-auto rounded-[22px] border border-[rgba(146,118,82,0.12)] bg-[linear-gradient(180deg,#fffdf9_0%,#fbf4e8_100%)] px-5 py-5">
                                {referenceSections.lead && (
                                    <div className="text-[13px] leading-6 text-[var(--ink-2)]">{referenceSections.lead}</div>
                                )}

                                {referenceSections.bullets.length > 0 && (
                                    <div className={`${referenceSections.lead ? 'mt-4' : 'mt-0'} space-y-3 ${referenceSections.lead ? 'border-t border-[rgba(146,118,82,0.12)] pt-4' : ''}`}>
                                        {referenceSections.bullets.map((bullet, index) => (
                                            <div key={`${activePresentable.id}_bullet_${index}`} className="flex gap-3">
                                                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent)]"></div>
                                                <div className="text-[13px] leading-7 text-[var(--ink-1)]">{bullet}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>
                        ) : (
                            <div className="mt-4 max-h-[calc(100vh-420px)] overflow-y-auto rounded-[20px] border border-[var(--line-soft)] bg-[#fffdf9] p-4">
                                <div className="whitespace-pre-wrap text-[12px] leading-7 text-[var(--ink-1)]">
                                    {formatAssetContent(activePresentable.content)}
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
