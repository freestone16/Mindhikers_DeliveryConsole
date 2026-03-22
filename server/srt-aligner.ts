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

export function compileSRTForLLM(segments: SRTSegment[]): string {
    return segments.map(s => `[${s.startTime} -> ${s.endTime}] ${s.text}`).join('\n');
}

function timeToFrames(timeStr: string, fps = 30): number {
    const match = timeStr.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!match) return 0;

    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const s = parseInt(match[3], 10);
    const ms = parseInt(match[4], 10);

    const seconds = h * 3600 + m * 60 + s + ms / 1000;
    return Math.round(seconds * fps);
}

/** Find B-roll video file in 06_Video_Broll/ by brollId.
 *  Tries exact match first, then partial match (brollId contained in filename). */
function findBrollFile(brollId: string, projectRoot: string): string | null {
    const brollDir = path.join(projectRoot, '06_Video_Broll');
    if (!fs.existsSync(brollDir)) return null;

    // Exact match
    for (const ext of ['.mp4', '.mov']) {
        const exact = path.join(brollDir, `${brollId}${ext}`);
        if (fs.existsSync(exact)) return exact;
    }

    // Partial match: filename contains brollId
    try {
        const files = fs.readdirSync(brollDir);
        const match = files.find(f =>
            (f.endsWith('.mp4') || f.endsWith('.mov')) && f.includes(brollId)
        );
        if (match) return path.join(brollDir, match);
    } catch { /* ignore read errors */ }

    return null;
}

export function generateFCPXML(alignments: AlignResult[], projectRoot: string): string {
    const fps = 30;
    const width = 1920;
    const height = 1080;

    let clipItemsXml = '';
    let maxEndFrame = 0;

    alignments.forEach((align, index) => {
        const videoPath = findBrollFile(align.brollId, projectRoot);

        if (!videoPath) {
            console.warn(`[XML] B-roll file not found for id="${align.brollId}" (${align.brollName}), skipping`);
            return;
        }

        const fileUrl = `file://localhost${videoPath.replace(/\\/g, '/')}`;
        const startF = timeToFrames(align.startTime, fps);
        const endF   = timeToFrames(align.endTime,   fps);
        // Guard: duration must be at least 1 frame
        const duration = Math.max(endF - startF, 1);
        maxEndFrame = Math.max(maxEndFrame, endF);

        clipItemsXml += `
                <clipitem id="clip-${index}">
                    <name>${align.brollName || align.brollId}</name>
                    <duration>${duration}</duration>
                    <rate>
                        <ntsc>FALSE</ntsc>
                        <timebase>${fps}</timebase>
                    </rate>
                    <start>${startF}</start>
                    <end>${endF}</end>
                    <in>0</in>
                    <out>${duration}</out>
                    <file id="asset-${index}">
                        <name>${path.basename(videoPath)}</name>
                        <pathurl>${fileUrl}</pathurl>
                        <rate>
                            <ntsc>FALSE</ntsc>
                            <timebase>${fps}</timebase>
                        </rate>
                        <media>
                            <video/>
                        </media>
                    </file>
                </clipitem>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
    <project>
        <name>MindHikers B-Roll Sequence</name>
        <children>
            <sequence id="sequence-1">
                <name>B-Roll Timeline</name>
                <duration>${maxEndFrame}</duration>
                <rate>
                    <timebase>${fps}</timebase>
                    <ntsc>FALSE</ntsc>
                </rate>
                <media>
                    <video>
                        <format>
                            <samplecharacteristics>
                                <width>${width}</width>
                                <height>${height}</height>
                                <rate>
                                    <timebase>${fps}</timebase>
                                    <ntsc>FALSE</ntsc>
                                </rate>
                            </samplecharacteristics>
                        </format>
                        <track>${clipItemsXml}
                        </track>
                    </video>
                </media>
            </sequence>
        </children>
    </project>
</xmeml>`.trim();
}

export function generateJianyingXML(_alignments: AlignResult[], _projectRoot: string): string {
    // 剪映草稿格式未实现，暂不支持
    return JSON.stringify({ status: 'not_implemented', format: 'jianying' });
}
