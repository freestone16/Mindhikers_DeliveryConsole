import type { DistributionErrorCategory } from './distribution-types';

export interface RetryRule {
  retry: boolean;
  delaysMs?: number[];
}

export interface RetryPolicyConfig {
  maxAttempts: number;
  rules: Record<DistributionErrorCategory, RetryRule>;
}

export const defaultRetryPolicy: RetryPolicyConfig = {
  maxAttempts: 3,
  rules: {
    '4xx_auth': { retry: false },
    '4xx_content': { retry: false },
    '4xx_rate_limit': { retry: true, delaysMs: [60_000, 300_000, 900_000] },
    '5xx_server': { retry: true, delaysMs: [5_000, 15_000, 60_000] },
    network: { retry: true, delaysMs: [3_000, 10_000, 30_000] },
    unknown: { retry: true, delaysMs: [10_000, 30_000, 60_000] },
  },
};

const NETWORK_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
]);

export function classifyError(error: unknown, httpStatus?: number): DistributionErrorCategory {
  const status = typeof httpStatus === 'number' ? httpStatus : extractHttpStatus(error);
  if (typeof status === 'number') {
    if (status === 401 || status === 403) return '4xx_auth';
    if (status === 422) return '4xx_content';
    if (status === 429) return '4xx_rate_limit';
    if (status >= 500 && status < 600) return '5xx_server';
  }

  if (isNetworkError(error)) return 'network';

  return 'unknown';
}

export function applyRetryPolicy(
  category: DistributionErrorCategory,
  attemptCount: number,
  policy: RetryPolicyConfig = defaultRetryPolicy
): { shouldRetry: boolean; delayMs?: number } {
  const rule = policy.rules[category];
  if (!rule || rule.retry === false) {
    return { shouldRetry: false };
  }

  const delays = rule.delaysMs ?? [];
  if (!Number.isFinite(attemptCount) || attemptCount < 1 || attemptCount > delays.length) {
    return { shouldRetry: false };
  }

  return { shouldRetry: true, delayMs: delays[attemptCount - 1] };
}

export function computeNextRetryAt(delayMs: number, now: Date = new Date()): string {
  return new Date(now.getTime() + delayMs).toISOString();
}

function extractHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as Record<string, unknown>;
  if (typeof candidate.status === 'number') return candidate.status;
  if (typeof candidate.statusCode === 'number') return candidate.statusCode;
  if (typeof candidate.httpStatus === 'number') return candidate.httpStatus;
  const response = candidate.response;
  if (response && typeof response === 'object') {
    const inner = (response as Record<string, unknown>).status;
    if (typeof inner === 'number') return inner;
  }
  return undefined;
}

function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as Record<string, unknown>;
  const code = typeof candidate.code === 'string' ? candidate.code : '';
  if (code && NETWORK_ERROR_CODES.has(code)) return true;
  const name = typeof candidate.name === 'string' ? candidate.name : '';
  if (name === 'AbortError' || name === 'FetchError' || name === 'TimeoutError') return true;
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';
  if (message.includes('fetch failed') || message.includes('network request failed')) return true;
  return false;
}
