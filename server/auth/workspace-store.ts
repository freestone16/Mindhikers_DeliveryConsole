import { randomUUID } from 'crypto';
import type { Pool } from 'pg';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

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

interface UserIdentity {
    id: string;
    name?: string | null;
    email?: string | null;
}

let workspaceSchemaPromise: Promise<void> | null = null;

const sanitizeSlugSegment = (value: string) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const buildPersonalWorkspaceName = (user: UserIdentity) => {
    const label = user.name?.trim() || user.email?.trim() || '新成员';
    return `${label} 的工作区`;
};

const buildPersonalWorkspaceSlug = (user: UserIdentity) => {
    const base = sanitizeSlugSegment(user.email || user.name || 'workspace') || 'workspace';
    return `${base}-${user.id.slice(0, 8)}`;
};

export const ensureWorkspaceSchema = async (pool: Pool) => {
    if (!workspaceSchemaPromise) {
        workspaceSchemaPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS workspace (
                    id TEXT PRIMARY KEY,
                    slug TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    kind TEXT NOT NULL DEFAULT 'personal',
                    owner_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS workspace_member (
                    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
                    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                    role TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (workspace_id, user_id)
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS workspace_invitation (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
                    email TEXT NOT NULL,
                    role TEXT NOT NULL,
                    invited_by_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
                    status TEXT NOT NULL DEFAULT 'pending',
                    token TEXT NOT NULL UNIQUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS active_workspace (
                    user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
                    workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);
        })();
    }

    await workspaceSchemaPromise;
};

export const ensurePersonalWorkspace = async (pool: Pool, user: UserIdentity) => {
    await ensureWorkspaceSchema(pool);

    const existingContext = await getWorkspaceContext(pool, user.id);
    if (existingContext) {
        return existingContext;
    }

    const existingMembership = await pool.query<{
        workspace_id: string;
        name: string;
        slug: string;
        kind: string;
        role: WorkspaceRole;
    }>(`
        SELECT
            wm.workspace_id,
            w.name,
            w.slug,
            w.kind,
            wm.role
        FROM workspace_member wm
        INNER JOIN workspace w ON w.id = wm.workspace_id
        WHERE wm.user_id = $1
        ORDER BY w.created_at ASC
        LIMIT 1
    `, [user.id]);

    let workspaceId = existingMembership.rows[0]?.workspace_id;

    if (!workspaceId) {
        workspaceId = randomUUID();
        const slug = buildPersonalWorkspaceSlug(user);
        const name = buildPersonalWorkspaceName(user);

        await pool.query(`
            INSERT INTO workspace (id, slug, name, kind, owner_user_id)
            VALUES ($1, $2, $3, 'personal', $4)
        `, [workspaceId, slug, name, user.id]);

        await pool.query(`
            INSERT INTO workspace_member (workspace_id, user_id, role)
            VALUES ($1, $2, 'owner')
            ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role
        `, [workspaceId, user.id]);
    }

    await pool.query(`
        INSERT INTO active_workspace (user_id, workspace_id, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET workspace_id = EXCLUDED.workspace_id, updated_at = NOW()
    `, [user.id, workspaceId]);

    return getWorkspaceContext(pool, user.id);
};

export const getWorkspaceContext = async (pool: Pool, userId: string): Promise<WorkspaceContext | null> => {
    await ensureWorkspaceSchema(pool);

    const memberships = await pool.query<{
        id: string;
        name: string;
        slug: string;
        kind: string;
        role: WorkspaceRole;
    }>(`
        SELECT
            w.id,
            w.name,
            w.slug,
            w.kind,
            wm.role
        FROM workspace_member wm
        INNER JOIN workspace w ON w.id = wm.workspace_id
        WHERE wm.user_id = $1
        ORDER BY w.created_at ASC
    `, [userId]);

    if (!memberships.rows.length) {
        return null;
    }

    const activeWorkspace = await pool.query<{ workspace_id: string }>(`
        SELECT workspace_id
        FROM active_workspace
        WHERE user_id = $1
        LIMIT 1
    `, [userId]);

    const membershipRows = memberships.rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        kind: row.kind,
        role: row.role,
    }));

    const activeWorkspaceId = activeWorkspace.rows[0]?.workspace_id || membershipRows[0].id;
    const active = membershipRows.find((item) => item.id === activeWorkspaceId) || membershipRows[0];

    return {
        activeWorkspace: active,
        memberships: membershipRows,
    };
};

export const setActiveWorkspace = async (pool: Pool, userId: string, workspaceId: string) => {
    await ensureWorkspaceSchema(pool);

    const membership = await pool.query(`
        SELECT 1
        FROM workspace_member
        WHERE user_id = $1 AND workspace_id = $2
        LIMIT 1
    `, [userId, workspaceId]);

    if (!membership.rowCount) {
        throw new Error('Workspace access denied');
    }

    await pool.query(`
        INSERT INTO active_workspace (user_id, workspace_id, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET workspace_id = EXCLUDED.workspace_id, updated_at = NOW()
    `, [userId, workspaceId]);

    return getWorkspaceContext(pool, userId);
};
