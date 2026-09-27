import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { usePermission } from '../../context/PermissionContext';
import { StatWidget } from '../../components/PermissionGate';
import {
  CalendarCheck,
  Calendar,
  Database,
  UserCog,
  Settings,
  Server,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { appCache } from '../../api/cache';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

export const DashboardPage: React.FC = () => {
  const { can } = usePermission();
  const cachedMetrics = appCache.get('/dashboard/metrics')?.data || appCache.get('/dashboard/metrics');
  const [metrics, setMetrics] = useState<any>(() => cachedMetrics || null);
  const [loading, setLoading] = useState(!cachedMetrics);

  const fetchMetrics = async (forceFresh = false) => {
    try {
      const config = forceFresh ? { forceFresh: true } : undefined;
      const res: any = await apiClient.get('/dashboard/metrics', config);
      if (res.success && res.data) {
        setMetrics(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(true);
  }, []);

  useAutoRefresh(() => fetchMetrics(true), {
    intervalMs: 5000,
    refreshOnFocus: true
  });

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status" />
        <div className="mt-2 text-muted">Loading ERP dashboard metrics...</div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      {/* Top Heritage Welcome Banner */}
      <div className="card border-0 shadow-sm overflow-hidden" style={{ background: 'linear-gradient(135deg, #7A1B28 0%, #56101B 100%)' }}>
        <div className="card-body p-3 p-sm-4 text-white d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2 gap-sm-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center bg-white shadow-sm flex-shrink-0"
              style={{
                width: '56px',
                height: '56px',
                minWidth: '56px',
                minHeight: '56px',
                border: '2.5px solid var(--brand-gold, #D48B28)',
                padding: '2px',
                boxShadow: '0 3px 10px rgba(0, 0, 0, 0.25)',
                aspectRatio: '1 / 1',
                overflow: 'hidden'
              }}
            >
              <img
                src="/logo.jpg"
                alt="ભાતીગળ ભાણું"
                className="w-100 h-100 rounded-circle flex-shrink-0"
                style={{
                  objectFit: 'cover',
                  aspectRatio: '1 / 1',
                  borderRadius: '50%',
                  display: 'block'
                }}
              />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h3 className="fw-bold mb-0 text-white fs-4 fs-sm-3">Bhatigal Bhanu</h3>
                <span className="badge bg-gold text-dark fw-bold">Live ERP</span>
              </div>
              <p className="mb-0 text-white-50 small" style={{ fontSize: '0.82rem' }}>
                Traditional Kathiyawadi & Gujarati Dining • Real-Time Operations Console
              </p>
            </div>
          </div>
          <div className="d-flex gap-2 w-100 w-md-auto justify-content-start justify-content-md-end">
            {can('booking.view') && (
              <Link to="/bookings" className="btn btn-gold btn-sm d-flex align-items-center gap-1 shadow fw-bold px-3">
                <CalendarCheck size={16} /> Function Locker
              </Link>
            )}
            {can('daily_menu.view') && (
              <Link to="/daily-menu" className="btn btn-outline-light btn-sm d-flex align-items-center gap-1 shadow px-3">
                <Calendar size={16} /> Daily Menu
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* KPI Widgets Grid - Strictly for Active Modules */}
      <div className="row g-3">
        {/* 1. Functions / Bookings Today */}
        {can('booking.view') && (
          <div className="col-12 col-sm-6 col-xl-3">
            <StatWidget
              title="Today's Functions"
              value={metrics?.todayBookingsCount || 0}
              subtitle="Confirmed reserved functions"
              icon={<CalendarCheck size={24} />}
              variant="warning"
            />
          </div>
        )}

        {/* 2. Daily Menu Status */}
        {can('daily_menu.view') && (
          <div className="col-12 col-sm-6 col-xl-3">
            <StatWidget
              title="Active Daily Menu"
              value={metrics?.dailyMenuItemsCount || 0}
              subtitle={`${metrics?.currentDay || 'Active Day'} rotation items`}
              icon={<Calendar size={24} />}
              variant="primary"
            />
          </div>
        )}

        {/* 3. Catalog Master Dishes */}
        {can('masters.menu.view') && (
          <div className="col-12 col-sm-6 col-xl-3">
            <StatWidget
              title="Catalog Dishes"
              value={metrics?.catalogDishesCount || 0}
              subtitle="Kathiyawadi dishes configured"
              icon={<Database size={24} />}
              variant="success"
            />
          </div>
        )}

        {/* 4. Active ERP Users */}
        {can('users.view') && (
          <div className="col-12 col-sm-6 col-xl-3">
            <StatWidget
              title="Active ERP Users"
              value={metrics?.activeUsersCount || 0}
              subtitle="Staff & manager roles"
              icon={<UserCog size={24} />}
              variant="info"
            />
          </div>
        )}
      </div>

      {/* Functions & Operations Overview */}
      <div className="row g-3">
        {/* Upcoming Reserved Functions */}
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white p-3 border-bottom d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <CalendarCheck size={18} className="text-primary" />
                <h6 className="fw-bold mb-0 text-dark">Upcoming Reserved Functions</h6>
              </div>
              <Link to="/bookings" className="btn btn-sm btn-link text-decoration-none text-primary p-0">
                View Function Locker &rarr;
              </Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ fontSize: '0.85rem' }}>Date</th>
                      <th style={{ fontSize: '0.85rem' }}>Host Name</th>
                      <th style={{ fontSize: '0.85rem' }}>Phone</th>
                      <th style={{ fontSize: '0.85rem' }} className="text-center">Guests</th>
                      <th style={{ fontSize: '0.85rem' }} className="text-end">Advance (₹)</th>
                      <th style={{ fontSize: '0.85rem' }} className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics?.recentBookings || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-4 text-muted small">
                          No upcoming functions booked yet.
                        </td>
                      </tr>
                    ) : (
                      metrics.recentBookings.map((b: any, idx: number) => (
                        <tr key={idx}>
                          <td className="fw-semibold small text-primary">{b.bookingDate}</td>
                          <td className="fw-medium small">{b.customerName}</td>
                          <td className="small text-muted">{b.customerPhone}</td>
                          <td className="text-center small">{b.guestCount}</td>
                          <td className="text-end fw-bold small text-success">₹{(b.advanceAmount || 0).toLocaleString()}</td>
                          <td className="text-center">
                            <span className="badge bg-success-subtle text-success border border-success-subtle">
                              {b.status || 'CONFIRMED'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Module Shortcuts - Only Active Modules */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white p-3 border-bottom">
              <h6 className="fw-bold mb-0 text-dark">Quick Operations</h6>
            </div>
            <div className="card-body p-3 d-flex flex-column gap-2">
              <Link to="/daily-menu" className="p-2 px-3 rounded border text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                <div className="d-flex align-items-center gap-2">
                  <Calendar size={18} className="text-warning" />
                  <span className="fw-semibold small">Daily Kathiyawadi Menu</span>
                </div>
                <ArrowRight size={14} className="text-muted" />
              </Link>
              <Link to="/bookings" className="p-2 px-3 rounded border text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                <div className="d-flex align-items-center gap-2">
                  <CalendarCheck size={18} className="text-success" />
                  <span className="fw-semibold small">Function Date Locker</span>
                </div>
                <ArrowRight size={14} className="text-muted" />
              </Link>
              <Link to="/masters" className="p-2 px-3 rounded border text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                <div className="d-flex align-items-center gap-2">
                  <Database size={18} className="text-primary" />
                  <span className="fw-semibold small">Catalog Masters (Dishes & Items)</span>
                </div>
                <ArrowRight size={14} className="text-muted" />
              </Link>
              <Link to="/users-roles" className="p-2 px-3 rounded border text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                <div className="d-flex align-items-center gap-2">
                  <UserCog size={18} className="text-info" />
                  <span className="fw-semibold small">User Roles & Access Matrix</span>
                </div>
                <ArrowRight size={14} className="text-muted" />
              </Link>
              <Link to="/settings" className="p-2 px-3 rounded border text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                <div className="d-flex align-items-center gap-2">
                  <Settings size={18} className="text-secondary" />
                  <span className="fw-semibold small">Store & Slip Settings</span>
                </div>
                <ArrowRight size={14} className="text-muted" />
              </Link>
              <Link to="/system-control" className="p-2 px-3 rounded border text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                <div className="d-flex align-items-center gap-2">
                  <Server size={18} className="text-danger" />
                  <span className="fw-semibold small">Emergency Control</span>
                </div>
                <ArrowRight size={14} className="text-muted" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="alert alert-light border shadow-sm d-flex align-items-center justify-content-between p-3 rounded mb-0">
        <div className="d-flex align-items-center gap-3">
          <div className="p-2 bg-success-subtle text-success rounded-circle flex-shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
              Bhatigal Bhanu ERP • Live Operational Console
            </div>
            <div className="text-muted small">
              Real-time socket synchronization is active. All banquet bookings, menus, and roles are synchronized in real time.
            </div>
          </div>
        </div>
        <Link to="/settings" className="btn btn-outline-secondary btn-sm fw-semibold text-nowrap d-none d-sm-inline-flex">
          Configure Store
        </Link>
      </div>
    </div>
  );
};
