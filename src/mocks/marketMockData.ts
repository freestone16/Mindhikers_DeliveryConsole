import type { MarketModule_V2, TitleTagSet, TubeBuddyScore } from '../types';

export const mockTubeBuddyScore = (seed: number): TubeBuddyScore => {
    const rand = (min: number, max: number) => Math.floor((seed * 17 + min) % max);
    return {
        overallScore: rand(60, 95),
        weightedScore: rand(55, 92),
        metrics: {
            searchVolume: rand(40, 90),
            competition: rand(30, 80),
            optimization: rand(50, 95),
            relevance: rand(60, 100)
        },
        rawMetrics: {
            monthlySearches: rand(1000, 500000),
            competitionLevel: seed % 3 === 0 ? 'low' : seed % 3 === 1 ? 'medium' : 'high'
        }
    };
};

export const mockTitleTagSets: TitleTagSet[] = [
    {
        id: 'tt-001',
        index: 0,
        title: 'AI 如何重塑学习：神经科学视角下的认知革命',
        tags: ['AI学习', '神经科学', '认知革命', '学习方法', '人工智能教育'],
        source: 'llm',
        status: 'scored',
        tubeBuddyScore: mockTubeBuddyScore(1)
    },
    {
        id: 'tt-002',
        index: 1,
        title: '为什么你的大脑需要 AI：5 个科学验证的学习升级',
        tags: ['大脑学习', 'AI辅助', '科学方法', '认知升级', '学习效率'],
        source: 'llm',
        status: 'scored',
        tubeBuddyScore: mockTubeBuddyScore(2)
    },
    {
        id: 'tt-003',
        index: 2,
        title: '从神经可塑性到 AI 增强：未来学习者的进化之路',
        tags: ['神经可塑性', 'AI增强', '未来学习', '认知进化', '教育科技'],
        source: 'llm',
        status: 'pending',
        tubeBuddyScore: undefined
    }
];

export const mockMarketModuleV2: MarketModule_V2 = {
    phase: 1,
    titleTagSets: mockTitleTagSets,
    selectedSetId: 'tt-001',
    generationConfig: {
        count: 5,
        focusKeywords: ['AI', '学习', '神经科学'],
        language: 'zh'
    }
};
