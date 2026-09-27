import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

import { setApiSocket } from '../api/client';
import { appCache } from '../api/cache';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  broadcastChange: (entity: string, action: string, data?: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Dynamic Socket.IO URL - auto-detects Vite dev server vs Python server vs custom env
const getSocketUrl = (): string => {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (typeof window !== 'undefined') {
    if (window.location.port === '3000' || window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const broadcastChange = (entity: string, action: string, data?: any) => {
    // 1. Dispatch locally in current window/tab
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp:data-changed', {
        detail: { entity, action, data }
      }));
    }

    // 2. Broadcast to other connected clients via WebSocket
    if (socket && socket.connected) {
      socket.emit('broadcast_change', {
        entity,
        action,
        data,
        timestamp: Date.now()
      });
    }
  };

  useEffect(() => {
    const targetUrl = getSocketUrl();

    const newSocket = targetUrl
      ? io(targetUrl, {
          auth: { token },
          autoConnect: true,
          transports: ['websocket', 'polling'],
          withCredentials: true
        })
      : io({
          auth: { token },
          autoConnect: true,
          transports: ['websocket', 'polling'],
          withCredentials: true
        });

    setApiSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
    });

    // Universal auto-refresh dispatchers for incoming socket broadcasts
    const dispatchChange = (entity: string, action: string, data?: any) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('erp:data-changed', {
          detail: { entity, action, data }
        }));
      }
    };

    // 1. Generic broadcast from any client
    newSocket.on('data.changed', (change: any) => {
      const entity = change?.entity || 'general';
      if (entity === 'tables' || entity === 'floor-zones') {
        appCache.invalidateMatching('/tables/floor-layout');
        appCache.invalidateMatching('/masters/tables');
        appCache.invalidateMatching('/masters/floor-zones');
      } else if (entity === 'orders' || entity === 'billing') {
        appCache.invalidateMatching('/tables/floor-layout');
        appCache.invalidateMatching('/orders');
        appCache.invalidateMatching('/dashboard');
        appCache.invalidateMatching('/kitchen');
      } else if (entity === 'daily-menu') {
        appCache.invalidateMatching('/daily-menu');
        appCache.invalidateMatching('/pos');
      } else if (entity === 'masters') {
        appCache.invalidateMatching('/masters');
        appCache.invalidateMatching('/tables/floor-layout');
      } else if (entity === 'tokens') {
        appCache.invalidateMatching('/tokens');
        appCache.invalidateMatching('/dashboard');
      }
      dispatchChange(entity, change?.action || 'CHANGE', change?.data);
    });

    // 2. Table updates
    newSocket.on('table.updated', (data) => {
      appCache.invalidateMatching('/tables/floor-layout');
      appCache.invalidateMatching('/masters/tables');
      dispatchChange('tables', 'UPDATE', data);
    });

    // 3. Order & KOT updates
    newSocket.on('order.created', (data) => {
      appCache.invalidateMatching('/tables/floor-layout');
      appCache.invalidateMatching('/orders');
      appCache.invalidateMatching('/dashboard');
      appCache.invalidateMatching('/kitchen');
      dispatchChange('orders', 'CREATE', data);
    });

    newSocket.on('order.updated', (data) => {
      appCache.invalidateMatching('/tables/floor-layout');
      appCache.invalidateMatching('/orders');
      appCache.invalidateMatching('/dashboard');
      appCache.invalidateMatching('/kitchen');
      dispatchChange('orders', 'UPDATE', data);
    });

    newSocket.on('kot.created', (data) => {
      appCache.invalidateMatching('/kitchen');
      dispatchChange('kitchen', 'CREATE', data);
    });

    newSocket.on('kot.updated', (data) => {
      appCache.invalidateMatching('/kitchen');
      dispatchChange('kitchen', 'UPDATE', data);
    });

    newSocket.on('kot.ready', (data) => {
      appCache.invalidateMatching('/kitchen');
      dispatchChange('kitchen', 'READY', data);
    });

    // 4. Token updates
    newSocket.on('token.called', (data) => {
      appCache.invalidateMatching('/tokens');
      dispatchChange('tokens', 'CALLED', data);
    });

    newSocket.on('token.updated', (data) => {
      appCache.invalidateMatching('/tokens');
      dispatchChange('tokens', 'UPDATE', data);
    });

    // 5. Payment & Billing
    newSocket.on('payment.completed', (data) => {
      appCache.invalidateMatching('/tables/floor-layout');
      appCache.invalidateMatching('/orders');
      appCache.invalidateMatching('/billing');
      appCache.invalidateMatching('/dashboard');
      dispatchChange('billing', 'PAYMENT', data);
      dispatchChange('tables', 'UPDATE', data);
    });

    // 6. Booking
    newSocket.on('booking.updated', (data) => {
      appCache.invalidateMatching('/bookings');
      appCache.invalidateMatching('/tables/floor-layout');
      dispatchChange('bookings', 'UPDATE', data);
    });

    // 7. Master data
    newSocket.on('master.updated', (data) => {
      appCache.invalidateMatching('/masters');
      appCache.invalidateMatching('/tables/floor-layout');
      appCache.invalidateMatching('/daily-menu');
      dispatchChange('masters', 'UPDATE', data);
    });

    // 8. System status
    newSocket.on('system.status_changed', (data) => {
      appCache.invalidateMatching('/system');
      dispatchChange('system', 'STATUS', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setApiSocket(null);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, broadcastChange }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
