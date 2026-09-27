import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { DataTable, Modal } from '../../components/PermissionGate';
import { AuditLog } from '../../types';
import { Eye, RefreshCw } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = async () => {
    try {
      const q = selectedModule ? `?module=${selectedModule}` : '';
      const res: any = await apiClient.get(`/system/audit-logs${q}`);
      if (res.success) setLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedModule]);

  return (
    <div className="d-flex flex-column gap-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Immutable System Audit Trails</h4>
          <p className="text-muted small mb-0">Track all operational mutations, user actions, IP addresses, and state before/after diffs</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: 180 }}
            value={selectedModule}
            onChange={e => setSelectedModule(e.target.value)}
          >
            <option value="">All Active Modules</option>
            <option value="Auth">Authentication</option>
            <option value="Functions">Functions & Banquet</option>
            <option value="Daily Menu">Daily Menu</option>
            <option value="Masters">Catalog Masters</option>
            <option value="Users & Roles">Users & Roles</option>
            <option value="Settings">Store Settings</option>
            <option value="System Control">System Control</option>
          </select>
          <button className="btn btn-outline-secondary btn-sm" onClick={loadLogs} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <DataTable<AuditLog>
        columns={[
          {
            header: 'Timestamp',
            accessor: (row) => new Date(row.timestamp).toLocaleString(),
            width: 180
          },
          {
            header: 'User Identity',
            accessor: (row) => (
              <div>
                <span className="fw-bold text-dark">{row.username || 'System'}</span>
                <div className="small text-muted font-monospace">{row.ipAddress || '127.0.0.1'}</div>
              </div>
            )
          },
          {
            header: 'Module / Submodule',
            accessor: (row) => (
              <div>
                <span className="badge bg-light text-dark border me-1">{row.module}</span>
                {row.submodule && <small className="text-muted">{row.submodule}</small>}
              </div>
            )
          },
          {
            header: 'Action Mutated',
            accessor: (row) => <span className="font-monospace small text-primary fw-bold">{row.action}</span>
          }
        ]}
        data={logs}
        searchPlaceholder="Search audit logs..."
        actions={(row) => (
          <button
            className="btn btn-outline-primary btn-sm p-1 px-2 d-flex align-items-center gap-1"
            onClick={() => setSelectedLog(row)}
            title="Inspect Data Mutation Diff"
          >
            <Eye size={14} /> Inspect
          </button>
        )}
      />

      {/* INSPECT LOG MODAL */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Record: ${selectedLog?.action} (${selectedLog?.module})`}
        size="lg"
      >
        {selectedLog && (
          <div className="d-flex flex-column gap-3">
            <div className="row g-2 small bg-light p-2 rounded border">
              <div className="col-6"><strong>User:</strong> {selectedLog.username}</div>
              <div className="col-6"><strong>IP Address:</strong> {selectedLog.ipAddress || '127.0.0.1'}</div>
              <div className="col-6"><strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toLocaleString()}</div>
              <div className="col-6"><strong>Target Record ID:</strong> {selectedLog.recordId || 'N/A'}</div>
            </div>

            {selectedLog.oldValue && (
              <div>
                <span className="fw-bold small text-danger d-block mb-1">Previous State (Before):</span>
                <pre className="p-2 bg-light border rounded small overflow-auto text-dark" style={{ maxHeight: 150 }}>
                  {JSON.stringify(selectedLog.oldValue, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.newValue && (
              <div>
                <span className="fw-bold small text-success d-block mb-1">Mutated State (After):</span>
                <pre className="p-2 bg-light border rounded small overflow-auto text-dark" style={{ maxHeight: 150 }}>
                  {JSON.stringify(selectedLog.newValue, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export const SystemControlPage: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<string>('ONLINE');
  const [reason, setReason] = useState<string>('');
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);

  const loadStatus = async () => {
    try {
      const res: any = await apiClient.get('/system/system-control/status');
      if (res.success && res.data) {
        setSystemStatus(res.data.status);
        setMaintenanceLogs(res.data.recentMaintenance || []);
      }
    } catch (err) {
      console.error('Failed to load system status:', err);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSwitchStatus = async (status: string) => {
    const confirmation = window.prompt(`Type 'CONFIRM' to switch system state to: ${status}`);
    if (confirmation !== 'CONFIRM') return;

    try {
      await apiClient.post('/system/system-control/status', {
        status,
        reason: reason || `Admin manual switch to ${status}`
      });
      alert(`System operational mode switched to ${status}!`);
      setReason('');
      loadStatus();
    } catch (err: any) {
      alert(err.message || 'Status switch failed.');
    }
  };

  const getBadgeVariant = (s: string) => {
    switch (s) {
      case 'ONLINE': return 'success';
      case 'MAINTENANCE': return 'warning';
      case 'EMERGENCY_LOCKDOWN': return 'danger';
      case 'READ_ONLY': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      {/* Header */}
      <div>
        <h4 className="fw-bold mb-1 text-dark">Mission-Critical System Control & Operational Switchboard</h4>
        <p className="text-muted small mb-0">System status toggle, maintenance modes, read-only mode, and emergency lockdown controls</p>
      </div>

      {/* Status Hero Card */}
      <div className={`card shadow-sm border-2 border-${getBadgeVariant(systemStatus)}`}>
        <div className="card-body p-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <span className="small text-uppercase text-muted fw-bold">Live System State</span>
            <div className="d-flex align-items-center gap-3 mt-1">
              <span className={`badge bg-${getBadgeVariant(systemStatus)} fs-4 px-3 py-2 font-monospace`}>
                {systemStatus}
              </span>
              <span className="text-secondary small">
                {systemStatus === 'ONLINE' && 'All API routes, POS terminals, and kitchen operations are fully operational.'}
                {systemStatus === 'MAINTENANCE' && 'System is undergoing maintenance. Non-administrative write requests are paused.'}
                {systemStatus === 'EMERGENCY_LOCKDOWN' && 'EMERGENCY LOCKDOWN ACTIVE. All mutations are strictly forbidden.'}
                {systemStatus === 'READ_ONLY' && 'System is in Read-Only mode. Users may inspect data but cannot create/edit records.'}
              </span>
            </div>
          </div>

          <div className="d-flex flex-column gap-2" style={{ minWidth: 260 }}>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Reason for mode change..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className="btn-group">
              <button
                className={`btn btn-sm ${systemStatus === 'ONLINE' ? 'btn-success fw-bold' : 'btn-outline-success'}`}
                onClick={() => handleSwitchStatus('ONLINE')}
              >
                ONLINE
              </button>
              <button
                className={`btn btn-sm ${systemStatus === 'MAINTENANCE' ? 'btn-warning fw-bold text-dark' : 'btn-outline-warning'}`}
                onClick={() => handleSwitchStatus('MAINTENANCE')}
              >
                MAINTENANCE
              </button>
              <button
                className={`btn btn-sm ${systemStatus === 'READ_ONLY' ? 'btn-info fw-bold' : 'btn-outline-info'}`}
                onClick={() => handleSwitchStatus('READ_ONLY')}
              >
                READ-ONLY
              </button>
              <button
                className={`btn btn-sm ${systemStatus === 'EMERGENCY_LOCKDOWN' ? 'btn-danger fw-bold' : 'btn-outline-danger'}`}
                onClick={() => handleSwitchStatus('EMERGENCY_LOCKDOWN')}
              >
                LOCKDOWN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance History */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white p-3 border-bottom">
          <h6 className="fw-bold mb-0 text-dark">System Status Transition History</h6>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Timestamp</th>
                <th>Mode Set</th>
                <th>Reason / Justification</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center p-4 text-muted small">No maintenance logs found.</td>
                </tr>
              ) : (
                maintenanceLogs.map((l, idx) => (
                  <tr key={idx}>
                    <td className="small">{new Date(l.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={`badge bg-${getBadgeVariant(l.status)}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="text-dark small">{l.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
