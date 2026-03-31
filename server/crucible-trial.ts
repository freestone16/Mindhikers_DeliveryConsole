import type { Request } from 'express';
import { isAuthEnabled } from './auth';
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

    const byokStatus = await getCrucibleByokStatus(req);

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
