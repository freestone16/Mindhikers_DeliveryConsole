import { betterAuth } from 'better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { Pool } from 'pg';

const AUTH_BASE_PATH = '/api/auth';
const DEFAULT_SECRET = 'better-auth-secret-123456789';

let authPool: Pool | null = null;
let authInstance: ReturnType<typeof betterAuth> | null = null;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const isAuthEnabled = () => Boolean(process.env.DATABASE_URL?.trim());

export const resolveAuthBaseUrl = () => {
    const explicitBaseUrl = process.env.BETTER_AUTH_URL?.trim()
        || process.env.APP_BASE_URL?.trim()
        || process.env.VITE_API_BASE_URL?.trim();

    if (explicitBaseUrl) {
        return trimTrailingSlash(explicitBaseUrl);
    }

    const port = process.env.PORT || '3004';
    return `http://localhost:${port}`;
};

export const resolveAuthSecret = () => process.env.BETTER_AUTH_SECRET?.trim()
    || process.env.AUTH_SECRET?.trim()
    || DEFAULT_SECRET;

export const isUsingDefaultAuthSecret = () => resolveAuthSecret() === DEFAULT_SECRET;

export const isGoogleAuthEnabled = () => Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
);

export const isWeChatAuthEnabled = () => Boolean(
    process.env.WECHAT_CLIENT_ID?.trim() && process.env.WECHAT_CLIENT_SECRET?.trim(),
);

export const getAuthPool = () => {
    if (!process.env.DATABASE_URL?.trim()) {
        throw new Error('DATABASE_URL is required for auth');
    }

    if (!authPool) {
        authPool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
    }

    return authPool;
};

export const getAuth = () => {
    if (!isAuthEnabled()) {
        return null;
    }

    if (!authInstance) {
        const socialProviders: Record<string, Record<string, string>> = {};

        if (isGoogleAuthEnabled()) {
            socialProviders.google = {
                clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
                clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
                prompt: 'select_account',
            };
        }

        if (isWeChatAuthEnabled()) {
            socialProviders.wechat = {
                clientId: process.env.WECHAT_CLIENT_ID!.trim(),
                clientSecret: process.env.WECHAT_CLIENT_SECRET!.trim(),
                platformType: 'WebsiteApp',
                lang: 'cn',
            };
        }

        authInstance = betterAuth({
            appName: 'Golden Crucible',
            baseURL: resolveAuthBaseUrl(),
            basePath: AUTH_BASE_PATH,
            secret: resolveAuthSecret(),
            database: getAuthPool(),
            emailAndPassword: {
                enabled: true,
                minPasswordLength: 8,
            },
            socialProviders,
            advanced: {
                useSecureCookies: process.env.NODE_ENV === 'production',
                databaseMigration: true,
            },
        });
    }

    return authInstance;
};

export const getSessionFromRequest = async (req: Request) => {
    const auth = getAuth();
    if (!auth) {
        return null;
    }

    return auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    });
};

export const closeAuthPool = async () => {
    if (authPool) {
        const pool = authPool;
        authPool = null;
        await pool.end();
    }
};

export const AUTH_ROUTE_BASE = AUTH_BASE_PATH;
