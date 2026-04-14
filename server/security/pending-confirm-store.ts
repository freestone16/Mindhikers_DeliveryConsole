import crypto from 'crypto';

interface PendingConfirm {
  confirmId: string;
  actionName: string;
  actionArgs: Record<string, unknown>;
  expertId: string;
  projectId: string;
  createdAt: number;
  consumed: boolean;
}

const store = new Map<string, PendingConfirm>();
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export function createPendingConfirm(params: {
  actionName: string;
  actionArgs: Record<string, unknown>;
  expertId: string;
  projectId: string;
}): string {
  const confirmId = crypto.randomUUID();
  store.set(confirmId, {
    confirmId,
    ...params,
    createdAt: Date.now(),
    consumed: false,
  });
  return confirmId;
}

export function consumePendingConfirm(confirmId: string): PendingConfirm | null {
  const entry = store.get(confirmId);
  if (!entry) return null;
  if (entry.consumed) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(confirmId);
    return null;
  }
  entry.consumed = true;
  store.delete(confirmId);
  return entry;
}

// Periodic GC: expire stale entries every 5 minutes
const GC_INTERVAL = 5 * 60 * 1000;
const gcTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (now - entry.createdAt > TTL_MS || entry.consumed) {
      store.delete(id);
    }
  }
}, GC_INTERVAL);
gcTimer.unref();
