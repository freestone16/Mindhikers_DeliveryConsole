import type { ChatIntent, ModifyAction } from '../src/types';
import { loadConfig } from './llm-config';
import type { LLMMessage } from './chat';

interface ScriptData {
    id: string;
    index: number;
    scriptText: string;
    cta?: any;
    hookType?: string;
    [key: string]: any;
}

interface ModificationResult {
    success: boolean;
    data?: {
        scriptId?: string;
        updates?: Record<string, any>;
        scripts?: Array<{ scriptId: string; updates: any }>;
    };
    error?: string;
}

async function callLLM(messages: LLMMessage[], provider: string, model: string): Promise<string> {
    const PROVIDER_ENV_KEYS: Record<string, string> = {
        openai: 'OPENAI_API_KEY',
        anthropic: 'ANTHROPIC_API_KEY',
        deepseek: 'DEEPSEEK_API_KEY',
        zhipu: 'ZHIPU_API_KEY',
        google: 'GOOGLE_API_KEY',
        siliconflow: 'SILICONFLOW_API_KEY',
    };

    const PROVIDER_BASE_URLS: Record<string, string> = {
        openai: 'https://api.openai.com/v1',
        anthropic: 'https://api.anthropic.com/v1',
        deepseek: 'https://api.deepseek.com/v1',
        zhipu: 'https://open.bigmodel.cn/api/paas/v4',
        google: 'https://generativelanguage.googleapis.com/v1beta',
        siliconflow: 'https://api.siliconflow.cn/v1',
    };

    const apiKey = process.env[PROVIDER_ENV_KEYS[provider] || ''];
    if (!apiKey) {
        throw new Error(`API Key not configured for provider: ${provider}`);
    }

    const url = PROVIDER_BASE_URLS[provider];
    const endpoint = `${url}/chat/completions`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 2048,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

export async function executeModification(
    target: ChatIntent['target'],
    context: {
        scripts: ScriptData[];
        projectId: string;
    }
): Promise<ModificationResult> {
    if (!target) {
        return { success: false, error: 'No target specified' };
    }

    const config = loadConfig();
    const { provider, model } = config.global;

    try {
        switch (target.action) {
            case 'update_script_text': {
                const scriptId = target.targetId;
                const script = context.scripts.find(s => s.id === scriptId);
                
                if (!script) {
                    return { success: false, error: `Script not found: ${scriptId}` };
                }

                const systemPrompt = `你是一个专业的短视频脚本编辑助手。用户会给你一个现有的脚本和修改要求，你需要根据要求修改脚本。

规则：
1. 只返回修改后的脚本内容，不要添加任何解释
2. 保持脚本的核心信息和风格
3. 控制在合理的字数范围内`;

                const messages: LLMMessage[] = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `原脚本：
${script.scriptText}

修改要求：
${target.payload?.userMessage || '请根据上下文修改'}

请直接返回修改后的脚本内容：` }
                ];

                const newScriptText = await callLLM(messages, provider, model);

                return {
                    success: true,
                    data: {
                        scriptId,
                        updates: { 
                            scriptText: newScriptText,
                            status: 'editing'
                        }
                    }
                };
            }

            case 'update_cta': {
                const scriptId = target.targetId;
                const script = scriptId 
                    ? context.scripts.find(s => s.id === scriptId)
                    : context.scripts[0];

                if (!script) {
                    return { success: false, error: 'Script not found' };
                }

                const systemPrompt = `你是一个专业的短视频CTA（行动号召）撰写专家。根据用户要求生成新的CTA。

返回格式（JSON）：
{
    "text": "CTA文案",
    "type": "subscribe" | "like" | "comment" | "share" | "follow" | "custom"
}`;

                const messages: LLMMessage[] = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `原CTA：${JSON.stringify(script.cta)}

修改要求：${target.payload?.userMessage || '优化CTA'}

请返回新的CTA（JSON格式）：` }
                ];

                const response = await callLLM(messages, provider, model);
                let newCTA;
                try {
                    newCTA = JSON.parse(response);
                } catch {
                    newCTA = { text: response, type: 'custom' };
                }

                return {
                    success: true,
                    data: {
                        scriptId: script.id,
                        updates: { cta: newCTA }
                    }
                };
            }

            case 'update_hook': {
                const scriptId = target.targetId;
                const script = scriptId 
                    ? context.scripts.find(s => s.id === scriptId)
                    : context.scripts[0];

                if (!script) {
                    return { success: false, error: 'Script not found' };
                }

                const systemPrompt = `你是一个短视频钩子专家。根据脚本内容和用户要求，建议最合适的钩子类型。

可选钩子类型：
- suspense: 悬念式
- question: 提问式
- contrast: 反差式
- data: 数据式
- story: 故事式

只返回钩子类型名称（英文）。`;

                const messages: LLMMessage[] = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `脚本：${script.scriptText.slice(0, 500)}

要求：${target.payload?.userMessage || '推荐最合适的钩子类型'}

返回钩子类型：` }
                ];

                const newHookType = await callLLM(messages, provider, model).then(r => r.trim().toLowerCase());

                return {
                    success: true,
                    data: {
                        scriptId: script.id,
                        updates: { hookType: newHookType }
                    }
                };
            }

            case 'batch_update': {
                // 批量修改所有脚本
                const results: Array<{ scriptId: string; updates: any }> = [];
                
                for (const script of context.scripts) {
                    const result = await executeModification(
                        { ...target, targetId: script.id },
                        { ...context, scripts: [script] }
                    );
                    
                    if (result.success && result.data?.updates) {
                        results.push({
                            scriptId: script.id,
                            updates: result.data.updates
                        });
                    }
                }

                return {
                    success: true,
                    data: { scripts: results }
                };
            }

            case 'regenerate': {
                const scriptId = target.targetId;
                const script = context.scripts.find(s => s.id === scriptId);
                
                if (!script) {
                    return { success: false, error: `Script not found: ${scriptId}` };
                }

                // 重新生成需要调用原始的脚本生成逻辑
                // 这里简化为返回一个标记，让前端触发重新生成
                return {
                    success: true,
                    data: {
                        scriptId,
                        updates: { 
                            status: 'regenerating',
                            _action: 'regenerate'
                        }
                    }
                };
            }

            default:
                return { success: false, error: `Unknown action: ${target.action}` };
        }
    } catch (error: any) {
        console.error('[Modification] Error:', error);
        return { success: false, error: error.message };
    }
}
