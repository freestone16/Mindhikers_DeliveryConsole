export interface CrucibleFactCheckResult {
    checked: boolean;
    scope?: string;
    goal?: string;
    claims: Array<{
        claim: string;
        status: 'unverified';
        note: string;
    }>;
    error?: string;
}

export const performCrucibleFactCheck = async (input: {
    scope?: string;
    goal?: string;
}): Promise<CrucibleFactCheckResult> => {
    const normalizedScope = input.scope?.trim();
    const normalizedGoal = input.goal?.trim();

    return {
        checked: false,
        ...(normalizedScope ? { scope: normalizedScope } : {}),
        ...(normalizedGoal ? { goal: normalizedGoal } : {}),
        claims: [],
        error: 'FactChecker 执行器骨架已接入，但真实校验 provider 尚未实现；当前只保留独立执行器与结构化结果协议',
    };
};
