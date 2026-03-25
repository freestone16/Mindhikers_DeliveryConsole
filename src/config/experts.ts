
export interface ExpertConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    skillName: string;
    outputDir: string;
}

export const EXPERTS: ExpertConfig[] = [

    {
        id: 'Director',
        name: '影视导演',
        description: '视觉叙事蓝图，Artlist/AI/Remotion 混合方案',
        icon: 'Eye',
        color: 'blue',
        skillName: 'Director',
        outputDir: '04_Visuals'
    },
    {
        id: 'MusicDirector',
        name: '音乐总监',
        description: '听觉空间构建，Artlist 实录与 Suno AI 双模态配乐',
        icon: 'Music',
        color: 'purple',
        skillName: 'MusicDirector',
        outputDir: '04_Music_Plan'
    },
    {
        id: 'ThumbnailMaster',
        name: '缩略图大师',
        description: 'CTR 心理学，1.5 秒触发点击',
        icon: 'Image',
        color: 'pink',
        skillName: 'ThumbnailMaster',
        outputDir: '03_Thumbnail_Plan'
    },
    {
        id: 'ShortsMaster',
        name: '短视频大师',
        description: '端到端竖屏 Shorts 批量生产管线，从脚本到渲染到交付',
        icon: 'Video',
        color: 'cyan',
        skillName: 'ShortsMaster',
        outputDir: '05_Shorts_Output'
    },
    {
        id: 'MarketingMaster',
        name: '营销大师',
        description: 'SEO/GEO 优化，标题/Tag/结构化数据',
        icon: 'Megaphone',
        color: 'orange',
        skillName: 'MarketingMaster',
        outputDir: '05_Marketing'
    }
];

export const getExpertById = (id: string): ExpertConfig | undefined =>
    EXPERTS.find(e => e.id === id);

export const getExpertColorClass = (color: string): string => {
    const colorMap: Record<string, string> = {
        blue: 'text-[var(--ink-1)] bg-[rgba(166,117,64,0.14)] border-[var(--accent)] shadow-[0_12px_24px_rgba(166,117,64,0.10)]',
        purple: 'text-[var(--ink-1)] bg-[rgba(181,141,101,0.16)] border-[rgba(132,95,57,0.42)] shadow-[0_12px_24px_rgba(166,117,64,0.08)]',
        pink: 'text-[var(--ink-1)] bg-[linear-gradient(135deg,rgba(255,233,213,0.94)_0%,rgba(246,214,183,0.92)_100%)] border-[rgba(196,86,32,0.65)] shadow-[0_16px_30px_rgba(196,86,32,0.14)]',
        cyan: 'text-[var(--ink-1)] bg-[rgba(233,223,208,0.9)] border-[rgba(126,100,72,0.38)] shadow-[0_12px_24px_rgba(166,117,64,0.08)]',
        orange: 'text-[var(--ink-1)] bg-[rgba(250,225,192,0.94)] border-[rgba(198,120,35,0.5)] shadow-[0_12px_24px_rgba(166,117,64,0.10)]'
    };
    return colorMap[color] || colorMap.blue;
};
