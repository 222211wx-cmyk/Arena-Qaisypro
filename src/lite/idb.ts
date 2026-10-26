/**
 * Minimal promise-wrapped IndexedDB helper for account-scoped Lite storage.
 * Keeps the core bundle tiny — no external IDB library.
 */

export function openDb(name: string, store: string, keyPath: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(store)) {
        req.result.createObjectStore(store, { keyPath });
      }
    };
    req.onerror = () => reject(req.error ?? new Error("Unable to open storage."));
    req.onsuccess = () => resolve(req.result);
  });
}

export async function idbPut<T>(db: IDBDatabase, store: string, value: T): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value as unknown as Record<string, unknown>);
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error ?? new Error("Write failed."));
  });
}

export async function idbGet<T>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error ?? new Error("Read failed."));
  });
}

export async function idbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error("Read failed."));
  });
}

export async function idbDelete(db: IDBDatabase, store: string, key: IDBValidKey): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error ?? new Error("Delete failed."));
  });
}

export function deleteDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
