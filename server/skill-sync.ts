import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Server, Socket } from 'socket.io';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPERTS = ['Director', 'MusicDirector', 'ThumbnailMaster', 'ShortsMaster', 'MarketingMaster'];

const GLOBAL_SKILLS_ROOT = path.join(os.homedir(), '.gemini/antigravity/skills');

// Sync source is intentionally single-root to mirror the user's external skill workspace.
const getSourceRoot = () => {
    if (process.env.DOCKER_ENV) return '/data/skills';
    if (process.env.SKILLS_BASE) {
        return path.isAbsolute(process.env.SKILLS_BASE)
            ? process.env.SKILLS_BASE
            : path.resolve(__dirname, '..', process.env.SKILLS_BASE);
    }
    return GLOBAL_SKILLS_ROOT;
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
            lastSyncStatus = {
                status: 'warning',
                synced: available,
                count: available.length,
                timestamp: new Date().toISOString(),
                message: `Global skills root not found: ${SOURCE_ROOT}`,
            };
            console.log(`ℹ️ Global skills root missing, keeping local skills. Available: ${available.length}/${EXPERTS.length}`);
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

    console.log(`✅ Skill Sync Complete. Synced: ${syncedSkills.length}/${EXPERTS.length}`);
    lastSyncStatus = { status: 'done', synced: syncedSkills, count: syncedSkills.length, timestamp: new Date().toISOString() };
    io.emit('skill-sync-status', lastSyncStatus);
};
