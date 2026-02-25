
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
        id: 'Writer',
        name: '写作大师',
        description: '承接黄金坩埚产出的 Mini 论文进行深度扩写',
        icon: 'PenTool',
        color: 'slate',
        skillName: 'Writer',
        outputDir: '02_Script'
    },
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
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500',
        pink: 'text-pink-400 bg-pink-500/10 border-pink-500',
        cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500',
        orange: 'text-orange-400 bg-orange-500/10 border-orange-500'
    };
    return colorMap[color] || colorMap.blue;
};
