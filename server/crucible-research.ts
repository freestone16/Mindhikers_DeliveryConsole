import type { PromptContext } from './crucible-orchestrator';

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
const SEARCH_FILLER_PATTERN = /(基于我们刚才这个问题|基于刚才这个问题|围绕我们刚才这个问题|我想先|先|联网搜索一下|联网搜索|搜索一下|搜索|再继续(往下)?聊|再继续讨论|之后再继续|最近一两年(关于)?)/g;

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

export const buildCrucibleSearchQuery = (context: Pick<PromptContext, 'topicTitle' | 'seedPrompt' | 'latestUserReply'>) => {
    const primary = normalizeText(context.latestUserReply || '');
    const cleanedPrimary = normalizeText(
        primary
            .replace(SEARCH_FILLER_PATTERN, ' ')
            .replace(/[“”"'`]/g, ' ')
            .replace(/[，。！？；：]/g, ' ')
    );

    if (cleanedPrimary) {
        return cleanedPrimary;
    }

    const fallback = normalizeText(context.topicTitle || context.seedPrompt || '最新研究现状');
    return fallback || '最新研究现状';
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
    context: Pick<PromptContext, 'topicTitle' | 'seedPrompt' | 'latestUserReply'>,
    fetchImpl: typeof fetch = fetch
): Promise<CrucibleSearchResult> => {
    const query = buildCrucibleSearchQuery(context);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    try {
        const response = await fetchImpl(
            `https://www.bing.com/search?format=rss&setlang=zh-Hans&q=${encodeURIComponent(query)}`,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
                },
                signal: controller.signal,
            }
        );

        if (!response.ok) {
            const errorBody = (await response.text()).slice(0, 240);
            return {
                query,
                connected: false,
                sources: [],
                error: `HTTP ${response.status}: ${errorBody}`,
            };
        }

        const xml = await response.text();
        const sources = parseBingSearchRss(xml);

        if (sources.length === 0) {
            return {
                query,
                connected: false,
                sources: [],
                error: '外部搜索已返回，但没有解析到有效结果',
            };
        }

        return {
            query,
            connected: true,
            sources,
        };
    } catch (error: any) {
        const message = error?.name === 'AbortError'
            ? `外部搜索超时（>${SEARCH_TIMEOUT_MS}ms）`
            : error?.message || '外部搜索失败';

        return {
            query,
            connected: false,
            sources: [],
            error: message,
        };
    } finally {
        clearTimeout(timeoutId);
    }
};

export const buildCrucibleResearchPromptAddon = (result: CrucibleSearchResult) => {
    if (!result.query) {
        return '';
    }

    if (!result.connected) {
        return `\n\n## Researcher 状态\n用户本轮明确要求联网搜索。\n- 查询意图：${result.query}\n- 当前状态：外部检索未成功接通（${result.error || '未知错误'}）\n请不要伪造“已经查到”的外部材料；如果需要回应，只能诚实说明当前先继续基于现有上下文推进。`;
    }

    const sourcesBlock = result.sources
        .map((source, index) => `${index + 1}. 标题：${source.title}\n   链接：${source.url}\n   摘要：${source.snippet || '暂无摘要'}`)
        .join('\n');

    return `\n\n## Researcher 外部调研补充\n用户本轮明确要求联网搜索，以下是已拉到的外部材料，请把它们作为最新背景信息使用：\n- 查询语句：${result.query}\n- 检索状态：已接通真实外部搜索\n- 使用要求：不要把材料机械罗列成搜索报告；优先结合当前对话语境继续推进，并在必要时把最有价值的一条压成 presentables 里的 reference。\n\n### 外部来源\n${sourcesBlock}`;
};
