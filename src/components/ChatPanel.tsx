import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Paperclip, Loader2, AlertCircle } from 'lucide-react';
import type { ChatMessage, Attachment } from '../types';
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

        socket.on('chat-chunk', handleChatChunk);
        socket.on('chat-done', handleChatDone);
        socket.on('chat-error', handleChatError);
        socket.on('chat-warning', handleChatWarning);
        socket.on('chat-history', handleChatHistory);
        socket.on('chat-context-loaded', handleChatContextLoaded);

        console.log('Chat socket events registered');

        return () => {
            socket.off('chat-chunk', handleChatChunk);
            socket.off('chat-done', handleChatDone);
            socket.off('chat-error', handleChatError);
            socket.off('chat-warning', handleChatWarning);
            socket.off('chat-history', handleChatHistory);
            socket.off('chat-context-loaded', handleChatContextLoaded);
        };
    }, [socket]);

    // Load history when expert changes
    useEffect(() => {
        if (!socket || !isOpen) return;

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
        if (socket && isOpen && messages.length === 0) {
            console.log('Loading history for', expertId);
            socket.emit('chat-load-history', { expertId, projectId });
        }
    }, [isOpen]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed top-[72px] right-0 bottom-[32px] w-[360px] bg-[#0a1220] border-l border-slate-700/50 flex flex-col z-40">
            {/* Header */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-slate-700/50 bg-slate-900/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <span className="font-medium text-white text-sm">{expertName}</span>
                    {contextLoaded && (
                        <span className="text-xs text-green-400" title="上下文已加载">●</span>
                    )}
                </div>
                <button
                    onClick={onToggle}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                >
                    <X className="w-4 h-4 text-slate-400" />
                </button>
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
                                    className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                                        msg.role === 'user'
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
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
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
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder="输入消息..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-blue-500"
                        rows={1}
                        disabled={isStreaming}
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
