/**
 * farmingCache.js — Simple in-memory TTL cache
 *
 * No external dependencies. Stores scraped/enriched data
 * with automatic expiry so we don't hit APIs on every request.
 */

const store = new Map();

/**
 * Get a cached value. Returns null if expired or missing.
 * @param {string} key
 * @returns {any|null}
 */
export function cacheGet(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
    }
    return entry.value;
}

/**
 * Set a cached value with TTL.
 * @param {string} key
 * @param {any}    value
 * @param {number} ttlSeconds — time-to-live in seconds (default 30 min)
 */
export function cacheSet(key, value, ttlSeconds = 1800) {
    store.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });
}

/**
 * Invalidate a single key or all keys matching a prefix.
 * @param {string} keyOrPrefix
 */
export function cacheInvalidate(keyOrPrefix) {
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
export function cacheClear() {
    store.clear();
}
