import * as fs from 'fs';
import * as path from 'path';
import { ExpertActionAdapter } from '../expert-actions';
import { callLLM } from '../llm';
import { loadConfig } from '../llm-config';
import type { LLMProvider } from '../../src/schemas/llm-config';
import { tryResolveDirectorFastPath } from '../director-bridge';

export const DirectorAdapter: ExpertActionAdapter = {
    expertId: 'Director',

    tryFastPath(userMessage: string, projectRoot: string) {
        const resolution = tryResolveDirectorFastPath(userMessage, projectRoot);
        if (!resolution || resolution.status !== 'ready_to_confirm' || !resolution.executionPlan || !resolution.confirmCard) {
            return null;
        }
        return {
            executionPlan: resolution.executionPlan,
            confirmCard: resolution.confirmCard,
        };
    },

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
                    description: '万能属性修改器：可修改选项的任意业务字段（type / name / prompt / imagePrompt 等），type 可选值：remotion / seedance / artlist / internet-clip / user-capture / infographic。props 会与现有值深度合并（用于修改 Remotion 文字、排版、不换行等）。系统字段 id / isChecked / previewUrl 不可修改。',
                    parameters: {
                        type: 'object',
                        properties: {
                            chapterId: { type: 'string', description: '章节ID' },
                            optionId: { type: 'string', description: '选项ID' },
                            updates: {
                                type: 'object',
                                description: '需要修改的字段键值对，可以是任意业务字段（type / name / prompt / imagePrompt 等），或者包含需要深度合并的 props 对象。',
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
            // user's shorthand like "1-3" to chapterIndex=0, optionIndex=3
            // chapterIndex is 0-based internally, but users address chapters as 1-based ("第1章"=chapterIndex 0)
            const skeleton = chapters.map((ch: any, ci: number) => ({
                seq: ch.chapterIndex !== undefined ? ch.chapterIndex + 1 : ci + 1,  // 1-based: "第1章"→seq:1, "第2章"→seq:2
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

                const config = loadConfig();
                const provider = config.global.provider as LLMProvider;
                const model = config.global.model;

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
                } catch (e: any) {
                    return { success: false, error: `重新生成提示词失败: ${e.message}` };
                }
                break;
            }
            case 'update_prompt': {
                if (!opt) return { success: false, error: `选项 ${args.optionId} 不存在` };
                opt.imagePrompt = args.new_prompt;
                break;
            }
            case 'update_option_fields': {
                if (!opt) return { success: false, error: `选项 ${args.optionId} 不存在` };
                const updates = args.updates || {};

                // 系统级只读字段，不允许被覆盖（type 变更的级联清理除外）
                const IMMUTABLE_FIELDS = new Set(['id', 'isChecked']);

                // 当 type 发生变化时，旧的预览图、模板、props 都失去意义，必须级联清理
                if (updates.type && updates.type !== opt.type) {
                    opt.previewUrl = null;
                    opt.previewStatus = null;
                    opt.template = null;
                    opt.props = undefined;
                    console.log(`[Director] Type changed ${opt.type} -> ${updates.type} for ${opt.id}, cleared preview/template/props`);
                }

                for (const [key, value] of Object.entries(updates)) {
                    if (IMMUTABLE_FIELDS.has(key)) continue;

                    if (key === 'props' && typeof value === 'object' && value !== null) {
                        // props 做深度合并，而非整体替换
                        opt.props = { ...(opt.props || {}), ...(value as Record<string, unknown>) };
                    } else {
                        (opt as any)[key] = value;
                    }
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
