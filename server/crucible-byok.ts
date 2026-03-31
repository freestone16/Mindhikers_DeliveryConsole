import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import type { Request } from 'express';
import { getAuthPool, getSessionFromRequest, isAuthEnabled, resolveAuthSecret } from './auth';

export interface CrucibleByokConfigInput {
    baseUrl: string;
    apiKey: string;
    model: string;
    providerLabel?: string | null;
}

export interface CrucibleByokConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
    providerLabel?: string | null;
    updatedAt?: string | null;
    lastValidatedAt?: string | null;
}

export interface CrucibleByokStatus {
    configured: boolean;
    baseUrl?: string;
    model?: string;
    providerLabel?: string | null;
    hasApiKey: boolean;
    updatedAt?: string | null;
    lastValidatedAt?: string | null;
}

let byokSchemaPromise: Promise<void> | null = null;

const resolveEncryptionKey = () => createHash('sha256')
    .update(resolveAuthSecret())
    .digest();

const encryptSecret = (plaintext: string) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', resolveEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
};

const decryptSecret = (payload: string) => {
    const [ivPart, tagPart, contentPart] = payload.split('.');
    if (!ivPart || !tagPart || !contentPart) {
        throw new Error('Invalid encrypted payload');
    }

    const decipher = createDecipheriv(
        'aes-256-gcm',
        resolveEncryptionKey(),
        Buffer.from(ivPart, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(contentPart, 'base64')),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
};

const ensureByokSchema = async () => {
    if (!byokSchemaPromise) {
        byokSchemaPromise = (async () => {
            const pool = getAuthPool();
            await pool.query(`
                CREATE TABLE IF NOT EXISTS user_byok_config (
                    user_id TEXT PRIMARY KEY,
                    provider_label TEXT,
                    base_url TEXT NOT NULL,
                    model TEXT NOT NULL,
                    api_key_encrypted TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    last_validated_at TIMESTAMPTZ
                )
            `);
        })();
    }

    await byokSchemaPromise;
};

const getAuthenticatedUserId = async (req: Request) => {
    if (!isAuthEnabled()) {
        return null;
    }

    const session = await getSessionFromRequest(req);
    return session?.user?.id?.trim() || null;
};

export const getCrucibleByokConfig = async (req: Request): Promise<CrucibleByokConfig | null> => {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
        return null;
    }

    await ensureByokSchema();
    const result = await getAuthPool().query<{
        provider_label: string | null;
        base_url: string;
        model: string;
        api_key_encrypted: string;
        updated_at: string | null;
        last_validated_at: string | null;
    }>(`
        SELECT provider_label, base_url, model, api_key_encrypted, updated_at, last_validated_at
        FROM user_byok_config
        WHERE user_id = $1
    `, [userId]);

    const row = result.rows[0];
    if (!row) {
        return null;
    }

    return {
        providerLabel: row.provider_label,
        baseUrl: row.base_url,
        model: row.model,
        apiKey: decryptSecret(row.api_key_encrypted),
        updatedAt: row.updated_at,
        lastValidatedAt: row.last_validated_at,
    };
};

export const getCrucibleByokStatus = async (req: Request): Promise<CrucibleByokStatus> => {
    const config = await getCrucibleByokConfig(req);
    if (!config) {
        return {
            configured: false,
            hasApiKey: false,
        };
    }

    return {
        configured: true,
        baseUrl: config.baseUrl,
        model: config.model,
        providerLabel: config.providerLabel,
        hasApiKey: Boolean(config.apiKey),
        updatedAt: config.updatedAt,
        lastValidatedAt: config.lastValidatedAt,
    };
};

export const saveCrucibleByokConfig = async (req: Request, input: CrucibleByokConfigInput) => {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
        const error = new Error('Authentication required');
        (error as Error & { statusCode?: number }).statusCode = 401;
        throw error;
    }

    const baseUrl = input.baseUrl.trim().replace(/\/+$/, '');
    const apiKey = input.apiKey.trim();
    const model = input.model.trim();
    const providerLabel = input.providerLabel?.trim() || null;

    if (!baseUrl || !apiKey || !model) {
        const error = new Error('baseUrl, apiKey and model are required');
        (error as Error & { statusCode?: number }).statusCode = 400;
        throw error;
    }

    await ensureByokSchema();
    await getAuthPool().query(`
        INSERT INTO user_byok_config (user_id, provider_label, base_url, model, api_key_encrypted, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
            provider_label = EXCLUDED.provider_label,
            base_url = EXCLUDED.base_url,
            model = EXCLUDED.model,
            api_key_encrypted = EXCLUDED.api_key_encrypted,
            updated_at = NOW()
    `, [userId, providerLabel, baseUrl, model, encryptSecret(apiKey)]);
};

export const markCrucibleByokValidated = async (req: Request) => {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
        return;
    }

    await ensureByokSchema();
    await getAuthPool().query(`
        UPDATE user_byok_config
        SET last_validated_at = NOW()
        WHERE user_id = $1
    `, [userId]);
};

export const clearCrucibleByokConfig = async (req: Request) => {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
        const error = new Error('Authentication required');
        (error as Error & { statusCode?: number }).statusCode = 401;
        throw error;
    }

    await ensureByokSchema();
    await getAuthPool().query(`DELETE FROM user_byok_config WHERE user_id = $1`, [userId]);
};

export const testCrucibleByokConfig = async (input: CrucibleByokConfigInput) => {
    const baseUrl = input.baseUrl.trim().replace(/\/+$/, '');
    const apiKey = input.apiKey.trim();
    const model = input.model.trim();
    const isKimiK25 = model.includes('kimi-k2') || model.includes('k2.5');
    const temperature = isKimiK25 ? 1 : 0.7;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const startedAt = Date.now();

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5,
                temperature,
            }),
            signal: controller.signal,
        });

        const latency = Date.now() - startedAt;
        if (!response.ok) {
            const error = await response.text();
            return {
                success: false,
                latency,
                error: `API Error: ${error.slice(0, 200)}`,
            };
        }

        return {
            success: true,
            latency,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error?.name === 'AbortError' ? '请求超时' : (error?.message || '连接测试失败'),
        };
    } finally {
        clearTimeout(timeoutId);
    }
};
