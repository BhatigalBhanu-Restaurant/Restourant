import React from 'react';
import { usePermission } from '../context/PermissionContext';

interface PermissionGateProps {
  permission: string | string[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  requireAll = false,
  children,
  fallback = null
}) => {
  const { can, canAny, canAll } = usePermission();

  const isAllowed = Array.isArray(permission)
    ? (requireAll ? canAll(permission) : canAny(permission))
    : can(permission);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// --- DATA TABLE ---
interface Column<T> {
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  width?: string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchField?: (row: T) => string;
  actions?: (row: T) => React.ReactNode;
  exportFileName?: string;
  compact?: boolean;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  searchPlaceholder = 'Search records...',
  searchField,
  actions,
  compact = false
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  const filteredData = React.useMemo(() => {
    if (!search) return data;
    return data.filter(row => {
      if (searchField) {
        return searchField(row).toLowerCase().includes(search.toLowerCase());
      }
      return JSON.stringify(row).toLowerCase().includes(search.toLowerCase());
    });
  }, [data, search, searchField]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const minTableWidth = compact
    ? `${Math.max(400, columns.length * 80)}px`
    : `${Math.max(650, columns.length * 130)}px`;

  return (
    <div className="card shadow-sm border-0 w-100" style={{ minWidth: 0 }}>
      <div className={`card-header bg-white ${compact ? 'p-1.5 px-2.5' : 'p-2 p-sm-3'} border-bottom d-flex flex-column flex-sm-row gap-2 justify-content-between align-items-sm-center`}>
        <div className="input-group input-group-sm w-100" style={{ maxWidth: compact ? 260 : 340 }}>
          <input
            type="text"
            className="form-control"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
          {search && (
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setSearch('')}>
              ✕
            </button>
          )}
        </div>
        <div className="text-muted small align-self-start align-self-sm-auto" style={{ fontSize: compact ? '0.75rem' : undefined }}>
          Showing {filteredData.length} records
        </div>
      </div>

      <div className="table-responsive" style={{ WebkitOverflowScrolling: 'touch', minHeight: paginatedData.length === 0 ? 'auto' : '120px' }}>
        <table className={`table ${compact ? 'table-sm' : ''} table-hover align-middle mb-0`} style={{ minWidth: minTableWidth }}>
          <thead className="table-light">
            <tr>
              {columns.map((col, idx) => {
                const h = col.header.toLowerCase();
                const acc = typeof col.accessor === 'string' ? (col.accessor as string).toLowerCase() : '';
                const isDesc = h.includes('desc') || h.includes('narration') || h.includes('remark') || h.includes('note') || h.includes('detail') || h.includes('reason') ||
                               acc.includes('desc') || acc.includes('narration') || acc.includes('remark') || acc.includes('note');
                return (
                  <th
                    key={idx}
                    style={{
                      width: col.width,
                      minWidth: col.width ? undefined : isDesc ? '200px' : compact ? '70px' : '120px',
                      fontSize: compact ? '0.76rem' : '0.82rem',
                      padding: compact ? '4px 6px' : undefined,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {col.header}
                  </th>
                );
              })}
              {actions && (
                <th style={{
                  width: compact ? 160 : 110,
                  minWidth: compact ? '140px' : '100px',
                  textAlign: 'end',
                  fontSize: compact ? '0.76rem' : '0.82rem',
                  padding: compact ? '4px 6px' : undefined,
                  whiteSpace: 'nowrap'
                }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center p-4 text-muted">
                  No records found.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => (
                <tr key={row.id || rIdx}>
                  {columns.map((col, cIdx) => {
                    const h = col.header.toLowerCase();
                    const acc = typeof col.accessor === 'string' ? (col.accessor as string).toLowerCase() : '';
                    const isDesc = h.includes('desc') || h.includes('narration') || h.includes('remark') || h.includes('note') || h.includes('detail') || h.includes('reason') ||
                                   acc.includes('desc') || acc.includes('narration') || acc.includes('remark') || acc.includes('note');
                    const val = typeof col.accessor === 'function' ? col.accessor(row) : (row[col.accessor as keyof T] as any);
                    return (
                      <td
                        key={cIdx}
                        style={{
                          fontSize: compact ? '0.78rem' : '0.85rem',
                          padding: compact ? '4px 6px' : undefined,
                          whiteSpace: isDesc ? 'nowrap' : undefined,
                          minWidth: isDesc ? '200px' : undefined
                        }}
                      >
                        {isDesc && typeof val === 'string' ? (
                          <span
                            className="text-truncate d-inline-block text-secondary"
                            style={{ maxWidth: 380, verticalAlign: 'middle' }}
                            title={val}
                          >
                            {val || '-'}
                          </span>
                        ) : (
                          val
                        )}
                      </td>
                    );
                  })}
                  {actions && (
                    <td className="text-end" style={{
                      whiteSpace: 'nowrap',
                      padding: compact ? '4px 6px' : undefined
                    }}>
                      <div className="d-flex justify-content-end gap-1">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="card-footer bg-white border-top p-2 px-3 d-flex flex-column flex-sm-row gap-2 justify-content-between align-items-center">
          <span className="small text-muted">
            Page {currentPage} of {totalPages}
          </span>
          <div className="btn-group btn-group-sm">
            <button
              className="btn btn-outline-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="btn btn-outline-secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- MODAL WRAPPER ---
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ isOpen, onClose, title, size, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060, overflowY: 'auto' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size && size !== 'md' ? `modal-${size}` : ''} mx-auto my-2 my-sm-4`}
        style={{
          maxWidth: size === 'xl' ? 1140 : size === 'lg' ? 800 : size === 'sm' ? 400 : 520,
          width: 'calc(100% - 1rem)'
        }}
      >
        <div className="modal-content shadow-lg border-0" style={{ borderRadius: '14px', overflow: 'hidden' }}>
          <div className="modal-header bg-light border-bottom p-3">
            <h5 className="modal-title fw-bold text-dark fs-6 fs-sm-5 text-truncate" title={title}>{title}</h5>
            <button type="button" className="btn-close ms-2" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body p-3 p-sm-4" style={{ maxHeight: 'calc(85vh - 120px)', overflowY: 'auto', overflowX: 'hidden' }}>
            {children}
          </div>
          {footer && <div className="modal-footer bg-light border-top p-2 p-sm-3 d-flex flex-wrap gap-2 justify-content-end">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

// --- CONFIRM DIALOG ---
export const ConfirmDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
}> = ({ isOpen, onClose, onConfirm, title, message, confirmVariant = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn btn-${confirmVariant} btn-sm`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Confirm
          </button>
        </>
      }
    >
      <p className="mb-0 text-secondary">{message}</p>
    </Modal>
  );
};

// --- STAT WIDGET ---
export const StatWidget: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'info' | 'danger';
}> = ({ title, value, subtitle, icon, variant = 'primary' }) => {
  return (
    <div className="card shadow-sm border-0 h-100">
      <div className="card-body p-3 d-flex align-items-center justify-content-between">
        <div>
          <span className="small text-uppercase text-muted fw-bold" style={{ letterSpacing: '0.04em' }}>
            {title}
          </span>
          <h3 className="fw-bold mb-0 mt-1 text-dark">{value}</h3>
          {subtitle && <small className="text-muted">{subtitle}</small>}
        </div>
        <div className={`p-3 rounded-circle bg-${variant}-subtle text-${variant} d-flex align-items-center justify-content-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
