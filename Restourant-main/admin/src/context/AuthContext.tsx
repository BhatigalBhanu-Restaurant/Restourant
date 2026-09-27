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
  const [user, setUser] = useState<User | null>(null);
  const [effectivePermissions, setEffectivePermissions] = useState<PermissionDetail[]>([]);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const res: any = await apiClient.get('/auth/profile');
      if (res.success && res.data) {
        setUser(res.data.user);
        setEffectivePermissions(res.data.effectivePermissions || []);
        // Trigger background preloading of all modules immediately
        preloadAllModulesData();
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setUser(null);
      setEffectivePermissions([]);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      appCache.invalidateAll();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (username: string, pass: string) => {
    setIsLoading(true);
    try {
      const res: any = await apiClient.post('/auth/login', { username, password: pass });
      if (res.success && res.data) {
        localStorage.setItem('access_token', res.data.accessToken);
        localStorage.setItem('refresh_token', res.data.refreshToken);
        setToken(res.data.accessToken);
        setUser(res.data.user);
        setEffectivePermissions(res.data.effectivePermissions || []);
        // Trigger immediate background preloader
        preloadAllModulesData(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
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
