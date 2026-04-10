import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
export const DEFAULT_PROJECT_NAME = process.env.PROJECT_NAME?.trim() || 'golden-crucible-sandbox';
export const PROJECTS_BASE = process.env.PROJECTS_BASE?.trim()
    || path.join(REPO_ROOT, 'runtime', 'crucible', 'projects');

export const getProjectRoot = (projectId?: string) => {
    const safeProjectId = (projectId || DEFAULT_PROJECT_NAME).trim() || DEFAULT_PROJECT_NAME;
    return path.resolve(PROJECTS_BASE, safeProjectId);
};

export const ensureProjectRoot = (projectId?: string) => {
    const projectRoot = getProjectRoot(projectId);
    if (!fs.existsSync(projectRoot)) {
        fs.mkdirSync(projectRoot, { recursive: true });
    }
    return projectRoot;
};

export const listAvailableProjects = () => {
    ensureProjectRoot(DEFAULT_PROJECT_NAME);

    const dirs = fs.readdirSync(PROJECTS_BASE, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => entry.name);

    if (dirs.length === 0) {
        return [DEFAULT_PROJECT_NAME];
    }

    if (!dirs.includes(DEFAULT_PROJECT_NAME)) {
        return [DEFAULT_PROJECT_NAME, ...dirs];
    }

    return dirs;
};
