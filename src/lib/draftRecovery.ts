// Tab-scoped scratch state, never an authorization source or a server receipt.
export const DRAFT_RECOVERY_PREFIX = 'ace:draft:v1:';
export const DRAFT_RECOVERY_TTL = 24 * 60 * 60 * 1000;
const MAX_BYTES = 500_000;

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function draftRecoveryKey(ownerId: string, scope: string) {
  return `${DRAFT_RECOVERY_PREFIX}${encodeURIComponent(ownerId)}:${encodeURIComponent(scope)}`;
}
export function readDraftRecovery(storage: DraftStorage, ownerId: string, scope: string, now = Date.now()): string | null {
  try {
    const raw = storage.getItem(draftRecoveryKey(ownerId, scope));
    if (!raw || raw.length > MAX_BYTES) return null;
    const item = JSON.parse(raw);
    if (item.version !== 1 || item.ownerId !== ownerId || item.scope !== scope
      || !Number.isFinite(item.savedAt) || item.savedAt > now || now - item.savedAt >= DRAFT_RECOVERY_TTL
      || typeof item.payload !== 'string') return null;
    return item.payload;
  } catch { return null; }
}
export function writeDraftRecovery(storage: DraftStorage, ownerId: string, scope: string, value: unknown, now = Date.now()) {
  try {
    const raw = JSON.stringify({ version: 1, ownerId, scope, savedAt: now, payload: JSON.stringify(value) });
    if (raw.length > MAX_BYTES) return false;
    storage.setItem(draftRecoveryKey(ownerId, scope), raw);
    return true;
  } catch { return false; }
}
export function removeDraftRecovery(storage: DraftStorage, ownerId: string, scope: string) {
  try { storage.removeItem(draftRecoveryKey(ownerId, scope)); return true; } catch { return false; }
}
export function clearDraftRecovery(storage: Storage) {
  try {
    for (let index = storage.length - 1; index >= 0; index--) {
      const key = storage.key(index);
      if (key?.startsWith(DRAFT_RECOVERY_PREFIX)) storage.removeItem(key);
    }
  } catch { /* Disabled storage must not prevent sign-out. */ }
}
