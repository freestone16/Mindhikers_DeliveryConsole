import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    testCrucibleByokConfig,
    type ByokDiagnosticCategory,
} from '../crucible-byok';

const VALID_INPUT = {
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'sk-test-key-12345',
    model: 'test-model',
};

describe('testCrucibleByokConfig', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── config_incomplete ──

    it('returns config_incomplete when baseUrl is empty', async () => {
        const result = await testCrucibleByokConfig({
            ...VALID_INPUT,
            baseUrl: '',
        });
        expect(result.success).toBe(false);
        expect(result.errorCategory).toBe('config_incomplete');
    });

    it('returns config_incomplete when apiKey is empty', async () => {
        const result = await testCrucibleByokConfig({
            ...VALID_INPUT,
            apiKey: '',
        });
        expect(result.success).toBe(false);
        expect(result.errorCategory).toBe('config_incomplete');
    });

    it('returns config_incomplete when model is empty', async () => {
        const result = await testCrucibleByokConfig({
            ...VALID_INPUT,
            model: '',
        });
        expect(result.success).toBe(false);
        expect(result.errorCategory).toBe('config_incomplete');
    });

    it('returns config_incomplete when all fields are whitespace', async () => {
        const result = await testCrucibleByokConfig({
            baseUrl: '   ',
            apiKey: '   ',
            model: '   ',
        });
        expect(result.success).toBe(false);
        expect(result.errorCategory).toBe('config_incomplete');
    });

    // ── key_invalid: HTTP 401 ──

    it('returns key_invalid on HTTP 401', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response('Unauthorized', { status: 401 }),
        );
        const result = await testCrucibleByokConfig(VALID_INPUT);
        expect(result.success).toBe(false);
        expect(result.errorCategory).toBe('key_invalid');
    });

    // ── key_invalid: HTTP 403 ──

    it('returns key_invalid on HTTP 403', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response('Forbidden', { status: 403 }),
        );
        const result = await testCrucibleByokConfig(VALID_INPUT);
        expect(result.success).toBe(false);
        expect(result.errorCategory).toBe('key_invalid');
    });

    // ── key_invalid: body contains "invalid api key" ──

    it('returns key_invalid when body contains "invalid api key"', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response('{"error": "invalid api key provided"}', { status: 400 }),
        );
        const result = await testCrucibleByokConfig(VALID_INPUT);
        expect(result.success).toBe(false);
        expect(result.errorCategory).toBe('key_invalid');
    });

    // ── key_invalid: body contains "unauthorized" ──

    it('returns key_invalid when body contains "unauthorized"', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response('{"error": "unauthorized access"}', { status: 400 }),
        );
        const result = await testCrucibleByokConfig(VALID_INPUT);
        expect(result.success).toBe(false);
        expect(result.errorCategory).toBe('key_invalid');
    });

    // ── model_unavailable: body contains "model not found" ──

    it('returns model_unavailable when body contains "model not found"', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response('{"error": "model not found: gpt-99"}', { status: 400 }),
        );
        const result = await testCrucibleByokConfig(VALID_INPUT);
        expect(result.success).toBe(false);
        expect(result.errorCategory).toBe('model_unavailable');
    });

    // ── model_unavailable: body contains "model does not exist" ──

    it('returns model_unavailable when body contains "does not exist"', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response('{"error": "Model does not exist"}', { status: 404 }),
        );
        const result = await testCrucibleByokConfig(VALID_INPUT);
        expect(result.success).toBe(false);
        expect(result.errorCategory).toBe('model_unavailable');
    });

    // ── timeout: AbortError ──

    it('returns timeout on AbortError', async () => {
        const abortError = new DOMException('The operation was aborted', 'AbortError');
        vi.mocked(fetch).mockRejectedValueOnce(abortError);
        const result = await testCrucibleByokConfig(VALID_INPUT);
        expect(result.success).toBe(false);
        expect(result.errorCategory).toBe('timeout');
    });

    // ── api_error: generic HTTP 500 ──

    it('returns api_error on HTTP 500', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response('Internal Server Error', { status: 500 }),
        );
        const result = await testCrucibleByokConfig(VALID_INPUT);
        expect(result.success).toBe(false);
        expect(result.errorCategory).toBe('api_error');
    });

    // ── api_error: network error ──

    it('returns api_error on generic network error', async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
        const result = await testCrucibleByokConfig(VALID_INPUT);
        expect(result.success).toBe(false);
        expect(result.errorCategory).toBe('api_error');
    });

    // ── success ──

    it('returns success on HTTP 200', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response('{"id":"chatcmpl-123","choices":[]}', { status: 200 }),
        );
        const result = await testCrucibleByokConfig(VALID_INPUT);
        expect(result.success).toBe(true);
        expect(result.latency).toBeGreaterThanOrEqual(0);
        expect(result.error).toBeUndefined();
        expect(result.errorCategory).toBeUndefined();
    });

    // ── latency measurement ──

    it('includes latency on error responses', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response('Unauthorized', { status: 401 }),
        );
        const result = await testCrucibleByokConfig(VALID_INPUT);
        expect(result.success).toBe(false);
        expect(typeof result.latency).toBe('number');
        expect(result.latency).toBeGreaterThanOrEqual(0);
    });
});
