export interface CrucibleSearchSource {
    title: string;
    url: string;
    snippet: string;
}

export interface CrucibleSearchResult {
    query: string;
    connected: boolean;
    sources: CrucibleSearchSource[];
    error?: string;
}

const SEARCH_TIMEOUT_MS = 12000;
const MAX_SEARCH_RESULTS = 5;

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');

const decodeHtmlEntities = (value: string) => value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x27;/g, "'");

const stripXmlTags = (value: string) => value.replace(/<[^>]+>/g, ' ');

const extractXmlTag = (xml: string, tag: string) => {
    const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
    return match?.[1] || '';
};

export const parseBingSearchRss = (xml: string): CrucibleSearchSource[] => {
    return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi))
        .map((match) => {
            const itemXml = match[1];
            const title = normalizeText(stripXmlTags(decodeHtmlEntities(extractXmlTag(itemXml, 'title'))));
            const url = normalizeText(stripXmlTags(decodeHtmlEntities(extractXmlTag(itemXml, 'link'))));
            const snippet = normalizeText(stripXmlTags(decodeHtmlEntities(extractXmlTag(itemXml, 'description'))));

            return { title, url, snippet };
        })
        .filter((item) => item.title && item.url)
        .slice(0, MAX_SEARCH_RESULTS);
};

export const performCrucibleExternalSearch = async (
    query: string,
    fetchImpl: typeof fetch = fetch,
): Promise<CrucibleSearchResult> => {
    const normalizedQuery = normalizeText(query);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    if (!normalizedQuery) {
        return {
            query: '',
            connected: false,
            sources: [],
            error: 'Researcher 缺少 query，宿主未执行外部搜索',
        };
    }

    try {
        const response = await fetchImpl(
            `https://www.bing.com/search?format=rss&setlang=zh-Hans&q=${encodeURIComponent(normalizedQuery)}`,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
                },
                signal: controller.signal,
            },
        );

        if (!response.ok) {
            const errorBody = (await response.text()).slice(0, 240);
            return {
                query: normalizedQuery,
                connected: false,
                sources: [],
                error: `HTTP ${response.status}: ${errorBody}`,
            };
        }

        const xml = await response.text();
        const sources = parseBingSearchRss(xml);

        if (sources.length === 0) {
            return {
                query: normalizedQuery,
                connected: false,
                sources: [],
                error: '外部搜索已返回，但没有解析到有效结果',
            };
        }

        return {
            query: normalizedQuery,
            connected: true,
            sources,
        };
    } catch (error: any) {
        const message = error?.name === 'AbortError'
            ? `外部搜索超时（>${SEARCH_TIMEOUT_MS}ms）`
            : error?.message || '外部搜索失败';

        return {
            query: normalizedQuery,
            connected: false,
            sources: [],
            error: message,
        };
    } finally {
        clearTimeout(timeoutId);
    }
};
