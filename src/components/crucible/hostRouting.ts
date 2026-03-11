import type { ChatMessage, ChatMessageClassification, HostRoutedAsset } from '../../types';

const nowId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const CRUCIBLE_SPEAKERS = [
    {
        match: /^(?:\*\*)?\s*老张\s*[:：](?:\*\*)?\s*/u,
        meta: { authorId: 'laozhang', authorName: '老张', authorRole: '拆概念' },
    },
    {
        match: /^(?:\*\*)?\s*老卢\s*[:：](?:\*\*)?\s*/u,
        meta: { authorId: 'laolu', authorName: '老卢', authorRole: '立结构' },
    },
] as const;

const normalize = (content: string) => content.trim();

const parseCrucibleSpeaker = (content: string) => {
    const text = content.trim();
    for (const speaker of CRUCIBLE_SPEAKERS) {
        if (speaker.match.test(text)) {
            const stripped = text.replace(speaker.match, '').trim();
            return {
                content: stripped || text,
                meta: speaker.meta,
            };
        }
    }

    return {
        content: text,
        meta: null,
    };
};

export function classifyAssistantMessage(content: string): ChatMessageClassification {
    const text = normalize(content);
    const lines = text.split('\n').filter(Boolean);
    const visualPattern = /(remotion|镜头|分镜|结构图|脑图|流程图|时间线|可视化|视觉稿|动画|画面)/i;
    const quotePattern = /(金句|一句话|slogan|标题句|海报句|“.+”|「.+」)/i;
    const structuralPattern = /[├└│─]{2,}|^\s*[-*+]\s+/m;

    if (quotePattern.test(text) && text.length <= 180) {
        return 'quote';
    }

    if (structuralPattern.test(text) || (visualPattern.test(text) && (lines.length >= 4 || text.length >= 140))) {
        return 'asset';
    }

    if ((lines.length >= 4 && text.length >= 180) || text.length >= 360) {
        return 'reference';
    }

    return 'dialogue';
}

export function deriveTopicTitle(content: string): string | null {
    const text = normalize(content)
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/[“”"'`]/g, '');
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const candidate = lines.find((line) => line.length >= 8 && line.length <= 34)
        || text.split(/[。！？!?\n]/).map((part) => part.trim()).find((part) => part.length >= 8 && part.length <= 34);

    if (!candidate) {
        return null;
    }

    return candidate
        .replace(/^(议题|命题|问题|主题)[:：]\s*/, '')
        .replace(/^(关于|围绕)/, '')
        .trim();
}

export function enrichMessageMeta(message: ChatMessage): ChatMessage {
    if (message.role !== 'assistant' || !message.content.trim()) {
        return message;
    }

    const parsedSpeaker = parseCrucibleSpeaker(message.content);
    const classification = classifyAssistantMessage(parsedSpeaker.content);
    return {
        ...message,
        content: parsedSpeaker.content,
        meta: {
            ...message.meta,
            ...parsedSpeaker.meta,
            classification,
            summary: summarizeContent(parsedSpeaker.content),
        },
    };
}

export function toHostRoutedAsset(message: ChatMessage): HostRoutedAsset | null {
    const classification = message.meta?.classification;
    if (!classification || classification === 'dialogue') {
        return null;
    }

    const content = normalize(message.content);
    const summary = message.meta?.summary || summarizeContent(content);

    if (classification === 'quote') {
        return {
            id: nowId('quote'),
            type: 'quote',
            title: '新金句',
            subtitle: '',
            content,
            summary,
        };
    }

    if (classification === 'reference') {
        return {
            id: nowId('reference'),
            type: 'reference',
            title: '参考材料 - 议题澄清',
            subtitle: '',
            content,
            summary,
        };
    }

    const isRemotion = /(remotion|动画|镜头|画面)/i.test(content);

    return {
        id: nowId('asset'),
        type: isRemotion ? 'remotion' : 'mindmap',
        title: isRemotion ? '影像提示' : '结构资产',
        subtitle: '',
        content,
        summary,
    };
}

export function summarizeContent(content: string): string {
    const singleLine = normalize(content).replace(/\s+/g, ' ');
    if (singleLine.length <= 42) {
        return singleLine;
    }
    return `${singleLine.slice(0, 42)}...`;
}
