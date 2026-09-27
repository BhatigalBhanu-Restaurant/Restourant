import { apiClient } from './client';
import { appCache } from './cache';

// Priority critical endpoints to warm in background smoothly without flooding backend
const CRITICAL_PRELOAD_ENDPOINTS = [
  '/tables/floor-layout',
  '/masters/floor-zones',
  '/masters/menu-categories',
  '/masters/menu-items',
  '/daily-menu/today'
];

let isPreloading = false;

/**
 * Gently preloads core frequently-accessed endpoints into memory cache.
 * Avoids CPU/network spikes on login.
 */
export async function preloadAllModulesData(force = false): Promise<void> {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  if (isPreloading) return;
  isPreloading = true;

  try {
    for (const endpoint of CRITICAL_PRELOAD_ENDPOINTS) {
      if (!force && !appCache.isStale(endpoint, 30000) && appCache.has(endpoint)) {
        continue;
      }
      try {
        const res: any = await (apiClient as any).get(endpoint);
        if (res && res.success !== false) {
          appCache.set(endpoint, res);
        }
      } catch {}
      // Small 50ms pause between requests to prevent backend queue bottleneck
      await new Promise(r => setTimeout(r, 50));
    }
  } catch {
    // Silent
  } finally {
    isPreloading = false;
  }
}
