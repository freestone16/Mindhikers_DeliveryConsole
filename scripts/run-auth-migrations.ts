import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMigrations } from 'better-auth/db/migration';
import { getAuth, getAuthPool, isAuthEnabled } from '../server/auth';
import { ensureWorkspaceSchema } from '../server/auth/workspace-store';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const main = async () => {
    if (!isAuthEnabled()) {
        throw new Error('DATABASE_URL is required before running auth migrations');
    }

    const auth = getAuth();
    if (!auth) {
        throw new Error('Auth is not configured');
    }

    const pool = getAuthPool();
    const migrations = await getMigrations(auth.options);
    const sql = await migrations.compileMigrations();

    console.log('[auth:migrate] Better Auth SQL preview generated');
    console.log(sql);

    await migrations.runMigrations();
    await ensureWorkspaceSchema(pool);

    console.log('[auth:migrate] Better Auth + workspace schema ready');
    await pool.end();
};

main().catch((error) => {
    console.error('[auth:migrate] failed:', error);
    process.exit(1);
});
