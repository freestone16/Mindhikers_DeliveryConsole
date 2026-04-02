export type AccountTier = 'standard' | 'vip';

const VIP_EMAIL_ENV_KEYS = [
    'SAAS_VIP_EMAILS',
    'CRUCIBLE_VIP_EMAILS',
] as const;

const splitEnvList = (raw?: string | null) => (raw || '')
    .split(/[,\n;\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const readVipEmails = () => {
    const items = VIP_EMAIL_ENV_KEYS.flatMap((key) => splitEnvList(process.env[key]));
    return new Set(items);
};

export const resolveAccountTier = (email?: string | null): AccountTier => {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
        return 'standard';
    }

    return readVipEmails().has(normalizedEmail) ? 'vip' : 'standard';
};

export const isVipAccount = (email?: string | null) => resolveAccountTier(email) === 'vip';
