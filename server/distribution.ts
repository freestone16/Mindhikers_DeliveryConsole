import { Router } from 'express';
import {
    ensureAuthFile,
    getGroupedAuthStatus,
    refreshPlatformAuth,
    revokePlatformAuth,
} from './distribution-auth-service';
import {
    createDistributionTask,
    deleteDistributionTask,
    retryDistributionTask,
    summarizeQueue,
} from './distribution-queue-service';
import {
    appendDistributionHistory,
    listDistributionAssets,
    loadDistributionHistory,
    loadDistributionQueue,
    savePublishPackageSnapshot,
    saveDistributionQueue,
} from './distribution-store';
import {
    createDistributionHistoryEntries,
    executeDistributionTask,
    getDistributionTaskOrThrow,
    markDistributionTaskFailed,
    markDistributionTaskRunning,
} from './distribution-execution-service';
import { buildYoutubeAuthUrl } from './youtube-oauth-service';

const router = Router();

function log(module: string, stage: string, status: string, detail: string = '') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${module}] [${stage}] ${status} -> ${detail}`);
}

router.get('/auth/status', (req, res) => {
    try {
        const authData = ensureAuthFile();
        const groupedAccounts = getGroupedAuthStatus();
        log('Distribution-Auth', 'Status', 'READ', `Fetched auth status, ${authData.accounts.length} platforms`);
        
        res.json({
            success: true,
            data: groupedAccounts.data,
            lastChecked: groupedAccounts.lastChecked
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/auth/url', (req, res) => {
    try {
        const platform = (req.query.platform as string) || 'youtube';
        if (platform !== 'youtube' && platform !== 'youtube_shorts') {
            return res.status(400).json({ success: false, error: `Interactive auth is not supported for platform: ${platform}` });
        }

        res.json({
            success: true,
            platform,
            authUrl: buildYoutubeAuthUrl(),
        });
    } catch (error: any) {
        console.error('Distribution auth url error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/auth/refresh', (req, res) => {
    try {
        const { platform } = req.body;
        const updatedAccount = refreshPlatformAuth(platform);
        
        res.json({ success: true, platform: platform, status: updatedAccount.status });
    } catch (error: any) {
        if (error.message === 'Platform not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/auth/revoke', (req, res) => {
    try {
        const { platform } = req.body;
        const updatedAccount = revokePlatformAuth(platform);
        
        res.json({ success: true, platform: platform, status: updatedAccount.status });
    } catch (error: any) {
        if (error.message === 'Platform not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/queue', (req, res) => {
    try {
        const projectId = req.query.projectId as string;
        if (!projectId) {
            return res.status(400).json({ success: false, error: 'Missing projectId parameter' });
        }
        const queue = loadDistributionQueue(projectId);
        const summary = summarizeQueue(queue);
        
        res.json({
            success: true,
            queue,
            todayCount: summary.todayCount,
            upcomingCount: summary.upcomingCount
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
        
        const queue = loadDistributionQueue(projectId);
        const newTask = createDistributionTask({
            projectId,
            platforms,
            assets,
            scheduleTime,
            timezone,
        });
        
        queue.push(newTask);
        saveDistributionQueue(projectId, queue);
        savePublishPackageSnapshot(projectId, newTask);
        
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
        const projectId = req.query.projectId as string;
        const { taskId } = req.params;
        if (!projectId) {
            return res.status(400).json({ success: false, error: 'Missing projectId parameter' });
        }
        const queue = loadDistributionQueue(projectId);
        deleteDistributionTask(queue, taskId);
        saveDistributionQueue(projectId, queue);
        
        res.json({ success: true, message: 'Task cancelled' });
    } catch (error: any) {
        if (error.message === 'Task not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        if (error.message === 'Cannot cancel running task') {
            return res.status(400).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/queue/:taskId/retry', (req, res) => {
    try {
        const projectId = req.query.projectId as string;
        const { taskId } = req.params;
        if (!projectId) {
            return res.status(400).json({ success: false, error: 'Missing projectId parameter' });
        }
        const queue = loadDistributionQueue(projectId);
        const task = retryDistributionTask(queue, taskId);
        saveDistributionQueue(projectId, queue);
        
        res.json({ success: true, task });
    } catch (error: any) {
        if (error.message === 'Task not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        if (error.message === 'Only failed tasks can be retried') {
            return res.status(400).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/queue/:taskId/execute', async (req, res) => {
    const projectId = (req.body.projectId || req.query.projectId) as string;
    const { taskId } = req.params;

    if (!projectId) {
        return res.status(400).json({ success: false, error: 'Missing projectId parameter' });
    }

    let queue;
    let task;

    try {
        queue = loadDistributionQueue(projectId);
        task = getDistributionTaskOrThrow(queue, taskId);
        markDistributionTaskRunning(task);
        saveDistributionQueue(projectId, queue);
    } catch (error: any) {
        const statusCode =
            error.message === 'Task not found'
                ? 404
                : error.message === 'Task is already running' || error.message === 'Completed tasks cannot be executed again'
                  ? 400
                  : 500;

        return res.status(statusCode).json({ success: false, error: error.message });
    }

    let executionError: Error | null = null;
    try {
        await executeDistributionTask(task);
    } catch (error: any) {
        executionError = error instanceof Error ? error : new Error(String(error));
        markDistributionTaskFailed(task, executionError);
    }

    try {
        saveDistributionQueue(projectId, queue);
        savePublishPackageSnapshot(projectId, task);

        if (task.results && Object.keys(task.results).length > 0) {
            appendDistributionHistory(projectId, createDistributionHistoryEntries(task));
        }
    } catch (persistError: any) {
        console.error('Failed to persist distribution execution result:', persistError);

        const detail = persistError instanceof Error ? persistError.message : String(persistError);
        const prefix = executionError
            ? 'Task execution failed and the failure result could not be fully persisted'
            : 'Task execution finished, but the final result could not be fully persisted';

        return res.status(500).json({
            success: false,
            error: `${prefix}: ${detail}`,
            task,
        });
    }

    if (executionError) {
        const statusCode =
            executionError.message === 'No active access token. Please authorize again.'
                ? 401
                : 500;

        return res.status(statusCode).json({ success: false, error: executionError.message, task });
    }

    res.json({
        success: true,
        task,
        message: task.status === 'completed' ? 'Task executed successfully' : 'Task executed with failures',
    });
});

router.get('/assets', (req, res) => {
    try {
        const projectId = (req.query.projectId || req.query.project) as string;
        if (!projectId) {
            return res.status(400).json({ success: false, error: 'Missing project parameter' });
        }
        const { videos, marketingFiles } = listDistributionAssets(projectId);
        
        res.json({
            success: true,
            videos,
            marketingFiles
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/history', (req, res) => {
    try {
        const projectId = (req.query.projectId || req.query.project) as string;
        if (!projectId) {
            return res.status(400).json({ success: false, error: 'Missing project parameter' });
        }

        res.json({
            success: true,
            history: loadDistributionHistory(projectId),
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
