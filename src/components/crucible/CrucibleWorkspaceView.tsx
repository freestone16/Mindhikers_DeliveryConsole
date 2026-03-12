import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenText, Boxes, BrainCircuit, ChevronRight, Quote, RotateCcw, Sparkles } from 'lucide-react';
import type { HostRoutedAsset } from '../../types';
import { buildApiUrl } from '../../config/runtime';
import { clearCrucibleSnapshot, readCrucibleSnapshot, writeCrucibleSnapshot } from './storage';
import type { CanvasAsset, CrucibleDialogue, CrucibleEngineMode, RoundAnchor } from './types';
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
    const lead = truncateText(asset.summary || sentences[0] || '当前这轮内容正在围绕一个更清晰的问题定义收束。', 68);
    const bulletsSource = sentences.length > 1 ? sentences.slice(1, 4) : sentences.slice(0, 3);
    const bullets = bulletsSource.map((sentence) => truncateText(sentence, 54));
    const note = sentences.slice(4).join(' ');

    return {
        lead,
        bullets,
        note: note ? truncateText(note, 110) : '',
    };
};

const getDialogueSnippet = (dialogue: CrucibleDialogue | null) => {
    if (!dialogue?.utterance) {
        return '';
    }
    return truncateText(dialogue.utterance.replace(/^[^：]+[:：]\s*/, '').trim(), 120);
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

const getStageHeadline = (topicTitle?: string) => (
    normalizeTopic(topicTitle) === '标题待定' ? '议题锁定中' : normalizeTopic(topicTitle)
);

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
    const [submitNotice, setSubmitNotice] = useState<{ tone: 'warning' | 'success'; message: string } | null>(null);
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
        setSubmitNotice(null);
    }, [topicTitle]);

    useEffect(() => () => {
        if (thinkingTimerRef.current) {
            window.clearTimeout(thinkingTimerRef.current);
        }
    }, []);

    const requestCrucibleTurn = useCallback(async (
        nextRoundIndex: number,
        previousAnchors: RoundAnchor[],
        loadingMessage: string,
        latestUserReply: string,
        openingSeedPrompt: string
    ) => {
        const requestId = ++requestSeqRef.current;
        setEngineMode(nextRoundIndex === 1 && previousAnchors.length === 0 ? 'roundtable_discovery' : 'socratic_refinement');
        setIsThinking(true);
        setSubmitNotice({ tone: 'success', message: loadingMessage });
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

            const data = await response.json() as {
                presentables?: Array<{ type?: 'reference' | 'quote' | 'asset'; title?: string; summary?: string; content?: string }>;
                dialogue?: { speaker?: string; utterance?: string; focus?: string };
                source?: 'socrates' | 'fallback';
                engineMode?: CrucibleEngineMode;
                phase?: string;
                warning?: string;
                searchRequested?: boolean;
                searchConnected?: boolean;
            };
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
            const baseMessage = data.source === 'socrates'
                ? (nextRoundIndex === 1
                    ? '第一轮黑板焦点已经挂上去了。主线还在右侧，顺着那边继续聊就行。'
                    : `第 ${nextRoundIndex} 轮黑板焦点已经更新。你继续在右侧接着说，中屏只负责挂板。`)
                : '这轮先用临时追问把主线接住了。你继续在右侧往下说，我会把焦点整理到黑板。';
            const searchMessage = data.searchRequested && !data.searchConnected
                ? ' 你刚才提到想先查一下现状，但这一刀还没真正接上外部搜索，所以这轮先只顺着你刚才的话继续追。'
                : '';

            setSubmitNotice({
                tone: data.searchRequested && !data.searchConnected ? 'warning' : 'success',
                message: `${baseMessage}${searchMessage}`,
            });
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
            setSubmitNotice({
                tone: 'warning',
                message: '这轮没有顺利取回 Socrates 结果，我先用临时追问把主线接住了。你继续在右侧聊，不会断。',
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
        const loadingMessage = nextRoundIndex === 1
            ? '我先替你把台下真正打架的几股力量挑出来，马上把第一轮黑板焦点挂上去。'
            : '我收到了你刚才这句，正在顺着它继续往下追。中屏只会同步这一轮焦点。';

        void requestCrucibleTurn(
            nextRoundIndex,
            roundAnchors,
            loadingMessage,
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
        setSubmitNotice(null);
        onResetWorkspace?.();
    };

    const hasWorkspaceStarted = roundAnchors.length > 0 || presentables.length > 0 || isThinking;
    const showEmptyState = !hasWorkspaceStarted;
    const engineModeLabel = engineMode === 'roundtable_discovery' ? '圆桌寻刺' : '苏格拉底收敛';
    const stageStatusLabel = showEmptyState ? '双阶段引擎待点火' : `当前运行：${engineModeLabel}`;
    const thinkingHeadline = engineMode === 'roundtable_discovery'
        ? '后台圆桌正在替你找真正值得继续打的那根刺'
        : '老张 / 老卢 正在顺着上一轮回答继续收紧';
    const dialogueSnippet = getDialogueSnippet(lastDialogue);

    return (
        <div className="flex h-full min-h-0 flex-1 overflow-hidden px-3 py-3 md:px-4 md:py-3">
            <div className="mx-auto grid h-full min-h-0 max-w-[1500px] flex-1 gap-3 xl:grid-cols-[172px_minmax(0,1fr)]">
                <aside className="order-2 h-full overflow-hidden rounded-[24px] border border-[var(--line-soft)] bg-[rgba(255,251,245,0.92)] p-2.5 shadow-[0_14px_32px_rgba(131,103,70,0.04)] xl:order-1">
                    <div className="mb-2 px-1">
                        <div className="mh-display text-[16px] font-semibold text-[var(--ink-1)]">结晶目录</div>
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
                                        双阶段认知引擎
                                    </div>
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
                                <h2 className="mh-display mt-2 text-[20px] font-semibold text-[var(--ink-1)]">{getStageHeadline(topicTitle)}</h2>
                                <p className="mt-2 text-[12px] leading-6 text-[var(--ink-2)]">
                                    {showEmptyState
                                        ? '先在右侧抛出一句命题。当前已上线的是“苏格拉底收敛”主链，等右侧对话真正咬住焦点，中屏才开始亮。'
                                        : '当前还在锁议题，不是在产标题。右侧对话是主线，中屏只把这一轮真正值得挂板的焦点、结构和参考呈出来。'}
                                </p>
                                <p className="mt-1 text-[11px] leading-5 text-[var(--ink-3)]">
                                    {normalizeTopic(topicTitle) === '标题待定'
                                        ? '本阶段先不命名题目，先把“到底在问什么”说清。'
                                        : '这个标题只是暂存标签，本轮真实目标仍然是把议题边界锁清。'}
                                </p>
                            </div>
                            <div className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] text-[var(--ink-2)]">
                                {isThinking ? '正在顺着右侧对话继续追问' : stageStatusLabel}
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
                                <div className="mt-2 text-[15px] font-semibold text-[var(--ink-1)]">{thinkingHeadline}</div>
                                <div className="mt-2 text-[12px] leading-6 text-[var(--ink-2)]">
                                    {engineMode === 'roundtable_discovery'
                                        ? '这一步先不急着给答案，而是先把几股真正打架的力量挑出来，再把最该继续追的刺挂上黑板。'
                                        : '这一轮的追问正在继续收紧，中屏会只同步当前最该盯住的那几个焦点。'}
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
                                        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-3)]">Golden Crucible Screen</div>
                                        <h3 className="mh-display mt-4 text-[24px] font-semibold text-[var(--ink-1)]">中屏先留白</h3>
                                        <p className="mt-4 text-[13px] leading-7 text-[var(--ink-2)]">
                                            主交流一直在右侧。等老张或老卢在右侧提示你看中屏时，这里才会亮出本轮参考、结构和追问。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-[18px] border border-[rgba(166,117,64,0.12)] bg-[rgba(255,250,244,0.72)] px-4 py-2.5 text-[12px] leading-6 text-[var(--ink-2)]">
                                中屏现在只呈现这一轮真正值得挂上黑板的内容，不再复制右侧整段原话。左侧目录只做索引，不主导回合。
                            </div>
                        )}

                        {lastDialogue && (
                            <div className="mt-3 rounded-[18px] border border-[rgba(146,118,82,0.12)] bg-[rgba(255,253,249,0.86)] px-4 py-3">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">当前咬口</div>
                                <div className="mt-2 text-[13px] leading-7 text-[var(--ink-1)]">{lastDialogue.focus}</div>
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
                                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">Blackboard Focus</div>
                                <h2 className="mh-display mt-2 text-[19px] font-semibold text-[var(--ink-1)]">{activePresentable.title}</h2>
                                {activePresentable.summary && (
                                    <p className="mt-2 max-w-3xl text-[12px] leading-6 text-[var(--ink-2)]">{activePresentable.summary}</p>
                                )}
                            </div>
                            <div className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-1)] px-2.5 py-1 text-[10px] text-[var(--ink-2)]">
                                {ASSET_META[activePresentable.type].label}
                            </div>
                        </div>

                        {dialogueSnippet && (
                            <div className="mt-4 rounded-[18px] border border-[rgba(166,117,64,0.12)] bg-[rgba(255,249,241,0.78)] px-4 py-3">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">对应右侧这句</div>
                                <div className="mt-2 text-[12px] leading-6 text-[var(--ink-1)]">{dialogueSnippet}</div>
                            </div>
                        )}

                        {activePresentable.type === 'reference' && referenceSections ? (
                            <article className="mt-4 max-h-[calc(100vh-420px)] overflow-y-auto rounded-[22px] border border-[rgba(146,118,82,0.12)] bg-[linear-gradient(180deg,#fffdf9_0%,#fbf4e8_100%)] px-5 py-5">
                                <div className="text-[15px] leading-8 text-[var(--ink-1)]">{referenceSections.lead}</div>

                                {referenceSections.bullets.length > 0 && (
                                    <div className="mt-5 space-y-3 border-t border-[rgba(146,118,82,0.12)] pt-4">
                                        {referenceSections.bullets.map((bullet, index) => (
                                            <div key={`${activePresentable.id}_bullet_${index}`} className="flex gap-3">
                                                <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent)]"></div>
                                                <div className="text-[13px] leading-7 text-[var(--ink-1)]">{bullet}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {referenceSections.note ? (
                                    <div className="mt-5 border-t border-[rgba(146,118,82,0.12)] pt-4 text-[12px] leading-7 text-[var(--ink-2)]">
                                        <p>{referenceSections.note}</p>
                                    </div>
                                ) : null}
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
