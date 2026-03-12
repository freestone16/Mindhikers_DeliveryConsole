import type { CrucibleSnapshot } from './types';

export const SNAPSHOT_KEY = 'golden-crucible-workspace-v8';
const LEGACY_SNAPSHOT_KEYS = [
    'golden-crucible-workspace',
    'golden-crucible-workspace-v2',
    'golden-crucible-workspace-v3',
    'golden-crucible-workspace-v4',
    'golden-crucible-workspace-v5',
    'golden-crucible-workspace-v6',
    'golden-crucible-workspace-v7',
];

const purgeLegacySnapshots = () => {
    for (const key of LEGACY_SNAPSHOT_KEYS) {
        window.localStorage.removeItem(key);
    }
};

export const readCrucibleSnapshot = (): CrucibleSnapshot | null => {
    purgeLegacySnapshots();
    const snapshot = window.localStorage.getItem(SNAPSHOT_KEY);
    if (!snapshot) return null;

    try {
        const parsed = JSON.parse(snapshot) as Partial<CrucibleSnapshot> & {
            canvasAssets?: CrucibleSnapshot['presentables'];
            activeAssetId?: string;
            clarificationCards?: Array<{
                id?: string;
                prompt?: string;
                helper?: string;
                answer?: string;
            }>;
        };
        const presentables = parsed.presentables || parsed.canvasAssets || [];
        if (!presentables) {
            return null;
        }

        const hasInvalidMessage = (parsed.messages || []).some((message) => !message?.createdAt || !message?.id);
        if (hasInvalidMessage) {
            return null;
        }

        return {
            ...parsed,
            presentables,
            activePresentableId: parsed.activePresentableId || parsed.activeAssetId,
            roundAnchors: parsed.roundAnchors || (parsed.clarificationCards || []).map((card, index) => ({
                id: card.id || `legacy_anchor_${index + 1}`,
                title: card.prompt || `中屏焦点 ${index + 1}`,
                summary: card.helper || '历史中屏同步内容',
                content: card.answer || '',
            })),
            engineMode: parsed.engineMode || 'socratic_refinement',
        } as CrucibleSnapshot;
    } catch {
        return null;
    }
};

export const writeCrucibleSnapshot = (snapshot: CrucibleSnapshot) => {
    purgeLegacySnapshots();
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
};

export const clearCrucibleSnapshot = () => {
    purgeLegacySnapshots();
    window.localStorage.removeItem(SNAPSHOT_KEY);
};
