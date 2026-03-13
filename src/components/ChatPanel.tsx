import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, Loader2, Paperclip, Send, Trash2, X } from 'lucide-react';
import type { Attachment, ChatMessage, ChatMessageMeta, HostRoutedAsset, ToolCallConfirmation } from '../types';
import { EXPERTS } from '../config/experts';
import { enrichMessageMeta, toHostRoutedAsset } from './crucible/hostRouting';

interface ChatPanelProps {
    isOpen: boolean;
    onToggle: () => void;
    expertId: string;
    projectId: string;
    scriptPath: string;
    resetToken: number;
    displayName?: string;
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

const getClassificationLabel = (msg: ChatMessage) => {
    switch (msg.meta?.classification) {
        case 'reference':
            return '中屏参考同步';
        case 'quote':
            return '中屏金句同步';
        case 'asset':
            return '中屏结构同步';
        default:
            return msg.role === 'user' ? '命题输入' : '右侧主线';
    }
};

const getMessageAuthor = (
    msg: ChatMessage,
    headerBadges?: ChatPanelProps['headerBadges'],
    fallbackName?: string
) => {
    if (msg.role === 'user') {
        return headerBadges?.find((badge) => badge.id === 'user') || {
            id: 'user',
            name: '你',
            role: '命题发起',
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
    headerBadges,
    externalMessages = [],
    onUserMessage,
    onRouteAsset,
    socket,
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [contextLoaded, setContextLoaded] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [warning, setWarning] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isComposingRef = useRef(false);

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
    const defaultAssistantMeta = useMemo(
        () => buildDefaultAssistantMeta(isCrucibleMode, expertId, expertName),
        [isCrucibleMode, expertId, expertName]
    );

    const resetPanelState = useCallback(() => {
        setMessages([]);
        setContextLoaded(false);
        setInputText('');
        setAttachments([]);
        setIsStreaming(false);
        setStreamingContent('');
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
            sendGuardRef.current = false;
        }
    }, [externalMessages, isCrucibleMode]);

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
            sendGuardRef.current = false;
        };

        const handleChatError = ({ error, expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath }: { error: string; expertId: string; projectId?: string; scriptPath?: string }) => {
            if (!matchesCurrentScope({ expertId: msgExpertId, projectId: msgProjectId, scriptPath: msgScriptPath })) return;
            setIsStreaming(false);
            setStreamingContent('');
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
        if (!socket || !isOpen || !projectId) return;

        if (prevScopeKeyRef.current !== scopeKey) {
            queueMicrotask(resetPanelState);
            socket.emit('chat-load-history', { expertId, projectId, scriptPath });
            prevScopeKeyRef.current = scopeKey;
        }
    }, [expertId, projectId, scriptPath, socket, isOpen, scopeKey, resetPanelState]);

    useEffect(() => {
        if (!socket || !isOpen || !projectId) return;

        if (prevResetTokenRef.current !== resetToken) {
            prevResetTokenRef.current = resetToken;
            queueMicrotask(resetPanelState);
            socket.emit('chat-clear-history', { expertId, projectId, scriptPath });
        }
    }, [resetToken, socket, isOpen, expertId, projectId, scriptPath, resetPanelState]);

    const handleSend = useCallback(() => {
        if (!inputText.trim() && attachments.length === 0) return;
        if (isStreaming || !socket || sendGuardRef.current) return;

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
                authorName: '你',
                authorRole: '命题发起',
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
    }, [inputText, attachments, isStreaming, socket, messages, contextLoaded, expertId, projectId, scriptPath, onUserMessage]);

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

    const emptyStateText = useMemo(() => {
        if (isCrucibleMode) {
            return '先在这里聊纯对话，宿主会把参考内容、金句和资产提示送到中区。';
        }
        return `开始和 ${expertName} 对话`;
    }, [isCrucibleMode, expertName]);

    return (
        <div className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(255,250,244,0.98)_0%,rgba(248,239,226,0.96)_100%)]">
            <div className="border-b border-[var(--line-soft)] bg-[rgba(255,251,245,0.92)] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="grid h-9 w-9 place-items-center rounded-2xl border border-[rgba(166,117,64,0.15)] bg-[var(--surface-1)] text-[13px] font-semibold text-[var(--ink-1)]">聊</div>
                            <div>
                                <div className="mh-display text-[18px] font-semibold tracking-tight text-[var(--ink-1)]">{displayName || expertName}</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleClearHistory}
                            title="清空对话历史"
                            className="rounded-xl p-2 text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--ink-1)]"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onToggle}
                            className="rounded-xl p-2 text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-1)] hover:text-[var(--ink-1)]"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {headerBadges && headerBadges.length > 0 && (
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
                                <div>
                                    <div className="text-[12px] font-medium text-[var(--ink-1)]">{badge.name}</div>
                                    <div className="text-[10px] text-[var(--ink-3)]">{badge.role}</div>
                                </div>
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
                            const author = getMessageAuthor(msg, headerBadges, expertName);
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
                                            <span>{author.role}</span>
                                            <span>·</span>
                                            <span>{getClassificationLabel(msg)}</span>
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
                                    </div>
                                </div>
                            );
                        })}

                        {streamingContent && (
                            <div className="flex gap-3">
                                <div className="grid h-9 w-9 place-items-center rounded-2xl border border-[rgba(146,118,82,0.12)] bg-[var(--surface-1)] text-sm font-semibold text-[var(--ink-1)]">思</div>
                                <div className="max-w-[88%]">
                                    <div className="mb-1 text-[11px] text-[var(--ink-3)]">老张 / 老卢 · 推理中</div>
                                    <div className="rounded-[22px] border border-[rgba(146,118,82,0.16)] bg-[linear-gradient(180deg,#fffaf3_0%,#f7eddf_100%)] px-3.5 py-3 text-[13px] leading-7 text-[var(--ink-1)] shadow-[0_8px_20px_rgba(131,103,70,0.04)]">
                                        {isCrucibleMode
                                            ? '正在整理这一轮的追问，中屏会同步当前焦点。'
                                            : streamingContent}
                                        <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-[rgba(120,93,62,0.45)] align-middle" />
                                    </div>
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
                <div className="flex items-end gap-2">
                    <div className="mb-1 flex flex-col items-center gap-1">
                        <div className="grid h-9 w-9 place-items-center rounded-2xl border border-[rgba(146,118,82,0.12)] bg-[var(--surface-1)] text-sm font-semibold text-[var(--ink-1)]">
                            你
                        </div>
                        <span className="text-[10px] text-[var(--ink-3)]">用户</span>
                    </div>
                    <label className="cursor-pointer rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-0)] p-2 text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)]">
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
                        placeholder={isCrucibleMode ? '主回答继续写在这里。中屏只同步这一轮焦点，不抢右侧主线。' : '先聊问题本身。长参考、金句、结构提示会被宿主自动分流。'}
                        className="min-h-[96px] flex-1 resize-none rounded-[22px] border border-[var(--line-soft)] bg-[rgba(255,255,255,0.72)] px-4 py-3 text-sm text-[var(--ink-1)] outline-none transition-colors placeholder:text-[var(--ink-3)] focus:border-[var(--line-strong)]"
                        rows={3}
                        disabled={isStreaming}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isStreaming || (!inputText.trim() && attachments.length === 0)}
                        className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent)] text-white transition-opacity hover:opacity-90 disabled:bg-[var(--surface-2)] disabled:text-[var(--ink-3)]"
                    >
                        {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ChatPanelContent = ChatPanel;
