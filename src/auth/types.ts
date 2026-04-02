export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface AuthStatusPayload {
    authEnabled: boolean;
    baseUrl: string;
    emailPasswordEnabled: boolean;
    googleEnabled: boolean;
    wechatEnabled: boolean;
    wechatMode: 'qr';
    usingDefaultSecret: boolean;
}

export interface AuthUser {
    id: string;
    name?: string | null;
    email: string;
    emailVerified?: boolean;
    image?: string | null;
}

export interface AuthSessionRecord {
    id: string;
    expiresAt?: string;
}

export interface WorkspaceSummary {
    id: string;
    name: string;
    slug: string;
    kind: string;
    role: WorkspaceRole;
}

export interface WorkspaceContext {
    activeWorkspace: WorkspaceSummary;
    memberships: WorkspaceSummary[];
}

export interface AccountSessionPayload {
    authenticated: boolean;
    session: {
        user: AuthUser;
        session: AuthSessionRecord;
    };
    workspace: WorkspaceContext;
    accountTier?: 'standard' | 'vip';
}
