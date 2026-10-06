import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PermissionDetail } from '../types';
import { apiClient } from '../api/client';
import { appCache } from '../api/cache';
import { preloadAllModulesData } from '../api/preloader';

interface AuthContextType {
  user: User | null;
  effectivePermissions: PermissionDetail[];
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = sessionStorage.getItem('bhatigal_cached_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [effectivePermissions, setEffectivePermissions] = useState<PermissionDetail[]>(() => {
    try {
      const raw = sessionStorage.getItem('bhatigal_cached_perms');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  // Use sessionStorage so exiting browser/tab automatically logs out
  const [token, setToken] = useState<string | null>(() => {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } catch {}
    return sessionStorage.getItem('access_token');
  });
  // If token and cached user already exist, start with isLoading = false for 0ms instantaneous render!
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const hasToken = typeof window !== 'undefined' && !!sessionStorage.getItem('access_token');
    const hasCachedUser = typeof window !== 'undefined' && !!sessionStorage.getItem('bhatigal_cached_user');
    return hasToken ? !hasCachedUser : false;
  });

  const isLoggingInRef = React.useRef(false);

  const fetchProfile = async () => {
    try {
      const res: any = await apiClient.get('/auth/profile');
      if (res.success && res.data) {
        setUser(res.data.user);
        setEffectivePermissions(res.data.effectivePermissions || []);
        try {
          sessionStorage.setItem('bhatigal_cached_user', JSON.stringify(res.data.user));
          sessionStorage.setItem('bhatigal_cached_perms', JSON.stringify(res.data.effectivePermissions || []));
        } catch {}
        // Trigger gentle background preloading after short delay
        setTimeout(() => {
          preloadAllModulesData(false);
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setUser(null);
      setEffectivePermissions([]);
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('bhatigal_cached_user');
      sessionStorage.removeItem('bhatigal_cached_perms');
      try {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } catch {}
      appCache.invalidateAll();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      if (isLoggingInRef.current) {
        // Skip redundant fetchProfile immediately after login: profile is already loaded!
        return;
      }
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (username: string, pass: string) => {
    setIsLoading(true);
    isLoggingInRef.current = true;
    try {
      const res: any = await apiClient.post('/auth/login', { username, password: pass });
      if (res.success && res.data) {
        sessionStorage.setItem('access_token', res.data.accessToken);
        sessionStorage.setItem('refresh_token', res.data.refreshToken);
        try {
          sessionStorage.setItem('bhatigal_cached_user', JSON.stringify(res.data.user));
          sessionStorage.setItem('bhatigal_cached_perms', JSON.stringify(res.data.effectivePermissions || []));
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        } catch {}
        setToken(res.data.accessToken);
        setUser(res.data.user);
        setEffectivePermissions(res.data.effectivePermissions || []);
        setIsLoading(false);

        // Defer preloader until after the user is comfortably on dashboard
        setTimeout(() => {
          preloadAllModulesData(false);
        }, 1200);
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isLoggingInRef.current = false;
      }, 500);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('bhatigal_cached_user');
    sessionStorage.removeItem('bhatigal_cached_perms');
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } catch {}
    appCache.invalidateAll();
    setToken(null);
    setUser(null);
    setEffectivePermissions([]);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        effectivePermissions,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshProfile: fetchProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
