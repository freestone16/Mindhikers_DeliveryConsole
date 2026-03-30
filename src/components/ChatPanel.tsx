import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BookmarkCheck, Check, FolderTree, Loader2, Paperclip, RotateCcw, Send, Settings, Trash2, X } from 'lucide-react';
import type { Attachment, ChatMessage, ChatMessageMeta, HostRoutedAsset, ToolCallConfirmation } from '../types';
import { EXPERTS } from '../config/experts';
import { enrichMessageMeta, toHostRoutedAsset } from './crucible/hostRouting';
import {
    getCrucibleSnapshotStorageKey,
    persistCrucibleSnapshot,
    readScopedCrucibleSnapshot,
    savePersistedCrucibleConversation,
} from './crucible/storage';
import type { CrucibleSnapshot } from './crucible/types';

interface ChatPanelProps {
    isOpen: boolean;
    onToggle: () => void;
    expertId: string;
    projectId: string;
    scriptPath: string;
    resetToken: number;
    displayName?: string;
    panelTitle?: string;
    currentUserBadge?: {
        id?: string;
        name: string;
        role?: string;
        avatarText?: string;
        avatarImage?: string;
    };
    headerBadges?: Array<{
        id: string;
        name: string;
        role: string;
        avatarText?: string;
        avatarImage?: string;
    }>;
    externalMessages?: ChatMessage[];
    onUserMessage?: (content: string) => void;
    onRouteAsset?: (asset: HostRoutedAsset) => void;
    onOpenTopicCenter?: () => void;
    onPersistedSnapshotSaved?: (snapshot: CrucibleSnapshot) => void;
    onResetAll?: () => void;
    blackboardHint?: string | null;
    crucibleTurnSettledToken?: number;
    workspaceId?: string | null;
    socket: any;
}

const DEFAULT_ASSISTANT = {
    authorId: 'assistant',
    authorName: '助手',
    authorRole: '默认回复',
};

const buildDefaultAssistantMeta = (
    isCrucibleMode: boolean,
    expertId: string,
    expertName: string
): ChatMessageMeta => {
    if (isCrucibleMode) {
        return DEFAULT_ASSISTANT;
    }

    return {
        authorId: expertId,
        authorName: expertName,
        authorRole: '专业助手',
    };
};

const getBubbleTone = (msg: ChatMessage) => {
    if (msg.role === 'user') {
        return 'border-[rgba(166,117,64,0.18)] bg-[linear-gradient(180deg,#f3dcc2_0%,#eed0ae_100%)] text-[var(--ink-1)]';
    }

    if (msg.meta?.classification === 'quote') {
        return 'border-[rgba(177,139,80,0.18)] bg-[linear-gradient(180deg,#fff8ef_0%,#f8ebd9_100%)] text-[var(--ink-1)]';
    }

    if (msg.meta?.classification === 'reference') {
        return 'border-[rgba(146,118,82,0.16)] bg-[linear-gradient(180deg,#fffdf8_0%,#f6eee2_100%)] text-[var(--ink-1)]';
    }

    if (msg.meta?.classification === 'asset') {
        return 'border-[rgba(191,147,95,0.2)] bg-[linear-gradient(180deg,#fef7ee_0%,#f3e4cf_100%)] text-[var(--ink-1)]';
    }

    return 'border-[rgba(146,118,82,0.16)] bg-[linear-gradient(180deg,#fffaf3_0%,#f7eddf_100%)] text-[var(--ink-1)]';
};

const getMessageAuthor = (
    msg: ChatMessage,
    headerBadges?: ChatPanelProps['headerBadges'],
    fallbackName?: string,
    currentUserBadge?: ChatPanelProps['currentUserBadge'],
) => {
    if (msg.role === 'user') {
        return headerBadges?.find((badge) => badge.id === 'user') || currentUserBadge || {
            id: 'user',
            name: '你',
            role: '当前用户',
            avatarText: '你',
        };
    }

    const authorId = msg.meta?.authorId || DEFAULT_ASSISTANT.authorId;
    return headerBadges?.find((badge) => badge.id === authorId) || {
        id: authorId,
        name: msg.meta?.authorName || fallbackName || DEFAULT_ASSISTANT.authorName,
        role: msg.meta?.authorRole || DEFAULT_ASSISTANT.authorRole,
        avatarText: (msg.meta?.authorName || fallbackName || DEFAULT_ASSISTANT.authorName).slice(0, 1),
    };
};

const getCrucibleStatusMessage = (msg: ChatMessage) => {
    return msg.content;
};

const isPlaceholderTopicTitle = (value?: string) => {
    const normalized = value?.trim();
    return !normalized || normalized === '标题待定' || normalized === '标题待收敛...' || normalized.toUpperCase() === 'TBD';
};

const truncateTopicTitle = (value: string, maxLength = 24) => (
    value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
);

const getCrucibleDraftBadge = (options: {
    inputText: string;
    hasMessages: boolean;
    snapshot?: CrucibleSnapshot | null;
}) => {
    if (options.inputText.trim()) {
        return '草稿未发送';
    }
    if (options.snapshot?.saveMode === 'manual') {
        return '已手动保存';
    }
    if (options.snapshot?.saveMode === 'autosave') {
        return '自动保存';
    }
    if (options.snapshot?.saveMode === 'conversation') {
        return '对话沉淀';
    }
    return options.hasMessages ? '自动保存' : '新话题';
};

const shouldSkipAssistantMessage = (prev: ChatMessage[], next: ChatMessage, isCrucibleMode: boolean) => {
    const normalizedNext = next.content.trim();
    if (!normalizedNext) {
        return false;
    }

    const recentAssistantMessages = prev.filter((message) => message.role === 'assistant').slice(-4);
    const isDuplicate = recentAssistantMessages.some((message) => (
        message.content.trim() === normalizedNext
        && (message.meta?.authorId || '') === (next.meta?.authorId || '')
        && (message.meta?.classification || '') === (next.meta?.classification || '')
    ));

    if (isDuplicate) {
        return true;
    }

    if (isCrucibleMode) {
        const userMessageCount = prev.filter((message) => message.role === 'user').length;
        if (userMessageCount <= 1 && normalizedNext.includes('我看到了你的回答')) {
            return true;
        }
    }

    return false;
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
    isOpen,
    onToggle,
    expertId,
    projectId,
    scriptPath,
    resetToken,
    displayName,
    panelTitle,
    currentUserBadge,
    headerBadges,
    externalMessages = [],
    onUserMessage,
    onRouteAsset,
    onOpenTopicCenter,
    onPersistedSnapshotSaved,
    onResetAll,
    blackboardHint,
    crucibleTurnSettledToken = 0,
    workspaceId,
    socket,
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState(() => (
        expertId === 'GoldenMetallurgist' ? (readScopedCrucibleSnapshot(workspaceId)?.draftInputText || '') : ''
    ));
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [contextLoaded, setContextLoaded] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [warning, setWarning] = useState<string | null>(null);
    const [crucibleThinkingStartedAt, setCrucibleThinkingStartedAt] = useState<number | null>(null);
    const [crucibleThinkingElapsedSec, setCrucibleThinkingElapsedSec] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isComposingRef = useRef(false);
    const crucibleDraftPersistTimerRef = useRef<number | null>(null);

    const currentScopeRef = useRef({ expertId, projectId, scriptPath });
    const prevScopeKeyRef = useRef<string | null>(null);
    const prevResetTokenRef = useRef(resetToken);
    const streamingContentRef = useRef('');
    const routedMessageIdsRef = useRef<Set<string>>(new Set());
    const seenExternalMessageIdsRef = useRef<Set<string>>(new Set());
    const sendGuardRef = useRef(false);
    const lastSentRef = useRef<{ content: string; at: number } | null>(null);
    const expert = EXPERTS.find((item) => item.id === expertId);
    const expertName = displayName || expert?.name || expertId;
    const scopeKey = `${expertId}::${projectId}::${scriptPath || '__no_script__'}`;
    const isCrucibleMode = expertId === 'GoldenMetallurgist';
    const confirmKey = `chatpanel_confirm_send_${expertId}`;
    const [showSettings, setShowSettings] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const toastTimerRef = useRef<number | null>(null);
    const [confirmBeforeSend, setConfirmBeforeSend] = useState(() => {
        try { return localStorage.getItem(confirmKey) === 'true'; } catch { return false; }
    });

    const saveConfirmSetting = (value: boolean) => {
        setConfirmBeforeSend(value);
        try { localStorage.setItem(confirmKey, String(value)); } catch { /* ignore */ }
    };

    const showToast = useCallback((msg: string) => {
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        setToastMessage(msg);
        toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2000);
    }, []);

    const defaultAssistantMeta = useMemo(
        () => buildDefaultAssistantMeta(isCrucibleMode, expertId, expertName),
        [isCrucibleMode, expertId, expertName]
    );
    const resolvedCurrentUserBadge = useMemo(() => ({
        id: currentUserBadge?.id || 'user',
        name: currentUserBadge?.name || '你',
        role: currentUserBadge?.role || '当前用户',
        avatarText: currentUserBadge?.avatarText || currentUserBadge?.name?.slice(0, 1) || '你',
        avatarImage: currentUserBadge?.avatarImage,
    }), [currentUserBadge]);
    const lastOldluMessageId = useMemo(() => {
        for (let index = messages.length - 1; index >= 0; index -= 1) {
            const message = messages[index];
            if (message.role === 'assistant' && message.meta?.authorId === 'oldlu') {
                return message.id;
            }
        }
        return null;
    }, [messages]);
    const crucibleThinkingLabel = useMemo(
        () => `老卢、老张在思索，已用时 ${crucibleThinkingElapsedSec} 秒...`,
        [crucibleThinkingElapsedSec]
    );

    const resetPanelState = useCallback(() => {
        setMessages([]);
        setContextLoaded(false);
        setInputText('');
        setAttachments([]);
        setIsStreaming(false);
        setStreamingContent('');
        setCrucibleThinkingStartedAt(null);
        setCrucibleThinkingElapsedSec(0);
        routedMessageIdsRef.current.clear();
        seenExternalMessageIdsRef.current.clear();
        sendGuardRef.current = false;
        lastSentRef.current = null;
    }, []);

    const matchesCurrentScope = useCallback((incoming: { expertId: string; projectId?: string; scriptPath?: string }) => (
        incoming.expertId === currentScopeRef.current.expertId
        && (incoming.projectId || '') === currentScopeRef.current.projectId
        && (incoming.scriptPath || '') === currentScopeRef.current.scriptPath
    ), []);

    useEffect(() => {
        currentScopeRef.current = { expertId, projectId, scriptPath };
    }, [expertId, projectId, scriptPath]);

    useEffect(() => {
        streamingContentRef.current = streamingContent;
    }, [streamingContent]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent]);

    useEffect(() => {
        if (!onRouteAsset) {
            return;
        }

        for (const message of messages) {
            if (message.role !== 'assistant' || !message.meta?.classification || message.meta.classification === 'dialogue') {
                continue;
            }
            if (routedMessageIdsRef.current.has(message.id)) {
                continue;
            }

            const routedAsset = toHostRoutedAsset(message);
            routedMessageIdsRef.current.add(message.id);
            if (routedAsset) {
                onRouteAsset(routedAsset);
            }
        }
    }, [messages, onRouteAsset]);

    useEffect(() => {
        if (externalMessages.length === 0) {
            return;
        }

        const freshMessages = externalMessages.filter((message) => !seenExternalMessageIdsRef.current.has(message.id));
        if (freshMessages.length === 0) {
            return;
        }

        freshMessages.forEach((message) => seenExternalMessageIdsRef.current.add(message.id));
        setMessages((prev) => {
            const nextMessages = [...prev];
            for (const message of freshMessages.map((item) => enrichMessageMeta(item))) {
                if (!shouldSkipAssistantMessage(nextMessages, message, isCrucibleMode)) {
                    nextMessages.push(message);
                }
            }
            return nextMessages;
        });

        if (isCrucibleMode && freshMessages.some((message) => message.role === 'assistant')) {
            setIsStreaming(false);
            setStreamingContent('');
            setCrucibleThinkingStartedAt(null);
            setCrucibleThinkingElapsedSec(0);
            sendGuardRef.current = false;
        }
    }, [externalMessages, isCrucibleMode]);

    useEffect(() => {
        if (!isCrucibleMode) {
            return;
        }
        const snapshot = readScopedCrucibleSnapshot(workspaceId);
        if (!snapshot) {
            return;
        }

        if (crucibleDraftPersistTimerRef.current) {
            window.clearTimeout(crucibleDraftPersistTimerRef.current);
        }

        const nextSnapshot: CrucibleSnapshot = {
            ...snapshot,
            draftInputText: inputText.trim() ? inputText : undefined,
        };

        crucibleDraftPersistTimerRef.current = window.setTimeout(() => {
            void persistCrucibleSnapshot(nextSnapshot, { workspaceId });
        }, 250);

        return () => {
            if (crucibleDraftPersistTimerRef.current) {
                window.clearTimeout(crucibleDraftPersistTimerRef.current);
            }
        };
    }, [inputText, isCrucibleMode, workspaceId]);

    useEffect(() => {
        if (!isCrucibleMode) {
            return;
        }

        setIsStreaming(false);
        setStreamingContent('');
        setCrucibleThinkingStartedAt(null);
        setCrucibleThinkingElapsedSec(0);
        sendGuardRef.current = false;
    }, [crucibleTurnSettledToken, isCrucibleMode]);

    useEffect(() => {
        if (!isCrucibleMode || !isStreaming || !crucibleThinkingStartedAt) {
            return;
        }

        const tick = () => {
            setCrucibleThinkingElapsedSec(Math.max(0, Math.floor((Date.now() - crucibleThinkingStartedAt) / 1000)));
        };

        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }, [crucibleThinkingStartedAt, isCrucibleMode, isStreaming]);

    useEffect(() => {
        if (!socket) return;

        const handleChatChunk = ({ chunk, expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath }: { chunk: string; expertId: string; projectId?: string; scriptPath?: string }) => {
            if (!matchesCurrentScope({ expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath })) return;
            setStreamingContent((prev) => prev + chunk);
        };

        const handleChatDone = ({ expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath }: { expertId: string; projectId?: string; scriptPath?: string }) => {
            if (!matchesCurrentScope({ expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath })) return;

            setStreamingContent((prev) => {
                if (prev) {
                    const aiMessage = enrichMessageMeta({
                        id: `msg_${Date.now()}`,
                        role: 'assistant',
                        content: prev,
                        timestamp: new Date().toISOString(),
                        meta: defaultAssistantMeta,
                    });
                    setMessages((msgs) => shouldSkipAssistantMessage(msgs, aiMessage, isCrucibleMode) ? msgs : [...msgs, aiMessage]);
                }
                return '';
            });
            setIsStreaming(false);
            setCrucibleThinkingStartedAt(null);
            setCrucibleThinkingElapsedSec(0);
            sendGuardRef.current = false;
        };

        const handleChatError = ({ error, expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath }: { error: string; expertId: string; projectId?: string; scriptPath?: string }) => {
            if (!matchesCurrentScope({ expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath })) return;
            setIsStreaming(false);
            setStreamingContent('');
            setCrucibleThinkingStartedAt(null);
            setCrucibleThinkingElapsedSec(0);
            sendGuardRef.current = false;
            const nextMessage = {
                id: `msg_${Date.now()}`,
                role: 'assistant' as const,
                content: `错误: ${error}`,
                timestamp: new Date().toISOString(),
                meta: defaultAssistantMeta,
            };
            setMessages((msgs) => shouldSkipAssistantMessage(msgs, nextMessage, isCrucibleMode) ? msgs : [...msgs, nextMessage]);
        };

        const handleChatWarning = ({ warning: msg, expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath }: { warning: string; expertId: string; projectId?: string; scriptPath?: string }) => {
            if (!matchesCurrentScope({ expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath })) return;
            setWarning(msg);
            setTimeout(() => setWarning(null), 3000);
        };

        const handleChatHistory = ({ expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath, messages: history }: { expertId: string; projectId?: string; scriptPath?: string; messages: ChatMessage[] }) => {
            if (!matchesCurrentScope({ expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath })) return;
            setMessages(history.map((message) => enrichMessageMeta(message)));
        };

        const handleChatContextLoaded = ({ expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath }: { expertId: string; projectId?: string; scriptPath?: string }) => {
            if (!matchesCurrentScope({ expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath })) return;
            setContextLoaded(true);
        };

        const handleChatConfirmation = ({ expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath, message }: { expertId: string; projectId?: string; scriptPath?: string; message: string }) => {
            if (!matchesCurrentScope({ expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath })) return;
            const nextMessage = enrichMessageMeta({
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: message,
                timestamp: new Date().toISOString(),
                meta: defaultAssistantMeta,
            });
            setMessages((prev) => shouldSkipAssistantMessage(prev, nextMessage, isCrucibleMode) ? prev : [...prev, nextMessage]);
            setIsStreaming(false);
            setCrucibleThinkingStartedAt(null);
            setCrucibleThinkingElapsedSec(0);
            sendGuardRef.current = false;
        };

        const handleChatActionConfirm = (data: { expertId: string; projectId?: string; scriptPath?: string; confirmId: string; actionName: string; actionArgs: any; description: string }) => {
            if (!matchesCurrentScope(data)) return;

            const currentStreaming = streamingContentRef.current;
            if (currentStreaming) {
                const nextMessage = enrichMessageMeta({
                    id: `msg_text_${Date.now()}`,
                    role: 'assistant',
                    content: currentStreaming,
                    timestamp: new Date().toISOString(),
                    meta: defaultAssistantMeta,
                });
                setMessages((prev) => shouldSkipAssistantMessage(prev, nextMessage, isCrucibleMode) ? prev : [...prev, nextMessage]);
            }

            setIsStreaming(false);
            setStreamingContent('');
            setCrucibleThinkingStartedAt(null);
            setCrucibleThinkingElapsedSec(0);
            sendGuardRef.current = false;
            setMessages((prev) => [...prev, {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: '',
                timestamp: new Date().toISOString(),
                meta: defaultAssistantMeta,
                actionConfirm: {
                    confirmId: data.confirmId,
                    actionName: data.actionName,
                    actionArgs: data.actionArgs,
                    description: data.description,
                    status: 'pending',
                },
            }]);
        };

        const handleChatActionResult = (data: { expertId: string; projectId?: string; scriptPath?: string; success: boolean; message: string }) => {
            if (!matchesCurrentScope(data)) return;
            setIsStreaming(false);
            setCrucibleThinkingStartedAt(null);
            setCrucibleThinkingElapsedSec(0);
            sendGuardRef.current = false;
            const nextMessage = enrichMessageMeta({
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: data.message,
                timestamp: new Date().toISOString(),
                meta: defaultAssistantMeta,
            });
            setMessages((prev) => shouldSkipAssistantMessage(prev, nextMessage, isCrucibleMode) ? prev : [...prev, nextMessage]);
        };

        socket.on('chat-chunk', handleChatChunk);
        socket.on('chat-done', handleChatDone);
        socket.on('chat-error', handleChatError);
        socket.on('chat-warning', handleChatWarning);
        socket.on('chat-history', handleChatHistory);
        socket.on('chat-context-loaded', handleChatContextLoaded);
        socket.on('chat-confirmation', handleChatConfirmation);
        socket.on('chat-action-confirm', handleChatActionConfirm);
        socket.on('chat-action-result', handleChatActionResult);

        return () => {
            socket.off('chat-chunk', handleChatChunk);
            socket.off('chat-done', handleChatDone);
            socket.off('chat-error', handleChatError);
            socket.off('chat-warning', handleChatWarning);
            socket.off('chat-history', handleChatHistory);
            socket.off('chat-context-loaded', handleChatContextLoaded);
            socket.off('chat-confirmation', handleChatConfirmation);
            socket.off('chat-action-confirm', handleChatActionConfirm);
            socket.off('chat-action-result', handleChatActionResult);
        };
    }, [socket, matchesCurrentScope, defaultAssistantMeta, isCrucibleMode]);

    useEffect(() => {
        if (isCrucibleMode) {
            if (prevResetTokenRef.current !== resetToken) {
                prevResetTokenRef.current = resetToken;
                queueMicrotask(resetPanelState);
            }
            return;
        }
        if (!socket || !isOpen || !projectId) return;

        if (prevScopeKeyRef.current !== scopeKey) {
            queueMicrotask(resetPanelState);
            socket.emit('chat-load-history', { expertId, projectId, scriptPath });
            prevScopeKeyRef.current = scopeKey;
        }
    }, [expertId, projectId, scriptPath, socket, isOpen, scopeKey, resetPanelState, isCrucibleMode]);

    useEffect(() => {
        // Crucible mode manages its own message history via externalMessages; skip socket-based load/reset
        if (isCrucibleMode) return;
        if (!socket || !isOpen || !projectId) return;

        if (prevResetTokenRef.current !== resetToken) {
            prevResetTokenRef.current = resetToken;
            queueMicrotask(resetPanelState);
            socket.emit('chat-clear-history', { expertId, projectId, scriptPath });
        }
    }, [resetToken, socket, isOpen, expertId, projectId, scriptPath, resetPanelState, isCrucibleMode]);

    const handleSend = useCallback(() => {
        if (!inputText.trim() && attachments.length === 0) return;
        if (!socket || sendGuardRef.current) return;
        if (isStreaming && !isCrucibleMode) return;
        if (confirmBeforeSend && !window.confirm('确认发送这条消息？')) return;

        const normalizedInput = inputText.trim();
        const now = Date.now();
        if (
            normalizedInput
            && attachments.length === 0
            && lastSentRef.current
            && lastSentRef.current.content === normalizedInput
            && now - lastSentRef.current.at < 1200
        ) {
            return;
        }
        sendGuardRef.current = true;
        lastSentRef.current = normalizedInput ? { content: normalizedInput, at: now } : lastSentRef.current;

        const userMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: normalizedInput,
            timestamp: new Date().toISOString(),
            attachments: attachments.length > 0 ? [...attachments] : undefined,
            meta: {
                authorId: 'user',
                authorName: resolvedCurrentUserBadge.name,
                authorRole: resolvedCurrentUserBadge.role,
                classification: 'dialogue',
            },
        };

        if (normalizedInput) {
            onUserMessage?.(normalizedInput);
        }
        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setAttachments([]);
        setIsStreaming(true);
        setStreamingContent('');
        if (isCrucibleMode) {
            setCrucibleThinkingStartedAt(Date.now());
            setCrucibleThinkingElapsedSec(0);
        }

        if (textareaRef.current) {
            textareaRef.current.style.height = '96px';
        }

        if (!contextLoaded) {
            socket.emit('chat-load-context', { expertId, projectId, scriptPath });
        }

        if (isCrucibleMode) {
            return;
        }

        socket.emit('chat-stream', {
            messages: [...messages, userMessage],
            expertId,
            projectId,
            scriptPath,
        });
    }, [inputText, attachments, isStreaming, socket, messages, contextLoaded, expertId, projectId, scriptPath, onUserMessage, confirmBeforeSend, isCrucibleMode, resolvedCurrentUserBadge]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isComposingRef.current || e.nativeEvent.isComposing || (e.nativeEvent as KeyboardEvent).keyCode === 229) {
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleConfirmAction = (actionConfirm: ToolCallConfirmation) => {
        setMessages((prev) => prev.map((msg) =>
            msg.actionConfirm?.confirmId === actionConfirm.confirmId
                ? { ...msg, actionConfirm: { ...actionConfirm, status: 'confirmed' } }
                : msg
        ));
        setIsStreaming(true);
        if (isCrucibleMode) {
            setCrucibleThinkingStartedAt(Date.now());
            setCrucibleThinkingElapsedSec(0);
        }
        socket?.emit('chat-action-execute', {
            expertId,
            projectId,
            scriptPath,
            actionName: actionConfirm.actionName,
            actionArgs: actionConfirm.actionArgs,
            originalMessages: messages.filter((msg) => msg.actionConfirm?.status !== 'pending'),
        });
    };

    const handleCancelAction = (actionConfirm: ToolCallConfirmation) => {
        setMessages((prev) => prev.map((msg) =>
            msg.actionConfirm?.confirmId === actionConfirm.confirmId
                ? { ...msg, actionConfirm: { ...actionConfirm, status: 'cancelled' }, content: '已取消该操作。' }
                : msg
        ));
    };

    const processImageFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            const previewUrl = URL.createObjectURL(file);
            setAttachments((prev) => [...prev, {
                type: 'image',
                name: file.name,
                base64,
                previewUrl,
            }]);
        };
        reader.readAsDataURL(file);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    processImageFile(file);
                }
            }
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                processImageFile(file);
            }
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            for (const file of files) {
                if (file.type.startsWith('image/')) {
                    processImageFile(file);
                }
            }
        }
        e.target.value = '';
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => {
            URL.revokeObjectURL(prev[index].previewUrl);
            return prev.filter((_, idx) => idx !== index);
        });
    };

    const handleClearHistory = () => {
        if (!window.confirm('确定要清空对话历史吗？')) return;
        socket?.emit('chat-clear-history', { expertId, projectId, scriptPath });
        setMessages([]);
        routedMessageIdsRef.current.clear();
        seenExternalMessageIdsRef.current.clear();
        sendGuardRef.current = false;
        lastSentRef.current = null;
    };

    const handleResetAll = useCallback(() => {
        if (isCrucibleMode) {
            if (!window.confirm('确定开启一个新话题吗？当前话题会保留在话题中心，可随时回来继续。')) return;
            onResetAll?.();
            return;
        }

        if (!window.confirm('确定要重置工作区并清空对话吗？')) return;
        onResetAll?.();
    }, [isCrucibleMode, onResetAll]);

    const handleExportMarkdown = useCallback(() => {
        const title = (displayName || expertName || '黄金坩埚对话').trim();
        const lines = [
            `# ${title}`,
            '',
            `导出时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`,
            '',
        ];

        for (const message of messages) {
            const author = getMessageAuthor(message, headerBadges, expertName);
            if (!message.content.trim()) {
                continue;
            }
            lines.push(`## ${author.name}`);
            lines.push('');
            lines.push(message.content.trim());
            lines.push('');
        }

        const markdown = lines.join('\n');
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const safeTitle = title.replace(/[\\/:*?"<>|]+/g, '-');
        anchor.href = url;
        anchor.download = `${safeTitle}.md`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        showToast('对话已下载');
    }, [displayName, expertName, messages, headerBadges, showToast]);

    const SNAPSHOT_BACKUP_KEY = 'golden-crucible-manual-backup-v8';
    const scopedSnapshotKey = useMemo(() => getCrucibleSnapshotStorageKey(workspaceId), [workspaceId]);
    const scopedBackupKey = useMemo(
        () => `${SNAPSHOT_BACKUP_KEY}:${workspaceId?.trim() || 'legacy'}`,
        [workspaceId],
    );
    const currentSnapshot = useMemo(() => readScopedCrucibleSnapshot(workspaceId), [messages, inputText, workspaceId]);
    const crucibleDraftBadge = useMemo(() => getCrucibleDraftBadge({
        inputText,
        hasMessages: messages.length > 0,
        snapshot: currentSnapshot,
    }), [currentSnapshot, inputText, messages.length]);

    const handleSaveTopic = useCallback(async () => {
        try {
            const saveTimestamp = new Date().toISOString();
            const snapshot = readScopedCrucibleSnapshot(workspaceId);
            const raw = localStorage.getItem(scopedSnapshotKey);
            if (raw) {
                localStorage.setItem(scopedBackupKey, raw);
            }

            const hasMeaningfulState = messages.some((message) => message.content.trim().length > 0)
                || Boolean(snapshot?.openingPrompt?.trim())
                || Boolean(snapshot?.presentables?.length)
                || Boolean(snapshot?.crystallizedQuotes?.length)
                || Boolean(snapshot?.roundAnchors?.length);

            if (!hasMeaningfulState) {
                showToast('当前还没有内容可保存');
                return;
            }

            const firstUserMessage = messages.find((message) => message.role === 'user' && message.content.trim().length > 0)?.content.trim();
            const candidateTitle = isPlaceholderTopicTitle(snapshot?.topicTitle)
                ? (firstUserMessage || snapshot?.openingPrompt || displayName || expertName || '未命名议题')
                : (snapshot?.topicTitle || displayName || expertName || '未命名议题');
            const nextTitle = truncateTopicTitle(candidateTitle.replace(/\s+/g, ' ').trim() || '未命名议题');

            const nextSnapshot: CrucibleSnapshot = {
                conversationId: snapshot?.conversationId,
                messages: messages.map((message) => ({
                    id: message.id,
                    speaker: message.role === 'user' ? 'user' : (message.meta?.authorId || 'assistant'),
                    name: message.role === 'user'
                        ? (resolvedCurrentUserBadge.name || '你')
                        : (message.meta?.authorName || expertName || '助手'),
                    content: message.content,
                    createdAt: message.timestamp,
                    timestamp: message.timestamp,
                })),
                presentables: snapshot?.presentables || [],
                crystallizedQuotes: snapshot?.crystallizedQuotes || [],
                activePresentableId: snapshot?.activePresentableId,
                topicTitle: nextTitle,
                openingPrompt: snapshot?.openingPrompt || firstUserMessage || undefined,
                draftInputText: inputText.trim() ? inputText : undefined,
                roundAnchors: snapshot?.roundAnchors || [],
                lastDialogue: snapshot?.lastDialogue,
                submittedAt: snapshot?.submittedAt,
                roundIndex: snapshot?.roundIndex || 0,
                isThinking: false,
                questionSource: snapshot?.questionSource || 'static',
                engineMode: snapshot?.engineMode || 'roundtable_discovery',
                updatedAt: saveTimestamp,
                saveMode: 'manual',
            };

            const detail = await savePersistedCrucibleConversation({
                conversationId: snapshot?.conversationId,
                topicTitle: nextTitle,
                status: 'active',
                snapshot: nextSnapshot,
                projectId,
                scriptPath,
            });
            onPersistedSnapshotSaved?.(detail.snapshot);
            showToast(snapshot?.conversationId ? '当前话题已保存，可随时从话题中心继续' : '新话题已保存，可随时回来继续');
        } catch {
            showToast('保存话题失败');
        }
    }, [displayName, expertName, inputText, messages, onPersistedSnapshotSaved, projectId, resolvedCurrentUserBadge.name, scopedBackupKey, scopedSnapshotKey, scriptPath, showToast, workspaceId]);

    const handleLoadAutosave = useCallback(() => {
        try {
            const raw = localStorage.getItem(scopedBackupKey);
            if (!raw) { showToast('还没有保存过快照'); return; }
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.presentables)) {
                showToast('快照数据损坏');
                return;
            }
            localStorage.setItem(scopedSnapshotKey, raw);
            showToast('快照已载入，刷新中...');
            setTimeout(() => window.location.reload(), 600);
        } catch { showToast('载入失败'); }
    }, [scopedBackupKey, scopedSnapshotKey, showToast]);

    const emptyStateText = useMemo(() => {
        if (isCrucibleMode) {
            return '先在这里继续聊，真正需要上黑板的内容会被挂到中区。';
        }
        return `开始和 ${expertName} 对话`;
    }, [isCrucibleMode, expertName]);

    return (
        <div className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(255,250,244,0.98)_0%,rgba(248,239,226,0.96)_100%)]">
            <div className="border-b border-[var(--line-soft)] bg-[rgba(255,251,245,0.92)] px-4 py-2">
                <div className="flex items-center justify-between gap-3">
                    {isCrucibleMode && headerBadges && headerBadges.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {headerBadges.map((badge) => (
                                <div key={badge.id} className="flex items-center gap-1.5 rounded-2xl border border-[rgba(146,118,82,0.12)] bg-[rgba(255,255,255,0.52)] px-2 py-1">
                                    {badge.avatarImage ? (
                                        <div className="h-6 w-6 overflow-hidden rounded-lg bg-[var(--surface-2)]">
                                            <img src={badge.avatarImage} alt={badge.name} className="h-full w-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--surface-2)] text-[11px] font-semibold text-[var(--ink-1)]">
                                            {badge.avatarText || badge.name.slice(0, 1)}
                                        </div>
                                    )}
                                    <div className="text-[12px] font-medium text-[var(--ink-1)]">{badge.name}</div>
                                </div>
                            ))}
                        </div>
                    ) : !isCrucibleMode ? (
                        <div className="flex items-center gap-2">
                            <div className="grid h-9 w-9 place-items-center rounded-2xl border border-[rgba(166,117,64,0.15)] bg-[var(--surface-1)] text-[13px] font-semibold text-[var(--ink-1)]">聊</div>
                            <div className="mh-display text-[18px] font-semibold tracking-tight text-[var(--ink-1)]">{panelTitle || displayName || expertName}</div>
                        </div>
                    ) : null}
                    <div className="relative flex flex-shrink-0 items-center gap-1">
                        {toastMessage && (
                            <span className="mr-1 animate-pulse rounded-full bg-[rgba(166,117,64,0.12)] px-2.5 py-1 text-[11px] text-[var(--ink-2)]">{toastMessage}</span>
                        )}
                        <button
                            onClick={handleExportMarkdown}
                            title="下载 Markdown 对话记录"
                            className="rounded-xl px-2 py-1.5 text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--ink-1)]"
                        >
                            <span className="text-[11px] font-bold leading-none">D</span>
                        </button>
                        {isCrucibleMode && (
                            <>
                                {onOpenTopicCenter ? (
                                    <button
                                        onClick={() => onOpenTopicCenter()}
                                        title="打开话题中心"
                                        className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--ink-1)]"
                                    >
                                        <FolderTree className="h-3.5 w-3.5" />
                                        <span className="text-[11px] font-medium">话题</span>
                                    </button>
                                ) : null}
                                <button
                                    onClick={() => void handleSaveTopic()}
                                    title="保存当前话题到服务端历史中心"
                                    className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--ink-1)]"
                                >
                                    <BookmarkCheck className="h-3.5 w-3.5" />
                                    <span className="text-[11px] font-medium">保存</span>
                                </button>
                                <button
                                    onClick={handleLoadAutosave}
                                    title="从本地草稿快照恢复"
                                    className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--ink-1)]"
                                >
                                    <span className="text-[11px] font-medium">草稿</span>
                                </button>
                                <span className="rounded-full border border-[rgba(156,117,76,0.14)] bg-[rgba(255,252,247,0.9)] px-2.5 py-1 text-[11px] text-[var(--ink-3)]">
                                    {crucibleDraftBadge}
                                </span>
                            </>
                        )}
                        {isCrucibleMode && onResetAll ? (
                            <button
                                onClick={handleResetAll}
                                title="开启一个新话题"
                                className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--ink-1)]"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span className="text-[11px] font-medium">新话题</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleClearHistory}
                                title="清空对话历史"
                                className="rounded-xl p-2 text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--ink-1)]"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            onClick={() => setShowSettings((prev) => !prev)}
                            title="对话设置"
                            className={`rounded-xl p-2 transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--ink-1)] ${showSettings ? 'bg-[var(--surface-1)] text-[var(--ink-1)]' : 'text-[var(--ink-3)]'}`}
                        >
                            <Settings className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onToggle}
                            className="rounded-xl p-2 text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--ink-1)]"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        {showSettings && (
                            <div className="absolute right-0 top-10 z-10 w-52 rounded-[10px] border border-[var(--line-soft)] bg-[rgba(255,251,245,0.98)] p-3 shadow-[0_8px_24px_rgba(131,103,70,0.12)]">
                                <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--ink-3)]">对话设置</div>
                                <label className="flex cursor-pointer items-center justify-between gap-2 py-1.5">
                                    <span className="text-[13px] text-[var(--ink-1)]">发送前确认</span>
                                    <div
                                        className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${confirmBeforeSend ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)]'}`}
                                        onClick={() => saveConfirmSetting(!confirmBeforeSend)}
                                    >
                                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${confirmBeforeSend ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {!isCrucibleMode && headerBadges && headerBadges.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {headerBadges.map((badge) => (
                            <div key={badge.id} className="flex items-center gap-2 rounded-2xl border border-[rgba(146,118,82,0.12)] bg-[rgba(255,255,255,0.52)] px-2.5 py-2">
                                {badge.avatarImage ? (
                                    <div className="h-8 w-8 overflow-hidden rounded-xl bg-[var(--surface-2)]">
                                        <img src={badge.avatarImage} alt={badge.name} className="h-full w-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--surface-2)] text-sm font-semibold text-[var(--ink-1)]">
                                        {badge.avatarText || badge.name.slice(0, 1)}
                                    </div>
                                )}
                                <div className="text-[13px] font-medium text-[var(--ink-1)]">{badge.name}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {warning && (
                <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl border border-[rgba(184,144,77,0.24)] bg-[rgba(255,244,220,0.95)] px-3 py-2 text-[12px] text-[var(--ink-2)]">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {warning}
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-4" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
                {messages.length === 0 && !streamingContent ? (
                    <div className="mt-8 rounded-[24px] border border-dashed border-[var(--line-soft)] bg-[rgba(255,255,255,0.38)] px-4 py-6 text-center text-sm text-[var(--ink-3)]">
                        {emptyStateText}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => {
                            const author = getMessageAuthor(msg, headerBadges, expertName, resolvedCurrentUserBadge);
                            const isUser = msg.role === 'user';

                            return (
                                <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {author.avatarImage ? (
                                        <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-2xl border border-[rgba(146,118,82,0.12)] bg-[var(--surface-1)]">
                                            <img src={author.avatarImage} alt={author.name} className="h-full w-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-2xl border border-[rgba(146,118,82,0.12)] bg-[var(--surface-1)] text-sm font-semibold text-[var(--ink-1)]">
                                            {author.avatarText || author.name.slice(0, 1)}
                                        </div>
                                    )}

                                    <div className={`max-w-[88%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                                        <div className={`mb-1 flex items-center gap-2 text-[11px] ${isUser ? 'flex-row-reverse text-right' : 'text-left'} text-[var(--ink-3)]`}>
                                            <span className="font-medium text-[var(--ink-2)]">{author.name}</span>
                                        </div>

                                        <div className={`w-full rounded-[22px] border px-3.5 py-3 shadow-[0_8px_20px_rgba(131,103,70,0.04)] ${getBubbleTone(msg)}`}>
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div className="mb-3 flex flex-wrap gap-2">
                                                    {msg.attachments.map((att, index) => (
                                                        <img
                                                            key={`${msg.id}_${index}`}
                                                            src={att.previewUrl}
                                                            alt={att.name}
                                                            className="h-20 w-20 rounded-2xl object-cover"
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {(msg.content || isCrucibleMode) && (
                                                <p className="whitespace-pre-wrap text-[13px] leading-7">
                                                    {isCrucibleMode ? getCrucibleStatusMessage(msg) : msg.content}
                                                </p>
                                            )}

                                            {msg.actionConfirm && (
                                                <div className="mt-3 rounded-[18px] border border-[rgba(184,144,77,0.24)] bg-[rgba(255,249,236,0.95)] p-3">
                                                    <p className="mb-3 text-sm font-medium text-[var(--ink-1)]">{msg.actionConfirm.description}</p>
                                                    {msg.actionConfirm.status === 'pending' ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleConfirmAction(msg.actionConfirm!)}
                                                                className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
                                                            >
                                                                <Check className="h-3.5 w-3.5" />
                                                                确认执行
                                                            </button>
                                                            <button
                                                                onClick={() => handleCancelAction(msg.actionConfirm!)}
                                                                className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-0)] px-3 py-2 text-xs font-medium text-[var(--ink-2)]"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                                取消
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex rounded-full border border-[var(--line-soft)] bg-[var(--surface-0)] px-2.5 py-1 text-[11px] text-[var(--ink-2)]">
                                                            {msg.actionConfirm.status === 'confirmed' ? '已确认' : '已取消'}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {isCrucibleMode && blackboardHint && msg.id === lastOldluMessageId && msg.meta?.authorId === 'oldlu' && (
                                            <div className="mt-2 px-1 text-[12px] leading-6 text-[var(--ink-3)]">
                                                {blackboardHint}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {(streamingContent || (isCrucibleMode && isStreaming)) && (
                            <div className="pl-1">
                                <div className="mb-1 text-[11px] text-[var(--ink-3)]">{isCrucibleMode ? '老卢、老张在思索' : '推理中'}</div>
                                <div className="inline-block rounded-[10px] border border-[rgba(146,118,82,0.16)] bg-[linear-gradient(180deg,#fffaf3_0%,#f7eddf_100%)] px-3.5 py-3 text-[13px] leading-7 text-[var(--ink-1)] shadow-[0_8px_20px_rgba(131,103,70,0.04)]">
                                    {isCrucibleMode
                                        ? crucibleThinkingLabel
                                        : streamingContent}
                                    <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-[rgba(120,93,62,0.45)] align-middle" />
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {attachments.length > 0 && (
                <div className="border-t border-[var(--line-soft)] px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                        {attachments.map((att, index) => (
                            <div key={`${att.name}_${index}`} className="relative">
                                <img src={att.previewUrl} alt={att.name} className="h-12 w-12 rounded-xl object-cover" />
                                <button
                                    onClick={() => removeAttachment(index)}
                                    className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[var(--accent)] text-white"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="border-t border-[var(--line-soft)] bg-[rgba(255,251,245,0.92)] px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 flex-shrink-0 place-items-center overflow-hidden rounded-2xl border border-[rgba(146,118,82,0.12)] bg-[var(--surface-1)] text-sm font-semibold text-[var(--ink-1)]">
                        {resolvedCurrentUserBadge.avatarImage ? (
                            <img
                                src={resolvedCurrentUserBadge.avatarImage}
                                alt={resolvedCurrentUserBadge.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            resolvedCurrentUserBadge.avatarText || resolvedCurrentUserBadge.name.slice(0, 1)
                        )}
                    </div>
                    <label className="flex-shrink-0 cursor-pointer rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-0)] p-2 text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)]">
                        <Paperclip className="h-4 w-4" />
                        <input type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
                    </label>
                    <textarea
                        ref={textareaRef}
                        value={inputText}
                        onCompositionStart={() => {
                            isComposingRef.current = true;
                        }}
                        onCompositionEnd={() => {
                            isComposingRef.current = false;
                        }}
                        onChange={(e) => {
                            setInputText(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.max(96, Math.min(e.target.scrollHeight, 240))}px`;
                        }}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={isCrucibleMode ? '继续把你的判断往下说。' : '继续输入。'}
                        className="min-h-[96px] flex-1 resize-none rounded-[22px] border border-[var(--line-soft)] bg-[rgba(255,255,255,0.72)] px-4 py-3 text-sm text-[var(--ink-1)] outline-none transition-colors placeholder:text-[var(--ink-3)] focus:border-[var(--line-strong)]"
                        rows={3}
                        disabled={isCrucibleMode ? false : isStreaming}
                    />
                    <button
                        onClick={handleSend}
                        disabled={(isStreaming && !isCrucibleMode) || (!inputText.trim() && attachments.length === 0)}
                        className="flex-shrink-0 grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent)] text-white transition-opacity hover:opacity-90 disabled:bg-[var(--surface-2)] disabled:text-[var(--ink-3)]"
                    >
                        {(isStreaming && !isCrucibleMode) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ChatPanelContent = ChatPanel;
