import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useSocket } from '../context/SocketContext';
import { Bell, LogOut, Wifi, WifiOff, Clock, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const { isConnected } = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);

  // Live real-time clock
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const formattedTime = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });


  return (
    <header
      className="navbar navbar-expand navbar-dark bg-primary sticky-top px-2 px-sm-3 py-2 shadow-sm flex-nowrap align-items-center justify-content-between"
      style={{ height: 56, minHeight: 56, flexShrink: 0, zIndex: 1020 }}
    >
      <div className="d-flex align-items-center flex-shrink-0">
        <button
          className="btn btn-link text-white me-2 p-0"
          onClick={onToggleSidebar}
          type="button"
          aria-label="Toggle navigation"
          title="Toggle Navigation Menu"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <Link to="/" className="navbar-brand fw-bold d-flex align-items-center mb-0 text-white text-decoration-none me-0 me-sm-2 p-0">
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
          {/* Brand Name shown on desktop (omitted on mobile to prevent duplicate with dashboard banner and avoid 2-row wrapping) */}
          <div className="d-none d-md-flex flex-column ms-2">
            <div className="d-flex align-items-center gap-2">
              <span className="fs-5 fw-bold text-white tracking-wide" style={{ letterSpacing: '0.02em' }}>
                BHATIGAL BHANU
              </span>
              <span className="badge bg-gold text-dark fw-bold" style={{ fontSize: '0.62rem' }}>
                ERP
              </span>
            </div>
            <span className="small text-white-50" style={{ fontSize: '0.72rem', marginTop: '-2px' }}>
              Traditional Dining & Restaurant Management
            </span>
          </div>
        </Link>
      </div>

      <div className="ms-auto d-flex align-items-center gap-1 gap-sm-2 flex-shrink-0">
        {/* Real-time live date & ticking clock */}
        <div
          className="d-none d-lg-flex align-items-center gap-2 px-2 px-xl-3 py-1 rounded-pill"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(212, 139, 40, 0.4)',
            color: '#FFFFFF',
            fontSize: '0.78rem'
          }}
          title="Current Indian Standard Time (IST) - Live System Clock"
        >
          <div className="d-flex align-items-center gap-1">
            <Calendar size={13} className="text-warning" />
            <span className="fw-medium">{formattedDate}</span>
          </div>
          <span className="text-white-50">|</span>
          <div className="d-flex align-items-center gap-1 fw-bold text-white">
            <Clock size={13} className="text-warning" />
            <span>{formattedTime}</span>
          </div>
          <span
            className="d-inline-block rounded-circle bg-success"
            style={{ width: 6, height: 6, boxShadow: '0 0 6px #28a745' }}
          />
        </div>

        {/* Real-time connection badge */}
        <div className="d-none d-md-flex align-items-center gap-1 small text-white-50">
          {isConnected ? (
            <span className="badge bg-success-subtle text-success d-flex align-items-center gap-1 border border-success-subtle">
              <Wifi size={12} /> Live Sync
            </span>
          ) : (
            <span className="badge bg-danger-subtle text-danger d-flex align-items-center gap-1 border border-danger-subtle">
              <WifiOff size={12} /> Offline
            </span>
          )}
        </div>


        {/* Notifications Dropdown */}
        <div className="position-relative">
          <button
            className="btn btn-outline-light btn-sm position-relative rounded-circle p-0 d-flex align-items-center justify-content-center"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            style={{ width: 30, height: 30 }}
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="position-fixed top-0 start-0 w-100 h-100"
                style={{ zIndex: 1055, cursor: 'default' }}
                onClick={() => setShowNotifications(false)}
                aria-hidden="true"
              />
              <div
                className="position-absolute end-0 mt-2 bg-white rounded shadow-lg border p-0"
                style={{ width: 'min(320px, calc(100vw - 20px))', zIndex: 1060 }}
              >
              <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
                <h6 className="mb-0 fw-bold text-dark">Notifications</h6>
                {unreadCount > 0 && (
                  <button
                    className="btn btn-link btn-sm p-0 text-decoration-none text-primary"
                    onClick={markAllAsRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted small">No notifications yet.</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-2 px-3 border-bottom small ${!n.isRead ? 'bg-light fw-medium' : ''}`}
                      onClick={() => markAsRead(n.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex justify-content-between text-dark">
                        <span className="fw-bold">{n.title}</span>
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-secondary mt-1">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 text-center border-top bg-light">
                <Link
                  to="/notifications"
                  className="btn btn-sm btn-link text-decoration-none"
                  onClick={() => setShowNotifications(false)}
                >
                  View all in Notification Center
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

        {/* Proper Logged-in User Header Chip */}
        <div
          className="d-flex align-items-center gap-1 gap-sm-2 px-2 py-1 rounded-pill bg-white bg-opacity-10 border border-white border-opacity-20 shadow-sm flex-shrink-0"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          {/* User Initial Avatar */}
          <div
            className="rounded-circle bg-gold text-dark d-flex align-items-center justify-content-center fw-bold shadow-sm flex-shrink-0"
            style={{ width: 26, height: 26, fontSize: '0.75rem' }}
          >
            {(user?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
          </div>

          {/* User Name & Role */}
          <div className="d-flex flex-column text-start lh-1" style={{ maxWidth: 130 }}>
            <span
              className="fw-bold text-white text-truncate"
              style={{ fontSize: '0.78rem', letterSpacing: '0.01em' }}
              title={user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username || 'Admin'}
            >
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username || 'Admin'}
            </span>
            <span
              className="badge bg-gold text-dark fw-bold font-monospace text-truncate mt-1 px-1 py-0"
              style={{ fontSize: '0.58rem', width: 'fit-content', maxWidth: 120 }}
            >
              {(user?.roleName || 'ADMIN').replace(/_/g, ' ')}
            </span>
          </div>

          {/* Logout Button */}
          <button
            className="btn btn-danger btn-sm rounded-circle p-1 ms-1 d-flex align-items-center justify-content-center shadow-sm text-white flex-shrink-0"
            onClick={logout}
            title="Sign Out"
            style={{ width: 24, height: 24 }}
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </header>
  );
};
