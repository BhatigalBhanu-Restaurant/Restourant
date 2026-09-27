import { useEffect, useRef } from 'react';

export interface AutoRefreshOptions {
  /** Target entities to listen for (e.g. ['tables', 'floor-zones', 'orders', 'masters']) */
  entities?: string[];
  /** Periodic background refresh interval in milliseconds (default: 5000ms, set 0 to disable) */
  intervalMs?: number;
  /** Whether to refresh immediately when browser tab regains focus (default: true) */
  refreshOnFocus?: boolean;
  /** Debounce delay for rapid successive events in milliseconds (default: 150ms) */
  debounceMs?: number;
}

/**
 * Universal auto-refresh hook:
 * Automatically triggers `onRefresh` when:
 * 1. An 'erp:data-changed' event is dispatched (locally or via WebSocket)
 * 2. The user switches back to this browser tab / window
 * 3. The background interval timer ticks
 */
export function useAutoRefresh(
  onRefresh: () => void | Promise<any>,
  options: AutoRefreshOptions = {}
) {
  const {
    entities,
    intervalMs = 5000,
    refreshOnFocus = true,
    debounceMs = 150
  } = options;

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const isRefreshingRef = useRef(false);
  const debounceTimerRef = useRef<any>(null);

  const triggerRefresh = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(async () => {
      if (isRefreshingRef.current) return;
      try {
        isRefreshingRef.current = true;
        await onRefreshRef.current();
      } catch (err) {
        console.warn('[AutoRefresh] Refresh execution error:', err);
      } finally {
        isRefreshingRef.current = false;
      }
    }, debounceMs);
  };

  useEffect(() => {
    // 1. Listen for global data change events (Dispatched instantly on Socket.IO and Local mutations)
    const handleDataChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ entity?: string; action?: string; url?: string }>;
      const changedEntity = customEvent.detail?.entity;

      if (!entities || entities.length === 0) {
        triggerRefresh();
        return;
      }

      if (!changedEntity) {
        triggerRefresh();
        return;
      }

      const isMatch = entities.some(e => {
        const normE = e.toLowerCase();
        const normChanged = changedEntity.toLowerCase();
        return normChanged.includes(normE) || normE.includes(normChanged);
      });

      if (isMatch) {
        triggerRefresh();
      }
    };

    window.addEventListener('erp:data-changed', handleDataChange);

    // 2. Listen for Window / Tab Focus (Refresh immediately when user comes back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerRefresh();
      }
    };

    const handleWindowFocus = () => {
      triggerRefresh();
    };

    if (refreshOnFocus) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleWindowFocus);
    }

    // 3. Periodic Background Fallback Sync (Only when visible, at relaxed intervals)
    let intervalId: any = null;
    if (intervalMs > 0) {
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          triggerRefresh();
        }
      }, Math.max(intervalMs, 8000));
    }

    return () => {
      window.removeEventListener('erp:data-changed', handleDataChange);
      if (refreshOnFocus) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleWindowFocus);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [entities?.join(','), intervalMs, refreshOnFocus, debounceMs]);
}
