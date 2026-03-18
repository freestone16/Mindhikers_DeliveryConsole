import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenText, Boxes, BrainCircuit, Quote, Sparkles } from 'lucide-react';
import type { HostRoutedAsset } from '../../types';
import { buildApiUrl } from '../../config/runtime';
import { clearCrucibleSnapshot, readCrucibleSnapshot, writeCrucibleSnapshot } from './storage';
import type {
    CanvasAsset,
    CrucibleDialogue,
    CrucibleEngineMode,
    CrucibleRemotionPreviewResponse,
    CrucibleTurnResponse,
    RoundAnchor,
} from './types';
import { CRUCIBLE_DEFAULT_PAIR } from './soulRegistry';

const ASSET_META = {
    ascii: { icon: Boxes, label: '结构' },
    mindmap: { icon: BrainCircuit, label: '脑图' },
    quote: { icon: Quote, label: '金句' },
    remotion: { icon: Sparkles, label: '影像' },
    reference: { icon: BookOpenText, label: '参考' },
};

const PREVIEW_RENDER_VERSION = 'structure-v2';

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
    onBlackboardStateChange?: (payload: { hasContent: boolean }) => void;
    onTurnSettled?: () => void;
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

const normalizeComparableText = (value: string) => value
    .replace(/\s+/g, '')
    .replace(/[，。！？；、“”"'`()（）【】\[\]\-—,!.?:;：]/g, '')
    .trim();

const truncateText = (value: string, maxLength: number) => (
    value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
);

const buildReferenceSections = (asset: CanvasAsset) => {
    const summary = asset.summary?.trim() || '';
    const summaryKey = normalizeComparableText(summary);
    const uniqueSentences = toReadableSentences(asset.content)
        .map((sentence) => sentence.replace(/^•\s*/, '').trim())
        .filter((sentence, index, array) => {
            const currentKey = normalizeComparableText(sentence);
            if (!currentKey) {
                return false;
            }
            return array.findIndex((item) => normalizeComparableText(item) === currentKey) === index;
        });

    const filteredSentences = uniqueSentences.filter((sentence) => normalizeComparableText(sentence) !== summaryKey);
    const lead = summary || filteredSentences[0] || '当前这轮内容正在围绕一个更清晰的问题定义收束。';
    const bullets = (summary ? filteredSentences : filteredSentences.slice(1)).slice(0, 3);

    return {
        lead,
        bullets,
    };
};

const buildPreviewBullets = (asset: CanvasAsset) => {
    if (asset.type === 'reference') {
        const { lead, bullets } = buildReferenceSections(asset);
        return [lead, ...bullets].filter((item) => item && item.trim().length > 0).slice(0, 3);
    }

    return toReadableSentences(asset.content)
        .slice(0, 3)
        .map((sentence) => truncateText(sentence.replace(/^•\s*/, ''), 30));
};

const buildPreviewCaption = (asset: CanvasAsset, referenceSections: { lead: string; bullets: string[] } | null) => {
    const summary = asset.summary?.trim();
    if (summary) {
        return truncateText(summary, 88);
    }

    if (referenceSections?.lead) {
        return truncateText(referenceSections.lead, 88);
    }

    return '这张参考图只负责把这一轮的冲突场挂出来，完整板书不再在这里重复展开。';
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
    onBlackboardStateChange,
    onTurnSettled,
}: CrucibleWorkspaceProps) => {
    const snapshot = useMemo(() => readCrucibleSnapshot(), []);
    const [presentables, setPresentables] = useState<CanvasAsset[]>(() => snapshot?.presentables?.length ? snapshot.presentables : []);
    const [crystallizedQuotes, setCrystallizedQuotes] = useState<CanvasAsset[]>(() => snapshot?.crystallizedQuotes?.length ? snapshot.crystallizedQuotes : []);
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
    // Chat messages are managed by ChatPanel/App.tsx; preserve whatever was in the snapshot
    const snapshotMessagesRef = useRef(snapshot?.messages || []);
    const routedIdsRef = useRef<Set<string>>(new Set());
    const previousTopicRef = useRef<string>(normalizeTopic(snapshot?.topicTitle || topicTitle));
    const previousSeedVersionRef = useRef<number>(seedPromptVersion);
    const mainScrollRef = useRef<HTMLElement | null>(null);
    const thinkingTimerRef = useRef<number | null>(null);
    const requestSeqRef = useRef(0);
    const previewCacheRef = useRef<Map<string, string>>(new Map());
    const [mainScrollIndicator, setMainScrollIndicator] = useState({ visible: false, height: 0, offset: 0 });
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [suggestedTitle, setSuggestedTitle] = useState<string>('');

    const activePresentable = useMemo(
        () => presentables.find((asset) => asset.id === activePresentableId)
            ?? crystallizedQuotes.find((asset) => asset.id === activePresentableId)
            ?? presentables[0] ?? null,
        [activePresentableId, presentables, crystallizedQuotes]
    );
    const referenceSections = useMemo(
        () => activePresentable?.type === 'reference' ? buildReferenceSections(activePresentable) : null,
        [activePresentable]
    );
    const shouldRenderPreview = activePresentable?.type === 'remotion';
    const previewCaption = useMemo(
        () => activePresentable ? buildPreviewCaption(activePresentable, referenceSections) : '',
        [activePresentable, referenceSections]
    );
    const previewKey = useMemo(() => (
        activePresentable && shouldRenderPreview
            ? JSON.stringify({
                version: PREVIEW_RENDER_VERSION,
                id: activePresentable.id,
                type: activePresentable.type,
                title: activePresentable.title,
                summary: activePresentable.summary,
                content: activePresentable.content,
            })
            : ''
    ), [activePresentable, shouldRenderPreview]);

    useEffect(() => {
        onBlackboardStateChange?.({ hasContent: presentables.length > 0 });
    }, [presentables.length, onBlackboardStateChange]);

    useEffect(() => {
        writeCrucibleSnapshot({
            messages: snapshotMessagesRef.current,
            presentables,
            crystallizedQuotes,
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
    }, [activePresentableId, presentables, crystallizedQuotes, roundAnchors, lastDialogue, openingPrompt, topicTitle, roundIndex, isThinking, questionSource, engineMode]);

    useEffect(() => {
        const normalizedTopic = normalizeTopic(topicTitle);
        if (normalizedTopic === previousTopicRef.current) {
            return;
        }

        // 外部传入的是默认占位符，说明没有实际议题切换，保留快照状态
        if (normalizedTopic === '标题待定') {
            previousTopicRef.current = normalizedTopic;
            return;
        }

        previousTopicRef.current = normalizedTopic;
        setPresentables([]);
        setCrystallizedQuotes([]);
        setActivePresentableId('');
        setOpeningPrompt('');
        setRoundAnchors([]);
        setRoundIndex(1);
        setIsThinking(false);
        setQuestionSource('static');
        setEngineMode('socratic_refinement');
        setLastDialogue(null);
        previousSeedVersionRef.current = seedPromptVersion;
        setPreviewImageUrl(null);
        setPreviewStatus('idle');
        setSuggestedTitle('');
    }, [topicTitle, seedPromptVersion]);

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

            const newQuotes = generatedPresentables.filter((asset) => asset.type === 'quote');
            if (newQuotes.length > 0) {
                setCrystallizedQuotes((prev) => {
                    const existingIds = new Set(prev.map((q) => q.id));
                    return [...prev, ...newQuotes.filter((q) => !existingIds.has(q.id))];
                });
            }
            setRoundAnchors(generatedAnchors);
            setPresentables(generatedPresentables);
            setActivePresentableId(generatedPresentables[0]?.id || '');
            setRoundIndex(nextRoundIndex);
            setIsThinking(false);
            if (data.topicSuggestion) {
                setSuggestedTitle(data.topicSuggestion);
            }
            setQuestionSource(data.source === 'socrates' ? 'socrates' : 'fallback');
            setEngineMode(data.engineMode === 'roundtable_discovery' ? 'roundtable_discovery' : 'socratic_refinement');
            setLastDialogue(dialogue);
            onRoundGenerated?.({
                speaker: dialogue.speaker,
                reflection: dialogue.utterance,
                source: data.source === 'socrates' ? 'socrates' : 'fallback',
                roundIndex: nextRoundIndex,
            });
            onTurnSettled?.();
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
            onTurnSettled?.();
        }
    }, [projectId, scriptPath, topicTitle, onRoundGenerated, onTurnSettled]);

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
        if (seedPromptVersion < previousSeedVersionRef.current) {
            previousSeedVersionRef.current = seedPromptVersion;
        }
    }, [seedPromptVersion]);

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

    useEffect(() => {
        if (!activePresentable || !previewKey || !shouldRenderPreview) {
            setPreviewImageUrl(null);
            setPreviewStatus('idle');
            return;
        }

        const cachedPreview = previewCacheRef.current.get(previewKey);
        if (cachedPreview) {
            setPreviewImageUrl(cachedPreview);
            setPreviewStatus('ready');
            return;
        }

        const controller = new AbortController();
        const bullets = buildPreviewBullets(activePresentable);
        const subtitle = truncateText(activePresentable.summary || bullets[0] || normalizeTopic(topicTitle), 40);

        setPreviewStatus('loading');
        setPreviewImageUrl(null);

        void fetch(buildApiUrl('/api/crucible/remotion-preview'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId,
                renderVersion: PREVIEW_RENDER_VERSION,
                topicTitle: normalizeTopic(topicTitle),
                title: activePresentable.title,
                subtitle,
                bullets,
            }),
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || '中屏预览生成失败');
                }
                return response.json() as Promise<CrucibleRemotionPreviewResponse>;
            })
            .then((data) => {
                if (controller.signal.aborted || !data.imageUrl) {
                    return;
                }
                previewCacheRef.current.set(previewKey, data.imageUrl);
                setPreviewImageUrl(data.imageUrl);
                setPreviewStatus('ready');
            })
            .catch((error) => {
                if (controller.signal.aborted) {
                    return;
                }
                console.error('[Crucible] Remotion preview failed:', error);
                setPreviewStatus('error');
                setPreviewImageUrl(null);
            });

        return () => controller.abort();
    }, [activePresentable, previewKey, projectId, shouldRenderPreview, topicTitle]);

    const handleResetWorkspace = () => {
        if (thinkingTimerRef.current) {
            window.clearTimeout(thinkingTimerRef.current);
        }
        clearCrucibleSnapshot();
        routedIdsRef.current.clear();
        requestSeqRef.current += 1;
        setPresentables([]);
        setCrystallizedQuotes([]);
        setActivePresentableId('');
        setOpeningPrompt('');
        setRoundAnchors([]);
        setRoundIndex(1);
        setIsThinking(false);
        setQuestionSource('static');
        setEngineMode('socratic_refinement');
        setLastDialogue(null);
        previousSeedVersionRef.current = seedPromptVersion;
        setPreviewImageUrl(null);
        setPreviewStatus('idle');
        setSuggestedTitle('');
        onResetWorkspace?.();
    };

    return (
        <div className="flex h-full min-h-0 flex-1 overflow-hidden px-3 py-3 md:px-4 md:py-3">
            <div className="mx-auto grid h-full min-h-0 max-w-[1500px] flex-1 gap-3 xl:grid-cols-[172px_minmax(0,1fr)]">
                <aside className="order-2 flex h-full flex-col overflow-hidden rounded-[12px] border border-[var(--line-soft)] bg-[rgba(255,251,245,0.92)] p-2.5 shadow-[0_14px_32px_rgba(131,103,70,0.04)] xl:order-1">
                    {crystallizedQuotes.length > 0 && (
                        <div className="mb-2 flex-shrink-0">
                            <div className="mb-1.5 px-1 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-3)]">结晶内容</div>
                            <div className="space-y-1">
                                {crystallizedQuotes.map((quote) => {
                                    const roundMatch = quote.id.match(/^turn_(\d+)_/);
                                    const quoteRound = roundMatch ? roundMatch[1] : '';
                                    const isActive = quote.id === activePresentableId;
                                    return (
                                        <button
                                            key={quote.id}
                                            type="button"
                                            onClick={() => setActivePresentableId(quote.id)}
                                            className={`w-full rounded-[8px] border px-2 py-1.5 text-left transition ${isActive
                                                ? 'border-[var(--accent)] bg-[rgba(146,118,82,0.08)]'
                                                : 'border-transparent bg-transparent hover:border-[var(--line-soft)] hover:bg-[var(--surface-1)]'
                                                }`}
                                        >
                                            <div className="flex items-start gap-1.5">
                                                <Quote className="mt-0.5 h-3 w-3 flex-shrink-0 text-[var(--accent)]" />
                                                <div className="min-w-0">
                                                    <div className="truncate text-[11px] font-medium leading-5 text-[var(--ink-1)]">{quote.title}</div>
                                                    {quoteRound && <div className="text-[10px] text-[var(--ink-3)]">第{quoteRound}轮</div>}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="my-2 h-px bg-[var(--line-soft)]" />
                        </div>
                    )}
                    <div className="mb-1.5 flex-shrink-0 px-1">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-3)]">黑板</div>
                    </div>
                    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                        {presentables.length === 0 ? (
                            <div className="rounded-[8px] border border-dashed border-[var(--line-soft)] bg-[rgba(255,252,248,0.86)] px-3 py-4 text-[12px] leading-6 text-[var(--ink-3)]">
                                黑板内容会出现在这里。
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
                                    className={`w-full rounded-[8px] border px-2.5 py-2 text-left transition ${isActive
                                        ? 'border-[var(--line-strong)] bg-[var(--surface-1)] shadow-[0_10px_20px_rgba(131,103,70,0.06)]'
                                        : 'border-transparent bg-transparent hover:border-[var(--line-soft)] hover:bg-[var(--surface-1)]'
                                        }`}
                                >
                                    <div className="text-[var(--ink-3)]">
                                        <Icon className="h-3.5 w-3.5" />
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
                        className="h-full min-h-0 space-y-2 overflow-y-scroll pr-2"
                    >
                        <section className="rounded-[12px] border border-[var(--line-soft)] bg-[rgba(255,251,245,0.84)] px-4 py-3 shadow-[0_14px_32px_rgba(131,103,70,0.04)]">
                        <div className="mh-display text-[24px] font-semibold tracking-tight text-[var(--ink-1)] md:text-[26px]">{suggestedTitle || normalizeTopic(topicTitle)}</div>
                        {isThinking && (
                            <div className="mt-4 rounded-[8px] border border-[rgba(166,117,64,0.14)] bg-[rgba(255,248,238,0.7)] px-4 py-3">
                                <div className="text-[12px] leading-6 text-[var(--ink-2)]">
                                    {engineMode === 'roundtable_discovery'
                                        ? '正在整理这一轮最值得挂上黑板的冲突。'
                                        : '正在继续收紧这一轮黑板焦点。'}
                                </div>
                            </div>
                        )}
                        </section>

                        <section className="rounded-[12px] border border-[var(--line-soft)] bg-[var(--surface-0)] p-4 shadow-[0_14px_32px_rgba(131,103,70,0.04)]">
                        {!activePresentable ? (
                            <div className="rounded-[10px] border border-dashed border-[var(--line-soft)] bg-[#fffdf9] px-4 py-8 text-center text-[13px] leading-7 text-[var(--ink-3)]">
                                暂无黑板内容。
                            </div>
                        ) : (
                        <>
                        <div>
                            <h2 className="mh-display text-[22px] font-semibold text-[var(--ink-1)]">{activePresentable.title}</h2>
                            {activePresentable.summary && (
                                <p className="mt-2 text-[15px] leading-8 text-[var(--ink-2)]">{activePresentable.summary}</p>
                            )}
                        </div>

                        {shouldRenderPreview && (previewStatus !== 'error' || previewImageUrl) && (
                            <div className="mt-4 overflow-hidden rounded-[10px] border border-[rgba(146,118,82,0.12)] bg-[linear-gradient(180deg,#fffdf9_0%,#f8eedf_100%)]">
                                <div className="aspect-[16/9] w-full">
                                    {previewImageUrl ? (
                                        <img
                                            src={previewImageUrl}
                                            alt={`${activePresentable.title} 的中屏预览`}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,rgba(248,239,226,0.92)_0%,rgba(236,217,191,0.72)_100%)] text-[13px] text-[var(--ink-3)]">
                                            {previewStatus === 'loading' ? '正在生成参考图...' : '参考图稍后挂出'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activePresentable.type === 'reference' && referenceSections ? (
                            previewImageUrl ? (
                                <article className="mt-4 rounded-[10px] border border-[rgba(146,118,82,0.12)] bg-[#fffdf9] px-4 py-3">
                                    <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-3)]">图注</div>
                                    <div className="mt-2 text-[15px] leading-8 text-[var(--ink-2)]">
                                        {previewCaption}
                                    </div>
                                </article>
                            ) : (
                            <article className="mt-4 max-h-[calc(100vh-460px)] overflow-y-auto rounded-[10px] border border-[rgba(146,118,82,0.12)] bg-[linear-gradient(180deg,#fffdf9_0%,#fbf4e8_100%)] px-5 py-5">
                                {referenceSections.lead && normalizeComparableText(referenceSections.lead) !== normalizeComparableText(activePresentable.summary || '') && (
                                    <div className="text-[15px] leading-8 text-[var(--ink-2)]">
                                        {referenceSections.lead}
                                    </div>
                                )}

                                {referenceSections.bullets.length > 0 && (
                                    <div className={`${referenceSections.lead && normalizeComparableText(referenceSections.lead) !== normalizeComparableText(activePresentable.summary || '') ? 'mt-4 border-t border-[rgba(146,118,82,0.12)] pt-4' : ''} space-y-3`}>
                                        {referenceSections.bullets.map((bullet, index) => (
                                            <div key={`${activePresentable.id}_bullet_${index}`} className="flex gap-3">
                                                <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent)]"></div>
                                                <div className="text-[15px] leading-8 text-[var(--ink-1)]">{bullet}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>
                            )
                        ) : (
                            <div className="mt-4 max-h-[calc(100vh-460px)] overflow-y-auto rounded-[10px] border border-[var(--line-soft)] bg-[#fffdf9] p-4">
                                <div className="whitespace-pre-wrap text-[15px] leading-8 text-[var(--ink-1)]">
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
