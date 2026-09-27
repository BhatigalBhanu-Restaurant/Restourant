import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import { MenuItem, MenuCategory, DayOfWeek, DailyMenu } from '../../types';
import { getBackendOrigin } from '../../api/client';
import {
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Plus,
  Trash2,
  Search,
  ShieldCheck,
  ShieldAlert,
  Utensils,
  RefreshCw,
  AlertCircle,
  Image as ImageIcon,
  Download,
  ExternalLink,
  X,
  Loader2
} from 'lucide-react';

const DAYS_LIST: Array<{ key: DayOfWeek; label: string; short: string }> = [
  { key: 'MONDAY', label: 'Monday (સોમવાર)', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday (મંગળવાર)', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday (બુધવાર)', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday (ગુરુવાર)', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday (શુક્રવાર)', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday (શનિવાર)', short: 'Sat' },
  { key: 'SUNDAY', label: 'Sunday (રવિવાર)', short: 'Sun' }
];

import { appCache } from '../../api/cache';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

export const DailyMenuPage: React.FC = () => {

  const cachedCats = appCache.get('/masters/menu-categories')?.data || appCache.get('/masters/menu-categories');
  const cachedItems = appCache.get('/masters/menu-items')?.data || appCache.get('/masters/menu-items');
  const cachedDaily = appCache.get('/daily-menu')?.data || appCache.get('/daily-menu');

  const [categories, setCategories] = useState<MenuCategory[]>(() => Array.isArray(cachedCats) ? cachedCats : []);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>(() => Array.isArray(cachedItems) ? cachedItems : []);
  const [dailyMenus, setDailyMenus] = useState<DailyMenu[]>(() => cachedDaily?.menus || []);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => cachedDaily?.currentDay || 'MONDAY');

  // Compute the REAL current day dynamically in the browser using JavaScript Date.
  // This ensures the TODAY badge always matches the user's actual system clock,
  // regardless of any stale server cache.
  const JS_TODAY_KEYS: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const systemToday: DayOfWeek = JS_TODAY_KEYS[new Date().getDay()];

  const [isStrictEnforced, setIsStrictEnforced] = useState(() => cachedDaily ? cachedDaily.isStrictEnforced !== false : true);

  // Selected Day's active item IDs (editable state)
  const [activeItemIds, setActiveItemIds] = useState<string[]>(() => {
    const initDay = cachedDaily?.currentDay || 'MONDAY';
    const currentMenu = cachedDaily?.menus?.find((m: any) => m.dayOfWeek === initDay);
    return currentMenu?.itemIds || [];
  });
  const [notes, setNotes] = useState<string>(() => {
    const initDay = cachedDaily?.currentDay || 'MONDAY';
    const currentMenu = cachedDaily?.menus?.find((m: any) => m.dayOfWeek === initDay);
    return currentMenu?.notes || '';
  });

  // Track unsaved changes
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const prevSelectedDayRef = useRef<DayOfWeek>(selectedDay);
  const hasInitializedRef = useRef(Boolean(cachedDaily?.menus && cachedDaily.menus.length > 0));

  // Filtering states for Master Catalog (Left column)
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');

  // Copy modal state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyTargetDays, setCopyTargetDays] = useState<DayOfWeek[]>([]);

  // Confirmation state keeps menu edits intentional and prevents accidental loss.
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<
    | { type: 'item'; itemId: string; itemName: string }
    | { type: 'category'; categoryId: string; categoryName: string; itemCount: number }
    | { type: 'day' }
    | null
  >(null);

  // Poster Generation UI State
  const [posterPrice, setPosterPrice] = useState<number>(250);
  const [posterCustomDate, setPosterCustomDate] = useState<string>('');
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterSavedList, setPosterSavedList] = useState<Record<string, any[]>>({});
  const [showPosterPanel, setShowPosterPanel] = useState(true);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [pendingPosterDelete, setPendingPosterDelete] = useState<any | null>(null);
  const [deletingPoster, setDeletingPoster] = useState(false);

  // UI status
  const [loading, setLoading] = useState(() => !Array.isArray(cachedItems) || cachedItems.length === 0);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const loadAllData = async (showSpinner = false, forceFresh = false) => {
    if (showSpinner || allMenuItems.length === 0) {
      setLoading(true);
    }
    try {
      const config = forceFresh ? { forceFresh: true } : undefined;
      const [catRes, itemRes, dailyRes]: any = await Promise.all([
        apiClient.get('/masters/menu-categories', config),
        apiClient.get('/masters/menu-items', config),
        apiClient.get('/daily-menu', config)
      ]);

      if (catRes.success) setCategories(catRes.data);
      if (itemRes.success) setAllMenuItems(itemRes.data);

      if (dailyRes.success && dailyRes.data) {
        setDailyMenus(dailyRes.data.menus || []);
        setIsStrictEnforced(dailyRes.data.isStrictEnforced !== false);

        // Default active day to today ONLY on initial load
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          const todayKey = JS_TODAY_KEYS[new Date().getDay()];
          setSelectedDay(todayKey);
        }
      }
    } catch (err) {
      console.error('Failed to load Daily Menu data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData(false, true);
  }, []);

  useAutoRefresh(() => loadAllData(false, true), {
    entities: ['daily-menu', 'masters', 'menu', 'categories'],
    intervalMs: 8000,
    refreshOnFocus: true
  });

  // When selectedDay changes or dailyMenus is reloaded, sync activeItemIds and notes safely
  useEffect(() => {
    const dayChanged = prevSelectedDayRef.current !== selectedDay;
    prevSelectedDayRef.current = selectedDay;

    // 1. If day changed: always load the newly selected day's saved menu
    if (dayChanged) {
      const currentMenu = dailyMenus.find(m => m.dayOfWeek === selectedDay);
      setActiveItemIds(currentMenu?.itemIds || []);
      setNotes(currentMenu?.notes || '');
      setIsDirty(false);
      isDirtyRef.current = false;
      setSaveSuccessMsg(null);
      return;
    }

    // 2. If user has unsaved modifications on current day, NEVER let background sync wipe them out
    if (isDirtyRef.current) {
      return;
    }

    // 3. Initial load when dailyMenus becomes available
    if (!hasInitializedRef.current && dailyMenus.length > 0) {
      const currentMenu = dailyMenus.find(m => m.dayOfWeek === selectedDay);
      setActiveItemIds(currentMenu?.itemIds || []);
      setNotes(currentMenu?.notes || '');
      hasInitializedRef.current = true;
      return;
    }

    // 4. Background refresh when NOT dirty: only update if server actually has different data
    const currentMenu = dailyMenus.find(m => m.dayOfWeek === selectedDay);
    const serverItemIds = currentMenu?.itemIds || [];
    const serverNotes = currentMenu?.notes || '';

    const isSame =
      activeItemIds.length === serverItemIds.length &&
      activeItemIds.every((id, idx) => serverItemIds[idx] === id) &&
      notes === serverNotes;

    if (!isSame) {
      setActiveItemIds(serverItemIds);
      setNotes(serverNotes);
    }
  }, [selectedDay, dailyMenus]);

  // Add a single dish to the editable day's menu.
  const handleAddItem = (itemId: string) => {
    setIsDirty(true);
    isDirtyRef.current = true;
    setActiveItemIds(prev => prev.includes(itemId) ? prev : [...prev, itemId]);
  };

  // Add all dishes of a category
  const handleAddCategoryItems = (catId: string) => {
    const itemsInCat = allMenuItems.filter(m => m.categoryId === catId).map(m => m.id);
    setIsDirty(true);
    isDirtyRef.current = true;
    setActiveItemIds(prev => Array.from(new Set([...prev, ...itemsInCat])));
  };

  // Removal actions are confirmed before they change the editable day's menu.
  const requestRemoveCategoryItems = (catId: string) => {
    const category = categories.find(c => c.id === catId);
    const itemCount = activeItemIds.filter(id => allMenuItems.some(m => m.id === id && m.categoryId === catId)).length;
    if (itemCount === 0) return;
    setPendingRemoval({
      type: 'category',
      categoryId: catId,
      categoryName: category?.name || 'this category',
      itemCount
    });
  };

  const requestRemoveItem = (item: MenuItem) => {
    setPendingRemoval({ type: 'item', itemId: item.id, itemName: item.name });
  };

  const requestClearDay = () => {
    if (activeItemIds.length > 0) setPendingRemoval({ type: 'day' });
  };

  const confirmRemoval = () => {
    if (!pendingRemoval) return;
    setIsDirty(true);
    isDirtyRef.current = true;
    setActiveItemIds(prev => {
      if (pendingRemoval.type === 'day') return [];
      if (pendingRemoval.type === 'item') return prev.filter(id => id !== pendingRemoval.itemId);
      const itemsInCategory = new Set(allMenuItems.filter(m => m.categoryId === pendingRemoval.categoryId).map(m => m.id));
      return prev.filter(id => !itemsInCategory.has(id));
    });
    setPendingRemoval(null);
  };

  // Discard changes & reset to last saved state
  const handleResetChanges = () => {
    const currentMenu = dailyMenus.find(m => m.dayOfWeek === selectedDay);
    setActiveItemIds(currentMenu?.itemIds || []);
    setNotes(currentMenu?.notes || '');
    setIsDirty(false);
    isDirtyRef.current = false;
  };

  // Day selector change with unsaved changes prompt
  const handleSelectDay = (dayKey: DayOfWeek) => {
    if (dayKey === selectedDay) return;
    if (isDirtyRef.current) {
      const confirmDiscard = window.confirm(
        `You have unsaved changes for ${selectedDay}. Do you want to discard them and switch to ${dayKey}?`
      );
      if (!confirmDiscard) return;
    }
    setSelectedDay(dayKey);
  };

  // Save current day's menu
  const handleConfirmSaveMenu = async () => {
    setSaving(true);
    setSaveSuccessMsg(null);
    try {
      const res: any = await apiClient.post('/daily-menu', {
        dayOfWeek: selectedDay,
        itemIds: activeItemIds,
        notes,
        isActive: true
      });

      if (res.success) {
        setIsDirty(false);
        isDirtyRef.current = false;
        setIsSaveConfirmOpen(false);
        setShowPosterPanel(true);
        setPosterDataUrl(null);
        setSaveSuccessMsg(`✓ ${selectedDay} Daily Menu saved with ${activeItemIds.length} items.`);
        // Update local dailyMenus list
        setDailyMenus(prev =>
          prev.map(m => m.dayOfWeek === selectedDay ? { ...m, itemIds: activeItemIds, notes, itemCount: activeItemIds.length } : m)
        );
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save daily menu.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Strict Daily Menu Enforcement
  const handleToggleStrict = async () => {
    const nextStrict = !isStrictEnforced;
    try {
      const res: any = await apiClient.post('/daily-menu/toggle-strict', {
        isStrictEnforced: nextStrict
      });
      if (res.success) {
        setIsStrictEnforced(nextStrict);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle strict mode.');
    }
  };

  // Copy Menu to target days
  const handleExecuteCopy = async () => {
    if (copyTargetDays.length === 0) {
      alert('Please select at least one day to copy to.');
      return;
    }
    setSaving(true);
    try {
      const res: any = await apiClient.post('/daily-menu/copy', {
        fromDay: selectedDay,
        toDays: copyTargetDays
      });
      if (res.success) {
        setIsCopyModalOpen(false);
        setCopyTargetDays([]);
        setIsDirty(false);
        isDirtyRef.current = false;
        alert(`Successfully copied ${selectedDay} menu to ${copyTargetDays.join(', ')}!`);
        await loadAllData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to copy menu.');
    } finally {
      setSaving(false);
    }
  };

  // Filter master catalog
  const filteredCatalog = allMenuItems.filter(item => {
    const matchCat = selectedCategoryId === 'ALL' || item.categoryId === selectedCategoryId;
    const matchSearch =
      item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      item.code.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchCat && matchSearch;
  });
  const selectedDishes = activeItemIds
    .map(id => allMenuItems.find(m => m.id === id))
    .filter(Boolean) as MenuItem[];

  // Poster design is intentionally fixed to the approved restaurant menu card.
  const POSTER_THEME = 'royal_maroon';
  const POSTER_FORMAT = 'FORMAT_KATHIYAWADI_CARD';

  // Generate poster preview
  const handleGeneratePreview = async () => {
    setPosterLoading(true);
    setPosterError(null);
    try {
      const res: any = await apiClient.post(`/daily-menu/${selectedDay}/poster`, {
        price: posterPrice,
        theme: POSTER_THEME,
        format: POSTER_FORMAT,
        date: posterCustomDate || undefined
      });
      if (res.success && res.data?.dataUrl) {
        setPosterDataUrl(res.data.dataUrl);
      } else {
        setPosterError(res.message || 'Failed to generate poster.');
      }
    } catch (err: any) {
      setPosterError(err.message || 'Failed to generate poster.');
    } finally {
      setPosterLoading(false);
    }
  };

  // Save generated poster to server
  const handleSavePoster = async () => {
    if (!posterDataUrl) {
      setPosterError('Please generate a poster first.');
      return;
    }
    setPosterLoading(true);
    setPosterError(null);
    try {
      const res: any = await apiClient.post(`/daily-menu/${selectedDay}/poster/save`, {
        price: posterPrice,
        theme: POSTER_THEME,
        format: POSTER_FORMAT,
        date: posterCustomDate || undefined,
        previewDataUrl: posterDataUrl
      });
      if (res.success) {
        // Refresh saved posters list
        loadSavedPosters(selectedDay);
        setPosterDataUrl(null);
      } else {
        setPosterError(res.message || 'Failed to save poster.');
      }
    } catch (err: any) {
      setPosterError(err.message || 'Failed to save poster.');
    } finally {
      setPosterLoading(false);
    }
  };

  // Download poster image
  const handleDownloadPoster = () => {
    if (!posterDataUrl) return;
    const link = document.createElement('a');
    link.href = posterDataUrl;
    link.download = `menu_${selectedDay.toLowerCase()}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy poster image URL
  const handleCopyPosterUrl = async () => {
    if (!posterDataUrl) return;
    try {
      await navigator.clipboard.writeText(posterDataUrl);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = posterDataUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  // Load saved posters for a day
  const loadSavedPosters = async (day: DayOfWeek) => {
    try {
      const res: any = await apiClient.get(`/daily-menu/${day}/posters`);
      if (res.success) {
        setPosterSavedList(prev => ({ ...prev, [day]: res.data?.posters || [] }));
      }
    } catch (err) {
      console.error('Failed to load saved posters:', err);
    }
  };

  // Delete a saved poster after the branded confirmation modal is approved.
  const handleDeletePoster = async () => {
    if (!pendingPosterDelete) return;
    setDeletingPoster(true);
    setPosterError(null);
    try {
      const res: any = await apiClient.delete(`/daily-menu/posters/${pendingPosterDelete.id}`);
      if (res.success) {
        setPendingPosterDelete(null);
        await loadSavedPosters(selectedDay);
      }
    } catch (err: any) {
      setPosterError(err.message || 'Failed to delete poster.');
    } finally {
      setDeletingPoster(false);
    }
  };

  // Auto-load saved posters when day changes
  useEffect(() => {
    loadSavedPosters(selectedDay);
  }, [selectedDay]);

  const removalTitle = pendingRemoval?.type === 'day'
    ? `Clear ${selectedDay} menu?`
    : pendingRemoval?.type === 'category'
      ? `Remove ${pendingRemoval.categoryName}?`
      : 'Remove dish from menu?';
  const removalDescription = pendingRemoval?.type === 'day'
    ? `This removes all ${activeItemIds.length} scheduled dishes from ${selectedDay}.`
    : pendingRemoval?.type === 'category'
      ? `This removes ${pendingRemoval.itemCount} scheduled dish${pendingRemoval.itemCount === 1 ? '' : 'es'} from ${pendingRemoval.categoryName}.`
      : pendingRemoval
        ? `${pendingRemoval.itemName} will be removed from ${selectedDay}.`
        : '';

  return (
    <div className="d-flex flex-column gap-3">
      {/* Top Banner & Header */}
      <div className="card shadow-sm border-0 bg-white">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <Calendar className="text-primary" size={26} />
                <h4 className="fw-bold mb-0 text-dark">Daily Menu Scheduler (રોજિંદુ મેનુ)</h4>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                  Day-Wise Rotating Catalog
                </span>
              </div>
              <p className="text-muted small mb-0">
                Configure fixed dish availability per day of the week. In <strong>Strict Mode</strong>, only these selected dishes will be available in POS for order taking; all other dishes will be hidden.
              </p>
            </div>

            {/* Strict Enforcement Mode Switch */}
            <div className="d-flex align-items-center justify-content-between gap-3 bg-light p-2 px-3 rounded-3 border w-100 w-md-auto">
              <div>
                <div className="d-flex align-items-center gap-1">
                  {isStrictEnforced ? (
                    <ShieldCheck size={18} className="text-success" />
                  ) : (
                    <ShieldAlert size={18} className="text-warning" />
                  )}
                  <span className="fw-bold small text-dark">Strict Daily Menu Mode</span>
                </div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                  {isStrictEnforced ? 'Only day-wise dishes available in POS' : 'All master dishes browsable in POS'}
                </div>
              </div>
              <div className="form-check form-switch m-0 flex-shrink-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="strictMenuSwitch"
                  checked={isStrictEnforced}
                  onChange={handleToggleStrict}
                  style={{ width: '2.5em', height: '1.3em', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* 7-Days Navigation Tabs */}
          <div className="mt-3 pt-3 border-top">
            <div className="d-flex flex-column flex-md-row gap-2 align-items-md-center justify-content-between">
              <div className="scrollable-pills-container gap-1 py-1 flex-grow-1" style={{ minWidth: 0 }}>
                {DAYS_LIST.map(day => {
                  const menuObj = dailyMenus.find(m => m.dayOfWeek === day.key);
                  const isToday = day.key === systemToday;
                  const isSelected = day.key === selectedDay;
                  const count = isSelected ? activeItemIds.length : (menuObj?.itemIds?.length || 0);

                  return (
                    <button
                      key={day.key}
                      className={`btn btn-sm px-2 px-sm-3 py-2 rounded-3 d-flex align-items-center gap-1 gap-sm-2 flex-shrink-0 transition-all ${
                        isSelected
                          ? 'btn-primary shadow-sm fw-bold'
                          : 'btn-white border text-dark hover-bg-light'
                      }`}
                      onClick={() => handleSelectDay(day.key)}
                    >
                      <span className="d-none d-sm-inline">{day.label}</span>
                      <span className="d-sm-none">{day.short}</span>
                      <span
                        className={`badge rounded-pill ${
                          isSelected
                            ? 'bg-white text-primary'
                            : count > 0
                            ? 'bg-primary-subtle text-primary border'
                            : 'bg-secondary-subtle text-muted'
                        }`}
                        style={{ fontSize: '0.72rem' }}
                      >
                        {count}
                      </span>
                      {isToday && (
                        <span className="badge bg-warning text-dark small" style={{ fontSize: '0.65rem' }}>
                          TODAY
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="align-self-end align-self-md-center flex-shrink-0 ms-md-2 mt-1 mt-md-0">
                <button
                  className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center gap-1.5 px-3 py-2 rounded-3 text-nowrap flex-shrink-0 shadow-xs"
                  onClick={() => loadAllData(true)}
                  disabled={loading}
                  title="Refresh Menu Data"
                  style={{ whiteSpace: 'nowrap', minHeight: '38px', lineHeight: 1 }}
                >
                  <RefreshCw size={14} className={`flex-shrink-0 ${loading ? 'spin' : ''}`} />
                  <span className="text-nowrap fw-medium" style={{ whiteSpace: 'nowrap' }}>
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Alert Message */}
      {saveSuccessMsg && (
        <div className="alert alert-success d-flex flex-wrap align-items-center justify-content-between gap-2 py-2 px-3 shadow-sm border-0 mb-0">
          <div className="d-flex align-items-center gap-2">
            <CheckCircle2 size={18} className="text-success" />
            <span className="fw-bold small text-break">{saveSuccessMsg}</span>
          </div>
          <span className="badge bg-success">Active Menu</span>
        </div>
      )}

      {/* Main Dual-Panel Section */}
      <div className="row g-3">
        {/* LEFT PANEL: Master Menu Catalog */}
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm border-0 h-100 bg-white">
            <div className="card-header bg-white py-3 border-bottom">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <h6 className="fw-bold mb-0 text-dark">Master Restaurant Catalog</h6>
                  <span className="text-muted small">Select dishes to include in <strong>{selectedDay}</strong></span>
                </div>
                {/* Search Bar */}
                <div className="input-group input-group-sm" style={{ maxWidth: 240 }}>
                  <span className="input-group-text bg-light border-end-0"><Search size={14} /></span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search dish or code..."
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="scrollable-pills-container gap-1 mt-3" style={{ flexWrap: 'wrap', whiteSpace: 'normal', overflowX: 'visible' }}>
                <button
                  className={`btn btn-xs btn-sm py-1 px-2 rounded-2 ${
                    selectedCategoryId === 'ALL' ? 'btn-dark' : 'btn-outline-secondary'
                  }`}
                  onClick={() => setSelectedCategoryId('ALL')}
                >
                  All Categories ({allMenuItems.length})
                </button>
                {categories.map(cat => {
                  const catItemsCount = allMenuItems.filter(m => m.categoryId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      className={`btn btn-xs btn-sm py-1 px-2 rounded-2 ${
                        selectedCategoryId === cat.id ? 'btn-dark' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setSelectedCategoryId(cat.id)}
                    >
                      {cat.name} ({catItemsCount})
                    </button>
                  );
                })}
              </div>

              {/* Category Quick Actions */}
              {selectedCategoryId !== 'ALL' && (
                <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                  <span className="text-muted small">Quick Category Action:</span>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-outline-primary btn-xs btn-sm py-0 px-2"
                      onClick={() => handleAddCategoryItems(selectedCategoryId)}
                    >
                      + Add All in Category
                    </button>
                    <button
                      className="btn btn-outline-danger btn-xs btn-sm py-0 px-2"
                      onClick={() => requestRemoveCategoryItems(selectedCategoryId)}
                    >
                      - Remove All in Category
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Catalog Items List */}
            <div className="card-body p-2 overflow-auto" style={{ maxHeight: '550px' }}>
              {filteredCatalog.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <Utensils size={32} className="opacity-25 mb-2" />
                  <div>No dishes found matching search criteria.</div>
                </div>
              ) : (
                <div className="row g-2">
                  {filteredCatalog.map(item => {
                    const isAdded = activeItemIds.includes(item.id);
                    const catName = categories.find(c => c.id === item.categoryId)?.name || 'General';

                    return (
                      <div key={item.id} className="col-12 col-md-6">
                        <div
                          className={`p-2 rounded-3 border d-flex align-items-center justify-content-between gap-2 transition-all ${
                            isAdded
                              ? 'bg-primary-subtle border-primary'
                              : 'bg-white hover-bg-light'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => isAdded ? requestRemoveItem(item) : handleAddItem(item.id)}
                        >
                          <div className="d-flex align-items-center gap-2 overflow-hidden">
                            <span className={`badge p-1 ${item.isVeg ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.6rem' }}>
                              {item.isVeg ? 'VEG' : 'NON'}
                            </span>
                            <div className="overflow-hidden">
                              <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.85rem' }}>
                                {item.name}
                              </div>
                              <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                                <span className="badge bg-light text-secondary border me-1 font-monospace">{item.code}</span>
                                <span>{catName}</span>
                              </div>
                            </div>
                          </div>

                          <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            <div
                              className={`rounded-circle d-flex align-items-center justify-content-center ${
                                isAdded ? 'bg-primary text-white' : 'border text-muted bg-light'
                              }`}
                              style={{ width: 24, height: 24 }}
                            >
                              {isAdded ? <Check size={14} /> : <Plus size={14} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Scheduled Dishes for Selected Day */}
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm border-0 h-100 bg-white d-flex flex-column">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <div>
                <h6 className="fw-bold mb-0 text-dark">
                  Scheduled for {selectedDay} ({activeItemIds.length})
                </h6>
                <span className="text-muted small">
                  {selectedDay === systemToday ? 'Active Today' : 'Scheduled for future service'}
                </span>
              </div>
              <div className="d-flex gap-1">
                <button
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                  onClick={() => setIsCopyModalOpen(true)}
                  disabled={activeItemIds.length === 0}
                  title="Copy this day's menu to other days"
                >
                  <Copy size={14} /> Copy
                </button>
                <button
                  className="btn btn-outline-danger btn-sm p-1 px-2"
                  onClick={requestClearDay}
                  disabled={activeItemIds.length === 0}
                  title="Clear all items"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* List of Scheduled Items */}
            <div className="card-body p-2 flex-grow-1 overflow-auto" style={{ maxHeight: '420px' }}>
              {selectedDishes.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <AlertCircle size={32} className="text-warning opacity-50 mb-2" />
                  <div className="fw-bold">No dishes selected for {selectedDay}</div>
                  <p className="small text-muted mb-0">
                    Click items from the catalog on the left to add dishes for this day.
                  </p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-1">
                  {selectedDishes.map((dish, idx) => {
                    const catName = categories.find(c => c.id === dish.categoryId)?.name || 'General';
                    return (
                      <div
                        key={dish.id}
                        className="p-2 px-3 rounded-2 bg-light border d-flex align-items-center justify-content-between gap-2"
                      >
                        <div className="d-flex align-items-center gap-2 overflow-hidden">
                          <span className="text-muted small fw-bold font-monospace" style={{ width: 20 }}>
                            {idx + 1}.
                          </span>
                          <span className={`badge p-1 ${dish.isVeg ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.6rem' }}>
                            {dish.isVeg ? 'VEG' : 'NON'}
                          </span>
                          <div className="overflow-hidden">
                            <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.85rem' }}>
                              {dish.name}
                            </div>
                            <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                              {catName}
                            </div>
                          </div>
                        </div>

                        <button
                          className="btn btn-outline-danger btn-sm p-1 rounded-circle flex-shrink-0"
                          onClick={() => requestRemoveItem(dish)}
                          title="Remove item"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Day Notes & Save Footer */}
            <div className="card-footer bg-light p-3 border-top">
              <div className="mb-2">
                <label className="form-label small fw-bold mb-1">
                  Day Menu Notes / Chef Specials (Optional):
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g. Tuesday Kathiyawadi Thali Special, Ringan No Olo"
                  value={notes}
                  onChange={e => {
                    setIsDirty(true);
                    isDirtyRef.current = true;
                    setNotes(e.target.value);
                  }}
                />
              </div>

              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2">
                <div className="d-flex align-items-center gap-2">
                  <div className="small text-muted">
                    Total <strong>{activeItemIds.length}</strong> items fixed
                  </div>
                  {isDirty && (
                    <span className="badge bg-warning text-dark border border-warning-subtle d-inline-flex align-items-center gap-1">
                      <span className="spinner-grow spinner-grow-sm" style={{ width: '0.45rem', height: '0.45rem' }} />
                      Unsaved
                    </span>
                  )}
                </div>
                <div className="d-flex align-items-center gap-2">
                  {isDirty && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={handleResetChanges}
                      disabled={saving}
                      title="Discard unsaved changes and reload saved state"
                    >
                      Discard
                    </button>
                  )}
                  <button
                    className={`btn btn-sm px-4 fw-bold d-flex align-items-center gap-2 shadow-sm ${
                      isDirty ? 'btn-success' : 'btn-primary'
                    }`}
                    onClick={() => setIsSaveConfirmOpen(true)}
                    disabled={saving || !isDirty}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={16} /> Save {selectedDay} Menu
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SAVE MENU CONFIRMATION */}
      {isSaveConfirmOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(43,24,28,0.55)' }} tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <CheckCircle2 size={19} /> Save {selectedDay} Menu
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsSaveConfirmOpen(false)} disabled={saving} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  You are about to make <strong>{activeItemIds.length} dish{activeItemIds.length === 1 ? '' : 'es'}</strong> available for <strong>{selectedDay}</strong>.
                </p>
                {activeItemIds.length === 0 ? (
                  <div className="alert alert-warning mb-0 small">
                    This saves an empty menu. In Strict Daily Menu Mode, no dishes will be available for this day.
                  </div>
                ) : (
                  <div className="text-muted small">The saved menu will be synchronized to all connected ERP screens.</div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setIsSaveConfirmOpen(false)} disabled={saving}>Cancel</button>
                <button type="button" className="btn btn-success btn-sm d-flex align-items-center gap-1" onClick={handleConfirmSaveMenu} disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><Check size={14} /> Confirm & Save</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE / CLEAR CONFIRMATION */}
      {pendingRemoval && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(43,24,28,0.55)' }} tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger d-flex align-items-center gap-2"><Trash2 size={18} /> {removalTitle}</h5>
                <button type="button" className="btn-close" onClick={() => setPendingRemoval(null)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="mb-2">{removalDescription}</p>
                <div className="alert alert-warning small mb-0">
                  This is a pending change. Click <strong>Save {selectedDay} Menu</strong> afterwards to permanently update the daily menu.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setPendingRemoval(null)}>Cancel</button>
                <button type="button" className="btn btn-danger btn-sm d-flex align-items-center gap-1" onClick={confirmRemoval}><Trash2 size={14} /> Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAVED POSTER DELETE CONFIRMATION */}
      {pendingPosterDelete && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(43,24,28,0.55)' }} tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0 overflow-hidden">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2"><Trash2 size={18} /> Delete Saved Poster</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setPendingPosterDelete(null)} disabled={deletingPoster} aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <img
                    src={`${getBackendOrigin()}${pendingPosterDelete.fileUrl}`}
                    alt="Poster selected for deletion"
                    className="border rounded"
                    style={{ width: 76, height: 100, objectFit: 'cover' }}
                  />
                  <div>
                    <div className="fw-bold text-dark">{selectedDay} Menu Poster</div>
                    <div className="text-muted small">₹{pendingPosterDelete.price}/- • {pendingPosterDelete.generatedAt ? new Date(pendingPosterDelete.generatedAt).toLocaleString() : 'Saved poster'}</div>
                  </div>
                </div>
                <div className="alert alert-danger small mb-0">
                  This permanently removes the saved poster file. This action cannot be undone.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setPendingPosterDelete(null)} disabled={deletingPoster}>Cancel</button>
                <button type="button" className="btn btn-danger btn-sm d-flex align-items-center gap-1" onClick={handleDeletePoster} disabled={deletingPoster}>
                  {deletingPoster ? <><span className="spinner-border spinner-border-sm" /> Deleting...</> : <><Trash2 size={14} /> Delete Poster</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COPY MENU MODAL */}
      {isCopyModalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <Copy size={18} /> Copy Menu from {selectedDay}
                </h5>
                <button type="button" className="btn-close" onClick={() => setIsCopyModalOpen(false)} />
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-3">
                  Select which other days should have the exact same <strong>{activeItemIds.length} dishes</strong> as {selectedDay}:
                </p>

                <div className="d-flex flex-column gap-2">
                  {DAYS_LIST.filter(d => d.key !== selectedDay).map(day => {
                    const isChecked = copyTargetDays.includes(day.key);
                    return (
                      <label
                        key={day.key}
                        className={`p-2 rounded border d-flex align-items-center justify-content-between cursor-pointer ${
                          isChecked ? 'bg-primary-subtle border-primary' : 'bg-light'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="fw-bold small">{day.label}</span>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setCopyTargetDays(prev => [...prev, day.key]);
                            } else {
                              setCopyTargetDays(prev => prev.filter(k => k !== day.key));
                            }
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsCopyModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                  onClick={handleExecuteCopy}
                  disabled={saving || copyTargetDays.length === 0}
                >
                  <Check size={14} /> Copy to {copyTargetDays.length} Days
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* POSTER GENERATION PANEL */}
      {showPosterPanel && (
        <div className="card shadow-sm border-0 mt-3">
          <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <ImageIcon className="text-success" size={22} />
              <h6 className="fw-bold mb-0 text-dark">Automatic Poster Generator (પોસ્ટર જનરેટર)</h6>
              <span className="badge bg-success-subtle text-success border border-success-subtle">
                Uses Saved Menu
              </span>
            </div>
            <button
              className="btn btn-sm btn-outline-secondary p-1"
              onClick={() => setShowPosterPanel(false)}
              title="Hide Poster Panel"
            >
              <X size={16} />
            </button>
          </div>

          <div className="card-body p-3">
            <div className="row g-3">
              {/* LEFT: Controls */}
              <div className="col-12 col-lg-5">
                <div className="d-flex flex-column gap-3">
                  {isDirty && (
                    <div className="alert alert-warning py-2 px-3 small mb-0">
                      Save the {selectedDay} menu first. Poster Preview always uses the final saved menu.
                    </div>
                  )}
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small fw-bold mb-1">Price (₹/-)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={posterPrice}
                        min={100}
                        max={1000}
                        onChange={e => setPosterPrice(parseInt(e.target.value) || 250)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold mb-1">Custom Date (Optional)</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={posterCustomDate}
                        onChange={e => setPosterCustomDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rounded-3 border bg-primary-subtle p-3">
                    <div className="fw-bold small text-primary">Fixed Restaurant Poster Design</div>
                    <div className="text-muted small mt-1">
                      Royal maroon, gold ribbons and Gujarati menu-card layout. The saved dishes, price and date are filled automatically.
                    </div>
                  </div>

                  {posterError && (
                    <div className="alert alert-danger py-2 px-3 small mb-0">{posterError}</div>
                  )}

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-primary btn-sm d-flex align-items-center gap-1 flex-grow-1"
                      onClick={handleGeneratePreview}
                      disabled={posterLoading || isDirty}
                    >
                      {posterLoading ? (
                        <><Loader2 size={14} className="spin" /> Generating...</>
                      ) : (
                        <><ImageIcon size={14} /> Open Preview</>
                      )}
                    </button>
                    <button
                      className="btn btn-success btn-sm d-flex align-items-center gap-1"
                      onClick={handleSavePoster}
                      disabled={posterLoading || !posterDataUrl}
                      title="Save poster to server"
                    >
                      <Check size={14} /> Save Poster
                    </button>
                  </div>

                  {posterDataUrl && (
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 flex-grow-1"
                        onClick={handleDownloadPoster}
                      >
                        <Download size={14} /> Download to PC
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                        onClick={handleCopyPosterUrl}
                        title="Copy image URL"
                      >
                        <Copy size={14} /> Copy URL
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Preview & Saved Posters */}
              <div className="col-12 col-lg-7">
                <div className="row g-3">
                  {/* Live Preview */}
                  <div className="col-12">
                    <div className="border rounded-3 bg-light" style={{ height: 380, overflow: 'hidden' }}>
                      {posterLoading ? (
                        <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                          <Loader2 size={28} className="spin" /> Generating poster...
                        </div>
                      ) : posterDataUrl ? (
                        <img
                          src={posterDataUrl}
                          alt="Poster preview"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                          <ImageIcon size={40} className="opacity-25 mb-2" />
                          <div className="small">Click "Generate Preview" to create a poster for {selectedDay}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Saved Posters List */}
                  <div className="col-12">
                    <div className="border rounded-3 bg-light" style={{ maxHeight: 200, overflowY: 'auto' }}>
                      <div className="p-2 border-bottom bg-white d-flex justify-content-between align-items-center">
                        <span className="fw-bold small text-dark">Saved Posters for {selectedDay}</span>
                        <span className="badge bg-primary-subtle text-primary">
                          {(posterSavedList[selectedDay] || []).length}
                        </span>
                      </div>
                      <div className="p-2">
                        {(posterSavedList[selectedDay] || []).length === 0 ? (
                          <div className="text-center py-3 text-muted small">
                            No saved posters yet. Click "Save" to store one.
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-2">
                            {(posterSavedList[selectedDay] || []).map((poster: any) => (
                              <div key={poster.id} className="d-flex align-items-center gap-2 p-2 bg-white rounded border">
                                <img
                                  src={`${getBackendOrigin()}${poster.fileUrl}`}
                                  alt={poster.id}
                                  style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                                />
                                <div className="flex-grow-1 overflow-hidden">
                                  <div className="fw-bold small text-truncate">{poster.themeName || poster.theme}</div>
                                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                    ₹{poster.price}/- • {poster.formatStyle} • {poster.generatedAt ? new Date(poster.generatedAt).toLocaleString() : ''}
                                  </div>
                                </div>
                                <a
                                  href={`${getBackendOrigin()}${poster.fileUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline-primary p-1"
                                  title="Open in new tab"
                                >
                                  <ExternalLink size={12} />
                                </a>
                                <a
                                  href={`${getBackendOrigin()}${poster.fileUrl}`}
                                  download={poster.fileName}
                                  className="btn btn-sm btn-outline-success p-1"
                                  title="Download"
                                >
                                  <Download size={12} />
                                </a>
                                <button
                                  className="btn btn-sm btn-outline-danger p-1"
                                  onClick={() => setPendingPosterDelete(poster)}
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
