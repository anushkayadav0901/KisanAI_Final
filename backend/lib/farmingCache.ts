export interface CacheEntry<T = unknown> {
    value: T;
    expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function cacheGet<T = unknown>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
    }
    return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlSeconds: number = 1800): void {
    store.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });
}

export function cacheInvalidate(keyOrPrefix: string): void {
    if (store.has(keyOrPrefix)) {
        store.delete(keyOrPrefix);
        return;
    }
    for (const k of store.keys()) {
        if (k.startsWith(keyOrPrefix)) store.delete(k);
    }
}

export function cacheClear(): void {
    store.clear();
}
