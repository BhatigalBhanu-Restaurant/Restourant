import axios from 'axios';
import { appCache } from './cache';

declare module 'axios' {
  export interface AxiosRequestConfig {
    forceFresh?: boolean;
    noCache?: boolean;
  }
}

// Dynamic Backend URL - auto-detects Vite dev server vs Python server vs custom env
export const getBackendOrigin = (): string => {
  const envBackend = (import.meta.env.VITE_BACKEND_URL || (import.meta.env as any).REACT_APP_BACKEND_URL || '').trim();
  if (envBackend) {
    return envBackend.replace(/\/+$/, '');
  }

  const envApi = (import.meta.env.VITE_API_URL || (import.meta.env as any).REACT_APP_API_URL || '').trim();
  if (envApi) {
    try {
      const parsed = new URL(envApi);
      return parsed.origin;
    } catch {
      // not a full url
    }
  }

  if (typeof window !== 'undefined') {
    if (window.location.port === '3000' || window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

export const LIVE_BACKEND_URL = getBackendOrigin();

export const getApiBaseUrl = (): string => {
  const envApi = (import.meta.env.VITE_API_URL || (import.meta.env as any).REACT_APP_API_URL || '').trim();
  if (envApi) {
    const cleaned = envApi.replace(/\/+$/, '');
    return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
  }
  return `${LIVE_BACKEND_URL}/api`;
};

export const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization Bearer token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Active socket reference for broadcasting client mutations
let activeSocketInstance: any = null;
export const setApiSocket = (s: any) => {
  activeSocketInstance = s;
};

// Handle expired tokens and global API errors + Cache Auto-Management & Real-Time Sync
apiClient.interceptors.response.use(
  (response) => {
    const data = response.data;
    const method = response.config?.method?.toLowerCase();
    const url = response.config?.url || '';

    // Cache successful GET responses
    if (method === 'get' && url && data && data.success !== false) {
      appCache.set(url, data);
    }

    // Auto-invalidate caches and broadcast on write mutations (POST, PUT, PATCH, DELETE)
    if (method && ['post', 'put', 'patch', 'delete'].includes(method) && url) {
      let entity = 'general';

      if (url.includes('/orders') || url.includes('/tables') || url.includes('/billing') || url.includes('/kot')) {
        entity = url.includes('/tables') ? 'tables' : 'orders';
        appCache.invalidateMatching('/tables/floor-layout');
        appCache.invalidateMatching('/masters/tables');
        appCache.invalidateMatching('/orders');
        appCache.invalidateMatching('/dashboard');
        appCache.invalidateMatching('/kitchen');
        appCache.invalidateMatching('/billing');
      } else if (url.includes('/daily-menu')) {
        entity = 'daily-menu';
        appCache.invalidateMatching('/daily-menu');
        appCache.invalidateMatching('/pos');
      } else if (url.includes('/masters/floor-zones')) {
        entity = 'floor-zones';
        appCache.invalidateMatching('/masters/floor-zones');
        appCache.invalidateMatching('/tables/floor-layout');
      } else if (url.includes('/masters/tables')) {
        entity = 'tables';
        appCache.invalidateMatching('/masters/tables');
        appCache.invalidateMatching('/tables/floor-layout');
      } else if (url.includes('/masters')) {
        entity = 'masters';
        appCache.invalidateMatching('/masters');
        appCache.invalidateMatching('/tables/floor-layout');
        appCache.invalidateMatching('/daily-menu');
      } else if (url.includes('/tokens')) {
        entity = 'tokens';
        appCache.invalidateMatching('/tokens');
        appCache.invalidateMatching('/dashboard');
      } else if (url.includes('/bookings')) {
        entity = 'bookings';
        appCache.invalidateMatching('/bookings');
        appCache.invalidateMatching('/tables/floor-layout');
      } else {
        appCache.invalidateMatching(url);
      }

      // 1. Dispatch locally to update all open components in the current tab/window immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('erp:data-changed', {
          detail: { entity, url, method, data }
        }));
      }

      // 2. Broadcast via WebSocket to all other connected tabs and devices
      try {
        if (activeSocketInstance && activeSocketInstance.connected) {
          activeSocketInstance.emit('broadcast_change', {
            entity,
            action: method,
            url,
            timestamp: Date.now()
          });
        }
      } catch (err) {
        console.warn('[Socket Broadcast] Failed to broadcast mutation:', err);
      }
    }

    return data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          if (res.data?.data?.accessToken) {
            localStorage.setItem('access_token', res.data.data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          appCache.invalidateAll();
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        appCache.invalidateAll();
        if (!window.location.pathname.startsWith('/display') && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }

    const message = error.response?.data?.message || error.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

// High-speed transparent GET caching layer:
// Resolves in 0ms from in-memory / persistent cache, and silently revalidates in background if stale
const rawGet = apiClient.get.bind(apiClient);

(apiClient as any).get = async function (url: string, config?: any) {
  // If explicitly requested fresh or noCache, bypass cache and update store
  if (config?.noCache || config?.forceFresh) {
    const fresh: any = await rawGet(url, config);
    if (fresh && fresh.success !== false) {
      appCache.set(url, fresh);
    }
    return fresh;
  }

  const cached = appCache.get(url);
  if (cached !== null) {
    // If data is older than 20 seconds, revalidate in background silently
    if (appCache.isStale(url, 20000)) {
      rawGet(url, { ...config, noCache: true })
        .then((fresh: any) => {
          if (fresh && fresh.success !== false) {
            appCache.set(url, fresh);
          }
        })
        .catch(() => {});
    }
    // Return cached data immediately in 0ms!
    return cached;
  }

  // Otherwise fetch from network and store in cache
  const res: any = await rawGet(url, config);
  if (res && res.success !== false) {
    appCache.set(url, res);
  }
  return res;
};

