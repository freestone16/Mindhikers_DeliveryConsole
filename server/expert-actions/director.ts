import * as fs from 'fs';
import * as path from 'path';
import type { ExpertActionAdapter } from '../expert-actions';
import { callLLM } from '../llm';
import { loadConfig } from '../llm-config';

function isPlainObject(value: unknown): value is Record<string, any> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = { ...target };

    for (const [key, value] of Object.entries(source)) {
        if (isPlainObject(value) && isPlainObject(result[key])) {
            result[key] = deepMerge(result[key], value);
        } else {
            result[key] = value;
        }
    }

    return result;
}

export const DirectorAdapter: ExpertActionAdapter = {
    expertId: 'Director',

    getToolDefinitions() {
        return [
            {
                type: 'function',
                function: {
                    name: 'delete_option',
                    description: '从指定章节中删除某一个视觉备选方案(SceneOption)',
                    parameters: {
                        type: 'object',
                        properties: {
                            chapterId: { type: 'string', description: '章节的唯一ID，如 ch1, ch2' },
                            optionId: { type: 'string', description: '选项的唯一ID，如 opt_123' }
                        },
                        required: ['chapterId', 'optionId']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'regenerate_prompt',
                    description: '为指定章节的某个选项重新生成 imagePrompt/视频提示词，因为当前的可能不好看或不符合要求',
                    parameters: {
                        type: 'object',
                        properties: {
                            chapterId: { type: 'string', description: '章节ID' },
                            optionId: { type: 'string', description: '选项ID' },
                            style_hint: { type: 'string', description: '用户提供的可选修改要求或风格，如"赛博朋克夜景"' }
                        },
                        required: ['chapterId', 'optionId']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'update_prompt',
                    description: '根据用户提供的一段全新文字，直接覆盖替换掉某个选项的 imagePrompt 或 name',
                    parameters: {
                        type: 'object',
                        properties: {
                            chapterId: { type: 'string', description: '章节ID' },
                            optionId: { type: 'string', description: '选项ID' },
                            new_prompt: { type: 'string', description: '作为 imagePrompt 的新文字内容' }
                        },
                        required: ['chapterId', 'optionId', 'new_prompt']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'update_option_fields',
                    description: '万能属性修改器：可以同时修改选项的 name, type, template, prompt, imagePrompt 或 props。涉及 Remotion 模板内部字段时，字段名必须来自 Director Skill 注入的模板契约；系统只负责原样写盘，不会自动纠偏。',
                    parameters: {
                        type: 'object',
                        properties: {
                            chapterId: { type: 'string', description: '章节ID' },
                            optionId: { type: 'string', description: '选项ID' },
                            updates: {
                                type: 'object',
                                description: '需要修改的字段键值对，可以是 name, type, template, prompt, imagePrompt，或 props 对象。props 支持对象级合并，但不会自动补全非法字段。',
                                additionalProperties: true
                            }
                        },
                        required: ['chapterId', 'optionId', 'updates']
                    }
                }
            }
        ];
    },

    getContextSkeleton(projectRoot: string): string {
        try {
            const data = JSON.parse(fs.readFileSync(
                path.join(projectRoot, 'delivery_store.json'), 'utf-8'
            ));
            const chapters = data.modules?.director?.items || [];

            // Skeleton with human-readable seq numbers so LLM can map
            // user's shorthand like "1-3" to chapterIndex=1, optionIndex=3
            const skeleton = chapters.map((ch: any, ci: number) => ({
                seq: ch.chapterIndex ?? (ci + 1),  // chapter seq number (X in "X-Y")
                id: ch.chapterId,
                title: ch.chapterName?.substring(0, 30),
                opts: (ch.options || []).map((o: any, oi: number) => ({
                    seq: oi + 1,                    // option seq number (Y in "X-Y")
                    id: o.id,
                    type: o.type,
                    name: o.name?.substring(0, 30),
                    img_prompt: o.imagePrompt?.substring(0, 50)
                }))
            }));

            // Prefix a semantic hint for the LLM
            const hint = '/* INDEX: user references items as "chapterSeq-optionSeq", e.g. "1-3" = chapter with seq:1, its option with seq:3 */\n';
            return hint + JSON.stringify(skeleton);
        } catch (e) {
            console.error('[DirectorAdapter] Failed to get context skeleton:', e);
            return '[]';
        }
    },

    async executeAction(actionName, args, projectRoot) {
        const storePath = path.join(projectRoot, 'delivery_store.json');
        if (!fs.existsSync(storePath)) {
            return { success: false, error: 'delivery_store.json not found' };
        }

        const data = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        const chapters = data.modules?.director?.items || [];

        const ch = chapters.find((c: any) => c.chapterId === args.chapterId);
        if (!ch) return { success: false, error: `章节 ${args.chapterId} 不存在` };

        const opt = ch.options.find((o: any) => o.id === args.optionId);

        switch (actionName) {
            case 'delete_option': {
                if (!opt) return { success: false, error: `选项 ${args.optionId} 不存在` };
                ch.options = ch.options.filter((o: any) => o.id !== args.optionId);
                // If it was the selected one, unselect
                if (ch.selectedOptionId === args.optionId) {
                    ch.selectedOptionId = undefined;
                }
                break;
            }
            case 'regenerate_prompt': {
                if (!opt) return { success: false, error: `选项 ${args.optionId} 不存在` };

                const config = loadConfig() as Record<string, any>;
                const provider = config?.global?.provider || 'openai';
                const model = config?.global?.model || 'gpt-4o';

                const promptTemplate = `
You are an expert Midjourney / Video AI prompt engineer.
We need to rewrite the prompt for a B-roll shot.
Original Script Context: "${ch.scriptText}"
Shot Quote to match: "${opt.quote}"
Current Prompt: "${opt.imagePrompt || opt.prompt}"
User's Instruction/Style Hint: "${args.style_hint || 'Make it cinematic, hyper-detailed and visually striking.'}"

Please generate ONLY the final English prompt text. Do NOT include any explanations, markdown code blocks, or preamble. Just the raw prompt string.
                `;

                try {
                    const newPromptResponse = await callLLM(
                        [{ role: 'user', content: promptTemplate.trim() }],
                        provider,
                        model
                    );
                    opt.imagePrompt = newPromptResponse.content.trim();
                    opt.previewUrl = undefined; // 提示词更新，旧缩略图过期
                } catch (e: any) {
                    return { success: false, error: `重新生成提示词失败: ${e.message}` };
                }
                break;
            }
            case 'update_prompt': {
                if (!opt) return { success: false, error: `选项 ${args.optionId} 不存在` };
                opt.imagePrompt = args.new_prompt;
                opt.previewUrl = undefined; // 提示词更新，旧缩略图过期
                break;
            }
            case 'update_option_fields': {
                if (!opt) return { success: false, error: `选项 ${args.optionId} 不存在` };
                const updates = args.updates || {};
                const renderAffectingKeys = new Set([
                    'type',
                    'template',
                    'prompt',
                    'imagePrompt',
                    'props',
                    'infographicLayout',
                    'infographicStyle',
                    'infographicUseMode'
                ]);
                let shouldInvalidatePreview = false;

                if (updates.name) opt.name = updates.name;
                for (const key of ['type', 'template', 'prompt', 'imagePrompt', 'infographicLayout', 'infographicStyle', 'infographicUseMode']) {
                    if (updates[key] !== undefined) {
                        opt[key] = updates[key];
                        if (renderAffectingKeys.has(key)) {
                            shouldInvalidatePreview = true;
                        }
                    }
                }

                // 深度覆盖 props 属性，用于修改 Remotion 内部的文案排版、不换行等
                if (updates.props && typeof updates.props === 'object') {
                    opt.props = deepMerge(
                        isPlainObject(opt.props) ? opt.props : {},
                        updates.props
                    );
                    shouldInvalidatePreview = true;
                }

                // 任何影响渲染内容的修改都清除旧缩略图，让前端知道需要重新生成
                if (shouldInvalidatePreview) {
                    opt.previewUrl = undefined;
                }
                break;
            }
            default:
                return { success: false, error: `未知的操作指令: ${actionName}` };
        }

        // Write back
        fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
        return { success: true, data: { action: actionName, args } };
    }
};
