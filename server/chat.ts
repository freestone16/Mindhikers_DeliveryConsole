import fs from 'fs';
import path from 'path';
import type { ChatMessage, ChatHistory, ExpertContextMap } from '../src/types';
import { loadConfig } from './llm-config';
import { buildExpertChatSystemPrompt } from './skill-loader';
import { PROVIDER_INFO } from '../src/schemas/llm-config';
import { getProjectRoot as resolveProjectRoot } from './project-paths';

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | ContentPart[];
}

export interface ContentPart {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
}

// Dynamically derived from the single source of truth: PROVIDER_INFO in src/schemas/llm-config.ts
// Adding a new provider to the schema automatically makes it available here — no manual edits needed.
const PROVIDER_BASE_URLS: Record<string, string> = Object.fromEntries(
    Object.entries(PROVIDER_INFO).map(([id, info]) => [id, info.baseUrl])
);

const PROVIDER_ENV_KEYS: Record<string, string> = Object.fromEntries(
    Object.entries(PROVIDER_INFO).map(([id, info]) => [id, info.envVars[0]])
);

// Providers that support OpenAI-compatible Function Calling
// Derived from PROVIDER_INFO: all LLM-type providers are assumed to support FC unless excluded.
const FC_PROVIDERS = new Set(
    Object.entries(PROVIDER_INFO)
        .filter(([, info]) => info.type === 'llm')
        .map(([id]) => id)
);

import type { ToolDefinition, ToolCallResult } from '../src/types';

export async function* callLLMStream(
    messages: LLMMessage[],
    provider: string,
    model: string,
    baseUrl?: string | null,
    tools?: ToolDefinition[]
): AsyncGenerator<string | ToolCallResult> {
    const apiKey = process.env[PROVIDER_ENV_KEYS[provider] || ''];
    if (!apiKey) {
        throw new Error(`API Key not configured for provider: ${provider}`);
    }

    const url = baseUrl || PROVIDER_BASE_URLS[provider];
    if (!url) {
        throw new Error(`Unknown provider: ${provider}`);
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
    } else if (provider === 'google') {
        headers['x-goog-api-key'] = apiKey;
    } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const body: Record<string, unknown> = {
        model,
        messages,
        stream: true,
        max_tokens: 4096,
    };

    if (tools && tools.length > 0 && FC_PROVIDERS.has(provider)) {
        body.tools = tools;
        body.tool_choice = 'auto';
    }


    let endpoint = `${url}/chat/completions`;
    if (provider === 'anthropic') {
        endpoint = `${url}/messages`;
    } else if (provider === 'google') {
        endpoint = `${url}/models/${model}:streamGenerateContent?alt=sse`;
        body.contents = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: typeof m.content === 'string' ? m.content : m.content.map(p => p.text).join('') }]
        }));
        delete body.messages;
        delete body.max_tokens;
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    // Track multiple parallel tool_calls by their index
    const pendingToolCalls = new Map<number, { name: string; args: string }>();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const json = JSON.parse(data);

                    if (provider === 'anthropic') {
                        if (json.type === 'content_block_delta' && json.delta?.text) {
                            yield json.delta.text;
                        }
                    } else if (provider === 'google') {
                        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) yield text;
                    } else {
                        // Handle OpenAI-compatible providers (openai, deepseek, kimi, siliconflow, etc.)
                        const delta = json.choices?.[0]?.delta;
                        if (delta?.content) {
                            yield delta.content;
                        } else if (delta?.tool_calls?.length > 0) {
                            for (const tc of delta.tool_calls) {
                                const idx = tc.index ?? 0;
                                if (!pendingToolCalls.has(idx)) {
                                    pendingToolCalls.set(idx, { name: '', args: '' });
                                }
                                const entry = pendingToolCalls.get(idx)!;
                                if (tc.function?.name) {
                                    entry.name = tc.function.name;
                                }
                                if (tc.function?.arguments) {
                                    entry.args += tc.function.arguments;
                                }
                            }
                        }
                    }
                } catch {
                    // Skip invalid JSON
                }
            }
        }
    }

    // After the stream is fully consumed, yield each accumulated tool_call
    for (const [idx, tc] of pendingToolCalls) {
        if (tc.name) {
            console.log(`[LLM-Stream] Final tool_call[${idx}] => name: ${tc.name}, args: ${tc.args}`);
            yield {
                type: 'tool_call',
                functionName: tc.name,
                arguments: tc.args
            } as ToolCallResult;
        }
    }
}

export function loadExpertContext(
    projectRoot: string,
    expertId: string,
    scriptPath?: string
): { systemPrompt: string; contextMap: ExpertContextMap } {
    const EXPERTS_OUTPUT_DIRS: Record<string, string> = {
        Director: '04_Visuals',
        MusicDirector: '04_Music_Plan',
        ThumbnailMaster: '03_Thumbnail_Plan',
        MarketingMaster: '05_Marketing',
        ShortsMaster: '05_Shorts_Output',
        Writer: '02_Script',
    };

    const EXPERT_NAMES: Record<string, string> = {
        Director: '影视导演大师',
        MusicDirector: '音乐总监',
        ThumbnailMaster: '缩略图大师',
        MarketingMaster: '营销大师',
        ShortsMaster: '短视频大师',
        Writer: '写作大师',
    };

    const outputDir = EXPERTS_OUTPUT_DIRS[expertId] || '';
    const expertName = EXPERT_NAMES[expertId] || expertId;

    let contextContent = '';
    const keyFiles: string[] = [];

    if (outputDir) {
        const fullOutputDir = path.join(projectRoot, outputDir);
        if (fs.existsSync(fullOutputDir)) {
            const files = fs.readdirSync(fullOutputDir)
                .filter(f => f.endsWith('.md') || f.endsWith('.json'))
                .slice(0, 3);

            for (const file of files) {
                const filePath = path.join(fullOutputDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const truncated = content.slice(0, 2000);
                    contextContent += `\n\n### ${file}\n${truncated}`;
                    keyFiles.push(file);
                } catch {
                    // Skip unreadable files
                }
            }
        }
    }

    const basePrompt = buildExpertChatSystemPrompt(expertId) || `你是${expertName}的助手。你正在帮助用户完成视频制作任务。`;

    const systemPrompt = `${basePrompt}
当前专家产出目录: ${outputDir}
${contextContent ? `\n以下是该专家已有的产出内容（供参考）:${contextContent}` : ''}

请根据用户的问题提供专业、有帮助的回答。如果需要，可以参考已有的产出内容。`;

    const contextMap: ExpertContextMap = {
        [expertId]: {
            outputDir,
            keyFiles,
        },
    };

    return { systemPrompt, contextMap };
}

export function loadChatHistory(projectRoot: string, expertId: string, scriptPath?: string): ChatMessage[] {
    const chatDir = path.join(projectRoot, '.tasks', 'chat_history');
    const filename = scriptPath ? `${expertId}_${path.basename(scriptPath, '.md')}.json` : `${expertId}.json`;
    const chatFile = path.join(chatDir, filename);

    if (!fs.existsSync(chatFile)) {
        return [];
    }

    try {
        const content = fs.readFileSync(chatFile, 'utf-8');
        const history: ChatHistory = JSON.parse(content);
        return (history.messages || []).filter(
            msg => !(msg.role === 'assistant' && typeof msg.content === 'string' && msg.content.startsWith('[System Log: Executed tool'))
        );
    } catch {
        return [];
    }
}

export function clearChatHistory(projectRoot: string, expertId: string, scriptPath?: string): void {
    const chatDir = path.join(projectRoot, '.tasks', 'chat_history');
    const filename = scriptPath ? `${expertId}_${path.basename(scriptPath, '.md')}.json` : `${expertId}.json`;
    const chatFile = path.join(chatDir, filename);
    if (fs.existsSync(chatFile)) {
        try {
            fs.unlinkSync(chatFile);
            console.log(`[Chat] History cleared for ${expertId}`);
        } catch (e) {
            console.error(`Failed to clear history for ${expertId}:`, e);
        }
    }
}

export function saveChatHistory(
    projectRoot: string,
    expertId: string,
    messages: ChatMessage[],
    scriptPath?: string
): void {
    const chatDir = path.join(projectRoot, '.tasks', 'chat_history');

    if (!fs.existsSync(chatDir)) {
        fs.mkdirSync(chatDir, { recursive: true });
    }

    // 清理附件 base64，用占位符替换
    const cleanedMessages = messages.map(msg => ({
        ...msg,
        attachments: msg.attachments?.map(att => ({
            ...att,
            base64: `[image: ${att.name}]`,
            previewUrl: `[image: ${att.name}]`,
        })),
    }));

    const history: ChatHistory = {
        expertId,
        projectId: path.basename(projectRoot),
        messages: cleanedMessages,
        lastUpdated: new Date().toISOString(),
    };

    const filename = scriptPath ? `${expertId}_${path.basename(scriptPath, '.md')}.json` : `${expertId}.json`;
    const chatFile = path.join(chatDir, filename);
    fs.writeFileSync(chatFile, JSON.stringify(history, null, 2));
}

export function formatMultimodalMessages(
    messages: ChatMessage[],
    provider: string
): { formatted: LLMMessage[]; warning?: string } {
    const formatted: LLMMessage[] = [];
    let hasImages = false;
    let imagesStripped = false;

    const supportsImages = ['openai', 'anthropic', 'google', 'siliconflow'].includes(provider);

    for (const msg of messages) {
        if (msg.kind && msg.kind !== 'chat') {
            continue;
        }

        let textContent = msg.content;

        // Fix for Kimi / OpenAI strict validation: message with role 'assistant' must not be empty
        // If content is empty (common when it was purely a function call), we inject a placeholder
        if (!textContent && msg.role === 'assistant') {
            if (msg.actionConfirm) {
                textContent = msg.actionConfirm.description || '已提出一个待确认的操作。';
            } else {
                textContent = ' ';
            }
        }

        // Similarly for user, though rarely happens
        if (!textContent && msg.role === 'user') {
            textContent = ' ';
        }

        if (msg.attachments && msg.attachments.length > 0) {
            hasImages = true;

            if (!supportsImages) {
                imagesStripped = true;
                formatted.push({
                    role: msg.role,
                    content: textContent,
                });
                continue;
            }

            const content: ContentPart[] = [
                { type: 'text', text: textContent },
            ];

            for (const att of msg.attachments) {
                if (att.type === 'image') {
                    if (provider === 'anthropic') {
                        const base64Data = att.base64.split(',')[1] || att.base64;
                        content.push({
                            type: 'image_url',
                            image_url: { url: `data:image/png;base64,${base64Data}` },
                        });
                    } else {
                        content.push({
                            type: 'image_url',
                            image_url: { url: att.base64 },
                        });
                    }
                }
            }

            formatted.push({
                role: msg.role,
                content,
            });
        } else {
            formatted.push({
                role: msg.role,
                content: textContent,
            });
        }
    }

    return {
        formatted,
        warning: imagesStripped
            ? '当前模型不支持图片输入，已忽略附件'
            : undefined,
    };
}

export function getProjectRoot(projectId: string): string {
    return resolveProjectRoot(projectId);
}

// End of file
