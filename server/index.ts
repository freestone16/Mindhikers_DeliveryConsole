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
import multer from 'multer';

import youtubeAuthRouter from './youtube-auth';
import distributionRouter from './distribution';
import { setupVisualPlanWatcher, getVisualPlan, updateSceneReview, closeVisualPlanWatcher } from './visual-plan';
import { syncSkills, sendSyncStatusToSocket } from './skill-sync';
import { getConfigStatus, saveApiKey, updateConfig, testConnection, getSavedKeys, loadConfig, testAllConnections } from './llm-config';
import * as director from './director';
import * as shorts from './shorts';
import { callLLMStream, loadExpertContext, loadChatHistory, saveChatHistory, clearChatHistory, formatMultimodalMessages } from './chat';
import { materialUpload, handleMaterialUpload, checkMaterialExists } from './upload_handler';
import { getAdapter, backupDeliveryStore, generateActionDescription } from './expert-actions';
import { DIRECTOR_BRIDGE_ACTION_NAME, getDirectorBridgeToolDefinitions, resolveDirectorBridgeAction } from './director-bridge';
import { ensureExpertState, loadExpertState, saveExpertState, EXPERT_OUTPUT_DIRS } from './expert_state_manager';
import marketRouter from './market';
import { createDefaultShutdown } from './graceful-shutdown';
import { setupHealthCheck } from './health';
import { resolveGlobalLLMConfig } from '../src/schemas/llm-config';
import { getProjectRoot, getProjectsBase, ensureProjectsBaseExists } from './project-paths';
import { consumePendingConfirm, createPendingConfirm } from './security/pending-confirm-store';

const upload = multer({ dest: 'uploads/' });

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const app = express();

// [C4] CORS Origin 白名单 — 只允许本地前端和显式配置的 origin
const corsAllowlist = [
    'http://localhost:5178',
    'http://localhost:5173',
    'http://127.0.0.1:5178',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_ORIGIN,
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || corsAllowlist.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS not allowed'));
        }
    },
}));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: corsAllowlist,
        methods: ["GET", "POST"]
    }
});

function resolveChatGatewayConfig(config: ReturnType<typeof loadConfig>) {
    // Chatbox follows the global gateway to avoid hidden expert-level model drift.
    return resolveGlobalLLMConfig(config);
}

function buildSystemActionHistoryMessage(payload: {
    confirmId: string;
    actionName: string;
    actionArgs: Record<string, any>;
    description: string;
    title?: string;
    targetLabel?: string;
    diffLabel?: string;
}) {
    return {
        id: `msg_${Date.now()}`,
        role: 'system' as const,
        content: '',
        kind: 'system_action' as const,
        timestamp: new Date().toISOString(),
        actionConfirm: {
            confirmId: payload.confirmId,
            actionName: payload.actionName,
            actionArgs: payload.actionArgs,
            description: payload.description,
            title: payload.title,
            targetLabel: payload.targetLabel,
            diffLabel: payload.diffLabel,
            status: 'pending' as const,
        },
    };
}

function emitAndPersistActionConfirm(
    socket: any,
    projectRoot: string,
    expertId: string,
    historyMessages: any[],
    payload: {
        confirmId: string;
        actionName: string;
        actionArgs: Record<string, any>;
        description: string;
        title?: string;
        targetLabel?: string;
        diffLabel?: string;
    }
) {
    // [C2] 将确认动作存入 pending confirm 表，供 chat-action-execute 消费
    const projectId = socketToProjectMap.get(socket) || '';
    createPendingConfirm({
        actionName: payload.actionName,
        actionArgs: payload.actionArgs,
        expertId,
        projectId,
    });

    socket.emit('chat-action-confirm', {
        expertId,
        ...payload,
    });

    saveChatHistory(projectRoot, expertId, [
        ...historyMessages,
        buildSystemActionHistoryMessage(payload),
    ]);
}

// --- Project Context (Mutable - supports runtime switching) ---
// Docker: PROJECTS_BASE=/data/projects  |  Local: fallback to ../../Projects
// No longer globally hardcoded. Projects are specified per request.
let currentProjectName: string | null = null; // Track active project for server-side operations

// Socket.IO Room isolation - track which project each socket belongs to
const socketToProjectMap = new Map<any, string>();
// let PROJECT_ROOT = getProjectRoot(currentProjectName);
// let DELIVERY_FILE = path.join(PROJECT_ROOT, 'delivery_store.json');
// let SHORTS_AROLL_DIR = path.join(PROJECT_ROOT, '09_shorts_aroll');

// This initial check is no longer relevant as PROJECT_ROOT is dynamic
// if (!fs.existsSync(PROJECT_ROOT)) {
//     console.error(`❌ 项目目录不存在: ${PROJECT_ROOT}`);
//     console.error(`   请确认 Projects/${currentProjectName} 文件夹存在`);
//     process.exit(1);
// }

// --- Experts Configuration ---
const EXPERTS_CONFIG = [
    { id: 'Director', skillName: 'Director', outputDir: '04_Visuals' },
    { id: 'MusicDirector', skillName: 'MusicDirector', outputDir: '04_Music_Plan' },
    { id: 'ThumbnailMaster', skillName: 'ThumbnailMaster', outputDir: '03_Thumbnail_Plan' },
    { id: 'ShortsMaster', skillName: 'ShortsMaster', outputDir: '05_Shorts_Output' },
    { id: 'MarketingMaster', skillName: 'MarketingMaster', outputDir: '05_Marketing' }
];

// --- Version Auto-Detection (from git log) ---
function getAppVersion(): string {
    try {
        // Try to get version from git log (e.g., "v3.7.1")
        const { execSync } = require('child_process');
        try {
            // Get just the commit subject (first line), using current working directory
            const commitSubject = execSync('git log -1 --pretty=%s', { encoding: 'utf-8' });
            // Match version pattern (v3.7, v3.7.1, etc.)
            const versionMatch = commitSubject.match(/v(\d+\.\d+(?:\.\d+)?)/);
            if (versionMatch) {
                return `v${versionMatch[1]}`;
            }
        } catch (e) {
            // Git error, fall through
        }

        // Fallback to package.json version
        const packageJsonPath = path.join(__dirname, '../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return `v${packageJson.version}`;
    } catch (e) {
        return 'v0.0.0';
    }
}

app.use(express.json());

// Serve temp_images as static files (Remotion CLI needs HTTP access to generated images)
app.use('/temp_images', express.static(path.join(process.cwd(), 'temp_images')));

// Mount YouTube Auth Routes
app.use(youtubeAuthRouter);

// Mount Distribution Console Routes
app.use('/api/distribution', distributionRouter);

// Visual Plan Routes
app.get('/api/visual-plan', getVisualPlan);
app.post('/api/visual-plan/scene/review', updateSceneReview);

// Version Route
app.get('/api/version', (req, res) => {
    try {
        const version = getAppVersion();
        res.json({ version });
    } catch (e: any) {
        res.json({ version: 'v0.0.0' });
    }
});

// LLM Config Routes
app.get('/api/llm-config/status', getConfigStatus);
app.get('/api/llm-config/keys', getSavedKeys);
app.post('/api/llm-config/api-key', saveApiKey);
app.put('/api/llm-config', updateConfig);
app.post('/api/llm-config/test', testConnection);
app.post('/api/llm-config/test-all', testAllConnections);

// Director Phase 1-3 Routes
app.post('/api/director/phase1/generate', director.generatePhase1);
app.post('/api/director/phase1/revise', director.reviseConcept);
app.post('/api/director/phase2/start', director.startPhase2);
app.get('/api/director/phase2/status/:taskId', director.getPhase2Status);
app.post('/api/director/phase2/select', director.selectOption);
app.post('/api/director/phase2/lock', director.lockChapter);
app.post('/api/director/phase2/thumbnail', director.generateThumbnail);
app.get('/api/director/phase2/thumbnail/:taskKey', director.getThumbnailStatus);
app.post('/api/director/phase3/render', director.startRender);
app.get('/api/director/phase3/status/:jobId', director.getRenderStatus);

// Director Phase 2/3 Refactor Routes (SD-202)
app.post('/api/director/phase2/render_checked', director.phase2RenderChecked);
app.post('/api/director/phase2/revise-option', director.phase2ReviseOption);

// Director Phase 3 (二审 MP4 Video Render)
app.post('/api/director/phase3/render-batch', director.phase3RenderBatch);
app.get('/api/director/phase3/video/:taskKey', director.getVideoStatus);
app.get('/api/director/phase3/video-file/:projectId/:filename', director.serveVideoFile);

// Director Phase 4 (XML 导出 — 原 Phase 3)
app.post('/api/director/phase4/align-srt', director.phase3AlignSrt);
app.post('/api/director/phase4/generate-xml', director.phase3GenerateXml);
app.get('/api/director/phase4/download-xml/:projectId/:format', director.phase3DownloadXml);
app.get('/api/director/phase4/scan-srt', director.phase4ScanSrt);
app.get('/api/director/phase4/read-srt/:filename', director.phase4ReadSrt);

// Keep old phase3 XML routes as aliases for backwards compat
app.post('/api/director/phase3/align-srt', director.phase3AlignSrt);
app.post('/api/director/phase3/generate-xml', director.phase3GenerateXml);
app.get('/api/director/phase3/download-xml/:projectId/:format', director.phase3DownloadXml);

// Material Upload Routes (SD-209 Phase 3 Loop Closure)
app.post('/api/director/upload-material', materialUpload.single('videoFile'), handleMaterialUpload);
app.get('/api/director/material-exists', checkMaterialExists);

// Director Artifacts Route
app.get('/api/director/artifacts', director.listArtifacts);
app.get('/api/director/handoff', director.getHandoffStatus);


// Shorts Master Routes (SD-206)
app.post('/api/shorts/phase1/recommend', shorts.recommend);
app.post('/api/shorts/phase1/generate', shorts.generateScripts);
app.post('/api/shorts/phase2/save-script', shorts.saveScript);
app.post('/api/shorts/phase2/regenerate', shorts.regenerateScript);
app.post('/api/shorts/phase2/confirm-all', shorts.confirmAll);
app.post('/api/shorts/phase3/upload-aroll', upload.single('videoFile'), shorts.uploadAroll);
app.post('/api/shorts/phase3/generate-brolls', shorts.generateBrolls);
app.post('/api/shorts/phase3/transcribe', shorts.transcribe);
app.put('/api/shorts/phase3/subtitle-segments/:shortId', shorts.updateSubtitleSegments);
app.get('/api/shorts/subtitle-configs', shorts.getSubtitleConfigs);
app.put('/api/shorts/subtitle-configs/:id', shorts.updateSubtitleConfig);
app.get('/api/shorts/header-config', shorts.getHeaderConfig);
app.put('/api/shorts/header-config', upload.fields([
    { name: 'leftLogo', maxCount: 1 },
    { name: 'rightLogo', maxCount: 1 }
]), shorts.updateHeaderConfig);
app.post('/api/shorts/phase3/render', shorts.renderShort);
app.get('/api/shorts/phase3/render-status/:jobId', shorts.getRenderStatus);

// Market Master Routes (SD-207)
app.use('/api/market', marketRouter);

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

function ensureDeliveryFile(projectId: string) {
    const projectRoot = getProjectRoot(projectId);
    const deliveryFile = path.join(projectRoot, 'delivery_store.json');

    const initialState = {
        projectId,
        lastUpdated: new Date().toISOString(),
        selectedScript: null
    };
    if (!fs.existsSync(deliveryFile)) {
        console.log(`Creating new delivery_store.json for ${projectId}`);
        if (!fs.existsSync(projectRoot)) {
            fs.mkdirSync(projectRoot, { recursive: true });
        }
        fs.writeFileSync(deliveryFile, JSON.stringify(initialState, null, 2));
    } else {
        // If it exists, we still want to ensure it has the basic structure,
        // but we don't want to overwrite existing data unless explicitly migrating.
        // For now, just ensure projectId is correct and add selectedScript if missing.
        const data = JSON.parse(fs.readFileSync(deliveryFile, 'utf-8'));
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
            fs.writeFileSync(deliveryFile, JSON.stringify(data, null, 2));
        }
        // Auto-heal mismatched projectId in delivery_store.json
        if (data.projectId !== projectId) {
            console.log(`Auto-fixing projectId in ${deliveryFile}: ${data.projectId} -> ${projectId}`);
            data.projectId = projectId;
            data.lastUpdated = new Date().toISOString();
            fs.writeFileSync(deliveryFile, JSON.stringify(data, null, 2));
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

function setupProjectWatcher(projectId: string) {
    if (deliveryWatcher) {
        deliveryWatcher.close();
    }
    const deliveryFile = path.join(getProjectRoot(projectId), 'delivery_store.json');
    deliveryWatcher = chokidar.watch(deliveryFile, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 100
        }
    });

    deliveryWatcher.on('change', () => {
        try {
            console.log(`delivery_store.json changed for project ${projectId}, broadcasting...`);
            const data = JSON.parse(fs.readFileSync(deliveryFile, 'utf-8'));
            io.to(currentProjectName).emit('delivery-data', data);
        } catch (e) {
            console.error('Error reading delivery file on change:', e);
        }
    });
}

function setupExpertWatchers(projectId: string) {
    expertWatchers.forEach(w => w.close());
    expertWatchers = [];

    const projectRoot = getProjectRoot(projectId);
    const deliveryFile = path.join(projectRoot, 'delivery_store.json');

    EXPERTS_CONFIG.forEach(expert => {
        const outputDir = path.join(projectRoot, expert.outputDir);
        if (!fs.existsSync(outputDir)) {
            return;
        }

        // Scan existing files on startup
        const existingFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.md'));
        if (existingFiles.length > 0) {
            console.log(`📂 [${expert.id}] Found ${existingFiles.length} existing files in ${expert.outputDir} for project ${projectId}`);

            const deliveryData = JSON.parse(fs.readFileSync(deliveryFile, 'utf-8'));
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
                fs.writeFileSync(deliveryFile, JSON.stringify(deliveryData, null, 2));
                io.to(currentProjectName).emit('delivery-data', deliveryData);
            }
        }

        const watcher = chokidar.watch(outputDir, {
            ignored: /(^|[\/\\])\../,
            persistent: true
        });

        watcher.on('add', (filePath) => {
            if (!filePath.endsWith('.md')) return;
            console.log(`📄 New output detected: ${filePath} for ${expert.id} in project ${projectId}`);

            const deliveryData = JSON.parse(fs.readFileSync(deliveryFile, 'utf-8'));
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
                fs.writeFileSync(deliveryFile, JSON.stringify(deliveryData, null, 2));
                io.to(currentProjectName).emit('delivery-data', deliveryData);
            }
        });

        expertWatchers.push(watcher);
    });

    console.log(`👁️ Watching ${expertWatchers.length} expert output directories for project ${projectId}`);
}

function hasMeaningfulDirectorData(stateData: any): boolean {
    if (!stateData || typeof stateData !== 'object') return false;
    if (Array.isArray(stateData.items) && stateData.items.length > 0) return true;
    return Boolean(
        stateData.phase ||
        stateData.isConceptApproved ||
        stateData.conceptProposal ||
        stateData.conceptFeedback
    );
}

function syncDirectorModuleToDeliveryStore(projectRoot: string, directorPayload?: any) {
    const deliveryFile = path.join(projectRoot, 'delivery_store.json');
    if (!fs.existsSync(deliveryFile)) return null;

    const deliveryData = JSON.parse(fs.readFileSync(deliveryFile, 'utf-8'));
    const directorState = directorPayload ?? loadExpertState(projectRoot, 'Director');
    const directorData = directorState?.data !== undefined ? directorState.data : directorState;

    if (!directorPayload && !hasMeaningfulDirectorData(directorData)) {
        return deliveryData;
    }

    if (!deliveryData.modules) {
        deliveryData.modules = {};
    }

    deliveryData.modules.director = {
        ...(deliveryData.modules.director || {}),
        ...(directorData || {}),
    };
    deliveryData.lastUpdated = new Date().toISOString();
    fs.writeFileSync(deliveryFile, JSON.stringify(deliveryData, null, 2));
    return deliveryData;
}

function hydrateSocketProjectContext(socket: any, projectId: string) {
    currentProjectName = projectId;
    socket.join(projectId);
    socketToProjectMap.set(socket, projectId);
    console.log(`Socket ${socket.id} joined room: ${projectId}`);

    ensureDeliveryFile(projectId);

    const projectRoot = getProjectRoot(projectId);
    Object.keys(EXPERT_OUTPUT_DIRS).forEach((expertId) => {
        ensureExpertState(projectRoot, expertId);
    });

    setupProjectWatcher(projectId);
    setupExpertWatchers(projectId);
    setupVisualPlanWatcher(io, projectRoot);

    const deliveryFile = path.join(projectRoot, 'delivery_store.json');
    const data = syncDirectorModuleToDeliveryStore(projectRoot) || JSON.parse(fs.readFileSync(deliveryFile, 'utf-8'));
    socket.emit('delivery-data', data);

    Object.keys(EXPERT_OUTPUT_DIRS).forEach((expertId) => {
        const expertData = loadExpertState(projectRoot, expertId);
        socket.emit(`expert-data-update:${expertId}`, expertData);
    });

    socket.emit('active-project', { name: projectId });
}

// Initial setup is now deferred until a project connects
// ensureDeliveryFile();
// setupProjectWatcher();
// setupExpertWatchers();
// setupVisualPlanWatcher(io, PROJECT_ROOT);

// Initial Skill Sync
syncSkills(io);

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        const projectId = socketToProjectMap.get(socket);
        if (projectId) {
            socket.leave(projectId);
            socketToProjectMap.delete(socket);
            console.log(`Socket ${socket.id} left room: ${projectId}`);
        }
    });
    // Send current project data (if any is active on server, though now it's client-driven)
    // if (fs.existsSync(DELIVERY_FILE)) {
    //     const data = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
    //     socket.emit('delivery-data', data);
    // }
    // Also send active project name (if any)
    socket.emit('active-project', { name: currentProjectName });

    if (currentProjectName) {
        try {
            hydrateSocketProjectContext(socket, currentProjectName);
        } catch (e) {
            console.error(`Failed to hydrate socket ${socket.id} for active project ${currentProjectName}:`, e);
        }
    }

    // Send skill sync status to newly connected client
    sendSyncStatusToSocket(socket);

    socket.on('select-project', (projectId) => {
        console.log(`Client ${socket.id} selected project: ${projectId}`);
        currentProjectName = projectId; // Update server's active project

        // Socket.IO Room isolation: join the project room
        const oldProjectId = socketToProjectMap.get(socket);
        if (oldProjectId && oldProjectId !== projectId) {
            socket.leave(oldProjectId);
            console.log(`Socket ${socket.id} left room: ${oldProjectId}`);

            // 清除旧项目的临时状态文件（防止卡在旧状态）
            const oldProjectRoot = getProjectRoot(oldProjectId);
            const oldPhase2ReviewPath = path.join(oldProjectRoot, '04_Visuals', 'phase2_review_state.json');
            try {
                if (fs.existsSync(oldPhase2ReviewPath)) {
                    fs.unlinkSync(oldPhase2ReviewPath);
                    console.log(`[select-project] Cleared old phase2_review_state.json for ${oldProjectId}`);
                }
            } catch (e) {
                console.error('Failed to clear old phase2 state:', e);
            }
        }

        try {
            hydrateSocketProjectContext(socket, projectId);
        } catch (e) {
            console.error('Failed to read delivery file:', e);
        }
    });

    socket.on('update-data', (newData) => {
        if (!newData.projectId) {
            console.error('Received update-data without projectId');
            return;
        }
        const deliveryFile = path.join(getProjectRoot(newData.projectId), 'delivery_store.json');
        console.log(`Received update from client for ${newData.projectId}`);
        newData.lastUpdated = new Date().toISOString();
        fs.writeFileSync(deliveryFile, JSON.stringify(newData, null, 2));
        io.to(newData.projectId).emit('delivery-data', newData); // Send to project room
    });

    // 🔑 前端 listener 注册后主动请求 hydration，解决 socket 事件时序竞态
    socket.on('request-expert-hydration', ({ expertId }: { expertId: string }) => {
        const projectId = socketToProjectMap.get(socket);
        if (!projectId || !expertId) return;
        const projectRoot = getProjectRoot(projectId);
        const expertData = loadExpertState(projectRoot, expertId);
        console.log(`[Hydration] Re-sending ${expertId} state to socket ${socket.id} (project: ${projectId})`);
        socket.emit(`expert-data-update:${expertId}`, expertData);
    });

    socket.on('update-expert-data', (payload) => {
        const { expertId, projectId, data } = payload || {};
        if (!projectId || !expertId) {
            console.error('Received update-expert-data missing fields');
            return;
        }
        const projectRoot = getProjectRoot(projectId);
        console.log(`Received expert update for ${expertId} in ${projectId}`);
        saveExpertState(projectRoot, expertId, data);

        if (expertId === 'Director') {
            const deliveryData = syncDirectorModuleToDeliveryStore(projectRoot, data);
            if (deliveryData) {
                io.to(projectId).emit('delivery-data', deliveryData);
            }
        }

        io.to(projectId).emit(`expert-data-update:${expertId}`, data);
    });

    socket.on('start-render', (data) => {
        const { shortsId, projectId } = data;
        if (!projectId) {
            console.error('start-render called without projectId');
            return;
        }
        const projectRoot = getProjectRoot(projectId);
        const deliveryFile = path.join(projectRoot, 'delivery_store.json');

        console.log(`Starting render for Shorts${shortsId} in project ${projectId}`);

        const result = startRender(shortsId, projectRoot, (progress) => {
            socket.emit('render-progress', progress);

            if (progress.type === 'completed' || progress.type === 'failed') {
                const deliveryData = JSON.parse(fs.readFileSync(deliveryFile, 'utf-8'));
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
                    fs.writeFileSync(deliveryFile, JSON.stringify(deliveryData, null, 2));
                    io.to(currentProjectName).emit('delivery-data', deliveryData);
                }
            }
        });

        socket.emit('render-started', { shortsId, result });
    });

    // --- Chat Panel Socket Events ---

    socket.on('chat-load-context', async ({ expertId, projectId, scriptPath: clientScriptPath }) => {
        try {
            if (!projectId) throw new Error('projectId is required for chat-load-context');
            const projectRoot = getProjectRoot(projectId);
            let ctx = loadExpertContext(projectRoot, expertId, clientScriptPath || undefined);
            socket.emit('chat-context-loaded', { expertId, systemPrompt: ctx.systemPrompt });
        } catch (error: any) {
            socket.emit('chat-error', { error: error.message, expertId });
        }
    });

    socket.on('chat-load-history', ({ expertId, projectId }) => {
        try {
            if (!projectId) throw new Error('projectId is required for chat-load-history');
            const projectRoot = getProjectRoot(projectId);
            const messages = loadChatHistory(projectRoot, expertId);
            socket.emit('chat-history', { expertId, messages });
        } catch (error: any) {
            socket.emit('chat-error', { error: error.message, expertId });
        }
    });

    socket.on('chat-clear-history', ({ expertId, projectId }) => {
        try {
            if (!projectId) throw new Error('projectId is required for chat-clear-history');
            const projectRoot = getProjectRoot(projectId);
            clearChatHistory(projectRoot, expertId);
            socket.emit('chat-history', { expertId, messages: [] });
        } catch (error: any) {
            socket.emit('chat-error', { error: error.message, expertId });
        }
    });

    socket.on('chat-stream', async ({ messages, expertId, projectId }) => {
        try {
            console.log(`[Chat][V2] === chat-stream ENTRY (code version: 2026-03-05-v5) ===`);
            if (!projectId) throw new Error('projectId is required for chat-stream');
            const config = loadConfig();
            const { provider, model, baseUrl } = resolveChatGatewayConfig(config);
            const projectRoot = getProjectRoot(projectId);

            const adapter = getAdapter(expertId);
            const latestUserMessage = [...messages].reverse().find((message: any) => message.role === 'user' && typeof message.content === 'string');
            const fastPathResolution = latestUserMessage?.content
                ? adapter?.tryFastPath?.(latestUserMessage.content, projectRoot)
                : null;

            if (fastPathResolution) {
                emitAndPersistActionConfirm(socket, projectRoot, expertId, messages, {
                    confirmId: `confirm_${Date.now()}_fastpath`,
                    actionName: fastPathResolution.executionPlan.actionName,
                    actionArgs: fastPathResolution.executionPlan.actionArgs,
                    description: fastPathResolution.confirmCard.summary,
                    title: fastPathResolution.confirmCard.title,
                    targetLabel: fastPathResolution.confirmCard.targetLabel,
                    diffLabel: fastPathResolution.confirmCard.diffLabel,
                });
                return;
            }
            let tools = expertId === 'Director'
                ? getDirectorBridgeToolDefinitions()
                : adapter?.getToolDefinitions();

            // Build system prompt with optional skeleton context
            const context = loadExpertContext(projectRoot, expertId);
            let systemContent = context.systemPrompt;

            if (adapter) {
                const skeleton = adapter.getContextSkeleton(projectRoot);
                if (skeleton && skeleton !== '[]') {
                    // Inject skeleton into the System Prompt (not user messages)
                    // so it doesn't pollute conversation history and is always present
                    systemContent += `\n\n---\n## 📊 当前 B-Roll 数据骨架索引（用于理解用户引用，不可向用户透露原始 ID）\n${skeleton}`;
                }
            }

            const { formatted, warning } = formatMultimodalMessages(messages, provider);
            if (warning) {
                socket.emit('chat-warning', { warning, expertId });
            }

            const messagesWithContext = [
                { role: 'system' as const, content: systemContent },
                ...formatted,
            ];

            console.log(`[Chat] System prompt length: ${systemContent.length} chars, messages: ${formatted.length}`);

            let isToolCallTriggered = false;
            let toolCallIndex = 0;
            let assistantResponse = '';
            let confirmAlreadyEmitted = false; // 每次 chat-stream 最多发一个 confirm

            for await (const chunk of callLLMStream(messagesWithContext, provider, model, baseUrl, tools)) {
                if (typeof chunk === 'string') {
                    assistantResponse += chunk;
                    socket.emit('chat-chunk', { chunk, expertId });
                } else if (chunk.type === 'tool_call') {
                    isToolCallTriggered = true;
                    let parsedArgs: Record<string, any> = {};
                    try {
                        parsedArgs = JSON.parse(chunk.arguments || '{}');
                    } catch (e: any) {
                        console.error(`[Chat] Failed to parse tool_call[${toolCallIndex}]. Raw: "${chunk.arguments}"`);
                    }
                    console.log(`[Chat] Tool call[${toolCallIndex}] => ${chunk.functionName}(${JSON.stringify(parsedArgs)})`);

                    if (expertId === 'Director' && chunk.functionName === DIRECTOR_BRIDGE_ACTION_NAME) {
                        const resolution = resolveDirectorBridgeAction(parsedArgs, projectRoot);
                        const clarification = resolution.clarification?.message;

                        if (resolution.status === 'ready_to_confirm' && resolution.executionPlan && resolution.confirmCard) {
                            if (confirmAlreadyEmitted) {
                                console.warn(`[Chat] Suppressed duplicate confirm from LLM tool_call[${toolCallIndex}]: ${resolution.confirmCard.summary}`);
                            } else {
                                confirmAlreadyEmitted = true;
                                emitAndPersistActionConfirm(socket, projectRoot, expertId, messages, {
                                    confirmId: `confirm_${Date.now()}_${toolCallIndex}`,
                                    actionName: resolution.executionPlan.actionName,
                                    actionArgs: resolution.executionPlan.actionArgs,
                                    description: resolution.confirmCard.summary,
                                    title: resolution.confirmCard.title,
                                    targetLabel: resolution.confirmCard.targetLabel,
                                    diffLabel: resolution.confirmCard.diffLabel,
                                });
                            }
                        } else if (clarification) {
                            socket.emit('chat-confirmation', {
                                expertId,
                                message: clarification,
                            });
                            saveChatHistory(projectRoot, expertId, [
                                ...messages,
                                {
                                    id: `msg_${Date.now()}`,
                                    role: 'system',
                                    content: clarification,
                                    kind: 'system_status',
                                    systemTitle: '系统澄清',
                                    timestamp: new Date().toISOString(),
                                },
                            ]);
                        } else {
                            socket.emit('chat-error', {
                                expertId,
                                error: 'Director Bridge 未生成可执行结果。',
                            });
                        }
                    } else {
                        const desc = generateActionDescription(chunk.functionName, parsedArgs);
                        emitAndPersistActionConfirm(socket, projectRoot, expertId, messages, {
                            confirmId: `confirm_${Date.now()}_${toolCallIndex}`,
                            actionName: chunk.functionName,
                            actionArgs: parsedArgs,
                            description: desc
                        });
                    }
                    toolCallIndex++;
                }
            }

            if (!isToolCallTriggered) {
                socket.emit('chat-done', { expertId });
                const historyMessages = assistantResponse
                    ? [
                        ...messages,
                        {
                            id: `msg_${Date.now()}`,
                            role: 'assistant' as const,
                            content: assistantResponse,
                            kind: 'chat' as const,
                            timestamp: new Date().toISOString(),
                        },
                    ]
                    : messages;
                saveChatHistory(projectRoot, expertId, historyMessages);
            }

        } catch (error: any) {
            console.error('[Chat] Stream error:', error.message);
            socket.emit('chat-error', { error: error.message, expertId });
        }
    });

    socket.on('chat-action-execute', async ({ expertId, projectId, actionName, actionArgs, confirmId, historyMessages }) => {
        try {
            // [C2] 必须携带有效 confirmId，防止绕过 Bridge 直接执行
            if (!confirmId) {
                console.warn(`[Chat][SECURITY] chat-action-execute rejected: no confirmId (socket=${socket.id})`);
                socket.emit('chat-action-result', { expertId, success: false, message: '❌ 操作未经授权确认，请重新发起。' });
                return;
            }
            const pending = consumePendingConfirm(confirmId);
            if (!pending) {
                console.warn(`[Chat][SECURITY] chat-action-execute rejected: invalid/expired confirmId=${confirmId} (socket=${socket.id})`);
                socket.emit('chat-action-result', { expertId, success: false, message: '❌ 确认已过期或无效，请重新发起。' });
                return;
            }

            // [C2] 从 pending 表取 actionName/args/projectId，不信任客户端回传
            const resolvedActionName = pending.actionName;
            const resolvedActionArgs = pending.actionArgs;
            const resolvedProjectId = pending.projectId;

            console.log(`[Chat][DEBUG] chat-action-execute => action: ${resolvedActionName}, args:`, JSON.stringify(resolvedActionArgs));
            const projectRoot = getProjectRoot(resolvedProjectId);
            const adapter = getAdapter(pending.expertId);
            if (!adapter) throw new Error(`找不到专家 ${pending.expertId} 的处理器`);

            backupDeliveryStore(projectRoot);

            const result = await adapter.executeAction(resolvedActionName, resolvedActionArgs, projectRoot);

            if (result.success) {
                const resolvedExpertId = pending.expertId;
                // Read fresh data to broadcast
                const storePath = path.join(projectRoot, 'delivery_store.json');
                if (fs.existsSync(storePath)) {
                    const data = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
                    io.to(resolvedProjectId).emit('delivery-data', data);

                    if (resolvedExpertId === 'Director') {
                        const updatedItems = data.modules?.director?.items;
                        if (updatedItems) {
                            const directorState = loadExpertState(projectRoot, 'Director');
                            const mergedState = {
                                ...(directorState.data || directorState),
                                items: updatedItems,
                            };
                            saveExpertState(projectRoot, 'Director', mergedState);
                            const rooms = Array.from(socket.rooms || []);
                            console.log(`[Chat] Socket ${socket.id} rooms: [${rooms.join(', ')}], broadcasting to room "${resolvedProjectId}"`);
                            io.to(resolvedProjectId).emit('expert-data-update:Director', mergedState);
                            socket.emit('expert-data-update:Director', mergedState);
                            console.log(`[Chat] Director state synced: ${updatedItems.length} chapters pushed to frontend (room + direct)`);
                        }
                    }
                }

                if (pending.expertId === 'ShortsMaster') {
                    io.to(resolvedProjectId).emit('expert-data-update', { expertId: pending.expertId, action: resolvedActionName, data: result.data });
                }

                const freshState = pending.expertId === 'Director'
                    ? (() => { const s = loadExpertState(projectRoot, 'Director'); return s.data || s; })()
                    : undefined;
                if (freshState) {
                    const itemCount = freshState.items?.length || 0;
                    const sampleTypes = freshState.items?.slice(0, 3).map((ch: any) => ch.options?.map((o: any) => o.type).join(','));
                    console.log(`[Chat] 📦 expertState attached: ${itemCount} chapters, sample types: [${sampleTypes}]`);
                }
                socket.emit('chat-action-result', {
                    expertId: pending.expertId,
                    success: true,
                    message: '✅ 操作执行成功！请在左侧界面查看。',
                    ...(freshState ? { expertState: freshState } : {})
                });

                if (historyMessages) {
                    const confirmationMsg = {
                        id: `msg_${Date.now()}`,
                        role: 'system' as const,
                        content: '✅ 操作执行成功！',
                        kind: 'system_status' as const,
                        systemTitle: '系统执行结果',
                        timestamp: new Date().toISOString()
                    };
                    saveChatHistory(projectRoot, pending.expertId, [...historyMessages, confirmationMsg]);
                }
            } else {
                socket.emit('chat-action-result', { expertId: pending.expertId, success: false, message: `❌ 操作失败: ${result.error}` });
            }
        } catch (error: any) {
            console.error('[Chat] Execute action error:', error.message);
            socket.emit('chat-action-result', { expertId: pending?.expertId || expertId, success: false, message: `❌ 内部错误: ${error.message}` });
        }
    });

    socket.on('chat-save', ({ expertId, projectId, messages }) => {
        try {
            if (!projectId) throw new Error('projectId is required for chat-save');
            const projectRoot = getProjectRoot(projectId);
            saveChatHistory(projectRoot, expertId, messages);
        } catch (error: any) {
            console.error('Chat save error:', error.message);
        }
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

const PORT = parseInt(process.env.PORT || process.env.VITE_BACKEND_PORT || '3005', 10);

// ============================================================
// REST API Endpoints
// ============================================================

// --- Chat Panel (REST fallback) ---

app.post('/api/chat/context', (req, res) => {
    try {
        const { expertId, projectId, scriptPath } = req.body;
        if (!projectId) throw new Error('projectId is required');
        const projectRoot = getProjectRoot(projectId);
        const ctx = loadExpertContext(projectRoot, expertId, (scriptPath as string) || undefined);
        res.json(ctx);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/chat/history/:expertId', (req, res) => {
    try {
        const { expertId } = req.params;
        const projectId = req.query.projectId as string;
        if (!projectId) throw new Error('projectId is required');
        const projectRoot = getProjectRoot(projectId);
        const messages = loadChatHistory(projectRoot, expertId);
        res.json({ messages });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- Project Management ---

// List all available projects under Projects/
app.get('/api/projects', (req, res) => {
    try {
        const projectsBase = getProjectsBase();
        if (!fs.existsSync(projectsBase)) {
            return res.json({ projects: [], active: currentProjectName });
        }
        const dirs = fs.readdirSync(projectsBase, { withFileTypes: true })
            .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name.startsWith('CSET-'))
            .map(d => ({
                name: d.name,
                isActive: d.name === currentProjectName,
                hasDeliveryStore: fs.existsSync(
                    path.join(projectsBase, d.name, 'delivery_store.json')
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

    const newRoot = getProjectRoot(projectName);
    if (!fs.existsSync(newRoot)) {
        return res.status(404).json({ error: `项目目录不存在: Projects/${projectName}` });
    }

    // Update mutable project context
    currentProjectName = projectName;
    // PROJECT_ROOT = newRoot; // No longer global
    // DELIVERY_FILE = path.join(PROJECT_ROOT, 'delivery_store.json'); // No longer global
    // SHORTS_AROLL_DIR = path.join(PROJECT_ROOT, '09_shorts_aroll'); // No longer global

    // Also update process.env so youtube-auth.ts picks it up
    process.env.PROJECT_NAME = projectName;

    console.log(`🔀 Switched to project: ${currentProjectName}`);
    console.log(`📂 Project: ${newRoot}`);

    // Re-init delivery file & watchers
    ensureDeliveryFile(projectName);
    setupProjectWatcher(projectName);
    setupExpertWatchers(projectName);
    setupVisualPlanWatcher(io, newRoot);

    // Push new data to ALL connected clients
    const deliveryFile = path.join(newRoot, 'delivery_store.json');
    const data = JSON.parse(fs.readFileSync(deliveryFile, 'utf-8'));

    io.to(currentProjectName).emit('delivery-data', data);
    io.to(currentProjectName).emit('active-project', { name: currentProjectName });

    res.json({ success: true, project: currentProjectName, projectRoot: newRoot });
});

// --- File Browser ---
app.get('/api/files', async (req, res) => {
    try {
        let dir = req.query.dir as string || process.cwd();
        dir = path.resolve(dir);

        // Security Audit Fix: Path Traversal
        const resolvedBase = path.resolve(getProjectsBase());
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
// const SCRIPTS_DIR = () => path.join(PROJECT_ROOT, '02_Script'); // No longer global

interface ScriptFile {
    name: string;
    path: string;
    size: number;
    modifiedAt: string;
}

app.get('/api/scripts', (req, res) => {
    try {
        // Support explicit projectId to avoid race conditions during project switching
        const requestedProject = req.query.projectId as string;
        if (!requestedProject) {
            return res.status(400).json({ error: 'projectId is required' });
        }
        const projectRoot = getProjectRoot(requestedProject);
        const scriptsDir = path.join(projectRoot, '02_Script');
        const deliveryFile = path.join(projectRoot, 'delivery_store.json');

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

        const deliveryData = JSON.parse(fs.readFileSync(deliveryFile, 'utf-8'));
        const selected = deliveryData.selectedScript?.path || null;

        res.json({ scripts: files, selected });
    } catch (error: any) {
        console.error('Scripts API Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/scripts/content', (req, res) => {
    try {
        const { projectId, path: scriptPath } = req.body;
        if (!scriptPath || !projectId) {
            return res.status(400).json({ error: 'Missing projectId or path' });
        }

        const projectRoot = getProjectRoot(projectId);
        const fullPath = path.join(projectRoot, scriptPath);

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'Script file not found' });
        }

        const content = fs.readFileSync(fullPath, 'utf-8');
        res.json({ success: true, content });
    } catch (error: any) {
        console.error('Script Content API Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/scripts/select', (req, res) => {
    try {
        const { projectId, path: scriptPath } = req.body;
        if (!scriptPath || !projectId) {
            return res.status(400).json({ error: 'Missing projectId or path' });
        }

        const projectRoot = getProjectRoot(projectId);
        const deliveryFile = path.join(projectRoot, 'delivery_store.json');
        const fullPath = path.join(projectRoot, scriptPath);

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
                const deliveryData = JSON.parse(fs.readFileSync(deliveryFile, 'utf-8'));
                deliveryData.selectedScript = {
                    filename: path.basename(scriptPath),
                    path: scriptPath,
                    selectedAt: new Date().toISOString()
                };
                deliveryData.lastUpdated = new Date().toISOString();
                fs.writeFileSync(deliveryFile, JSON.stringify(deliveryData, null, 2));
                io.to(currentProjectName).emit('delivery-data', deliveryData);
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

// const TASKS_DIR = () => path.join(PROJECT_ROOT, '.tasks'); // No longer global

app.get('/api/experts', (req, res) => {
    res.json({ experts: EXPERTS_CONFIG });
});

// 🔑 确定性状态恢复：前端刷新/断连后通过 HTTP GET 拿到持久化状态
app.get('/api/expert-state/:expertId', (req, res) => {
    const { expertId } = req.params;
    const projectId = req.query.projectId as string;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    try {
        const projectRoot = getProjectRoot(projectId);
        const expertData = loadExpertState(projectRoot, expertId);
        const payload = expertData?.data !== undefined ? expertData.data : expertData;
        res.json({ success: true, data: payload });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/experts/start', (req, res) => {
    try {
        const { expertId, scriptPath, projectId } = req.body;
        if (!expertId || !scriptPath || !projectId) {
            return res.status(400).json({ error: 'Missing expertId, scriptPath, or projectId' });
        }

        const expert = EXPERTS_CONFIG.find(e => e.id === expertId);
        if (!expert) {
            return res.status(404).json({ error: 'Expert not found' });
        }

        const projectRoot = getProjectRoot(projectId);
        const tasksDir = path.join(projectRoot, '.tasks');
        const deliveryFile = path.join(projectRoot, 'delivery_store.json');

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
            project: projectId,
            input: {
                scriptPath
            },
            outputDir: expert.outputDir,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        fs.writeFileSync(taskFile, JSON.stringify(taskData, null, 2));
        console.log(`📝 Task created: ${taskId} for project ${projectId}`);

        // Update independent expert state
        const expertState = loadExpertState(projectRoot, expertId);
        expertState.status = 'pending';
        expertState.startedAt = new Date().toISOString();
        expertState.logs = [`任务已创建: ${taskId}`, `等待在 Antigravity 中执行 ${expert.skillName} skill`].concat(expertState.logs || []);
        saveExpertState(projectRoot, expertId, expertState);

        io.to(projectId).emit(`expert-data-update:${expertId}`, expertState);

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
        const { expertId, scriptPath, projectId } = req.body;
        if (!expertId || !scriptPath || !projectId) {
            return res.status(400).json({ error: 'Missing expertId, scriptPath, or projectId' });
        }

        const expert = EXPERTS_CONFIG.find(e => e.id === expertId);
        if (!expert) {
            return res.status(404).json({ error: 'Expert not found' });
        }

        // Read script content
        const projectRoot = getProjectRoot(projectId);
        const scriptFullPath = path.join(projectRoot, scriptPath);
        if (!fs.existsSync(scriptFullPath)) {
            return res.status(404).json({ error: 'Script file not found' });
        }

        const scriptContent = fs.readFileSync(scriptFullPath, 'utf-8');
        const outputDir = path.join(projectRoot, expert.outputDir);
        const deliveryFile = path.join(projectRoot, 'delivery_store.json');

        // Update status to running independently
        const expertState = loadExpertState(projectRoot, expertId);
        expertState.status = 'running';
        expertState.startedAt = new Date().toISOString();
        expertState.logs = ['正在执行 Skill...'].concat(expertState.logs || []);
        saveExpertState(projectRoot, expertId, expertState);
        io.to(projectId).emit(`expert-data-update:${expertId}`, expertState);

        // Execute Python skill (pass script content via stdin) with timeout 10 mins
        const python = spawn('python3', [
            path.resolve(__dirname, '../run_skill.py'),
            'execute',
            expertId,
            projectId,
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
                    // Update status to completed independently
                    const expertState = loadExpertState(projectRoot, expertId);
                    expertState.status = 'completed';
                    expertState.completedAt = new Date().toISOString();
                    expertState.outputPath = result.output_files[0] || '';
                    expertState.outputContent = result.logs.join('\n');
                    expertState.logs = result.logs;
                    saveExpertState(projectRoot, expertId, expertState);
                    io.to(projectId).emit(`expert-data-update:${expertId}`, expertState);

                    res.json({
                        success: true,
                        outputFiles: result.output_files,
                        logs: result.logs
                    });
                } else {
                    // Update status to failed independently
                    const expertState = loadExpertState(projectRoot, expertId);
                    expertState.status = 'failed';
                    expertState.error = result.error;
                    expertState.logs = result.logs;
                    saveExpertState(projectRoot, expertId, expertState);
                    io.to(projectId).emit(`expert-data-update:${expertId}`, expertState);

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

// Validate PROJECTS_BASE before accepting any requests
ensureProjectsBaseExists();

// [C4] 默认绑定 127.0.0.1（仅本机可访问）；设置 LISTEN_HOST=0.0.0.0 可 opt-in 开放 LAN
const LISTEN_HOST = process.env.LISTEN_HOST || '127.0.0.1';
httpServer.listen(PORT, LISTEN_HOST, () => {
    console.log(`🔒 Server running on http://${LISTEN_HOST}:${PORT}`);
    console.log(`📂 Projects Base: ${getProjectsBase()}`);
});

// Initialize Graceful Shutdown
const shutdownManager = createDefaultShutdown(httpServer);
shutdownManager.setSocketIO(io);

// Register Watcher Cleanups
shutdownManager.registerCleanup(async () => {
    console.log('  正在清理服务器监控器 (Watchers)...');

    // 1. Delivery Watcher
    if (deliveryWatcher) {
        await deliveryWatcher.close();
        console.log('    ✓ Delivery Watcher 已关闭');
    }

    // 2. Expert Watchers
    if (expertWatchers.length > 0) {
        await Promise.all(expertWatchers.map(w => w.close()));
        console.log(`    ✓ ${expertWatchers.length} 个 Expert Watchers 已关闭`);
    }

    // 3. Visual Plan Watcher
    closeVisualPlanWatcher();
    console.log('    ✓ Visual Plan Watcher 已关闭');
});

// Setup Health Check Endpoints
setupHealthCheck(app);

// --- Global Error Handlers (prevent server crashes from unhandled async errors) ---
process.on('uncaughtException', (err) => {
    console.error('🔴 [UNCAUGHT EXCEPTION] Server survived:', err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (reason: any) => {
    console.error('🟡 [UNHANDLED REJECTION] Server survived:', reason?.message || reason);
    if (reason?.stack) console.error(reason.stack);
});
