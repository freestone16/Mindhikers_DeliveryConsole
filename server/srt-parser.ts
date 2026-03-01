/**
 * SRT 字幕解析器
 * 用于解析 SRT 格式字幕，提取时间码和文本
 */

import { parse as parseSRTTime, toSeconds } from 'subtitle';

// 字幕片段接口
export interface SubtitleSegment {
    id: number;
    start: number; // 毫秒
    end: number; // 毫秒
    text: string;
}

// 时间码接口
export interface TimeCode {
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
}

/**
 * 解析 SRT 格式字幕
 * @param srtContent SRT 文件内容
 * @returns 字幕片段数组
 */
export function parseSRT(srtContent: string): SubtitleSegment[] {
    try {
        // 使用 subtitle 库解析
        const subtitles = parseSRTTime(srtContent);

        return subtitles.map((sub, index) => ({
            id: index + 1,
            start: sub.startTime,
            end: sub.endTime,
            text: sub.text.trim()
        }));
    } catch (error) {
        console.error('Failed to parse SRT:', error);
        throw new Error(`SRT 解析失败: ${error}`);
    }
}

/**
 * 时间码格式转换为毫秒
 * @param timecode 时间码字符串，格式: HH:MM:SS,mmm
 * @returns 毫秒数
 */
export function timecodeToMs(timecode: string): number {
    const parts = timecode.trim().split(':');
    if (parts.length !== 3) {
        throw new Error(`Invalid timecode format: ${timecode}`);
    }

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const [seconds, milliseconds] = parts[2].split(',').map(p => parseInt(p, 10));

    return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
}

/**
 * 毫秒转换为时间码格式
 * @param ms 毫秒数
 * @returns 时间码字符串，格式: HH:MM:SS,mmm
 */
export function msToTimecode(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    const pad = (num: number, size: number) => num.toString().padStart(size, '0');

    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(milliseconds, 3)}`;
}

/**
 * 格式化毫秒为可读时间
 * @param ms 毫秒数
 * @returns 可读时间字符串，格式: HH:MM:SS
 */
export function formatDuration(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * 查找指定时间点的字幕
 * @param segments 字幕片段数组
 * @param timestamp 时间戳（毫秒）
 * @returns 匹配的字幕片段，如果没有则返回 null
 */
export function findSegmentAtTime(segments: SubtitleSegment[], timestamp: number): SubtitleSegment | null {
    return segments.find(seg => timestamp >= seg.start && timestamp <= seg.end) || null;
}

/**
 * 计算两个时间点之间的字幕总时长
 * @param segments 字幕片段数组
 * @param startTime 开始时间（毫秒）
 * @param endTime 结束时间（毫秒）
 * @returns 总时长（毫秒）
 */
export function calculateSubtitleDuration(
    segments: SubtitleSegment[],
    startTime: number,
    endTime: number
): number {
    let totalDuration = 0;

    for (const seg of segments) {
        // 计算字幕片段与时间范围的交集
        const segmentStart = Math.max(seg.start, startTime);
        const segmentEnd = Math.min(seg.end, endTime);

        if (segmentEnd > segmentStart) {
            totalDuration += segmentEnd - segmentStart;
        }
    }

    return totalDuration;
}

/**
 * 提取时间范围内的字幕
 * @param segments 字幕片段数组
 * @param startTime 开始时间（毫秒）
 * @param endTime 结束时间（毫秒）
 * @returns 时间范围内的字幕片段
 */
export function extractSegmentsInRange(
    segments: SubtitleSegment[],
    startTime: number,
    endTime: number
): SubtitleSegment[] {
    return segments.filter(seg => {
        return !(seg.end < startTime || seg.start > endTime);
    });
}
