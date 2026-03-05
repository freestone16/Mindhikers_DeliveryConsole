import fs from 'fs';
import path from 'path';

export interface SRTSegment {
    id: number;
    startTime: string; // HH:MM:SS,mmm
    endTime: string;
    text: string;
}

export interface BRollCandidate {
    brollId: string;
    brollName: string;
    keySentence: string;
}

export interface AlignResult {
    brollId: string;
    brollName: string;
    keySentence: string;
    matchedText: string;
    startTime: string;
    endTime: string;
    duration?: string;
}

export function parseSRT(content: string): SRTSegment[] {
    const segments: SRTSegment[] = [];
    // normalize line endings
    const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = text.split('\n\n');

    for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            const id = parseInt(lines[0], 10);
            const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
            const textContent = lines.slice(2).join(' ').trim();

            if (timeMatch && !isNaN(id)) {
                segments.push({
                    id,
                    startTime: timeMatch[1],
                    endTime: timeMatch[2],
                    text: textContent
                });
            }
        }
    }

    return segments;
}

// 供 LLM 比照时使用，我们可以只把所有文本合并成一个长字符串，或者每句话带上时间戳发给 LLM
export function compileSRTForLLM(segments: SRTSegment[]): string {
    return segments.map(s => `[${s.startTime} -> ${s.endTime}] ${s.text}`).join('\n');
}

function timeToFrames(timeStr: string, fps = 30): number {
    // 00:00:01,000
    const match = timeStr.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!match) return 0;

    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const s = parseInt(match[3], 10);
    const ms = parseInt(match[4], 10);

    const seconds = h * 3600 + m * 60 + s + ms / 1000;
    return Math.round(seconds * fps);
}

function framesToTime(frames: number, fps = 30): string {
    const totalSeconds = frames / fps;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    const framesRemain = Math.round((totalSeconds - Math.floor(totalSeconds)) * fps);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${framesRemain.toString().padStart(2, '0')}`;
}

export function generateFCPXML(alignments: AlignResult[], projectRoot: string): string {
    // A simplistic FCPXML generator for Premiere
    // Note: True generation needs proper asset paths, frame rates, sequence setups.
    const formatId = 'r1';
    const width = 1080;
    const height = 1920;
    const fpsString = '30000/1000'; // 30 fps

    let assetsXml = '';
    let clipItemsXml = '';
    let offset = 0;

    alignments.forEach((align, index) => {
        // We assume the final files are inside 04_Visuals/{brollId}.mp4
        let videoFile = path.join(projectRoot, '04_Visuals', `${align.brollId}.mp4`);

        // In actual implementation we might need absolute URL format
        const fileUrl = `file://localhost${videoFile.replace(/\\/g, '/')}`;

        const startF = timeToFrames(align.startTime);
        const endF = timeToFrames(align.endTime);
        const duration = endF - startF > 0 ? endF - startF : 90; // Fallback to 3 seconds if parsing fails

        assetsXml += `
        <asset id="asset-${index}" name="${align.brollId}.mp4" src="${fileUrl}">
            <format>
                <videoFormat>
                    <width>${width}</width>
                    <height>${height}</height>
                    <frameRate>${fpsString}</frameRate>
                </videoFormat>
            </format>
        </asset>`;

        clipItemsXml += `
                <clipitem id="clip-${index}">
                    <name>${align.brollId}</name>
                    <duration>${duration}</duration>
                    <rate>
                        <ntsc>FALSE</ntsc>
                        <timebase>30</timebase>
                    </rate>
                    <start>0</start>
                    <end>${duration}</end>
                    <in>0</in>
                    <out>${duration}</out>
                    <file id="asset-${index}"/>
                </clipitem>`;

        offset += duration;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
    <project>
        <name>MindHikers B-Roll Sequence</name>
        <children>
            <sequence id="sequence-1">
                <name>Main Sequence</name>
                <duration>${offset}</duration>
                <rate>
                    <timebase>30</timebase>
                    <ntsc>FALSE</ntsc>
                </rate>
                <media>
                    <video>
                        <format>
                            <samplecharacteristics>
                                <width>${width}</width>
                                <height>${height}</height>
                            </samplecharacteristics>
                        </format>
                        <track>
${clipItemsXml}
                        </track>
                    </video>
                </media>
            </sequence>
        </children>
    </project>
</xmeml>`;

    return xml.trim();
}

export function generateJianyingXML(alignments: AlignResult[], projectRoot: string): string {
    // A stub for Jianying Draft JSON format since it's JSON actually inside its structure.
    return '{"status": "Jianying format not fully implemented in stub, will be FCPXML."}';
}
