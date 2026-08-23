/**
 * farmingCache.ts — Simple in-memory TTL cache
 *
 * No external dependencies. Stores scraped/enriched data
 * with automatic expiry so we don't hit APIs on every request.
 */

export interface CacheEntry<T = unknown> {
    value: T;
    expiresAt: number;
}

const store = new Map<string, CacheEntry>();

/**
 * Get a cached value. Returns null if expired or missing.
 */
export function cacheGet<T = unknown>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
    }
    return entry.value as T;
}

/**
 * Set a cached value with TTL.
 * @param ttlSeconds — time-to-live in seconds (default 30 min)
 */
export function cacheSet<T>(key: string, value: T, ttlSeconds: number = 1800): void {
    store.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });
}

/**
 * Invalidate a single key or all keys matching a prefix.
 */
export function cacheInvalidate(keyOrPrefix: string): void {
    if (store.has(keyOrPrefix)) {
        store.delete(keyOrPrefix);
        return;
    }
    // Prefix match
    for (const k of store.keys()) {
        if (k.startsWith(keyOrPrefix)) store.delete(k);
    }
}

/** Clear the entire cache. */
export function cacheClear(): void {
    store.clear();
}
