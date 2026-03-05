import fs from 'fs';
import path from 'path';

export const EXPERT_OUTPUT_DIRS: Record<string, string> = {
    Director: '04_Visuals',
    MusicDirector: '04_Music_Plan',
    ThumbnailMaster: '03_Thumbnail_Plan',
    ShortsMaster: '05_Shorts_Output',
    MarketingMaster: '05_Marketing'
};

/**
 * 确保为某个 Expert 创建独立的 state 文件
 */
export function ensureExpertState(projectRoot: string, expertId: string): any {
    const outputDirName = EXPERT_OUTPUT_DIRS[expertId];
    if (!outputDirName) {
        console.warn(`[expert_state_manager] 未知专家: ${expertId}，退阶为项目根目录`);
    }

    const stateDir = outputDirName ? path.join(projectRoot, outputDirName) : projectRoot;
    if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
    }

    const stateFile = path.join(stateDir, `${expertId.toLowerCase()}_state.json`);

    if (!fs.existsSync(stateFile)) {
        console.log(`[expert_state_manager] Creating new state file for ${expertId} at ${stateFile}`);
        const initialState = {
            expertId: expertId,
            lastUpdated: new Date().toISOString(),
            status: 'idle',
            data: {}
        };
        fs.writeFileSync(stateFile, JSON.stringify(initialState, null, 2));
        return initialState;
    }

    try {
        return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    } catch (e) {
        console.error(`[expert_state_manager] 无法读取 ${expertId} 状态，重置为空:`, e);
        const resetState = { expertId, lastUpdated: new Date().toISOString(), status: 'idle', data: {} };
        fs.writeFileSync(stateFile, JSON.stringify(resetState, null, 2));
        return resetState;
    }
}

/**
 * 读取某个 Expert 的状态
 */
export function loadExpertState(projectRoot: string, expertId: string): any {
    return ensureExpertState(projectRoot, expertId);
}

/**
 * 保存某个 Expert 的状态
 */
export function saveExpertState(projectRoot: string, expertId: string, stateData: any): void {
    const outputDirName = EXPERT_OUTPUT_DIRS[expertId];
    const stateDir = outputDirName ? path.join(projectRoot, outputDirName) : projectRoot;
    if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
    }

    const stateFile = path.join(stateDir, `${expertId.toLowerCase()}_state.json`);
    stateData.lastUpdated = new Date().toISOString();
    fs.writeFileSync(stateFile, JSON.stringify(stateData, null, 2));
    console.log(`[expert_state_manager] Saved state for ${expertId}`);
}
