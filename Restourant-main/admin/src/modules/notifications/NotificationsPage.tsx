import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { usePermission } from '../../context/PermissionContext';
import { DataTable, Modal } from '../../components/PermissionGate';
import { SystemNotification } from '../../types';
import { Plus, CheckCheck } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { can } = usePermission();
  const { notifications, markAsRead, markAllAsRead, fetchNotifications } = useNotification();

  // Send Broadcast Modal
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
    title: '',
    message: '',
    type: 'INFO'
  });

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/system/notifications', sendForm);
      alert('System notification broadcasted.');
      setIsSendModalOpen(false);
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Broadcast failed.');
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h4 className="fw-bold mb-1 text-dark">Notification Center & Broadcasts</h4>
          <p className="text-muted small mb-0">System alerts, operational notifications, and staff broadcast messages</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm" onClick={markAllAsRead}>
            <CheckCheck size={16} /> Mark All as Read
          </button>
          {can('notification.send') && (
            <button className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm" onClick={() => setIsSendModalOpen(true)}>
              <Plus size={16} /> Send Broadcast
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <DataTable<SystemNotification>
        columns={[
          {
            header: 'Notification Title',
            accessor: (row) => (
              <div>
                <span className={`fw-bold ${row.isRead ? 'text-secondary' : 'text-dark'}`}>{row.title}</span>
                <div className="small text-muted">{row.message}</div>
              </div>
            )
          },
          {
            header: 'Type',
            accessor: (row) => <span className="badge bg-light text-dark border">{row.type}</span>
          },
          {
            header: 'Timestamp',
            accessor: (row) => new Date(row.createdAt).toLocaleString()
          },
          {
            header: 'Status',
            accessor: (row) => (
              <span className={`badge ${row.isRead ? 'bg-secondary' : 'bg-primary'}`}>
                {row.isRead ? 'Read' : 'New'}
              </span>
            )
          }
        ]}
        data={notifications}
        searchPlaceholder="Search notifications..."
        actions={(row) => (
          <>
            {!row.isRead && (
              <button className="btn btn-outline-primary btn-sm p-1 px-2" onClick={() => markAsRead(row.id)}>
                Mark Read
              </button>
            )}
          </>
        )}
      />

      {/* SEND BROADCAST MODAL */}
      <Modal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        title="Broadcast System Notification"
      >
        <form onSubmit={handleSendBroadcast} className="d-flex flex-column gap-3">
          <div>
            <label className="form-label small fw-bold">Headline / Title</label>
            <input type="text" className="form-control" placeholder="e.g. Kitchen Maintenance Notice" required value={sendForm.title} onChange={e => setSendForm({ ...sendForm, title: e.target.value })} />
          </div>
          <div>
            <label className="form-label small fw-bold">Alert Type</label>
            <select className="form-select" value={sendForm.type} onChange={e => setSendForm({ ...sendForm, type: e.target.value })}>
              <option value="INFO">Information</option>
              <option value="WARNING">Warning</option>
              <option value="ALERT">Emergency Alert</option>
            </select>
          </div>
          <div>
            <label className="form-label small fw-bold">Detailed Message</label>
            <textarea className="form-control" rows={3} required placeholder="Enter broadcast message body..." value={sendForm.message} onChange={e => setSendForm({ ...sendForm, message: e.target.value })} />
          </div>
          <div className="d-flex justify-content-end gap-2 pt-3 border-top">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsSendModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm fw-bold">Send Broadcast</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

