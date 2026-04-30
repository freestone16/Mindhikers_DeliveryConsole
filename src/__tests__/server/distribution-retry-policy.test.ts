import { describe, expect, it } from 'vitest';
import {
  applyRetryPolicy,
  classifyError,
  computeNextRetryAt,
  defaultRetryPolicy,
} from '../../../server/distribution-retry-policy';

class HttpError extends Error {
  status: number;
  constructor(status: number, message = `HTTP ${status}`) {
    super(message);
    this.status = status;
  }
}

describe('distribution-retry-policy / classifyError', () => {
  it('classifies 401 as 4xx_auth', () => {
    expect(classifyError(new HttpError(401))).toBe('4xx_auth');
  });

  it('classifies 403 as 4xx_auth', () => {
    expect(classifyError(new HttpError(403))).toBe('4xx_auth');
  });

  it('classifies 422 as 4xx_content', () => {
    expect(classifyError(new HttpError(422, 'content rejected'))).toBe('4xx_content');
  });

  it('classifies 429 as 4xx_rate_limit', () => {
    expect(classifyError(new HttpError(429))).toBe('4xx_rate_limit');
  });

  it('classifies 5xx as 5xx_server', () => {
    expect(classifyError(new HttpError(500))).toBe('5xx_server');
    expect(classifyError(new HttpError(503))).toBe('5xx_server');
  });

  it('classifies ETIMEDOUT as network', () => {
    const err = Object.assign(new Error('socket timed out'), { code: 'ETIMEDOUT' });
    expect(classifyError(err)).toBe('network');
  });

  it('classifies ECONNREFUSED as network', () => {
    const err = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
    expect(classifyError(err)).toBe('network');
  });

  it('classifies fetch-style network failures by message', () => {
    expect(classifyError(new TypeError('fetch failed'))).toBe('network');
  });

  it('falls back to unknown for plain Error without status', () => {
    expect(classifyError(new Error('boom'))).toBe('unknown');
  });

  it('does not throw on null/undefined input', () => {
    expect(classifyError(null)).toBe('unknown');
    expect(classifyError(undefined)).toBe('unknown');
  });

  it('honors explicit httpStatus argument over error shape', () => {
    expect(classifyError(new Error('forced'), 429)).toBe('4xx_rate_limit');
  });

  it('reads status from nested response.status', () => {
    const err = Object.assign(new Error('wrapped'), { response: { status: 401 } });
    expect(classifyError(err)).toBe('4xx_auth');
  });
});

describe('distribution-retry-policy / applyRetryPolicy', () => {
  it('does not retry 4xx_auth', () => {
    expect(applyRetryPolicy('4xx_auth', 1)).toEqual({ shouldRetry: false });
  });

  it('does not retry 4xx_content', () => {
    expect(applyRetryPolicy('4xx_content', 1)).toEqual({ shouldRetry: false });
  });

  it('returns 60s delay for 4xx_rate_limit at attempt 1', () => {
    expect(applyRetryPolicy('4xx_rate_limit', 1)).toEqual({ shouldRetry: true, delayMs: 60_000 });
  });

  it('returns 5m delay for 4xx_rate_limit at attempt 2', () => {
    expect(applyRetryPolicy('4xx_rate_limit', 2)).toEqual({ shouldRetry: true, delayMs: 300_000 });
  });

  it('returns 15m delay for 4xx_rate_limit at attempt 3', () => {
    expect(applyRetryPolicy('4xx_rate_limit', 3)).toEqual({ shouldRetry: true, delayMs: 900_000 });
  });

  it('stops retrying once attemptCount exceeds delay schedule', () => {
    expect(applyRetryPolicy('4xx_rate_limit', 4)).toEqual({ shouldRetry: false });
  });

  it('returns 5s delay for 5xx_server at attempt 1', () => {
    expect(applyRetryPolicy('5xx_server', 1)).toEqual({ shouldRetry: true, delayMs: 5_000 });
  });

  it('returns 3s delay for network at attempt 1', () => {
    expect(applyRetryPolicy('network', 1)).toEqual({ shouldRetry: true, delayMs: 3_000 });
  });

  it('returns 10s delay for unknown at attempt 1 (retryable bucket)', () => {
    expect(applyRetryPolicy('unknown', 1)).toEqual({ shouldRetry: true, delayMs: 10_000 });
  });

  it('rejects attemptCount < 1 as non-retryable', () => {
    expect(applyRetryPolicy('5xx_server', 0)).toEqual({ shouldRetry: false });
  });

  it('respects custom policies', () => {
    const custom = {
      maxAttempts: 1,
      rules: {
        ...defaultRetryPolicy.rules,
        unknown: { retry: false },
      },
    };
    expect(applyRetryPolicy('unknown', 1, custom)).toEqual({ shouldRetry: false });
  });
});

describe('distribution-retry-policy / classify→apply integration', () => {
  it('plain Error becomes unknown→retryable', () => {
    const category = classifyError(new Error('mystery'));
    expect(category).toBe('unknown');
    expect(applyRetryPolicy(category, 1).shouldRetry).toBe(true);
  });

  it('401 becomes 4xx_auth→non-retryable', () => {
    const category = classifyError(new HttpError(401));
    expect(applyRetryPolicy(category, 1).shouldRetry).toBe(false);
  });
});

describe('distribution-retry-policy / computeNextRetryAt', () => {
  it('produces ISO 8601 string offset by delay', () => {
    const now = new Date('2026-04-29T00:00:00.000Z');
    expect(computeNextRetryAt(60_000, now)).toBe('2026-04-29T00:01:00.000Z');
  });
});
