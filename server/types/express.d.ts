import type { WorkspaceContext } from '../auth/workspace-store';

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            workspaceId?: string;
            workspaceContext?: WorkspaceContext;
        }
    }
}

export {};
