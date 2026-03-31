import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
    getAuthPool,
    getSessionFromRequest,
    isAuthEnabled,
    isGoogleAuthEnabled,
    isUsingDefaultAuthSecret,
    isWeChatAuthEnabled,
    resolveAuthBaseUrl,
} from './index';
import { ensurePersonalWorkspace, getWorkspaceContext, setActiveWorkspace } from './workspace-store';

interface AuthenticatedRequest extends Request {
    authSession?: Awaited<ReturnType<typeof getSessionFromRequest>>;
}

const router = express.Router();

const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!isAuthEnabled()) {
        res.status(503).json({
            error: 'Auth is not configured',
        });
        return;
    }

    try {
        const session = await getSessionFromRequest(req);
        if (!session?.user?.id) {
            res.status(401).json({
                error: 'Authentication required',
            });
            return;
        }

        req.authSession = session;
        next();
    } catch (error) {
        next(error);
    }
};

router.get('/status', (_req, res) => {
    res.json({
        authEnabled: isAuthEnabled(),
        baseUrl: resolveAuthBaseUrl(),
        emailPasswordEnabled: true,
        googleEnabled: isGoogleAuthEnabled(),
        wechatEnabled: isWeChatAuthEnabled(),
        wechatMode: 'qr',
        usingDefaultSecret: isUsingDefaultAuthSecret(),
    });
});

router.get('/session', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const session = req.authSession;
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

        res.json({
            authenticated: true,
            session,
            workspace,
        });
    } catch (error) {
        next(error);
    }
});

router.post('/active-workspace', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const session = req.authSession;
        const workspaceId = typeof req.body?.workspaceId === 'string' ? req.body.workspaceId.trim() : '';

        if (!session?.user?.id) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!workspaceId) {
            res.status(400).json({ error: 'workspaceId is required' });
            return;
        }

        const workspace = await setActiveWorkspace(getAuthPool(), session.user.id, workspaceId);
        res.json({
            ok: true,
            workspace,
        });
    } catch (error) {
        next(error);
    }
});

router.get('/workspaces', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const session = req.authSession;
        if (!session?.user?.id) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const workspace = await getWorkspaceContext(getAuthPool(), session.user.id);
        res.json({
            workspace,
        });
    } catch (error) {
        next(error);
    }
});

export { router as accountRouter, requireAuth };
