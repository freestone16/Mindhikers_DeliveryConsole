import * as fs from 'fs';
import * as path from 'path';
import { ExpertActionAdapter } from '../expert-actions';
import { callLLM } from '../llm';
import { loadConfig } from '../llm-config';

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
            }
        ];
    },

    getContextSkeleton(projectRoot: string): string {
        try {
            const data = JSON.parse(fs.readFileSync(
                path.join(projectRoot, 'delivery_store.json'), 'utf-8'
            ));
            const chapters = data.modules?.director?.items || [];

            // Ultra-compact skeleton to save tokens and prevent LLM hallucination
            const skeleton = chapters.map((ch: any) => ({
                id: ch.chapterId,
                title: ch.chapterName,
                opts: ch.options.map((o: any) => ({
                    id: o.id,
                    type: o.type,
                    name: o.name?.substring(0, 10), // Limit length
                    prompt: o.prompt?.substring(0, 10), // Limit length
                    img_prompt: o.imagePrompt?.substring(0, 20) // Limit length
                }))
            }));
            return JSON.stringify(skeleton);
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
            default:
                return { success: false, error: `未知的操作指令: ${actionName}` };
        }

        // Write back
        fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
        return { success: true, data: { action: actionName, args } };
    }
};
