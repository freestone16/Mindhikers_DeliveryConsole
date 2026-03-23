import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Server, Socket } from 'socket.io';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPERTS = ['Director', 'MusicDirector', 'ThumbnailMaster', 'ShortsMaster', 'MarketingMaster'];
// RemotionStudio 是完整 Node 项目，不走 cpSync，通过可达性检查单独加入 syncedSkills
const ALL_SKILLS = [...EXPERTS, 'RemotionStudio'];

// Lazy evaluation: SOURCE_ROOT must be resolved after dotenv.config() runs
const getSourceRoot = () => {
    if (process.env.DOCKER_ENV) return '/data/skills';
    if (process.env.SKILLS_BASE) {
        return path.isAbsolute(process.env.SKILLS_BASE)
            ? process.env.SKILLS_BASE
            : path.resolve(__dirname, '..', process.env.SKILLS_BASE);
    }
    return path.resolve(__dirname, '..', 'skills');
};
const TARGET_ROOT = path.resolve(__dirname, '../skills');

// Store last sync status
let lastSyncStatus: any = null;

export const getLastSyncStatus = () => lastSyncStatus;

export const sendSyncStatusToSocket = (socket: Socket) => {
    if (lastSyncStatus) {
        socket.emit('skill-sync-status', lastSyncStatus);
    }
};

export const syncSkills = async (io: Server) => {
    console.log('🔄 Starting Skill Sync...');
    const SOURCE_ROOT = getSourceRoot();
    const sourceResolved = path.resolve(SOURCE_ROOT);
    const targetResolved = path.resolve(TARGET_ROOT);

    // If source and target resolve to the same directory, skip copy
    if (sourceResolved === targetResolved) {
        const available = EXPERTS.filter(e => fs.existsSync(path.join(TARGET_ROOT, e)));
        lastSyncStatus = { status: 'done', synced: available, count: available.length, timestamp: new Date().toISOString() };
        console.log(`✅ Skills in-place. Available: ${available.length}/${EXPERTS.length}`);
        io.emit('skill-sync-status', lastSyncStatus);
        return;
    }

    // If source doesn't exist, fall back to target if it has skills
    if (!fs.existsSync(SOURCE_ROOT)) {
        if (fs.existsSync(TARGET_ROOT)) {
            const available = EXPERTS.filter(e => fs.existsSync(path.join(TARGET_ROOT, e)));
            lastSyncStatus = { status: 'done', synced: available, count: available.length, timestamp: new Date().toISOString() };
            console.log(`ℹ️ Using local skills. Available: ${available.length}/${EXPERTS.length}`);
            io.emit('skill-sync-status', lastSyncStatus);
            return;
        }
        console.warn(`⚠️ No skills found at: ${SOURCE_ROOT}`);
        lastSyncStatus = { status: 'error', message: 'No skills directory found' };
        io.emit('skill-sync-status', lastSyncStatus);
        return;
    }

    if (!fs.existsSync(TARGET_ROOT)) {
        fs.mkdirSync(TARGET_ROOT, { recursive: true });
    }

    const syncedSkills: string[] = [];
    for (const expert of EXPERTS) {
        const srcDir = path.join(SOURCE_ROOT, expert);
        const destDir = path.join(TARGET_ROOT, expert);
        if (fs.existsSync(srcDir)) {
            try {
                fs.cpSync(srcDir, destDir, { recursive: true, force: true });
                syncedSkills.push(expert);
            } catch (err: any) {
                console.error(`❌ Failed to sync ${expert}:`, err.message);
            }
        }
    }

    // RemotionStudio 特殊处理：完整 Node 项目不做 cpSync，只验证可达性
    // 可达即视为已同步（与其他 Skill 同等身份）
    const remotionCandidates = [
        process.env.REMOTION_STUDIO_DIR,
        process.env.SKILLS_BASE && path.join(process.env.SKILLS_BASE, 'RemotionStudio'),
        path.join(os.homedir(), '.gemini/antigravity/skills/RemotionStudio'),
    ].filter(Boolean) as string[];
    const remotionDir = remotionCandidates.find(d => fs.existsSync(path.join(d, 'node_modules', '.bin', 'remotion')));
    if (remotionDir) {
        console.log(`✅ RemotionStudio reachable: ${remotionDir}`);
        if (!syncedSkills.includes('RemotionStudio')) {
            syncedSkills.push('RemotionStudio');
        }
    } else {
        console.warn(`⚠️ RemotionStudio not found in: ${remotionCandidates.join(', ')}`);
    }

    console.log(`✅ Skill Sync Complete. Synced: ${syncedSkills.length}/${ALL_SKILLS.length}`);
    lastSyncStatus = {
        status: 'done', synced: syncedSkills, count: syncedSkills.length,
        timestamp: new Date().toISOString()
    };
    io.emit('skill-sync-status', lastSyncStatus);
};
