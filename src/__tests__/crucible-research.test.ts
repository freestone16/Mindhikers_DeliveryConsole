import { describe, expect, it, vi } from 'vitest';
import {
    parseBingSearchRss,
    performCrucibleExternalSearch,
} from '../../server/crucible-research';

describe('crucible researcher executor', () => {
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
            'AI 时代创作的主体性 最新研究',
            fetchMock as unknown as typeof fetch,
        );

        expect(result.connected).toBe(true);
        expect(result.query).toBe('AI 时代创作的主体性 最新研究');
        expect(result.sources[0]?.url).toBe('https://example.com/a');
    });

    it('fails honestly when the query is missing', async () => {
        const result = await performCrucibleExternalSearch('', vi.fn() as unknown as typeof fetch);

        expect(result.connected).toBe(false);
        expect(result.error).toContain('缺少 query');
    });
});
