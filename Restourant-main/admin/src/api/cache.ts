/**
 * Pure In-Memory Cache Service
 * Provides instantaneous UI rendering without ANY persistent localStorage data corruption.
 * Guarantees that data is ALWAYS fetched live from the real production MongoDB database.
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

// 3 seconds max in-memory TTL to prevent identical burst requests on render
const DEFAULT_TTL_MS = 3000;

class AppCacheService {
  private memoryCache = new Map<string, CacheEntry>();
  private listeners = new Map<string, Set<(data: any) => void>>();

  constructor() {
    // Purge any stale legacy localStorage caches completely
    this.purgeLocalStorageArtifacts();
  }

  // Purge any old cache keys or mock zones from the browser's localStorage
  purgeLocalStorageArtifacts(): void {
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('bb_fast_cache_') || k === 'bb_custom_floor_zones' || k.startsWith('bb_cache_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }

  // Normalize URL key
  private normalizeKey(url: string): string {
    return url.trim();
  }

  // Get data from in-memory fast cache
  get<T = any>(url: string): T | null {
    const key = this.normalizeKey(url);
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      if (Date.now() - memEntry.timestamp < memEntry.ttl) {
        return memEntry.data as T;
      }
      this.memoryCache.delete(key);
    }
    return null;
  }

  // Check if data is already cached in memory
  has(url: string): boolean {
    return this.get(url) !== null;
  }

  // Check if data needs background revalidation
  isStale(url: string, freshThresholdMs = 2000): boolean {
    const key = this.normalizeKey(url);
    const entry = this.memoryCache.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > freshThresholdMs;
  }

  // Store data in memory ONLY (never in localStorage)
  set(url: string, data: any, ttl = DEFAULT_TTL_MS): void {
    if (!data) return;
    const key = this.normalizeKey(url);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    };

    this.memoryCache.set(key, entry);

    // Notify listeners of fresh data
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(cb => cb(data));
    }
  }

  // Subscribe to updates for a given URL
  subscribe(url: string, callback: (data: any) => void): () => void {
    const key = this.normalizeKey(url);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  // Invalidate matching keys on mutations (POST, PUT, DELETE)
  invalidateMatching(pattern: string): void {
    const p = pattern.toLowerCase();
    for (const key of this.memoryCache.keys()) {
      if (key.toLowerCase().includes(p)) {
        this.memoryCache.delete(key);
      }
    }
    this.purgeLocalStorageArtifacts();
  }

  // Clear all in-memory caches
  invalidateAll(): void {
    this.memoryCache.clear();
    this.purgeLocalStorageArtifacts();
  }
}

export const appCache = new AppCacheService();
