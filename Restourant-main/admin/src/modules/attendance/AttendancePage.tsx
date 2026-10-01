import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  Sparkles,
  Printer,
  CalendarDays,
  Check,
  X
} from 'lucide-react';

interface EmployeeSummary {
  present: number;
  halfDay: number;
  absent: number;
  weekOff: number;
  paidLeave: number;
  effectiveWorkingDays: number;
}

interface StaffMember {
  id: string;
  employeeCode?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  department?: string;
  phone?: string;
  salaryType?: string;
  attendanceSummary?: EmployeeSummary;
}

interface MonthlyAttendanceData {
  month: string;
  year: number;
  monthNum: number;
  daysInMonth: number;
  today: string;
  employees: StaffMember[];
  attendanceMap: Record<string, Record<string, string>>;
  stats: {
    totalStaff: number;
    todayPresent: number;
    todayAbsent: number;
    avgAttendancePct: number;
  };
}

const MONTH_NAMES_GUJ = [
  'જાન્યુઆરી (January)',
  'ફેબ્રુઆરી (February)',
  'માર્ચ (March)',
  'એપ્રિલ (April)',
  'મે (May)',
  'જૂન (June)',
  'જુલાઈ (July)',
  'ઓગસ્ટ (August)',
  'સપ્ટેમ્બર (September)',
  'ઓક્ટોબર (October)',
  'નવેમ્બર (November)',
  'ડિસેમ્બર (December)'
];

const WEEKDAY_NAMES_GUJ = ['રવિ', 'સોમ', 'મંગળ', 'બુધ', 'ગુરુ', 'શુક્ર', 'શનિ'];

const STATUS_CONFIG: Record<string, { label: string; short: string; color: string; bg: string; border: string }> = {
  PRESENT: { label: 'હાજર (Present)', short: 'P', color: '#166534', bg: '#dcfce7', border: '#86efac' },
  ABSENT: { label: 'ગેરહાજર (Absent)', short: 'A', color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
  HALF_DAY: { label: 'અડધો દિવસ (Half Day)', short: 'HD', color: '#9a3412', bg: '#ffedd5', border: '#fdba74' },
  WEEK_OFF: { label: 'વીક ઓફ (Week Off)', short: 'WO', color: '#1e40af', bg: '#dbeafe', border: '#93c5fd' },
  PAID_LEAVE: { label: 'પેઇડ લીવ (Paid Leave)', short: 'PL', color: '#6b21a8', bg: '#f3e8ff', border: '#d8b4fe' }
};

export const AttendancePage: React.FC = () => {
  const { addToast } = useNotification();

  const todayDateObj = new Date();
  const currentMonthStr = `${todayDateObj.getFullYear()}-${String(todayDateObj.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [data, setData] = useState<MonthlyAttendanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Active cell popover for quick status selection
  const [activeCell, setActiveCell] = useState<{
    empId: string;
    empName: string;
    date: string;
    currentStatus: string;
  } | null>(null);

  // Bulk mark modal state
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkDate, setBulkDate] = useState<string>(todayDateObj.toISOString().split('T')[0]);
  const [bulkStatus, setBulkStatus] = useState<string>('PRESENT');
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);

  // Fetch monthly attendance from API
  const fetchMonthlyData = useCallback(async (monthToFetch: string) => {
    setLoading(true);
    try {
      const res: any = await apiClient.get(`/hr/attendance/monthly?month=${monthToFetch}`);
      const payload = res?.data || res;
      setData(payload);
    } catch (err: any) {
      console.error('Failed to load attendance:', err);
      addToast(err?.response?.data?.message || 'હાજરી ડેટા લોડ કરવામાં ભૂલ આવી.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchMonthlyData(selectedMonth);
  }, [selectedMonth, fetchMonthlyData]);

  // Handle Month Navigation
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    setSelectedMonth(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setSelectedMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(currentMonthStr);
  };

  // Mark single attendance record
  const handleSetStatus = async (empId: string, date: string, status: string) => {
    const cellKey = `${empId}_${date}`;
    setSavingCell(cellKey);
    try {
      await apiClient.post('/hr/attendance/mark', {
        employeeId: empId,
        date: date,
        status: status
      });

      // Optimistic update of local state
      setData(prev => {
        if (!prev) return prev;
        const newMap = { ...prev.attendanceMap };
        if (!newMap[empId]) newMap[empId] = {};

        if (status === 'CLEAR' || status === 'NONE') {
          delete newMap[empId][date];
        } else {
          newMap[empId][date] = status;
        }

        // Recalculate summary for this employee
        const newEmployees = prev.employees.map(emp => {
          if (emp.id !== empId) return emp;
          const records = newMap[empId] || {};
          let p = 0, hd = 0, a = 0, wo = 0, pl = 0;
          for (let d = 1; d <= prev.daysInMonth; d++) {
            const dStr = `${prev.month}-${String(d).padStart(2, '0')}`;
            const st = records[dStr];
            if (st === 'PRESENT') p++;
            else if (st === 'HALF_DAY') hd++;
            else if (st === 'ABSENT') a++;
            else if (st === 'WEEK_OFF') wo++;
            else if (st === 'PAID_LEAVE' || st === 'LEAVE') pl++;
          }
          return {
            ...emp,
            attendanceSummary: {
              present: p,
              halfDay: hd,
              absent: a,
              weekOff: wo,
              paidLeave: pl,
              effectiveWorkingDays: p + 0.5 * hd + pl
            }
          };
        });

        return {
          ...prev,
          attendanceMap: newMap,
          employees: newEmployees
        };
      });

      setActiveCell(null);
    } catch (err: any) {
      console.error('Failed to mark attendance:', err);
      addToast('હાજરી અપડેટ કરવામાં નિષ્ફળ રહી.', 'error');
    } finally {
      setSavingCell(null);
    }
  };

  // Quick cycle status on click
  const handleQuickCycleStatus = (empId: string, date: string, currentStatus: string) => {
    const cycle = ['', 'PRESENT', 'ABSENT', 'HALF_DAY', 'WEEK_OFF', 'PAID_LEAVE'];
    const curIdx = cycle.indexOf(currentStatus || '');
    const nextIdx = (curIdx + 1) % cycle.length;
    const nextStatus = cycle[nextIdx] || 'CLEAR';
    handleSetStatus(empId, date, nextStatus);
  };

  // Bulk mark for a specific day
  const handleBulkMark = async () => {
    setBulkLoading(true);
    try {
      await apiClient.post('/hr/attendance/bulk-mark', {
        date: bulkDate,
        status: bulkStatus
      });
      addToast(`તારીખ ${bulkDate} માટે બધા સ્ટાફની હાજરી સફળતાપૂર્વક નોંધી લેવાઈ.`, 'success');
      setShowBulkModal(false);
      fetchMonthlyData(selectedMonth);
    } catch (err: any) {
      console.error('Bulk mark failed:', err);
      addToast('બલ્ક હાજરી નોંધવામાં ભૂલ આવી.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  // Mark all present today
  const handleMarkAllPresentToday = async () => {
    const todayStr = data?.today || todayDateObj.toISOString().split('T')[0];
    if (!window.confirm(`શું તમે આજના દિવસે (${todayStr}) બધા સ્ટાફને 'હાજર (Present)' કરવા માંગો છો?`)) {
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/hr/attendance/bulk-mark', {
        date: todayStr,
        status: 'PRESENT'
      });
      addToast('આજના બધા સ્ટાફની હાજરી સફળતાપૂર્વક નોંધાઈ ગઈ!', 'success');
      fetchMonthlyData(selectedMonth);
    } catch (err: any) {
      console.error(err);
      addToast('હાજરી નોંધવામાં ભૂલ આવી.', 'error');
      setLoading(false);
    }
  };

  // Days metadata array for the current month
  const daysArray = useMemo(() => {
    if (!data) return [];
    const list = [];
    const [year, month] = data.month.split('-').map(Number);
    for (let d = 1; d <= data.daysInMonth; d++) {
      const dateStr = `${data.month}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      list.push({
        dayNum: d,
        dateStr,
        dayOfWeek,
        dayName: WEEKDAY_NAMES_GUJ[dayOfWeek],
        isSunday: dayOfWeek === 0,
        isToday: dateStr === data.today
      });
    }
    return list;
  }, [data]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    if (!searchQuery.trim()) return data.employees;
    const q = searchQuery.toLowerCase().trim();
    return data.employees.filter(emp => {
      const name = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).toLowerCase();
      const code = (emp.employeeCode || '').toLowerCase();
      const role = (emp.role || '').toLowerCase();
      const phone = (emp.phone || '').toLowerCase();
      return name.includes(q) || code.includes(q) || role.includes(q) || phone.includes(q);
    });
  }, [data, searchQuery]);

  // Parse current selected year and month
  const [selectedYear, selectedMonthNum] = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return [y, m];
  }, [selectedMonth]);

  return (
    <div className="container-fluid py-3 px-3 px-md-4">
      {/* 1. Header & Title */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 pb-2 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2">
            <div className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary">
              <CalendarDays size={24} className="text-primary" />
            </div>
            <div>
              <h4 className="fw-bold mb-0 text-dark" style={{ letterSpacing: '-0.02em' }}>
                કર્મચારી હાજરી પત્રક (Monthly Staff Attendance)
              </h4>
              <p className="text-muted small mb-0">
                દરેક સ્ટાફની આખા મહિનાની દિવસવાર હાજરી, રજા અને કામના દિવસોનું રજિસ્ટર
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            onClick={handleMarkAllPresentToday}
            className="btn btn-success d-flex align-items-center gap-1.5 shadow-sm px-3 fw-medium"
            style={{ fontSize: '0.88rem' }}
            title="આજના દિવસ માટે બધા કર્મચારીઓને હાજર માર્ક કરો"
          >
            <Sparkles size={16} />
            <span>આજના બધા હાજર (Mark All Present)</span>
          </button>

          <button
            onClick={() => setShowBulkModal(true)}
            className="btn btn-outline-primary d-flex align-items-center gap-1.5 px-3"
            style={{ fontSize: '0.88rem' }}
          >
            <Clock size={16} />
            <span>તારીખ મુજબ હાજરી પૂરો</span>
          </button>

          <button
            onClick={() => fetchMonthlyData(selectedMonth)}
            disabled={loading}
            className="btn btn-outline-secondary d-flex align-items-center gap-1 px-2.5"
            title="રિફ્રેશ કરો"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Month Selector & Quick Stats Bar */}
      <div className="row g-3 mb-3">
        {/* Month Navigator */}
        <div className="col-12 col-xl-5">
          <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 d-flex flex-column justify-content-center">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <button
                onClick={handlePrevMonth}
                className="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center border"
                style={{ width: '36px', height: '36px' }}
                title="પાછલો મહિનો (Previous Month)"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="d-flex align-items-center gap-2">
                {/* Month Dropdown */}
                <select
                  value={selectedMonthNum}
                  onChange={(e) => {
                    const newM = String(e.target.value).padStart(2, '0');
                    setSelectedMonth(`${selectedYear}-${newM}`);
                  }}
                  className="form-select form-select-sm fw-bold border-primary text-primary"
                  style={{ minWidth: '170px' }}
                >
                  {MONTH_NAMES_GUJ.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>

                {/* Year Dropdown */}
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const newY = e.target.value;
                    setSelectedMonth(`${newY}-${String(selectedMonthNum).padStart(2, '0')}`);
                  }}
                  className="form-select form-select-sm fw-bold"
                  style={{ minWidth: '90px' }}
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleNextMonth}
                className="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center border"
                style={{ width: '36px', height: '36px' }}
                title="આગલો મહિનો (Next Month)"
              >
                <ChevronRight size={18} />
              </button>

              {selectedMonth !== currentMonthStr && (
                <button
                  onClick={handleCurrentMonth}
                  className="btn btn-sm btn-outline-primary ms-1"
                  style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                >
                  આ મહિનો
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="col-12 col-xl-7">
          <div className="row g-2">
            <div className="col-6 col-md-3">
              <div className="card border-0 shadow-sm rounded-3 p-2.5 bg-white h-100">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-2 bg-light text-primary">
                    <Users size={16} />
                  </div>
                  <span className="text-muted small fw-medium">કુલ સ્ટાફ</span>
                </div>
                <div className="fs-5 fw-bold text-dark ps-1">
                  {data?.stats?.totalStaff ?? 0}
                  <span className="fs-7 text-muted fw-normal ms-1">કર્મચારી</span>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-3">
              <div className="card border-0 shadow-sm rounded-3 p-2.5 bg-white h-100">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-2 bg-success bg-opacity-10 text-success">
                    <UserCheck size={16} />
                  </div>
                  <span className="text-muted small fw-medium">આજની હાજરી</span>
                </div>
                <div className="fs-5 fw-bold text-success ps-1">
                  {data?.stats?.todayPresent ?? 0}
                  <span className="fs-7 text-muted fw-normal ms-1">હાજર</span>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-3">
              <div className="card border-0 shadow-sm rounded-3 p-2.5 bg-white h-100">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-2 bg-danger bg-opacity-10 text-danger">
                    <UserX size={16} />
                  </div>
                  <span className="text-muted small fw-medium">ગેરહાજર</span>
                </div>
                <div className="fs-5 fw-bold text-danger ps-1">
                  {data?.stats?.todayAbsent ?? 0}
                  <span className="fs-7 text-muted fw-normal ms-1">આજે</span>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-3">
              <div className="card border-0 shadow-sm rounded-3 p-2.5 bg-white h-100">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-2 bg-warning bg-opacity-10 text-warning">
                    <Calendar size={16} />
                  </div>
                  <span className="text-muted small fw-medium">સરેરાશ હાજરી</span>
                </div>
                <div className="fs-5 fw-bold text-dark ps-1">
                  {data?.stats?.avgAttendancePct ?? 0}%
                  <span className="fs-7 text-muted fw-normal ms-1">માસિક</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Status Legend */}
      <div className="card border-0 shadow-sm rounded-3 p-3 bg-white mb-3">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          {/* Search Input */}
          <div className="position-relative" style={{ maxWidth: '350px', width: '100%' }}>
            <Search
              size={16}
              className="position-absolute text-muted"
              style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="નામ, કોડ, હોદ્દો અથવા ફોન દ્વારા શોધો..."
              className="form-control form-control-sm ps-5 rounded-2"
              style={{ fontSize: '0.85rem' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="btn btn-link btn-sm position-absolute text-muted p-0 text-decoration-none"
                style={{ right: '10px', top: '50%', transform: 'translateY(-50%)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Legends */}
          <div className="d-flex flex-wrap align-items-center gap-2 text-nowrap" style={{ fontSize: '0.82rem' }}>
            <span className="text-muted fw-semibold me-1">ચિહ્નો (Legends):</span>
            <span className="badge px-2 py-1" style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
              <strong>P</strong> : હાજર (1.0)
            </span>
            <span className="badge px-2 py-1" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
              <strong>A</strong> : ગેરહાજર (0)
            </span>
            <span className="badge px-2 py-1" style={{ backgroundColor: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' }}>
              <strong>HD</strong> : અડધો દિવસ (0.5)
            </span>
            <span className="badge px-2 py-1" style={{ backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }}>
              <strong>WO</strong> : વીક ઓફ
            </span>
            <span className="badge px-2 py-1" style={{ backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe' }}>
              <strong>PL</strong> : પેઇડ લીવ (1.0)
            </span>
            <span className="badge px-2 py-1 bg-light text-muted border">
              <strong>-</strong> : ખાલી (ક્લિક કરી બદલો)
            </span>
          </div>
        </div>
      </div>

      {/* 4. Monthly Attendance Matrix Table */}
      <div className="card border-0 shadow-sm rounded-3 overflow-hidden bg-white">
        {loading ? (
          <div className="py-5 text-center">
            <div className="spinner-border text-primary mb-2" role="status" />
            <p className="text-muted small mb-0">હાજરી પત્રક લોડ થઈ રહ્યું છે...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-5 text-center">
            <Users size={40} className="text-muted opacity-50 mb-2" />
            <h6 className="fw-bold text-dark">કોઈ સ્ટાફ મળ્યો નથી</h6>
            <p className="text-muted small mb-3">
              નવા સ્ટાફ ઉમેરવા માટે 'Staff & Salary' મોડ્યુલમાં જઈને સ્ટાફ ઉમેરો. તે અહીં આપોઆપ આવી જશે.
            </p>
          </div>
        ) : (
          <div className="table-responsive" style={{ maxHeight: '72vh' }}>
            <table className="table table-bordered table-hover align-middle mb-0 text-center" style={{ fontSize: '0.8rem' }}>
              <thead className="table-light sticky-top bg-light" style={{ zIndex: 3 }}>
                <tr>
                  {/* Left Sticky Headers */}
                  <th
                    className="position-sticky start-0 bg-light text-start border-end"
                    style={{ minWidth: '190px', width: '190px', zIndex: 4, left: 0 }}
                  >
                    કર્મચારીનું નામ (Staff Name)
                  </th>

                  {/* Days 1 to 28/29/30/31 */}
                  {daysArray.map(day => (
                    <th
                      key={day.dayNum}
                      style={{
                        minWidth: '36px',
                        width: '36px',
                        padding: '6px 2px',
                        backgroundColor: day.isToday
                          ? '#fef3c7'
                          : day.isSunday
                          ? '#fee2e2'
                          : undefined
                      }}
                      className={day.isToday ? 'border-primary' : ''}
                      title={`તારીખ: ${day.dateStr} (${day.dayName})`}
                    >
                      <div className="fw-bold" style={{ fontSize: '0.85rem', color: day.isSunday ? '#dc2626' : undefined }}>
                        {day.dayNum}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.65rem' }}>
                        {day.dayName}
                      </div>
                    </th>
                  ))}

                  {/* Right Summary Headers */}
                  <th className="bg-success bg-opacity-10 text-success fw-bold" style={{ minWidth: '50px' }} title="કુલ હાજર દિવસો">
                    P
                  </th>
                  <th className="bg-warning bg-opacity-10 text-warning fw-bold" style={{ minWidth: '50px' }} title="અડધા દિવસો">
                    HD
                  </th>
                  <th className="bg-danger bg-opacity-10 text-danger fw-bold" style={{ minWidth: '50px' }} title="ગેરહાજર">
                    A
                  </th>
                  <th className="bg-info bg-opacity-10 text-info fw-bold" style={{ minWidth: '50px' }} title="વીક ઓફ / રજા">
                    WO
                  </th>
                  <th className="bg-primary bg-opacity-10 text-primary fw-bold" style={{ minWidth: '65px' }} title="કામના માન્ય દિવસો">
                    કુલ દિવસ
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, empIdx) => {
                  const empName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'કર્મચારી';
                  const empRecords = data?.attendanceMap?.[emp.id] || {};
                  const summary = emp.attendanceSummary || {
                    present: 0,
                    halfDay: 0,
                    absent: 0,
                    weekOff: 0,
                    paidLeave: 0,
                    effectiveWorkingDays: 0
                  };

                  return (
                    <tr key={emp.id || empIdx}>
                      {/* Left Sticky Employee Info */}
                      <td
                        className="position-sticky start-0 bg-white text-start border-end shadow-sm"
                        style={{ zIndex: 2, left: 0 }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                            style={{
                              width: '28px',
                              height: '28px',
                              fontSize: '0.75rem',
                              backgroundColor: '#1e3a8a'
                            }}
                          >
                            {empName.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-truncate" style={{ maxWidth: '140px' }}>
                            <div className="fw-semibold text-dark text-truncate" title={empName} style={{ fontSize: '0.84rem' }}>
                              {empName}
                            </div>
                            <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '0.7rem' }}>
                              <span className="badge bg-light text-secondary border px-1 py-0" style={{ fontSize: '0.65rem' }}>
                                {emp.employeeCode || `EMP-${empIdx + 1}`}
                              </span>
                              <span className="text-truncate">{emp.role || emp.department || 'સ્ટાફ'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {daysArray.map(day => {
                        const status = empRecords[day.dateStr] || '';
                        const conf = STATUS_CONFIG[status];
                        const cellKey = `${emp.id}_${day.dateStr}`;
                        const isSaving = savingCell === cellKey;

                        return (
                          <td
                            key={day.dayNum}
                            className="p-0 position-relative"
                            style={{
                              backgroundColor: day.isToday
                                ? '#fffbeb'
                                : day.isSunday
                                ? '#fff5f5'
                                : undefined
                            }}
                          >
                            <button
                              onClick={() => {
                                setActiveCell({
                                  empId: emp.id,
                                  empName: empName,
                                  date: day.dateStr,
                                  currentStatus: status
                                });
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                handleQuickCycleStatus(emp.id, day.dateStr, status);
                              }}
                              disabled={isSaving}
                              className="btn btn-link w-100 h-100 p-0 m-0 border-0 text-decoration-none d-flex align-items-center justify-content-center"
                              style={{
                                minHeight: '34px',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                              title={`${empName} | ${day.dateStr} | ${conf ? conf.label : 'ક્લિક કરી હાજરી પૂરો'}`}
                            >
                              {isSaving ? (
                                <span className="spinner-border spinner-border-sm text-secondary" style={{ width: '12px', height: '12px' }} />
                              ) : conf ? (
                                <span
                                  className="fw-bold rounded-1 d-inline-flex align-items-center justify-content-center"
                                  style={{
                                    width: '26px',
                                    height: '24px',
                                    fontSize: '0.72rem',
                                    backgroundColor: conf.bg,
                                    color: conf.color,
                                    border: `1px solid ${conf.border}`
                                  }}
                                >
                                  {conf.short}
                                </span>
                              ) : (
                                <span className="text-muted opacity-25" style={{ fontSize: '0.8rem' }}>
                                  -
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      {/* Right Summary Columns */}
                      <td className="fw-bold text-success bg-success bg-opacity-10">
                        {summary.present}
                      </td>
                      <td className="fw-semibold text-warning bg-warning bg-opacity-10">
                        {summary.halfDay}
                      </td>
                      <td className="fw-semibold text-danger bg-danger bg-opacity-10">
                        {summary.absent}
                      </td>
                      <td className="text-muted bg-info bg-opacity-10">
                        {summary.weekOff}
                      </td>
                      <td className="fw-bold text-primary bg-primary bg-opacity-10" style={{ fontSize: '0.85rem' }}>
                        {summary.effectiveWorkingDays.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Quick Status Popover Modal */}
      {activeCell && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1055 }}
          onClick={() => setActiveCell(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: '380px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header py-2.5 px-3 bg-light border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <CalendarDays size={18} className="text-primary" />
                  <div>
                    <h6 className="modal-title fw-bold text-dark mb-0" style={{ fontSize: '0.92rem' }}>
                      હાજરી સ્થિતિ પસંદ કરો
                    </h6>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {activeCell.empName} | તારીખ: {activeCell.date}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setActiveCell(null)}
                />
              </div>

              <div className="modal-body p-3">
                <div className="d-grid gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, conf]) => {
                    const isSelected = activeCell.currentStatus === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleSetStatus(activeCell.empId, activeCell.date, key)}
                        className="btn text-start d-flex align-items-center justify-content-between px-3 py-2 rounded-2 transition-all"
                        style={{
                          backgroundColor: isSelected ? conf.bg : '#f8fafc',
                          border: `1.5px solid ${isSelected ? conf.border : '#e2e8f0'}`,
                          color: isSelected ? conf.color : '#334155'
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="fw-bold rounded-1 d-inline-flex align-items-center justify-content-center"
                            style={{
                              width: '28px',
                              height: '26px',
                              fontSize: '0.75rem',
                              backgroundColor: conf.bg,
                              color: conf.color,
                              border: `1px solid ${conf.border}`
                            }}
                          >
                            {conf.short}
                          </span>
                          <span className="fw-semibold" style={{ fontSize: '0.88rem' }}>
                            {conf.label}
                          </span>
                        </div>
                        {isSelected && <Check size={18} className="text-success" />}
                      </button>
                    );
                  })}

                  {/* Clear Button */}
                  <button
                    onClick={() => handleSetStatus(activeCell.empId, activeCell.date, 'CLEAR')}
                    className="btn btn-outline-secondary text-start d-flex align-items-center justify-content-between px-3 py-2 rounded-2 mt-1"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <span>ખાલી કરો / અનમાર્ક (Clear Attendance)</span>
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Bulk Mark Modal */}
      {showBulkModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
          onClick={() => setShowBulkModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header py-3 px-3.5 bg-primary text-white">
                <div className="d-flex align-items-center gap-2">
                  <Sparkles size={18} />
                  <h6 className="modal-title fw-bold mb-0">તારીખ મુજબ બલ્ક હાજરી (Bulk Attendance)</h6>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowBulkModal(false)}
                />
              </div>

              <div className="modal-body p-3.5">
                <p className="text-muted small mb-3">
                  કોઈપણ ચોક્કસ તારીખે બધા સ્ટાફની હાજરી એકસાથે નોંધવા માટે તારીખ અને સ્થિતિ પસંદ કરો:
                </p>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark small">તારીખ પસંદ કરો (Select Date):</label>
                  <input
                    type="date"
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark small">હાજરી સ્થિતિ (Status for All):</label>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="form-select"
                  >
                    <option value="PRESENT">હાજર (Present) - બધા હાજર</option>
                    <option value="WEEK_OFF">વીક ઓફ (Week Off) - રજા</option>
                    <option value="ABSENT">ગેરહાજર (Absent)</option>
                    <option value="HALF_DAY">અડધો દિવસ (Half Day)</option>
                  </select>
                </div>

                <div className="p-2.5 rounded-2 bg-light border text-muted small">
                  <strong>નોંધ:</strong> આ એક્શન દ્વારા પસંદ કરેલી તારીખ માટે હાલના તમામ <strong>{data?.stats?.totalStaff || 0} કર્મચારીઓ</strong>ની હાજરી એકસાથે અપડેટ થશે.
                </div>
              </div>

              <div className="modal-footer py-2 px-3 border-top bg-light">
                <button
                  type="button"
                  className="btn btn-sm btn-light border"
                  onClick={() => setShowBulkModal(false)}
                >
                  રદ કરો
                </button>
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={handleBulkMark}
                  className="btn btn-sm btn-primary d-flex align-items-center gap-1.5"
                >
                  {bulkLoading && <span className="spinner-border spinner-border-sm" />}
                  <span>હાજરી લાગુ કરો (Apply)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
