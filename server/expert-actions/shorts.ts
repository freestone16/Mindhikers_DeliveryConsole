import * as fs from 'fs';
import * as path from 'path';
import type { ExpertActionAdapter } from '../expert-actions';
import { callLLM } from '../llm';
import { loadConfig } from '../llm-config';

export const ShortsAdapter: ExpertActionAdapter = {
    expertId: 'ShortsMaster',

    getToolDefinitions() {
        return [
            {
                type: 'function',
                function: {
                    name: 'update_script_text',
                    description: '用户要求修改脚本的长文本内容',
                    parameters: {
                        type: 'object',
                        properties: {
                            scriptId: { type: 'string', description: '脚本的唯一ID' },
                            instruction: { type: 'string', description: '修改指令，比如：缩短一点，语气更强烈一点' }
                        },
                        required: ['scriptId', 'instruction']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'update_hook_cta',
                    description: '修改脚本的黄金前三秒(Hook)或号召性用语(CTA)',
                    parameters: {
                        type: 'object',
                        properties: {
                            scriptId: { type: 'string', description: '脚本的唯一ID' },
                            targetField: { type: 'string', enum: ['hookType', 'cta'], description: '修改目标：hookType 或 cta' },
                            newValue: { type: 'string', description: '新的 Hook 或 CTA 文本' }
                        },
                        required: ['scriptId', 'targetField', 'newValue']
                    }
                }
            }
        ];
    },

    getContextSkeleton(projectRoot: string): string {
        try {
            const statePath = path.join(projectRoot, '05_Shorts_Output', 'shorts_state.json');
            if (fs.existsSync(statePath)) {
                const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
                // Make it tiny
                const skeleton = (state.scripts || []).map((s: any) => ({
                    id: s.id,
                    title: s.title,
                    desc: s.description?.substring(0, 20)
                }));
                return JSON.stringify(skeleton);
            }
        } catch (e) {
            console.error('[ShortsAdapter] Failed to read skeleton:', e);
        }
        return '[]';
    },

    async executeAction(actionName, args, projectRoot) {
        // Find JSON path
        const shortsStatePath = path.join(projectRoot, '05_Shorts_Output', 'shorts_state.json');
        if (!fs.existsSync(shortsStatePath)) {
            // Check delivery_store fallback
            return { success: false, error: 'shorts_state.json not found' };
        }

        const state = JSON.parse(fs.readFileSync(shortsStatePath, 'utf-8'));
        const script = state.scripts?.find((s: any) => s.id === args.scriptId);

        if (!script) {
            return { success: false, error: `未找到指定脚本 ID: ${args.scriptId}` };
        }

        let updates: Record<string, any> = {};

        switch (actionName) {
            case 'update_script_text': {
                // Call LLM
                const mdPath = path.join(projectRoot, script.scriptPath);
                if (!fs.existsSync(mdPath)) {
                    return { success: false, error: '找不到 Markdown 文件' };
                }

                const oldText = fs.readFileSync(mdPath, 'utf-8');
                const prompt = `
修改目标：请根据用户指令修改以下短视频文案。
用户指令：${args.instruction}

【原始文案】
${oldText}

请在不改变文件原本 Markdown 结构（Title, Metadata, Scene...）的情况下进行修改。只输出最终的 Markdown 文本内容，不要包含代码块标记。
                `.trim();

                try {
                    const { global: g } = loadConfig();
                    const res = await callLLM([{ role: 'user', content: prompt }], g.provider as any, g.model);
                    const newText = res.content.trim();
                    fs.writeFileSync(mdPath, newText);
                    updates = {}; // text is in md file
                } catch (e: any) {
                    return { success: false, error: `大模型修改脚本失败: ${e.message}` };
                }
                break;
            }
            case 'update_hook_cta': {
                if (args.targetField === 'hookType') {
                    script.hookType = args.newValue;
                    updates = { hookType: args.newValue };
                } else if (args.targetField === 'cta') {
                    script.cta = args.newValue;
                    updates = { cta: args.newValue };
                }
                break;
            }
            default:
                return { success: false, error: `未知的操作: ${actionName}` };
        }

        // Write state back
        fs.writeFileSync(shortsStatePath, JSON.stringify(state, null, 2));

        return {
            success: true,
            data: {
                action: actionName,
                scriptId: args.scriptId,
                updates
            }
        };
    }
};
