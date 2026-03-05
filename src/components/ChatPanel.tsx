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

    useEffect(() => {
        streamingContentRef.current = streamingContent;
    }, [streamingContent]);

    const expert = EXPERTS.find(e => e.id === expertId);
    const expertName = expert?.name || expertId;

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

        const handleChatChunk = ({ chunk, expertId: msgExpertId }: { chunk: string; expertId: string }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;
            setStreamingContent(prev => prev + chunk);
        };

        const handleChatDone = ({ expertId: msgExpertId }: { expertId: string }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;

            setStreamingContent(prev => {
                if (prev) {
                    const aiMessage: ChatMessage = {
                        id: `msg_${Date.now()}`,
                        role: 'assistant',
                        content: prev,
                        timestamp: new Date().toISOString(),
                    };
                    setMessages(msgs => [...msgs, aiMessage]);
                }
                return '';
            });
            setIsStreaming(false);
        };

        const handleChatError = ({ error, expertId: msgExpertId }: { error: string; expertId: string }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;
            console.error('Chat error:', error);
            setIsStreaming(false);
            setStreamingContent('');
            // 显示错误
            const errorMessage: ChatMessage = {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: `❌ 错误: ${error}`,
                timestamp: new Date().toISOString(),
            };
            setMessages(msgs => [...msgs, errorMessage]);
        };

        const handleChatWarning = ({ warning: msg, expertId: msgExpertId }: { warning: string; expertId: string }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;
            setWarning(msg);
            setTimeout(() => setWarning(null), 3000);
        };

        const handleChatHistory = ({ expertId: msgExpertId, messages: history }: { expertId: string; messages: ChatMessage[] }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;
            console.log('Received chat history:', history.length, 'messages for', msgExpertId);
            setMessages(history);
        };

        const handleChatContextLoaded = ({ expertId: msgExpertId }: { expertId: string }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;
            setContextLoaded(true);
        };

        const handleChatConfirmation = ({ expertId: msgExpertId, message }: { expertId: string; message: string }) => {
            if (msgExpertId !== currentExpertIdRef.current) return;

            // 直接显示确认消息
            const confirmMessage: ChatMessage = {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: message,
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, confirmMessage]);
            setIsStreaming(false);
        };

        const handleChatActionConfirm = (data: { expertId: string; confirmId: string; actionName: string; actionArgs: any; description: string }) => {
            if (data.expertId !== prevExpertIdRef.current) return;

            // Fix: If there's streaming content, convert it to a message first so it doesn't disappear
            const currentStreaming = streamingContentRef.current;
            if (currentStreaming) {
                const textMsg: ChatMessage = {
                    id: `msg_text_${Date.now()}`,
                    role: 'assistant',
                    content: currentStreaming,
                    timestamp: new Date().toISOString(),
                };
                setMessages(prev => [...prev, textMsg]);
            }

            setIsStreaming(false);
            setStreamingContent('');
            setMessages(prev => [...prev, {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: '',
                timestamp: new Date().toISOString(),
                actionConfirm: {
                    confirmId: data.confirmId,
                    actionName: data.actionName,
                    actionArgs: data.actionArgs,
                    description: data.description,
                    status: 'pending'
                }
            }]);
        };

        const handleChatActionResult = (data: { expertId: string; success: boolean; message: string }) => {
            if (data.expertId !== prevExpertIdRef.current) return;
            setIsStreaming(false);
            setMessages(prev => [...prev, {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: data.message,
                timestamp: new Date().toISOString()
            }]);
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
    }, [socket]);

    // Load history when expert changes
    useEffect(() => {
        if (!socket || !isOpen || !projectId) return;

        // 如果 expertId 变化了
        if (prevExpertIdRef.current !== expertId) {
            console.log('Expert changed from', prevExpertIdRef.current, 'to', expertId);

            // 重置状态
            setMessages([]);
            setContextLoaded(false);
            setStreamingContent('');

            // 加载新专家的历史
            socket.emit('chat-load-history', { expertId, projectId });

            prevExpertIdRef.current = expertId;
        }
    }, [expertId, projectId, socket, isOpen]);

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
            timestamp: new Date().toISOString(),
            attachments: attachments.length > 0 ? [...attachments] : undefined,
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setAttachments([]);
        setIsStreaming(true);
        setStreamingContent('');

        // Load context on first message
        if (!contextLoaded) {
            socket.emit('chat-load-context', { expertId, projectId });
        }

        // Send to backend
        const messagesToSend = [...messages, userMessage];
        socket.emit('chat-stream', {
            messages: messagesToSend,
            expertId,
            projectId,
        });
    }, [inputText, attachments, isStreaming, socket, messages, contextLoaded, expertId, projectId]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleConfirmAction = (actionConfirm: ToolCallConfirmation) => {
        setMessages(prev => prev.map(msg =>
            msg.actionConfirm?.confirmId === actionConfirm.confirmId
                ? { ...msg, actionConfirm: { ...actionConfirm, status: 'confirmed' } }
                : msg
        ));
        setIsStreaming(true);
        socket?.emit('chat-action-execute', {
            expertId,
            projectId,
            actionName: actionConfirm.actionName,
            actionArgs: actionConfirm.actionArgs,
            originalMessages: messages.filter(m => m.actionConfirm?.status !== 'pending')
        });
    };

    const handleCancelAction = (actionConfirm: ToolCallConfirmation) => {
        setMessages(prev => prev.map(msg =>
            msg.actionConfirm?.confirmId === actionConfirm.confirmId
                ? { ...msg, actionConfirm: { ...actionConfirm, status: 'cancelled' }, content: '已取消该操作。' }
                : msg
        ));
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
        setMessages([]);
    };

    return (
        <div className="flex flex-col h-full bg-[#0b1529]/80 backdrop-blur-md">
            {/* Header */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-slate-700/50 bg-slate-900/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <span className="font-medium text-white text-sm">{expertName}</span>
                    {contextLoaded && (
                        <span className="text-xs text-green-400" title="上下文已加载">●</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleClearHistory}
                        title="清空对话历史"
                        className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onToggle}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Warning Toast */}
            {warning && (
                <div className="mx-4 mt-2 px-3 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {warning}
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
                {messages.length === 0 && !streamingContent ? (
                    <div className="text-center text-slate-500 text-sm mt-8">
                        <p>开始和 {expertName} 对话</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-800 text-slate-200'
                                        }`}
                                >
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {msg.attachments.map((att, i) => (
                                                <img
                                                    key={i}
                                                    src={att.previewUrl}
                                                    alt={att.name}
                                                    className="w-16 h-16 object-cover rounded"
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                                    {msg.actionConfirm && (
                                        <div className="mt-2 bg-amber-900/30 border border-amber-600/50 rounded-lg p-3">
                                            <p className="text-amber-200 text-sm mb-3 font-medium">
                                                🤖 {msg.actionConfirm.description}
                                            </p>
                                            {msg.actionConfirm.status === 'pending' ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleConfirmAction(msg.actionConfirm!)}
                                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded flex-1 flex items-center justify-center gap-1 transition-colors border border-green-500"
                                                    >
                                                        <Check className="w-3 h-3" /> 确认执行
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancelAction(msg.actionConfirm!)}
                                                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded flex-1 flex items-center justify-center gap-1 transition-colors border border-slate-600"
                                                    >
                                                        <X className="w-3 h-3" /> 取消
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className={`text-xs font-medium px-2 py-1 rounded inline-block ${msg.actionConfirm.status === 'confirmed'
                                                    ? 'bg-green-900/50 text-green-400 border border-green-800'
                                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                                    }`}>
                                                    {msg.actionConfirm.status === 'confirmed' ? '✓ 已确认' : '✕ 已取消'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {streamingContent && (
                            <div className="flex justify-start">
                                <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm bg-slate-800 text-slate-200">
                                    <p className="whitespace-pre-wrap">{streamingContent}<span className="inline-block w-2 h-4 bg-slate-400 animate-pulse ml-1">▋</span></p>
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
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                            >
                                <X className="w-3 h-3 text-white" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-slate-700/50 flex-shrink-0">
                <div className="flex items-end gap-2">
                    <label className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400 cursor-pointer">
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
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-blue-500 overflow-y-auto"
                        rows={3}
                        disabled={isStreaming}
                        style={{ height: '88px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isStreaming || (!inputText.trim() && attachments.length === 0)}
                        className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors"
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
