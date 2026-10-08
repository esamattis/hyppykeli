// @ts-check

export const RESPONSE_CACHE_PREFIX = "hyppykeli:response:v1:";
const DATABASE = "hyppykeli-api-cache";
const STORE = "responses";
const MAX_ENTRIES = 100;
// Estimate UTF-16 JSON size; browser storage overhead varies.
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_IDLE_MS = 7 * 24 * 60 * 60_000;
/** @type {Map<string, StoredResponseCacheEntry>} */
const memory = new Map();
/** @type {Promise<IDBDatabase> | undefined} */
let database;
let queue = Promise.resolve();
let warned = false;
function openDatabase() {
    return (database ??= new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE, { keyPath: "key" });
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () =>
            reject(new Error("API cache database blocked"));
        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => {
                db.close();
                database = undefined;
            };
            resolve(db);
        };
    }));
}

/** @param {IDBTransaction} transaction */
function completed(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(undefined);
        transaction.onabort = () =>
            reject(transaction.error ?? new Error("Cache transaction aborted"));
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Serialize reads and writes, including cancellation restoration. Storage
 * failures must never turn a successful API response into a failed request.
 * @template T
 * @param {() => Promise<T>} operation
 * @param {() => T} fallback
 * @returns {Promise<T>}
 */
function enqueue(operation, fallback) {
    const result = queue.then(operation).catch((error) => {
        if (!warned) {
            warned = true;
            console.warn(
                "[API cache] Storage unavailable; keeping an in-memory cache",
                { error },
            );
        }
        return fallback();
    });
    queue = result.then(() => {});
    return result;
}

/** @param {StoredResponseCacheEntry[]} records @param {number} now @param {string} newestKey */
function evictions(records, now, newestKey) {
    records.sort(
        (a, b) =>
            b.accessedAt - a.accessedAt ||
            Number(b.key === newestKey) - Number(a.key === newestKey),
    );
    let bytes = 0;
    let count = 0;
    return records.filter((record) => {
        if (now - record.accessedAt >= MAX_IDLE_MS || record.bytes > MAX_BYTES)
            return true;
        bytes += record.bytes;
        return ++count > MAX_ENTRIES || bytes > MAX_BYTES;
    });
}

/** @param {string} key @returns {Promise<CachedResponseEntry<unknown> | undefined>} */
export function readResponseCache(key) {
    return enqueue(
        async () => {
            if (memory.has(key)) return readMemory(key);
            const db = await openDatabase();
            const transaction = db.transaction(STORE, "readwrite");
            const done = completed(transaction);
            const store = transaction.objectStore(STORE);
            const request = store.get(key);
            /** @type {CachedResponseEntry<unknown> | undefined} */
            let entry;
            request.onsuccess = () => {
                const record =
                    /** @type {StoredResponseCacheEntry | undefined} */ (
                        request.result
                    );
                if (!record) return;
                const now = Date.now();
                if (now - record.accessedAt >= MAX_IDLE_MS) {
                    store.delete(key);
                } else {
                    entry = record.entry;
                    store.put({ ...record, accessedAt: now });
                }
            };
            await done;
            return entry;
        },
        () => readMemory(key),
    );
}

/** @param {string} key */
function readMemory(key) {
    const record = memory.get(key);
    if (!record) return;
    if (Date.now() - record.accessedAt >= MAX_IDLE_MS) {
        memory.delete(key);
        return;
    }
    record.accessedAt = Date.now();
    return structuredClone(record.entry);
}

/** @param {string} key @param {CachedResponseEntry<unknown>} entry */
export function saveResponseCache(key, entry) {
    // Snapshot now: callers may mutate an attempt before the write runs.
    const record = {
        key,
        entry: structuredClone(entry),
        accessedAt: Date.now(),
        bytes: JSON.stringify(entry).length * 2,
    };
    return enqueue(
        async () => {
            const db = await openDatabase();
            const transaction = db.transaction(STORE, "readwrite");
            const done = completed(transaction);
            const store = transaction.objectStore(STORE);
            store.put(record);
            const request = store.getAll();
            request.onsuccess = () => {
                for (const old of evictions(request.result, Date.now(), key))
                    store.delete(old.key);
            };
            await done;
            memory.delete(key);
        },
        () => {
            memory.set(key, record);
            for (const old of evictions([...memory.values()], Date.now(), key))
                memory.delete(old.key);
        },
    );
}

/** @param {string} key */
export function removeResponseCache(key) {
    return enqueue(
        async () => {
            memory.delete(key);
            const db = await openDatabase();
            const transaction = db.transaction(STORE, "readwrite");
            const done = completed(transaction);
            transaction.objectStore(STORE).delete(key);
            await done;
        },
        () => {
            memory.delete(key);
        },
    );
}

export function clearResponseCache() {
    return enqueue(
        async () => {
            memory.clear();
            const db = await openDatabase();
            const transaction = db.transaction(STORE, "readwrite");
            const done = completed(transaction);
            transaction.objectStore(STORE).clear();
            await done;
        },
        () => {
            memory.clear();
        },
    );
}
