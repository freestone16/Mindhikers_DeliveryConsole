import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Paperclip, Loader2, AlertCircle, Check, Trash2 } from 'lucide-react';
import type { ChatMessage, Attachment, ToolCallConfirmation } from '../types';
import { EXPERTS } from '../config/experts';

interface ChatPanelProps {
    isOpen: boolean;
    onToggle: () => void;
    expertId: string;
    projectId: string;
    socket: any;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
    isOpen,
    onToggle,
    expertId,
    projectId,
    socket
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [contextLoaded, setContextLoaded] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [warning, setWarning] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 使用 ref 跟踪当前 expertId，避免闭包问题
    const currentExpertIdRef = useRef(expertId);
    const prevExpertIdRef = useRef<string | null>(null);
    const streamingContentRef = useRef('');
    const messagesRef = useRef<ChatMessage[]>([]);
    const attachmentsRef = useRef<Attachment[]>([]);

    useEffect(() => {
        streamingContentRef.current = streamingContent;
    }, [streamingContent]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        attachmentsRef.current = attachments;
    }, [attachments]);

    const expert = EXPERTS.find(e => e.id === expertId);
    const expertName = expert?.name || expertId;
    const getMessageKind = (msg: ChatMessage) => msg.kind || (msg.role === 'system' ? 'system_status' : 'chat');

    const setMessagesWithRef = useCallback((nextMessages: ChatMessage[]) => {
        messagesRef.current = nextMessages;
        setMessages(nextMessages);
    }, []);

    const appendMessage = useCallback((message: ChatMessage) => {
        const nextMessages = [...messagesRef.current, message];
        setMessagesWithRef(nextMessages);
    }, [setMessagesWithRef]);

    const releaseAttachments = useCallback((items: Attachment[]) => {
        items.forEach(att => {
            if (att.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(att.previewUrl);
            }
        });
    }, []);

    // 更新 ref
    useEffect(() => {
        currentExpertIdRef.current = expertId;
    }, [expertId]);

    // Auto scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent]);

    // Socket event handlers - 只注册一次
    useEffect(() => {
        if (!socket) return;

        const appendAssistantMessage = (content: string) => {
            if (!content) return;
            appendMessage({
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content,
                kind: 'chat',
                timestamp: new Date().toISOString(),
            });
        };

        const appendSystemMessage = (content: string, systemTitle: string) => {
            if (!content) return;
            appendMessage({
                id: `msg_${Date.now()}`,
                role: 'system',
                content,
                kind: 'system_status',
                systemTitle,
                timestamp: new Date().toISOString(),
            });
        };

        const flushStreamingMessage = () => {
            const currentStreaming = streamingContentRef.current;
            if (!currentStreaming) return;
            appendAssistantMessage(currentStreaming);
            streamingContentRef.current = '';
            setStreamingContent('');
        };

        const handleChatChunk = ({ chunk, expertId: msgExpertId }: { chunk: string; expertId: string }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;
            setStreamingContent(prev => {
                const next = prev + chunk;
                streamingContentRef.current = next;
                return next;
            });
        };

        const handleChatDone = ({ expertId: msgExpertId }: { expertId: string }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;
            flushStreamingMessage();
            setIsStreaming(false);
        };

        const handleChatError = ({ error, expertId: msgExpertId }: { error: string; expertId: string }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;
            console.error('Chat error:', error);
            setIsStreaming(false);
            setStreamingContent('');
            streamingContentRef.current = '';
            // 显示错误
            const errorMessage: ChatMessage = {
                id: `msg_${Date.now()}`,
                role: 'system',
                content: `❌ 错误: ${error}`,
                kind: 'system_status',
                systemTitle: '系统错误',
                timestamp: new Date().toISOString(),
            };
            appendMessage(errorMessage);
        };

        const handleChatWarning = ({ warning: msg, expertId: msgExpertId }: { warning: string; expertId: string }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;
            setWarning(msg);
            setTimeout(() => setWarning(null), 3000);
        };

        const handleChatHistory = ({ expertId: msgExpertId, messages: history }: { expertId: string; messages: ChatMessage[] }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;
            console.log('Received chat history:', history.length, 'messages for', msgExpertId);
            setMessagesWithRef(history);
        };

        const handleChatContextLoaded = ({ expertId: msgExpertId }: { expertId: string }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;
            setContextLoaded(true);
        };

        const handleChatConfirmation = ({ expertId: msgExpertId, message }: { expertId: string; message: string }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;
            flushStreamingMessage();
            appendSystemMessage(message, '系统澄清');
            setIsStreaming(false);
        };

        const handleChatActionConfirm = (data: {
            expertId: string;
            confirmId: string;
            actionName: string;
            actionArgs: any;
            description: string;
            title?: string;
            targetLabel?: string;
            diffLabel?: string;
        }) => {
            if (data.expertId !== currentExpertIdRef.current) return;
            flushStreamingMessage();
            setIsStreaming(false);
            appendMessage({
                id: `msg_${Date.now()}`,
                role: 'system',
                content: '',
                kind: 'system_action',
                timestamp: new Date().toISOString(),
                actionConfirm: {
                    confirmId: data.confirmId,
                    actionName: data.actionName,
                    actionArgs: data.actionArgs,
                    description: data.description,
                    title: data.title,
                    targetLabel: data.targetLabel,
                    diffLabel: data.diffLabel,
                    status: 'pending'
                }
            });
        };

        const handleChatActionResult = (data: { expertId: string; success: boolean; message: string }) => {
            if (data.expertId !== currentExpertIdRef.current) return;
            setIsStreaming(false);
            // 找到最近的 confirmed action 消息，更新其状态为 executed，避免追加重复消息
            const msgs = [...messagesRef.current];
            const lastConfirmedIdx = msgs.findLastIndex(
                (m: any) => m.actionConfirm?.status === 'confirmed'
            );
            if (lastConfirmedIdx >= 0) {
                msgs[lastConfirmedIdx] = {
                    ...msgs[lastConfirmedIdx],
                    actionConfirm: {
                        ...(msgs[lastConfirmedIdx] as any).actionConfirm,
                        status: 'executed',
                        resultMessage: data.message,
                        resultSuccess: data.success,
                    }
                };
                setMessagesWithRef(msgs);
            } else {
                // 没找到匹配的 confirmed action，fallback 追加系统消息
                appendSystemMessage(data.message, '系统执行结果');
            }
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

        console.log('Chat socket events registered');

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
    }, [socket, appendMessage, setMessagesWithRef]);

    useEffect(() => {
        return () => {
            releaseAttachments(attachmentsRef.current);
        };
    }, [releaseAttachments]);

    // Load history when expert changes
    useEffect(() => {
        if (!socket || !isOpen || !projectId) return;

        // 如果 expertId 变化了
        if (prevExpertIdRef.current !== expertId) {
            console.log('Expert changed from', prevExpertIdRef.current, 'to', expertId);

            // 重置状态
            setMessages([]);
            messagesRef.current = [];
            setContextLoaded(false);
            setStreamingContent('');
            streamingContentRef.current = '';
            setIsStreaming(false);
            releaseAttachments(attachments);
            setAttachments([]);

            // 加载新专家的历史
            socket.emit('chat-load-history', { expertId, projectId });

            prevExpertIdRef.current = expertId;
        }
    }, [expertId, projectId, socket, isOpen, attachments, releaseAttachments]);

    // 首次打开时加载历史
    useEffect(() => {
        if (socket && isOpen && messages.length === 0 && projectId) {
            console.log('Loading history for', expertId);
            socket.emit('chat-load-history', { expertId, projectId });
        }
    }, [isOpen, projectId]);

    const handleSend = useCallback(() => {
        if (!inputText.trim() && attachments.length === 0) return;
        if (isStreaming || !socket) return;

        console.log('Sending message for expert:', expertId);

        const userMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: inputText,
            kind: 'chat',
            timestamp: new Date().toISOString(),
            attachments: attachments.length > 0
                ? attachments.map(att => ({
                    ...att,
                    previewUrl: att.base64,
                }))
                : undefined,
        };

        appendMessage(userMessage);
        setInputText('');
        releaseAttachments(attachments);
        setAttachments([]);
        setIsStreaming(true);
        setStreamingContent('');
        streamingContentRef.current = '';

        // Load context on first message
        if (!contextLoaded) {
            socket.emit('chat-load-context', { expertId, projectId });
        }

        // Send to backend
        const messagesToSend = [...messagesRef.current, userMessage];
        socket.emit('chat-stream', {
            messages: messagesToSend,
            expertId,
            projectId,
        });
    }, [inputText, attachments, isStreaming, socket, contextLoaded, expertId, projectId, appendMessage, releaseAttachments]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleConfirmAction = (actionConfirm: ToolCallConfirmation) => {
        const nextMessages = messagesRef.current.map(msg =>
            msg.actionConfirm?.confirmId === actionConfirm.confirmId
                ? { ...msg, actionConfirm: { ...actionConfirm, status: 'confirmed' } }
                : msg
        );
        setMessagesWithRef(nextMessages);
        setIsStreaming(true);
        socket?.emit('chat-save', { expertId, projectId, messages: nextMessages });
        socket?.emit('chat-action-execute', {
            expertId,
            projectId,
            actionName: actionConfirm.actionName,
            actionArgs: actionConfirm.actionArgs,
            historyMessages: nextMessages
        });
    };

    const handleCancelAction = (actionConfirm: ToolCallConfirmation) => {
        const nextMessages = messagesRef.current.map(msg =>
            msg.actionConfirm?.confirmId === actionConfirm.confirmId
                ? { ...msg, actionConfirm: { ...actionConfirm, status: 'cancelled' }, content: '已取消该操作。' }
                : msg
        );
        setMessagesWithRef(nextMessages);
        socket?.emit('chat-save', { expertId, projectId, messages: nextMessages });
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

    const processImageFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            const previewUrl = URL.createObjectURL(file);
            setAttachments(prev => [...prev, {
                type: 'image',
                name: file.name,
                base64,
                previewUrl,
            }]);
        };
        reader.readAsDataURL(file);
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => {
            URL.revokeObjectURL(prev[index].previewUrl);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleClearHistory = () => {
        if (!window.confirm('确定要清空对话历史吗？')) return;
        socket?.emit('chat-clear-history', { expertId, projectId });
        setMessagesWithRef([]);
    };

    return (
        <div className="flex flex-col h-full ChatPanel-root">
            <div className="h-12 px-4 flex items-center justify-between border-b border-slate-700/50 bg-slate-900/50 flex-shrink-0 ChatPanel-header">
                <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <span className="font-medium text-white text-sm ChatPanel-header-title">{expertName}</span>
                    {contextLoaded && (
                        <span className="text-xs text-green-400" title="上下文已加载">●</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleClearHistory}
                        title="清空对话历史"
                        className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-all ChatPanel-clear-btn"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onToggle}
                        className="p-1 hover:bg-slate-700 rounded transition-colors ChatPanel-close-btn"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            </div>
            {/* Warning Toast */}
            {warning && (
                <div className="mx-4 mt-2 px-3 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-300 text-xs flex items-center gap-2 ChatPanel-warning-toast">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {warning}
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 ChatPanel-messages" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
                {messages.length === 0 && !streamingContent ? (
                    <div className="text-center text-slate-500 text-sm mt-8 ChatPanel-empty">
                        <p>开始和 {expertName} 对话</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            getMessageKind(msg) === 'chat' ? (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white ChatPanel-bubble-user'
                                        : 'bg-slate-800 text-slate-200 ChatPanel-bubble-assistant'
                                        }`}
                                >
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {msg.attachments.map((att, i) => (
                                                att.previewUrl.startsWith('data:') || att.previewUrl.startsWith('blob:')
                                                    ? (
                                                        <img
                                                            key={i}
                                                            src={att.previewUrl}
                                                            alt={att.name}
                                                            className="w-16 h-16 object-cover rounded"
                                                        />
                                                    ) : (
                                                        <div
                                                            key={i}
                                                            className="min-w-16 max-w-24 rounded bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300 ChatPanel-attachment-name"
                                                        >
                                                            {att.name}
                                                        </div>
                                                    )
                                            ))}
                                        </div>
                                    )}
                                    {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                                </div>
                            </div>
                            ) : (
                            <div key={msg.id} className="flex justify-center">
                                <div className={`w-full max-w-[92%] rounded-xl border px-4 py-3 text-sm ${
                                    getMessageKind(msg) === 'system_action'
                                        ? 'bg-amber-900/20 border-amber-600/50 text-amber-100 ChatPanel-action-card'
                                        : 'bg-slate-900/80 border-slate-700 text-slate-200 ChatPanel-system-card'
                                }`}>
                                    <p className={`mb-2 font-medium ${getMessageKind(msg) === 'system_action' ? 'text-amber-200' : 'text-slate-300 ChatPanel-system-card-title'}`}>
                                        {msg.systemTitle || msg.actionConfirm?.title || '系统消息'}
                                    </p>
                                    {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                                    {msg.actionConfirm && (
                                        <div className="mt-2">
                                            <p className="text-sm mb-2">{msg.actionConfirm.description}</p>
                                            {msg.actionConfirm.targetLabel && (
                                                <p className="text-xs mb-1 opacity-80">{msg.actionConfirm.targetLabel}</p>
                                            )}
                                            {msg.actionConfirm.diffLabel && (
                                                <p className="text-xs mb-3 opacity-70">{msg.actionConfirm.diffLabel}</p>
                                            )}
                                            {msg.actionConfirm.status === 'pending' ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleConfirmAction(msg.actionConfirm!)}
                                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded flex-1 flex items-center justify-center gap-1 transition-colors border border-green-500 ChatPanel-confirm-btn"
                                                    >
                                                        <Check className="w-3 h-3" /> 确认执行
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancelAction(msg.actionConfirm!)}
                                                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded flex-1 flex items-center justify-center gap-1 transition-colors border border-slate-600 ChatPanel-cancel-btn"
                                                    >
                                                        <X className="w-3 h-3" /> 取消
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className={`text-xs font-medium px-2 py-1 rounded inline-block ${msg.actionConfirm.status === 'confirmed'
                                                    ? 'bg-green-900/50 text-green-400 border border-green-800 ChatPanel-status-confirmed'
                                                    : 'bg-slate-800 text-slate-400 border border-slate-700 ChatPanel-status-cancelled'
                                                    }`}>
                                                    {msg.actionConfirm.status === 'confirmed' ? '✓ 已确认' : '✕ 已取消'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            )
                        ))}
                        {streamingContent && (
                            <div className="flex justify-start">
                                <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm bg-slate-800 text-slate-200 ChatPanel-bubble-streaming">
                                    <p className="whitespace-pre-wrap">{streamingContent}<span className="inline-block w-2 h-4 bg-slate-400 animate-pulse ml-1 ChatPanel-cursor">▋</span></p>
                                </div>
                            </div>
                        )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Attachment Preview */}
            {attachments.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-700/50 flex flex-wrap gap-2 flex-shrink-0">
                    {attachments.map((att, i) => (
                        <div key={i} className="relative">
                            <img
                                src={att.previewUrl}
                                alt={att.name}
                                className="w-12 h-12 object-cover rounded"
                            />
                            <button
                                onClick={() => removeAttachment(i)}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center ChatPanel-attachment-remove"
                            >
                                <X className="w-3 h-3 text-white" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-slate-700/50 flex-shrink-0 ChatPanel-input-area">
                <div className="flex items-end gap-2">
                    <label className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400 cursor-pointer ChatPanel-attach-btn">
                        <Paperclip className="w-4 h-4" />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileInput}
                            className="hidden"
                        />
                    </label>
                    <textarea
                        value={inputText}
                        onChange={(e) => {
                            setInputText(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.max(88, Math.min(e.target.scrollHeight, 240))}px`;
                        }}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder="输入消息或指令（Shift+Enter 换行）..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-blue-500 overflow-y-auto ChatPanel-input-textarea"
                        rows={3}
                        style={{ height: '88px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isStreaming || (!inputText.trim() && attachments.length === 0)}
                        className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors ChatPanel-send-btn"
                    >
                        {isStreaming ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ChatPanelContent = ChatPanel;
