import * as fs from 'fs';
import * as path from 'path';
import type { ToolDefinition, ExpertActionResult } from '../src/types';
import { DirectorAdapter } from './expert-actions/director';
import { ShortsAdapter } from './expert-actions/shorts';

// Expert Action Adapter Interface
export interface ExpertActionAdapter {
    expertId: string;

    // Tools definition for LLM Function Calling
    getToolDefinitions(): ToolDefinition[];

    // Generate minimal context skeleton for the LLM
    getContextSkeleton(projectRoot: string): string;

    // Execute a tool call
    executeAction(
        actionName: string,
        args: Record<string, any>,
        projectRoot: string
    ): Promise<ExpertActionResult>;
}

// Global registry of adapters
const ADAPTERS: Record<string, ExpertActionAdapter> = {};

export function registerAdapter(adapter: ExpertActionAdapter) {
    ADAPTERS[adapter.expertId] = adapter;
    console.log(`[Expert Engine] Registered adapter for ${adapter.expertId}`);
}

// Auto-register default adapters
registerAdapter(DirectorAdapter);
registerAdapter(ShortsAdapter);

export function getAdapter(expertId: string): ExpertActionAdapter | null {
    return ADAPTERS[expertId] || null;
}

// Automatic backup functionality
export function backupDeliveryStore(projectRoot: string): string | null {
    const src = path.join(projectRoot, 'delivery_store.json');
    if (!fs.existsSync(src)) return null;

    const backupDir = path.join(projectRoot, '.tasks', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });

    const dest = path.join(backupDir, `delivery_store_${Date.now()}.json`);
    fs.copyFileSync(src, dest);

    // Rotate to keep only the 10 most recent backups
    const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('delivery_store_'))
        .sort((a, b) => b.localeCompare(a)); // Descending order

    for (const old of backups.slice(10)) {
        try {
            fs.unlinkSync(path.join(backupDir, old));
            console.log(`[Expert Engine] Cleaned up old backup: ${old}`);
        } catch (e) {
            console.error(`[Expert Engine] Failed to delete backup ${old}:`, e);
        }
    }

    return dest;
}

export function generateActionDescription(actionName: string, args: Record<string, any>): string {
    // Generate a human-readable description for the action
    switch (actionName) {
        case 'delete_option':
            return `删除 ${args.chapterId || '未知章节'} 的指定选项`;
        case 'regenerate_prompt':
            return `为 ${args.chapterId || '未知章节'} 的指定选项重新生成提示词${args.style_hint ? ` (风格: ${args.style_hint})` : ''}`;
        case 'update_prompt':
            return `修改 ${args.chapterId || '未知章节'} 的指定选项的提示词`;
        case 'update_script_text':
            return `修改短剧本的内容`;
        case 'update_hook_cta':
            return `更新短剧本的 Hook / CTA`;
        default:
            return `执行操作: ${actionName}`;
    }
}
