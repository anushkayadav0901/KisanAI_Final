// Advanced persistent storage helpers with namespaced keys, safe JSON handling, and expiry

type JsonValue = 
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: JsonValue }
  | JsonValue[];

const NAMESPACE = "kisanai";

const buildKey = (feature: string, key: string) => `${NAMESPACE}:${feature}:${key}`;

/**
 * Save JSON data to localStorage with timestamp
 */
export function saveJSON(feature: string, key: string, value: JsonValue, expiryHours: number = 24) {
  try {
    const k = buildKey(feature, key);
    const expiryTime = Date.now() + (expiryHours * 60 * 60 * 1000);
    const payload = JSON.stringify({ 
      v: value, 
      t: Date.now(),
      exp: expiryTime
    });
    localStorage.setItem(k, payload);
  } catch (err) {
    console.warn(`Storage error for key ${feature}:${key}:`, err);
    // Don't throw error to avoid breaking functionality
  }
}

/**
 * Load JSON data from localStorage with expiry check
 */
export function loadJSON<T = JsonValue>(feature: string, key: string): T | null {
  try {
    const k = buildKey(feature, key);
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    
    // Check if data has expired
    if (parsed.exp && Date.now() > parsed.exp) {
      localStorage.removeItem(k); // Clean up expired data
      return null;
    }
    
    return (parsed?.v as T) ?? null;
  } catch (err) {
    console.warn(`Storage load error for key ${feature}:${key}:`, err);
    return null;
  }
}

/**
 * Remove a specific key
 */
export function removeKey(feature: string, key: string) {
  try {
    localStorage.removeItem(buildKey(feature, key));
  } catch (err) {
    console.warn(`Storage remove error for key ${feature}:${key}:`, err);
  }
}

/**
 * Clear all keys for a specific feature
 */
export function clearFeature(feature: string) {
  try {
    const prefix = `${NAMESPACE}:${feature}:`;
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (err) {
    console.warn(`Storage clear error for feature ${feature}:`, err);
  }
}

/**
 * Get storage usage statistics
 */
export function getStorageStats() {
  try {
    let totalSize = 0;
    const items: { key: string; size: number }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        const size = value ? new Blob([value]).size : 0;
        totalSize += size;
        items.push({ key, size });
      }
    }
    
    return {
      totalSize,
      itemCount: localStorage.length,
      items: items.sort((a, b) => b.size - a.size), // Sort by size descending
      quotaEstimate: navigator.storage && 'estimate' in navigator.storage ? 
        (navigator.storage as { estimate?: () => Promise<{ usage: number; quota: number }> }).estimate?.() || null : null
    };
  } catch {
    return {
      totalSize: 0,
      itemCount: 0,
      items: [],
      quotaEstimate: null
    };
  }
}

/**
 * Check if storage is available and within limits
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = `${NAMESPACE}:test`;
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save a composite entry of inputs and result for easy restoration
 */
export function saveResult(feature: string, data: Record<string, JsonValue>, expiryHours: number = 24) {
  saveJSON(feature, "result", data, expiryHours);
}

/**
 * Load a composite entry previously saved with saveResult
 */
export function loadResult<T = JsonValue>(feature: string): T | null {
  return loadJSON<T>(feature, "result");
}

/**
 * Save multiple related values under the same feature with individual expiry
 */
export function saveMultiple(feature: string, data: Record<string, { value: JsonValue, expiryHours?: number }>) {
  Object.entries(data).forEach(([key, { value, expiryHours = 24 }]) => {
    saveJSON(feature, key, value, expiryHours);
  });
}

/**
 * Load multiple related values under the same feature
 */
export function loadMultiple<T extends Record<string, JsonValue>>(feature: string, keys: string[]): Partial<T> {
  const result: Partial<T> = {};
  
  keys.forEach(key => {
    const value = loadJSON(feature, key);
    if (value !== null) {
      (result as Record<string, JsonValue>)[key] = value;
    }
  });
  
  return result;
}


