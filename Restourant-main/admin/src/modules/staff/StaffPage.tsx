import React, { useEffect, useState, useMemo, useRef } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/PermissionGate';
import { useNotification } from '../../context/NotificationContext';
import { Employee, EmployeeTransaction } from '../../types';
import {
  Users,
  UserPlus,
  Phone,
  CreditCard,
  Wallet,
  Calendar,
  Edit3,
  Trash2,
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Printer,
  Image as ImageIcon,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Upload,
  MessageCircle,
  Briefcase,
  Clock,
  Plus,
  RefreshCw,
  LayoutGrid,
  List,
  IndianRupee,
  ShieldCheck,
  Building2,
  AlertTriangle,
  Camera
} from 'lucide-react';

const COMMON_ROLES = [
  'મુખ્ય રસોઈયા (Head Chef)',
  'સહાયક રસોઈયા (Assistant Cook)',
  'રોટલી / પૂરી મેકર (Roti Maker)',
  'કિચન હેલ્પર (Kitchen Helper)',
  'વેઈટર / કેપ્ટન (Waiter)',
  'કાઉન્ટર / કેશિયર (Counter/Cashier)',
  'વાસણ / સફાઈ સ્ટાફ (Cleaning Staff)',
  'મેનેજર / સુપરવાઈઝર (Manager)',
  'ડિલિવરી સ્ટાફ (Delivery Staff)',
  'અન્ય સ્ટાફ (Other)'
];

const QUICK_UPAD_AMOUNTS = [500, 1000, 2000, 3000, 5000, 10000];

export const StaffPage: React.FC = () => {
  const { addToast } = useNotification();

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MONTHLY' | 'DAILY' | 'PENDING_UPAD' | 'ACTIVE'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Modal States
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [showUpadModal, setShowUpadModal] = useState(false);
  const [selectedStaffForUpad, setSelectedStaffForUpad] = useState<Employee | null>(null);

  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedStaffForSalary, setSelectedStaffForSalary] = useState<Employee | null>(null);

  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedStaffForLedger, setSelectedStaffForLedger] = useState<Employee | null>(null);
  const [staffLedgerData, setStaffLedgerData] = useState<{ employee: Employee; transactions: EmployeeTransaction[] } | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [showAadharModal, setShowAadharModal] = useState(false);
  const [selectedAadharUrl, setSelectedAadharUrl] = useState<{ name: string; code: string; url: string } | null>(null);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<{ name: string; code: string; url: string } | null>(null);

  // Form States - Employee Add/Edit
  const [formData, setFormData] = useState({
    employeeCode: '',
    name: '',
    phone: '',
    designationTitle: COMMON_ROLES[0],
    wageType: 'MONTHLY' as 'MONTHLY' | 'DAILY',
    baseSalary: 12000,
    dailyRate: 400,
    photoUrl: '',
    aadharCardUrl: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    notes: ''
  });
  const [savingEmployee, setSavingEmployee] = useState(false);

  // Form States - Give Upad
  const [upadForm, setUpadForm] = useState({
    amount: 1000,
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash',
    reason: '',
    referenceId: ''
  });
  const [submittingUpad, setSubmittingUpad] = useState(false);

  // Form States - Pay Salary
  const [salaryForm, setSalaryForm] = useState({
    period: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    date: new Date().toISOString().split('T')[0],
    daysWorked: 26,
    dailyRate: 400,
    grossSalary: 12000,
    advanceDeducted: 0,
    netPaid: 12000,
    paymentMode: 'Cash',
    referenceId: '',
    notes: ''
  });
  const [submittingSalary, setSubmittingSalary] = useState(false);

  // Photo & Aadhar file upload refs
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);
  const aadharFileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch all staff members
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/hr/employees');
      if (res && res.data) {
        setEmployees(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load employees:', err);
      addToast('ભૂલ', 'કર્મચારી ડેટા લોડ કરવામાં નિષ્ફળ રહ્યા.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Compute Summary KPI Stats
  const stats = useMemo(() => {
    const totalStaff = employees.length;
    const activeStaff = employees.filter(e => e.status === 'ACTIVE').length;
    const monthlyStaff = employees.filter(e => e.wageType === 'MONTHLY' && e.status === 'ACTIVE').length;
    const dailyStaff = employees.filter(e => e.wageType === 'DAILY' && e.status === 'ACTIVE').length;

    const totalMonthlyBudget = employees
      .filter(e => e.status === 'ACTIVE' && e.wageType === 'MONTHLY')
      .reduce((sum, e) => sum + (e.baseSalary || 0), 0);

    const totalOutstandingUpad = employees
      .reduce((sum, e) => sum + (e.outstandingUpad || 0), 0);

    const totalSalaryPaid = employees
      .reduce((sum, e) => sum + (e.totalSalaryPaid || 0), 0);

    const pendingUpadCount = employees.filter(e => (e.outstandingUpad || 0) > 0).length;

    return {
      totalStaff,
      activeStaff,
      monthlyStaff,
      dailyStaff,
      totalMonthlyBudget,
      totalOutstandingUpad,
      totalSalaryPaid,
      pendingUpadCount
    };
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Filter tab
      if (filterType === 'MONTHLY' && emp.wageType !== 'MONTHLY') return false;
      if (filterType === 'DAILY' && emp.wageType !== 'DAILY') return false;
      if (filterType === 'PENDING_UPAD' && (!emp.outstandingUpad || emp.outstandingUpad <= 0)) return false;
      if (filterType === 'ACTIVE' && emp.status !== 'ACTIVE') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchCode = emp.employeeCode.toLowerCase().includes(q);
        const matchPhone = (emp.phone || '').includes(q);
        const matchRole = (emp.designationTitle || '').toLowerCase().includes(q);
        return matchName || matchCode || matchPhone || matchRole;
      }
      return true;
    });
  }, [employees, filterType, searchQuery]);

  // Handle Passport Photo file conversion to base64
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast('મોટી ફાઇલ', 'પાસપોર્ટ સાઇઝ ફોટો 5MB થી નાનો હોવો જોઈએ.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData(prev => ({ ...prev, photoUrl: event.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Aadhar file conversion to base64
  const handleAadharFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast('મોટી ફાઇલ', 'આધાર કાર્ડ ફોટો 5MB થી નાનો હોવો જોઈએ.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData(prev => ({ ...prev, aadharCardUrl: event.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Add Staff Modal
  const handleOpenAddModal = () => {
    // Generate next suggested code
    const codes = employees.map(e => e.employeeCode).filter(c => c && c.startsWith('EMP-'));
    let nextNum = 1;
    codes.forEach(c => {
      const num = parseInt(c.replace('EMP-', ''), 10);
      if (!isNaN(num) && num >= nextNum) {
        nextNum = num + 1;
      }
    });
    const suggestedCode = `EMP-${String(nextNum).padStart(3, '0')}`;

    setEditingEmployee(null);
    setFormData({
      employeeCode: suggestedCode,
      name: '',
      phone: '',
      designationTitle: COMMON_ROLES[0],
      wageType: 'MONTHLY',
      baseSalary: 12000,
      dailyRate: 400,
      photoUrl: '',
      aadharCardUrl: '',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      notes: ''
    });
    setShowAddEditModal(true);
  };

  // Open Edit Staff Modal
  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      employeeCode: emp.employeeCode,
      name: emp.name,
      phone: emp.phone || '',
      designationTitle: emp.designationTitle || COMMON_ROLES[0],
      wageType: emp.wageType || 'MONTHLY',
      baseSalary: emp.baseSalary || 0,
      dailyRate: emp.dailyRate || 0,
      photoUrl: emp.photoUrl || '',
      aadharCardUrl: emp.aadharCardUrl || '',
      joiningDate: emp.joiningDate || new Date().toISOString().split('T')[0],
      status: (emp.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
      notes: emp.notes || ''
    });
    setShowAddEditModal(true);
  };

  // Save Staff (Create or Update)
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('અપૂર્ણ વિગત', 'કર્મચારીનું નામ દાખલ કરવું ફરજિયાત છે.', 'warning');
      return;
    }

    try {
      setSavingEmployee(true);
      if (editingEmployee) {
        // Update
        const res: any = await apiClient.put(`/hr/employees/${editingEmployee.id}`, formData);
        if (res && res.success !== false) {
          addToast('સફળતા', `${formData.name} ની પ્રોફાઇલ સફળતાપૂર્વક અપડેટ થઈ.`, 'success');
          setShowAddEditModal(false);
          fetchEmployees();
        }
      } else {
        // Create new
        const res: any = await apiClient.post('/hr/employees', formData);
        if (res && res.success !== false) {
          addToast('સફળતા', `નવો સ્ટાફ એકાઉન્ટ ${res.data?.employeeCode || formData.employeeCode} સફળતાપૂર્વક બન્યું!`, 'success');
          setShowAddEditModal(false);
          fetchEmployees();
        }
      }
    } catch (err: any) {
      console.error('Failed to save employee:', err);
      const msg = err.response?.data?.message || 'સ્ટાફ સેવ કરવામાં ભૂલ આવી.';
      addToast('ભૂલ', msg, 'danger');
    } finally {
      setSavingEmployee(false);
    }
  };

  // Delete Staff
  const handleDeleteEmployee = async (emp: Employee) => {
    const confirmMsg = `શું તમે ખરેખર ${emp.name} (${emp.employeeCode}) નું એકાઉન્ટ અને ખાતાવહી ડિલીટ કરવા માંગો છો? આ ક્રિયા રદ થઈ શકશે નહીં.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res: any = await apiClient.delete(`/hr/employees/${emp.id}`);
      if (res && res.success !== false) {
        addToast('સફળતા', `${emp.name} નું એકાઉન્ટ ડિલીટ થઈ ગયું.`, 'success');
        fetchEmployees();
      }
    } catch (err: any) {
      console.error('Failed to delete employee:', err);
      addToast('ભૂલ', 'કર્મચારી ડિલીટ કરવામાં સમસ્યા આવી.', 'danger');
    }
  };

  // Open Give Upad (Advance) Modal
  const handleOpenUpadModal = (emp: Employee) => {
    setSelectedStaffForUpad(emp);
    setUpadForm({
      amount: 1000,
      date: new Date().toISOString().split('T')[0],
      paymentMode: 'Cash',
      reason: 'ઘર ખર્ચ ઉપાડ',
      referenceId: ''
    });
    setShowUpadModal(true);
  };

  // Submit Give Upad
  const handleSubmitUpad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForUpad) return;

    if (!upadForm.amount || upadForm.amount <= 0) {
      addToast('ભૂલ', 'ઉપાડની રકમ 0 થી વધુ હોવી જોઈએ.', 'warning');
      return;
    }

    try {
      setSubmittingUpad(true);
      const res: any = await apiClient.post(`/hr/employees/${selectedStaffForUpad.id}/advance`, upadForm);
      if (res && res.success !== false) {
        addToast('ઉપાડ નોંધાઈ ગયો', `₹${upadForm.amount.toLocaleString('en-IN')} ઉપાડ ${selectedStaffForUpad.name} ના ખાતામાં જમા થયો.`, 'success');
        setShowUpadModal(false);
        fetchEmployees();
      }
    } catch (err: any) {
      console.error('Failed to record upad:', err);
      addToast('ભૂલ', 'ઉપાડ નોંધવામાં સમસ્યા આવી.', 'danger');
    } finally {
      setSubmittingUpad(false);
    }
  };

  // Open Pay Salary Modal
  const handleOpenSalaryModal = (emp: Employee) => {
    setSelectedStaffForSalary(emp);
    const isDaily = emp.wageType === 'DAILY';
    const initialDays = 26;
    const dailyRate = emp.dailyRate || 400;
    const gross = isDaily ? initialDays * dailyRate : (emp.baseSalary || 12000);
    const outstanding = emp.outstandingUpad || 0;

    // Suggest deducting up to available gross or full upad
    const suggestedDeduction = Math.min(outstanding, gross);
    const net = Math.max(0, gross - suggestedDeduction);

    setSalaryForm({
      period: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      date: new Date().toISOString().split('T')[0],
      daysWorked: initialDays,
      dailyRate: dailyRate,
      grossSalary: gross,
      advanceDeducted: suggestedDeduction,
      netPaid: net,
      paymentMode: 'Cash',
      referenceId: '',
      notes: `${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })} પગાર ચુકવણી`
    });
    setShowSalaryModal(true);
  };

  // Recalculate salary net paid when gross or deduction changes
  const handleGrossChange = (gross: number) => {
    const deduction = salaryForm.advanceDeducted;
    setSalaryForm(prev => ({
      ...prev,
      grossSalary: gross,
      netPaid: Math.max(0, gross - deduction)
    }));
  };

  const handleDeductionChange = (deduction: number) => {
    const gross = salaryForm.grossSalary;
    setSalaryForm(prev => ({
      ...prev,
      advanceDeducted: deduction,
      netPaid: Math.max(0, gross - deduction)
    }));
  };

  const handleDaysWorkedChange = (days: number) => {
    const rate = salaryForm.dailyRate;
    const newGross = days * rate;
    const deduction = salaryForm.advanceDeducted;
    setSalaryForm(prev => ({
      ...prev,
      daysWorked: days,
      grossSalary: newGross,
      netPaid: Math.max(0, newGross - deduction)
    }));
  };

  // Submit Pay Salary
  const handleSubmitSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForSalary) return;

    if (salaryForm.netPaid < 0) {
      addToast('ભૂલ', 'ચોખ્ખો ચૂકવાતો પગાર 0 થી ઓછો ન હોઈ શકે.', 'warning');
      return;
    }

    try {
      setSubmittingSalary(true);
      const res: any = await apiClient.post(`/hr/employees/${selectedStaffForSalary.id}/salary-payment`, salaryForm);
      if (res && res.success !== false) {
        addToast('પગાર ચૂકવાઈ ગયો', `${selectedStaffForSalary.name} ને ₹${salaryForm.netPaid.toLocaleString('en-IN')} પગાર ચૂકવાઈ ગયો.`, 'success');
        setShowSalaryModal(false);
        fetchEmployees();
      }
    } catch (err: any) {
      console.error('Failed to pay salary:', err);
      addToast('ભૂલ', 'પગાર નોંધવામાં સમસ્યા આવી.', 'danger');
    } finally {
      setSubmittingSalary(false);
    }
  };

  // Open Ledger / Digital Passbook Modal
  const handleOpenLedgerModal = async (emp: Employee) => {
    setSelectedStaffForLedger(emp);
    setShowLedgerModal(true);
    setLedgerLoading(true);
    try {
      const res: any = await apiClient.get(`/hr/employees/${emp.id}/ledger`);
      if (res && res.data) {
        setStaffLedgerData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load ledger:', err);
      addToast('ભૂલ', 'ખાતાવહી લોડ કરવામાં સમસ્યા આવી.', 'danger');
    } finally {
      setLedgerLoading(false);
    }
  };

  // Delete individual transaction from ledger
  const handleDeleteTransaction = async (txId: string) => {
    if (!window.confirm('શું તમે ખરેખર આ હિસાબ એન્ટ્રી રદ કરવા માંગો છો?')) return;
    try {
      const res: any = await apiClient.delete(`/hr/transactions/${txId}`);
      if (res && res.success !== false) {
        addToast('સફળતા', 'એન્ટ્રી ડિલીટ થઈ ગઈ.', 'success');
        if (selectedStaffForLedger) {
          handleOpenLedgerModal(selectedStaffForLedger);
        }
        fetchEmployees();
      }
    } catch (err: any) {
      console.error('Failed to delete transaction:', err);
      addToast('ભૂલ', 'એન્ટ્રી ડિલીટ કરવામાં સમસ્યા આવી.', 'danger');
    }
  };

  // Print Passbook Slip
  const handlePrintPassbook = () => {
    window.print();
  };

  return (
    <div className="container-fluid p-3 p-md-4">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <div className="p-2 bg-primary bg-opacity-10 rounded-3 text-primary d-flex align-items-center justify-content-center">
              <Users size={24} />
            </div>
            <h1 className="h4 fw-bold text-dark mb-0">સ્ટાફ અને પગાર વ્યવસ્થાપન (Staff & Salary)</h1>
          </div>
          <p className="text-muted small mb-0">
            કર્મચારીઓની પ્રોફાઇલ, આધાર કાર્ડ, દૈનિક/માસિક પગાર, ઉપાડ (ઉધાર) અને ડિજિટલ ખાતાવહી પાસબુક
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Refresh Button */}
          <button
            className="btn btn-outline-secondary d-flex align-items-center gap-1 shadow-sm"
            onClick={fetchEmployees}
            disabled={loading}
            title="ડેટા રીફ્રેશ કરો"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span className="d-none d-sm-inline">રીફ્રેશ</span>
          </button>

          {/* View Switch */}
          <div className="btn-group shadow-sm" role="group">
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'GRID' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('GRID')}
              title="કાર્ડ વ્યુ"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'TABLE' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('TABLE')}
              title="ટેબલ લિસ્ટ વ્યુ"
            >
              <List size={16} />
            </button>
          </div>

          {/* Add Staff Button */}
          <button
            className="btn btn-primary d-flex align-items-center gap-2 shadow-sm fw-semibold px-3"
            onClick={handleOpenAddModal}
          >
            <UserPlus size={18} />
            <span>+ નવો સ્ટાફ ઉમેરો</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="row g-3 mb-4">
        {/* Card 1: Total Staff */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-semibold text-uppercase" style={{ letterSpacing: '0.04em' }}>
                  કુલ સક્રિય સ્ટાફ
                </span>
                <div className="p-2 rounded-circle bg-primary bg-opacity-10 text-primary">
                  <Users size={18} />
                </div>
              </div>
              <div className="d-flex align-items-baseline gap-2">
                <h3 className="h3 fw-bold text-dark mb-0">{stats.activeStaff}</h3>
                <span className="text-muted small">/ કુલ {stats.totalStaff} સ્ટાફ</span>
              </div>
              <div className="mt-2 pt-2 border-top d-flex justify-content-between small text-muted">
                <span>માસિક: <strong>{stats.monthlyStaff}</strong></span>
                <span>રોજદાર: <strong>{stats.dailyStaff}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Monthly Budget */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-semibold text-uppercase" style={{ letterSpacing: '0.04em' }}>
                  માસિક પગાર બજેટ
                </span>
                <div className="p-2 rounded-circle bg-success bg-opacity-10 text-success">
                  <Wallet size={18} />
                </div>
              </div>
              <div className="d-flex align-items-baseline gap-2">
                <h3 className="h3 fw-bold text-success mb-0">₹{stats.totalMonthlyBudget.toLocaleString('en-IN')}</h3>
                <span className="text-muted small">/ મહિનો</span>
              </div>
              <div className="mt-2 pt-2 border-top small text-muted">
                <span>માસિક પગારદાર સ્ટાફની કુલ રકમ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Total Outstanding Upad */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className={`card border-0 shadow-sm rounded-3 h-100 ${stats.totalOutstandingUpad > 0 ? 'bg-danger bg-opacity-10 border border-danger border-opacity-25' : 'bg-white'}`}>
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className={`small fw-semibold text-uppercase ${stats.totalOutstandingUpad > 0 ? 'text-danger' : 'text-muted'}`} style={{ letterSpacing: '0.04em' }}>
                  કુલ બાકી ઉપાડ (ઉધાર)
                </span>
                <div className={`p-2 rounded-circle ${stats.totalOutstandingUpad > 0 ? 'bg-danger text-white' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className="d-flex align-items-baseline gap-2">
                <h3 className={`h3 fw-bold mb-0 ${stats.totalOutstandingUpad > 0 ? 'text-danger' : 'text-dark'}`}>
                  ₹{stats.totalOutstandingUpad.toLocaleString('en-IN')}
                </h3>
              </div>
              <div className="mt-2 pt-2 border-top d-flex justify-content-between small">
                <span className={stats.totalOutstandingUpad > 0 ? 'text-danger fw-semibold' : 'text-muted'}>
                  {stats.pendingUpadCount} સ્ટાફ પાસેથી વસૂલવાનો બાકી
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Total Salary Disbursed */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 bg-white">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-semibold text-uppercase" style={{ letterSpacing: '0.04em' }}>
                  કુલ ચૂકવેલ પગાર
                </span>
                <div className="p-2 rounded-circle bg-info bg-opacity-10 text-info">
                  <CreditCard size={18} />
                </div>
              </div>
              <div className="d-flex align-items-baseline gap-2">
                <h3 className="h3 fw-bold text-dark mb-0">₹{stats.totalSalaryPaid.toLocaleString('en-IN')}</h3>
              </div>
              <div className="mt-2 pt-2 border-top small text-muted">
                <span>કુલ ખાતાવહીમાં ચૂકવેલ રકમ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filter Tabs */}
      <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            {/* Search */}
            <div className="col-12 col-md-5 col-lg-4">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-muted">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0 ps-0"
                  placeholder="નામ, મોબાઈલ અથવા સ્ટાફ ID થી શોધો..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="btn btn-light border-start-0 text-muted"
                    type="button"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="col-12 col-md-7 col-lg-8">
              <div className="d-flex align-items-center gap-1 flex-wrap">
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 fw-medium ${filterType === 'ALL' ? 'btn-primary' : 'btn-light text-dark'}`}
                  onClick={() => setFilterType('ALL')}
                >
                  બધા સ્ટાફ ({employees.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 fw-medium ${filterType === 'MONTHLY' ? 'btn-primary' : 'btn-light text-dark'}`}
                  onClick={() => setFilterType('MONTHLY')}
                >
                  💼 માસિક પગારદાર ({employees.filter(e => e.wageType === 'MONTHLY').length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 fw-medium ${filterType === 'DAILY' ? 'btn-primary' : 'btn-light text-dark'}`}
                  onClick={() => setFilterType('DAILY')}
                >
                  ⏱️ રોજદાર ({employees.filter(e => e.wageType === 'DAILY').length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 fw-medium ${filterType === 'PENDING_UPAD' ? 'btn-danger' : 'btn-light text-danger'}`}
                  onClick={() => setFilterType('PENDING_UPAD')}
                >
                  ⚠️ બાકી ઉપાડવાળા ({employees.filter(e => (e.outstandingUpad || 0) > 0).length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 fw-medium ${filterType === 'ACTIVE' ? 'btn-success' : 'btn-light text-success'}`}
                  onClick={() => setFilterType('ACTIVE')}
                >
                  ✅ સક્રિય ({employees.filter(e => e.status === 'ACTIVE').length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Display Section */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">સ્ટાફ ડેટા લોડ થઈ રહ્યો છે...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="card border-0 shadow-sm rounded-3 bg-white p-5 text-center">
          <div className="text-muted mb-3">
            <Users size={48} className="opacity-50" />
          </div>
          <h5 className="fw-bold text-dark">કોઈ સ્ટાફ સભ્ય મળ્યા નહીં</h5>
          <p className="text-muted small mb-3">
            {searchQuery
              ? `"${searchQuery}" માટે કોઈ પરિણામ મળ્યું નથી.`
              : 'હજી સુધી કોઈ સ્ટાફ ઉમેરેલો નથી.'}
          </p>
          <div className="d-flex justify-content-center">
            <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenAddModal}>
              <UserPlus size={16} />
              <span>+ નવો સ્ટાફ ઉમેરો</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'GRID' ? (
        /* GRID VIEW */
        <div className="row g-3">
          {filteredEmployees.map(emp => {
            const hasPhoto = Boolean(emp.photoUrl && emp.photoUrl.trim().length > 10);
            const hasAadhar = Boolean(emp.aadharCardUrl && emp.aadharCardUrl.trim().length > 10);
            const outstanding = emp.outstandingUpad || 0;
            const isPendingUpad = outstanding > 0;

            return (
              <div key={emp.id} className="col-12 col-md-6 col-xl-4">
                <div className="card border-0 shadow-sm rounded-3 h-100 bg-white hover-shadow transition-all">
                  {/* Card Header */}
                  <div className="card-body p-3 p-sm-4 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                        <div className="d-flex align-items-center gap-3">
                          {/* Passport Photo or Letter Avatar */}
                          {hasPhoto ? (
                            <div
                              className="position-relative rounded-circle overflow-hidden shadow-sm border border-2 border-primary flex-shrink-0 cursor-pointer"
                              style={{ width: '48px', height: '48px' }}
                              onClick={() => {
                                setSelectedPhotoUrl({ name: emp.name, code: emp.employeeCode, url: emp.photoUrl! });
                                setShowPhotoModal(true);
                              }}
                              title="પાસપોર્ટ સાઇઝ ફોટો મોટો જુઓ"
                            >
                              <img
                                src={emp.photoUrl}
                                alt={emp.name}
                                className="w-100 h-100"
                                style={{ objectFit: 'cover' }}
                              />
                              <div
                                className="position-absolute bottom-0 end-0 bg-dark bg-opacity-75 text-white p-0.5 rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: '16px', height: '16px', fontSize: '9px' }}
                              >
                                <Eye size={10} />
                              </div>
                            </div>
                          ) : (
                            <div
                              className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fw-bold shadow-sm flex-shrink-0"
                              style={{ width: '48px', height: '48px', fontSize: '1.1rem' }}
                            >
                              {emp.name.charAt(0)}
                            </div>
                          )}

                          {/* Name & ID */}
                          <div>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <h5 className="fw-bold text-dark mb-0 fs-6">{emp.name}</h5>
                              <span className="badge bg-light text-primary border border-primary border-opacity-25 fw-semibold" style={{ fontSize: '0.72rem' }}>
                                {emp.employeeCode}
                              </span>
                            </div>
                            <div className="text-muted small mt-0.5 d-flex align-items-center gap-1">
                              <Briefcase size={13} className="text-muted" />
                              <span>{emp.designationTitle || 'સ્ટાફ'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status badge */}
                        <span className={`badge ${emp.status === 'ACTIVE' ? 'bg-success bg-opacity-15 text-success' : 'bg-secondary bg-opacity-15 text-secondary'} fw-semibold`} style={{ fontSize: '0.7rem' }}>
                          {emp.status === 'ACTIVE' ? 'સક્રિય' : 'નિષ્ક્રિય'}
                        </span>
                      </div>

                      {/* Details Box */}
                      <div className="bg-light rounded-3 p-2.5 mb-3 small">
                        {/* Phone with WhatsApp and Call link */}
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="text-muted d-flex align-items-center gap-1.5">
                            <Phone size={14} className="text-muted" />
                            <span>મોબાઈલ:</span>
                          </span>
                          {emp.phone ? (
                            <div className="d-flex align-items-center gap-2">
                              <a
                                href={`tel:${emp.phone}`}
                                className="text-dark fw-semibold text-decoration-none hover-underline"
                                title="કૉલ કરો"
                              >
                                {emp.phone}
                              </a>
                              <a
                                href={`https://wa.me/91${emp.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`નમસ્તે ${emp.name}, ભાતીગળ ભાણું રેસ્ટોરન્ટ તરફથી સંદેશ.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-success p-1 rounded-circle hover-bg-light"
                                title="WhatsApp પર મેસેજ મોકલો"
                              >
                                <MessageCircle size={15} />
                              </a>
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </div>

                        {/* Wage Type */}
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="text-muted d-flex align-items-center gap-1.5">
                            <Clock size={14} className="text-muted" />
                            <span>પ્રકાર:</span>
                          </span>
                          <span className="fw-semibold">
                            {emp.wageType === 'DAILY' ? (
                              <span className="badge bg-warning bg-opacity-25 text-dark">
                                રોજદાર: ₹{(emp.dailyRate || 0).toLocaleString('en-IN')} / દિવસ
                              </span>
                            ) : (
                              <span className="badge bg-primary bg-opacity-15 text-primary">
                                માસિક: ₹{(emp.baseSalary || 0).toLocaleString('en-IN')} / મહિનો
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Aadhar status */}
                        <div className="d-flex align-items-center justify-content-between">
                          <span className="text-muted d-flex align-items-center gap-1.5">
                            <ShieldCheck size={14} className="text-muted" />
                            <span>આધાર કાર્ડ:</span>
                          </span>
                          {hasAadhar ? (
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 text-primary text-decoration-none fw-semibold d-flex align-items-center gap-1"
                              onClick={() => {
                                setSelectedAadharUrl({ name: emp.name, code: emp.employeeCode, url: emp.aadharCardUrl! });
                                setShowAadharModal(true);
                              }}
                            >
                              <Eye size={13} />
                              <span>ફોટો જુઓ</span>
                            </button>
                          ) : (
                            <span className="text-muted">અપલોડ બાકી</span>
                          )}
                        </div>
                      </div>

                      {/* Outstanding Upad (Udhar) Box */}
                      <div
                        className={`rounded-3 p-3 mb-3 border ${
                          isPendingUpad
                            ? 'bg-danger bg-opacity-10 border-danger border-opacity-30'
                            : 'bg-success bg-opacity-10 border-success border-opacity-25'
                        }`}
                      >
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            <span className={`small fw-bold d-block ${isPendingUpad ? 'text-danger' : 'text-success'}`}>
                              {isPendingUpad ? '⚠️ બાકી ઉપાડ (ઉધાર)' : '✓ હિસાબ ક્લીયર'}
                            </span>
                            <h4 className={`fw-bold mb-0 ${isPendingUpad ? 'text-danger' : 'text-success'}`}>
                              ₹{outstanding.toLocaleString('en-IN')}
                            </h4>
                          </div>
                          <span className={`badge ${isPendingUpad ? 'bg-danger text-white' : 'bg-success text-white'} fw-semibold`}>
                            {isPendingUpad ? 'વસૂલવાનો બાકી' : 'કોઈ ઉપાડ નથી'}
                          </span>
                        </div>

                        {/* Sub hisab info */}
                        <div className="d-flex justify-content-between pt-2 mt-2 border-top border-secondary border-opacity-20 small text-muted">
                          <span>કુલ ઉપાડ: <strong>₹{(emp.totalUpad || 0).toLocaleString('en-IN')}</strong></span>
                          <span>કપાયેલ: <strong>₹{(emp.totalUpadDeducted || 0).toLocaleString('en-IN')}</strong></span>
                          <span>પગાર: <strong>₹{(emp.totalSalaryPaid || 0).toLocaleString('en-IN')}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-top">
                      <div className="row g-2">
                        {/* Upad Button */}
                        <div className="col-6">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-1 fw-semibold shadow-xs"
                            onClick={() => handleOpenUpadModal(emp)}
                          >
                            <ArrowUpRight size={15} />
                            <span>+ ઉપાડ આપો</span>
                          </button>
                        </div>

                        {/* Pay Salary Button */}
                        <div className="col-6">
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm w-100 d-flex align-items-center justify-content-center gap-1 fw-semibold shadow-xs"
                            onClick={() => handleOpenSalaryModal(emp)}
                          >
                            <Wallet size={15} />
                            <span>💰 પગાર ચૂકવો</span>
                          </button>
                        </div>

                        {/* Passbook / Ledger Button */}
                        <div className="col-8">
                          <button
                            type="button"
                            className="btn btn-light btn-sm w-100 d-flex align-items-center justify-content-center gap-1 text-dark fw-semibold border"
                            onClick={() => handleOpenLedgerModal(emp)}
                          >
                            <FileText size={15} className="text-primary" />
                            <span>ખાતાવહી પાસબુક</span>
                          </button>
                        </div>

                        {/* Edit & Delete Buttons */}
                        <div className="col-4 d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-light btn-sm border flex-fill d-flex align-items-center justify-content-center text-primary"
                            onClick={() => handleOpenEditModal(emp)}
                            title="પ્રોફાઇલ એડિટ કરો"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-light btn-sm border flex-fill d-flex align-items-center justify-content-center text-danger"
                            onClick={() => handleDeleteEmployee(emp)}
                            title="સ્ટાફ ડિલીટ કરો"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="card border-0 shadow-sm rounded-3 bg-white overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-3 py-3">સ્ટાફ ID & નામ</th>
                  <th className="py-3">મોબાઈલ</th>
                  <th className="py-3">હોદ્દો (Role)</th>
                  <th className="py-3">પગાર પ્રકાર</th>
                  <th className="py-3">કુલ ઉપાડ</th>
                  <th className="py-3">બાકી ઉપાડ (ઉધાર)</th>
                  <th className="py-3">કુલ ચૂકવેલ પગાર</th>
                  <th className="py-3">આધાર કાર્ડ</th>
                  <th className="text-end pe-3 py-3">ક્રિયાઓ (Actions)</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => {
                  const hasPhoto = Boolean(emp.photoUrl && emp.photoUrl.trim().length > 10);
                  const hasAadhar = Boolean(emp.aadharCardUrl && emp.aadharCardUrl.trim().length > 10);
                  const outstanding = emp.outstandingUpad || 0;
                  const isPendingUpad = outstanding > 0;

                  return (
                    <tr key={emp.id}>
                      <td className="ps-3 py-3">
                        <div className="d-flex align-items-center gap-2.5">
                          {hasPhoto ? (
                            <div
                              className="rounded-circle overflow-hidden border border-primary flex-shrink-0 cursor-pointer shadow-xs"
                              style={{ width: '36px', height: '36px' }}
                              onClick={() => {
                                setSelectedPhotoUrl({ name: emp.name, code: emp.employeeCode, url: emp.photoUrl! });
                                setShowPhotoModal(true);
                              }}
                              title="પાસપોર્ટ સાઇઝ ફોટો મોટો જુઓ"
                            >
                              <img src={emp.photoUrl} alt={emp.name} className="w-100 h-100" style={{ objectFit: 'cover' }} />
                            </div>
                          ) : (
                            <div
                              className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                              style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}
                            >
                              {emp.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="d-flex align-items-center gap-1.5">
                              <span className="badge bg-light text-primary border border-primary border-opacity-25 fw-bold font-monospace" style={{ fontSize: '0.72rem' }}>
                                {emp.employeeCode}
                              </span>
                              <span className="fw-bold text-dark">{emp.name}</span>
                            </div>
                            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>જોડાવાની તારીખ: {emp.joiningDate || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        {emp.phone ? (
                          <div className="d-flex align-items-center gap-1.5">
                            <span className="fw-medium">{emp.phone}</span>
                            <a
                              href={`https://wa.me/91${emp.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`નમસ્તે ${emp.name}, ભાતીગળ ભાણું રેસ્ટોરન્ટ.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-success p-1 rounded-circle hover-bg-light"
                              title="WhatsApp મેસેજ"
                            >
                              <MessageCircle size={15} />
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="badge bg-light text-dark border">
                          {emp.designationTitle || 'સ્ટાફ'}
                        </span>
                      </td>
                      <td className="py-3">
                        {emp.wageType === 'DAILY' ? (
                          <span className="badge bg-warning bg-opacity-25 text-dark">
                            રોજદાર: ₹{emp.dailyRate}/દિ
                          </span>
                        ) : (
                          <span className="badge bg-primary bg-opacity-15 text-primary">
                            માસિક: ₹{(emp.baseSalary || 0).toLocaleString('en-IN')}/મહિનો
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="fw-semibold">₹{(emp.totalUpad || 0).toLocaleString('en-IN')}</span>
                      </td>
                      <td className="py-3">
                        {isPendingUpad ? (
                          <span className="badge bg-danger text-white fw-bold px-2 py-1">
                            ₹{outstanding.toLocaleString('en-IN')} બાકી
                          </span>
                        ) : (
                          <span className="badge bg-success bg-opacity-20 text-success fw-bold px-2 py-1">
                            ₹0 (ક્લીયર)
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="fw-semibold text-dark">₹{(emp.totalSalaryPaid || 0).toLocaleString('en-IN')}</span>
                      </td>
                      <td className="py-3">
                        {hasAadhar ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-0 px-2 d-inline-flex align-items-center gap-1"
                            onClick={() => {
                              setSelectedAadharUrl({ name: emp.name, code: emp.employeeCode, url: emp.aadharCardUrl! });
                              setShowAadharModal(true);
                            }}
                          >
                            <Eye size={12} />
                            <span>જુઓ</span>
                          </button>
                        ) : (
                          <span className="text-muted small">બાકી</span>
                        )}
                      </td>
                      <td className="text-end pe-3 py-3">
                        <div className="d-flex align-items-center justify-content-end gap-1">
                          <button
                            className="btn btn-sm btn-outline-danger px-2"
                            onClick={() => handleOpenUpadModal(emp)}
                            title="ઉપાડ આપો"
                          >
                            + ઉપાડ
                          </button>
                          <button
                            className="btn btn-sm btn-outline-success px-2"
                            onClick={() => handleOpenSalaryModal(emp)}
                            title="પગાર ચૂકવો"
                          >
                            💰 પગાર
                          </button>
                          <button
                            className="btn btn-sm btn-light border px-2"
                            onClick={() => handleOpenLedgerModal(emp)}
                            title="ખાતાવહી પાસબુક"
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-light border px-2 text-primary"
                            onClick={() => handleOpenEditModal(emp)}
                            title="એડિટ"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-light border px-2 text-danger"
                            onClick={() => handleDeleteEmployee(emp)}
                            title="ડિલીટ"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: ADD / EDIT EMPLOYEE
         ======================================================== */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={editingEmployee ? `સ્ટાફ પ્રોફાઇલ એડિટ કરો: ${editingEmployee.name}` : 'નવા સ્ટાફ / કર્મચારીનું ખાતું ઉમેરો'}
        size="lg"
      >
        <form onSubmit={handleSaveEmployee}>
          <div className="row g-3">
            {/* Employee ID Code */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-dark">
                સ્ટાફ ID કોડ <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted">
                  <CreditCard size={16} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="સ્ટાફ ID (જેમ કે EMP-001)"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                દરેક સ્ટાફ માટે અનન્ય ID (ખાલી રાખશો તો આપમેળે બનશે)
              </span>
            </div>

            {/* Staff Name */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-dark">
                કર્મચારીનું પૂરું નામ <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="કર્મચારીનું નામ દાખલ કરો"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Mobile Number */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-dark">
                મોબાઈલ નંબર <span className="text-muted">(WhatsApp / સંપર્ક)</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted">+91</span>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="10 અંકનો મોબાઈલ નંબર"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, '') })}
                />
              </div>
            </div>

            {/* Role / Designation */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-dark">
                હોદ્દો / કામગીરી (Role)
              </label>
              <select
                className="form-select"
                value={formData.designationTitle}
                onChange={(e) => setFormData({ ...formData, designationTitle: e.target.value })}
              >
                {COMMON_ROLES.map((role, idx) => (
                  <option key={idx} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Wage Type Selection (Monthly vs Daily) */}
            <div className="col-12">
              <label className="form-label small fw-bold text-dark mb-1">
                પગારનો પ્રકાર (Wage Type) <span className="text-danger">*</span>
              </label>
              <div className="row g-2">
                <div className="col-6">
                  <div
                    className={`card p-3 rounded-3 cursor-pointer border ${
                      formData.wageType === 'MONTHLY'
                        ? 'border-primary bg-primary bg-opacity-10 text-primary fw-bold'
                        : 'bg-light text-muted'
                    }`}
                    onClick={() => setFormData({ ...formData, wageType: 'MONTHLY' })}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        name="wageType"
                        checked={formData.wageType === 'MONTHLY'}
                        onChange={() => setFormData({ ...formData, wageType: 'MONTHLY' })}
                        className="form-check-input mt-0"
                      />
                      <div>
                        <div className="text-dark fw-bold">માસિક પગાર (Monthly)</div>
                        <div className="small text-muted fw-normal">દર મહિને નક્કી કરેલ પગાર</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-6">
                  <div
                    className={`card p-3 rounded-3 cursor-pointer border ${
                      formData.wageType === 'DAILY'
                        ? 'border-warning bg-warning bg-opacity-10 text-dark fw-bold'
                        : 'bg-light text-muted'
                    }`}
                    onClick={() => setFormData({ ...formData, wageType: 'DAILY' })}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="radio"
                        name="wageType"
                        checked={formData.wageType === 'DAILY'}
                        onChange={() => setFormData({ ...formData, wageType: 'DAILY' })}
                        className="form-check-input mt-0"
                      />
                      <div>
                        <div className="text-dark fw-bold">રોજદાર / દૈનિક (Daily)</div>
                        <div className="small text-muted fw-normal">દર દિવસના હિસાબે ચુકવણી</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rate / Salary Input depending on Wage Type */}
            {formData.wageType === 'MONTHLY' ? (
              <div className="col-12 col-sm-6">
                <label className="form-label small fw-bold text-dark">
                  માસિક મૂળ પગાર (Monthly Base Salary ₹) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted">₹</span>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="માસિક પગાર દાખલ કરો"
                    min={0}
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="col-12 col-sm-6">
                <label className="form-label small fw-bold text-dark">
                  દૈનિક રોજી દર (Daily Rate ₹) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted">₹</span>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="દિવસનો દર દાખલ કરો"
                    min={0}
                    value={formData.dailyRate}
                    onChange={(e) => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
            )}

            {/* Joining Date */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-dark">
                જોડાવાની તારીખ (Joining Date)
              </label>
              <input
                type="date"
                className="form-control"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
              />
            </div>

            {/* Passport Size Photo Upload */}
            <div className="col-12 col-md-6">
              <label className="form-label small fw-bold text-dark mb-1 d-flex align-items-center gap-1">
                <Camera size={15} className="text-primary" /> પાસપોર્ટ સાઇઝ ફોટો (Staff Passport Photo)
              </label>
              <div className="card p-3 border-dashed bg-light text-center rounded-3 h-100 d-flex flex-column justify-content-center">
                {formData.photoUrl ? (
                  <div className="d-flex flex-column align-items-center">
                    <div className="position-relative mb-2">
                      <img
                        src={formData.photoUrl}
                        alt="Passport Preview"
                        className="rounded-circle shadow-sm border border-2 border-primary"
                        style={{ width: '90px', height: '90px', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        className="btn btn-danger btn-sm position-absolute top-0 end-0 rounded-circle p-1"
                        onClick={() => setFormData({ ...formData, photoUrl: '' })}
                        title="ફોટો હટાવો"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => photoFileInputRef.current?.click()}
                    >
                      બીજો ફોટો પસંદ કરો
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={photoFileInputRef}
                      className="d-none"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                    />
                    <div
                      className="cursor-pointer py-2"
                      onClick={() => photoFileInputRef.current?.click()}
                    >
                      <div className="p-2 rounded-circle bg-primary bg-opacity-10 text-primary d-inline-flex mb-2">
                        <Camera size={26} />
                      </div>
                      <div className="fw-semibold text-dark small">પાસપોર્ટ સાઇઝ ફોટો અપલોડ કરો</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>JPG, PNG (કાર્ડ પર દેખાશે)</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Aadhar Card Photo Upload */}
            <div className="col-12 col-md-6">
              <label className="form-label small fw-bold text-dark mb-1 d-flex align-items-center gap-1">
                <ShieldCheck size={15} className="text-success" /> આધાર કાર્ડ ફોટો (Aadhar Card Photo)
              </label>
              <div className="card p-3 border-dashed bg-light text-center rounded-3 h-100 d-flex flex-column justify-content-center">
                {formData.aadharCardUrl ? (
                  <div className="d-flex flex-column align-items-center">
                    <div className="position-relative mb-2">
                      <img
                        src={formData.aadharCardUrl}
                        alt="Aadhar Card Preview"
                        className="rounded-2 shadow-sm border"
                        style={{ maxHeight: '90px', maxWidth: '160px', objectFit: 'contain' }}
                      />
                      <button
                        type="button"
                        className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 rounded-circle p-1"
                        onClick={() => setFormData({ ...formData, aadharCardUrl: '' })}
                        title="ફોટો હટાવો"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => aadharFileInputRef.current?.click()}
                    >
                      બીજો ફોટો પસંદ કરો
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={aadharFileInputRef}
                      className="d-none"
                      accept="image/*"
                      onChange={handleAadharFileChange}
                    />
                    <div
                      className="cursor-pointer py-2"
                      onClick={() => aadharFileInputRef.current?.click()}
                    >
                      <div className="p-2 rounded-circle bg-success bg-opacity-10 text-success d-inline-flex mb-2">
                        <Upload size={26} />
                      </div>
                      <div className="fw-semibold text-dark small">આધાર કાર્ડનો ફોટો અપલોડ કરો</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>JPG, PNG અથવા WebP</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status & Notes */}
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-dark">
                સ્થિતિ (Status)
              </label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
              >
                <option value="ACTIVE">સક્રિય (Active)</option>
                <option value="INACTIVE">નિષ્ક્રિય (Inactive)</option>
              </select>
            </div>

            <div className="col-12 col-sm-6">
              <label className="form-label small fw-bold text-dark">
                વિશેષ નોંધ (Notes)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="સરનામું અથવા અન્ય નોંધ..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <button
              type="button"
              className="btn btn-light"
              onClick={() => setShowAddEditModal(false)}
            >
              રદ કરો
            </button>
            <button
              type="submit"
              className="btn btn-primary d-flex align-items-center gap-1.5 px-4"
              disabled={savingEmployee}
            >
              {savingEmployee ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" />
                  <span>સેવ થઈ રહ્યું છે...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{editingEmployee ? 'પ્રોફાઇલ અપડેટ કરો' : 'સ્ટાફ એકાઉન્ટ બનાવો'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL 2: GIVE UPAD (ADVANCE / UDHAR)
         ======================================================== */}
      <Modal
        isOpen={showUpadModal}
        onClose={() => setShowUpadModal(false)}
        title={selectedStaffForUpad ? `ઉપાડ (Advance) આપો: ${selectedStaffForUpad.name} (${selectedStaffForUpad.employeeCode})` : 'ઉપાડ આપો'}
        size="md"
      >
        {selectedStaffForUpad && (
          <form onSubmit={handleSubmitUpad}>
            {/* Staff Info Banner */}
            <div className="bg-light p-3 rounded-3 mb-3 border">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="text-muted small">હાલનો બાકી ઉપાડ (ઉધાર):</span>
                <span className={`fw-bold ${(selectedStaffForUpad.outstandingUpad || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                  ₹{(selectedStaffForUpad.outstandingUpad || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center small text-muted">
                <span>પગાર પ્રકાર:</span>
                <span>
                  {selectedStaffForUpad.wageType === 'DAILY'
                    ? `રોજદાર (₹${selectedStaffForUpad.dailyRate}/દિ)`
                    : `માસિક (₹${selectedStaffForUpad.baseSalary}/મહિનો)`}
                </span>
              </div>
            </div>

            {/* Quick Amount Chips */}
            <div className="mb-3">
              <label className="form-label small fw-bold text-dark mb-1">ઝડપી રકમ પસંદ કરો:</label>
              <div className="d-flex flex-wrap gap-1.5">
                {QUICK_UPAD_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    className={`btn btn-sm ${upadForm.amount === amt ? 'btn-danger' : 'btn-light border'} fw-medium`}
                    onClick={() => setUpadForm({ ...upadForm, amount: amt })}
                  >
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="mb-3">
              <label className="form-label small fw-bold text-dark">
                ઉપાડની રકમ (Amount ₹) <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted">₹</span>
                <input
                  type="number"
                  className="form-control form-control-lg fw-bold text-danger"
                  placeholder="ઉપાડ રકમ દાખલ કરો"
                  min={1}
                  value={upadForm.amount}
                  onChange={(e) => setUpadForm({ ...upadForm, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            {/* Date & Payment Mode */}
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small fw-bold text-dark">તારીખ</label>
                <input
                  type="date"
                  className="form-control"
                  value={upadForm.date}
                  onChange={(e) => setUpadForm({ ...upadForm, date: e.target.value })}
                  required
                />
              </div>

              <div className="col-6">
                <label className="form-label small fw-bold text-dark">ચુકવણી માધ્યમ</label>
                <select
                  className="form-select"
                  value={upadForm.paymentMode}
                  onChange={(e) => setUpadForm({ ...upadForm, paymentMode: e.target.value })}
                >
                  <option value="Cash">રોકડ (Cash)</option>
                  <option value="UPI">UPI / Google Pay</option>
                  <option value="Bank Transfer">બેંક ટ્રાન્સફર</option>
                  <option value="Cheque">ચેક</option>
                </select>
              </div>
            </div>

            {/* Reason / Notes */}
            <div className="mb-3">
              <label className="form-label small fw-bold text-dark">ઉપાડનું કારણ / નોંધ</label>
              <input
                type="text"
                className="form-control"
                placeholder="ઉપાડનું કારણ દાખલ કરો..."
                value={upadForm.reason}
                onChange={(e) => setUpadForm({ ...upadForm, reason: e.target.value })}
              />
            </div>

            {/* Projected Outstanding */}
            <div className="p-2.5 rounded-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 mb-4 text-center">
              <span className="small text-danger fw-semibold">
                આ ઉપાડ આપ્યા પછી નવો બાકી ઉપાડ થશે: <strong>₹{((selectedStaffForUpad.outstandingUpad || 0) + (upadForm.amount || 0)).toLocaleString('en-IN')}</strong>
              </span>
            </div>

            {/* Modal Actions */}
            <div className="d-flex justify-content-end gap-2 pt-2 border-top">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setShowUpadModal(false)}
              >
                રદ કરો
              </button>
              <button
                type="submit"
                className="btn btn-danger d-flex align-items-center gap-1.5 px-4"
                disabled={submittingUpad}
              >
                {submittingUpad ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" />
                    <span>નોંધાઈ રહ્યું છે...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>ઉપાડ ચૂકવો & નોંધો</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================
          MODAL 3: PAY SALARY WITH UPAD DEDUCTION
         ======================================================== */}
      <Modal
        isOpen={showSalaryModal}
        onClose={() => setShowSalaryModal(false)}
        title={selectedStaffForSalary ? `પગાર ચુકવણી: ${selectedStaffForSalary.name} (${selectedStaffForSalary.employeeCode})` : 'પગાર ચૂકવો'}
        size="lg"
      >
        {selectedStaffForSalary && (
          <form onSubmit={handleSubmitSalary}>
            {/* Header info */}
            <div className="bg-light p-3 rounded-3 mb-3 border">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-sm-6">
                  <span className="text-muted small d-block">સ્ટાફ:</span>
                  <span className="fw-bold text-dark fs-6">{selectedStaffForSalary.name} ({selectedStaffForSalary.employeeCode})</span>
                </div>
                <div className="col-12 col-sm-6 text-sm-end">
                  <span className="text-muted small d-block">હાલનો બાકી ઉપાડ:</span>
                  <span className={`fw-bold fs-6 ${(selectedStaffForSalary.outstandingUpad || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                    ₹{(selectedStaffForSalary.outstandingUpad || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="row g-3">
              {/* Period & Payment Date */}
              <div className="col-12 col-sm-6">
                <label className="form-label small fw-bold text-dark">પગારનો મહિનો / સમયગાળો</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="જેમ કે September 2026"
                  value={salaryForm.period}
                  onChange={(e) => setSalaryForm({ ...salaryForm, period: e.target.value })}
                  required
                />
              </div>

              <div className="col-12 col-sm-6">
                <label className="form-label small fw-bold text-dark">ચુકવણી તારીખ</label>
                <input
                  type="date"
                  className="form-control"
                  value={salaryForm.date}
                  onChange={(e) => setSalaryForm({ ...salaryForm, date: e.target.value })}
                  required
                />
              </div>

              {/* Daily Wage Calculation if DAILY */}
              {selectedStaffForSalary.wageType === 'DAILY' && (
                <div className="col-12">
                  <div className="card p-3 bg-light border-warning border-opacity-50 rounded-3">
                    <span className="fw-bold text-dark small mb-2 d-block">રોજદાર દૈનિક હિસાબ ગણતરી:</span>
                    <div className="row g-2 align-items-center">
                      <div className="col-5">
                        <label className="small text-muted">હાજર દિવસો (Days Worked)</label>
                        <input
                          type="number"
                          className="form-control"
                          min={1}
                          max={31}
                          value={salaryForm.daysWorked}
                          onChange={(e) => handleDaysWorkedChange(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-2 text-center pt-3 fw-bold text-muted">
                        ×
                      </div>
                      <div className="col-5">
                        <label className="small text-muted">દર દિવસનો દર (₹)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={salaryForm.dailyRate}
                          onChange={(e) => {
                            const newRate = parseFloat(e.target.value) || 0;
                            setSalaryForm(prev => ({
                              ...prev,
                              dailyRate: newRate,
                              grossSalary: prev.daysWorked * newRate,
                              netPaid: Math.max(0, (prev.daysWorked * newRate) - prev.advanceDeducted)
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gross Salary */}
              <div className="col-12 col-sm-6">
                <label className="form-label small fw-bold text-dark">
                  કુલ ગ્રોસ પગાર (Gross Salary ₹) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted">₹</span>
                  <input
                    type="number"
                    className="form-control fw-bold"
                    min={0}
                    value={salaryForm.grossSalary}
                    onChange={(e) => handleGrossChange(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              {/* Upad Deduction */}
              <div className="col-12 col-sm-6">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label small fw-bold text-danger mb-1">
                    ઉપાડ કપાત (Advance Deduction ₹)
                  </label>
                  {(selectedStaffForSalary.outstandingUpad || 0) > 0 && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-danger text-decoration-none fw-semibold"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => handleDeductionChange(Math.min(selectedStaffForSalary.outstandingUpad || 0, salaryForm.grossSalary))}
                    >
                      પૂરો ઉપાડ કાપો
                    </button>
                  )}
                </div>
                <div className="input-group">
                  <span className="input-group-text bg-danger bg-opacity-10 text-danger">₹</span>
                  <input
                    type="number"
                    className="form-control text-danger fw-bold"
                    min={0}
                    max={salaryForm.grossSalary}
                    value={salaryForm.advanceDeducted}
                    onChange={(e) => handleDeductionChange(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                  બાકી ઉપાડમાંથી આ પગારમાં આટલી રકમ કપાશે
                </span>
              </div>

              {/* Net Payout Banner */}
              <div className="col-12">
                <div className="p-3 rounded-3 bg-success bg-opacity-10 border border-success border-opacity-30 d-flex justify-content-between align-items-center">
                  <div>
                    <span className="small text-success fw-semibold d-block">
                      ચોખ્ખી ચૂકવવાપાત્ર રકમ (Net Payable):
                    </span>
                    <span className="small text-muted">
                      ₹{salaryForm.grossSalary.toLocaleString('en-IN')} (ગ્રોસ) - ₹{salaryForm.advanceDeducted.toLocaleString('en-IN')} (ઉપાડ કપાત)
                    </span>
                  </div>
                  <h3 className="h3 fw-bold text-success mb-0">
                    ₹{salaryForm.netPaid.toLocaleString('en-IN')}
                  </h3>
                </div>
              </div>

              {/* Payment Mode & Reference */}
              <div className="col-12 col-sm-6">
                <label className="form-label small fw-bold text-dark">ચુકવણી માધ્યમ</label>
                <select
                  className="form-select"
                  value={salaryForm.paymentMode}
                  onChange={(e) => setSalaryForm({ ...salaryForm, paymentMode: e.target.value })}
                >
                  <option value="Cash">રોકડ (Cash)</option>
                  <option value="UPI">UPI / Google Pay</option>
                  <option value="Bank Transfer">બેંક ટ્રાન્સફર</option>
                  <option value="Cheque">ચેક</option>
                </select>
              </div>

              <div className="col-12 col-sm-6">
                <label className="form-label small fw-bold text-dark">ટ્રાન્ઝેક્શન / રેફરન્સ નંબર (ઓપ્શનલ)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="UTR અથવા ચેક નંબર"
                  value={salaryForm.referenceId}
                  onChange={(e) => setSalaryForm({ ...salaryForm, referenceId: e.target.value })}
                />
              </div>

              <div className="col-12">
                <label className="form-label small fw-bold text-dark">નોંધ (Notes / Slip remarks)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="પગાર સંબંધિત નોંધ..."
                  value={salaryForm.notes}
                  onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setShowSalaryModal(false)}
              >
                રદ કરો
              </button>
              <button
                type="submit"
                className="btn btn-success d-flex align-items-center gap-1.5 px-4 fw-semibold"
                disabled={submittingSalary}
              >
                {submittingSalary ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" />
                    <span>પગાર ચૂકવાઈ રહ્યો છે...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>પગાર ચૂકવો & ખાતાવહી અપડેટ કરો</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================
          MODAL 4: STAFF LEDGER & DIGITAL PASSBOOK
         ======================================================== */}
      <Modal
        isOpen={showLedgerModal}
        onClose={() => setShowLedgerModal(false)}
        title={selectedStaffForLedger ? `ડિજિટલ પાસબુક & ખાતાવહી: ${selectedStaffForLedger.name} (${selectedStaffForLedger.employeeCode})` : 'ખાતાવહી પાસબુક'}
        size="xl"
      >
        {selectedStaffForLedger && (
          <div className="ledger-print-wrapper">
            {/* Top Passbook Header */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 p-3 bg-light rounded-3 mb-3 border">
              <div>
                <h5 className="fw-bold text-dark mb-1">{selectedStaffForLedger.name}</h5>
                <div className="d-flex align-items-center gap-2 flex-wrap small text-muted">
                  <span className="badge bg-primary text-white">{selectedStaffForLedger.employeeCode}</span>
                  <span>{selectedStaffForLedger.designationTitle || 'સ્ટાફ'}</span>
                  <span>•</span>
                  <span>મોબાઈલ: {selectedStaffForLedger.phone || '-'}</span>
                  <span>•</span>
                  <span>પ્રકાર: {selectedStaffForLedger.wageType === 'DAILY' ? `રોજદાર (₹${selectedStaffForLedger.dailyRate}/દિ)` : `માસિક (₹${selectedStaffForLedger.baseSalary}/મહિનો)`}</span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm d-flex align-items-center gap-1.5"
                  onClick={handlePrintPassbook}
                  title="પાસબુક સ્લિપ પ્રિન્ટ કરો"
                >
                  <Printer size={15} />
                  <span>પ્રિન્ટ સ્લિપ</span>
                </button>
              </div>
            </div>

            {/* Passbook Summary Cards */}
            <div className="row g-2 mb-3">
              <div className="col-6 col-md-3">
                <div className="p-2.5 rounded-3 bg-white border text-center">
                  <span className="small text-muted d-block">કુલ લીધેલ ઉપાડ</span>
                  <span className="fw-bold text-dark fs-6">
                    ₹{(staffLedgerData?.employee?.totalUpad ?? selectedStaffForLedger.totalUpad ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-2.5 rounded-3 bg-white border text-center">
                  <span className="small text-muted d-block">પગારમાં કપાયેલ</span>
                  <span className="fw-bold text-success fs-6">
                    ₹{(staffLedgerData?.employee?.totalUpadDeducted ?? selectedStaffForLedger.totalUpadDeducted ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-2.5 rounded-3 bg-danger bg-opacity-10 border border-danger border-opacity-30 text-center">
                  <span className="small text-danger fw-semibold d-block">હાલનો બાકી ઉપાડ</span>
                  <span className="fw-bold text-danger fs-6">
                    ₹{(staffLedgerData?.employee?.outstandingUpad ?? selectedStaffForLedger.outstandingUpad ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-2.5 rounded-3 bg-white border text-center">
                  <span className="small text-muted d-block">કુલ ચૂકવેલ પગાર</span>
                  <span className="fw-bold text-primary fs-6">
                    ₹{(staffLedgerData?.employee?.totalSalaryPaid ?? selectedStaffForLedger.totalSalaryPaid ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Transactions Ledger Table */}
            {ledgerLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status" />
                <span className="ms-2 text-muted small">ખાતાવહી લોડ થઈ રહી છે...</span>
              </div>
            ) : !staffLedgerData?.transactions || staffLedgerData.transactions.length === 0 ? (
              <div className="text-center py-4 bg-light rounded-3 text-muted">
                <FileText size={32} className="opacity-50 mb-2" />
                <p className="mb-0 small">આ સ્ટાફ માટે હજુ સુધી કોઈ ઉપાડ કે પગારની એન્ટ્રી નોંધાયેલ નથી.</p>
              </div>
            ) : (
              <div className="table-responsive border rounded-3 bg-white">
                <table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light text-muted">
                    <tr>
                      <th className="py-2.5 ps-3">તારીખ</th>
                      <th className="py-2.5">પ્રકાર (Type)</th>
                      <th className="py-2.5">વિગત / મહિનો / કારણ</th>
                      <th className="py-2.5">ચુકવણી માધ્યમ</th>
                      <th className="py-2.5 text-end">ગ્રોસ / રકમ</th>
                      <th className="py-2.5 text-end">ઉપાડ કપાત</th>
                      <th className="py-2.5 text-end">ચોખ્ખી ચુકવણી</th>
                      <th className="py-2.5 text-end pe-3">એક્શન</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffLedgerData.transactions.map((tx: EmployeeTransaction) => {
                      const isUpad = tx.type === 'UPAD';
                      return (
                        <tr key={tx.id}>
                          <td className="ps-3 py-2.5 fw-medium text-dark">{tx.date}</td>
                          <td className="py-2.5">
                            {isUpad ? (
                              <span className="badge bg-danger bg-opacity-15 text-danger fw-bold">
                                <ArrowUpRight size={12} className="me-0.5" />
                                ઉપાડ (Advance)
                              </span>
                            ) : (
                              <span className="badge bg-success bg-opacity-15 text-success fw-bold">
                                <Wallet size={12} className="me-0.5" />
                                પગાર (Salary)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5">
                            <span className="fw-medium text-dark">{tx.reason || '-'}</span>
                            {tx.period && <span className="text-muted ms-1">({tx.period})</span>}
                            {tx.daysWorked && <span className="badge bg-light text-muted border ms-1">{tx.daysWorked} દિવસો</span>}
                          </td>
                          <td className="py-2.5">
                            <span className="badge bg-light text-dark border">{tx.paymentMode || 'Cash'}</span>
                          </td>
                          <td className="py-2.5 text-end fw-semibold">
                            {isUpad ? (
                              <span className="text-danger">₹{tx.amount.toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-dark">₹{(tx.grossSalary || tx.amount).toLocaleString('en-IN')}</span>
                            )}
                          </td>
                          <td className="py-2.5 text-end text-danger fw-semibold">
                            {tx.deductionAmount ? `-₹${tx.deductionAmount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-2.5 text-end fw-bold text-success">
                            {isUpad ? '-' : `₹${(tx.netPaid || tx.amount).toLocaleString('en-IN')}`}
                          </td>
                          <td className="py-2.5 text-end pe-3">
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-danger p-0"
                              onClick={() => handleDeleteTransaction(tx.id)}
                              title="એન્ટ્રી રદ કરો"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Quick buttons inside ledger */}
            <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
              <span className="small text-muted">
                કુલ એન્ટ્રીઓ: {staffLedgerData?.transactions?.length || 0}
              </span>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => {
                    setShowLedgerModal(false);
                    handleOpenUpadModal(selectedStaffForLedger);
                  }}
                >
                  + ઉપાડ આપો
                </button>
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm"
                  onClick={() => {
                    setShowLedgerModal(false);
                    handleOpenSalaryModal(selectedStaffForLedger);
                  }}
                >
                  💰 પગાર ચૂકવો
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================
          MODAL 5: AADHAR CARD PREVIEW
         ======================================================== */}
      <Modal
        isOpen={showAadharModal}
        onClose={() => setShowAadharModal(false)}
        title={selectedAadharUrl ? `આધાર કાર્ડ: ${selectedAadharUrl.name} (${selectedAadharUrl.code})` : 'આધાર કાર્ડ'}
        size="lg"
      >
        {selectedAadharUrl && (
          <div className="text-center p-2">
            <img
              src={selectedAadharUrl.url}
              alt="Aadhar Card"
              className="img-fluid rounded-3 shadow-sm border"
              style={{ maxHeight: '70vh', objectFit: 'contain' }}
            />
            <div className="mt-3 d-flex justify-content-center gap-2">
              <a
                href={selectedAadharUrl.url}
                download={`${selectedAadharUrl.code}_aadhar.jpg`}
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1.5"
              >
                <Upload size={14} style={{ transform: 'rotate(180deg)' }} />
                <span>ફોટો ડાઉનલોડ કરો</span>
              </a>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAadharModal(false)}
              >
                બંધ કરો
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================
          MODAL 6: PASSPORT PHOTO PREVIEW
         ======================================================== */}
      <Modal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        title={selectedPhotoUrl ? `પાસપોર્ટ સાઇઝ ફોટો: ${selectedPhotoUrl.name} (${selectedPhotoUrl.code})` : 'પાસપોર્ટ સાઇઝ ફોટો'}
        size="md"
      >
        {selectedPhotoUrl && (
          <div className="text-center p-3">
            <div className="d-inline-block rounded-3 overflow-hidden shadow-sm border border-2 border-primary mb-3">
              <img
                src={selectedPhotoUrl.url}
                alt="Passport Photo"
                className="img-fluid"
                style={{ maxHeight: '380px', objectFit: 'contain' }}
              />
            </div>
            <div className="d-flex justify-content-center gap-2">
              <a
                href={selectedPhotoUrl.url}
                download={`${selectedPhotoUrl.code}_photo.jpg`}
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1.5"
              >
                <Upload size={14} style={{ transform: 'rotate(180deg)' }} />
                <span>ફોટો ડાઉનલોડ કરો</span>
              </a>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowPhotoModal(false)}
              >
                બંધ કરો
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
