import { describe, expect, it, vi } from 'vitest';
import { consumeSseBuffer } from './sse';

describe('crucible sse helpers', () => {
    it('parses complete SSE frames and keeps trailing remainder', () => {
        const events: Array<{ event: string; data: string }> = [];
        const remainder = consumeSseBuffer(
            [
                'event: meta',
                'data: {"roundIndex":1}',
                '',
                'event: turn',
                'data: {"source":"socrates"}',
                '',
                'event: done',
                'data: {"ok":true}',
            ].join('\n'),
            (event) => events.push(event)
        );

        expect(events).toEqual([
            { event: 'meta', data: '{"roundIndex":1}' },
            { event: 'turn', data: '{"source":"socrates"}' },
        ]);
        expect(remainder).toBe('event: done\ndata: {"ok":true}');
    });

    it('joins multiple data lines into one payload', () => {
        const handler = vi.fn();

        const remainder = consumeSseBuffer(
            [
                'event: meta',
                'data: {"line":1,',
                'data: "line":2}',
                '',
                '',
            ].join('\n'),
            handler
        );

        expect(handler).toHaveBeenCalledWith({
            event: 'meta',
            data: '{"line":1,\n"line":2}',
        });
        expect(remainder).toBe('');
    });
});
