// Local bookmark ("save") persistence for clips, scoped per account + clip.
// There is NO backend saved-clips endpoint, so saves are stored in
// localStorage on this device only. The UI must label this explicitly.

const STORAGE_PREFIX = "gdna-arena.saved-clips";
const ANON_KEY = "anon";

function storageKey(accountId: number | string | null | undefined): string {
  const account = accountId === null || accountId === undefined ? ANON_KEY : String(accountId);
  return `${STORAGE_PREFIX}.${account}`;
}

function safeParse(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(id => Number.isSafeInteger(id)) : [];
  } catch {
    return [];
  }
}

function readSet(accountId: number | string | null | undefined): Set<number> {
  try {
    return new Set(safeParse(window.localStorage.getItem(storageKey(accountId))));
  } catch {
    // localStorage can throw (private mode / disabled). Degrade to no saves.
    return new Set();
  }
}

function writeSet(accountId: number | string | null | undefined, set: Set<number>): boolean {
  try {
    window.localStorage.setItem(storageKey(accountId), JSON.stringify([...set]));
    return true;
  } catch {
    return false;
  }
}

export function isClipSaved(accountId: number | string | null | undefined, clipId: number): boolean {
  return readSet(accountId).has(clipId);
}

/** Toggles saved state. Returns the new saved value, or null if storage is unavailable. */
export function toggleClipSaved(
  accountId: number | string | null | undefined,
  clipId: number,
): boolean | null {
  const set = readSet(accountId);
  if (set.has(clipId)) set.delete(clipId);
  else set.add(clipId);
  const persisted = writeSet(accountId, set);
  return persisted ? set.has(clipId) : null;
}
