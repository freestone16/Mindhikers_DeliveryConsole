import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface WhisperSegment {
    id: number;
    start: number;
    end: number;
    text: string;
    confidence: number;
}

export interface WhisperResult {
    segments: WhisperSegment[];
    language: string;
    duration: number;
}

export async function transcribeAudio(audioPath: string): Promise<WhisperResult> {
    try {
        return await transcribeLocal(audioPath);
    } catch (e) {
        console.warn('Local whisper failed, falling back to API:', e);
        return await transcribeAPI(audioPath);
    }
}

async function transcribeLocal(audioPath: string): Promise<WhisperResult> {
    const wavPath = audioPath.replace(/\.[^.]+$/, '.wav');
    
    await new Promise<void>((resolve, reject) => {
        const p = spawn('ffmpeg', [
            '-y', '-i', audioPath,
            '-ar', '16000',
            '-ac', '1',
            '-f', 'wav',
            wavPath
        ]);
        p.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg exit ${code}`)));
        p.stderr.on('data', d => console.error('[FFmpeg WAV]', d.toString().trim()));
    });
    
    const modelPath = process.env.WHISPER_MODEL_PATH || '/usr/local/share/whisper/models/ggml-medium.bin';
    
    return new Promise((resolve, reject) => {
        const args = [
            '-m', modelPath,
            '-f', wavPath,
            '-l', 'zh',
            '-oj',
            '--threads', '4'
        ];
        
        const p = spawn('whisper-cpp', args);
        let output = '';
        
        p.stdout.on('data', d => output += d.toString());
        p.stderr.on('data', d => console.error('[Whisper]', d.toString().trim()));
        
        p.on('close', code => {
            if (code !== 0) {
                return reject(new Error(`Whisper exit ${code}`));
            }
            
            try {
                const result = JSON.parse(output);
                const segments: WhisperSegment[] = result.transcription?.map((seg: any, i: number) => ({
                    id: i,
                    start: seg.timestamps?.from_ms ? seg.timestamps.from_ms / 1000 : 0,
                    end: seg.timestamps?.to_ms ? seg.timestamps.to_ms / 1000 : 0,
                    text: (seg.text || '').trim(),
                    confidence: seg.confidence || 0.9,
                })) || [];
                
                const duration = segments.reduce((max, s) => Math.max(max, s.end), 0);
                
                resolve({
                    segments,
                    language: result.result?.language || 'zh',
                    duration
                });
            } catch (e) {
                reject(new Error('Failed to parse whisper output'));
            }
        });
    });
}

async function transcribeAPI(audioPath: string): Promise<WhisperResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured for Whisper API');
    }
    
    const fileBuffer = fs.readFileSync(audioPath);
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), path.basename(audioPath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'zh');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData,
    });
    
    if (!response.ok) {
        throw new Error(`Whisper API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
        segments: (data.segments || []).map((seg: any, i: number) => ({
            id: i,
            start: seg.start,
            end: seg.end,
            text: seg.text,
            confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.9,
        })),
        language: data.language || 'zh',
        duration: data.duration || 0,
    };
}

export function segmentsToSRT(segments: WhisperSegment[]): string {
    return segments.map((seg, i) => {
        const formatTime = (s: number) => {
            const hours = Math.floor(s / 3600);
            const mins = Math.floor((s % 3600) / 60);
            const secs = Math.floor(s % 60);
            const ms = Math.floor((s % 1) * 1000);
            return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
        };
        return `${i + 1}\n${formatTime(seg.start)} --> ${formatTime(seg.end)}\n${seg.text}\n`;
    }).join('\n');
}
