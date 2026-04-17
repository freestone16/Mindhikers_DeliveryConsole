import type { Request, Response, NextFunction } from 'express';
import { getAuthPool, getSessionFromRequest, isAuthEnabled } from './index';
import { ensurePersonalWorkspace } from './workspace-store';
import type { WorkspaceContext } from './workspace-store';

// --- Express type augmentation ---
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            workspaceId?: string;
            workspaceContext?: WorkspaceContext;
        }
    }
}

/**
 * requireWorkspace middleware
 *
 * Resolves authenticated user + workspace context for crucible routes.
 * Bypasses entirely when auth is disabled (no DATABASE_URL).
 * Supports WORKSPACE_BYPASS=true env for gray-switch testing.
 */
export const requireWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    // Bypass: auth not configured → no workspace enforcement
    if (!isAuthEnabled()) {
        next();
        return;
    }

    // Bypass: gray-switch for testing without workspace
    if (process.env.WORKSPACE_BYPASS === 'true') {
        next();
        return;
    }

    try {
        const session = await getSessionFromRequest(req);
        if (!session?.user?.id) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const pool = getAuthPool();
        const workspace = await ensurePersonalWorkspace(pool, {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
        });

        if (!workspace) {
            res.status(403).json({ error: 'Workspace access denied' });
            return;
        }

        req.userId = session.user.id;
        req.workspaceId = workspace.activeWorkspace.id;
        req.workspaceContext = workspace;

        next();
    } catch (error) {
        next(error);
    }
};
