import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/PermissionGate';
import {
  CalendarDays,
  ClipboardList,
  Plus,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
  ChevronLeft,
  ChevronRight,
  Printer,
  Utensils,
  Search,
  PieChart,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';

type LedgerRow = { key: string; name: string; amount: number; note?: string };
type Totals = { incomeTotal: number; expenseTotal: number; profit: number; days?: number };

interface BookingItem {
  bookingNumber: string;
  customerName: string;
  guestCount: number;
  timeSlot: string;
  status: string;
  totalAmount: number;
  advanceAmount: number;
  isCompleted: boolean;
}

interface BookingStats {
  totalBookings: number;
  completedCount: number;
  functionRevenue: number;
  bookings: BookingItem[];
}

interface CalendarDayRecord {
  date: string;
  dayNumber: number;
  dayName: string;
  isToday: boolean;
  hasRecord: boolean;
  incomeTotal: number;
  expenseTotal: number;
  profit: number;
  functionCount: number;
  functionRevenue: number;
  topExpense?: { name: string; amount: number } | null;
  expensesCount: number;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

interface CategoryBreakdown {
  key: string;
  name: string;
  amount: number;
  count: number;
}

interface MonthlyData {
  month: string;
  totals: {
    incomeTotal: number;
    expenseTotal: number;
    profit: number;
    daysRecorded: number;
    totalDays: number;
    functionCount: number;
    functionRevenue: number;
    avgDailyExpense: number;
    avgDailyIncome: number;
  };
  calendarDays: CalendarDayRecord[];
  expenseCategories: CategoryBreakdown[];
  incomeCategories: CategoryBreakdown[];
  availableMonths: string[];
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const currentMonthStr = () => new Date().toISOString().slice(0, 7);
const money = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const GUJARATI_MONTHS = [
  'જાન્યુઆરી (Jan)', 'ફેબ્રુઆરી (Feb)', 'માર્ચ (Mar)', 'એપ્રિલ (Apr)',
  'મે (May)', 'જૂન (Jun)', 'જુલાઈ (Jul)', 'ઓગસ્ટ (Aug)',
  'સપ્ટેમ્બર (Sep)', 'ઓક્ટોબર (Oct)', 'નવેમ્બર (Nov)', 'ડિસેમ્બર (Dec)'
];

const formatDisplayDate = (dateString: string) => {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      const days = ['રવિવાર (Sun)', 'સોમવાર (Mon)', 'મંગળવાર (Tue)', 'બુધવાર (Wed)', 'ગુરુવાર (Thu)', 'શુક્રવાર (Fri)', 'શનિવાર (Sat)'];
      const dayName = days[dt.getDay()];
      const monthName = GUJARATI_MONTHS[m] || '';
      return `${d} ${monthName} ${y} • ${dayName}`;
    }
  } catch {
    // fallback
  }
  return dateString;
};

const formatDisplayMonth = (monthString: string) => {
  if (!monthString) return '';
  try {
    const parts = monthString.split('-');
    if (parts.length === 2) {
      const y = parts[0];
      const m = parseInt(parts[1], 10) - 1;
      return `${GUJARATI_MONTHS[m] || parts[1]} ${y}`;
    }
  } catch {
    // fallback
  }
  return monthString;
};

export const InventoryPage: React.FC = () => {
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');

  // Daily Hisab States
  const [date, setDate] = useState(todayStr());
  const [expenses, setExpenses] = useState<LedgerRow[]>([]);
  const [income, setIncome] = useState<LedgerRow[]>([]);
  const [isSavedInDb, setIsSavedInDb] = useState(false);
  const [allRecordedDates, setAllRecordedDates] = useState<string[]>([]);
  const [allAvailableDates, setAllAvailableDates] = useState<string[]>([]);
  const [bookingStats, setBookingStats] = useState<BookingStats>({
    totalBookings: 0,
    completedCount: 0,
    functionRevenue: 0,
    bookings: []
  });
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);

  // Monthly Hisab States
  const [month, setMonth] = useState(currentMonthStr());
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [monthlyFilter, setMonthlyFilter] = useState<'all' | 'recorded' | 'functions'>('all');
  const [monthlySearch, setMonthlySearch] = useState('');

  // UI / Action states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [addItemType, setAddItemType] = useState<'expense' | 'income' | null>(null);
  const [newItem, setNewItem] = useState({ name: '', amount: '', note: '' });

  // -------------------------------------------------------------
  // Data Loaders
  // -------------------------------------------------------------
  const loadDailyLedger = async (targetDate: string) => {
    setLoading(true);
    try {
      const res: any = await apiClient.get(`/inventory/daily-ledger?date=${targetDate}`, { forceFresh: true });
      if (res.success && res.data) {
        setExpenses(res.data.ledger.expenses || []);
        setIncome(res.data.ledger.income || []);
        setIsSavedInDb(Boolean(res.data.isSaved));
        if (res.data.bookingStats) {
          setBookingStats(res.data.bookingStats);
        }
        if (Array.isArray(res.data.allRecordedDates)) {
          setAllRecordedDates(res.data.allRecordedDates);
        }
        if (Array.isArray(res.data.allAvailableDates)) {
          setAllAvailableDates(res.data.allAvailableDates);
        }
      }
    } catch (error: any) {
      setMessage({ text: error.message || 'દૈનિક હિસાબ લોડ થઈ શક્યો નથી.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyLedger = async (targetMonth: string) => {
    setLoading(true);
    try {
      const res: any = await apiClient.get(`/inventory/monthly-ledger?month=${targetMonth}`, { forceFresh: true });
      if (res.success && res.data) {
        setMonthlyData(res.data);
      }
    } catch (error: any) {
      setMessage({ text: error.message || 'માસિક હિસાબ લોડ થઈ શક્યો નથી.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyLedger(date);
    } else {
      loadMonthlyLedger(month);
    }
  }, [date, month, activeTab]);

  // Daily Totals calculation
  const totals = useMemo(() => {
    const expenseTotal = expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const incomeTotal = income.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return { expenseTotal, incomeTotal, profit: incomeTotal - expenseTotal };
  }, [expenses, income]);

  // -------------------------------------------------------------
  // Date Navigation Helpers
  // -------------------------------------------------------------
  const handleShiftDate = (daysDelta: number) => {
    try {
      const parts = date.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + daysDelta);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setDate(`${y}-${m}-${day}`);
    } catch {
      setDate(todayStr());
    }
  };

  const handleSetToday = () => setDate(todayStr());

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${day}`);
  };

  const handleShiftMonth = (monthsDelta: number) => {
    try {
      const parts = month.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      d.setMonth(d.getMonth() + monthsDelta);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      setMonth(`${y}-${m}`);
    } catch {
      setMonth(currentMonthStr());
    }
  };

  const handleSetCurrentMonth = () => setMonth(currentMonthStr());

  const handleOpenDayFromMonthly = (targetDate: string) => {
    setDate(targetDate);
    setActiveTab('daily');
  };

  // -------------------------------------------------------------
  // Row Manipulations
  // -------------------------------------------------------------
  const updateRow = (kind: 'expense' | 'income', index: number, field: 'amount' | 'note' | 'name', value: string) => {
    const setRows = kind === 'expense' ? setExpenses : setIncome;
    setRows(rows =>
      rows.map((row, i) =>
        i === index ? { ...row, [field]: field === 'amount' ? Math.max(0, Number(value || 0)) : value } : row
      )
    );
  };

  const openAddItem = (kind: 'expense' | 'income') => {
    setNewItem({ name: '', amount: '', note: '' });
    setAddItemType(kind);
  };

  const addRow = () => {
    if (!addItemType || !newItem.name.trim()) return;
    const setRows = addItemType === 'expense' ? setExpenses : setIncome;
    setRows(rows => [
      ...rows,
      {
        key: `custom_${Date.now()}`,
        name: newItem.name.trim(),
        amount: Math.max(0, Number(newItem.amount || 0)),
        note: newItem.note.trim()
      }
    ]);
    setAddItemType(null);
  };

  const deleteRow = (kind: 'expense' | 'income', index: number) =>
    (kind === 'expense' ? setExpenses : setIncome)(rows => rows.filter((_, i) => i !== index));

  const autoFillFunctionIncome = () => {
    if (bookingStats.functionRevenue <= 0) return;
    setIncome(rows => {
      const exists = rows.some(r => r.key === 'function_income');
      if (exists) {
        return rows.map(r =>
          r.key === 'function_income'
            ? {
                ...r,
                amount: bookingStats.functionRevenue,
                note: `${bookingStats.completedCount} ફંક્શન(ઓ) ની બિલ આવક`
              }
            : r
        );
      } else {
        return [
          ...rows,
          {
            key: 'function_income',
            name: 'Function Income / ફંક્શન આવક',
            amount: bookingStats.functionRevenue,
            note: `${bookingStats.completedCount} ફંક્શન(ઓ) ની બિલ આવક`
          }
        ];
      }
    });
    setMessage({
      text: `ફંક્શન આવક ₹${bookingStats.functionRevenue.toLocaleString('en-IN')} દૈનિક આવકમાં સફળતાપૂર્વક ઉમેરાઈ ગઈ છે.`,
      type: 'success'
    });
  };

  // -------------------------------------------------------------
  // Save Daily Ledger
  // -------------------------------------------------------------
  const save = async () => {
    try {
      setSaving(true);
      const res: any = await apiClient.put('/inventory/daily-ledger', { date, expenses, income });
      if (res.success) {
        setMessage({
          text: `તારીખ ${date} નો દૈનિક હિસાબ સફળતાપૂર્વક સેવ થઈ ગયો છે. ✅`,
          type: 'success'
        });
        setShowSaveConfirm(false);
        setIsSavedInDb(true);
        await loadDailyLedger(date);
      }
    } catch (error: any) {
      setMessage({ text: error.message || 'દૈનિક હિસાબ સેવ કરતી વખતે ભૂલ આવી.', type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  // Status check for selected date
  const isPastDate = date < todayStr();
  const isTodayDate = date === todayStr();
  const isFutureDate = date > todayStr();

  // Filtered monthly days
  const filteredMonthlyDays = useMemo(() => {
    if (!monthlyData) return [];
    return monthlyData.calendarDays.filter(d => {
      if (monthlyFilter === 'recorded' && !d.hasRecord) return false;
      if (monthlyFilter === 'functions' && d.functionCount === 0) return false;
      if (monthlySearch.trim()) {
        const q = monthlySearch.toLowerCase();
        return (
          d.date.includes(q) ||
          d.dayName.toLowerCase().includes(q) ||
          (d.topExpense?.name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [monthlyData, monthlyFilter, monthlySearch]);

  // -------------------------------------------------------------
  // Render Rows Table Component
  // -------------------------------------------------------------
  const renderLedgerTable = (kind: 'expense' | 'income', data: LedgerRow[], accent: string) => (
    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
      <div
        className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-3 flex-wrap gap-2"
        style={{ borderRadius: '16px 16px 0 0' }}
      >
        <div>
          <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <span
              className={`badge bg-${accent}-subtle text-${accent} rounded-circle p-1 d-inline-flex align-items-center justify-content-center`}
              style={{ width: 26, height: 26 }}
            >
              {kind === 'expense' ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
            </span>
            <span>{kind === 'expense' ? 'દૈનિક ખર્ચ (Daily Expenses)' : 'દૈનિક આવક (Daily Income)'}</span>
          </h5>
          <small className="text-muted">
            {kind === 'expense' ? 'શાકભાજી, દૂધ, કરિયાણું, ગેસ વગેરેનો ખર્ચ' : 'રોકડ, ઓનલાઇન અને ફંક્શન આવક'}
          </small>
        </div>
        <button
          type="button"
          className={`btn btn-sm btn-outline-${accent} fw-semibold d-flex align-items-center gap-1 shadow-xs`}
          onClick={() => openAddItem(kind)}
        >
          <Plus size={15} />
          <span>+ {kind === 'expense' ? 'ખર્ચ ઉમેરો' : 'આવક ઉમેરો'}</span>
        </button>
      </div>
      <div className="table-responsive">
        <table className="table align-middle mb-0 table-hover">
          <thead className="table-light">
            <tr>
              <th className="ps-3" style={{ width: 45 }}>#</th>
              <th style={{ minWidth: 170 }}>વિગત (Item / Category)</th>
              <th style={{ minWidth: 150 }}>નોંધ / વેપારી (Note)</th>
              <th className="text-end" style={{ minWidth: 140 }}>રકમ (Amount ₹)</th>
              <th style={{ width: 45 }} />
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row.key || index}>
                <td className="ps-3 text-muted small">{index + 1}</td>
                <td>
                  <input
                    className="form-control form-control-sm border-0 bg-transparent fw-semibold text-dark"
                    value={row.name}
                    placeholder="Item name"
                    onChange={e => updateRow(kind, index, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="form-control form-control-sm"
                    value={row.note || ''}
                    placeholder="નોંધ (Optional)"
                    onChange={e => updateRow(kind, index, 'note', e.target.value)}
                  />
                </td>
                <td>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light text-muted">₹</span>
                    <input
                      type="number"
                      min="0"
                      className="form-control form-control-sm text-end fw-bold"
                      value={row.amount || ''}
                      placeholder="0"
                      onChange={e => updateRow(kind, index, 'amount', e.target.value)}
                    />
                  </div>
                </td>
                <td className="pe-2 text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger border-0 p-1 rounded-circle"
                    title="કાઢી નાખો (Remove row)"
                    onClick={() => deleteRow(kind, index)}
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-4 text-muted">
                  કોઈ વિગત નોંધાયેલ નથી. '+ {kind === 'expense' ? 'ખર્ચ' : 'આવક'} ઉમેરો' બટન દબાવો.
                </td>
              </tr>
            )}
            <tr className={`table-${accent === 'danger' ? 'danger-subtle' : 'success-subtle'}`}>
              <td colSpan={3} className="text-end fw-bold ps-3">
                કુલ {kind === 'expense' ? 'દૈનિક ખર્ચ (Total Expenses)' : 'દૈનિક આવક (Total Income)'}:
              </td>
              <td className={`text-end fw-bolder fs-6 text-${accent}`}>
                {money(kind === 'expense' ? totals.expenseTotal : totals.incomeTotal)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="container-fluid px-0 pb-5">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & NAVIGATION SWITCHER                          */}
      {/* ------------------------------------------------------------- */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 16 }}>
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 p-2.5 text-white d-flex align-items-center justify-content-center shadow-sm"
                style={{ background: 'var(--brand-maroon, #7A1B28)', width: 48, height: 48 }}
              >
                <ClipboardList size={26} />
              </div>
              <div>
                <h4 className="fw-bold mb-0 text-dark">ઈન્વેન્ટરી અને દૈનિક/માસિક હિસાબ</h4>
                <div className="text-muted small mt-0.5">
                  Bhatigal Bhanu Inventory & Daily / Monthly Profit & Loss Ledger
                </div>
              </div>
            </div>

            {/* TAB SWITCHER PILL */}
            <div className="d-flex align-items-center bg-light p-1 rounded-pill border">
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-2 transition-all ${
                  activeTab === 'daily'
                    ? 'btn-primary shadow-sm text-white'
                    : 'text-secondary btn-link text-decoration-none'
                }`}
                onClick={() => setActiveTab('daily')}
              >
                <CalendarDays size={16} />
                <span>રોજનો હિસાબ (Daily Hisab)</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 py-1.5 fw-bold d-flex align-items-center gap-2 transition-all ${
                  activeTab === 'monthly'
                    ? 'btn-primary shadow-sm text-white'
                    : 'text-secondary btn-link text-decoration-none'
                }`}
                onClick={() => setActiveTab('monthly')}
              >
                <BarChart3 size={16} />
                <span>મહિનાનો હિસાબ (Monthly Hisab)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ALERT MESSAGE BANNER */}
      {message && (
        <div className={`alert alert-${message.type} alert-dismissible fade show py-2.5 mb-3 shadow-xs d-flex align-items-center gap-2`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
          <div className="fw-semibold small flex-grow-1">{message.text}</div>
          <button type="button" className="btn-close" onClick={() => setMessage(null)} />
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. TAB CONTENT: DAILY HISAB (દૈનિક હિસાબ & PAST DATES)        */}
      {/* ============================================================= */}
      {activeTab === 'daily' && (
        <div>
          {/* TOOLBAR FOR SPECIFIC DATE NAVIGATION */}
          <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 16 }}>
            <div className="card-body p-3">
              <div className="row g-2 align-items-center justify-content-between">
                {/* Date Navigation & Picker */}
                <div className="col-12 col-xl-7 d-flex flex-wrap align-items-center gap-2">
                  <div className="btn-group btn-group-sm shadow-xs" role="group">
                    <button
                      type="button"
                      className="btn btn-outline-secondary d-flex align-items-center gap-1"
                      title="આગલો દિવસ (Previous Day)"
                      onClick={() => handleShiftDate(-1)}
                    >
                      <ChevronLeft size={16} />
                      <span className="d-none d-sm-inline">આગલો દિવસ</span>
                    </button>
                    <button
                      type="button"
                      className={`btn ${isTodayDate ? 'btn-secondary fw-bold' : 'btn-outline-secondary'}`}
                      onClick={handleSetToday}
                    >
                      આજે (Today)
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleSetYesterday}
                    >
                      ગઈકાલે
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary d-flex align-items-center gap-1"
                      title="પછીનો દિવસ (Next Day)"
                      onClick={() => handleShiftDate(1)}
                    >
                      <span className="d-none d-sm-inline">પછીનો દિવસ</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* SPECIFIC DATE PICKER */}
                  <div className="d-flex align-items-center gap-2 bg-light p-1.5 rounded-3 border">
                    <Calendar size={18} className="text-primary ms-1" />
                    <input
                      type="date"
                      className="form-control form-control-sm border-0 bg-transparent fw-bold text-dark"
                      style={{ width: 'auto', minWidth: 140 }}
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      title="કોઈપણ ચોક્કસ તારીખ પસંદ કરો (Pick any specific past date)"
                    />
                  </div>

                  {/* DATE STATUS BADGES */}
                  <div className="d-flex align-items-center gap-1.5 flex-wrap">
                    {isTodayDate && (
                      <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1.5 rounded-pill fw-semibold">
                        આજનો હિસાબ (Today)
                      </span>
                    )}
                    {isPastDate && (
                      <span className="badge bg-warning-subtle text-dark border border-warning-subtle px-2 py-1.5 rounded-pill fw-semibold d-flex align-items-center gap-1">
                        <Clock size={12} />
                        <span>ભૂતકાળનો હિસાબ (Past Date)</span>
                      </span>
                    )}
                    {isFutureDate && (
                      <span className="badge bg-info-subtle text-info border border-info-subtle px-2 py-1.5 rounded-pill fw-semibold">
                        ભાવિ તારીખ (Future)
                      </span>
                    )}
                    {isSavedInDb ? (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1.5 rounded-pill fw-semibold">
                        ✅ સેવ થયેલ (Saved)
                      </span>
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1.5 rounded-pill fw-semibold">
                        📝 નવો ડ્રાફ્ટ (Unsaved)
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side: Actions & Quick jumps */}
                <div className="col-12 col-xl-5 d-flex justify-content-xl-end align-items-center gap-2 flex-wrap">
                  {/* Jump to other recorded dates dropdown */}
                  {allAvailableDates.length > 0 && (
                    <div className="d-flex align-items-center gap-1">
                      <select
                        className="form-select form-select-sm shadow-xs border text-secondary"
                        style={{ maxWidth: 180 }}
                        value={date}
                        onChange={e => setDate(e.target.value)}
                      >
                        <option value={date} disabled>
                          📅 નોંધાયેલ પાછલી તારીખો...
                        </option>
                        {allAvailableDates.map(d => (
                          <option key={d} value={d}>
                            {d} {d === todayStr() ? '(આજે)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-xs"
                    onClick={() => window.print()}
                    title="દૈનિક હિસાબ પ્રિન્ટ કરો"
                  >
                    <Printer size={15} />
                    <span className="d-none d-sm-inline">પ્રિન્ટ</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm fw-bold d-flex align-items-center gap-2 shadow-sm px-3 text-white"
                    onClick={() => setShowSaveConfirm(true)}
                    disabled={loading || saving}
                  >
                    <Save size={16} />
                    <span>{saving ? 'સેવ થાય છે…' : 'હિસાબ સેવ કરો'}</span>
                  </button>
                </div>
              </div>

              {/* Formatted Date Banner */}
              <div className="mt-2 pt-2 border-top d-flex align-items-center justify-content-between flex-wrap gap-2 text-muted small">
                <div className="fw-semibold text-dark">
                  તારીખ: <span className="text-primary">{formatDisplayDate(date)}</span>
                </div>
                {isPastDate && (
                  <div className="text-warning-emphasis bg-warning-subtle px-2 py-0.5 rounded small">
                    ℹ️ તમે પાછલી તારીખ ({date}) નો હિસાબ જોઈ રહ્યા છો. આપ જરૂર મુજબ વિગત સુધારીને સેવ કરી શકો છો.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FUNCTION BOOKING INTEGRATION BANNER (IF FUNCTIONS EXIST ON THIS DATE) */}
          {bookingStats.totalBookings > 0 && (
            <div
              className="card border-0 shadow-sm mb-3"
              style={{
                borderRadius: 16,
                background: 'linear-gradient(135deg, #FFF9EB 0%, #FEF3D6 100%)',
                borderLeft: '5px solid #F59E0B'
              }}
            >
              <div className="card-body p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle p-2 text-white d-flex align-items-center justify-content-center shadow-xs"
                    style={{ background: '#F59E0B', width: 42, height: 42 }}
                  >
                    <Utensils size={22} />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0 text-dark">
                      આ તારીખે {bookingStats.totalBookings} ફંક્શન(ઓ) નોંધાયેલ છે! (પૂર્ણ: {bookingStats.completedCount})
                    </h6>
                    <div className="small text-muted mt-0.5">
                      કુલ ફંક્શન બિલિંગ રકમ: <strong className="text-success fs-6">{money(bookingStats.functionRevenue)}</strong>
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark fw-semibold"
                    onClick={() => setShowBookingDetailsModal(true)}
                  >
                    ફંક્શન વિગત જુઓ ({bookingStats.bookings.length})
                  </button>
                  {bookingStats.functionRevenue > 0 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-success fw-bold d-flex align-items-center gap-1.5 shadow-xs text-white"
                      onClick={autoFillFunctionIncome}
                      title="આ તારીખના ફંક્શનની બિલ રકમ આવકના ટેબલમાં આપોઆપ ભરી દો"
                    >
                      <Sparkles size={15} />
                      <span>ફંક્શન આવક ઓટો-ભરો</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3 SUMMARY KPI CARDS */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
                <div className="card-body p-3.5 d-flex align-items-center justify-content-between">
                  <div>
                    <div className="small text-muted fw-bold mb-1">કુલ દૈનિક આવક (Total Income)</div>
                    <div className="fs-3 fw-bolder text-success">{money(totals.incomeTotal)}</div>
                    <div className="text-muted small mt-1">રોકડ, ઓનલાઇન અને ફંક્શન્સ</div>
                  </div>
                  <div
                    className="rounded-circle p-3 bg-success-subtle text-success d-flex align-items-center justify-content-center"
                    style={{ width: 56, height: 56 }}
                  >
                    <TrendingUp size={28} />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
                <div className="card-body p-3.5 d-flex align-items-center justify-content-between">
                  <div>
                    <div className="small text-muted fw-bold mb-1">કુલ દૈનિક ખર્ચ (Total Expenses)</div>
                    <div className="fs-3 fw-bolder text-danger">{money(totals.expenseTotal)}</div>
                    <div className="text-muted small mt-1">શાકભાજી, દૂધ, ગેસ અને સામગ્રી</div>
                  </div>
                  <div
                    className="rounded-circle p-3 bg-danger-subtle text-danger d-flex align-items-center justify-content-center"
                    style={{ width: 56, height: 56 }}
                  >
                    <TrendingDown size={28} />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
                <div className="card-body p-3.5 d-flex align-items-center justify-content-between">
                  <div>
                    <div className="small text-muted fw-bold mb-1">
                      {totals.profit >= 0 ? 'ચોખ્ખો નફો / બચત (Net Profit)' : 'ખોટ / અછત (Net Deficit)'}
                    </div>
                    <div
                      className={`fs-3 fw-bolder ${
                        totals.profit >= 0 ? 'text-primary' : 'text-danger'
                      }`}
                    >
                      {money(totals.profit)}
                    </div>
                    <div className="text-muted small mt-1">
                      {totals.profit >= 0 ? 'આવકમાંથી ખર્ચ બાદ ચોખ્ખો નફો' : 'ખર્ચ આવક કરતાં વધુ છે'}
                    </div>
                  </div>
                  <div
                    className={`rounded-circle p-3 ${
                      totals.profit >= 0 ? 'bg-primary-subtle text-primary' : 'bg-danger-subtle text-danger'
                    } d-flex align-items-center justify-content-center`}
                    style={{ width: 56, height: 56 }}
                  >
                    <WalletCards size={28} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TWO TABLES: EXPENSES & INCOME */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-lg-6">{renderLedgerTable('expense', expenses, 'danger')}</div>
            <div className="col-12 col-lg-6">{renderLedgerTable('income', income, 'success')}</div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 3. TAB CONTENT: MONTHLY HISAB (માસિક હિસાબ & FULL REGISTER)    */}
      {/* ============================================================= */}
      {activeTab === 'monthly' && (
        <div>
          {/* MONTH NAVIGATION TOOLBAR */}
          <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 16 }}>
            <div className="card-body p-3">
              <div className="row g-2 align-items-center justify-content-between">
                <div className="col-12 col-lg-6 d-flex flex-wrap align-items-center gap-2">
                  <div className="btn-group btn-group-sm shadow-xs" role="group">
                    <button
                      type="button"
                      className="btn btn-outline-secondary d-flex align-items-center gap-1"
                      onClick={() => handleShiftMonth(-1)}
                      title="આગલો મહિનો"
                    >
                      <ChevronLeft size={16} />
                      <span>આગલો મહિનો</span>
                    </button>
                    <button
                      type="button"
                      className={`btn ${
                        month === currentMonthStr() ? 'btn-secondary fw-bold' : 'btn-outline-secondary'
                      }`}
                      onClick={handleSetCurrentMonth}
                    >
                      ચાલુ મહિનો
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary d-flex align-items-center gap-1"
                      onClick={() => handleShiftMonth(1)}
                      title="પછીનો મહિનો"
                    >
                      <span>પછીનો મહિનો</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* SPECIFIC MONTH PICKER */}
                  <div className="d-flex align-items-center gap-2 bg-light p-1.5 rounded-3 border">
                    <Calendar size={18} className="text-primary ms-1" />
                    <input
                      type="month"
                      className="form-control form-control-sm border-0 bg-transparent fw-bold text-dark"
                      style={{ width: 'auto' }}
                      value={month}
                      onChange={e => setMonth(e.target.value)}
                      title="કોઈપણ ચોક્કસ મહિનો પસંદ કરો"
                    />
                  </div>

                  {/* Display formatted Month */}
                  <div className="fw-bold text-dark small ms-1">
                    {formatDisplayMonth(month)}
                  </div>
                </div>

                <div className="col-12 col-lg-6 d-flex justify-content-lg-end align-items-center gap-2 flex-wrap">
                  {/* Available months dropdown */}
                  {monthlyData?.availableMonths && monthlyData.availableMonths.length > 0 && (
                    <select
                      className="form-select form-select-sm shadow-xs border text-secondary"
                      style={{ maxWidth: 180 }}
                      value={month}
                      onChange={e => setMonth(e.target.value)}
                    >
                      <option value="" disabled>
                        📅 જૂના મહિનાઓ...
                      </option>
                      {monthlyData.availableMonths.map(m => (
                        <option key={m} value={m}>
                          {formatDisplayMonth(m)}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-xs"
                    onClick={() => window.print()}
                  >
                    <Printer size={15} />
                    <span>માસિક પ્રિન્ટ</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-xs"
                    onClick={() => loadMonthlyLedger(month)}
                    title="રિફ્રેશ"
                  >
                    <RefreshCw size={14} />
                    <span>તાજું કરો</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* MONTHLY KPI METRICS */}
          {monthlyData && (
            <div className="row g-3 mb-3">
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
                  <div className="card-body p-3.5">
                    <div className="text-muted small fw-bold">કુલ માસિક આવક (Monthly Income)</div>
                    <div className="fs-3 fw-bolder text-success mt-1">
                      {money(monthlyData.totals.incomeTotal)}
                    </div>
                    <div className="text-muted small mt-1">
                      સરેરાશ રોજની આવક: <strong>{money(monthlyData.totals.avgDailyIncome)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
                  <div className="card-body p-3.5">
                    <div className="text-muted small fw-bold">કુલ માસિક ખર્ચ (Monthly Expenses)</div>
                    <div className="fs-3 fw-bolder text-danger mt-1">
                      {money(monthlyData.totals.expenseTotal)}
                    </div>
                    <div className="text-muted small mt-1">
                      સરેરાશ રોજનો ખર્ચ: <strong>{money(monthlyData.totals.avgDailyExpense)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
                  <div className="card-body p-3.5">
                    <div className="text-muted small fw-bold">
                      {monthlyData.totals.profit >= 0 ? 'ચોખ્ખો માસિક નફો (Monthly Net Profit)' : 'માસિક ખોટ (Net Deficit)'}
                    </div>
                    <div
                      className={`fs-3 fw-bolder mt-1 ${
                        monthlyData.totals.profit >= 0 ? 'text-primary' : 'text-danger'
                      }`}
                    >
                      {money(monthlyData.totals.profit)}
                    </div>
                    <div className="text-muted small mt-1">
                      {monthlyData.totals.profit >= 0 ? 'માસિક બચત અને કમાણી' : 'ખર્ચ આવક કરતાં વધારે છે'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
                  <div className="card-body p-3.5">
                    <div className="text-muted small fw-bold">નોંધાયેલ દિવસો અને ફંક્શન્સ</div>
                    <div className="fs-3 fw-bolder text-dark mt-1">
                      {monthlyData.totals.daysRecorded} / {monthlyData.totals.totalDays} દિવસ
                    </div>
                    <div className="text-muted small mt-1">
                      કુલ ફંક્શન્સ: <strong>{monthlyData.totals.functionCount}</strong> ({money(monthlyData.totals.functionRevenue)})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DAY-BY-DAY MONTHLY REGISTER TABLE */}
          <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
            <div
              className="card-header bg-white border-bottom p-3 d-flex flex-wrap align-items-center justify-content-between gap-3"
              style={{ borderRadius: '16px 16px 0 0' }}
            >
              <div>
                <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                  <CalendarDays size={20} className="text-primary" />
                  <span>તારીખવાર આખા મહિનાનો હિસાબ (Day-by-Day Monthly Register)</span>
                </h5>
                <small className="text-muted">
                  કોઈપણ દિવસના રોજિંદા હિસાબ જોવા માટે તે દિવસના બટન પર ક્લિક કરો.
                </small>
              </div>

              {/* Filters and search */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${monthlyFilter === 'all' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                    onClick={() => setMonthlyFilter('all')}
                  >
                    બધા દિવસો ({monthlyData?.calendarDays.length || 0})
                  </button>
                  <button
                    type="button"
                    className={`btn ${monthlyFilter === 'recorded' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                    onClick={() => setMonthlyFilter('recorded')}
                  >
                    સેવ થયેલ ({monthlyData?.totals.daysRecorded || 0})
                  </button>
                  <button
                    type="button"
                    className={`btn ${monthlyFilter === 'functions' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                    onClick={() => setMonthlyFilter('functions')}
                  >
                    ફંક્શન્સ વાળા દિવસો
                  </button>
                </div>

                <div className="input-group input-group-sm" style={{ width: 170 }}>
                  <span className="input-group-text bg-light border-end-0">
                    <Search size={14} className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="તારીખ / વાર..."
                    value={monthlySearch}
                    onChange={e => setMonthlySearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3" style={{ width: 150 }}>તારીખ અને વાર</th>
                    <th className="text-end" style={{ minWidth: 120 }}>આવક (Income ₹)</th>
                    <th className="text-end" style={{ minWidth: 120 }}>ખર્ચ (Expense ₹)</th>
                    <th className="text-end" style={{ minWidth: 130 }}>ચોખ્ખો નફો (Profit ₹)</th>
                    <th style={{ minWidth: 160 }}>ફંક્શન્સ (Bookings)</th>
                    <th style={{ minWidth: 160 }}>ટોપ ખર્ચ (Top Expense)</th>
                    <th className="text-center" style={{ width: 120 }}>સ્થિતિ</th>
                    <th className="text-end pe-3" style={{ width: 160 }}>એક્શન</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMonthlyDays.map(day => (
                    <tr
                      key={day.date}
                      className={day.isToday ? 'table-warning-subtle' : day.hasRecord ? '' : 'text-muted opacity-85'}
                    >
                      <td className="ps-3">
                        <div className="fw-bold text-dark">
                          {day.date} {day.isToday && <span className="badge bg-success ms-1">આજે</span>}
                        </div>
                        <small className="text-muted">{day.dayName}</small>
                      </td>
                      <td className="text-end fw-bold text-success">
                        {day.incomeTotal > 0 ? money(day.incomeTotal) : '—'}
                      </td>
                      <td className="text-end fw-bold text-danger">
                        {day.expenseTotal > 0 ? money(day.expenseTotal) : '—'}
                      </td>
                      <td className="text-end fw-bolder">
                        {day.hasRecord ? (
                          <span className={day.profit >= 0 ? 'text-primary' : 'text-danger'}>
                            {money(day.profit)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {day.functionCount > 0 ? (
                          <div>
                            <span className="badge bg-warning-subtle text-dark border border-warning-subtle fw-semibold">
                              {day.functionCount} ફંક્શન(ઓ)
                            </span>
                            {day.functionRevenue > 0 && (
                              <div className="small text-success fw-bold mt-0.5">
                                {money(day.functionRevenue)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td>
                        {day.topExpense ? (
                          <div>
                            <div className="small fw-semibold text-dark text-truncate" style={{ maxWidth: 170 }}>
                              {day.topExpense.name}
                            </div>
                            <small className="text-danger fw-bold">{money(day.topExpense.amount)}</small>
                          </div>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td className="text-center">
                        {day.hasRecord ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill fw-semibold">
                            સેવ થયેલ
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border px-2 py-1 rounded-pill">
                            ખાલી
                          </span>
                        )}
                      </td>
                      <td className="text-end pe-3">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary fw-semibold d-inline-flex align-items-center gap-1 shadow-xs px-2.5"
                          onClick={() => handleOpenDayFromMonthly(day.date)}
                          title="આ દિવસનો હિસાબ ખોલો"
                        >
                          <span>હિસાબ ખોલો</span>
                          <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMonthlyDays.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-5 text-muted">
                        કોઈ દિવસ મળ્યો નથી.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MONTHLY CATEGORY BREAKDOWN CARDS */}
          {monthlyData && (
            <div className="row g-3">
              {/* EXPENSE CATEGORIES BREAKDOWN */}
              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
                  <div className="card-header bg-white border-bottom py-3" style={{ borderRadius: '16px 16px 0 0' }}>
                    <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                      <PieChart size={18} className="text-danger" />
                      <span>માસિક ખર્ચ વિશ્લેષણ (Monthly Expenses Breakdown)</span>
                    </h6>
                    <small className="text-muted">કયા કેટેગરીમાં કેટલો ખર્ચ થયો</small>
                  </div>
                  <div className="card-body p-3">
                    {monthlyData.expenseCategories.length > 0 ? (
                      <div className="d-flex flex-column gap-3">
                        {monthlyData.expenseCategories.map(cat => {
                          const percent =
                            monthlyData.totals.expenseTotal > 0
                              ? Math.round((cat.amount / monthlyData.totals.expenseTotal) * 100)
                              : 0;
                          return (
                            <div key={cat.key}>
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-semibold text-dark small">{cat.name}</span>
                                <div className="text-end">
                                  <strong className="text-danger">{money(cat.amount)}</strong>
                                  <span className="text-muted small ms-1.5">({percent}%)</span>
                                </div>
                              </div>
                              <div className="progress" style={{ height: 6 }}>
                                <div
                                  className="progress-bar bg-danger"
                                  role="progressbar"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted small">
                        આ મહિનામાં હજુ સુધી કોઈ ખર્ચ નોંધાયેલ નથી.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* INCOME SOURCES BREAKDOWN */}
              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
                  <div className="card-header bg-white border-bottom py-3" style={{ borderRadius: '16px 16px 0 0' }}>
                    <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                      <TrendingUp size={18} className="text-success" />
                      <span>માસિક આવક સ્ત્રોત (Monthly Income Sources)</span>
                    </h6>
                    <small className="text-muted">કાઉન્ટર, ઓનલાઇન અને ફંક્શન્સની આવક</small>
                  </div>
                  <div className="card-body p-3">
                    {monthlyData.incomeCategories.length > 0 ? (
                      <div className="d-flex flex-column gap-3">
                        {monthlyData.incomeCategories.map(cat => {
                          const percent =
                            monthlyData.totals.incomeTotal > 0
                              ? Math.round((cat.amount / monthlyData.totals.incomeTotal) * 100)
                              : 0;
                          return (
                            <div key={cat.key}>
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-semibold text-dark small">{cat.name}</span>
                                <div className="text-end">
                                  <strong className="text-success">{money(cat.amount)}</strong>
                                  <span className="text-muted small ms-1.5">({percent}%)</span>
                                </div>
                              </div>
                              <div className="progress" style={{ height: 6 }}>
                                <div
                                  className="progress-bar bg-success"
                                  role="progressbar"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted small">
                        આ મહિનામાં હજુ સુધી કોઈ આવક નોંધાયેલ નથી.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* 4. MODALS: SAVE CONFIRMATION, ADD ITEM, BOOKING DETAILS       */}
      {/* ============================================================= */}

      {/* SAVE CONFIRMATION MODAL */}
      <Modal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        title="દૈનિક હિસાબ સેવ કરો (Save Daily Ledger)"
      >
        <div className="p-3">
          <p className="mb-3 text-secondary">
            તમે તારીખ <strong>{formatDisplayDate(date)}</strong> નો હિસાબ સેવ કરવા માંગો છો?
          </p>
          <div className="rounded-3 bg-light border p-3 small mb-3">
            <div className="d-flex justify-content-between mb-1.5">
              <span className="text-muted">કુલ દૈનિક ખર્ચ (Expenses):</span>
              <strong className="text-danger">{money(totals.expenseTotal)}</strong>
            </div>
            <div className="d-flex justify-content-between mb-1.5">
              <span className="text-muted">કુલ દૈનિક આવક (Income):</span>
              <strong className="text-success">{money(totals.incomeTotal)}</strong>
            </div>
            <hr className="my-2" />
            <div className="d-flex justify-content-between fw-bold fs-6">
              <span>ચોખ્ખો નફો / બચત (Net Profit):</span>
              <span className={totals.profit >= 0 ? 'text-primary' : 'text-danger'}>
                {money(totals.profit)}
              </span>
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-light"
              onClick={() => setShowSaveConfirm(false)}
              disabled={saving}
            >
              રદ કરો (Cancel)
            </button>
            <button
              type="button"
              className="btn btn-primary fw-bold text-white px-3"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'સેવ થાય છે…' : 'હા, સેવ કરો (Confirm & Save)'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ADD CUSTOM ITEM MODAL */}
      <Modal
        isOpen={Boolean(addItemType)}
        onClose={() => setAddItemType(null)}
        title={addItemType === 'expense' ? 'નવો દૈનિક ખર્ચ ઉમેરો' : 'નવી દૈનિક આવક ઉમેરો'}
      >
        <div className="p-3">
          <div
            className="rounded-3 p-3 mb-3"
            style={{
              background: addItemType === 'expense' ? '#FFF5F5' : '#F1FBF5',
              border: `1px solid ${addItemType === 'expense' ? '#F1C1C1' : '#BCE5C9'}`
            }}
          >
            <div className="fw-bold text-dark">
              {addItemType === 'expense' ? 'દૈનિક ખર્ચ આઈટમ (Expense Item)' : 'દૈનિક આવક આઈટમ (Income Item)'}
            </div>
            <div className="small text-muted mt-1">
              આ તારીખના હિસાબ માટે નવી આઈટમ ઉમેરો. રકમ પાછળથી પણ બદલી શકાશે.
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label small fw-bold">
              આઈટમનું નામ / વિગત <span className="text-danger">*</span>
            </label>
            <input
              autoFocus
              className="form-control"
              placeholder={
                addItemType === 'expense'
                  ? 'દા.ત. સ્ટાફ ચા-નાસ્તો, મરામત ખર્ચ, પરિવહન'
                  : 'દા.ત. કેટરિંગ ઓર્ડર, ડિલિવરી વેચાણ, સ્ક્રૅપ આવક'
              }
              value={newItem.name}
              onChange={e => setNewItem({ ...newItem, name: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') addRow();
              }}
            />
          </div>

          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label small fw-bold">રકમ (₹)</label>
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="0"
                value={newItem.amount}
                onChange={e => setNewItem({ ...newItem, amount: e.target.value })}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-bold">
                નોંધ <span className="text-muted fw-normal">(ઓપ્શનલ)</span>
              </label>
              <input
                className="form-control"
                placeholder="વેપારી / બિલ નંબર"
                value={newItem.note}
                onChange={e => setNewItem({ ...newItem, note: e.target.value })}
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn btn-light" onClick={() => setAddItemType(null)}>
              રદ કરો
            </button>
            <button
              type="button"
              className={`btn btn-${addItemType === 'expense' ? 'danger' : 'success'} text-white fw-bold`}
              disabled={!newItem.name.trim()}
              onClick={addRow}
            >
              <Plus size={16} className="me-1" />
              <span>આઈટમ ઉમેરો</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* VIEW BOOKINGS ON THIS DATE MODAL */}
      <Modal
        isOpen={showBookingDetailsModal}
        onClose={() => setShowBookingDetailsModal(false)}
        title={`તારીખ ${date} ના ફંક્શન્સની યાદી`}
      >
        <div className="p-3">
          <div className="mb-3 d-flex justify-content-between align-items-center">
            <span className="small text-muted">
              કુલ ફંક્શન: <strong>{bookingStats.totalBookings}</strong>
            </span>
            <span className="badge bg-success-subtle text-success fs-6 fw-bold">
              કુલ બિલ રકમ: {money(bookingStats.functionRevenue)}
            </span>
          </div>

          <div className="table-responsive">
            <table className="table align-middle table-sm mb-0">
              <thead className="table-light">
                <tr>
                  <th>બુકિંગ નં.</th>
                  <th>ગ્રાહક</th>
                  <th>મહેમાન</th>
                  <th>સમય</th>
                  <th>સ્થિતિ</th>
                  <th className="text-end">રકમ</th>
                </tr>
              </thead>
              <tbody>
                {bookingStats.bookings.map(b => (
                  <tr key={b.bookingNumber}>
                    <td className="fw-semibold text-primary">{b.bookingNumber}</td>
                    <td className="fw-bold">{b.customerName}</td>
                    <td>{b.guestCount} વ્યક્તિ</td>
                    <td>{b.timeSlot || '—'}</td>
                    <td>
                      <span
                        className={`badge ${
                          b.isCompleted ? 'bg-success' : 'bg-warning text-dark'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="text-end fw-bold text-dark">
                      {money(b.totalAmount || b.advanceAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-end mt-3">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowBookingDetailsModal(false)}
            >
              બંધ કરો
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
