import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

interface PermissionContextType {
  can: (permissionId: string) => boolean;
  canAny: (permissionIds: string[]) => boolean;
  canAll: (permissionIds: string[]) => boolean;
  grantedPermissions: Set<string>;
  getPermissionSource: (permissionId: string) => string;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, effectivePermissions } = useAuth();

  const isSuperAdmin = 
    user?.roleName === 'Super Admin' || 
    user?.roleName === 'System Admin' || 
    user?.roleName === 'System Administrator' || 
    user?.roleName === 'Admin' ||
    user?.roleId === 'role_super_admin' || 
    user?.roleId === 'role_admin' ||
    user?.roleId === 'role_system_admin' ||
    user?.username === 'superadmin' ||
    user?.username === 'admin';

  const { grantedMap, sourceMap } = useMemo(() => {
    const granted = new Set<string>();
    const sources = new Map<string, string>();

    for (const p of effectivePermissions) {
      sources.set(p.permissionId, p.source);
      if (p.granted || isSuperAdmin) {
        granted.add(p.permissionId);
      }
    }

    return { grantedMap: granted, sourceMap: sources };
  }, [effectivePermissions, isSuperAdmin]);

  const can = (permissionId: string): boolean => {
    if (isSuperAdmin) return true;
    return grantedMap.has(permissionId);
  };

  const canAny = (permissionIds: string[]): boolean => {
    if (isSuperAdmin) return true;
    return permissionIds.some(id => grantedMap.has(id));
  };

  const canAll = (permissionIds: string[]): boolean => {
    if (isSuperAdmin) return true;
    return permissionIds.every(id => grantedMap.has(id));
  };

  const getPermissionSource = (permissionId: string): string => {
    return sourceMap.get(permissionId) || 'ROLE';
  };

  return (
    <PermissionContext.Provider
      value={{
        can,
        canAny,
        canAll,
        grantedPermissions: grantedMap,
        getPermissionSource
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => {
  const context = useContext(PermissionContext);
  if (!context) throw new Error('usePermission must be used within a PermissionProvider');
  return context;
};
