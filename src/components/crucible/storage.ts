import type { CrucibleSnapshot } from './types';

export const SNAPSHOT_KEY = 'golden-crucible-workspace-v4';
const LEGACY_SNAPSHOT_KEYS = [
    'golden-crucible-workspace',
    'golden-crucible-workspace-v2',
    'golden-crucible-workspace-v3',
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
        const parsed = JSON.parse(snapshot) as Partial<CrucibleSnapshot>;
        if (!parsed.canvasAssets) {
            return null;
        }

        const hasInvalidMessage = (parsed.messages || []).some((message) => !message?.createdAt || !message?.id);
        if (hasInvalidMessage) {
            return null;
        }

        return parsed as CrucibleSnapshot;
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
