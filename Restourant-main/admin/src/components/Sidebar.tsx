import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { usePermission } from '../context/PermissionContext';
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  Database,
  UserCog,
  Bell,
  Settings,
  Server,
  ClipboardList,
  Users,
  X
} from 'lucide-react';

interface MenuItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  permission: string | string[];
  badge?: string;
  section?: string;
}

export const Sidebar: React.FC<{ isOpen: boolean; onClose?: () => void; onCloseMobile?: () => void }> = ({
  isOpen,
  onClose,
  onCloseMobile
}) => {
  const { can, canAny } = usePermission();
  const handleClose = onClose || onCloseMobile;

  const menuItems: MenuItem[] = [
    { title: 'Overview', path: '/', icon: <LayoutDashboard size={18} />, permission: 'dashboard.view' },
    { title: 'Daily Menu', path: '/daily-menu', icon: <Calendar size={18} />, permission: ['daily_menu.view', 'masters.menu.view'] },
    { title: 'Functions', path: '/bookings', icon: <CalendarCheck size={18} />, permission: 'booking.view', badge: '1 Date / Order' },
    { title: 'Inventory', path: '/inventory', icon: <ClipboardList size={18} />, permission: ['masters.menu.view'], badge: 'Daily Ledger' },
    { title: 'Staff & Salary', path: '/staff', icon: <Users size={18} />, permission: 'dashboard.view', badge: 'ઉપાડ અને પગાર' },
    { title: 'Menu Bar', path: '/masters', icon: <Database size={18} />, permission: ['masters.menu.view'] },
    { title: 'User Roles Matrix', path: '/users-roles', icon: <UserCog size={18} />, permission: 'users.view' },
    { title: 'Notifications', path: '/notifications', icon: <Bell size={18} />, permission: 'notification.view' },
    { title: 'Store Settings', path: '/settings', icon: <Settings size={18} />, permission: 'settings.view' },
    { title: 'Emergency Control', path: '/system-control', icon: <Server size={18} />, permission: 'system.control.view' }
  ];



  // Dynamically filter menu items based on user's granted permissions
  const visibleItems = menuItems.filter(item => 
    Array.isArray(item.permission) ? canAny(item.permission) : can(item.permission)
  );

  return (
    <aside
      className={`sidebar bg-white border-end ${
        isOpen ? 'sidebar-open' : 'sidebar-closed'
      }`}
    >
      {/* Top Header with Brand Name and Close Button (Visible on Mobile Drawer) */}
      <div className="p-3 bg-primary text-white d-flex d-lg-none align-items-center justify-content-between border-bottom shadow-sm flex-shrink-0">
        <Link
          to="/"
          onClick={() => {
            if (window.innerWidth < 992 && handleClose) {
              handleClose();
            }
          }}
          className="d-flex align-items-center gap-2 text-decoration-none text-white"
          title="Go to Dashboard"
        >
          <div
            className="rounded-circle d-flex align-items-center justify-content-center bg-white shadow-sm flex-shrink-0"
            style={{
              width: '36px',
              height: '36px',
              minWidth: '36px',
              minHeight: '36px',
              border: '2px solid var(--brand-gold, #D48B28)',
              padding: '1.5px',
              aspectRatio: '1 / 1',
              overflow: 'hidden'
            }}
          >
            <img
              src="/logo.jpg"
              alt="Bhatigal Bhanu"
              className="w-100 h-100 rounded-circle flex-shrink-0"
              style={{
                objectFit: 'cover',
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                display: 'block'
              }}
            />
          </div>
          <div className="d-flex flex-column">
            <span className="fw-bold tracking-wide text-white" style={{ fontSize: '0.95rem', letterSpacing: '0.02em' }}>
              BHATIGAL BHANU
            </span>
            <span className="badge bg-gold text-dark fw-bold" style={{ fontSize: '0.62rem', width: 'fit-content' }}>
              RESTAURANT ERP
            </span>
          </div>
        </Link>
        <button
          className="btn btn-sm btn-link text-white p-1 rounded-circle hover-bg-dark d-lg-none"
          onClick={handleClose}
          type="button"
          aria-label="Close navigation"
          title="Close Navigation Bar"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-3 border-bottom bg-light d-flex align-items-center justify-content-between flex-shrink-0 sticky-top" style={{ zIndex: 10 }}>
        <span className="small fw-bold text-uppercase text-muted" style={{ letterSpacing: '0.05em' }}>
          Navigation Menu
        </span>
        <span className="badge bg-primary text-white fw-bold">
          {visibleItems.length} Modules
        </span>
      </div>

      <nav className="nav flex-column p-2 gap-1 sidebar-nav" style={{ flexWrap: 'nowrap', paddingBottom: '3.5rem' }}>
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              // Only auto-close on mobile screens (< 992px)
              if (window.innerWidth < 992 && handleClose) {
                handleClose();
              }
            }}
            className={({ isActive }) =>
              `nav-link d-flex align-items-center justify-content-between px-3 py-2 rounded text-dark text-decoration-none ${
                isActive ? 'bg-primary text-white active fw-semibold shadow-sm' : 'hover-bg-light'
              }`
            }
          >
            <div className="d-flex align-items-center gap-2">
              <span className="d-flex align-items-center">{item.icon}</span>
              <span style={{ fontSize: '0.9rem' }}>{item.title}</span>
            </div>
            {item.badge && (
              <span className="badge bg-warning text-dark" style={{ fontSize: '0.65rem' }}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
        {/* Bottom breathing space so the last module doesn't touch the bottom edge */}
        <div style={{ height: '3.5rem', flexShrink: 0 }} aria-hidden="true" />
      </nav>
    </aside>
  );
};
