import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { SystemNotification } from '../types';
import { apiClient } from '../api/client';

export interface ToastAlert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

interface NotificationContextType {
  notifications: SystemNotification[];
  toasts: ToastAlert[];
  unreadCount: number;
  addToast: (title: string, message: string, type?: ToastAlert['type']) => void;
  removeToast: (id: string) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [toasts, setToasts] = useState<ToastAlert[]>([]);

  const fetchNotifications = async () => {
    try {
      const res: any = await apiClient.get('/system/notifications');
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const addToast = (title: string, message: string, type: ToastAlert['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/system/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/system/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('kot.created', (kot: any) => {
      addToast('New KOT Created', `Ticket ${kot.kotNumber} for Table ${kot.tableNumber || 'Takeaway'}`, 'info');
    });

    socket.on('kot.ready_alert', (kot: any) => {
      addToast('Food Ready to Serve!', `KOT ${kot.kotNumber} for Table ${kot.tableNumber} is ready.`, 'success');
    });

    socket.on('inventory.low_stock', (item: any) => {
      addToast('Low Stock Alert', `${item.name} current stock (${item.currentStock}) is below minimum (${item.minimumStockLevel}).`, 'warning');
    });

    socket.on('system.status_changed', (data: any) => {
      addToast('System Alert', `System operational status changed to: ${data.status}`, 'danger');
    });

    return () => {
      socket.off('kot.created');
      socket.off('kot.ready_alert');
      socket.off('inventory.low_stock');
      socket.off('system.status_changed');
    };
  }, [socket]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        toasts,
        unreadCount,
        addToast,
        removeToast,
        markAsRead,
        markAllAsRead,
        fetchNotifications
      }}
    >
      {children}
      {/* Global Floating Toasts Container */}
      <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 9999 }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast show align-items-center text-white bg-${toast.type} border-0 mb-2 shadow`}
            role="alert"
          >
            <div className="d-flex">
              <div className="toast-body">
                <div className="fw-bold">{toast.title}</div>
                <div className="small">{toast.message}</div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => removeToast(toast.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};
