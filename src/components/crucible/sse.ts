export interface ParsedSseEvent {
    event: string;
    data: string;
}

const normalizeBuffer = (buffer: string) => buffer.replace(/\r\n/g, '\n');

export const consumeSseBuffer = (
    buffer: string,
    onEvent: (event: ParsedSseEvent) => void
) => {
    const normalized = normalizeBuffer(buffer);
    const segments = normalized.split('\n\n');
    const remainder = normalized.endsWith('\n\n') ? '' : segments.pop() || '';

    for (const segment of segments) {
        const lines = segment
            .split('\n')
            .map((line) => line.trimEnd())
            .filter(Boolean);

        if (lines.length === 0) {
            continue;
        }

        let event = 'message';
        const dataLines: string[] = [];

        for (const line of lines) {
            if (line.startsWith(':')) {
                continue;
            }
            if (line.startsWith('event:')) {
                event = line.slice('event:'.length).trim() || 'message';
                continue;
            }
            if (line.startsWith('data:')) {
                dataLines.push(line.slice('data:'.length).trimStart());
            }
        }

        onEvent({
            event,
            data: dataLines.join('\n'),
        });
    }

    return remainder;
};

export const readSseStream = async (
    stream: ReadableStream<Uint8Array>,
    onEvent: (event: ParsedSseEvent) => void
) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        buffer = consumeSseBuffer(buffer, onEvent);
    }

    buffer += decoder.decode();
    if (buffer.trim().length > 0) {
        consumeSseBuffer(`${buffer}\n\n`, onEvent);
    }
};
