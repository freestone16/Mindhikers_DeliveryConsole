import type {
    MarketModule_V3,
    CandidateKeyword,
    MarketingPlan,
    MarketingPlanRow,
    DescriptionBlock,
    OtherItem,
    SRTChapter,
    TubeBuddyScore,
} from '../types';

// ─────────────────────────────────────────────────────────────
// 默认初始状态（新项目进入 MarketingMaster 时使用）
// ─────────────────────────────────────────────────────────────
export const defaultMarketV3State: MarketModule_V3 = {
    phase: 1,
    phase1SubStep: 'candidates',
    candidates: [],
    goldenKeywords: [],
    activeTabIndex: 0,
    plans: [],
};

// ─────────────────────────────────────────────────────────────
// Mock TubeBuddy Score（开发用）
// ─────────────────────────────────────────────────────────────
const mockTBScore = (overall: number, search: number, comp: number, opt: number, rel: number, monthly: number): TubeBuddyScore => ({
    overall,
    searchVolume: search,
    competition: comp,
    optimization: opt,
    relevance: rel,
    overallScore: overall,
    weightedScore: Math.round(overall * 0.95),
    metrics: { searchVolume: search, competition: comp, optimization: opt, relevance: rel },
    rawMetrics: { monthlySearches: monthly, competitionLevel: comp < 50 ? 'low' : comp < 70 ? 'medium' : 'high' },
});

// ─────────────────────────────────────────────────────────────
// Mock 候选关键词（含简繁体变体，含评分）
// ─────────────────────────────────────────────────────────────
export const mockCandidates: CandidateKeyword[] = [
    {
        id: 'kw-001',
        keyword: 'AI时代儿童教育',
        variants: [
            {
                text: 'AI时代儿童教育',
                script: 'simplified',
                status: 'scored',
                tubeBuddyScore: mockTBScore(87, 75, 62, 91, 88, 45000),
                scoringDuration: 4200,
                scoredAt: '2026-03-06T10:15:00Z',
            },
            {
                text: 'AI時代兒童教育',
                script: 'traditional',
                status: 'scored',
                tubeBuddyScore: mockTBScore(72, 58, 55, 85, 80, 18000),
                scoringDuration: 3800,
                scoredAt: '2026-03-06T10:15:10Z',
            },
        ],
        source: 'llm',
        isGolden: true,
        bestScore: 87,
    },
    {
        id: 'kw-002',
        keyword: 'ChatGPT与孩子学习',
        variants: [
            {
                text: 'ChatGPT与孩子学习',
                script: 'simplified',
                status: 'scored',
                tubeBuddyScore: mockTBScore(82, 80, 68, 88, 85, 62000),
                scoringDuration: 3950,
                scoredAt: '2026-03-06T10:15:30Z',
            },
            {
                text: 'ChatGPT與孩子學習',
                script: 'traditional',
                status: 'scored',
                tubeBuddyScore: mockTBScore(76, 70, 65, 82, 78, 25000),
                scoringDuration: 4100,
                scoredAt: '2026-03-06T10:15:45Z',
            },
        ],
        source: 'llm',
        isGolden: true,
        bestScore: 82,
    },
    {
        id: 'kw-003',
        keyword: '脑科学教育方法',
        variants: [
            {
                text: '脑科学教育方法',
                script: 'simplified',
                status: 'scored',
                tubeBuddyScore: mockTBScore(79, 65, 55, 86, 82, 38000),
                scoringDuration: 4500,
                scoredAt: '2026-03-06T10:16:00Z',
            },
            {
                text: '腦科學教育方法',
                script: 'traditional',
                status: 'scored',
                tubeBuddyScore: mockTBScore(68, 52, 48, 79, 75, 14000),
                scoringDuration: 3600,
                scoredAt: '2026-03-06T10:16:15Z',
            },
        ],
        source: 'llm',
        isGolden: false,
        bestScore: 79,
    },
    {
        id: 'kw-004',
        keyword: '学习与AI共存',
        variants: [
            {
                text: '学习与AI共存',
                script: 'simplified',
                status: 'scored',
                tubeBuddyScore: mockTBScore(71, 60, 72, 75, 80, 28000),
                scoringDuration: 3700,
                scoredAt: '2026-03-06T10:16:30Z',
            },
            {
                text: '學習與AI共存',
                script: 'traditional',
                status: 'scored',
                tubeBuddyScore: mockTBScore(65, 50, 68, 70, 74, 10000),
                scoringDuration: 3400,
                scoredAt: '2026-03-06T10:16:45Z',
            },
        ],
        source: 'llm',
        isGolden: false,
        bestScore: 71,
    },
    {
        id: 'kw-005',
        keyword: '未来教育趋势',
        variants: [
            {
                text: '未来教育趋势',
                script: 'simplified',
                status: 'error',
                errorMessage: '网络超时，请重试',
            },
            {
                text: '未來教育趨勢',
                script: 'traditional',
                status: 'pending',
            },
        ],
        source: 'user',
        isGolden: false,
    },
];

// ─────────────────────────────────────────────────────────────
// Mock 视频描述子区块
// ─────────────────────────────────────────────────────────────
const mockDescriptionBlocks: DescriptionBlock[] = [
    {
        id: 'block-hook',
        type: 'hook',
        label: 'Hook 开场白',
        content: '你是否担心AI会让孩子的学习变得毫无意义？✨ 当ChatGPT能在30秒内写出满分作文，我们的孩子还需要学写作吗？',
        isCollapsed: false,
    },
    {
        id: 'block-geo_qa',
        type: 'geo_qa',
        label: 'GEO 问答锚点',
        content: 'Q: ChatGPT会影响孩子的逻辑思维吗？\nA: 根据维果茨基的最近发展区理论，AI工具的引入需要谨慎设计"脚手架"——它应该帮助孩子突破认知边界，而非替代思维过程本身。',
        isCollapsed: true,
    },
    {
        id: 'block-series',
        type: 'series',
        label: '系列定位语',
        content: '这是《碳硅进化论：AI时代教育指南》系列第1讲。关注@MindHikers，每周一深度科学洞察。',
        isCollapsed: true,
    },
    {
        id: 'block-action_plan',
        type: 'action_plan',
        label: '行动计划',
        content: '本期三个可执行行动：\n1. 具身认知实践：用身体感受替代屏幕学习20分钟\n2. 心流体验设计：找到孩子的最近发展区任务\n3. AI协同实验：让孩子与AI合作完成一个创作项目',
        isCollapsed: true,
    },
    {
        id: 'block-timeline',
        type: 'timeline',
        label: '时间轴',
        content: '00:00 开场：当AI比你的孩子更会写作文\n02:30 为什么语言是思维的脚手架？\n07:00 维果茨基与最近发展区\n12:00 三类学习者：被替代者、共生者、超越者\n18:00 家长实操指南：设计AI辅助学习场景\n24:00 总结与行动清单',
        isCollapsed: true,
    },
    {
        id: 'block-references',
        type: 'references',
        label: 'References',
        content: 'Vygotsky, L.S. (1978). Mind in Society: The Development of Higher Psychological Processes. Harvard University Press.\nHattie, J. (2008). Visible Learning. Routledge.\nCSET 2024 Report: AI in K-12 Education.',
        isCollapsed: true,
    },
    {
        id: 'block-pinned_comment',
        type: 'pinned_comment',
        label: '置顶评论 (Pinned Comment)',
        content: 'TL;DW 本期三个核心洞察：\n① AI改变的不是"学什么"，而是"如何学"\n② 最近发展区理论是设计AI辅助学习的黄金标准\n③ 孩子需要的不是更少AI，而是更好的AI协作技能\n\n你怎么看？留言分享你的育儿AI经验 👇',
        isCollapsed: true,
    },
    {
        id: 'block-hashtags',
        type: 'hashtags',
        label: 'Hashtags',
        content: '#AI教育 #MindHikers #脑科学 #碳硅进化论 #未来教育 #儿童教育 #ChatGPT育儿 #学习方法',
        isCollapsed: true,
    },
];

// ─────────────────────────────────────────────────────────────
// Mock 其他设置子项
// ─────────────────────────────────────────────────────────────
const mockOtherItems: OtherItem[] = [
    { key: 'language', label: '视频语言', value: '中文（简体）', isDefault: true },
    { key: 'captionsCertification', label: '字幕认证', value: '无', isDefault: true },
    { key: 'alteredContent', label: 'AI 内容声明', value: '否', isDefault: true },
    { key: 'madeForKids', label: '面向儿童', value: '否', isDefault: true },
    { key: 'category', label: '视频类别', value: '教育 (27)', isDefault: true },
    { key: 'license', label: '许可证', value: '标准 YouTube 许可证', isDefault: true },
    { key: 'allowComments', label: '评论', value: '允许', isDefault: true },
    { key: 'visibility', label: '可见性', value: '公开', isDefault: true },
    { key: 'filename', label: '文件名', value: 'ai-shidai-jiaoyu-mindhikers-20260306', isDefault: false },
];

// ─────────────────────────────────────────────────────────────
// Mock 营销方案表格行
// ─────────────────────────────────────────────────────────────
const mockRows = (keyword: string): MarketingPlanRow[] => [
    {
        id: 'row-title',
        rowType: 'title',
        label: '标题',
        content: `并不是AI淘汰了孩子，而是只会死记硬背的大脑。脑科学视角的未来教育真相 | ${keyword}`,
        isConfirmed: false,
    },
    {
        id: 'row-description',
        rowType: 'description',
        label: '视频描述',
        content: '',  // 由 descriptionBlocks 组合而成
        isConfirmed: false,
        descriptionBlocks: mockDescriptionBlocks,
    },
    {
        id: 'row-thumbnail',
        rowType: 'thumbnail',
        label: '缩略图',
        content: '',  // 来自 03_Thumbnail_Plan/
        isConfirmed: false,
    },
    {
        id: 'row-playlist',
        rowType: 'playlist',
        label: 'Playlist',
        content: '碳硅进化论：AI时代的儿童教育',
        isConfirmed: false,
    },
    {
        id: 'row-tags',
        rowType: 'tags',
        label: 'Tags',
        content: 'AI时代教育,ChatGPT育儿,脑科学教育,学习方法,人工智能教育,未来教育,儿童发展,认知科学,MindHikers,教育科技,维果茨基,最近发展区,AI学习工具,教育趋势,家长必看,碳硅进化论,AI与孩子,智能教育,数字教育,学习革命',
        isConfirmed: false,
    },
    {
        id: 'row-other',
        rowType: 'other',
        label: '其他设置',
        content: '',  // 由 otherItems 渲染
        isConfirmed: false,
        otherItems: mockOtherItems,
    },
];

// ─────────────────────────────────────────────────────────────
// Mock SRT 章节
// ─────────────────────────────────────────────────────────────
export const mockSRTChapters: SRTChapter[] = [
    { title: '开场：当AI比你的孩子更会写作文', startTime: '00:00:00', endTime: '00:02:30' },
    { title: '为什么语言是思维的脚手架？', startTime: '00:02:30', endTime: '00:07:00' },
    { title: '维果茨基与最近发展区', startTime: '00:07:00', endTime: '00:12:00' },
    { title: '三类学习者：被替代者、共生者、超越者', startTime: '00:12:00', endTime: '00:18:00' },
    { title: '家长实操指南：设计AI辅助学习场景', startTime: '00:18:00', endTime: '00:24:00' },
    { title: '总结与行动清单', startTime: '00:24:00' },
];

// ─────────────────────────────────────────────────────────────
// Mock 营销方案集合（Phase 2 开发用）
// ─────────────────────────────────────────────────────────────
export const mockPlans: MarketingPlan[] = [
    {
        keywordId: 'kw-001',
        keyword: 'AI时代儿童教育',
        rows: mockRows('AI时代儿童教育'),
        thumbnailPaths: [],
        generationStatus: 'ready',
        generationDuration: 42000,
    },
    {
        keywordId: 'kw-002',
        keyword: 'ChatGPT与孩子学习',
        rows: mockRows('ChatGPT与孩子学习'),
        thumbnailPaths: [],
        generationStatus: 'ready',
        generationDuration: 38000,
    },
];

// ─────────────────────────────────────────────────────────────
// Mock LLM 策略点评
// ─────────────────────────────────────────────────────────────
export const mockLLMAnalysis = `
🧠 AI 策略点评

综合 TubeBuddy 评分和当前 YouTube 算法趋势，以下是我的分析：

【推荐首选】AI时代儿童教育（综合评分: 87）
优势：搜索量适中（月均 4.5 万），竞争度可控，与频道定位高度契合。这是一个"蓝海中的优质词"——有足够的搜索需求，但大频道尚未主攻。

【推荐次选】ChatGPT与孩子学习（综合评分: 82）
优势：搜索量最高（月均 6.2 万），热点词，但竞争更激烈。适合作为 A/B 测试的第二选项，测试不同受众的响应。

【策略建议】
• 首选"AI时代儿童教育"作为主关键词，利用频道在教育细分领域的积累
• 在标题中加入痛点词（"死记硬背"、"被淘汰"）强化点击动力
• Tags 覆盖两个词的语义场，同时获取两个词的算法分发
• 繁体词流量相对较小（港台受众），如有本地化需求可考虑发布繁体版描述
`.trim();

// ─────────────────────────────────────────────────────────────
// 完整的开发预览 Mock State（Sprint 2-5 UI 开发时使用）
// ─────────────────────────────────────────────────────────────
export const mockMarketV3Phase1Selection: MarketModule_V3 = {
    phase: 1,
    phase1SubStep: 'selection',
    candidates: mockCandidates,
    goldenKeywords: ['kw-001', 'kw-002'],
    activeTabIndex: 0,
    plans: [],
    llmAnalysis: mockLLMAnalysis,
    selectedScript: { filename: 'CSET-EP01-script.md', path: 'CSET/scripts/CSET-EP01-script.md' },
};

export const mockMarketV3Phase2: MarketModule_V3 = {
    phase: 2,
    phase1SubStep: 'selection',
    candidates: mockCandidates,
    goldenKeywords: ['kw-001', 'kw-002'],
    activeTabIndex: 0,
    plans: mockPlans,
    srtChapters: mockSRTChapters,
    llmAnalysis: mockLLMAnalysis,
    selectedScript: { filename: 'CSET-EP01-script.md', path: 'CSET/scripts/CSET-EP01-script.md' },
};
