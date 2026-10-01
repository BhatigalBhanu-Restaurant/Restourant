import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { usePermission } from '../../context/PermissionContext';
import {
  Building2,
  Calendar,
  CalendarCheck,
  Printer,
  Shield,
  Save,
  RotateCcw,
  CheckCircle2,
  Volume2,
  Users,
  UserCheck,
  Tag,
  Plus,
  X,
  Trash2
} from 'lucide-react';
import {
  getPrintSettings,
  savePrintSettings,
  resetPrintSettings,
  playPaymentChime,
  PrintAndBillSettings
} from '../../utils/printSettings';
import { formatStoreDate, formatStoreTime } from '../../utils/storeSettings';

export const StoreSettingsPage: React.FC = () => {
  const { can } = usePermission();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Active Category Tab
  const [activeCategory, setActiveCategory] = useState<string>(
    tabParam && ['profile', 'datetime', 'functions', 'printer', 'system'].includes(tabParam)
      ? tabParam
      : 'profile'
  );

  useEffect(() => {
    if (tabParam && ['profile', 'datetime', 'functions', 'printer', 'system'].includes(tabParam)) {
      setActiveCategory(tabParam);
    }
  }, [tabParam]);

  // All Settings Dictionary (key -> string value)
  const [settings, setSettings] = useState<Record<string, string>>({});
  // Local Print Settings
  const [printConfig, setPrintConfig] = useState<PrintAndBillSettings>(getPrintSettings());

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Manager & Function Type edit states
  const [newManagerInput, setNewManagerInput] = useState<string>('');
  const [newFunctionTypeInput, setNewFunctionTypeInput] = useState<string>('');
  const [isImportingStaff, setIsImportingStaff] = useState<boolean>(false);

  // Fetch Settings from backend
  const loadSettings = async () => {
    try {
      const resMap: any = await apiClient.get('/system/settings');
      if (resMap?.success && resMap.data) {
        setSettings(resMap.data);
      }
    } catch (err) {
      console.error('Failed to load store settings:', err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Helper to get or fallback setting value
  const getVal = (key: string, defaultVal: string = '') => {
    return settings[key] !== undefined ? settings[key] : defaultVal;
  };

  const getBool = (key: string, defaultVal: boolean = false) => {
    const v = settings[key];
    if (v === undefined) return defaultVal;
    return v === 'true' || v === '1';
  };

  // Helper to update a setting in local state
  const handleUpdate = (key: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: String(value)
    }));
  };

  // Manager helper methods
  const getManagerList = (): string[] => {
    const raw = getVal('function_managers', 'Bhanubhai Patel, Rameshbhai Patel');
    return raw
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  const handleAddManager = () => {
    const trimmed = newManagerInput.trim();
    if (!trimmed) return;
    const current = getManagerList();
    if (!current.includes(trimmed)) {
      const updated = [...current, trimmed];
      handleUpdate('function_managers', updated.join(', '));
      if (!getVal('function_default_manager')) {
        handleUpdate('function_default_manager', trimmed);
      }
    }
    setNewManagerInput('');
  };

  const handleRemoveManager = (nameToRemove: string) => {
    const current = getManagerList();
    const updated = current.filter(n => n !== nameToRemove);
    handleUpdate('function_managers', updated.join(', '));
    if (getVal('function_default_manager') === nameToRemove) {
      handleUpdate('function_default_manager', updated[0] || '');
    }
  };

  const handleImportStaffManagers = async () => {
    try {
      setIsImportingStaff(true);
      const res: any = await apiClient.get('/hr/employees');
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        const staffNames = res.data
          .map((emp: any) => `${emp.firstName || ''} ${emp.lastName || ''}`.trim())
          .filter(Boolean);
        const current = getManagerList();
        const merged = Array.from(new Set([...current, ...staffNames])).filter(Boolean);
        handleUpdate('function_managers', merged.join(', '));
        alert(`${staffNames.length} સ્ટાફ સભ્યોના નામ સફળતાપૂર્વક ઉમેરાયા! હવે સેવ કરવા માટે 'Save Settings' પર ક્લિક કરો.`);
      } else {
        alert('કોઈ સ્ટાફ સભ્યો મળ્યા નથી.');
      }
    } catch {
      alert('સ્ટાફ લિસ્ટ લાવવામાં સમસ્યા આવી.');
    } finally {
      setIsImportingStaff(false);
    }
  };

  // Function Types helper methods
  const getFunctionTypeList = (): string[] => {
    const raw = getVal(
      'function_types',
      'Family Dinner & Gathering, Wedding / Reception, Ring Ceremony / Sagai, Birthday Party, Corporate Event & Dinner, Babri / Mundan Sanskar, Traditional Feast / Rasoi, Other Celebration'
    );
    return raw
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  const handleAddFunctionType = () => {
    const trimmed = newFunctionTypeInput.trim();
    if (!trimmed) return;
    const current = getFunctionTypeList();
    if (!current.includes(trimmed)) {
      const updated = [...current, trimmed];
      handleUpdate('function_types', updated.join(', '));
      if (!getVal('function_default_type')) {
        handleUpdate('function_default_type', trimmed);
      }
    }
    setNewFunctionTypeInput('');
  };

  const handleRemoveFunctionType = (typeToRemove: string) => {
    const current = getFunctionTypeList();
    const updated = current.filter(t => t !== typeToRemove);
    handleUpdate('function_types', updated.join(', '));
    if (getVal('function_default_type') === typeToRemove) {
      handleUpdate('function_default_type', updated[0] || '');
    }
  };

  // Save All Settings
  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      const payload = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value)
      }));

      // Sync print configuration with local storage
      const updatedPrint = savePrintSettings({
        restaurantName: settings['restaurant_name'] || printConfig.restaurantName,
        tagline: settings['restaurant_tagline'] || printConfig.tagline,
        address: settings['restaurant_address'] || printConfig.address,
        phone: settings['restaurant_phone'] || printConfig.phone,
        gstin: settings['gst_number'] || printConfig.gstin,
        fssai: settings['fssai_license'] || printConfig.fssai,
        printReceiptFormat: (settings['receipt_format'] as any) || printConfig.printReceiptFormat,
        copiesCount: Number(settings['receipt_copies'] || printConfig.copiesCount) as any,
        showLogo: getBool('receipt_show_logo', printConfig.showLogo),
        showGstin: getBool('receipt_show_gstin', printConfig.showGstin),
        showCustomer: getBool('receipt_show_customer', printConfig.showCustomer),
        showFooterNote: getBool('receipt_show_footer', printConfig.showFooterNote),
        customFooterText: settings['receipt_custom_footer'] || printConfig.customFooterText,
        playPaymentSound: getBool('payment_audio_chime', printConfig.playPaymentSound)
      });
      setPrintConfig(updatedPrint);

      await apiClient.post('/system/settings', { settings: payload });
      await loadSettings();

      setSaveSuccessMsg('રેસ્ટોરન્ટ સેટિંગ્સ સફળતાપૂર્વક સેવ થઈ ગયા છે! (Store settings saved successfully)');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save store settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults for the 5 Active Modules
  const handleResetToDefaults = async () => {
    if (!confirm('Are you sure you want to restore all restaurant settings to default values?')) return;

    const resetPrint = resetPrintSettings();
    setPrintConfig(resetPrint);

    const defaultPairs = [
      { key: 'restaurant_name', value: 'Bhatigal Bhanu (ભાતીગળ ભાણું)' },
      { key: 'restaurant_name_gujarati', value: 'ભાતીગળ ભાણું' },
      { key: 'restaurant_tagline', value: '...ભાવ, ભજન અને ભોજનનો ત્રિવેણી સંગમ...' },
      { key: 'restaurant_address', value: 'Kothariya Ring Road, Near HP Petrol Pump, Rajkot, Gujarat - 360022' },
      { key: 'restaurant_phone', value: '+91 98790 12345' },
      { key: 'restaurant_email', value: 'contact@bhatigalbhanu.com' },
      { key: 'restaurant_website', value: 'https://bhatigalbhanu.com' },
      { key: 'gst_number', value: '24AAAFB1234A1Z8' },
      { key: 'fssai_license', value: '10724026000123' },
      { key: 'currency_symbol', value: '₹' },
      { key: 'currency_code', value: 'INR' },
      { key: 'system_timezone', value: 'Asia/Kolkata' },
      { key: 'date_format', value: 'DD/MM/YYYY' },
      { key: 'time_format', value: '12_HOUR' },
      { key: 'financial_year_start', value: '04-01' },
      { key: 'opening_time', value: '10:00 AM' },
      { key: 'closing_time', value: '11:30 PM' },
      { key: 'function_require_deposit', value: 'true' },
      { key: 'function_default_advance_percent', value: '30' },
      { key: 'function_min_guests', value: '25' },
      { key: 'function_alert_hours', value: '24' },
      { key: 'function_default_venue', value: 'AC Banquet Hall' },
      { key: 'function_default_timeslot', value: 'Evening Dinner (07:00 PM – 11:00 PM)' },
      { key: 'function_voucher_terms', value: '૧. એડવાન્સ ડિપોઝીટ રકમ પરત મળવાપાત્ર નથી.\n૨. ફંક્શન સમય મર્યાદાનું પાલન કરવું અનિવાર્ય છે.\n૩. બાકી રકમ ફંક્શન સમાપ્ત થતાં ચૂકવવાની રહેશે.' },
      { key: 'function_managers', value: 'Bhanubhai Patel, Rameshbhai Patel' },
      { key: 'function_default_manager', value: 'Bhanubhai Patel' },
      { key: 'function_types', value: 'Family Dinner & Gathering, Wedding / Reception, Ring Ceremony / Sagai, Birthday Party, Corporate Event & Dinner, Babri / Mundan Sanskar, Traditional Feast / Rasoi, Other Celebration' },
      { key: 'function_default_type', value: 'Family Dinner & Gathering' },
      { key: 'receipt_format', value: '80MM' },
      { key: 'receipt_copies', value: '1' },
      { key: 'print_font_scale', value: 'MEDIUM' },
      { key: 'receipt_header_note', value: 'જય શ્રી કૃષ્ણ! પધારજો...' },
      { key: 'receipt_custom_footer', value: 'મુલાકાત બદલ આભાર! ફરી પધારશો... 🙏' },
      { key: 'receipt_show_logo', value: 'true' },
      { key: 'receipt_show_gstin', value: 'true' },
      { key: 'receipt_show_customer', value: 'true' },
      { key: 'payment_audio_chime', value: 'true' },
      { key: 'security_manager_pin', value: '1234' },
      { key: 'security_session_timeout_minutes', value: '480' },
      { key: 'system_status', value: 'ONLINE' },
      { key: 'system_lockdown_mode', value: 'false' }
    ];

    try {
      await apiClient.post('/system/settings', { settings: defaultPairs });
      await loadSettings();
      alert('System configuration restored to defaults.');
    } catch (err: any) {
      alert(err.message || 'Failed to reset settings.');
    }
  };

  // Only the 5 Clean, Active Categories
  const CATEGORIES = [
    { id: 'profile', label: 'Store Profile & Legal', icon: <Building2 size={16} /> },
    { id: 'datetime', label: 'Date, Time & Formats', icon: <Calendar size={16} /> },
    { id: 'functions', label: 'Function & Banquet Rules', icon: <CalendarCheck size={16} /> },
    { id: 'printer', label: 'Thermal Voucher & Slip', icon: <Printer size={16} /> },
    { id: 'system', label: 'Security & System Control', icon: <Shield size={16} /> }
  ];

  return (
    <div className="d-flex flex-column gap-3" style={{ fontSize: '0.85rem' }}>
      {/* Top Header */}
      <div className="card shadow-sm border bg-white" style={{ borderRadius: '12px', borderColor: '#e2e8f0' }}>
        <div className="card-body p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-2.5">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary flex-shrink-0"
              style={{ width: 44, height: 44 }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h5 className="fw-bold mb-0 text-dark">Store Settings & Configuration</h5>
              </div>
              <span className="text-secondary small">
                રેસ્ટોરન્ટ સેટિંગ્સ અને કન્ફિગરેશન (Store Settings)
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {can('settings.reset') && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
                onClick={handleResetToDefaults}
                title="Reset settings to defaults"
              >
                <RotateCcw size={14} /> Reset Defaults
              </button>
            )}

            {can('settings.edit') && (
              <button
                type="button"
                className="btn btn-sm text-white d-flex align-items-center gap-1 shadow-sm fw-bold px-3"
                style={{ backgroundColor: '#7A1B28', borderColor: '#7A1B28' }}
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} /> Save All Settings
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 shadow-sm mb-0">
          <CheckCircle2 size={18} className="text-success" />
          <span className="small fw-semibold">{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Settings Panel: Categories on Left, Form on Right */}
      <div className="row g-3">
        {/* Left Navigation Category List */}
        <div className="col-lg-3 col-md-4">
          <div className="card shadow-sm border-0 overflow-hidden">
            <div className="card-header bg-white py-2 px-3 border-bottom">
              <span className="fw-bold small text-secondary text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                Settings Modules (સેટિંગ્સ)
              </span>
            </div>
            <div className="list-group list-group-flush" style={{ fontSize: '0.8rem' }}>
              {CATEGORIES.map(cat => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`list-group-item list-group-item-action d-flex align-items-center gap-2 py-2.5 px-3 border-0 ${
                      isActive ? 'active fw-bold shadow-sm' : 'text-dark'
                    }`}
                    style={isActive ? { backgroundColor: '#7A1B28', borderColor: '#7A1B28' } : {}}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <span className={isActive ? 'text-white' : 'text-danger'}>
                      {cat.icon}
                    </span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Settings Configuration Form */}
        <div className="col-lg-9 col-md-8">
          <div className="card shadow-sm border-0">
            <div className="card-body p-3 p-sm-4">
              {/* ======================================================== */}
              {/* 1. STORE PROFILE & CONTACT                               */}
              {/* ======================================================== */}
              {activeCategory === 'profile' && (
                <div className="d-flex flex-column gap-3">
                  <div className="border-bottom pb-2">
                    <h6 className="fw-bold text-dark mb-0">Restaurant Identity & Legal Details</h6>
                    <small className="text-muted">રેસ્ટોરન્ટનું સત્તાવાર નામ, ગુજરાતી બ્રાન્ડિંગ, GSTIN, FSSAI અને સરનામું</small>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Restaurant Brand Name (English)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('restaurant_name', 'Bhatigal Bhanu (ભાતીગળ ભાણું)')}
                        onChange={e => handleUpdate('restaurant_name', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Brand Name (Gujarati / પ્રાદેશિક)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('restaurant_name_gujarati', 'ભાતીગળ ભાણું')}
                        onChange={e => handleUpdate('restaurant_name_gujarati', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Tagline / Subtitle (સ્લોગન)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('restaurant_tagline', '...ભાવ, ભજન અને ભોજનનો ત્રિવેણી સંગમ...')}
                        onChange={e => handleUpdate('restaurant_tagline', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Official Website</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('restaurant_website', 'https://bhatigalbhanu.com')}
                        onChange={e => handleUpdate('restaurant_website', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">GSTIN Number (ટેક્સ નંબર)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('gst_number', '24AAAFB1234A1Z8')}
                        onChange={e => handleUpdate('gst_number', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">FSSAI License Number</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('fssai_license', '10724026000123')}
                        onChange={e => handleUpdate('fssai_license', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Official Contact Phone</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('restaurant_phone', '+91 98790 12345')}
                        onChange={e => handleUpdate('restaurant_phone', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Official Email Address</label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        value={getVal('restaurant_email', 'contact@bhatigalbhanu.com')}
                        onChange={e => handleUpdate('restaurant_email', e.target.value)}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold text-secondary mb-1">Physical Restaurant Address</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('restaurant_address', 'Kothariya Ring Road, Near HP Petrol Pump, Rajkot, Gujarat - 360022')}
                        onChange={e => handleUpdate('restaurant_address', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-secondary mb-1">Currency Symbol</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('currency_symbol', '₹')}
                        onChange={e => handleUpdate('currency_symbol', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-secondary mb-1">Currency Code</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('currency_code', 'INR')}
                        onChange={e => handleUpdate('currency_code', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-secondary mb-1">System Timezone</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('system_timezone', 'Asia/Kolkata')}
                        onChange={e => handleUpdate('system_timezone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* 2. DATE, TIME & FORMATS                                   */}
              {/* ======================================================== */}
              {activeCategory === 'datetime' && (
                <div className="d-flex flex-column gap-3">
                  <div className="border-bottom pb-2">
                    <h6 className="fw-bold text-dark mb-0">Date, Time & Localization Formats</h6>
                    <small className="text-muted">તારીખ, સમય અને નાણાકીય વર્ષના ફોર્મેટ્સ જે સમગ્ર સિસ્ટમમાં પ્રદર્શિત થાય છે</small>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Date Display Format (તારીખ ફોર્મેટ)</label>
                      <select
                        className="form-select form-select-sm"
                        value={getVal('date_format', 'DD/MM/YYYY')}
                        onChange={e => handleUpdate('date_format', e.target.value)}
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (દા.ત. 18/09/2026 - Standard India)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (દા.ત. 2026-09-18 - ISO Standard)</option>
                        <option value="DD-MM-YYYY">DD-MM-YYYY (દા.ત. 18-09-2026 - Dash Separated)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Time Display Format (સમય ફોર્મેટ)</label>
                      <select
                        className="form-select form-select-sm"
                        value={getVal('time_format', '12_HOUR')}
                        onChange={e => handleUpdate('time_format', e.target.value)}
                      >
                        <option value="12_HOUR">12-Hour AM/PM (દા.ત. 07:30 PM - Traditional)</option>
                        <option value="24_HOUR">24-Hour Military (દા.ત. 19:30 - Railway Time)</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-secondary mb-1">Financial Year Start (નાણાકીય વર્ષ પ્રારંભ)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="MM-DD"
                        value={getVal('financial_year_start', '04-01')}
                        onChange={e => handleUpdate('financial_year_start', e.target.value)}
                      />
                      <small className="text-muted">Standard Indian FY starts on 04-01 (1st April)</small>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-secondary mb-1">Daily Opening Time</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('opening_time', '10:00 AM')}
                        onChange={e => handleUpdate('opening_time', e.target.value)}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-secondary mb-1">Daily Closing Time</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('closing_time', '11:30 PM')}
                        onChange={e => handleUpdate('closing_time', e.target.value)}
                      />
                    </div>

                    {/* Live Preview Box */}
                    <div className="col-12 mt-2">
                      <div className="p-3 rounded-3 bg-light border d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <div>
                          <span className="badge bg-secondary mb-1">Live Format Preview</span>
                          <div className="fw-bold fs-6 text-dark">
                            Current Formatted Date & Time:
                          </div>
                          <div className="text-danger font-monospace fw-bold fs-5 mt-1">
                            {formatStoreDate(new Date(), getVal('date_format', 'DD/MM/YYYY'))} {formatStoreTime(new Date(), getVal('time_format', '12_HOUR'))}
                          </div>
                        </div>
                        <div className="text-muted small">
                          Changes take effect across Function Locker, Daily Menu, and Receipts upon save.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* 3. FUNCTION & BANQUET RULES                              */}
              {/* ======================================================== */}
              {activeCategory === 'functions' && (
                <div className="d-flex flex-column gap-3">
                  <div className="border-bottom pb-2">
                    <h6 className="fw-bold text-dark mb-0">Function & Banquet Booking Rules</h6>
                    <small className="text-muted">ફંક્શન બુકિંગ, મેનેજર નામો, પ્રસંગના પ્રકારો, એડવાન્સ ડિપોઝીટ અને હોલ નિયમો</small>
                  </div>

                  {/* 1. Accepted By / Manager List Configuration */}
                  <div className="card border-0 shadow-sm rounded-3" style={{ background: '#FAF7F2', border: '1px solid #E8DCCF' }}>
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <Users size={18} className="text-primary" />
                          <h6 className="fw-bold mb-0 text-dark">Accepted By (મેનેજર) નામો</h6>
                        </div>
                        <span className="badge bg-primary-subtle text-primary fw-medium px-2 py-1">
                          બુકિંગ ફોર્મ ડ્રોપડાઉન
                        </span>
                      </div>
                      <p className="text-muted small mb-3">
                        જ્યારે નવું ફંક્શન બુકિંગ લઈએ ત્યારે <strong>Accepted By (મેનેજર)</strong> ડ્રોપડાઉનમાં જે નામો દેખાડવા હોય તે અહીંથી મેનેજ કરો. તમે કોઈપણ નવું નામ ઉમેરી શકો છો અથવા નકામા નામ (દા.ત. dev) પર ક્લિક કરીને હટાવી શકો છો.
                      </p>

                      {/* Current Manager Pills */}
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        {getManagerList().map((mgr, idx) => (
                          <span
                            key={idx}
                            className="badge bg-white text-dark border shadow-xs d-inline-flex align-items-center gap-1.5 px-2.5 py-1.5"
                            style={{ fontSize: '0.82rem', borderColor: '#D3C2B0' }}
                          >
                            <UserCheck size={13} className="text-success" />
                            <span>{mgr}</span>
                            <button
                              type="button"
                              className="btn btn-sm btn-link p-0 text-danger ms-1 d-flex align-items-center"
                              onClick={() => handleRemoveManager(mgr)}
                              title={`${mgr} હટાવો`}
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                        {getManagerList().length === 0 && (
                          <span className="text-danger small fst-italic">કોઈ મેનેજર સેટ કરેલ નથી. કૃપા કરીને નીચેથી નામ ઉમેરો.</span>
                        )}
                      </div>

                      {/* Add New Manager Input & Actions */}
                      <div className="row g-2 align-items-center">
                        <div className="col-12 col-sm-8 col-md-6">
                          <div className="input-group input-group-sm">
                            <input
                              type="text"
                              className="form-control"
                              placeholder="દા.ત. શૈલેષભાઈ / રાજુભાઈ"
                              value={newManagerInput}
                              onChange={e => setNewManagerInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddManager();
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-primary d-flex align-items-center gap-1"
                              onClick={handleAddManager}
                            >
                              <Plus size={14} /> ઉમેરો
                            </button>
                          </div>
                        </div>
                        <div className="col-12 col-sm-4 col-md-6 d-flex align-items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={handleImportStaffManagers}
                            disabled={isImportingStaff}
                            title="Staff મેનેજમેન્ટમાંથી સક્રિય કર્મચારીઓના નામ લાવો"
                          >
                            {isImportingStaff ? 'લાવી રહ્યા છીએ...' : 'સ્ટાફમાંથી નામ લાવો'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleUpdate('function_managers', 'Bhanubhai Patel, Rameshbhai Patel')}
                            title="ડિફોલ્ટ નામો પાછા લાવો"
                          >
                            ડિફોલ્ટ
                          </button>
                        </div>
                      </div>

                      {/* Default Manager Selection */}
                      {getManagerList().length > 0 && (
                        <div className="mt-3 pt-2 border-top">
                          <div className="row g-2 align-items-center">
                            <div className="col-12 col-sm-6">
                              <label className="form-label small fw-semibold text-secondary mb-1">
                                ડિફોલ્ટ પસંદ થયેલ મેનેજર (Default Selected Manager)
                              </label>
                              <select
                                className="form-select form-select-sm"
                                value={getVal('function_default_manager', getManagerList()[0] || '')}
                                onChange={e => handleUpdate('function_default_manager', e.target.value)}
                              >
                                {getManagerList().map((mgr, i) => (
                                  <option key={i} value={mgr}>{mgr}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Function Types List Configuration */}
                  <div className="card border-0 shadow-sm rounded-3" style={{ background: '#FAF7F2', border: '1px solid #E8DCCF' }}>
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <Tag size={18} className="text-primary" />
                          <h6 className="fw-bold mb-0 text-dark">Function Types (પ્રસંગના પ્રકારો)</h6>
                        </div>
                        <span className="badge bg-primary-subtle text-primary fw-medium px-2 py-1">
                          બુકિંગ ફોર્મ ડ્રોપડાઉન
                        </span>
                      </div>
                      <p className="text-muted small mb-3">
                        જ્યારે નવું ફંક્શન બુકિંગ લઈએ ત્યારે <strong>Function Type (પ્રસંગનો પ્રકાર)</strong> ડ્રોપડાઉનમાં જે પ્રસંગો દેખાડવા હોય તે અહીંથી મેનેજ કરો.
                      </p>

                      {/* Current Function Type Pills */}
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        {getFunctionTypeList().map((type, idx) => (
                          <span
                            key={idx}
                            className="badge bg-white text-dark border shadow-xs d-inline-flex align-items-center gap-1.5 px-2.5 py-1.5"
                            style={{ fontSize: '0.82rem', borderColor: '#D3C2B0' }}
                          >
                            <span>{type}</span>
                            <button
                              type="button"
                              className="btn btn-sm btn-link p-0 text-danger ms-1 d-flex align-items-center"
                              onClick={() => handleRemoveFunctionType(type)}
                              title={`${type} હટાવો`}
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                        {getFunctionTypeList().length === 0 && (
                          <span className="text-danger small fst-italic">કોઈ પ્રસંગ સેટ કરેલ નથી. કૃપા કરીને નીચેથી પ્રસંગ ઉમેરો.</span>
                        )}
                      </div>

                      {/* Add New Function Type Input & Actions */}
                      <div className="row g-2 align-items-center">
                        <div className="col-12 col-sm-8 col-md-6">
                          <div className="input-group input-group-sm">
                            <input
                              type="text"
                              className="form-control"
                              placeholder="દા.ત. શ્રીમંત / સંગીત સંધ્યા / બાબરી"
                              value={newFunctionTypeInput}
                              onChange={e => setNewFunctionTypeInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddFunctionType();
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-primary d-flex align-items-center gap-1"
                              onClick={handleAddFunctionType}
                            >
                              <Plus size={14} /> ઉમેરો
                            </button>
                          </div>
                        </div>
                        <div className="col-12 col-sm-4 col-md-6 d-flex align-items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleUpdate('function_types', 'Family Dinner & Gathering, Wedding / Reception, Ring Ceremony / Sagai, Birthday Party, Corporate Event & Dinner, Babri / Mundan Sanskar, Traditional Feast / Rasoi, Other Celebration')}
                            title="ડિફોલ્ટ પ્રસંગો પાછા લાવો"
                          >
                            ડિફોલ્ટ પ્રસંગો
                          </button>
                        </div>
                      </div>

                      {/* Default Function Type Selection */}
                      {getFunctionTypeList().length > 0 && (
                        <div className="mt-3 pt-2 border-top">
                          <div className="row g-2 align-items-center">
                            <div className="col-12 col-sm-6">
                              <label className="form-label small fw-semibold text-secondary mb-1">
                                ડિફોલ્ટ પસંદ થયેલ પ્રસંગ (Default Selected Function Type)
                              </label>
                              <select
                                className="form-select form-select-sm"
                                value={getVal('function_default_type', getFunctionTypeList()[0] || '')}
                                onChange={e => handleUpdate('function_default_type', e.target.value)}
                              >
                                {getFunctionTypeList().map((type, i) => (
                                  <option key={i} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="form-check form-switch mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="function_require_deposit"
                          checked={getBool('function_require_deposit', true)}
                          onChange={e => handleUpdate('function_require_deposit', e.target.checked)}
                        />
                        <label className="form-check-label fw-bold text-dark" htmlFor="function_require_deposit">
                          Require Advance Deposit (એડવાન્સ ડિપોઝીટ ફરજિયાત રાખો)
                        </label>
                      </div>
                      <small className="text-muted d-block mt-1">
                        Ensures a booking date is only locked after advance payment is registered
                      </small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Default Advance Deposit Percentage (%)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={getVal('function_default_advance_percent', '30')}
                        onChange={e => handleUpdate('function_default_advance_percent', e.target.value)}
                      />
                      <small className="text-muted">Standard advance deposit required for banquet reservations</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Minimum Guests for Banquet Hall</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={getVal('function_min_guests', '25')}
                        onChange={e => handleUpdate('function_min_guests', e.target.value)}
                      />
                      <small className="text-muted">Minimum guest headcount required to reserve the AC Banquet Hall</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Upcoming Function Alert Window (Hours)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={getVal('function_alert_hours', '24')}
                        onChange={e => handleUpdate('function_alert_hours', e.target.value)}
                      />
                      <small className="text-muted">Sends reminder notification before the function date</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Default Venue Area</label>
                      <select
                        className="form-select form-select-sm"
                        value={getVal('function_default_venue', 'AC Banquet Hall')}
                        onChange={e => handleUpdate('function_default_venue', e.target.value)}
                      >
                        <option value="AC Banquet Hall">AC Banquet Hall (વાતાનુકૂલિત હોલ)</option>
                        <option value="Main Dining Hall">Main Dining Hall (મુખ્ય હોલ)</option>
                        <option value="Open Garden Lawn">Open Garden Lawn (બગીચો / લોન)</option>
                        <option value="Full Premises">Full Restaurant Premises (સંપૂર્ણ પરિસર)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Default Function Time Slot</label>
                      <select
                        className="form-select form-select-sm"
                        value={getVal('function_default_timeslot', 'Evening Dinner (07:00 PM – 11:00 PM)')}
                        onChange={e => handleUpdate('function_default_timeslot', e.target.value)}
                      >
                        <option value="Evening Dinner (07:00 PM – 11:00 PM)">Evening Dinner (07:00 PM – 11:00 PM)</option>
                        <option value="Afternoon Lunch (11:00 AM – 03:30 PM)">Afternoon Lunch (11:00 AM – 03:30 PM)</option>
                        <option value="Full Day Event (10:00 AM – 11:00 PM)">Full Day Event (10:00 AM – 11:00 PM)</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold text-secondary mb-1">Voucher Terms & Conditions (સ્લિપ પર પ્રિન્ટ થતા નિયમો)</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={4}
                        value={getVal('function_voucher_terms', '૧. એડવાન્સ ડિપોઝીટ રકમ પરત મળવાપાત્ર નથી.\n૨. ફંક્શન સમય મર્યાદાનું પાલન કરવું અનિવાર્ય છે.\n૩. બાકી રકમ ફંક્શન સમાપ્ત થતાં ચૂકવવાની રહેશે.')}
                        onChange={e => handleUpdate('function_voucher_terms', e.target.value)}
                      />
                      <small className="text-muted">Printed at the bottom of customer booking confirmation vouchers</small>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* 4. THERMAL PRINTER & SLIP SETTINGS                       */}
              {/* ======================================================== */}
              {activeCategory === 'printer' && (
                <div className="d-flex flex-column gap-3">
                  <div className="border-bottom pb-2">
                    <h6 className="fw-bold text-dark mb-0">Thermal Printer & Voucher Slip Settings</h6>
                    <small className="text-muted">80mm / 58mm પ્રિન્ટર સાઇઝ, પ્રિન્ટ નકલો, ગુજરાતી શુભેચ્છા લખાણ અને અવાજ</small>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-secondary mb-1">Receipt Paper Size (પેપર સાઈઝ)</label>
                      <select
                        className="form-select form-select-sm"
                        value={getVal('receipt_format', '80MM')}
                        onChange={e => handleUpdate('receipt_format', e.target.value)}
                      >
                        <option value="80MM">80mm Standard POS Thermal Roll (3 Inch - રેસ્ટોરન્ટ સ્ટાન્ડર્ડ)</option>
                        <option value="58MM">58mm Compact Thermal Roll (2 Inch - નાનું પ્રિન્ટર)</option>
                        <option value="A4">A4 Full Sheet Laser Invoice (ઓફિસ પ્રિન્ટર)</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-secondary mb-1">Print Font Scale (ફોન્ટ સાઈઝ)</label>
                      <select
                        className="form-select form-select-sm"
                        value={getVal('print_font_scale', 'MEDIUM')}
                        onChange={e => handleUpdate('print_font_scale', e.target.value)}
                      >
                        <option value="SMALL">Small (કોમ્પેક્ટ)</option>
                        <option value="MEDIUM">Medium (સ્ટાન્ડર્ડ)</option>
                        <option value="LARGE">Large (મોટા અક્ષરો)</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-secondary mb-1">Number of Receipt Copies (પ્રિન્ટ નકલો)</label>
                      <select
                        className="form-select form-select-sm"
                        value={getVal('receipt_copies', '1')}
                        onChange={e => handleUpdate('receipt_copies', e.target.value)}
                      >
                        <option value="1">1 Copy (Customer Only)</option>
                        <option value="2">2 Copies (Customer + Office Audit)</option>
                        <option value="3">3 Copies (Customer + Office + Kitchen)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Header Greeting Note (ટોચની શુભેચ્છા)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('receipt_header_note', 'જય શ્રી કૃષ્ણ! પધારજો...')}
                        onChange={e => handleUpdate('receipt_header_note', e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Footer Note (આભાર લખાણ)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={getVal('receipt_custom_footer', 'મુલાકાત બદલ આભાર! ફરી પધારશો... 🙏')}
                        onChange={e => handleUpdate('receipt_custom_footer', e.target.value)}
                      />
                    </div>

                    <div className="col-md-4">
                      <div className="form-check form-switch mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="receipt_show_logo"
                          checked={getBool('receipt_show_logo', true)}
                          onChange={e => handleUpdate('receipt_show_logo', e.target.checked)}
                        />
                        <label className="form-check-label fw-bold text-dark" htmlFor="receipt_show_logo">
                          Show Logo on Receipt (લોગો બતાવો)
                        </label>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="form-check form-switch mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="receipt_show_gstin"
                          checked={getBool('receipt_show_gstin', true)}
                          onChange={e => handleUpdate('receipt_show_gstin', e.target.checked)}
                        />
                        <label className="form-check-label fw-bold text-dark" htmlFor="receipt_show_gstin">
                          Show GSTIN & FSSAI (ટેક્સ નંબર)
                        </label>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="form-check form-switch mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="receipt_show_customer"
                          checked={getBool('receipt_show_customer', true)}
                          onChange={e => handleUpdate('receipt_show_customer', e.target.checked)}
                        />
                        <label className="form-check-label fw-bold text-dark" htmlFor="receipt_show_customer">
                          Show Customer Details (ગ્રાહક વિગત)
                        </label>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-check form-switch mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="payment_audio_chime"
                          checked={getBool('payment_audio_chime', true)}
                          onChange={e => handleUpdate('payment_audio_chime', e.target.checked)}
                        />
                        <label className="form-check-label fw-bold text-dark" htmlFor="payment_audio_chime">
                          Play Audio Chime Sound (સૂચના અવાજ)
                        </label>
                      </div>
                      <small className="text-muted d-block mt-1">
                        Plays pleasant confirmation tone on booking confirmation
                      </small>
                    </div>

                    <div className="col-md-6 d-flex align-items-center">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success d-flex align-items-center gap-1 shadow-sm mt-2"
                        onClick={() => playPaymentChime()}
                      >
                        <Volume2 size={15} /> Test Sound Chime (અવાજ ચેક કરો)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* 5. SECURITY & EMERGENCY CONTROL                          */}
              {/* ======================================================== */}
              {activeCategory === 'system' && (
                <div className="d-flex flex-column gap-3">
                  <div className="border-bottom pb-2">
                    <h6 className="fw-bold text-dark mb-0">Security & Emergency System Controls</h6>
                    <small className="text-muted">મેનેજર પિન, સિસ્ટમ ઓપરેશનલ સ્થિતિ અને સિક્યોરિટી નિયંત્રણ</small>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">ERP Operation Status</label>
                      <select
                        className="form-select form-select-sm"
                        value={getVal('system_status', 'ONLINE')}
                        onChange={e => handleUpdate('system_status', e.target.value)}
                      >
                        <option value="ONLINE">ONLINE (સામાન્ય વ્યવસાય ચાલુ - Normal Operations)</option>
                        <option value="MAINTENANCE">MAINTENANCE (સિસ્ટમ જાળવણી મોડ - Read Only)</option>
                      </select>
                      <small className="text-muted">Sets the operational status for the entire restaurant system</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Manager Override PIN (મેનેજર પિન)</label>
                      <input
                        type="password"
                        className="form-control form-control-sm font-monospace"
                        value={getVal('security_manager_pin', '1234')}
                        onChange={e => handleUpdate('security_manager_pin', e.target.value)}
                      />
                      <small className="text-muted">PIN required for manager overrides and security actions</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Session Inactivity Timeout (મિનિટ)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={getVal('security_session_timeout_minutes', '480')}
                        onChange={e => handleUpdate('security_session_timeout_minutes', e.target.value)}
                      />
                      <small className="text-muted">Auto logout user if portal is idle for specified minutes</small>
                    </div>

                    <div className="col-md-6">
                      <div className="form-check form-switch mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="system_lockdown_mode"
                          checked={getBool('system_lockdown_mode', false)}
                          onChange={e => handleUpdate('system_lockdown_mode', e.target.checked)}
                        />
                        <label className="form-check-label fw-bold text-danger" htmlFor="system_lockdown_mode">
                          Emergency Lockdown Mode (ઇમરજન્સી લોકડાઉન)
                        </label>
                      </div>
                      <small className="text-muted d-block mt-1">
                        When enabled, all non-admin edits across the restaurant are blocked immediately
                      </small>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
