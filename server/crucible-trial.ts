import type { Request } from 'express';
import { getSessionFromRequest, isAuthEnabled } from './auth';
import { resolveAccountTier } from './auth/account-tier';
import { getCrucibleByokStatus } from './crucible-byok';
import {
    getCrucibleConversationDetail,
    listCrucibleConversations,
} from './crucible-persistence';

const CRUCIBLE_TRIAL_CONVERSATION_LIMIT = 3;
const CRUCIBLE_TRIAL_TURN_LIMIT = 10;

export type CrucibleTrialStatusCode =
    | 'inactive'
    | 'active'
    | 'conversation_exhausted'
    | 'quota_exhausted';

export interface CrucibleTrialStatus {
    enabled: boolean;
    mode: 'platform' | 'byok';
    accountTier?: 'standard' | 'vip';
    limits: {
        conversationLimit: number;
        turnLimitPerConversation: number;
    };
    usage: {
        conversationsUsed: number;
        conversationsRemaining: number;
        currentConversationId?: string;
        currentConversationTurnsUsed: number;
        currentConversationTurnsRemaining: number;
    };
    status: CrucibleTrialStatusCode;
    requiresByok: boolean;
    message: string;
}

export class CrucibleTrialLimitError extends Error {
    statusCode = 403;
    code: 'CRUCIBLE_TRIAL_CONVERSATION_EXHAUSTED' | 'CRUCIBLE_TRIAL_QUOTA_EXHAUSTED';
    trialStatus: CrucibleTrialStatus;

    constructor(
        code: 'CRUCIBLE_TRIAL_CONVERSATION_EXHAUSTED' | 'CRUCIBLE_TRIAL_QUOTA_EXHAUSTED',
        trialStatus: CrucibleTrialStatus,
    ) {
        super(trialStatus.message);
        this.code = code;
        this.trialStatus = trialStatus;
    }
}

const buildTrialMessage = (status: CrucibleTrialStatusCode, usage: CrucibleTrialStatus['usage']) => {
    if (status === 'conversation_exhausted') {
        return '当前免费对话已达到 10 轮上限。请新建话题，或配置你的 BYOK 后继续使用。';
    }

    if (status === 'quota_exhausted') {
        return '你的免费体验额度已用完。继续使用请配置自己的 BYOK（Base URL / API Key / Model）。';
    }

    if (usage.currentConversationId) {
        return `免费试用剩余 ${usage.conversationsRemaining} 个对话；当前对话还可继续 ${usage.currentConversationTurnsRemaining} 轮。`;
    }

    return `免费试用剩余 ${usage.conversationsRemaining} 个对话，每个对话最多 ${CRUCIBLE_TRIAL_TURN_LIMIT} 轮。`;
};

export const getCrucibleTrialStatus = async (
    req: Request,
    options: {
        conversationId?: string;
        projectId?: string;
        scriptPath?: string;
    } = {},
): Promise<CrucibleTrialStatus> => {
    if (!isAuthEnabled()) {
        return {
            enabled: false,
            mode: 'platform',
            accountTier: 'standard',
            limits: {
                conversationLimit: CRUCIBLE_TRIAL_CONVERSATION_LIMIT,
                turnLimitPerConversation: CRUCIBLE_TRIAL_TURN_LIMIT,
            },
            usage: {
                conversationsUsed: 0,
                conversationsRemaining: CRUCIBLE_TRIAL_CONVERSATION_LIMIT,
                currentConversationTurnsUsed: 0,
                currentConversationTurnsRemaining: CRUCIBLE_TRIAL_TURN_LIMIT,
            },
            status: 'inactive',
            requiresByok: false,
            message: '当前环境未启用账号体系，试用额度限制未开启。',
        };
    }

    const session = await getSessionFromRequest(req);
    const accountTier = resolveAccountTier(session?.user?.email);
    const byokStatus = await getCrucibleByokStatus(req);

    if (accountTier === 'vip') {
        return {
            enabled: false,
            mode: byokStatus.configured ? 'byok' : 'platform',
            accountTier,
            limits: {
                conversationLimit: CRUCIBLE_TRIAL_CONVERSATION_LIMIT,
                turnLimitPerConversation: CRUCIBLE_TRIAL_TURN_LIMIT,
            },
            usage: {
                conversationsUsed: 0,
                conversationsRemaining: CRUCIBLE_TRIAL_CONVERSATION_LIMIT,
                currentConversationTurnsUsed: 0,
                currentConversationTurnsRemaining: CRUCIBLE_TRIAL_TURN_LIMIT,
            },
            status: 'inactive',
            requiresByok: false,
            message: '当前账号已升级为 VIP，不受黄金坩埚平台试用额度限制。',
        };
    }

    const items = await listCrucibleConversations(req, {
        projectId: options.projectId,
        scriptPath: options.scriptPath,
    });
    const platformItems = items.filter((item) => item.accessMode !== 'byok');

    const currentConversationId = options.conversationId?.trim() || '';
    let currentConversationTurnsUsed = 0;
    let resolvedConversationId = currentConversationId || undefined;

    if (currentConversationId) {
        const detail = await getCrucibleConversationDetail(req, {
            conversationId: currentConversationId,
            projectId: options.projectId,
            scriptPath: options.scriptPath,
        });

        if (detail) {
            resolvedConversationId = detail.summary.id;
            currentConversationTurnsUsed = Math.max(0, detail.summary.roundIndex || 0);
        }
    }

    const conversationsUsed = platformItems.length;
    const usage = {
        conversationsUsed,
        conversationsRemaining: Math.max(0, CRUCIBLE_TRIAL_CONVERSATION_LIMIT - conversationsUsed),
        currentConversationId: resolvedConversationId,
        currentConversationTurnsUsed,
        currentConversationTurnsRemaining: Math.max(0, CRUCIBLE_TRIAL_TURN_LIMIT - currentConversationTurnsUsed),
    };

    let status: CrucibleTrialStatusCode = 'active';
    if (resolvedConversationId && currentConversationTurnsUsed >= CRUCIBLE_TRIAL_TURN_LIMIT) {
        status = 'conversation_exhausted';
    } else if (!resolvedConversationId && conversationsUsed >= CRUCIBLE_TRIAL_CONVERSATION_LIMIT) {
        status = 'quota_exhausted';
    }

    const mode: CrucibleTrialStatus['mode'] = byokStatus.configured ? 'byok' : 'platform';
    const resolvedStatus = mode === 'byok' ? 'active' : status;

    return {
        enabled: true,
        mode,
        accountTier,
        limits: {
            conversationLimit: CRUCIBLE_TRIAL_CONVERSATION_LIMIT,
            turnLimitPerConversation: CRUCIBLE_TRIAL_TURN_LIMIT,
        },
        usage,
        status: resolvedStatus,
        requiresByok: !byokStatus.configured && (status === 'conversation_exhausted' || status === 'quota_exhausted'),
        message: byokStatus.configured
            ? `你当前正在使用自己的 BYOK：${byokStatus.providerLabel || byokStatus.model || '自定义模型'}。`
            : buildTrialMessage(status, usage),
    };
};

export const assertCrucibleTrialAccess = async (
    req: Request,
    options: {
        conversationId?: string;
        projectId?: string;
        scriptPath?: string;
    } = {},
) => {
    const trialStatus = await getCrucibleTrialStatus(req, options);

    if (!trialStatus.enabled || trialStatus.status === 'active' || trialStatus.status === 'inactive') {
        return trialStatus;
    }

    throw new CrucibleTrialLimitError(
        trialStatus.status === 'conversation_exhausted'
            ? 'CRUCIBLE_TRIAL_CONVERSATION_EXHAUSTED'
            : 'CRUCIBLE_TRIAL_QUOTA_EXHAUSTED',
        trialStatus,
    );
};

// ── Thesis Trial Quota ──────────────────────────────────────────

const CRUCIBLE_THESIS_TRIAL_LIMIT = 2;

export interface CrucibleThesisTrialStatus {
    enabled: boolean;
    mode: 'platform' | 'byok';
    accountTier?: 'standard' | 'vip';
    thesisQuota: {
        limit: number;
        used: number;
        remaining: number;
    };
    canGenerateThesis: boolean;
    message: string;
}

export const getCrucibleThesisTrialStatus = async (
    req: Request,
    options: {
        projectId?: string;
        scriptPath?: string;
    } = {},
): Promise<CrucibleThesisTrialStatus> => {
    if (!isAuthEnabled()) {
        return {
            enabled: false,
            mode: 'platform',
            thesisQuota: { limit: CRUCIBLE_THESIS_TRIAL_LIMIT, used: 0, remaining: CRUCIBLE_THESIS_TRIAL_LIMIT },
            canGenerateThesis: true,
            message: '当前环境未启用账号体系，论文额度限制未开启。',
        };
    }

    const session = await getSessionFromRequest(req);
    const accountTier = resolveAccountTier(session?.user?.email);
    const byokStatus = await getCrucibleByokStatus(req);
    const mode: CrucibleThesisTrialStatus['mode'] = byokStatus.configured ? 'byok' : 'platform';

    if (accountTier === 'vip') {
        return {
            enabled: false,
            mode,
            accountTier,
            thesisQuota: { limit: CRUCIBLE_THESIS_TRIAL_LIMIT, used: 0, remaining: CRUCIBLE_THESIS_TRIAL_LIMIT },
            canGenerateThesis: true,
            message: 'VIP 账号不受论文额度限制。',
        };
    }

    if (mode === 'byok') {
        return {
            enabled: true,
            mode,
            accountTier,
            thesisQuota: { limit: CRUCIBLE_THESIS_TRIAL_LIMIT, used: 0, remaining: CRUCIBLE_THESIS_TRIAL_LIMIT },
            canGenerateThesis: true,
            message: `你当前正在使用自己的 BYOK，论文生成不受额度限制。`,
        };
    }

    const items = await listCrucibleConversations(req, {
        projectId: options.projectId,
        scriptPath: options.scriptPath,
    });
    let thesisUsed = 0;
    for (const item of items) {
        const detail = await getCrucibleConversationDetail(req, {
            conversationId: item.id,
            projectId: options.projectId,
            scriptPath: options.scriptPath,
        });
        if (detail) {
            thesisUsed += detail.artifacts.filter((a) => a.id.startsWith('thesis_')).length;
        }
    }
    const remaining = Math.max(0, CRUCIBLE_THESIS_TRIAL_LIMIT - thesisUsed);

    return {
        enabled: true,
        mode,
        accountTier,
        thesisQuota: { limit: CRUCIBLE_THESIS_TRIAL_LIMIT, used: thesisUsed, remaining },
        canGenerateThesis: thesisUsed < CRUCIBLE_THESIS_TRIAL_LIMIT,
        message: thesisUsed >= CRUCIBLE_THESIS_TRIAL_LIMIT
            ? `你的免费论文生成额度（${CRUCIBLE_THESIS_TRIAL_LIMIT} 次）已用完。继续生成论文请配置自己的 BYOK。`
            : `免费论文生成剩余 ${remaining} 次。`,
    };
};

export const assertCrucibleThesisTrialAccess = async (
    req: Request,
    options: {
        projectId?: string;
        scriptPath?: string;
    } = {},
): Promise<void> => {
    const status = await getCrucibleThesisTrialStatus(req, options);
    if (!status.canGenerateThesis) {
        throw new CrucibleTrialLimitError(
            'CRUCIBLE_TRIAL_QUOTA_EXHAUSTED',
            {
                enabled: true,
                mode: 'platform',
                limits: { conversationLimit: CRUCIBLE_TRIAL_CONVERSATION_LIMIT, turnLimitPerConversation: CRUCIBLE_TRIAL_TURN_LIMIT },
                usage: { conversationsUsed: 0, conversationsRemaining: 0, currentConversationTurnsUsed: 0, currentConversationTurnsRemaining: 0 },
                status: 'quota_exhausted',
                requiresByok: true,
                message: status.message,
            },
        );
    }
};
