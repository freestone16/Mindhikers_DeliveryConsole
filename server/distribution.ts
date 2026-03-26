import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getProjectRoot, PROJECTS_BASE } from './project-root';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const AUTH_FILE = path.join(__dirname, '../../.mindhikers/auth.json');

function log(module: string, stage: string, status: string, detail: string = '') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${module}] [${stage}] ${status} -> ${detail}`);
}

interface PlatformAccount {
    platform: string;
    status: 'connected' | 'expired' | 'needs_refresh' | 'offline' | 'draft_ready';
    target?: string;
    lastAuth?: string;
    authType: 'oauth' | 'cookie' | 'appkey';
}

interface AuthData {
    accounts: PlatformAccount[];
    lastChecked: string;
}

function ensureAuthFile(): AuthData {
    const authDir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }
    
    if (!fs.existsSync(AUTH_FILE)) {
        const initialData: AuthData = {
            accounts: [
                { platform: 'twitter', status: 'expired', authType: 'oauth' },
                { platform: 'youtube', status: 'connected', target: 'MindHikers Main', authType: 'oauth' },
                { platform: 'bilibili', status: 'connected', target: '老卢的B站号', authType: 'cookie' },
                { platform: 'douyin', status: 'needs_refresh', authType: 'cookie' },
                { platform: 'wechat_video', status: 'offline', authType: 'cookie' },
                { platform: 'weibo', status: 'expired', authType: 'cookie' },
                { platform: 'wechat_mp', status: 'draft_ready', target: '黄金坩埚研究所', authType: 'appkey' },
                { platform: 'youtube_shorts', status: 'connected', target: 'MindHikers Main', authType: 'oauth' }
            ],
            lastChecked: new Date().toISOString()
        };
        fs.writeFileSync(AUTH_FILE, JSON.stringify(initialData, null, 2));
        log('Distribution-Auth', 'Init', 'CREATE', `Created auth.json with ${initialData.accounts.length} platforms`);
        return initialData;
    }
    
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
}

const PLATFORM_GROUPS = {
    A: ['twitter', 'weibo', 'wechat_mp'],
    B: ['youtube', 'bilibili'],
    C: ['youtube_shorts', 'douyin', 'wechat_video']
};

router.get('/auth/status', (req, res) => {
    try {
        const authData = ensureAuthFile();
        
        const groupedAccounts = {
            A: {
                name: '图文阵地',
                platforms: PLATFORM_GROUPS.A.map(p => authData.accounts.find(a => a.platform === p)).filter(Boolean)
            },
            B: {
                name: '长轴纵深',
                platforms: PLATFORM_GROUPS.B.map(p => authData.accounts.find(a => a.platform === p)).filter(Boolean)
            },
            C: {
                name: '竖屏池',
                platforms: PLATFORM_GROUPS.C.map(p => authData.accounts.find(a => a.platform === p)).filter(Boolean)
            }
        };
        
        log('Distribution-Auth', 'Status', 'READ', `Fetched auth status, ${authData.accounts.length} platforms`);
        
        res.json({
            success: true,
            data: groupedAccounts,
            lastChecked: authData.lastChecked
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/auth/refresh', (req, res) => {
    try {
        const { platform } = req.body;
        const authData = ensureAuthFile();
        
        const accountIndex = authData.accounts.findIndex(a => a.platform === platform);
        if (accountIndex === -1) {
            return res.status(404).json({ success: false, error: 'Platform not found' });
        }
        
        authData.accounts[accountIndex].status = 'connected';
        authData.lastChecked = new Date().toISOString();
        
        fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2));
        
        res.json({ success: true, platform: platform, status: 'connected' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/auth/revoke', (req, res) => {
    try {
        const { platform } = req.body;
        const authData = ensureAuthFile();
        
        const accountIndex = authData.accounts.findIndex(a => a.platform === platform);
        if (accountIndex === -1) {
            return res.status(404).json({ success: false, error: 'Platform not found' });
        }
        
        authData.accounts[accountIndex].status = 'offline';
        authData.accounts[accountIndex].target = undefined;
        authData.lastChecked = new Date().toISOString();
        
        fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2));
        
        res.json({ success: true, platform: platform, status: 'offline' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const DISTRIBUTION_QUEUE_FILE = path.join(PROJECTS_BASE, '_distribution_queue.json');

interface DistributionTask {
    taskId: string;
    projectId: string;
    platforms: string[];
    assets: {
        mediaUrl: string;
        textDraft: string;
        title: string;
        tags: string[];
    };
    scheduleTime?: string;
    timezone?: string;
    systemDelayMs?: number;
    status: 'pending' | 'scheduled' | 'running' | 'completed' | 'failed';
    createdAt: string;
    scheduledAt?: string;
    completedAt?: string;
    error?: string;
    results?: Record<string, any>;
}

function ensureQueueFile(): DistributionTask[] {
    if (!fs.existsSync(DISTRIBUTION_QUEUE_FILE)) {
        const initialQueue: DistributionTask[] = [];
        fs.writeFileSync(DISTRIBUTION_QUEUE_FILE, JSON.stringify(initialQueue, null, 2));
        return initialQueue;
    }
    return JSON.parse(fs.readFileSync(DISTRIBUTION_QUEUE_FILE, 'utf-8'));
}

router.get('/queue', (req, res) => {
    try {
        const queue = ensureQueueFile();
        const today = new Date().toISOString().split('T')[0];
        
        const todayTasks = queue.filter(t => t.createdAt.startsWith(today));
        const upcomingTasks = queue.filter(t => t.status === 'scheduled');
        
        res.json({
            success: true,
            queue: queue,
            todayCount: todayTasks.length,
            upcomingCount: upcomingTasks.length
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/queue/create', (req, res) => {
    try {
        const { projectId, platforms, assets, scheduleTime, timezone } = req.body;
        
        if (!projectId || !platforms || !assets) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        const queue = ensureQueueFile();
        
        const taskId = `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        let systemDelayMs: number | undefined;
        let scheduledAt: string | undefined;
        let status: DistributionTask['status'] = 'pending';
        
        if (scheduleTime) {
            const delay = Math.floor(Math.random() * (10 - 3) + 3) * 60 * 1000;
            systemDelayMs = delay;
            
            const scheduleDate = new Date(scheduleTime);
            scheduledAt = scheduleDate.toISOString();
            status = 'scheduled';
        }
        
        const newTask: DistributionTask = {
            taskId,
            projectId,
            platforms,
            assets,
            scheduleTime,
            timezone: timezone || 'Asia/Shanghai',
            systemDelayMs,
            status,
            createdAt: new Date().toISOString(),
            scheduledAt
        };
        
        queue.push(newTask);
        fs.writeFileSync(DISTRIBUTION_QUEUE_FILE, JSON.stringify(queue, null, 2));
        
        res.json({
            success: true,
            task: newTask,
            message: scheduleTime ? 'Task scheduled successfully' : 'Task queued successfully'
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/queue/:taskId', (req, res) => {
    try {
        const { taskId } = req.params;
        const queue = ensureQueueFile();
        
        const taskIndex = queue.findIndex(t => t.taskId === taskId);
        if (taskIndex === -1) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        
        if (queue[taskIndex].status === 'running') {
            return res.status(400).json({ success: false, error: 'Cannot cancel running task' });
        }
        
        queue.splice(taskIndex, 1);
        fs.writeFileSync(DISTRIBUTION_QUEUE_FILE, JSON.stringify(queue, null, 2));
        
        res.json({ success: true, message: 'Task cancelled' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/queue/:taskId/retry', (req, res) => {
    try {
        const { taskId } = req.params;
        const queue = ensureQueueFile();
        
        const taskIndex = queue.findIndex(t => t.taskId === taskId);
        if (taskIndex === -1) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        
        if (queue[taskIndex].status !== 'failed') {
            return res.status(400).json({ success: false, error: 'Only failed tasks can be retried' });
        }
        
        queue[taskIndex].status = 'pending';
        queue[taskIndex].error = undefined;
        queue[taskIndex].createdAt = new Date().toISOString();
        
        fs.writeFileSync(DISTRIBUTION_QUEUE_FILE, JSON.stringify(queue, null, 2));
        
        res.json({ success: true, task: queue[taskIndex] });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/assets', (req, res) => {
    try {
        const projectId = req.query.project as string;
        if (!projectId) {
            return res.status(400).json({ success: false, error: 'Missing project parameter' });
        }
        const projectRoot = getProjectRoot(projectId);
        
        const shortsDir = path.join(projectRoot, '05_Shorts_Output');
        const marketingDir = path.join(projectRoot, '05_Marketing');
        
        const videos: { name: string; path: string; type: string }[] = [];
        const scripts: { name: string; path: string }[] = [];
        
        if (fs.existsSync(shortsDir)) {
            const files = fs.readdirSync(shortsDir).filter(f => f.endsWith('.mp4'));
            files.forEach(file => {
                const isVertical = file.includes('_9-16') || file.includes('_916');
                videos.push({
                    name: file,
                    path: `05_Shorts_Output/${file}`,
                    type: isVertical ? '9:16' : '16:9'
                });
            });
        }
        
        if (fs.existsSync(marketingDir)) {
            const files = fs.readdirSync(marketingDir).filter(f => f.endsWith('.md') || f.endsWith('.json'));
            files.forEach(file => {
                scripts.push({
                    name: file,
                    path: `05_Marketing/${file}`
                });
            });
        }
        
        res.json({
            success: true,
            videos,
            marketingFiles: scripts
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
