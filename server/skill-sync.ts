import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server, Socket } from 'socket.io';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPERTS = ['Director', 'MusicDirector', 'ThumbnailMaster', 'ShortsMaster', 'MarketingMaster'];

// Docker: /data/skills (挂载自 SKILLS_BASE)
// Local: SKILLS_BASE 或 ../../.agent/skills
const SOURCE_ROOT = process.env.DOCKER_ENV ? '/data/skills' : (process.env.SKILLS_BASE || path.resolve(__dirname, '../../.agent/skills'));
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

    if (!fs.existsSync(SOURCE_ROOT)) {
        console.warn(`⚠️ Source skills directory not found: ${SOURCE_ROOT}`);
        lastSyncStatus = { status: 'error', message: 'Source not found' };
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
            // Recursive copy
            try {
                fs.cpSync(srcDir, destDir, { recursive: true, force: true });
                syncedSkills.push(expert);
                // console.log(`✅ Synced ${expert}`);
            } catch (err: any) {
                console.error(`❌ Failed to sync ${expert}:`, err.message);
            }
        }
    }

    console.log(`✅ Skill Sync Complete. Synced: ${syncedSkills.length}`);

    lastSyncStatus = {
        status: 'done',
        synced: syncedSkills,
        count: syncedSkills.length,
        timestamp: new Date().toISOString()
    };

    io.emit('skill-sync-status', lastSyncStatus);
};
