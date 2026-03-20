import { describe, expect, it, vi } from 'vitest';
import {
    buildCrucibleResearchPromptAddon,
    buildCrucibleSearchQuery,
    parseBingSearchRss,
    performCrucibleExternalSearch,
} from '../../server/crucible-research';

describe('crucible research bridge', () => {
    it('builds a usable search query from a contextual request', () => {
        const query = buildCrucibleSearchQuery({
            topicTitle: 'AI 时代高质量内容真正稀缺的东西是什么',
            seedPrompt: 'AI 让很多人都能比较快地做出 70 分的内容',
            latestUserReply: '基于我们刚才这个问题，我想先联网搜索一下最近一两年关于 AI 内容泛滥、高质量内容稀缺性，以及创作者核心竞争力变化的研究或讨论，再继续往下聊。',
        });

        expect(query).toContain('AI 内容泛滥');
        expect(query).toContain('创作者核心竞争力变化');
        expect(query).not.toContain('联网搜索一下');
    });

    it('parses Bing RSS results into structured sources', () => {
        const rss = `<?xml version="1.0" encoding="utf-8" ?>
<rss version="2.0">
  <channel>
    <item>
      <title><![CDATA[AI content glut is reshaping creator economics]]></title>
      <link>https://example.com/report-1</link>
      <description><![CDATA[New research tracks oversupply, trust erosion, and premium shifts.]]></description>
    </item>
    <item>
      <title>Creator advantage now depends on judgment &amp; experience</title>
      <link>https://example.com/report-2</link>
      <description>Scholars argue embodied knowledge still compounds.</description>
    </item>
  </channel>
</rss>`;

        expect(parseBingSearchRss(rss)).toEqual([
            {
                title: 'AI content glut is reshaping creator economics',
                url: 'https://example.com/report-1',
                snippet: 'New research tracks oversupply, trust erosion, and premium shifts.',
            },
            {
                title: 'Creator advantage now depends on judgment & experience',
                url: 'https://example.com/report-2',
                snippet: 'Scholars argue embodied knowledge still compounds.',
            },
        ]);
    });

    it('marks search as connected when external results are fetched', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            text: async () => `<?xml version="1.0" encoding="utf-8" ?>
<rss version="2.0"><channel><item><title>Result A</title><link>https://example.com/a</link><description>Snippet A</description></item></channel></rss>`,
        });

        const result = await performCrucibleExternalSearch(
            {
                topicTitle: 'AI 时代高质量内容真正稀缺的东西是什么',
                seedPrompt: '',
                latestUserReply: '我想先联网搜索一下最近一两年的研究。',
            },
            fetchMock as unknown as typeof fetch
        );

        expect(result.connected).toBe(true);
        expect(result.sources[0]?.url).toBe('https://example.com/a');
    });

    it('injects connected search results into the LLM prompt addon', () => {
        const addon = buildCrucibleResearchPromptAddon({
            query: 'AI 内容泛滥 创作者竞争力 研究',
            connected: true,
            sources: [
                {
                    title: 'Result A',
                    url: 'https://example.com/a',
                    snippet: 'Snippet A',
                },
            ],
        });

        expect(addon).toContain('Researcher 外部调研补充');
        expect(addon).toContain('https://example.com/a');
        expect(addon).toContain('检索状态：已接通真实外部搜索');
    });
});
