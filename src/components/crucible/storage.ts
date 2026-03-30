import type {
    CrucibleConversationDetail,
    CrucibleConversationSummary,
    CrucibleSnapshot,
    SaveCrucibleConversationPayload,
    UpdateCrucibleConversationPayload,
} from './types';
import { buildApiUrl } from '../../config/runtime';

export const SNAPSHOT_KEY = 'golden-crucible-workspace-v9';
const LEGACY_SNAPSHOT_KEYS = [
    'golden-crucible-workspace',
    'golden-crucible-workspace-v2',
    'golden-crucible-workspace-v3',
    'golden-crucible-workspace-v4',
    'golden-crucible-workspace-v5',
    'golden-crucible-workspace-v6',
    'golden-crucible-workspace-v7',
    'golden-crucible-workspace-v8',
];

const getScopedSnapshotKey = (workspaceId?: string | null) => (
    workspaceId?.trim() ? `${SNAPSHOT_KEY}:${workspaceId.trim()}` : SNAPSHOT_KEY
);

const purgeLegacySnapshots = () => {
    for (const key of LEGACY_SNAPSHOT_KEYS) {
        window.localStorage.removeItem(key);
    }
};

const normalizeCrucibleSnapshot = (snapshot: string | null): CrucibleSnapshot | null => {
    if (!snapshot) {
        return null;
    }
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

const normalizeSnapshotPayload = (payload: unknown): CrucibleSnapshot | null => {
    if (!payload) {
        return null;
    }

    const candidate = typeof payload === 'object' && payload !== null && 'snapshot' in payload
        ? (payload as { snapshot?: CrucibleSnapshot }).snapshot
        : payload;

    return normalizeCrucibleSnapshot(JSON.stringify(candidate));
};

export const readCrucibleSnapshot = (): CrucibleSnapshot | null => {
    const key = getScopedSnapshotKey();
    purgeLegacySnapshots();
    return normalizeCrucibleSnapshot(window.localStorage.getItem(key));
};

export const getCrucibleSnapshotStorageKey = (workspaceId?: string | null) => getScopedSnapshotKey(workspaceId);

export const readScopedCrucibleSnapshot = (workspaceId?: string | null): CrucibleSnapshot | null => {
    const currentKey = getScopedSnapshotKey(workspaceId);
    purgeLegacySnapshots();
    const scopedSnapshot = normalizeCrucibleSnapshot(window.localStorage.getItem(currentKey));
    if (scopedSnapshot) {
        return scopedSnapshot;
    }

    if (workspaceId?.trim()) {
        return normalizeCrucibleSnapshot(window.localStorage.getItem(SNAPSHOT_KEY));
    }

    return null;
};

export const writeCrucibleSnapshot = (snapshot: CrucibleSnapshot, options?: { workspaceId?: string | null }) => {
    purgeLegacySnapshots();
    window.localStorage.setItem(getScopedSnapshotKey(options?.workspaceId), JSON.stringify(snapshot));
};

export const clearCrucibleSnapshot = (options?: { workspaceId?: string | null }) => {
    purgeLegacySnapshots();
    window.localStorage.removeItem(getScopedSnapshotKey(options?.workspaceId));
};

export const readPersistedCrucibleSnapshot = async (options?: { workspaceId?: string | null }): Promise<CrucibleSnapshot | null> => {
    const localSnapshot = readScopedCrucibleSnapshot(options?.workspaceId);

    try {
        const activeResponse = await fetch(buildApiUrl('/api/crucible/conversations/active'), {
            credentials: 'include',
        });

        if (activeResponse.ok) {
            const activePayload = normalizeSnapshotPayload(await activeResponse.json());
            if (activePayload) {
                writeCrucibleSnapshot(activePayload, options);
                return activePayload;
            }
        } else if (activeResponse.status !== 404) {
            throw new Error(`conversation read failed: ${activeResponse.status}`);
        }

        const autosaveResponse = await fetch(buildApiUrl('/api/crucible/autosave'), {
            credentials: 'include',
        });

        if (autosaveResponse.status === 404) {
            return localSnapshot;
        }

        if (!autosaveResponse.ok) {
            throw new Error(`autosave read failed: ${autosaveResponse.status}`);
        }

        const remoteSnapshot = normalizeCrucibleSnapshot(await autosaveResponse.text());
        if (remoteSnapshot) {
            writeCrucibleSnapshot(remoteSnapshot, options);
            return remoteSnapshot;
        }
    } catch (error) {
        console.warn('[CrucibleStorage] Failed to read persisted snapshot:', error);
    }

    return localSnapshot;
};

export const persistCrucibleSnapshot = async (
    snapshot: CrucibleSnapshot,
    options?: { workspaceId?: string | null },
) => {
    writeCrucibleSnapshot(snapshot, options);

    try {
        await fetch(buildApiUrl('/api/crucible/autosave'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(snapshot),
        });
    } catch (error) {
        console.warn('[CrucibleStorage] Failed to persist snapshot:', error);
    }
};

export const clearPersistedCrucibleSnapshot = async (options?: { workspaceId?: string | null }) => {
    clearCrucibleSnapshot(options);

    try {
        await fetch(buildApiUrl('/api/crucible/autosave'), {
            method: 'DELETE',
            credentials: 'include',
        });
    } catch (error) {
        console.warn('[CrucibleStorage] Failed to clear persisted snapshot:', error);
    }
};

export const listPersistedCrucibleConversations = async (): Promise<CrucibleConversationSummary[]> => {
    const response = await fetch(buildApiUrl('/api/crucible/conversations'), {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`conversation list failed: ${response.status}`);
    }

    const payload = await response.json() as { items?: CrucibleConversationSummary[] };
    return Array.isArray(payload.items) ? payload.items : [];
};

export const activatePersistedCrucibleConversation = async (conversationId: string): Promise<CrucibleConversationDetail> => {
    const response = await fetch(buildApiUrl(`/api/crucible/conversations/${encodeURIComponent(conversationId)}/activate`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        throw new Error(`conversation activate failed: ${response.status}`);
    }

    return await response.json() as CrucibleConversationDetail;
};

export const getPersistedCrucibleConversationDetail = async (conversationId: string): Promise<CrucibleConversationDetail> => {
    const response = await fetch(buildApiUrl(`/api/crucible/conversations/${encodeURIComponent(conversationId)}`), {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`conversation detail failed: ${response.status}`);
    }

    return await response.json() as CrucibleConversationDetail;
};

export const updatePersistedCrucibleConversation = async (
    conversationId: string,
    payload: UpdateCrucibleConversationPayload,
): Promise<CrucibleConversationDetail> => {
    const response = await fetch(buildApiUrl(`/api/crucible/conversations/${encodeURIComponent(conversationId)}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`conversation update failed: ${response.status}`);
    }

    return await response.json() as CrucibleConversationDetail;
};

export const savePersistedCrucibleConversation = async (
    payload: SaveCrucibleConversationPayload,
): Promise<CrucibleConversationDetail> => {
    const response = await fetch(buildApiUrl('/api/crucible/conversations/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`conversation save failed: ${response.status}`);
    }

    return await response.json() as CrucibleConversationDetail;
};

export const exportPersistedCrucibleArtifacts = async (
    conversationId: string,
    options?: {
        format?: string;
    },
) => {
    const format = options?.format?.trim() || 'bundle-json';
    const response = await fetch(buildApiUrl(
        `/api/crucible/conversations/${encodeURIComponent(conversationId)}/artifacts/export?format=${encodeURIComponent(format)}`
    ), {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`artifact export failed: ${response.status}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
    const filename = filenameMatch?.[1] || `${conversationId}-artifacts.json`;

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
};
