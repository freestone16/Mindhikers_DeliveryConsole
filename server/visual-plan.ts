import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import chokidar from 'chokidar';
import { Server } from 'socket.io';

let currentWatcher: ReturnType<typeof chokidar.watch> | null = null;
let currentVisualPlanPath: string | null = null;

export const setupVisualPlanWatcher = (io: Server, projectPath: string) => {
    if (currentWatcher) {
        currentWatcher.close();
        currentWatcher = null;
    }

    const visualPlanPath = path.join(projectPath, '04_Visuals', 'visual_plan.json');
    currentVisualPlanPath = visualPlanPath;

    if (fs.existsSync(visualPlanPath)) {
        // Initial read
        pushVisualPlan(io, visualPlanPath);

        // Setup watcher
        currentWatcher = chokidar.watch(visualPlanPath).on('change', () => {
            console.log('Visual plan changed, pushing update...');
            pushVisualPlan(io, visualPlanPath);
        });
    } else {
        // If file doesn't exist, push null
        io.emit('visual-plan-update', null);
    }
};

const pushVisualPlan = (io: Server, filePath: string) => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        io.emit('visual-plan-update', json);
    } catch (err) {
        console.error('Error reading visual plan:', err);
        io.emit('visual-plan-error', 'Failed to read visual plan');
    }
};

// API Handlers

export const getVisualPlan = (req: Request, res: Response) => {
    if (!currentVisualPlanPath || !fs.existsSync(currentVisualPlanPath)) {
        return res.status(404).json({ error: 'Visual plan not found' });
    }
    try {
        const content = fs.readFileSync(currentVisualPlanPath, 'utf-8');
        res.json(JSON.parse(content));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read visual plan' });
    }
};

export const updateSceneReview = (req: Request, res: Response) => {
    const { sceneId, status, comment } = req.body;

    if (!currentVisualPlanPath || !fs.existsSync(currentVisualPlanPath)) {
        return res.status(404).json({ error: 'Visual plan not found' });
    }

    try {
        const content = fs.readFileSync(currentVisualPlanPath, 'utf-8');
        const plan = JSON.parse(content);

        const sceneIndex = plan.scenes.findIndex((s: any) => s.id === sceneId);
        if (sceneIndex === -1) {
            return res.status(404).json({ error: 'Scene not found' });
        }

        // Update status and comment
        plan.scenes[sceneIndex].status = status;
        plan.scenes[sceneIndex].review_comment = comment || null;

        // Write back
        fs.writeFileSync(currentVisualPlanPath, JSON.stringify(plan, null, 2));

        res.json({ success: true, scene: plan.scenes[sceneIndex] });
    } catch (err) {
        console.error('Error updating scene review:', err);
        res.status(500).json({ error: 'Failed to update scene review' });
    }
};
