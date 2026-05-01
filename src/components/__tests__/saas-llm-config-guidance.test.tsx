import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SaaSLLMConfigPage } from '../SaaSLLMConfigPage';

const mockBuildApiUrl = (path: string) => `http://localhost:3009${path}`;

vi.mock('../../config/runtime', () => ({
    buildApiUrl: (path: string) => mockBuildApiUrl(path),
}));

const defaultByokStatus = {
    configured: false,
    hasApiKey: false,
};

const renderPage = (props?: { trialStatus?: any }) => {
    return render(<SaaSLLMConfigPage {...props} />);
};

describe('SaaSLLMConfigPage', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response(JSON.stringify(defaultByokStatus), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders the page title', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('LLM / BYOK 配置')).toBeInTheDocument();
        });
    });

    it('shows the guided onboarding summary', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByText(/平台默认推荐/)).toBeInTheDocument();
        });
    });

    it('displays all three recommended provider cards', async () => {
        renderPage();
        await waitFor(() => {
            expect(screen.getByText('Kimi 原厂')).toBeInTheDocument();
            expect(screen.getByText('OpenRouter')).toBeInTheDocument();
            expect(screen.getByText('DeepSeek')).toBeInTheDocument();
        });
    });

    it('fills in provider fields when clicking a recommended card', async () => {
        renderPage();
        await waitFor(() => screen.getByText('聚合多模型，有免费额度'));

        const openRouterCards = screen.getAllByText('OpenRouter');
        const card = openRouterCards.find(el => el.closest('button'));
        if (card) {
            fireEvent.click(card);
        }

        const baseUrlInput = screen.getByPlaceholderText('https://api.moonshot.cn/v1') as HTMLInputElement;
        expect(baseUrlInput.value).toBe('https://openrouter.ai/api/v1');
    });

    it('shows error with category-specific suggestion on test failure', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({
                success: false,
                error: 'API Error: unauthorized',
                errorCategory: 'key_invalid',
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        );

        renderPage();
        await waitFor(() => screen.getByText('测试连接'));

        const baseUrlInput = screen.getByPlaceholderText('https://api.moonshot.cn/v1');
        fireEvent.change(baseUrlInput, { target: { value: 'https://api.test.com/v1' } });

        const modelInput = screen.getByPlaceholderText('kimi-k2.5');
        fireEvent.change(modelInput, { target: { value: 'test-model' } });

        const apiKeyInput = screen.getByPlaceholderText('请输入你的 API Key');
        fireEvent.change(apiKeyInput, { target: { value: 'sk-test' } });

        const testButton = screen.getByText('测试连接');
        fireEvent.click(testButton);

        await waitFor(() => {
            expect(screen.getByText(/API Key 无效/)).toBeInTheDocument();
        });
    });

    it('shows timeout suggestion on timeout error', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({
                success: false,
                error: '请求超时',
                errorCategory: 'timeout',
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        );

        renderPage();
        await waitFor(() => screen.getByText('测试连接'));

        const baseUrlInput = screen.getByPlaceholderText('https://api.moonshot.cn/v1');
        fireEvent.change(baseUrlInput, { target: { value: 'https://slow.api/v1' } });

        const modelInput = screen.getByPlaceholderText('kimi-k2.5');
        fireEvent.change(modelInput, { target: { value: 'test-model' } });

        const apiKeyInput = screen.getByPlaceholderText('请输入你的 API Key');
        fireEvent.change(apiKeyInput, { target: { value: 'sk-test' } });

        fireEvent.click(screen.getByText('测试连接'));

        await waitFor(() => {
            expect(screen.getByText(/请检查 Base URL 是否正确/)).toBeInTheDocument();
        });
    });
});
