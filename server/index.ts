import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

import youtubeAuthRouter from './youtube-auth';
import distributionRouter from './distribution';
import { setupVisualPlanWatcher, getVisualPlan, updateSceneReview } from './visual-plan';
import { syncSkills, sendSyncStatusToSocket } from './skill-sync';
import { getConfigStatus, saveApiKey, updateConfig, testConnection, getSavedKeys } from './llm-config';
import * as director from './director';
import * as pipeline from './pipeline_engine';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
app.use(cors()); // Enable CORS for all routes
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- Project Context (Mutable - supports runtime switching) ---
// Docker: PROJECTS_BASE=/data/projects  |  Local: fallback to ../../Projects
const PROJECTS_BASE = process.env.PROJECTS_BASE || path.resolve(__dirname, '../../Projects');
let currentProjectName = process.env.PROJECT_NAME || 'CSET-SP3';
let PROJECT_ROOT = path.resolve(PROJECTS_BASE, currentProjectName);
let DELIVERY_FILE = path.join(PROJECT_ROOT, 'delivery_store.json');
let SHORTS_AROLL_DIR = path.join(PROJECT_ROOT, '09_shorts_aroll');

if (!fs.existsSync(PROJECT_ROOT)) {
    console.error(`❌ 项目目录不存在: ${PROJECT_ROOT}`);
    console.error(`   请确认 Projects/${currentProjectName} 文件夹存在`);
    process.exit(1);
}

// --- Experts Configuration ---
const EXPERTS_CONFIG = [
    { id: 'Director', skillName: 'Director', outputDir: '04_Visuals' },
    { id: 'MusicDirector', skillName: 'MusicDirector', outputDir: '04_Music_Plan' },
    { id: 'ThumbnailMaster', skillName: 'ThumbnailMaster', outputDir: '03_Thumbnail_Plan' },
    { id: 'ShortsMaster', skillName: 'ShortsMaster', outputDir: '05_Shorts_Output' },
    { id: 'MarketingMaster', skillName: 'MarketingMaster', outputDir: '05_Marketing' }
];

app.use(cors());
app.use(express.json());

// Mount YouTube Auth Routes
app.use(youtubeAuthRouter);

// Mount Distribution Console Routes
app.use('/api/distribution', distributionRouter);

// Visual Plan Routes
app.get('/api/visual-plan', getVisualPlan);
app.post('/api/visual-plan/scene/review', updateSceneReview);

// LLM Config Routes
app.get('/api/llm-config/status', getConfigStatus);
app.get('/api/llm-config/keys', getSavedKeys);
app.post('/api/llm-config/api-key', saveApiKey);
app.put('/api/llm-config', updateConfig);
app.post('/api/llm-config/test', testConnection);

// Director Phase 1-3 Routes
app.post('/api/director/phase1/generate', director.generatePhase1);
app.post('/api/director/phase2/start', director.startPhase2);
app.get('/api/director/phase2/status/:taskId', director.getPhase2Status);
app.post('/api/director/phase2/select', director.selectOption);
app.post('/api/director/phase2/lock', director.lockChapter);
app.post('/api/director/phase2/thumbnail', director.generateThumbnail);
app.get('/api/director/phase2/thumbnail/:taskKey', director.getThumbnailStatus);
app.post('/api/director/phase3/render', director.startRender);
app.get('/api/director/phase3/status/:jobId', director.getRenderStatus);

// Pipeline Engine Routes (Phase 3 & Phase 4)
app.post('/api/pipeline/render-brolls', pipeline.renderBrolls);
app.get('/api/pipeline/render-status/:taskId', pipeline.getRenderStatus);
app.post('/api/pipeline/weave-timeline', pipeline.weaveTimeline);

function normalizeFilename(filename: string): string {
    return filename.toLowerCase().replace(/-/g, '_');
}


// A-Roll scanning logic is temporarily disabled in v2.0 as we move to Script-First workflow
/*
function matchARollToShorts(filename: string, shortsList: any[]): string | null {
    const normalized = normalizeFilename(filename);
    const match = normalized.match(/shorts(\d+)_aroll\.mp4/);
    if (!match) return null;
    
    const shortsId = match[1].padStart(2, '0');
    const targetShorts = shortsList.find(s => s.id === shortsId || s.id === match[1]);
    return targetShorts ? targetShorts.id : null;
}
*/

function ensureDeliveryFile() {
    if (!fs.existsSync(DELIVERY_FILE)) {
        console.log(`Creating new delivery_store.json for ${currentProjectName}`);
        const initialState = {
            projectId: currentProjectName,
            lastUpdated: new Date().toISOString(),
            activeExpertId: 'Director',
            experts: {
                Director: { status: 'idle', logs: [] },
                MusicDirector: { status: 'idle', logs: [] },
                ThumbnailMaster: { status: 'idle', logs: [] },
                ShortsMaster: { status: 'idle', logs: [] },
                MarketingMaster: { status: 'idle', logs: [] }
            },
            modules: {
                director: { phase: 1, conceptProposal: "", items: [] },
                music: { phase: 1, moodProposal: "", items: [] },
                thumbnail: { variants: [] },
                marketing: { strategy: { seo: { titleCandidates: [], description: '', keywords: [], competitorAnalysis: '' }, social: { twitterThread: '', redditPost: '' }, geo: { locationTags: [], culturalRelevance: '' } }, feedback: '', isSubmitted: false },
                shorts: { items: [], uploadHistory: [] }
            }
        };
        if (!fs.existsSync(PROJECT_ROOT)) {
            fs.mkdirSync(PROJECT_ROOT, { recursive: true });
        }
        fs.writeFileSync(DELIVERY_FILE, JSON.stringify(initialState, null, 2));
    } else {
        const data = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
        if (!data.modules.shorts || Array.isArray(data.modules.shorts.shorts)) {
            // Migration or initialization
            console.log('Migrating/Initializing shorts module to v2 Structure');
            // Backup old data if exists
            const oldItems = data.modules.shorts?.shorts || [];

            data.modules.shorts = {
                items: oldItems.map((old: any) => ({
                    ...old,
                    // Map old fields to new schema if necessary, or just keep as is for manual fix
                    status: 'draft',
                    reviewHistory: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                })),
                uploadHistory: []
            };
            fs.writeFileSync(DELIVERY_FILE, JSON.stringify(data, null, 2));
        }
    }
}

/*
function ensureARollDirectory() {
    if (!fs.existsSync(SHORTS_AROLL_DIR)) {
        fs.mkdirSync(SHORTS_AROLL_DIR, { recursive: true });
        console.log(`Created A-roll directory: ${SHORTS_AROLL_DIR}`);
    }
}

function scanARollFiles(): string[] {
    if (!fs.existsSync(SHORTS_AROLL_DIR)) return [];
    return fs.readdirSync(SHORTS_AROLL_DIR).filter(f => 
        f.toLowerCase().endsWith('.mp4')
    );
}

function updateARollStatus() {
   // Disabled for v2
}
*/

const activeRenders = new Map<string, any>();

function startRender(shortsId: string, projectRoot: string, callback: (progress: any) => void) {
    if (activeRenders.has(shortsId)) {
        return { error: 'Render already in progress' };
    }

    const outputDir = path.join(projectRoot, '09_output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Using simple ID for filename in v2
    const outputFile = path.join(outputDir, `${shortsId}.mp4`);

    // Note: This assumes a Remotion composition named "Shorts{id}" exists
    // We might need to make this dynamic later based on script
    const compositionName = `Shorts${shortsId}`;

    console.log(`Spawning Remotion render: ${compositionName} -> ${outputFile}`);

    const remotionProcess = spawn('npx', [
        'remotion', 'render',
        compositionName,
        outputFile
    ], {
        cwd: projectRoot,
        env: { ...process.env, NODE_ENV: 'production' }
    });

    activeRenders.set(shortsId, {
        process: remotionProcess,
        startTime: new Date().toISOString()
    });

    remotionProcess.stdout.on('data', (data) => {
        const output = data.toString();
        // Console log from remotion
        console.log(`[Remotion] ${output.trim()}`);

        const progressMatch = output.match(/(\d+)%/);
        if (progressMatch) {
            callback({
                shortsId,
                type: 'progress',
                progress: parseInt(progressMatch[1])
            });
        }
    });

    remotionProcess.stderr.on('data', (data) => {
        console.error(`[Remotion Error] ${data.toString().trim()}`);
        // Remotion often outputs progress to stderr too
    });

    remotionProcess.on('close', (code) => {
        activeRenders.delete(shortsId);

        if (code === 0) {
            callback({
                shortsId,
                type: 'completed',
                outputFile
            });
        } else {
            callback({
                shortsId,
                type: 'failed',
                exitCode: code
            });
        }
    });

    return { success: true, pid: remotionProcess.pid };
}

// --- File Watcher (re-bindable for project switching) ---
let deliveryWatcher: ReturnType<typeof chokidar.watch> | null = null;
let expertWatchers: ReturnType<typeof chokidar.watch>[] = [];

function setupProjectWatcher() {
    if (deliveryWatcher) {
        deliveryWatcher.close();
    }
    deliveryWatcher = chokidar.watch(DELIVERY_FILE);
    deliveryWatcher.on('change', () => {
        console.log('delivery_store.json changed on disk, broadcasting...');
        const data = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
        io.emit('delivery-data', data);
    });
}

function setupExpertWatchers() {
    expertWatchers.forEach(w => w.close());
    expertWatchers = [];

    EXPERTS_CONFIG.forEach(expert => {
        const outputDir = path.join(PROJECT_ROOT, expert.outputDir);
        if (!fs.existsSync(outputDir)) {
            return;
        }

        // Scan existing files on startup
        const existingFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.md'));
        if (existingFiles.length > 0) {
            console.log(`📂 [${expert.id}] Found ${existingFiles.length} existing files in ${expert.outputDir}`);

            const deliveryData = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
            if (!deliveryData.experts) {
                deliveryData.experts = {};
            }

            const expertWork = deliveryData.experts[expert.id];
            // Auto-complete if expert is pending/running and files exist
            if (expertWork && (expertWork.status === 'pending' || expertWork.status === 'running')) {
                const latestFile = existingFiles.sort().pop()!;
                const filePath = path.join(outputDir, latestFile);
                let content = '';
                try {
                    content = fs.readFileSync(filePath, 'utf-8');
                } catch (e) {
                    console.error('Failed to read existing output file:', e);
                }

                deliveryData.experts[expert.id] = {
                    status: 'completed',
                    startedAt: expertWork.startedAt,
                    completedAt: new Date().toISOString(),
                    outputPath: filePath,
                    outputContent: content.substring(0, 5000),
                    logs: [...(expertWork.logs || []), `检测到已存在文件: ${latestFile}`, '任务完成（自动识别）']
                };
                deliveryData.lastUpdated = new Date().toISOString();
                fs.writeFileSync(DELIVERY_FILE, JSON.stringify(deliveryData, null, 2));
                io.emit('delivery-data', deliveryData);
            }
        }

        const watcher = chokidar.watch(outputDir, {
            ignored: /(^|[\/\\])\../,
            persistent: true
        });

        watcher.on('add', (filePath) => {
            if (!filePath.endsWith('.md')) return;
            console.log(`📄 New output detected: ${filePath} for ${expert.id}`);

            const deliveryData = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
            if (!deliveryData.experts) {
                deliveryData.experts = {};
            }

            const expertWork = deliveryData.experts[expert.id];
            if (expertWork && (expertWork.status === 'pending' || expertWork.status === 'running')) {
                let content = '';
                try {
                    content = fs.readFileSync(filePath, 'utf-8');
                } catch (e) {
                    console.error('Failed to read output file:', e);
                }

                deliveryData.experts[expert.id] = {
                    status: 'completed',
                    startedAt: expertWork.startedAt,
                    completedAt: new Date().toISOString(),
                    outputPath: filePath,
                    outputContent: content.substring(0, 5000),
                    logs: [...(expertWork.logs || []), `检测到输出文件: ${path.basename(filePath)}`, '任务完成']
                };
                deliveryData.lastUpdated = new Date().toISOString();
                fs.writeFileSync(DELIVERY_FILE, JSON.stringify(deliveryData, null, 2));
                io.emit('delivery-data', deliveryData);
            }
        });

        expertWatchers.push(watcher);
    });

    console.log(`👁️ Watching ${expertWatchers.length} expert output directories`);
}

ensureDeliveryFile();
setupProjectWatcher();
setupExpertWatchers();
setupVisualPlanWatcher(io, PROJECT_ROOT);

// Initial Skill Sync
syncSkills(io);

io.on('connection', (socket) => {
    console.log('Client connected');
    // Send current project data
    if (fs.existsSync(DELIVERY_FILE)) {
        const data = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
        socket.emit('delivery-data', data);
    }
    // Also send active project name
    socket.emit('active-project', { name: currentProjectName });

    // Send skill sync status to newly connected client
    sendSyncStatusToSocket(socket);

    socket.on('update-data', (newData) => {
        console.log('Received update from client');
        newData.lastUpdated = new Date().toISOString();
        fs.writeFileSync(DELIVERY_FILE, JSON.stringify(newData, null, 2));
        socket.broadcast.emit('delivery-data', newData);
    });

    socket.on('start-render', (data) => {
        const { shortsId } = data;
        console.log(`Starting render for Shorts${shortsId}`);

        const result = startRender(shortsId, PROJECT_ROOT, (progress) => {
            socket.emit('render-progress', progress);

            if (progress.type === 'completed' || progress.type === 'failed') {
                const deliveryData = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
                const shortsItem = deliveryData.modules.shorts.items.find(
                    (s: any) => s.id === shortsId
                );

                if (shortsItem) {
                    if (progress.type === 'completed') {
                        shortsItem.status = 'render_review';
                        shortsItem.videoPath = progress.outputFile;
                        shortsItem.updatedAt = new Date().toISOString();
                    } else {
                        shortsItem.status = 'draft';
                        console.error(`Render failed for ${shortsId}`);
                    }

                    deliveryData.lastUpdated = new Date().toISOString();
                    fs.writeFileSync(DELIVERY_FILE, JSON.stringify(deliveryData, null, 2));
                    io.emit('delivery-data', deliveryData);
                }
            }
        });

        socket.emit('render-started', { shortsId, result });
    });
});

// A-Roll Watcher Disabled
/*
const arollWatcher = chokidar.watch(SHORTS_AROLL_DIR, {
    ignored: /(^|[\/\\])\../,
    persistent: true
});

arollWatcher.on('add', (filePath) => {
    ...
});
*/

/*
setTimeout(() => {
    updateARollStatus();
}, 1000);
*/

const PORT = parseInt(process.env.PORT || '3002', 10);

// ============================================================
// REST API Endpoints
// ============================================================

// --- Project Management ---

// List all available projects under Projects/
app.get('/api/projects', (req, res) => {
    try {
        if (!fs.existsSync(PROJECTS_BASE)) {
            return res.json({ projects: [], active: currentProjectName });
        }
        const dirs = fs.readdirSync(PROJECTS_BASE, { withFileTypes: true })
            .filter(d => d.isDirectory() && !d.name.startsWith('.'))
            .map(d => ({
                name: d.name,
                isActive: d.name === currentProjectName,
                hasDeliveryStore: fs.existsSync(
                    path.join(PROJECTS_BASE, d.name, 'delivery_store.json')
                )
            }));
        res.json({ projects: dirs, active: currentProjectName });
    } catch (error: any) {
        console.error('Projects API Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Switch active project at runtime
app.post('/api/projects/switch', (req, res) => {
    const { projectName } = req.body;
    if (!projectName) {
        return res.status(400).json({ error: 'Missing projectName' });
    }

    const newRoot = path.resolve(PROJECTS_BASE, projectName);
    if (!fs.existsSync(newRoot)) {
        return res.status(404).json({ error: `项目目录不存在: Projects/${projectName}` });
    }

    // Update mutable project context
    currentProjectName = projectName;
    PROJECT_ROOT = newRoot;
    DELIVERY_FILE = path.join(PROJECT_ROOT, 'delivery_store.json');
    SHORTS_AROLL_DIR = path.join(PROJECT_ROOT, '09_shorts_aroll');

    // Also update process.env so youtube-auth.ts picks it up
    process.env.PROJECT_NAME = projectName;

    console.log(`🔀 Switched to project: ${currentProjectName}`);
    console.log(`📂 Project: ${PROJECT_ROOT}`);

    // Re-init delivery file & watchers
    ensureDeliveryFile();
    setupProjectWatcher();
    setupExpertWatchers();
    setupVisualPlanWatcher(io, PROJECT_ROOT);

    // Push new data to ALL connected clients
    const data = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));

    // Auto-heal mismatched projectId in delivery_store.json
    if (data.projectId !== currentProjectName) {
        console.log(`Auto-fixing projectId in ${DELIVERY_FILE}: ${data.projectId} -> ${currentProjectName}`);
        data.projectId = currentProjectName;
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(DELIVERY_FILE, JSON.stringify(data, null, 2));
    }

    io.emit('delivery-data', data);
    io.emit('active-project', { name: currentProjectName });

    res.json({ success: true, project: currentProjectName, projectRoot: PROJECT_ROOT });
});

// --- File Browser ---
app.get('/api/files', async (req, res) => {
    try {
        let dir = req.query.dir as string || process.cwd();
        dir = path.resolve(dir);

        // Security Audit Fix: Path Traversal
        const resolvedBase = path.resolve(PROJECTS_BASE);
        const resolvedCurrent = path.resolve(process.cwd());
        if (!dir.startsWith(resolvedBase) && !dir.startsWith(resolvedCurrent)) {
            return res.status(403).json({ error: 'Access denied: Directory traversal detected' });
        }

        if (!fs.existsSync(dir)) {
            return res.status(404).json({ error: 'Directory not found' });
        }

        const items = fs.readdirSync(dir, { withFileTypes: true });

        const files = items.map(item => ({
            name: item.name,
            path: path.join(dir, item.name),
            isDirectory: item.isDirectory(),
            isVideo: item.isFile() && item.name.toLowerCase().endsWith('.mp4')
        }));

        files.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        res.json({
            currentDir: dir,
            parentDir: path.dirname(dir),
            files
        });
    } catch (error: any) {
        console.error('File Browser Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- Script Selector ---
const SCRIPTS_DIR = () => path.join(PROJECT_ROOT, '02_Script');

interface ScriptFile {
    name: string;
    path: string;
    size: number;
    modifiedAt: string;
}

app.get('/api/scripts', (req, res) => {
    try {
        // Support explicit projectId to avoid race conditions during project switching
        const requestedProject = req.query.projectId as string | undefined;
        const projectRoot = requestedProject
            ? path.resolve(PROJECTS_BASE, requestedProject)
            : PROJECT_ROOT;
        const scriptsDir = path.join(projectRoot, '02_Script');

        if (!fs.existsSync(scriptsDir)) {
            return res.json({ scripts: [], selected: null, message: '02_Script 目录不存在' });
        }

        const files = fs.readdirSync(scriptsDir, { withFileTypes: true })
            .filter(f => f.isFile() && f.name.toLowerCase().endsWith('.md'))
            .map(f => {
                const fullPath = path.join(scriptsDir, f.name);
                const stats = fs.statSync(fullPath);
                return {
                    name: f.name,
                    path: `02_Script/${f.name}`,
                    size: stats.size,
                    modifiedAt: stats.mtime.toISOString().split('T')[0]
                } as ScriptFile;
            })
            .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

        const deliveryData = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
        const selected = deliveryData.selectedScript?.path || null;

        res.json({ scripts: files, selected });
    } catch (error: any) {
        console.error('Scripts API Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/scripts/select', (req, res) => {
    try {
        const { path: scriptPath } = req.body;
        if (!scriptPath) {
            return res.status(400).json({ error: 'Missing path' });
        }

        const fullPath = path.join(PROJECT_ROOT, scriptPath);
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'Script file not found' });
        }

        let isStoreLocked = false;
        const tryUpdate = () => {
            if (isStoreLocked) {
                setTimeout(tryUpdate, 50);
                return;
            }
            isStoreLocked = true;
            try {
                const deliveryData = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
                deliveryData.selectedScript = {
                    filename: path.basename(scriptPath),
                    path: scriptPath,
                    selectedAt: new Date().toISOString()
                };
                // Reset phase proposals when a new script is chosen
                if (deliveryData.modules?.director) {
                    deliveryData.modules.director.conceptProposal = "";
                    deliveryData.modules.director.isConceptApproved = false;
                }
                if (deliveryData.modules?.music) {
                    deliveryData.modules.music.moodProposal = "";
                    deliveryData.modules.music.isConceptApproved = false;
                }

                deliveryData.lastUpdated = new Date().toISOString();
                fs.writeFileSync(DELIVERY_FILE, JSON.stringify(deliveryData, null, 2));
                io.emit('delivery-data', deliveryData);
            } finally {
                isStoreLocked = false;
            }
        };
        tryUpdate();

        res.json({ success: true, selectedScript: { path: scriptPath } });
    } catch (error: any) {
        console.error('Script Select Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- Expert APIs ---

const TASKS_DIR = () => path.join(PROJECT_ROOT, '.tasks');

app.get('/api/experts', (req, res) => {
    res.json({ experts: EXPERTS_CONFIG });
});

app.post('/api/experts/start', (req, res) => {
    try {
        const { expertId, scriptPath } = req.body;
        if (!expertId || !scriptPath) {
            return res.status(400).json({ error: 'Missing expertId or scriptPath' });
        }

        const expert = EXPERTS_CONFIG.find(e => e.id === expertId);
        if (!expert) {
            return res.status(404).json({ error: 'Expert not found' });
        }

        const tasksDir = TASKS_DIR();
        if (!fs.existsSync(tasksDir)) {
            fs.mkdirSync(tasksDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const taskId = `expert_${expertId}_${timestamp}`;
        const taskFile = path.join(tasksDir, `${taskId}.json`);

        const taskData = {
            taskId,
            type: 'expert',
            expertId,
            skillName: expert.skillName,
            project: currentProjectName,
            input: {
                scriptPath
            },
            outputDir: expert.outputDir,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        fs.writeFileSync(taskFile, JSON.stringify(taskData, null, 2));
        console.log(`📝 Task created: ${taskId}`);

        const deliveryData = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
        if (!deliveryData.experts) {
            deliveryData.experts = {};
        }
        deliveryData.experts[expertId] = {
            status: 'pending',
            startedAt: new Date().toISOString(),
            logs: [`任务已创建: ${taskId}`, `等待在 Antigravity 中执行 ${expert.skillName} skill`]
        };
        deliveryData.lastUpdated = new Date().toISOString();
        fs.writeFileSync(DELIVERY_FILE, JSON.stringify(deliveryData, null, 2));

        io.emit('delivery-data', deliveryData);

        res.json({ success: true, taskId, taskFile, message: '请在 Antigravity 中执行对应 skill' });
    } catch (error: any) {
        console.error('Expert Start Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Sync Skills Manually
app.post('/api/skills/sync', (req, res) => {
    syncSkills(io);
    res.json({ success: true, message: 'Skill sync started' });
});

// Get Skill Status
app.get('/api/skills/status', (req, res) => {
    try {
        const python = spawn('python3', [
            path.resolve(__dirname, '../run_skill.py'),
            'status'
        ], { timeout: 60000, env: { ...process.env } }); // 60s timeout

        let output = '';
        python.stdout.on('data', (data) => { output += data; });
        python.on('close', (code) => {
            if (code === 0) {
                res.json(JSON.parse(output));
            } else {
                res.status(500).json({ error: 'Failed to get skill status' });
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Execute Skill (NEW - Auto mode)
app.post('/api/experts/run', (req, res) => {
    try {
        const { expertId, scriptPath } = req.body;
        if (!expertId || !scriptPath) {
            return res.status(400).json({ error: 'Missing expertId or scriptPath' });
        }

        const expert = EXPERTS_CONFIG.find(e => e.id === expertId);
        if (!expert) {
            return res.status(404).json({ error: 'Expert not found' });
        }

        // Read script content
        const scriptFullPath = path.join(PROJECT_ROOT, scriptPath);
        if (!fs.existsSync(scriptFullPath)) {
            return res.status(404).json({ error: 'Script file not found' });
        }

        const scriptContent = fs.readFileSync(scriptFullPath, 'utf-8');
        const outputDir = path.join(PROJECT_ROOT, expert.outputDir);

        // Update status to running
        const deliveryData = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
        if (!deliveryData.experts) {
            deliveryData.experts = {};
        }
        deliveryData.experts[expertId] = {
            status: 'running',
            startedAt: new Date().toISOString(),
            logs: ['正在执行 Skill...']
        };
        deliveryData.lastUpdated = new Date().toISOString();
        fs.writeFileSync(DELIVERY_FILE, JSON.stringify(deliveryData, null, 2));
        io.emit('delivery-data', deliveryData);

        // Execute Python skill (pass script content via stdin) with timeout 10 mins
        const python = spawn('python3', [
            path.resolve(__dirname, '../run_skill.py'),
            'execute',
            expertId,
            currentProjectName,
            outputDir
        ], { timeout: 600000, env: { ...process.env } });

        // Write script content to stdin
        python.stdin.write(scriptContent);
        python.stdin.end();

        let output = '';
        let errorOutput = '';

        python.stdout.on('data', (data) => {
            output += data;
        });

        python.stderr.on('data', (data) => {
            errorOutput += data;
        });

        python.on('close', (code) => {
            console.log(`Skill execution completed with code ${code}`);

            try {
                const result = JSON.parse(output);

                if (result.success) {
                    // Update status to completed
                    const updatedData = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
                    updatedData.experts[expertId] = {
                        status: 'completed',
                        startedAt: deliveryData.experts[expertId].startedAt,
                        completedAt: new Date().toISOString(),
                        outputPath: result.output_files[0] || '',
                        outputContent: result.logs.join('\n'),
                        logs: result.logs
                    };
                    updatedData.lastUpdated = new Date().toISOString();
                    fs.writeFileSync(DELIVERY_FILE, JSON.stringify(updatedData, null, 2));
                    io.emit('delivery-data', updatedData);

                    res.json({
                        success: true,
                        outputFiles: result.output_files,
                        logs: result.logs
                    });
                } else {
                    // Update status to failed
                    const updatedData = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
                    updatedData.experts[expertId] = {
                        status: 'failed',
                        startedAt: deliveryData.experts[expertId].startedAt,
                        error: result.error,
                        logs: result.logs
                    };
                    updatedData.lastUpdated = new Date().toISOString();
                    fs.writeFileSync(DELIVERY_FILE, JSON.stringify(updatedData, null, 2));
                    io.emit('delivery-data', updatedData);

                    res.status(500).json({
                        error: result.error,
                        logs: result.logs
                    });
                }
            } catch (e) {
                console.error('Failed to parse skill output:', e);
                res.status(500).json({ error: 'Failed to parse skill output' });
            }
        });

    } catch (error: any) {
        console.error('Expert Run Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Start Server
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🔒 Server running on http://0.0.0.0:${PORT} (Docker Friendly)`);
    console.log(`📂 Project: ${PROJECT_ROOT}`);
    console.log(`📄 Data file: ${DELIVERY_FILE}`);
    //    console.log(`🎬 A-roll dir: ${SHORTS_AROLL_DIR}`);
});
