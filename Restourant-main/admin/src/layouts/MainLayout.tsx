import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';

export const MainLayout: React.FC = () => {
  // Web screen: default to open (>= 992px); Mobile screen: default to closed (< 992px)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 992);
  const location = useLocation();

  // ONLY auto-close navigation menu on route change for mobile screens (< 992px)
  useEffect(() => {
    if (window.innerWidth < 992) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Handle window resize: automatically open on desktop, close on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Escape key only closes on mobile screens (< 992px)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && window.innerWidth < 992 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  return (
    <div
      className="d-flex flex-column vh-100 vw-100 bg-light position-relative overflow-hidden"
      style={{ height: '100dvh', maxHeight: '100dvh' }}
    >
      {/* Fixed Header */}
      <Navbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />

      {/* Mobile Backdrop ONLY (d-lg-none): Clicking outside closes only on mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop d-lg-none"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Two Independent Scroll Areas (Sidebar & Screen) below Fixed Header */}
      <div
        className="d-flex flex-grow-1 position-relative overflow-hidden"
        style={{ minHeight: 0, height: 'calc(100dvh - 56px)' }}
      >
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onCloseMobile={() => setSidebarOpen(false)}
        />
        <main
          className="flex-grow-1 p-2 p-sm-3 p-md-4 main-content"
          style={{ minWidth: 0 }}
        >
          <div className="container-fluid px-0" style={{ minWidth: 0, paddingBottom: '3.5rem' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export const PosLayout: React.FC = () => {
  return (
    <div
      className="vw-100 d-flex flex-column bg-light"
      style={{ minHeight: '100dvh', height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}
    >
      <Outlet />
    </div>
  );
};

export const KitchenLayout: React.FC = () => {
  return (
    <div className="vh-100 vw-100 d-flex flex-column bg-dark text-white overflow-hidden">
      <Outlet />
    </div>
  );
};

export const PublicDisplayLayout: React.FC = () => {
  return (
    <div className="vh-100 vw-100 d-flex flex-column bg-dark text-white overflow-hidden">
      <Outlet />
    </div>
  );
};
