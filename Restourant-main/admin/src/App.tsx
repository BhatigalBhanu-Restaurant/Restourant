import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PermissionProvider } from './context/PermissionContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { MainLayout } from './layouts/MainLayout';

// Fast Dynamic Route Code-Splitting
const LoginPage = lazy(() => import('./modules/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const MastersPage = lazy(() => import('./modules/masters/MastersPage').then(m => ({ default: m.MastersPage })));
const DailyMenuPage = lazy(() => import('./modules/daily-menu/DailyMenuPage').then(m => ({ default: m.DailyMenuPage })));
const BookingPage = lazy(() => import('./modules/booking/BookingPage').then(m => ({ default: m.BookingPage })));
const InventoryPage = lazy(() => import('./modules/inventory/InventoryPage').then(m => ({ default: m.InventoryPage })));
const StaffPage = lazy(() => import('./modules/staff/StaffPage').then(m => ({ default: m.StaffPage })));
const UsersRolesPage = lazy(() => import('./modules/users-roles/UsersRolesPage').then(m => ({ default: m.UsersRolesPage })));
const NotificationsPage = lazy(() => import('./modules/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const StoreSettingsPage = lazy(() => import('./modules/settings/StoreSettingsPage').then(m => ({ default: m.StoreSettingsPage })));
const SystemControlPage = lazy(() => import('./modules/audit/AuditPage').then(m => ({ default: m.SystemControlPage })));

// Ultra-lightweight page loading fallback
const PageFallback: React.FC = () => (
  <div className="d-flex align-items-center justify-content-center py-5 w-100" style={{ minHeight: '40vh' }}>
    <div className="spinner-border spinner-border-sm text-warning" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PermissionProvider>
          <SocketProvider>
            <NotificationProvider>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  {/* Public Auth Routes */}
                  <Route path="/login" element={<LoginPage />} />

                  {/* Main Unified ERP Routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <MainLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<DashboardPage />} />
                    <Route path="masters" element={<MastersPage />} />
                    <Route path="daily-menu" element={<DailyMenuPage />} />
                    <Route path="bookings" element={<BookingPage />} />
                    <Route path="functions" element={<BookingPage />} />
                    <Route path="inventory" element={<InventoryPage />} />
                    <Route path="staff" element={<StaffPage />} />
                    <Route path="employees" element={<StaffPage />} />
                    <Route path="users-roles" element={<UsersRolesPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="settings" element={<StoreSettingsPage />} />
                    <Route path="system-control" element={<SystemControlPage />} />
                  </Route>


                  {/* Fallback Route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </NotificationProvider>
          </SocketProvider>
        </PermissionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

