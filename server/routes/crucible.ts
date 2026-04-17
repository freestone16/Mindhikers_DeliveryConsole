import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { generateCrucibleTurn, generateSocraticQuestions, streamCrucibleTurn } from '../crucible';
import { generateCrucibleRemotionPreview } from '../crucible-remotion';
import { generateCrucibleThesis } from '../crucible-thesiswriter';
import { getCrucibleThesisTrialStatus } from '../crucible-trial';
import { getCrucibleTrialStatus } from '../crucible-trial';
import {
    clearCrucibleByokConfig,
    getCrucibleByokStatus,
    saveCrucibleByokConfig,
    testCrucibleByokConfig,
} from '../crucible-byok';
import {
    activateCrucibleConversation,
    buildCrucibleArtifactExport,
    clearCrucibleActiveConversation,
    getCrucibleConversationDetail,
    listCrucibleConversations,
    saveCrucibleConversationSnapshot,
    updateCrucibleConversation,
} from '../crucible-persistence';
import { ensurePersonalWorkspace } from '../auth/workspace-store';
import { getAuthPool, getSessionFromRequest, isAuthEnabled } from '../auth';
import { requireWorkspace } from '../auth/workspace-middleware';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Core crucible endpoints ---

router.post('/turn', generateCrucibleTurn);
router.post('/turn/stream', streamCrucibleTurn);
router.post('/socratic-questions', generateSocraticQuestions);
router.post('/remotion-preview', generateCrucibleRemotionPreview);
router.post('/thesis/generate', generateCrucibleThesis);

router.get('/thesis/trial-status', async (req, res) => {
    try {
        const status = await getCrucibleThesisTrialStatus(req, {
            projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
            scriptPath: typeof req.query.scriptPath === 'string' ? req.query.scriptPath : undefined,
        });
        res.json(status);
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({ error: 'Failed to read thesis trial status' });
    }
});

router.get('/trial-status', async (req, res) => {
    try {
        const status = await getCrucibleTrialStatus(req, {
            conversationId: typeof req.query.conversationId === 'string' ? req.query.conversationId : undefined,
            projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
            scriptPath: typeof req.query.scriptPath === 'string' ? req.query.scriptPath : undefined,
        });
        res.json(status);
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({
            error: statusCode === 401 ? 'Authentication required' : 'Failed to read trial status',
        });
    }
});

// --- BYOK ---

router.get('/byok', async (req, res) => {
    try {
        const status = await getCrucibleByokStatus(req);
        res.json(status);
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({
            error: statusCode === 401 ? 'Authentication required' : 'Failed to read BYOK status',
        });
    }
});

router.post('/byok', async (req, res) => {
    try {
        await saveCrucibleByokConfig(req, {
            baseUrl: typeof req.body?.baseUrl === 'string' ? req.body.baseUrl : '',
            apiKey: typeof req.body?.apiKey === 'string' ? req.body.apiKey : '',
            model: typeof req.body?.model === 'string' ? req.body.model : '',
            providerLabel: typeof req.body?.providerLabel === 'string' ? req.body.providerLabel : undefined,
        });
        res.json({ success: true });
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({
            error: (error as Error).message || 'Failed to save BYOK config',
        });
    }
});

router.post('/byok/test', async (req, res) => {
    try {
        const result = await testCrucibleByokConfig({
            baseUrl: typeof req.body?.baseUrl === 'string' ? req.body.baseUrl : '',
            apiKey: typeof req.body?.apiKey === 'string' ? req.body.apiKey : '',
            model: typeof req.body?.model === 'string' ? req.body.model : '',
            providerLabel: typeof req.body?.providerLabel === 'string' ? req.body.providerLabel : undefined,
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: (error as Error).message || 'Failed to test BYOK config',
        });
    }
});

router.delete('/byok', async (req, res) => {
    try {
        await clearCrucibleByokConfig(req);
        res.json({ success: true });
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({
            error: (error as Error).message || 'Failed to clear BYOK config',
        });
    }
});

// --- Conversations ---

router.get('/conversations', async (req, res) => {
    try {
        const items = await listCrucibleConversations(req, {
            projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
            scriptPath: typeof req.query.scriptPath === 'string' ? req.query.scriptPath : undefined,
        });
        res.json({ items });
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({ error: statusCode === 401 ? 'Authentication required' : 'Failed to list conversations' });
    }
});

router.get('/conversations/active', async (req, res) => {
    try {
        const detail = await getCrucibleConversationDetail(req, {
            projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
            scriptPath: typeof req.query.scriptPath === 'string' ? req.query.scriptPath : undefined,
        });
        if (!detail) {
            return res.status(404).json({ error: 'No active conversation found' });
        }
        res.json(detail);
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({ error: statusCode === 401 ? 'Authentication required' : 'Failed to read active conversation' });
    }
});

router.get('/conversations/:conversationId', async (req, res) => {
    try {
        const detail = await getCrucibleConversationDetail(req, {
            conversationId: req.params.conversationId,
            projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
            scriptPath: typeof req.query.scriptPath === 'string' ? req.query.scriptPath : undefined,
        });
        if (!detail) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        res.json(detail);
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({ error: statusCode === 401 ? 'Authentication required' : 'Failed to read conversation' });
    }
});

router.post('/conversations/:conversationId/activate', async (req, res) => {
    try {
        const detail = await activateCrucibleConversation(req, {
            conversationId: req.params.conversationId,
            projectId: typeof req.body?.projectId === 'string'
                ? req.body.projectId
                : typeof req.query.projectId === 'string'
                    ? req.query.projectId
                    : undefined,
            scriptPath: typeof req.body?.scriptPath === 'string'
                ? req.body.scriptPath
                : typeof req.query.scriptPath === 'string'
                    ? req.query.scriptPath
                    : undefined,
        });
        if (!detail) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        res.json(detail);
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({ error: statusCode === 401 ? 'Authentication required' : 'Failed to activate conversation' });
    }
});

router.post('/conversations/save', async (req, res) => {
    try {
        const snapshot = typeof req.body?.snapshot === 'object' && req.body.snapshot ? req.body.snapshot : null;
        if (!snapshot) {
            return res.status(400).json({ error: 'snapshot is required' });
        }

        const detail = await saveCrucibleConversationSnapshot(req, {
            conversationId: typeof req.body?.conversationId === 'string' ? req.body.conversationId : undefined,
            topicTitle: typeof req.body?.topicTitle === 'string' ? req.body.topicTitle : undefined,
            status: req.body?.status === 'active' || req.body?.status === 'archived' ? req.body.status : undefined,
            snapshot,
            projectId: typeof req.body?.projectId === 'string'
                ? req.body.projectId
                : typeof req.query.projectId === 'string'
                    ? req.query.projectId
                    : undefined,
            scriptPath: typeof req.body?.scriptPath === 'string'
                ? req.body.scriptPath
                : typeof req.query.scriptPath === 'string'
                    ? req.query.scriptPath
                    : undefined,
        });

        res.json(detail);
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({ error: statusCode === 401 ? 'Authentication required' : 'Failed to save conversation snapshot' });
    }
});

router.patch('/conversations/:conversationId', async (req, res) => {
    try {
        const detail = await updateCrucibleConversation(req, {
            conversationId: req.params.conversationId,
            topicTitle: typeof req.body?.topicTitle === 'string' ? req.body.topicTitle : undefined,
            status: req.body?.status === 'active' || req.body?.status === 'archived' ? req.body.status : undefined,
            projectId: typeof req.body?.projectId === 'string'
                ? req.body.projectId
                : typeof req.query.projectId === 'string'
                    ? req.query.projectId
                    : undefined,
            scriptPath: typeof req.body?.scriptPath === 'string'
                ? req.body.scriptPath
                : typeof req.query.scriptPath === 'string'
                    ? req.query.scriptPath
                    : undefined,
        });
        if (!detail) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        res.json(detail);
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({ error: statusCode === 401 ? 'Authentication required' : 'Failed to update conversation' });
    }
});

router.get('/conversations/:conversationId/artifacts/export', async (req, res) => {
    try {
        const detail = await getCrucibleConversationDetail(req, {
            conversationId: req.params.conversationId,
            projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
            scriptPath: typeof req.query.scriptPath === 'string' ? req.query.scriptPath : undefined,
        });
        if (!detail) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const artifactExport = buildCrucibleArtifactExport(detail, {
            format: typeof req.query.format === 'string' ? req.query.format : undefined,
        });
        res.setHeader('Content-Type', artifactExport.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${artifactExport.filename}"`);
        res.send(artifactExport.body);
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({ error: statusCode === 401 ? 'Authentication required' : 'Failed to export artifacts' });
    }
});

// --- Autosave ---

const LEGACY_CRUCIBLE_AUTOSAVE_PATH = path.resolve(__dirname, '../../runtime/crucible/autosave.json');

function sanitizePathSegment(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function resolveCrucibleAutosavePath(req: express.Request) {
    if (!isAuthEnabled()) {
        return LEGACY_CRUCIBLE_AUTOSAVE_PATH;
    }

    const session = await getSessionFromRequest(req);
    if (!session?.user?.id) {
        const error = new Error('Authentication required');
        (error as Error & { statusCode?: number }).statusCode = 401;
        throw error;
    }

    const workspace = await ensurePersonalWorkspace(getAuthPool(), {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    });

    if (!workspace) {
        const error = new Error('Workspace access denied');
        (error as Error & { statusCode?: number }).statusCode = 403;
        throw error;
    }

    return path.resolve(
        __dirname,
        '../../runtime/crucible/workspaces',
        sanitizePathSegment(workspace.activeWorkspace.id),
        'autosave.json',
    );
}

router.get('/autosave', async (req, res) => {
    try {
        const autosavePath = await resolveCrucibleAutosavePath(req);
        if (!fs.existsSync(autosavePath)) {
            return res.status(404).json({ error: 'No autosave found' });
        }

        const data = fs.readFileSync(autosavePath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({ error: statusCode === 401 ? 'Authentication required' : 'Failed to read autosave' });
    }
});

router.post('/autosave', async (req, res) => {
    try {
        const autosavePath = await resolveCrucibleAutosavePath(req);
        const dir = path.dirname(autosavePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(autosavePath, JSON.stringify(req.body, null, 2), 'utf-8');
        res.json({ ok: true });
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({ error: statusCode === 401 ? 'Authentication required' : 'Failed to write autosave' });
    }
});

router.delete('/autosave', async (req, res) => {
    try {
        const autosavePath = await resolveCrucibleAutosavePath(req);
        if (fs.existsSync(autosavePath)) {
            fs.unlinkSync(autosavePath);
        }
        await clearCrucibleActiveConversation(req);
        res.json({ ok: true });
    } catch (error) {
        const statusCode = (error as Error & { statusCode?: number }).statusCode || 500;
        res.status(statusCode).json({ error: statusCode === 401 ? 'Authentication required' : 'Failed to clear autosave' });
    }
});

export default router;
