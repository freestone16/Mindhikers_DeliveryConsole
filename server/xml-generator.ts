/**
 * Final Cut Pro XML 生成器
 * 用于生成 Final Cut Pro 可导入的 XML 文件
 */

import fs from 'fs';
import path from 'path';
import { parseSRT, SubtitleSegment, timecodeToMs, msToTimecode, formatDuration } from './srt-parser';
import { RenderJob_V2, ExternalAsset } from '../src/types';

// Final Cut Pro XML 结构
interface FCPXML {
    version: string;
    resources: {
        format: Format[];
        asset: Asset[];
    };
    library: {
        event: Event[];
    };
}

interface Format {
    id: string;
    frameDuration: string;
    width: number;
    height: number;
    colorSpace?: string;
}

interface Asset {
    id: string;
    name: string;
    src: string;
    duration: number;
    formatRef?: string;
    hasVideo?: boolean;
    hasAudio?: boolean;
}

interface Event {
    name: string;
    project?: Project[];
}

interface Project {
    name: string;
    rate: Rate;
    duration: number;
    formatRef: string;
    sequence: Sequence;
}

interface Rate {
    timebase: string;
   _nts?: string;
}

interface Sequence {
    formatRef: string;
    duration: number;
    rate: Rate;
    media?: {
        video?: Video[];
        audio?: Audio[];
    };
}

interface Video {
    formatRef: string;
    track?: Track[];
}

interface Audio {
    formatRef: string;
    track?: Track[];
}

interface Track {
    clip?: Clip[];
}

interface Clip {
    name: string;
    offset: number;
    duration: number;
    start: number;
    lane: number;
    ref?: string;
    src?: string;
}

// 项目路径管理
const getProjectRoot = (projectId: string): string => {
    const PROJECTS_BASE = process.env.PROJECTS_BASE || path.join(process.cwd(), 'Projects');
    return path.join(PROJECTS_BASE, projectId);
};

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * 生成唯一 ID
 * @param prefix ID 前缀
 * @returns 唯一 ID
 */
function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取视频文件时长（毫秒）
 * @param filePath 视频文件路径
 * @returns 时长（毫秒）
 */
async function getVideoDuration(filePath: string): Promise<number> {
    // 这里简化处理，实际应该使用 ffprobe 或类似工具
    // 暂时返回 5000 毫秒（5秒）作为默认值
    return 5000;
}

/**
 * 构建 Final Cut Pro XML
 * @param subtitles 字幕片段
 * @param brollFiles B-roll 文件列表
 * @param renderState 渲染状态
 * @param videoWidth 视频宽度
 * @param videoHeight 视频高度
 * @param frameRate 帧率
 * @returns XML 字符串
 */
async function buildFCPXML(
    subtitles: SubtitleSegment[],
    brollFiles: string[],
    renderState: {
        renderJobs?: RenderJob_V2[];
        externalAssets?: ExternalAsset[];
    },
    videoWidth: number = 1920,
    videoHeight: number = 1080,
    frameRate: number = 30
): Promise<string> {
    const fcpXML: FCPXML = {
        version: '1.11',
        resources: {
            format: [],
            asset: []
        },
        library: {
            event: []
        }
    };

    // 创建视频格式
    const formatId = generateId('fmt');
    const frameDuration = (1000 / frameRate).toFixed(3);

    fcpXML.resources.format.push({
        id: formatId,
        frameDuration,
        width: videoWidth,
        height: videoHeight,
        colorSpace: 'sRGB'
    });

    // 计算项目总时长
    let totalDuration = 0;
    if (subtitles.length > 0) {
        const lastSubtitle = subtitles[subtitles.length - 1];
        totalDuration = lastSubtitle.end;
    }

    // 创建 B-roll 素材资源
    const brollAssets: Asset[] = [];
    let currentTimeOffset = 0;

    // 按章节索引排序 B-roll 文件
    brollFiles.sort((a, b) => {
        const aMatch = a.match(/ch(\d+)/);
        const bMatch = b.match(/ch(\d+)/);
        const aIndex = aMatch ? parseInt(aMatch[1]) : 0;
        const bIndex = bMatch ? parseInt(bMatch[1]) : 0;
        return aIndex - bIndex;
    });

    for (const brollFile of brollFiles) {
        const filePath = path.join('file://localhost', brollFile);
        const assetId = generateId('asset');
        const duration = await getVideoDuration(brollFile);

        fcpXML.resources.asset.push({
            id: assetId,
            name: path.basename(brollFile),
            src: filePath,
            duration,
            formatRef: formatId,
            hasVideo: true,
            hasAudio: true
        });

        brollAssets.push({
            id: assetId,
            name: path.basename(brollFile),
            src: filePath,
            duration,
            formatRef: formatId,
            hasVideo: true,
            hasAudio: true
        });

        currentTimeOffset += duration;
    }

    // 创建项目和序列
    const projectId = generateId('project');
    const sequenceId = generateId('seq');
    const sequenceDuration = Math.max(totalDuration, currentTimeOffset);

    const project: Project = {
        name: 'Final Project',
        rate: {
            timebase: frameRate.toString()
        },
        duration: sequenceDuration,
        formatRef: formatId,
        sequence: {
            formatRef: formatId,
            duration: sequenceDuration,
            rate: {
                timebase: frameRate.toString()
            },
            media: {
                video: [{
                    formatRef: formatId,
                    track: [{
                        clip: brollAssets.map((asset, index) => {
                            const startTime = index > 0
                                ? brollAssets.slice(0, index).reduce((sum, a) => sum + a.duration, 0)
                                : 0;

                            return {
                                name: asset.name,
                                offset: startTime,
                                duration: asset.duration,
                                start: 0,
                                lane: 0,
                                ref: asset.id
                            };
                        })
                    }]
                }]
            }
        }
    };

    // 创建事件
    fcpXML.library.event.push({
        name: 'Director Master Project',
        project: [project]
    });

    // 构建 XML 字符串
    const xmlContent = buildXMLString(fcpXML);
    return xmlContent;
}

/**
 * 构建 XML 字符串
 * @param obj 对象
 * @returns XML 字符串
 */
function buildXMLString(obj: any, indent: string = ''): string {
    let xml = '';

    for (const key in obj) {
        const value = obj[key];

        if (Array.isArray(value)) {
            for (const item of value) {
                xml += `${indent}<${key}>\n`;
                xml += buildXMLString(item, indent + '  ');
                xml += `${indent}</${key}>\n`;
            }
        } else if (typeof value === 'object' && value !== null) {
            xml += `${indent}<${key}>\n`;
            xml += buildXMLString(value, indent + '  ');
            xml += `${indent}</${key}>\n`;
        } else {
            xml += `${indent}<${key}>${value}</${key}>\n`;
        }
    }

    return xml;
}

/**
 * 生成 Final Cut Pro XML 文件
 * @param projectId 项目 ID
 * @param videoWidth 视频宽度
 * @param videoHeight 视频高度
 * @param frameRate 帧率
 * @returns XML 文件路径和成功状态
 */
export async function generateFCPXML(
    projectId: string,
    videoWidth: number = 1920,
    videoHeight: number = 1080,
    frameRate: number = 30
): Promise<{ xmlPath: string; success: boolean }> {
    const projectRoot = getProjectRoot(projectId);

    // 1. 读取渲染状态
    const renderStatePath = path.join(projectRoot, '04_Visuals', 'phase3_render_state.json');
    let renderState: {
        renderJobs?: RenderJob_V2[];
        externalAssets?: ExternalAsset[];
        xmlGenerated?: boolean;
        xmlPath?: string;
    } = {};

    if (fs.existsSync(renderStatePath)) {
        try {
            const content = fs.readFileSync(renderStatePath, 'utf-8');
            renderState = JSON.parse(content);
        } catch (error) {
            console.error('Failed to read phase3_render_state.json:', error);
        }
    }

    // 2. 读取 SRT 字幕（如果存在）
    const srtPath = path.join(projectRoot, '03_Scripts', 'subtitles.srt');
    let subtitles: SubtitleSegment[] = [];

    if (fs.existsSync(srtPath)) {
        try {
            const srtContent = fs.readFileSync(srtPath, 'utf-8');
            subtitles = parseSRT(srtContent);
        } catch (error) {
            console.error('Failed to parse SRT:', error);
        }
    }

    // 3. 收集 B-roll 视频文件
    const brollDir = path.join(projectRoot, '06_Video_Broll');
    let brollFiles: string[] = [];

    if (fs.existsSync(brollDir)) {
        brollFiles = fs.readdirSync(brollDir)
            .filter(f => f.endsWith('.mp4') || f.endsWith('.mov'))
            .map(f => path.join(brollDir, f));
    }

    if (brollFiles.length === 0) {
        throw new Error('没有找到 B-roll 视频文件');
    }

    // 4. 构建 XML
    const xml = await buildFCPXML(
        subtitles,
        brollFiles,
        renderState,
        videoWidth,
        videoHeight,
        frameRate
    );

    // 5. 写入文件
    const timelineDir = path.join(projectRoot, '07_Timeline');
    ensureDir(timelineDir);
    const xmlPath = path.join(timelineDir, 'final_project.xml');

    fs.writeFileSync(xmlPath, xml);

    // 6. 更新渲染状态
    renderState.xmlGenerated = true;
    renderState.xmlPath = xmlPath;

    fs.writeFileSync(renderStatePath, JSON.stringify(renderState, null, 2));

    return { xmlPath, success: true };
}

/**
 * 检查是否已生成 XML 文件
 * @param projectId 项目 ID
 * @returns XML 文件路径（如果存在）
 */
export function getExistingXMLPath(projectId: string): string | null {
    const projectRoot = getProjectRoot(projectId);
    const xmlPath = path.join(projectRoot, '07_Timeline', 'final_project.xml');

    if (fs.existsSync(xmlPath)) {
        return xmlPath;
    }

    return null;
}
