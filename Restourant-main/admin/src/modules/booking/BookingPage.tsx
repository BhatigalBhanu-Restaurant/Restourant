import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/PermissionGate';
import { Booking, MenuItem, MenuCategory, DailyMenu } from '../../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  XCircle, 
  UserCheck, 
  Phone, 
  Users, 
  Printer, 
  Search, 
  FileText,
  AlertCircle,
  CheckCircle2,
  CalendarPlus,
  Download,
  Clock,
  MapPin,
  CreditCard,
  Building2,
  RotateCcw,
  Utensils,
  Plus,
  Check,
  Trash2,
  X,
  Eye,
  Pencil,
  LogIn,
  LogOut,
  Receipt,
  MessageCircle,
  Settings
} from 'lucide-react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

// Accurate local date helper (avoiding UTC timezone rollover)
const getLocalDateStr = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Crystal notification chime via Web Audio API
const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Autoplay policy fallback
  }
};

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_NAME_GUJARATI: Record<string, string> = {
  'SUNDAY': 'રવિવાર (Sunday)',
  'MONDAY': 'સોમવાર (Monday)',
  'TUESDAY': 'મંગળવાર (Tuesday)',
  'WEDNESDAY': 'બુધવાર (Wednesday)',
  'THURSDAY': 'ગુરુવાર (Thursday)',
  'FRIDAY': 'શુક્રવાર (Friday)',
  'SATURDAY': 'શનિવાર (Saturday)'
};

const STORAGE_KEY_BOOKINGS = 'bhatigal_cached_bookings';
const STORAGE_KEY_CATEGORIES = 'bhatigal_cached_categories';
const STORAGE_KEY_ITEMS = 'bhatigal_cached_menu_items';
const STORAGE_KEY_DAILY_MENUS = 'bhatigal_cached_daily_menus';
const STORAGE_KEY_MANAGERS = 'bhatigal_cached_function_managers';
const STORAGE_KEY_TYPES = 'bhatigal_cached_function_types';

const getCachedStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export const BookingPage: React.FC = () => {
  const { socket } = useSocket();
  const { user } = useAuth();

  // Cached initial values for 0ms instantaneous UI render on mobile & web
  const initialBookings = useMemo(() => getCachedStorage<Booking[]>(STORAGE_KEY_BOOKINGS, []), []);
  const initialCats = useMemo(() => getCachedStorage<MenuCategory[]>(STORAGE_KEY_CATEGORIES, []), []);
  const initialItems = useMemo(() => getCachedStorage<MenuItem[]>(STORAGE_KEY_ITEMS, []), []);
  const initialDaily = useMemo(() => getCachedStorage<DailyMenu[]>(STORAGE_KEY_DAILY_MENUS, []), []);
  const initialManagers = useMemo(() => getCachedStorage<string[]>(STORAGE_KEY_MANAGERS, [
    'Bhanubhai Patel',
    'Rameshbhai Patel'
  ]), []);
  const initialTypes = useMemo(() => getCachedStorage<string[]>(STORAGE_KEY_TYPES, [
    'Family Dinner & Gathering',
    'Wedding / Reception',
    'Ring Ceremony / Sagai',
    'Birthday Party',
    'Corporate Event & Dinner',
    'Babri / Mundan Sanskar',
    'Traditional Feast / Rasoi',
    'Other Celebration'
  ]), []);

  // Mobile segmented view state: on mobile screens, toggle between 'calendar' and 'form'
  const [mobileViewTab, setMobileViewTab] = useState<'calendar' | 'form'>('calendar');

  // Current real date & system clock in Indian Standard Time format
  const todayStr = useMemo(() => getLocalDateStr(new Date()), []);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');
  
  // Active calendar view (month & year) - real current date
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Selected date for locking form (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Bookings state - 0ms instant initialization!
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [venueFilter, setVenueFilter] = useState('ALL');

  // Master Data - 0ms instant initialization!
  const [categories, setCategories] = useState<MenuCategory[]>(initialCats);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>(initialItems);
  const [dailyMenus, setDailyMenus] = useState<DailyMenu[]>(initialDaily);
  
  // Active item IDs selected for this function (same as activeItemIds in DailyMenuPage)
  const [activeItemIds, setActiveItemIds] = useState<string[]>([]);
  
  // Filter states for Master Catalog (same as DailyMenuPage)
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');

  // Modal toggle for full Dual-Panel Menu Builder
  const [isMenuModalOpen, setIsMenuModalOpen] = useState<boolean>(false);

  // Staff / Employees list for Manager assignment
  const [staffList, setStaffList] = useState<string[]>(initialManagers);

  // Function Types list for Event Type selection
  const [functionTypesList, setFunctionTypesList] = useState<string[]>(initialTypes);

  // Form Data for Lock Function Date
  const [formData, setFormData] = useState({
    bookingDate: todayStr,
    timeSlot: 'સાંજે (Dinner)',
    bookingTime: '08:00 PM',
    customerName: '',
    customerPhone: '',
    alternatePhone: '',
    guestCount: 50,
    // Retained only for legacy records; no new payment data is sent to the API.
    advanceAmount: 0,
    estimatedTotal: 0,
    paymentMode: '',
    referenceId: '',
    functionType: 'Family Dinner & Gathering',
    acceptedBy: 'Bhanubhai Patel',
    notes: ''
  });

  // Slip / Receipt Modal
  const [selectedBookingForSlip, setSelectedBookingForSlip] = useState<Booking | null>(null);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [viewingBillBooking, setViewingBillBooking] = useState<Booking | null>(null);
  const [viewingLockedMenuBooking, setViewingLockedMenuBooking] = useState<Booking | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [viewingDayHistory, setViewingDayHistory] = useState<{ date: string; bookings: Booking[] } | null>(null);

  // Check-Out and Bill Generation Workflow State
  const [checkoutState, setCheckoutState] = useState<{
    booking: Booking | null;
    dishes: Array<{ name: string; qty?: number; price?: number; total?: number }>;
    dishCount: number;
    dishRate: number;
    totalBillPrice: number;
    discount: number;
    advanceAmount: number;
    paymentMode: string;
    paymentReference: string;
    notes: string;
    newDishName: string;
    isCheckingOut: boolean;
  }>({
    booking: null,
    dishes: [],
    dishCount: 50,
    dishRate: 250,
    totalBillPrice: 0,
    discount: 0,
    advanceAmount: 0,
    paymentMode: 'Cash',
    paymentReference: '',
    notes: '',
    newDishName: '',
    isCheckingOut: false
  });

  const [isBookingConfirmOpen, setIsBookingConfirmOpen] = useState(false);
  const [isCapacityOverrideOpen, setIsCapacityOverrideOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [bookingEditor, setBookingEditor] = useState<Booking | null>(null);
  const [returnToBookingEditor, setReturnToBookingEditor] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [menuPosterUrl, setMenuPosterUrl] = useState<string | null>(null);
  const [menuPosterLoading, setMenuPosterLoading] = useState(false);

  // Notification / Alert message
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger' | 'info'; text: string } | null>(null);

  // Update live clock every second with real time and date
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
      setCurrentDateFormatted(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch dynamic manager names and function types from Store Settings
  useEffect(() => {
    const fetchSettingsAndStaff = async () => {
      try {
        const [settingsRes, staffRes]: any = await Promise.allSettled([
          apiClient.get('/system/settings'),
          apiClient.get('/hr/employees')
        ]);

        let customManagers: string[] = [];
        let customTypes: string[] = [];
        let defaultMgr = '';
        let defaultType = '';

        if (settingsRes.status === 'fulfilled' && settingsRes.value?.success && settingsRes.value?.data) {
          const s = settingsRes.value.data;
          if (s.function_managers && s.function_managers.trim().length > 0) {
            customManagers = s.function_managers
              .split(/[,;\n]+/)
              .map((x: string) => x.trim())
              .filter(Boolean);
          }
          if (s.function_types && s.function_types.trim().length > 0) {
            customTypes = s.function_types
              .split(/[,;\n]+/)
              .map((x: string) => x.trim())
              .filter(Boolean);
          }
          if (s.function_default_manager) {
            defaultMgr = s.function_default_manager.trim();
          }
          if (s.function_default_type) {
            defaultType = s.function_default_type.trim();
          }
        }

        // Managers: If configured in settings, use them!
        if (customManagers.length > 0) {
          setStaffList(customManagers);
          try { localStorage.setItem(STORAGE_KEY_MANAGERS, JSON.stringify(customManagers)); } catch (_) {}
          const chosenMgr = (defaultMgr && customManagers.includes(defaultMgr)) ? defaultMgr : customManagers[0];
          setFormData(prev => ({
            ...prev,
            acceptedBy: prev.acceptedBy && customManagers.includes(prev.acceptedBy) ? prev.acceptedBy : chosenMgr
          }));
        } else {
          // Fallback to active HR staff if settings are empty
          let staffNames: string[] = [];
          if (staffRes.status === 'fulfilled' && staffRes.value?.success && Array.isArray(staffRes.value?.data)) {
            staffNames = staffRes.value.data
              .map((emp: any) => `${emp.firstName || ''} ${emp.lastName || ''}`.trim())
              .filter(Boolean);
          }
          const merged = Array.from(new Set([...staffNames, 'Bhanubhai Patel', 'Rameshbhai Patel'])).filter(Boolean);
          if (merged.length > 0) {
            setStaffList(merged);
            try { localStorage.setItem(STORAGE_KEY_MANAGERS, JSON.stringify(merged)); } catch (_) {}
            setFormData(prev => ({ ...prev, acceptedBy: prev.acceptedBy || merged[0] }));
          }
        }

        // Function Types: If configured in settings, use them!
        if (customTypes.length > 0) {
          setFunctionTypesList(customTypes);
          try { localStorage.setItem(STORAGE_KEY_TYPES, JSON.stringify(customTypes)); } catch (_) {}
          const chosenType = (defaultType && customTypes.includes(defaultType)) ? defaultType : customTypes[0];
          setFormData(prev => ({
            ...prev,
            functionType: prev.functionType && customTypes.includes(prev.functionType) ? prev.functionType : chosenType
          }));
        }
      } catch (err) {
        console.error('Failed to load settings in booking:', err);
      }
    };
    fetchSettingsAndStaff();
  }, []);

  // Fetch Master Menu Items, Categories and Daily Menu configuration
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const [catRes, itemRes, dailyRes]: any = await Promise.all([
          apiClient.get('/masters/menu-categories'),
          apiClient.get('/masters/menu-items'),
          apiClient.get('/daily-menu')
        ]);
        if (catRes?.success && Array.isArray(catRes.data)) {
          setCategories(catRes.data);
          try { localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(catRes.data)); } catch (_) {}
        }
        if (itemRes?.success && Array.isArray(itemRes.data)) {
          setAllMenuItems(itemRes.data);
          try { localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(itemRes.data)); } catch (_) {}
        }
        if (dailyRes?.success && dailyRes.data) {
          const menus = dailyRes.data.menus || [];
          setDailyMenus(menus);
          try { localStorage.setItem(STORAGE_KEY_DAILY_MENUS, JSON.stringify(menus)); } catch (_) {}
        }
      } catch (err) {
        console.error('Failed to load menu master data:', err);
      }
    };
    fetchMenuData();
  }, []);

  // Synchronize form date when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({ ...prev, bookingDate: selectedDate }));
    }
  }, [selectedDate]);

  // Determine day-of-week for the selected booking date
  const bookingDayName = useMemo(() => {
    if (!formData.bookingDate) return 'FRIDAY';
    const parts = formData.bookingDate.split('-');
    if (parts.length !== 3) return 'FRIDAY';
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return DAY_NAMES[d.getDay()] || 'FRIDAY';
  }, [formData.bookingDate]);

  // Derive current Meal Period from selected timeSlot
  const bookingMealPeriod: 'LUNCH' | 'DINNER' = formData.timeSlot.includes('Lunch') || formData.timeSlot.includes('બપોરે') ? 'LUNCH' : 'DINNER';

  // Meal-period filtered categories (only show matching meal period categories in modal)
  const mealFilteredCategories = useMemo(() => {
    return categories.filter(cat => (cat.mealPeriod || 'DINNER') === bookingMealPeriod);
  }, [categories, bookingMealPeriod]);

  // Meal-period filtered items (only show matching meal period items in modal)
  const mealFilteredItems = useMemo(() => {
    return allMenuItems.filter(item => {
      const itemCat = categories.find(c => c.id === item.categoryId);
      const itemMeal = item.mealPeriod || itemCat?.mealPeriod || 'DINNER';
      return itemMeal === bookingMealPeriod;
    });
  }, [allMenuItems, categories, bookingMealPeriod]);

  // Load Day's Scheduled Daily Menu into this function
  const handleLoadDayMenu = () => {
    const currentDayMenu = dailyMenus.find(m => m.dayOfWeek === bookingDayName);
    if (currentDayMenu) {
      const periodIds = bookingMealPeriod === 'LUNCH'
        ? (Array.isArray(currentDayMenu.lunchItemIds) ? currentDayMenu.lunchItemIds : [])
        : (Array.isArray(currentDayMenu.dinnerItemIds) ? currentDayMenu.dinnerItemIds : []);
      if (periodIds.length > 0) {
        const merged = Array.from(new Set([...activeItemIds, ...periodIds]));
        setActiveItemIds(merged);
        setAlertMessage({
          type: 'success',
          text: `${DAY_NAME_GUJARATI[bookingDayName] || bookingDayName} નું ${bookingMealPeriod === 'LUNCH' ? 'બપોરનું' : 'સાંજનું'} ડેઇલી મેનુ (${periodIds.length} વાનગીઓ) સફળતાપૂર્વક ફંક્શનમાં ઉમેરાયું!`
        });
      } else {
        setAlertMessage({
          type: 'info',
          text: `${DAY_NAME_GUJARATI[bookingDayName] || bookingDayName} માટે ${bookingMealPeriod === 'LUNCH' ? 'બપોરનું' : 'સાંજનું'} ડેઇલી મેનુ સેટ નથી. આપ નીચે કેટેલોગમાંથી સીધી વાનગીઓ પસંદ કરી શકો છો.`
        });
      }
    } else {
      setAlertMessage({
        type: 'info',
        text: `${DAY_NAME_GUJARATI[bookingDayName] || bookingDayName} માટે કોઈ ડેઇલી મેનુ સેટ નથી. આપ નીચે કેટેલોગમાંથી સીધી વાનગીઓ પસંદ કરી શકો છો.`
      });
    }
  };

  // Toggle single item in selection
  const handleToggleItem = (itemId: string) => {
    setMenuPosterUrl(null);
    setActiveItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  // Add all items in a category
  const handleAddCategoryItems = (catId: string) => {
    const catItems = allMenuItems.filter(m => m.categoryId === catId);
    const newIds = catItems.map(m => m.id);
    setActiveItemIds(prev => Array.from(new Set([...prev, ...newIds])));
  };

  // Remove all items in a category
  const handleRemoveCategoryItems = (catId: string) => {
    const catItemIds = new Set(allMenuItems.filter(m => m.categoryId === catId).map(m => m.id));
    setActiveItemIds(prev => prev.filter(id => !catItemIds.has(id)));
  };

  // Clear all selected items
  const handleClearSelection = () => {
    setActiveItemIds([]);
    setMenuPosterUrl(null);
  };

  const generateFunctionMenuPoster = async () => {
    if (!activeItemIds.length) {
      setAlertMessage({ type: 'info', text: 'Select at least one dish to create the function menu card.' });
      return;
    }
    try {
      setMenuPosterLoading(true);
      const res: any = await apiClient.post('/bookings/menu-poster', { bookingDate: formData.bookingDate, itemIds: activeItemIds });
      if (res.success) setMenuPosterUrl(res.data.imageDataUrl);
    } catch (err: any) {
      setAlertMessage({ type: 'danger', text: err.message || 'Could not create the menu card.' });
    } finally { setMenuPosterLoading(false); }
  };

  const downloadFunctionMenuPoster = () => {
    if (!menuPosterUrl) return;
    const link = document.createElement('a');
    link.href = menuPosterUrl;
    link.download = `function-menu-${formData.bookingDate}.png`;
    link.click();
  };

  // Filtered master catalog items - strictly filtered by bookingMealPeriod
  const filteredCatalog = useMemo(() => {
    return mealFilteredItems.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.code.toLowerCase().includes(catalogSearch.toLowerCase());
      const matchesCategory = 
        selectedCategoryId === 'ALL' || item.categoryId === selectedCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [mealFilteredItems, catalogSearch, selectedCategoryId]);

  // Selected dishes details (for rendering list)
  const selectedDishes = useMemo(() => {
    return activeItemIds
      .map(id => allMenuItems.find(m => m.id === id))
      .filter(Boolean) as MenuItem[];
  }, [activeItemIds, allMenuItems]);

  // Load Bookings for active month / all
  const loadBookings = async (showSpinner = false, forceFresh = false) => {
    if (showSpinner || bookings.length === 0) setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;
      const config = forceFresh ? { forceFresh: true } : undefined;
      
      const res: any = await apiClient.get(`/bookings?month=${monthStr}`, config);
      if (res.success && Array.isArray(res.data)) {
        setBookings(res.data);
        try {
          localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(res.data));
        } catch (_) {}
      }
    } catch (err) {
      console.error('Failed to load function bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings(false, false);
  }, [currentDate]);

  useAutoRefresh(() => loadBookings(false, false), {
    entities: ['bookings'],
    intervalMs: 8000,
    refreshOnFocus: true
  });

  // Socket listener for real-time updates across multiple screens / devices
  useEffect(() => {
    if (!socket) return;
    const refreshLive = (payload?: any) => {
      playNotificationChime();
      loadBookings(false, true);
      if (payload?.action === 'BOOKING_CREATED' || payload?.customerName) {
        setAlertMessage({
          type: 'info',
          text: `Real-Time Update: New function booked for ${payload?.customerName || payload?.booking?.customerName || 'Guest'} on ${payload?.date || payload?.bookingDate || 'selected date'}!`
        });
      }
    };

    socket.on('booking.created', refreshLive);
    socket.on('booking.updated', refreshLive);
    socket.on('calendar.refresh', refreshLive);
    socket.on('data.changed', refreshLive);

    return () => {
      socket.off('booking.created', refreshLive);
      socket.off('booking.updated', refreshLive);
      socket.off('calendar.refresh', refreshLive);
      socket.off('data.changed', refreshLive);
    };
  }, [socket]);

  // Existing bookings on the currently selected date (multiple allowed!)
  // COMPLETED / CHECKED_OUT / CANCELLED functions no longer hold the date lock.
  const LOCK_RELEASED_STATUSES = ['COMPLETED', 'CHECKED_OUT', 'CANCELLED'];
  const isDateLocking = (b: Booking) =>
    !LOCK_RELEASED_STATUSES.includes(String(b.status || '').toUpperCase()) && b.isLocked !== false;

  const selectedDateBookings = useMemo(() => {
    return bookings.filter(b => b.bookingDate === selectedDate && isDateLocking(b));
  }, [bookings, selectedDate]);

  // Validate first, then use the branded confirmation dialog before locking a slot.
  const handleBookFunction = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.bookingDate < todayStr) {
      setAlertMessage({
        type: 'danger',
        text: 'Cannot book functions for past dates. Please select today or a future calendar date.'
      });
      return;
    }

    const cleanPhone = formData.customerPhone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setAlertMessage({ 
        type: 'danger', 
        text: 'Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).' 
      });
      return;
    }

    if (!formData.customerName.trim() || formData.customerName.trim().length < 2) {
      setAlertMessage({ type: 'danger', text: 'Please provide host name (at least 2 characters).' });
      return;
    }

    setIsBookingConfirmOpen(true);
  };

  const confirmBookFunction = async (allowOverbook = false) => {
    const cleanPhone = formData.customerPhone.replace(/\D/g, '');
    try {
      setSubmitting(true);
      // Selected dishes names list
      const dishNames = selectedDishes.map(d => d.name);

      const payload = {
        bookingDate: formData.bookingDate,
        timeSlot: formData.timeSlot,
        bookingTime: formData.bookingTime || (formData.timeSlot.includes('બપોરે') ? '01:00 PM' : '08:00 PM'),
        venueArea: 'Restaurant Banquet',
        customerName: formData.customerName.trim(),
        customerPhone: cleanPhone,
        alternatePhone: formData.alternatePhone.replace(/\D/g, ''),
        guestCount: Number(formData.guestCount),
        bookingPeriod: formData.timeSlot.includes('Lunch') ? 'LUNCH' : 'DINNER',
        functionType: formData.functionType,
        acceptedBy: formData.acceptedBy,
        notes: formData.notes.trim(),
        selectedMenu: dishNames,
        selectedMenuIds: activeItemIds,
        allowOverbook,
        isLocked: true
      };

      const res: any = await apiClient.post('/bookings', payload);
      if (res.success) {
        playNotificationChime();
        setAlertMessage({
          type: 'success',
          text: `ફંક્શન સફળતાપૂર્વક બુક થઈ ગયું! (${res.data.bookingNumber}) - ${res.data.customerName} on ${res.data.bookingDate} (${res.data.timeSlot}).`
        });

        // Automatically open the printable voucher slip
        setSelectedBookingForSlip(res.data);

        // Reset form for next booking
        setFormData(prev => ({
          ...prev,
          customerName: '',
          customerPhone: '',
          alternatePhone: '',
          notes: ''
        }));
        setActiveItemIds([]);
        setMenuPosterUrl(null);
        setIsBookingConfirmOpen(false);
        setIsCapacityOverrideOpen(false);

        loadBookings(false, true);
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to book function.';
      if (!allowOverbook && (err?.status === 409 || err?.response?.status === 409 || /already booked|Only one lunch/i.test(message))) {
        setIsBookingConfirmOpen(false);
        setIsCapacityOverrideOpen(true);
        return;
      }
      setAlertMessage({
        type: 'danger',
        text: message
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cancel Booking
  const handleCancelBooking = async (booking: Booking) => {
    const bookingId = booking.id;
    if (!bookingId) {
      alert("Error: Booking ID is missing");
      return;
    }
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel the function reservation for ${booking.customerName} on ${booking.bookingDate}?\n\nThis will release this slot.`
    );
    if (!confirmCancel) return;

    if (booking.bookingDate < todayStr) {
      alert("Past date bookings cannot be modified.");
      return;
    }
    try {
      const res: any = await apiClient.patch(`/bookings/${bookingId}/cancel`, { status: 'CANCELLED' });
      if (res.success) {
        setAlertMessage({ 
          type: 'info', 
          text: `Function reservation for ${booking.customerName} on ${booking.bookingDate} has been cancelled successfully.` 
        });
        loadBookings(false, true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel function.');
    }
  };

  // Handle Delete Booking Permanently
  const handleDeleteBooking = async (booking: Booking) => {
    const bookingId = booking.id || booking.bookingNumber;
    if (!bookingId) return;
    setBookingToDelete(booking);
  };

  const confirmDeleteBooking = async () => {
    if (!bookingToDelete) return;
    const booking = bookingToDelete;
    const bookingId = booking.id || booking.bookingNumber;
    if (!bookingId) return;

    try {
      const res: any = await apiClient.delete(`/bookings/${bookingId}`);
      if (res.success) {
        setAlertMessage({
          type: 'success',
          text: `Booking ${booking.bookingNumber || ''} deleted successfully.`
        });
        setBookingToDelete(null);
        loadBookings(false, true);
      }
    } catch (err: any) {
      setAlertMessage({ type: 'danger', text: err.message || 'Failed to delete booking.' });
    }
  };

  const openBookingEditor = (booking: Booking) => {
    setBookingEditor(booking);
    setEditingBookingId(booking.id);
    setFormData(prev => ({ ...prev, bookingDate: booking.bookingDate, timeSlot: booking.timeSlot || prev.timeSlot, bookingTime: booking.bookingTime || prev.bookingTime, customerName: booking.customerName, customerPhone: booking.customerPhone, alternatePhone: booking.alternatePhone || '', guestCount: booking.guestCount, functionType: booking.functionType || prev.functionType, acceptedBy: booking.acceptedBy || prev.acceptedBy, notes: booking.notes || '' }));
    const savedIds = (booking as any).selectedMenuIds as string[] | undefined;
    setActiveItemIds(savedIds?.length ? savedIds : allMenuItems.filter(item => booking.selectedMenu?.includes(item.name)).map(item => item.id));
  };

  const editBookingMenu = () => {
    setReturnToBookingEditor(true);
    setBookingEditor(null);
    setIsMenuModalOpen(true);
  };

  const finishMenuSelection = () => {
    setIsMenuModalOpen(false);
    if (returnToBookingEditor) {
      setReturnToBookingEditor(false);
      if (bookingEditor === null) {
        // The booking details remain in form state; restore the same edit context.
        const current = bookings.find(b => b.id === editingBookingId);
        if (current) setBookingEditor(current);
      }
    }
  };

  const saveBookingEdit = async () => {
    if (!bookingEditor) return;
    try {
      const res: any = await apiClient.put(`/bookings/${bookingEditor.id}`, { ...formData, bookingPeriod: formData.timeSlot.includes('Lunch') ? 'LUNCH' : 'DINNER', selectedMenu: selectedDishes.map(d => d.name), selectedMenuIds: activeItemIds });
      if (res.success) { setBookingEditor(null); setAlertMessage({ type: 'success', text: 'Function booking updated.' }); loadBookings(false, true); }
    } catch (err: any) { setAlertMessage({ type: 'danger', text: err.message || 'Could not update booking.' }); }
  };

  // Handle Purge All Cancelled Bookings
  const handlePurgeCancelled = async () => {
    const cancelledCount = bookings.filter(b => b.status === 'CANCELLED').length;
    if (cancelledCount === 0) return;

    if (!window.confirm(`Are you sure you want to permanently remove all ${cancelledCount} cancelled bookings from the database?`)) {
      return;
    }

    try {
      const res: any = await apiClient.delete('/bookings/purge/cancelled');
      if (res.success) {
        setAlertMessage({
          type: 'success',
          text: `All cancelled bookings removed successfully.`
        });
        loadBookings(false, true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to clear cancelled bookings.');
    }
  };

  // Handle Status Update (e.g. CHECKED_IN, COMPLETED)
  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/bookings/${id}/status`, { status });
      setAlertMessage({ type: 'success', text: `Function status updated to ${status}.` });
      loadBookings(false, true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 1. Function Check-In Handler
  const handleCheckIn = async (b: Booking) => {
    const confirmed = window.confirm(`Check-in ${b.customerName} for Booking #${b.bookingNumber}?`);
    if (!confirmed) return;
    try {
      await apiClient.patch(`/bookings/${b.id}/status`, {
        status: 'CHECKED_IN',
        checkedInAt: new Date().toISOString()
      });
      setAlertMessage({
        type: 'success',
        text: `✓ ${b.customerName} (${b.bookingNumber}) Check-In successful. Function is now active!`
      });
      loadBookings(false, true);
    } catch (err: any) {
      alert(err.message || 'Check-in failed.');
    }
  };

  // 2. Open Check-Out & Bill Generation Modal
  const openCheckOutModal = (b: Booking) => {
    const existingDishes: Array<{ name: string; qty?: number; price?: number; total?: number }> =
      b.billing?.dishes && b.billing.dishes.length > 0
        ? b.billing.dishes.map((d: any) => ({ name: typeof d === 'string' ? d : (d.name || '') }))
        : (b.selectedMenu || []).map(dishName => ({ name: dishName }));

    const initialAdvance = Number(b.billing?.advanceAmount !== undefined ? b.billing.advanceAmount : b.advanceAmount) || 0;
    const initialDishCount = Number(b.billing?.dishCount) || Number(b.guestCount) || 50;
    const initialDishRate = Number(b.billing?.dishRate) || 250;
    const initialTotal = Number(b.billing?.totalAmount) || (initialDishCount * initialDishRate);
    const initialDiscount = Number(b.billing?.discount) || 0;

    setCheckoutState({
      booking: b,
      dishes: existingDishes,
      dishCount: initialDishCount,
      dishRate: initialDishRate,
      totalBillPrice: initialTotal,
      discount: initialDiscount,
      advanceAmount: initialAdvance,
      paymentMode: b.billing?.paymentMode || b.paymentMode || 'Cash',
      paymentReference: b.billing?.paymentReference || b.referenceId || '',
      notes: b.billing?.notes || b.notes || '',
      newDishName: '',
      isCheckingOut: false
    });
    setIsCheckOutModalOpen(true);
  };

  // 3. Add Custom Dish to Checkout
  const handleAddDishToCheckout = () => {
    if (!checkoutState.newDishName.trim()) {
      alert('કૃપા કરીને વાનગી અથવા આઇટમનું નામ દાખલ કરો.');
      return;
    }
    const newDish = { name: checkoutState.newDishName.trim() };
    setCheckoutState(prev => ({
      ...prev,
      dishes: [...prev.dishes, newDish],
      newDishName: ''
    }));
  };

  // 4. Update dish name
  const handleUpdateDish = (idx: number, field: string, value: any) => {
    const updated = [...checkoutState.dishes];
    updated[idx] = { ...updated[idx], [field]: value };
    setCheckoutState(prev => ({
      ...prev,
      dishes: updated
    }));
  };

  // 5. Remove dish
  const handleRemoveDish = (idx: number) => {
    setCheckoutState(prev => ({
      ...prev,
      dishes: prev.dishes.filter((_, i) => i !== idx)
    }));
  };

  // 6. Confirm Check-Out & Generate Bill (Moves status to COMPLETED)
  const handleConfirmCheckOut = async () => {
    if (!checkoutState.booking) return;
    const b = checkoutState.booking;
    const dishCount = Math.max(0, Number(checkoutState.dishCount) || 0);
    const dishRate = Math.max(0, Number(checkoutState.dishRate) || 0);
    const total = Math.max(0, Number(checkoutState.totalBillPrice) || (dishCount * dishRate));
    const discount = Math.max(0, Number(checkoutState.discount) || 0);
    const advance = Math.max(0, Number(checkoutState.advanceAmount) || 0);
    const net = Math.max(0, total - discount - advance);
    const now = new Date().toISOString();
    const billNumber = b.billing?.billNumber || `BILL-${b.bookingNumber}`;

    const billPayload = {
      billNumber,
      dishes: checkoutState.dishes,
      guestCount: dishCount || b.guestCount,
      dishCount,
      dishRate,
      subtotal: total,
      discount,
      totalAmount: total,
      advanceAmount: advance,
      netPayable: net,
      paymentMode: checkoutState.paymentMode,
      paymentReference: checkoutState.paymentReference,
      notes: checkoutState.notes,
      billedAt: now,
      billedBy: user?.username || 'Staff'
    };

    setCheckoutState(prev => ({ ...prev, isCheckingOut: true }));
    try {
      const res: any = await apiClient.post(`/bookings/${b.id}/checkout`, { billing: billPayload });
      const updatedBooking = res.data || {
        ...b,
        status: 'COMPLETED',
        billing: billPayload,
        checkedOutAt: now
      };

      setIsCheckOutModalOpen(false);
      setAlertMessage({
        type: 'success',
        text: `✓ ફંક્શન ${b.bookingNumber} Check Out થઈ ગયું છે અને બિલ ${billNumber} બની ગયું છે!`
      });

      // Automatically open the final bill modal for viewing and printing
      setViewingBillBooking(updatedBooking);
      loadBookings(false, true);

      // Automatically open WhatsApp with complete Tax Invoice Receipt for the customer
      try {
        sendWhatsAppBill(updatedBooking);
      } catch (err) {
        console.warn('Could not auto-open WhatsApp bill:', err);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to check out booking.');
    } finally {
      setCheckoutState(prev => ({ ...prev, isCheckingOut: false }));
    }
  };

  // 7. View Final Bill Modal
  const openBillModal = (b: Booking) => {
    setViewingBillBooking(b);
  };


  // 1-Click Google Calendar Direct Web Link Generator
  const getGoogleCalendarUrl = (booking: Booking): string => {
    const dateClean = (booking.bookingDate || '').replace(/-/g, '');
    const title = `Function: ${booking.customerName} (${booking.functionType || 'Event'})`;
    const details = [
      `Restaurant: Bhatigal Bhanu Traditional Dining & Banquet`,
      `Booking No: ${booking.bookingNumber}`,
      `Host: ${booking.customerName}`,
      `Mobile: ${booking.customerPhone}`,
      booking.alternatePhone ? `Alt Phone: ${booking.alternatePhone}` : '',
      `Guests: ${booking.guestCount} Persons`,
      `Time Slot: ${booking.timeSlot || 'Evening'} (${booking.bookingTime || ''})`,
      `Venue: ${booking.venueArea || 'AC Banquet Hall'}`,
      `Advance Paid: Rs. ${(booking.advanceAmount || 0).toLocaleString('en-IN')}`,
      `Payment Mode: ${booking.paymentMode || 'Cash'}`,
      booking.referenceId ? `Ref ID: ${booking.referenceId}` : '',
      booking.selectedMenu && booking.selectedMenu.length > 0 ? `Catering Menu: ${booking.selectedMenu.join(', ')}` : '',
      booking.notes ? `Instructions: ${booking.notes}` : ''
    ].filter(Boolean).join('\n');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${dateClean}/${dateClean}`,
      details: details,
      location: 'Bhatigal Bhanu Traditional Dining & Banquet Hall'
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // WhatsApp Message Generator & Instant Sender (with direct query reply note)
  const buildWhatsAppConfirmationMessage = (b: Booking): string => {
    const parts = (b.bookingDate || '').split('-');
    let dayName = '';
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      dayName = DAY_NAME_GUJARATI[DAY_NAMES[d.getDay()]] || '';
    }

    const dishesList = b.selectedMenu && b.selectedMenu.length > 0
      ? b.selectedMenu.map((d, i) => `  ${i + 1}. ${d}`).join('\n')
      : '  • નક્કી કરવાનું બાકી';

    return `*🍽️ ભતીગળ ભાનુ - રેસ્ટોરન્ટ અને બેન્ક્વેટ*
*Bhatigal Bhanu Traditional Dining & Banquet*
━━━━━━━━━━━━━━━━━━━━
નમસ્તે *${b.customerName || 'ગ્રાહક'}* જી,
આપનું ફંક્શન બુકિંગ સફળતાપૂર્વક કન્ફર્મ થઈ ગયું છે! 🎉

📋 *બુકિંગ વિગતો (Booking Details):*
• બુકિંગ નંબર: *${b.bookingNumber}*
• તારીખ: *${b.bookingDate}* ${dayName ? `(${dayName})` : ''}
• સમય ગાળો: *${b.timeSlot || 'સાંજે (Dinner)'}* (${b.bookingTime || ''})
• મહેમાનોની સંખ્યા: *${b.guestCount} વ્યક્તિ*
• પ્રસંગનો પ્રકાર: *${b.functionType || 'Family Gathering'}*
• હોલ / જગ્યા: *${b.venueArea || 'Restaurant Banquet'}*
• એડવાન્સ રકમ: *₹${(b.advanceAmount || 0).toLocaleString('en-IN')}* (${b.paymentMode || 'Cash'})
${b.referenceId ? `• ટ્રાન્ઝેક્શન Ref: *${b.referenceId}*\n` : ''}
🍲 *નક્કી કરેલ ભોજન મેનુ:*
${dishesList}
━━━━━━━━━━━━━━━━━━━━
💬 *કોઈપણ પ્રશ્ન હોય અથવા કોઈ ફેરફાર કરવો હોય તો આપ આ જ મેસેજ પર સીધો Reply (જવાબ) આપી શકો છો.*
📞 સંપર્ક: +91 9876543210

ધન્યવાદ!
*ભતીગળ ભાનુ ટીમ*`;
  };

  const sendWhatsAppConfirmation = (b: Booking) => {
    let cleanPhone = (b.customerPhone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    const msg = buildWhatsAppConfirmationMessage(b);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // WhatsApp Bill / Invoice Message Generator & Sender
  const buildWhatsAppBillMessage = (b: Booking, restaurantPhone = '+91 9876543210'): string => {
    const parts = (b.bookingDate || '').split('-');
    let dayName = '';
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      dayName = DAY_NAME_GUJARATI[DAY_NAMES[d.getDay()]] || '';
    }

    const billNumber = b.billing?.billNumber || `BILL-${b.bookingNumber}`;
    const subtotal = b.billing?.subtotal || b.billing?.totalAmount || b.estimatedTotal || 0;
    const discount = b.billing?.discount || 0;
    const totalAmount = b.billing?.totalAmount || b.estimatedTotal || 0;
    const advanceAmount = b.billing?.advanceAmount !== undefined ? b.billing.advanceAmount : (b.advanceAmount || 0);
    const netPayable = b.billing?.netPayable !== undefined ? b.billing.netPayable : Math.max(0, totalAmount - advanceAmount);
    const paymentMode = b.billing?.paymentMode || b.paymentMode || 'Cash';
    const paymentRef = b.billing?.paymentReference || b.referenceId || '';

    // Dishes list
    let dishesText = '';
    if (b.billing?.dishes && b.billing.dishes.length > 0) {
      dishesText = b.billing.dishes.map((d: any, i: number) => `  ${i + 1}. ${typeof d === 'string' ? d : (d.name || d)}`).join('\n');
    } else if (b.selectedMenu && b.selectedMenu.length > 0) {
      dishesText = b.selectedMenu.map((m: string, i: number) => `  ${i + 1}. ${m}`).join('\n');
    }

    const dishCountStr = b.billing?.dishCount || b.guestCount;
    const dishRateStr = b.billing?.dishRate ? `\n• ડિશનો ભાવ (Rate per Dish): *₹${b.billing.dishRate}*` : '';

    return `*🧾 ભતીગળ ભાનુ - રેસ્ટોરન્ટ અને બેન્ક્વેટ*
*Bhatigal Bhanu Traditional Dining & Banquet*
━━━━━━━━━━━━━━━━━━━━
નમસ્તે *${b.customerName || 'ગ્રાહક'}* જી,
આપના ફંક્શનનું બિલિંગ સફળતાપૂર્વક થઈ ગયું છે. ✅

📋 *બિલની વિગતો (Tax Invoice Receipt):*
• બિલ નંબર: *${billNumber}*
• બુકિંગ નંબર: *${b.bookingNumber}*
• તારીખ: *${b.bookingDate}* ${dayName ? `(${dayName})` : ''}
• સમય ગાળો: *${b.timeSlot || 'સાંજે (Dinner)'}* (${b.bookingTime || ''})
• કુલ ડિશ / પ્લેટ: *${dishCountStr}*${dishRateStr}
• મહેમાનોની સંખ્યા: *${b.guestCount} વ્યક્તિ*
${dishesText ? `\n🍲 *પીરસાયેલ ભોજન મેનુ:*\n${dishesText}\n` : ''}
💰 *ચુકવણીની વિગતો (Payment Summary):*
• કુલ બિલ રકમ (Total): *₹${Number(totalAmount).toLocaleString('en-IN')}*
${discount > 0 ? `• ડિસ્કાઉન્ટ (Discount): *₹${Number(discount).toLocaleString('en-IN')}*\n` : ''}• જમા એડવાન્સ (Advance Paid): *₹${Number(advanceAmount).toLocaleString('en-IN')}*
• ચોખ્ખી ચૂકવેલ રકમ (Net Paid): *₹${Number(netPayable).toLocaleString('en-IN')}*
• ચુકવણીનો પ્રકાર (Mode): *${paymentMode}* ${paymentRef ? `(Ref: ${paymentRef})` : ''}
• પેમેન્ટ સ્ટેટસ: *સંપૂર્ણ ચૂકતે (PAID & COMPLETED)* ✅
━━━━━━━━━━━━━━━━━━━━
🙏 *ભતીગળ ભાનુમાં પધારવા બદલ આપનો ખૂબ ખૂબ આભાર!*
આશા છે કે આપને અમારું કાઠિયાવાડી ભોજન અને સેવા પસંદ આવ્યા હશે. ફરી પધારશો.

💬 *જો આપને બિલ બાબતે કોઈ પ્રશ્ન કે ક્વેરી હોય, તો આપ આ જ મેસેજ પર સીધો Reply (જવાબ) આપી શકો છો.*
📞 સંપર્ક: ${restaurantPhone}

ધન્યવાદ!
*ભતીગળ ભાનુ ટીમ*`;
  };

  const sendWhatsAppBill = (b: Booking) => {
    let cleanPhone = (b.customerPhone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    const msg = buildWhatsAppBillMessage(b);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleWhatsAppShare = (b: Booking) => {
    if (b.status === 'COMPLETED' || b.status === 'CHECKED_OUT' || b.billing) {
      sendWhatsAppBill(b);
    } else {
      sendWhatsAppConfirmation(b);
    }
  };

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const jumpToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayStr);
  };

  // Generate calendar days for current month supporting MULTIPLE BOOKINGS PER DAY
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is SUN
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isPast: boolean;
      bookings: Booking[];
      booking?: Booking;
      allDayBookings?: Booking[];
      activeBookings?: Booking[];
      completedBookings?: Booking[];
      isLocked?: boolean;
      hasCompleted?: boolean;
    }> = [];

    // Empty padding days before day 1
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({
        dayNumber: 0,
        dateStr: '',
        isCurrentMonth: false,
        isToday: false,
        isPast: false,
        bookings: []
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const allDayBookings = bookings.filter(b => b.bookingDate === dateStr && b.status !== 'CANCELLED');
      const activeBookings = allDayBookings.filter(b => isDateLocking(b));
      const completedBookings = allDayBookings.filter(b => b.status === 'COMPLETED' || b.status === 'CHECKED_OUT');

      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;

      days.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        isToday,
        isPast,
        bookings: activeBookings,
        booking: activeBookings[0] || completedBookings[0] || allDayBookings[0],
        allDayBookings,
        activeBookings,
        completedBookings,
        isLocked: activeBookings.length > 0,
        hasCompleted: completedBookings.length > 0
      });
    }

    return days;
  }, [year, month, bookings, todayStr]);

  // Filtered bookings for registry table (supports specific date filtering)
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesDate = !selectedDateFilter || b.bookingDate === selectedDateFilter;
      const matchesSearch = 
        b.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customerPhone?.includes(searchTerm) ||
        b.bookingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.bookingDate?.includes(searchTerm);

      const matchesStatus = selectedDateFilter
        ? (statusFilter === 'ALL' || statusFilter === 'ACTIVE' ? true : b.status === statusFilter)
        : (statusFilter === 'ALL'
            ? true
            : statusFilter === 'ACTIVE'
              ? (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN' || b.status === 'PENDING')
              : statusFilter === 'COMPLETED'
                ? (b.status === 'COMPLETED' || b.status === 'CHECKED_OUT')
                : b.status === statusFilter);
      const matchesVenue = venueFilter === 'ALL' || b.venueArea === venueFilter;
      return matchesDate && matchesSearch && matchesStatus && matchesVenue;
    });
  }, [bookings, searchTerm, statusFilter, venueFilter, selectedDateFilter]);

  return (
    <div className="d-flex flex-column gap-3 pb-5">
      {/* 1. TOP HEADER BAR WITH LIVE REAL-TIME CLOCK & CALENDAR EXPORT */}
      <div className="card border bg-white shadow-sm" style={{ borderRadius: '12px', borderColor: '#e2e8f0' }}>
        <div className="card-body p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          {/* Title & Subtitle */}
          <div className="d-flex align-items-center gap-2.5">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary flex-shrink-0"
              style={{ width: 42, height: 42 }}
            >
              <CalendarIcon size={20} />
            </div>
            <div>
              <h5 className="fw-bold text-dark mb-0">Function Booking & Calendar</h5>
              <span className="text-secondary small">ફંક્શન બુકિંગ અને કેલેન્ડર વ્યવસ્થાપન</span>
            </div>
          </div>

          {/* Real-time Digital Clock & Export */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div
              className="d-flex align-items-center gap-2 px-3 py-1.5 rounded-pill bg-light border shadow-xs"
              title="Real-time Indian Standard Time (IST)"
            >
              <CalendarIcon size={14} className="text-primary" />
              <span className="fw-semibold text-dark small">{currentDateFormatted || 'Loading Date...'}</span>
              <span className="text-muted">|</span>
              <Clock size={14} className="text-primary" />
              <span className="fw-bold text-primary font-monospace small">{currentTime || '00:00:00'}</span>
            </div>

            <a
              href="/api/calendar/export.ics"
              download="bhatigal_bhanu_functions.ics"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 shadow-xs px-3 py-1.5"
              title="Export all restaurant functions to your mobile or desktop calendar"
            >
              <Download size={14} />
              <span className="d-none d-sm-inline">Export iCal (.ics)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div 
          className={`alert alert-${alertMessage.type} alert-dismissible fade show d-flex align-items-center justify-content-between py-2 px-3 shadow-sm mb-0`}
          role="alert"
        >
          <div className="d-flex align-items-center gap-2 small fw-semibold">
            {alertMessage.type === 'success' && <CheckCircle2 size={16} className="text-success flex-shrink-0" />}
            {alertMessage.type === 'danger' && <AlertCircle size={16} className="text-danger flex-shrink-0" />}
            {alertMessage.type === 'info' && <CalendarPlus size={16} className="text-info flex-shrink-0" />}
            <span>{alertMessage.text}</span>
          </div>
          <button 
            type="button" 
            className="btn-close p-2" 
            onClick={() => setAlertMessage(null)}
            aria-label="Close"
          />
        </div>
      )}

      {/* Mobile Tab Switcher: Toggle between Calendar & Booking Form */}
      <div className="d-lg-none bg-white p-1.5 rounded-3 border mb-1 d-flex gap-1 shadow-xs">
        <button
          type="button"
          onClick={() => setMobileViewTab('calendar')}
          className={`btn btn-sm flex-fill fw-bold py-2 rounded-2 d-flex align-items-center justify-content-center gap-1.5 transition-all ${
            mobileViewTab === 'calendar' ? 'btn-primary shadow-xs' : 'btn-light text-secondary'
          }`}
        >
          <CalendarIcon size={16} />
          <span>📅 કેલેન્ડર (Calendar)</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileViewTab('form')}
          className={`btn btn-sm flex-fill fw-bold py-2 rounded-2 d-flex align-items-center justify-content-center gap-1.5 transition-all ${
            mobileViewTab === 'form' ? 'btn-primary shadow-xs' : 'btn-light text-secondary'
          }`}
        >
          <CalendarPlus size={16} />
          <span>➕ નવું બુકિંગ (Book)</span>
        </button>
      </div>

      {/* 2. MAIN SPLIT: FUNCTION BOOKING FORM (LEFT) & REAL CALENDAR (RIGHT) */}
      <div className="row g-3">
        {/* LEFT CARD: FUNCTION BOOKING FORM */}
        <div className={`col-12 col-lg-5 ${mobileViewTab === 'calendar' ? 'd-none d-lg-block' : 'd-block'}`}>
          <div 
            className="card h-100 shadow-sm border bg-white" 
            style={{ 
              borderRadius: '12px',
              borderColor: '#e2e8f0'
            }}
          >
            {/* Header: Clean Card Header */}
            <div 
              className="card-header py-3 px-3 px-sm-4 bg-white border-bottom d-flex justify-content-between align-items-center"
              style={{
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px',
                borderColor: '#e2e8f0'
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <CalendarPlus size={18} className="text-primary" />
                <h6 className="fw-bold mb-0 text-dark">Book Function (ફંક્શન બુકિંગ)</h6>
              </div>
              <span className="badge bg-primary-subtle text-primary fw-bold" style={{ fontSize: '0.75rem' }}>
                {DAY_NAME_GUJARATI[bookingDayName]?.split(' ')[0] || 'તારીખ'}
              </span>
            </div>

            <div className="card-body p-3 p-sm-4">
              {/* Existing Bookings for this Selected Date Banner */}
              {selectedDateBookings.length > 0 && (
                <div className="alert alert-warning border shadow-sm p-2.5 rounded-3 mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <strong className="small text-dark">
                      📅 આ તારીખે {selectedDateBookings.length} ફંક્શન નોંધાયેલ છે:
                    </strong>
                    <span className="badge bg-danger text-white">{selectedDate}</span>
                  </div>
                  <div className="d-flex flex-column gap-2 mt-1">
                    {selectedDateBookings.map((b, i) => (
                      <div key={i} className="p-2 rounded bg-white border small d-flex flex-column gap-1.5 shadow-xs">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className={`badge me-1 ${b.timeSlot?.includes('બપોરે') ? 'bg-warning text-dark' : 'bg-primary text-white'}`}>
                              {b.timeSlot || 'Evening'}
                            </span>
                            <strong>{b.customerName}</strong> ({b.guestCount} મહેમાન) • {b.bookingTime || ''}
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                            style={{ fontSize: '0.72rem' }}
                            onClick={() => setSelectedBookingForSlip(b)}
                          >
                            સ્લિપ જુઓ
                          </button>
                        </div>

                        {/* Display Booked Dishes */}
                        {b.selectedMenu && b.selectedMenu.length > 0 ? (
                          <div className="pt-1.5 border-top">
                            <span className="text-secondary fw-bold d-block mb-1" style={{ fontSize: '0.7rem' }}>
                              🍽️ પસંદ કરેલ ભોજન મેનુ ({b.selectedMenu.length} વાનગીઓ):
                            </span>
                            <div className="d-flex flex-wrap gap-1">
                              {b.selectedMenu.map((dish, dIdx) => (
                                <span key={dIdx} className="badge bg-light text-dark border" style={{ fontSize: '0.7rem' }}>
                                  {dish}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="pt-1 border-top text-muted small fst-italic" style={{ fontSize: '0.7rem' }}>
                            કોઈ મેનુ નક્કી કરેલ નથી
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleBookFunction} className="d-flex flex-column gap-3">
                {/* 1. Date Picker */}
                <div>
                  <label className="form-label small fw-semibold text-secondary mb-1 d-flex align-items-center gap-1">
                    <CalendarIcon size={12} /> Booking Date (તારીખ) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    className="form-control form-control-sm border rounded-3 p-2 fw-semibold"
                    required
                    value={formData.bookingDate}
                    onChange={e => {
                      if (e.target.value < todayStr) {
                        setAlertMessage({
                          type: 'danger',
                          text: 'Cannot select a past date. Please pick today or a future date.'
                        });
                        return;
                      }
                      setFormData({ ...formData, bookingDate: e.target.value });
                      setSelectedDate(e.target.value);
                    }}
                    style={{ fontSize: '0.9rem' }}
                  />
                  <small className="text-muted">
                    વાર: <strong className="text-primary">{DAY_NAME_GUJARATI[bookingDayName]?.split(' ')[0] || bookingDayName}</strong>
                  </small>
                </div>

                {/* 2. TIME SLOT: STRICTLY 2 OPTIONS (બપોરે / સાંજે) + MANUAL TIME SELECT */}
                <div className="p-2.5 rounded-3 bg-light border">
                  <label className="form-label small fw-bold text-dark mb-1 d-flex align-items-center gap-1">
                    <Clock size={13} className="text-primary" /> Time Slot (સમય ગાળો) <span className="text-danger">*</span>
                  </label>
                  
                  {/* Exactly 2 Time Slot Buttons: બપોરે (Lunch) / સાંજે (Dinner) */}
                  <div className="btn-group w-100 mb-2 shadow-xs" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm py-2 fw-bold d-flex align-items-center justify-content-center gap-1 ${
                        formData.timeSlot === 'બપોરે (Lunch)'
                          ? 'btn-warning text-dark border-warning shadow-sm'
                          : 'btn-outline-secondary bg-white'
                      }`}
                      onClick={() => setFormData({
                        ...formData,
                        timeSlot: 'બપોરે (Lunch)',
                        bookingTime: formData.bookingTime?.includes('08:') || formData.bookingTime?.includes('07:') ? '01:00 PM' : (formData.bookingTime || '01:00 PM')
                      })}
                    >
                      <span>☀️ બપોરે (Lunch)</span>
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm py-2 fw-bold d-flex align-items-center justify-content-center gap-1 ${
                        formData.timeSlot === 'સાંજે (Dinner)'
                          ? 'btn-primary text-white border-primary shadow-sm'
                          : 'btn-outline-secondary bg-white'
                      }`}
                      onClick={() => setFormData({
                        ...formData,
                        timeSlot: 'સાંજે (Dinner)',
                        bookingTime: formData.bookingTime?.includes('01:') || formData.bookingTime?.includes('12:') ? '08:00 PM' : (formData.bookingTime || '08:00 PM')
                      })}
                    >
                      <span>🌙 સાંજે (Dinner)</span>
                    </button>
                  </div>

                  {/* Manual Time Selection Field */}
                  <div className="row g-2 align-items-center">
                    <div className="col-7">
                      <label className="small text-secondary mb-0 fw-semibold" style={{ fontSize: '0.75rem' }}>
                        ચોક્કસ સમય (Exact Time):
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm border rounded-2 p-1.5 fw-bold text-dark font-monospace"
                        placeholder={formData.timeSlot.includes('બપોરે') ? '01:00 PM' : '08:00 PM'}
                        required
                        value={formData.bookingTime}
                        onChange={e => setFormData({ ...formData, bookingTime: e.target.value })}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="col-5">
                      <label className="small text-secondary mb-0" style={{ fontSize: '0.75rem' }}>
                        Presets:
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={formData.bookingTime}
                        onChange={e => setFormData({ ...formData, bookingTime: e.target.value })}
                        style={{ fontSize: '0.78rem' }}
                      >
                        {formData.timeSlot.includes('બપોરે') ? (
                          <>
                            <option value="11:30 AM">11:30 AM</option>
                            <option value="12:00 PM">12:00 PM</option>
                            <option value="12:30 PM">12:30 PM</option>
                            <option value="01:00 PM">01:00 PM (Standard)</option>
                            <option value="01:30 PM">01:30 PM</option>
                            <option value="02:00 PM">02:00 PM</option>
                            <option value="02:30 PM">02:30 PM</option>
                          </>
                        ) : (
                          <>
                            <option value="07:00 PM">07:00 PM</option>
                            <option value="07:30 PM">07:30 PM</option>
                            <option value="08:00 PM">08:00 PM (Standard)</option>
                            <option value="08:30 PM">08:30 PM</option>
                            <option value="09:00 PM">09:00 PM</option>
                            <option value="09:30 PM">09:30 PM</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. FUNCTION CATERING MENU */}
                <div className="p-3 rounded-3 border bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center gap-1.5">
                      <Utensils size={16} className="text-warning" />
                      <span className="fw-bold text-dark small">
                        Function Menu (ભોજન મેનુ)
                      </span>
                    </div>
                    {selectedDishes.length > 0 && (
                      <span className="badge bg-primary rounded-pill px-2 py-0.5" style={{ fontSize: '0.75rem' }}>
                        {selectedDishes.length} વાનગીઓ
                      </span>
                    )}
                  </div>

                  {/* Main Action: Open Dual-Panel Menu Builder */}
                  <button
                    type="button"
                    onClick={() => setIsMenuModalOpen(true)}
                    className="btn btn-warning w-100 py-2 fw-bold text-dark shadow-sm d-flex align-items-center justify-content-center gap-2"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <Utensils size={15} />
                    <span>{selectedDishes.length > 0 ? 'Edit Menu (મેનુ બદલો)' : 'Select Menu (મેનુ પસંદ કરો)'}</span>
                  </button>

                  {selectedDishes.length > 0 && (
                    <div className="d-flex gap-2 mt-2">
                      <button type="button" className="btn btn-outline-primary btn-sm flex-grow-1" onClick={generateFunctionMenuPoster} disabled={menuPosterLoading}>
                        <Eye size={14} className="me-1" /> {menuPosterLoading ? 'Creating card…' : 'Preview Menu Card'}
                      </button>
                      {menuPosterUrl && <button type="button" className="btn btn-outline-success btn-sm" onClick={downloadFunctionMenuPoster}><Download size={14} className="me-1" />Download</button>}
                    </div>
                  )}
                  {menuPosterUrl && <div className="mt-2 text-center border rounded-3 p-2 bg-white"><img src={menuPosterUrl} alt="Function menu card" className="img-fluid rounded" style={{ maxHeight: 360 }} /></div>}

                  {/* Selected Dishes Summary Preview */}
                  {selectedDishes.length > 0 && (
                    <div className="p-2 bg-white rounded border mt-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-muted small" style={{ fontSize: '0.7rem' }}>
                          પસંદ કરેલ વાનગીઓ ({selectedDishes.length}):
                        </span>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-danger text-decoration-none"
                          style={{ fontSize: '0.7rem' }}
                          onClick={handleClearSelection}
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="d-flex flex-wrap gap-1" style={{ maxHeight: 110, overflowY: 'auto' }}>
                        {selectedDishes.map(dish => (
                          <span 
                            key={dish.id} 
                            className="badge bg-primary-subtle text-primary border border-primary-subtle d-inline-flex align-items-center gap-1 py-1 px-1.5"
                            style={{ fontSize: '0.72rem', fontWeight: 600 }}
                          >
                            <span>{dish.name}</span>
                            <X 
                              size={12} 
                              className="cursor-pointer text-danger" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleToggleItem(dish.id)}
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Guests Expected */}
                <div>
                  <label className="form-label small fw-semibold text-secondary mb-1 d-flex align-items-center gap-1">
                    <Users size={12} className="text-primary" /> મહેમાનો (Guests Count) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control form-control-sm border rounded-3 p-2 fw-semibold"
                    placeholder="50"
                    required
                    value={formData.guestCount}
                    onChange={e => setFormData({ ...formData, guestCount: Number(e.target.value) })}
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>

                {/* 5. Client Name & Mobile Phone */}
                <div className="row g-2">
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-secondary mb-1">
                      યજમાન નામ (Host Name) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm border rounded-3 p-2"
                      placeholder="Enter Host Name"
                      required
                      value={formData.customerName}
                      onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                      style={{ fontSize: '0.9rem' }}
                    />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-secondary mb-1">
                      મોબાઈલ નંબર (Mobile) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-light text-muted border-end-0" style={{ fontSize: '0.8rem' }}>
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        className="form-control form-control-sm border border-start-0 rounded-end-3 p-2"
                        placeholder="9876543210"
                        required
                        value={formData.customerPhone}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData({ ...formData, customerPhone: val });
                        }}
                        style={{ fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 8. Function Type & Manager */}
                <div className="row g-2">
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-secondary mb-1">
                      પ્રસંગ પ્રકાર (Function Type)
                    </label>
                    <select
                      className="form-select form-select-sm border rounded-3 p-2"
                      value={formData.functionType}
                      onChange={e => setFormData({ ...formData, functionType: e.target.value })}
                      style={{ fontSize: '0.85rem' }}
                    >
                      {functionTypesList.map((type, i) => (
                        <option key={i} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-secondary mb-1">
                      મેનેજર (Manager)
                    </label>
                    <select
                      className="form-select form-select-sm border rounded-3 p-2"
                      value={formData.acceptedBy}
                      onChange={e => setFormData({ ...formData, acceptedBy: e.target.value })}
                      style={{ fontSize: '0.85rem' }}
                    >
                      {staffList.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 9. Notes / Instructions */}
                <div>
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    વિશેષ નોંધ (Special Instructions)
                  </label>
                  <textarea
                    rows={2}
                    className="form-control form-control-sm border rounded-3 p-2"
                    placeholder="Special instructions or notes..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary w-100 py-2.5 text-white fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2 rounded-3"
                    style={{ fontSize: '0.95rem' }}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" />
                        <span>બુકિંગ નોંધાઈ રહ્યું છે...</span>
                      </>
                    ) : (
                      <>
                        <CalendarPlus size={16} />
                        <span>Confirm Function Booking (ફંક્શન બુક કરો)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: INTERACTIVE CALENDAR VIEW */}
        <div className={`col-12 col-lg-7 ${mobileViewTab === 'form' ? 'd-none d-lg-block' : 'd-block'}`}>
          <div 
            className="card h-100 shadow-sm border bg-white" 
            style={{ 
              borderRadius: '12px',
              borderColor: '#e2e8f0'
            }}
          >
            <div className="card-body p-4 d-flex flex-column">
              {/* Calendar Header: Month Navigator & Legend */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                {/* Month Navigator */}
                <div className="d-flex align-items-center gap-3">
                  <button 
                    onClick={prevMonth}
                    className="btn btn-sm btn-link text-dark p-1 rounded-circle"
                    title="Previous Month"
                    type="button"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h5 
                    className="fw-bold mb-0 text-capitalize text-dark"
                    style={{ fontSize: '1.2rem', minWidth: '160px' }}
                  >
                    {monthNames[month]} {year}
                  </h5>
                  <button 
                    onClick={nextMonth}
                    className="btn btn-sm btn-link text-dark p-1 rounded-circle"
                    title="Next Month"
                    type="button"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                {/* Status Legend */}
                <div className="d-flex align-items-center gap-3 small fw-semibold">
                  <div className="d-flex align-items-center gap-1">
                    <span 
                      className="d-inline-block rounded-circle" 
                      style={{ width: 9, height: 9, border: '2px solid #198754' }} 
                    />
                    <span style={{ color: '#198754', fontSize: '0.85rem' }}>Open</span>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <span 
                      className="d-inline-block rounded-circle" 
                      style={{ width: 9, height: 9, border: '2px solid #DC3545' }} 
                    />
                    <span style={{ color: '#DC3545', fontSize: '0.85rem' }}>Locked</span>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <span 
                      className="d-inline-block rounded-circle" 
                      style={{ width: 9, height: 9, backgroundColor: '#198754' }} 
                    />
                    <span style={{ color: '#198754', fontSize: '0.85rem' }}>Completed</span>
                  </div>
                </div>
              </div>

              {/* Day-of-week headers */}
              <div className="d-grid text-center mb-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                  <div 
                    key={d} 
                    className="fw-bold small py-1"
                    style={{ color: '#64748b', fontSize: '0.75rem', letterSpacing: '0.05em' }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid - Compact, Fixed Row Heights, No Stretching */}
              <div 
                className="d-grid" 
                style={{ 
                  gridTemplateColumns: 'repeat(7, 1fr)', 
                  gridAutoRows: 'minmax(56px, 62px)',
                  gap: '6px'
                }}
              >
                {calendarDays.map((item, idx) => {
                  if (!item.isCurrentMonth) {
                    return (
                      <div 
                        key={`empty-${idx}`} 
                        className="rounded-3" 
                        style={{ backgroundColor: 'transparent' }} 
                      />
                    );
                  }

                  const dayBookings = item.bookings || [];
                  const allOnDate = (item as any).allDayBookings || [];
                  const activeOnDate = (item as any).activeBookings || [];
                  const completedOnDate = (item as any).completedBookings || [];
                  const isLocked = activeOnDate.length > 0;
                  const hasCompleted = completedOnDate.length > 0;
                  const isSelected = item.dateStr === selectedDate;

                  return (
                    <div
                      key={item.dateStr}
                      onClick={() => {
                        setSelectedDate(item.dateStr);
                        setFormData(prev => ({ ...prev, bookingDate: item.dateStr }));

                        if (allOnDate.length > 0) {
                          // Has functions on this date -> open Day History Modal and filter table below
                          setViewingDayHistory({ date: item.dateStr, bookings: allOnDate });
                          setSelectedDateFilter(item.dateStr);
                        } else {
                          if (item.isPast) {
                            setAlertMessage({
                              type: 'info',
                              text: `તારીખ ${item.dateStr} ના રોજ કોઈ ફંક્શન થયેલ નહોતું (No functions on this past date).`
                            });
                          } else {
                            setSelectedDateFilter(null);
                          }
                        }
                      }}
                      className="p-1.5 rounded-3 d-flex flex-column justify-content-between position-relative"
                      style={{
                        cursor: item.isPast && allOnDate.length === 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease-in-out',
                        height: '60px',
                        backgroundColor: isLocked 
                          ? '#FFF5F5' 
                          : hasCompleted
                            ? '#F2F9F5'
                            : item.isPast 
                              ? '#F8F9FA' 
                                : isSelected 
                                ? '#eff6ff' 
                                : '#FAFAFA',
                        opacity: item.isPast && allOnDate.length === 0 ? 0.45 : 1,
                        border: item.isToday 
                          ? '2px solid #2563eb' 
                          : isLocked
                            ? '1px solid #fecaca'
                            : hasCompleted
                              ? '1px solid #bbf7d0'
                              : isSelected 
                                ? '2px solid #2563eb' 
                                : '1px solid #e2e8f0',
                        boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.15)' : 'none'
                      }}
                      title={
                        allOnDate.length > 0
                          ? `તારીખ ${item.dateStr} (${allOnDate.length} ફંક્શન):\n` +
                            allOnDate.map(b => `• [${b.status}] ${b.customerName} (${b.timeSlot || ''} ${b.bookingTime || ''}, ${b.guestCount} મહેમાન) - ${b.status === 'COMPLETED' ? `Bill: ₹${b.billing?.totalAmount || 0}` : `Advance: ₹${b.advanceAmount || 0}`}`).join('\n') +
                            '\n\n(ક્લિક કરીને તારીખના બધા ફંક્શનની વિગત જુઓ)'
                          : item.isPast 
                            ? `Date: ${item.dateStr} (કોઈ ફંક્શન નહોતું)`
                            : `Date: ${item.dateStr} (Click to select & book)`
                      }
                    >
                      {/* Day Number and Today Badge */}
                      <div className="d-flex justify-content-between align-items-center">
                        <span 
                          className="fw-bold" 
                          style={{ 
                            fontSize: '0.8rem',
                            color: item.isToday 
                              ? '#2563eb' 
                              : item.isPast 
                                ? '#94a3b8' 
                                : '#1e293b'
                          }}
                        >
                          {item.dayNumber}
                        </span>
                        {item.isToday && (
                          <span 
                            className="badge text-white px-1 py-0 rounded bg-primary"
                            style={{ 
                              fontSize: '0.55rem', 
                              letterSpacing: '0.04em' 
                            }}
                          >
                            TODAY
                          </span>
                        )}
                      </div>

                      {/* Status indicator / Text */}
                      <div className="mt-0.5">
                        {isLocked ? (
                          <div className="d-flex flex-column align-items-start" style={{ lineHeight: 1.1 }}>
                            <span 
                              className="fw-bold text-danger d-none d-sm-inline" 
                              style={{ fontSize: '0.68rem' }}
                            >
                              🔒 {activeOnDate.length} Booked
                            </span>
                            <span 
                              className="d-sm-none p-1 rounded-circle bg-danger d-inline-block" 
                              style={{ width: 6, height: 6 }} 
                              title={`Locked (${activeOnDate.length})`}
                            />
                            <span 
                              className="text-truncate small text-secondary d-none d-md-block" 
                              style={{ fontSize: '0.62rem', maxWidth: '65px' }}
                            >
                              {activeOnDate[0]?.customerName}
                            </span>
                          </div>
                        ) : hasCompleted ? (
                          <div className="d-flex flex-column align-items-start" style={{ lineHeight: 1.1 }}>
                            <span 
                              className="fw-bold text-success d-none d-sm-inline" 
                              style={{ fontSize: '0.68rem' }}
                            >
                              ✓ {completedOnDate.length} Done
                            </span>
                            <span 
                              className="d-sm-none p-1 rounded-circle bg-success d-inline-block" 
                              style={{ width: 6, height: 6 }} 
                              title={`Completed (${completedOnDate.length})`}
                            />
                            <span 
                              className="text-truncate small text-secondary d-none d-md-block" 
                              style={{ fontSize: '0.62rem', maxWidth: '65px' }}
                            >
                              {completedOnDate[0]?.customerName}
                            </span>
                          </div>
                        ) : item.isPast ? (
                          <span 
                            className="fw-medium text-muted" 
                            style={{ fontSize: '0.72rem' }}
                          >
                            —
                          </span>
                        ) : (
                          <div className="d-flex align-items-center gap-1">
                            <span 
                              className="d-inline-block rounded-circle bg-success" 
                              style={{ width: 5, height: 5 }} 
                            />
                            <span 
                              className="fw-semibold text-success d-none d-sm-inline" 
                              style={{ fontSize: '0.68rem' }}
                            >
                              Open
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Date Summary & Bookings Panel (Below the Calendar Grid) */}
              <div className="mt-3 p-3 rounded-3 border bg-light" style={{ borderColor: '#e2e8f0' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="small text-muted d-block" style={{ fontSize: '0.75rem' }}>Selected Calendar Date (પસંદ કરેલ તારીખ)</span>
                    <h6 className="fw-bold mb-0 text-dark">
                      📅 {selectedDate} ({DAY_NAME_GUJARATI[bookingDayName] || bookingDayName})
                    </h6>
                  </div>
                  <span className={`badge ${selectedDateBookings.length > 0 ? 'bg-danger text-white' : 'bg-success text-white'} px-2.5 py-1 fw-bold`} style={{ fontSize: '0.75rem' }}>
                    {selectedDateBookings.length > 0 ? `🔒 ${selectedDateBookings.length} ફંક્શન બુક છે` : '🟢 નવું બુકિંગ ઉપલબ્ધ'}
                  </span>
                </div>

                {selectedDateBookings.length > 0 ? (
                  <div className="d-flex flex-column gap-2 mt-2.5 pt-2 border-top">
                    {selectedDateBookings.map((b, bIdx) => (
                      <div key={b.id || bIdx} className="bg-white p-2.5 rounded-3 border shadow-xs d-flex flex-column gap-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className={`badge px-2 py-0.5 ${b.timeSlot?.includes('બપોરે') ? 'bg-warning text-dark' : 'bg-primary text-white'}`} style={{ fontSize: '0.72rem' }}>
                              {b.timeSlot || 'Evening'}
                            </span>
                            <span className="fw-bold text-dark small">{b.customerName}</span>
                            <span className="text-muted small">({b.guestCount} મહેમાન • {b.bookingTime || ''})</span>
                            <span className={`badge ${
                              b.status === 'CONFIRMED' ? 'bg-warning-subtle text-dark border border-warning-subtle' :
                              b.status === 'CHECKED_IN' ? 'bg-info-subtle text-info border border-info-subtle' :
                              b.status === 'COMPLETED' || b.status === 'CHECKED_OUT' ? 'bg-success-subtle text-success border border-success-subtle' :
                              'bg-danger-subtle text-danger border border-danger-subtle'
                            }`} style={{ fontSize: '0.68rem' }}>
                              {b.status === 'CHECKED_OUT' ? 'COMPLETED' : b.status}
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-1">
                            {/* View Menu Button */}
                            <button
                              type="button"
                              onClick={() => setViewingLockedMenuBooking(b)}
                              className="btn btn-sm btn-outline-warning py-0.5 px-2 flex-shrink-0 d-flex align-items-center gap-1 fw-semibold text-dark shadow-xs"
                              style={{ fontSize: '0.72rem' }}
                              title="નક્કી કરેલ ભોજન મેનુ જુઓ"
                            >
                              <Utensils size={12} className="text-warning" />
                              <span>મેનુ જુઓ</span>
                            </button>

                            {/* Check In Action */}
                            {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
                              <button
                                type="button"
                                onClick={() => handleCheckIn(b)}
                                className="btn btn-sm btn-outline-success py-0.5 px-2 flex-shrink-0 d-flex align-items-center gap-1 fw-bold shadow-xs"
                                style={{ fontSize: '0.72rem' }}
                                title="Check In guests"
                              >
                                <LogIn size={12} />
                                <span>Check In</span>
                              </button>
                            )}

                            {/* Check Out Action */}
                            {b.status === 'CHECKED_IN' && (
                              <button
                                type="button"
                                onClick={() => openCheckOutModal(b)}
                                className="btn btn-sm btn-primary py-0.5 px-2 flex-shrink-0 d-flex align-items-center gap-1 fw-bold shadow-sm"
                                style={{ fontSize: '0.72rem' }}
                                title="Check Out & Bill"
                              >
                                <LogOut size={12} />
                                <span>Check Out</span>
                              </button>
                            )}

                            {/* Bill Action */}
                            {(b.status === 'COMPLETED' || b.status === 'CHECKED_OUT') && (
                              <button
                                type="button"
                                onClick={() => openBillModal(b)}
                                className="btn btn-sm btn-outline-dark py-0.5 px-2 flex-shrink-0 d-flex align-items-center gap-1 fw-bold shadow-xs"
                                style={{ fontSize: '0.72rem' }}
                                title="View & Print Bill"
                              >
                                <Receipt size={12} />
                                <span>Bill</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Selected Food Menu (વાનગીઓનું લિસ્ટ) */}
                        {b.selectedMenu && b.selectedMenu.length > 0 ? (
                          <div className="p-2 rounded-2 bg-light border">
                            <div className="d-flex align-items-center justify-content-between mb-1.5 pb-1 border-bottom">
                              <span className="small fw-bold text-dark d-flex align-items-center gap-1.5" style={{ fontSize: '0.74rem' }}>
                                <Utensils size={12} className="text-warning" />
                                <span>નક્કી કરેલ ભોજન મેનુ (Catering Menu):</span>
                              </span>
                              <span className="badge bg-secondary text-white px-2 py-0.5" style={{ fontSize: '0.68rem' }}>
                                {b.selectedMenu.length} વાનગીઓ
                              </span>
                            </div>
                            <div className="d-flex flex-wrap gap-1">
                              {b.selectedMenu.map((dishName, dIdx) => (
                                <span
                                  key={dIdx}
                                  className="badge bg-white text-dark border shadow-xs d-inline-flex align-items-center py-1 px-2 rounded-2"
                                  style={{ fontSize: '0.73rem', fontWeight: 500 }}
                                >
                                  <span className="text-warning me-1">✦</span>
                                  {dishName}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="small text-muted fst-italic px-1" style={{ fontSize: '0.72rem' }}>
                            આ ફંક્શન માટે હજુ કોઈ ભોજન મેનુ નક્કી કરેલ નથી.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FUNCTION REGISTRY TABLE (SHOWS ALL UPCOMING & PAST FUNCTIONS) */}
      <div className="card shadow-sm border bg-white" style={{ borderRadius: '12px', borderColor: '#e2e8f0' }}>
        <div className="card-header bg-white p-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h6 className="fw-bold mb-0 text-dark">Function Bookings Registry ({filteredBookings.length})</h6>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="input-group input-group-sm flex-fill" style={{ minWidth: 180, maxWidth: 300 }}>
              <span className="input-group-text bg-light border-end-0">
                <Search size={13} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search host, phone, date..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <select
              className="form-select form-select-sm flex-fill"
              style={{ minWidth: 160 }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ACTIVE">Active (સક્રિય બુકિંગ)</option>
              <option value="COMPLETED">Completed (પૂર્ણ થયેલા / Billed)</option>
              <option value="ALL">All Status (બધા બુકિંગ)</option>
              <option value="CONFIRMED">Confirmed Only</option>
              <option value="CHECKED_IN">Checked In Only</option>
              <option value="CANCELLED">Cancelled (રદ થયેલા)</option>
            </select>

            {/* Specific Date Filter */}
            <div className="d-flex align-items-center gap-1">
              <span className="small text-muted fw-semibold d-none d-lg-inline" style={{ fontSize: '0.78rem' }}>
                તારીખ:
              </span>
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: 140 }}
                value={selectedDateFilter || ''}
                onChange={e => setSelectedDateFilter(e.target.value || null)}
                title="Filter functions by specific date (કોઈ ચોક્કસ તારીખના ફંક્શન જુઓ)"
              />
              {selectedDateFilter && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm p-1"
                  onClick={() => setSelectedDateFilter(null)}
                  title="Clear date filter (બધી તારીખો જુઓ)"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Purge Button for Cancelled Bookings */}
            {bookings.some(b => b.status === 'CANCELLED') && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 shadow-xs"
                onClick={handlePurgeCancelled}
                title="Permanently remove all cancelled bookings"
              >
                <Trash2 size={13} />
                <span>Clear Cancelled ({bookings.filter(b => b.status === 'CANCELLED').length})</span>
              </button>
            )}
          </div>
        </div>

        <div className="card-body p-0">
          {/* Active Date Filter Banner */}
          {selectedDateFilter && (
            <div className="alert alert-primary d-flex flex-wrap justify-content-between align-items-center py-2 px-3 m-2 shadow-xs border-0">
              <div className="d-flex align-items-center gap-2">
                <CalendarIcon size={16} className="text-primary" />
                <span className="fw-bold text-dark small">
                  તારીખ {selectedDateFilter} ના ફંક્શન્સ ({filteredBookings.length} રેકોર્ડ)
                </span>
                <span className="text-muted small">
                  (આ તારીખના પૂર્ણ થયેલા તેમજ સક્રિય તમામ ફંક્શન્સ)
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline-primary btn-xs btn-sm py-0.5 px-2 fw-semibold"
                onClick={() => setSelectedDateFilter(null)}
              >
                ✕ બધી તારીખો જુઓ (Show All Dates)
              </button>
            </div>
          )}

          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ fontSize: '0.82rem' }}>Booking #</th>
                  <th style={{ fontSize: '0.82rem' }}>Date & Time</th>
                  <th style={{ fontSize: '0.82rem' }}>Host Name & Phone</th>
                  <th style={{ fontSize: '0.82rem' }} className="text-center">Guests</th>
                  <th style={{ fontSize: '0.82rem' }}>Event Type</th>
                  <th style={{ fontSize: '0.82rem' }}>Catering Menu</th>
                  <th style={{ fontSize: '0.82rem' }} className="text-end">Booking period</th>
                  <th style={{ fontSize: '0.82rem' }} className="text-center">Status</th>
                  <th style={{ fontSize: '0.82rem' }} className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center p-4 text-muted small">
                      {loading ? 'Loading functions...' : 'No functions found matching filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map(b => (
                    <tr key={b.id || b.bookingNumber}>
                      <td className="fw-bold font-monospace small text-primary">{b.bookingNumber}</td>
                      <td>
                        <div className="fw-bold small text-dark">{b.bookingDate}</div>
                        <div className="small text-muted d-flex align-items-center gap-1">
                          <span className={`badge px-1 py-0 ${b.timeSlot?.includes('બપોરે') ? 'bg-warning text-dark' : 'bg-primary text-white'}`}>
                            {b.timeSlot || 'Evening'}
                          </span>
                          <span>{b.bookingTime || ''}</span>
                        </div>
                      </td>
                      <td>
                        <div className="fw-bold small text-dark">{b.customerName}</div>
                        <div className="small text-muted">{b.customerPhone}</div>
                      </td>
                      <td className="text-center fw-bold small">{b.guestCount}</td>
                      <td>
                        <span className="badge bg-light text-dark border fw-semibold">
                          {b.functionType || 'Family Gathering'}
                        </span>
                      </td>
                      <td>
                        {b.selectedMenu && b.selectedMenu.length > 0 ? (
                          <div className="small text-muted" style={{ maxWidth: 180 }}>
                            <span className="badge bg-light text-dark border me-1">
                              {b.selectedMenu.length} વાનગીઓ
                            </span>
                            <span className="text-truncate d-inline-block align-bottom" style={{ maxWidth: 110 }} title={b.selectedMenu.join(', ')}>
                              {b.selectedMenu.join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td className="text-end fw-bold small text-primary">{b.bookingPeriod || (b.timeSlot?.includes('Lunch') ? 'LUNCH' : 'DINNER')}</td>
                      <td className="text-center">
                        <span className={`badge ${
                          b.status === 'CONFIRMED' ? 'bg-warning-subtle text-dark border border-warning-subtle fw-bold' :
                          b.status === 'CHECKED_IN' ? 'bg-info-subtle text-info border border-info-subtle fw-bold' :
                          b.status === 'COMPLETED' || b.status === 'CHECKED_OUT' ? 'bg-success-subtle text-success border border-success-subtle fw-bold' :
                          b.status === 'CANCELLED' ? 'bg-danger-subtle text-danger border border-danger-subtle fw-bold' :
                          'bg-secondary-subtle text-secondary border border-secondary-subtle fw-bold'
                        }`}>
                          {b.status === 'CONFIRMED' ? 'CONFIRMED' :
                           b.status === 'CHECKED_IN' ? 'CHECKED IN' :
                           (b.status === 'COMPLETED' || b.status === 'CHECKED_OUT') ? 'COMPLETED' :
                           b.status === 'CANCELLED' ? 'CANCELLED' : b.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex gap-1 justify-content-end">
                          <button onClick={() => setViewingLockedMenuBooking(b)} className="btn btn-outline-warning btn-sm p-1 text-dark" title="View Catering Menu"><Utensils size={14} /></button>
                          <button
                            onClick={() => handleWhatsAppShare(b)}
                            className="btn btn-outline-success btn-sm p-1 px-2 d-flex align-items-center gap-1 shadow-xs fw-semibold"
                            style={{ color: '#25D366', borderColor: '#25D366' }}
                            title={b.status === 'COMPLETED' || b.status === 'CHECKED_OUT' ? 'Send WhatsApp Bill Receipt to customer' : 'Send WhatsApp Confirmation to customer'}
                          >
                            <MessageCircle size={14} />
                            <span className="small d-none d-xxl-inline">{b.status === 'COMPLETED' || b.status === 'CHECKED_OUT' ? 'WhatsApp Bill' : 'WhatsApp'}</span>
                          </button>
                          {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && b.status !== 'CHECKED_OUT' && (
                            <button onClick={() => openBookingEditor(b)} className="btn btn-outline-secondary btn-sm p-1" title="Edit booking"><Pencil size={14} /></button>
                          )}

                          {/* 1. Check In Action */}
                          {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
                            <button
                              onClick={() => handleCheckIn(b)}
                              className="btn btn-outline-success btn-sm p-1 px-2.5 d-flex align-items-center gap-1 shadow-xs fw-bold"
                              title="Check In guests for this function"
                            >
                              <LogIn size={13} />
                              <span className="small">Check In</span>
                            </button>
                          )}

                          {/* 2. Check Out Action */}
                          {b.status === 'CHECKED_IN' && (
                            <button
                              onClick={() => openCheckOutModal(b)}
                              className="btn btn-primary btn-sm p-1 px-2.5 d-flex align-items-center gap-1 shadow-sm fw-bold"
                              title="Check Out and Generate Bill"
                            >
                              <LogOut size={13} />
                              <span className="small">Check Out</span>
                            </button>
                          )}

                          {/* 3. Bill Action */}
                          {(b.status === 'COMPLETED' || b.status === 'CHECKED_OUT') && (
                            <button
                              onClick={() => openBillModal(b)}
                              className="btn btn-outline-dark btn-sm p-1 px-2.5 d-flex align-items-center gap-1 shadow-xs fw-bold"
                              title="View & Print Bill"
                            >
                              <Receipt size={13} />
                              <span className="small">Bill</span>
                            </button>
                          )}

                          {/* Cancel Function */}
                          {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && b.status !== 'CHECKED_OUT' && (
                            <button
                              onClick={() => handleCancelBooking(b)}
                              className="btn btn-outline-danger btn-sm p-1 px-2 d-flex align-items-center gap-1"
                              title="Cancel function reservation"
                            >
                              <XCircle size={13} />
                              <span className="small">Cancel</span>
                            </button>
                          )}

                          {/* Delete Function (for cancelled bookings) */}
                          {b.status === 'CANCELLED' && (
                            <button
                              onClick={() => handleDeleteBooking(b)}
                              className="btn btn-danger btn-sm p-1 px-2 d-flex align-items-center gap-1 shadow-xs text-white"
                              title="Permanently delete this cancelled booking"
                            >
                              <Trash2 size={13} />
                              <span className="small">Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Responsive Mobile Cards View (Phones & Small Screens) */}
          <div className="d-block d-md-none p-3 d-flex flex-column gap-3">
            {filteredBookings.length === 0 ? (
              <div className="text-center p-4 text-muted small bg-light rounded-3">
                {loading ? 'Loading functions...' : 'No functions found matching filters.'}
              </div>
            ) : (
              filteredBookings.map(b => (
                <div key={b.id || b.bookingNumber} className="card border shadow-xs rounded-3 overflow-hidden">
                  {/* Card Header: Booking #, Meal period badge, and Status */}
                  <div className="card-header bg-white py-2 px-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-1">
                    <div className="d-flex align-items-center gap-1.5">
                      <span className="badge bg-dark font-monospace" style={{ fontSize: '0.75rem' }}>{b.bookingNumber}</span>
                      <span className={`badge ${b.timeSlot?.includes('બપોરે') ? 'bg-warning text-dark' : 'bg-primary text-white'}`} style={{ fontSize: '0.7rem' }}>
                        {b.timeSlot || 'Evening'}
                      </span>
                    </div>
                    <span className={`badge ${
                      b.status === 'CONFIRMED' ? 'bg-warning-subtle text-dark border border-warning-subtle fw-bold' :
                      b.status === 'CHECKED_IN' ? 'bg-info-subtle text-info border border-info-subtle fw-bold' :
                      b.status === 'COMPLETED' || b.status === 'CHECKED_OUT' ? 'bg-success-subtle text-success border border-success-subtle fw-bold' :
                      b.status === 'CANCELLED' ? 'bg-danger-subtle text-danger border border-danger-subtle fw-bold' :
                      'bg-secondary-subtle text-secondary border border-secondary-subtle fw-bold'
                    }`} style={{ fontSize: '0.72rem' }}>
                      {b.status === 'CONFIRMED' ? 'CONFIRMED' :
                       b.status === 'CHECKED_IN' ? 'CHECKED IN' :
                       (b.status === 'COMPLETED' || b.status === 'CHECKED_OUT') ? 'COMPLETED' :
                       b.status === 'CANCELLED' ? 'CANCELLED' : b.status}
                    </span>
                  </div>

                  {/* Card Body: Host Name, Phone, Date, Guests, Event Type */}
                  <div className="card-body p-3 d-flex flex-column gap-2 bg-white">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="fw-bold mb-0 text-dark">{b.customerName}</h6>
                        <a href={`tel:${b.customerPhone}`} className="text-primary small text-decoration-none fw-semibold">
                          📞 {b.customerPhone}
                        </a>
                      </div>
                      <div className="text-end">
                        <span className="badge bg-light text-dark border fw-bold" style={{ fontSize: '0.82rem' }}>
                          👥 {b.guestCount} મહેમાન
                        </span>
                      </div>
                    </div>

                    <div className="d-flex flex-wrap align-items-center gap-2 small text-muted border-top pt-2">
                      <div>📅 <strong className="text-dark">{b.bookingDate}</strong></div>
                      {b.bookingTime && <div>⏰ {b.bookingTime}</div>}
                      <span className="badge bg-light text-secondary border ms-auto" style={{ fontSize: '0.7rem' }}>
                        {b.functionType || 'Family Gathering'}
                      </span>
                    </div>

                    {/* Dishes list if any */}
                    {b.selectedMenu && b.selectedMenu.length > 0 ? (
                      <div className="p-2 bg-light rounded-2 border small">
                        <div className="fw-semibold text-secondary mb-1" style={{ fontSize: '0.72rem' }}>
                          🍽️ પસંદ કરેલ મેનુ ({b.selectedMenu.length} વાનગીઓ):
                        </div>
                        <div className="d-flex flex-wrap gap-1">
                          {b.selectedMenu.slice(0, 6).map((item, idx) => (
                            <span key={idx} className="badge bg-white text-dark border" style={{ fontSize: '0.68rem' }}>
                              {item}
                            </span>
                          ))}
                          {b.selectedMenu.length > 6 && (
                            <span className="badge bg-secondary text-white" style={{ fontSize: '0.68rem' }}>
                              +{b.selectedMenu.length - 6} વધુ
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* Action Buttons Row */}
                    <div className="d-flex flex-wrap gap-1.5 pt-2 border-top">
                      <button
                        type="button"
                        onClick={() => setViewingLockedMenuBooking(b)}
                        className="btn btn-outline-warning btn-sm p-1.5 px-2 text-dark flex-fill d-flex align-items-center justify-content-center gap-1 shadow-xs fw-semibold"
                        style={{ fontSize: '0.78rem' }}
                      >
                        <Utensils size={13} />
                        <span>મેનુ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleWhatsAppShare(b)}
                        className="btn btn-outline-success btn-sm p-1.5 px-2 flex-fill d-flex align-items-center justify-content-center gap-1 shadow-xs fw-semibold"
                        style={{ color: '#25D366', borderColor: '#25D366', fontSize: '0.78rem' }}
                      >
                        <MessageCircle size={13} />
                        <span>WhatsApp</span>
                      </button>

                      {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && b.status !== 'CHECKED_OUT' && (
                        <button
                          type="button"
                          onClick={() => openBookingEditor(b)}
                          className="btn btn-outline-secondary btn-sm p-1.5 px-2 shadow-xs"
                          title="Edit booking"
                        >
                          <Pencil size={13} />
                        </button>
                      )}

                      {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
                        <button
                          type="button"
                          onClick={() => handleCheckIn(b)}
                          className="btn btn-outline-success btn-sm p-1.5 px-2.5 d-flex align-items-center justify-content-center gap-1 shadow-xs fw-bold flex-fill"
                          style={{ fontSize: '0.78rem' }}
                        >
                          <LogIn size={13} />
                          <span>Check In</span>
                        </button>
                      )}

                      {b.status === 'CHECKED_IN' && (
                        <button
                          type="button"
                          onClick={() => openCheckOutModal(b)}
                          className="btn btn-primary btn-sm p-1.5 px-2.5 d-flex align-items-center justify-content-center gap-1 shadow-sm fw-bold flex-fill"
                          style={{ fontSize: '0.78rem' }}
                        >
                          <LogOut size={13} />
                          <span>Check Out</span>
                        </button>
                      )}

                      {(b.status === 'COMPLETED' || b.status === 'CHECKED_OUT') && (
                        <button
                          type="button"
                          onClick={() => openBillModal(b)}
                          className="btn btn-outline-dark btn-sm p-1.5 px-2.5 d-flex align-items-center justify-content-center gap-1 shadow-xs fw-bold flex-fill"
                          style={{ fontSize: '0.78rem' }}
                        >
                          <Receipt size={13} />
                          <span>Bill</span>
                        </button>
                      )}

                      {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && b.status !== 'CHECKED_OUT' && (
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(b)}
                          className="btn btn-outline-danger btn-sm p-1.5 px-2 d-flex align-items-center justify-content-center gap-1"
                          style={{ fontSize: '0.78rem' }}
                        >
                          <XCircle size={13} />
                          <span>Cancel</span>
                        </button>
                      )}

                      {b.status === 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteBooking(b)}
                          className="btn btn-danger btn-sm p-1.5 px-2 d-flex align-items-center justify-content-center gap-1 text-white shadow-xs"
                          style={{ fontSize: '0.78rem' }}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isBookingConfirmOpen} onClose={() => setIsBookingConfirmOpen(false)} title="Confirm Function Booking">
        <div className="p-3">
          <div className="rounded-3 p-3 mb-3" style={{ background: '#fff5e8', border: '1px solid #efd2a6' }}>
            <div className="fw-bold text-dark">Lock {formData.timeSlot.includes('Lunch') ? 'Lunch' : 'Dinner'} function for {formData.bookingDate}?</div>
            <div className="small text-muted mt-1">Host: {formData.customerName || '—'} · {formData.guestCount} guests · {selectedDishes.length} dishes</div>
            <div className="small text-danger mt-2">This reserves one of the two available daily function periods.</div>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-light" onClick={() => setIsBookingConfirmOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => confirmBookFunction()} disabled={submitting}>{submitting ? 'Saving…' : 'Confirm & Lock Booking'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isCapacityOverrideOpen} onClose={() => setIsCapacityOverrideOpen(false)} title="Two functions already confirmed">
        <div className="p-3">
          <div className="d-flex gap-3 align-items-start rounded-3 p-3 mb-3" style={{ background: '#fff3f3', border: '1px solid #f1b8b8' }}>
            <AlertCircle size={25} className="text-danger flex-shrink-0 mt-1" />
            <div>
              <div className="fw-bold text-danger">This date has no normal function slot available.</div>
              <div className="small text-muted mt-1">Lunch and Dinner are already protected. Adding another function is an exceptional manager override and will be marked as an extra booking.</div>
            </div>
          </div>
          <div className="small text-dark mb-3"><strong>New booking:</strong> {formData.customerName || 'Host'} · {formData.bookingDate} · {formData.timeSlot.includes('Lunch') ? 'Lunch' : 'Dinner'} period</div>
          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-light" onClick={() => setIsCapacityOverrideOpen(false)}>No, keep two-slot limit</button>
            <button className="btn btn-danger" onClick={() => confirmBookFunction(true)} disabled={submitting}>{submitting ? 'Adding…' : 'Yes, add exceptional booking'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!bookingToDelete} onClose={() => setBookingToDelete(null)} title="Delete Function Booking">
        <div className="p-3">
          <p className="mb-3">Permanently delete booking <strong>{bookingToDelete?.bookingNumber}</strong> for <strong>{bookingToDelete?.customerName}</strong>? This cannot be undone.</p>
          <div className="d-flex justify-content-end gap-2"><button className="btn btn-light" onClick={() => setBookingToDelete(null)}>Keep booking</button><button className="btn btn-danger" onClick={confirmDeleteBooking}>Delete permanently</button></div>
        </div>
      </Modal>

      <Modal isOpen={!!bookingEditor} onClose={() => setBookingEditor(null)} title={`Edit Function Booking ${bookingEditor?.bookingNumber || ''}`}>
        <div className="p-3">
          <div className="row g-2">
            <div className="col-6"><label className="small fw-bold">Date</label><input type="date" className="form-control" min={todayStr} value={formData.bookingDate} onChange={e => setFormData({ ...formData, bookingDate: e.target.value })} /></div>
            <div className="col-6"><label className="small fw-bold">Period</label><select className="form-select" value={formData.timeSlot.includes('Lunch') ? 'LUNCH' : 'DINNER'} onChange={e => setFormData({ ...formData, timeSlot: e.target.value === 'LUNCH' ? 'Lunch' : 'Dinner', bookingTime: e.target.value === 'LUNCH' ? '01:00 PM' : '08:00 PM' })}><option value="LUNCH">Lunch period</option><option value="DINNER">Dinner period</option></select></div>
            <div className="col-6"><label className="small fw-bold">Host name</label><input className="form-control" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} /></div>
            <div className="col-6"><label className="small fw-bold">Mobile</label><input className="form-control" value={formData.customerPhone} onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} /></div>
            <div className="col-6"><label className="small fw-bold">Guests</label><input type="number" className="form-control" value={formData.guestCount} onChange={e => setFormData({ ...formData, guestCount: Number(e.target.value) })} /></div>
            <div className="col-6"><label className="small fw-bold">Event type</label><select className="form-select form-select-sm" value={formData.functionType} onChange={e => setFormData({ ...formData, functionType: e.target.value })}>{functionTypesList.map((t, i) => <option key={i} value={t}>{t}</option>)}</select></div>
            <div className="col-12"><label className="small fw-bold">Instructions</label><textarea className="form-control" rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
          </div>
          <div className="mt-3 rounded-3 border p-2" style={{ background: '#fffaf2' }}>
            <div className="d-flex justify-content-between align-items-center gap-2">
              <div><div className="small fw-bold">Function catering menu</div><div className="small text-muted">{selectedDishes.length ? `${selectedDishes.length} dishes selected` : 'No dishes selected'}</div></div>
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={editBookingMenu}><Utensils size={14} className="me-1" />Edit menu</button>
            </div>
            {selectedDishes.length > 0 && <div className="small text-muted mt-2 text-truncate">{selectedDishes.map(d => d.name).join(' • ')}</div>}
          </div>
          <div className="d-flex justify-content-end gap-2 mt-3"><button className="btn btn-light" onClick={() => setBookingEditor(null)}>Cancel</button><button className="btn btn-primary" onClick={saveBookingEdit}>Save changes</button></div>
        </div>
      </Modal>

      {/* 4. PROFESSIONAL PRINTABLE FUNCTION SLIP / RECEIPT MODAL */}
      {selectedBookingForSlip && (
        <Modal
          isOpen={!!selectedBookingForSlip}
          onClose={() => setSelectedBookingForSlip(null)}
          title={`Function Booking Confirmation: ${selectedBookingForSlip.bookingNumber || 'FN-VOUCHER'}`}
        >
          <div className="p-3 print-area">
            {/* Slip Header with Restaurant Brand */}
            <div className="text-center pb-3 border-bottom mb-3">
              <h3 className="fw-bold mb-0" style={{ color: 'var(--brand-maroon, #7A1B28)' }}>
                BHATIGAL BHANU (ભાતીગળ ભાણું)
              </h3>
              <div className="small text-muted fw-semibold">TRADITIONAL DINING & EXCLUSIVE BANQUET VENUE</div>
              <div className="small text-secondary mt-1">
                Authentic Kathiyawadi Cuisine • Banquets & Grand Celebrations
              </div>
              <div className="badge bg-gold text-dark mt-2 px-3 py-1 fw-bold" style={{ fontSize: '0.78rem' }}>
                FUNCTION RESERVATION VOUCHER & MENU SLIP
              </div>
            </div>

            {/* Slip Content Grid */}
            <div className="row g-2 mb-3">
              <div className="col-6">
                <span className="small text-muted d-block">Booking Number:</span>
                <strong className="text-primary">{selectedBookingForSlip.bookingNumber}</strong>
              </div>
              <div className="col-6 text-end">
                <span className="small text-muted d-block">Date of Issue:</span>
                <strong>{todayStr}</strong>
              </div>

              <div className="col-6">
                <span className="small text-muted d-block">Reserved Function Date:</span>
                <strong className="fs-6 text-dark">{selectedBookingForSlip.bookingDate}</strong>
              </div>
              <div className="col-6 text-end">
                <span className="small text-muted d-block">Event Time Slot & Time:</span>
                <strong>
                  {selectedBookingForSlip.timeSlot || 'Evening'} ({selectedBookingForSlip.bookingTime || ''})
                </strong>
              </div>

              <div className="col-6">
                <span className="small text-muted d-block">Host / Client Name:</span>
                <strong className="fs-6">{selectedBookingForSlip.customerName}</strong>
              </div>
              <div className="col-6 text-end">
                <span className="small text-muted d-block">Contact Phone:</span>
                <strong>+91 {selectedBookingForSlip.customerPhone}</strong>
                {selectedBookingForSlip.alternatePhone && (
                  <div className="small text-muted">Alt: +91 {selectedBookingForSlip.alternatePhone}</div>
                )}
              </div>

              <div className="col-6">
                <span className="small text-muted d-block">Occasion / Event Type:</span>
                <span className="badge bg-primary-subtle text-primary">
                  {selectedBookingForSlip.functionType || 'Family Dinner'}
                </span>
              </div>
              <div className="col-6 text-end">
                <span className="small text-muted d-block">Guests Expected:</span>
                <strong>{selectedBookingForSlip.guestCount} Persons</strong>
              </div>
            </div>

            {/* Selected Food Menu Items (WITHOUT PRICE) */}
            {selectedBookingForSlip.selectedMenu && selectedBookingForSlip.selectedMenu.length > 0 && (
              <div className="p-2.5 rounded-3 mb-3 border" style={{ backgroundColor: '#F9F6F0', borderColor: '#E8DCCF' }}>
                <div className="d-flex justify-content-between align-items-center mb-1.5 pb-1 border-bottom">
                  <strong className="text-dark small">🍽️ પસંદ કરેલ ભોજન મેનુ (Selected Catering Menu):</strong>
                  <span className="badge bg-secondary" style={{ fontSize: '0.68rem' }}>
                    {selectedBookingForSlip.selectedMenu.length} વાનગીઓ
                  </span>
                </div>
                <div className="row g-1">
                  {selectedBookingForSlip.selectedMenu.map((dishName, idx) => (
                    <div key={idx} className="col-6 col-sm-4 small text-dark d-flex align-items-center gap-1">
                      <span className="text-warning">✦</span>
                      <span className="fw-medium">{dishName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financials & Advance Box */}
            <div className="d-none p-3 rounded-3 mb-3" style={{ backgroundColor: '#FDF5E6', border: '1px solid #E8DCCF' }}>
              <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <span className="fw-semibold text-secondary">Estimated Total Budget:</span>
                <span className="fw-bold text-dark fs-6">
                  ₹{(selectedBookingForSlip.estimatedTotal || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="fw-bold text-success">Advance Payment Received:</span>
                <h5 className="fw-bold text-success mb-0">
                  ₹{(selectedBookingForSlip.advanceAmount || 0).toLocaleString('en-IN')}
                </h5>
              </div>

              <div className="d-flex justify-content-between align-items-center small text-muted">
                <span>Payment Mode: {selectedBookingForSlip.paymentMode || 'Cash'}</span>
                {selectedBookingForSlip.referenceId && (
                  <span>Ref / Txn ID: {selectedBookingForSlip.referenceId}</span>
                )}
              </div>

              {selectedBookingForSlip.estimatedTotal && selectedBookingForSlip.estimatedTotal > (selectedBookingForSlip.advanceAmount || 0) && (
                <div className="d-flex justify-content-between align-items-center pt-2 mt-2 border-top text-danger fw-semibold small">
                  <span>Balance Payable at Event:</span>
                  <span>
                    ₹{(selectedBookingForSlip.estimatedTotal - (selectedBookingForSlip.advanceAmount || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="small text-muted mt-2 pt-1 border-top">
                Accepted by: <strong>{selectedBookingForSlip.acceptedBy || 'Bhanubhai Patel'}</strong>
              </div>
            </div>

            {/* Notes / Catering Instructions */}
            {selectedBookingForSlip.notes && (
              <div className="mb-3">
                <span className="small fw-semibold text-secondary d-block">Special Instructions:</span>
                <p className="small text-dark p-2 bg-light rounded border mb-0 text-break" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {selectedBookingForSlip.notes}
                </p>
              </div>
            )}

            {/* Terms & Conditions */}
            <div className="p-2 bg-light rounded border mb-3" style={{ fontSize: '0.72rem', color: '#666' }}>
              <strong className="d-block text-dark mb-1">Reservation Policy:</strong>
              <div>• Advance deposit confirms the hall and catering arrangement.</div>
              <div>• Balance amount must be settled on the day of the function.</div>
              <div>• Outside food & beverages strictly subject to management approval.</div>
            </div>

            {/* Signature Blocks for Print */}
            <div className="row g-2 pt-3 mt-2 border-top">
              <div className="col-6 text-center">
                <div style={{ height: '35px' }} />
                <div className="border-top pt-1 small text-muted">Host / Client Signature</div>
              </div>
              <div className="col-6 text-center">
                <div style={{ height: '35px' }} />
                <div className="border-top pt-1 small text-muted">Authorized Manager Signature</div>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-3 mt-3 border-top no-print">
              {/* Add to Google Calendar button */}
              <a
                href={getGoogleCalendarUrl(selectedBookingForSlip)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                title="Add to Google Calendar"
              >
                <CalendarPlus size={14} /> Add to Google Calendar
              </a>

              {/* Download .ICS File */}
              <a
                href={`/api/calendar/${selectedBookingForSlip.id}/ics`}
                download={`booking_${selectedBookingForSlip.bookingNumber}.ics`}
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
                title="Download iCal invite (.ics)"
              >
                <Download size={14} /> Download iCal (.ics)
              </a>

              <div className="d-flex gap-2 ms-auto flex-wrap">
                <button
                  type="button"
                  className="btn btn-success btn-sm d-flex align-items-center gap-1.5 fw-bold shadow-sm"
                  style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                  onClick={() => sendWhatsAppConfirmation(selectedBookingForSlip)}
                  title="Send WhatsApp confirmation to customer"
                >
                  <MessageCircle size={15} />
                  <span>WhatsApp મોકલો</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedBookingForSlip(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm d-flex align-items-center gap-1 fw-bold shadow-sm"
                  onClick={() => window.print()}
                >
                  <Printer size={14} /> Print Voucher Slip
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 5. DEDICATED FULL DUAL-PANEL MENU BUILDER (EXACT SAME FORMAT AS DAILY MENU) */}
      {/* ========================================================================= */}
      {isMenuModalOpen && (
        <Modal
          size="xl"
          isOpen={isMenuModalOpen}
          onClose={finishMenuSelection}
          title={`ફંક્શન મેનુ (${bookingMealPeriod === 'LUNCH' ? 'બપોર - Lunch' : 'સાંજ - Dinner'}) • ${formData.bookingDate} (${DAY_NAME_GUJARATI[bookingDayName] || bookingDayName})`}
        >
          <div className="d-flex flex-column gap-3 p-1">
            {/* Top Action Bar */}
            <div className="p-2.5 bg-light rounded-3 border d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="fw-bold text-dark d-flex align-items-center gap-2 small">
                <Utensils size={16} className="text-warning" />
                <span>
                  {bookingMealPeriod === 'LUNCH'
                    ? 'બપોરની વાનગીઓ (Lunch Menu)'
                    : 'સાંજની વાનગીઓ (Dinner Menu)'}
                </span>
                <span className={`badge ms-1 ${bookingMealPeriod === 'LUNCH' ? 'bg-warning text-dark' : 'bg-dark text-white'}`} style={{ fontSize: '0.7rem' }}>
                  {bookingMealPeriod === 'LUNCH' ? 'LUNCH' : 'DINNER'}
                </span>
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary btn-sm fw-semibold shadow-xs d-flex align-items-center gap-1 px-3 py-1"
                onClick={handleLoadDayMenu}
              >
                <span>Load {DAY_NAME_GUJARATI[bookingDayName]?.split(' ')[0] || 'Day'} {bookingMealPeriod === 'LUNCH' ? 'Lunch' : 'Dinner'} Menu</span>
              </button>
            </div>

            {/* Main Dual-Panel Section: EXACT SAME AS DAILY MENU */}
            <div className="row g-3">
              {/* LEFT PANEL: Master Menu Catalog */}
              <div className="col-12 col-lg-7">
                <div className="card shadow-sm border h-100 bg-white">
                  <div className="card-header bg-white py-2.5 border-bottom">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <div>
                        <h6 className="fw-bold mb-0 text-dark">Master Restaurant Catalog</h6>
                        <span className="text-muted small">Select dishes to include in this function</span>
                      </div>
                      {/* Search Bar */}
                      <div className="input-group input-group-sm" style={{ maxWidth: 220 }}>
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

                    {/* Category Filter Pills - strictly filtered by booking meal period */}
                    <div className="d-flex flex-wrap gap-1 mt-2.5" style={{ overflowX: 'visible' }}>
                      <button
                        type="button"
                        className={`btn btn-xs btn-sm py-1 px-2.5 rounded-2 fw-semibold ${
                          selectedCategoryId === 'ALL' ? 'btn-dark text-white' : 'btn-outline-secondary bg-white'
                        }`}
                        onClick={() => setSelectedCategoryId('ALL')}
                      >
                        {bookingMealPeriod === 'LUNCH' ? 'બપોર' : 'સાંજ'} - All ({mealFilteredItems.length})
                      </button>
                      {mealFilteredCategories.map(cat => {
                        const catItemsCount = mealFilteredItems.filter(m => m.categoryId === cat.id).length;
                        return (
                          <button
                            type="button"
                            key={cat.id}
                            className={`btn btn-xs btn-sm py-1 px-2.5 rounded-2 fw-semibold ${
                              selectedCategoryId === cat.id ? 'btn-dark text-white' : 'btn-outline-secondary bg-white'
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
                            type="button"
                            className="btn btn-outline-primary btn-xs btn-sm py-0.5 px-2.5 fw-semibold"
                            onClick={() => handleAddCategoryItems(selectedCategoryId)}
                          >
                            + Add All in Category
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-xs btn-sm py-0.5 px-2.5 fw-semibold"
                            onClick={() => handleRemoveCategoryItems(selectedCategoryId)}
                          >
                            - Remove All in Category
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Master Items Cards List (Scrollable, 2-column on desktop) */}
                  <div className="card-body p-2.5 overflow-auto" style={{ maxHeight: '460px' }}>
                    {filteredCatalog.length === 0 ? (
                      <div className="text-center py-5 text-muted">
                        <Utensils size={32} className="text-muted opacity-50 mb-2" />
                        <div className="fw-bold">No dishes found in this category</div>
                        <small className="text-muted">Try choosing another category or search term.</small>
                      </div>
                    ) : (
                      <div className="row g-2">
                        {filteredCatalog.map(item => {
                          const isAdded = activeItemIds.includes(item.id);
                          const catName = categories.find(c => c.id === item.categoryId)?.name || 'General';

                          return (
                            <div key={item.id} className="col-12 col-sm-6">
                              <div
                                className={`p-2 rounded-3 border d-flex align-items-center justify-content-between gap-2 transition-all ${
                                  isAdded
                                    ? 'bg-primary-subtle border-primary shadow-xs'
                                    : 'bg-white hover-bg-light'
                                }`}
                                style={{ cursor: 'pointer', minHeight: '62px' }}
                                onClick={() => handleToggleItem(item.id)}
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
                                      isAdded ? 'bg-primary text-white shadow-xs' : 'border text-muted bg-light'
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

              {/* RIGHT PANEL: Selected Dishes for this Function */}
              <div className="col-12 col-lg-5">
                <div className="card shadow-sm border h-100 bg-white d-flex flex-column">
                  <div className="card-header bg-white py-2.5 border-bottom d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold mb-0 text-dark">
                        Selected Function Menu ({selectedDishes.length})
                      </h6>
                      <span className="text-muted small">Dishes scheduled for this catering event</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm p-1 px-2.5 d-flex align-items-center gap-1 flex-shrink-0 fw-semibold"
                      style={{ whiteSpace: 'nowrap', minWidth: 'fit-content' }}
                      onClick={handleClearSelection}
                      disabled={selectedDishes.length === 0}
                      title="Clear all selected dishes"
                    >
                      <Trash2 size={13} /> <span>Clear All</span>
                    </button>
                  </div>

                  {/* List of Selected Items */}
                  <div className="card-body p-2 flex-grow-1 overflow-auto" style={{ maxHeight: '460px' }}>
                    {selectedDishes.length === 0 ? (
                      <div className="text-center py-5 text-muted">
                        <Utensils size={30} className="text-muted opacity-40 mb-2" />
                        <div className="fw-semibold small">કોઈ વાનગી પસંદ કરેલ નથી</div>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-1">
                        {selectedDishes.map((item, idx) => {
                          const catName = categories.find(c => c.id === item.categoryId)?.name || 'General';
                          return (
                            <div
                              key={item.id}
                              className="p-2 rounded-2 border d-flex align-items-center justify-content-between gap-2 bg-light hover-bg-white transition-all"
                            >
                              <div className="d-flex align-items-center gap-2 overflow-hidden">
                                <span className="text-muted small fw-bold font-monospace" style={{ minWidth: 22 }}>
                                  {idx + 1}.
                                </span>
                                <span className={`badge p-1 ${item.isVeg ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.6rem' }}>
                                  {item.isVeg ? 'VEG' : 'NON'}
                                </span>
                                <div className="overflow-hidden">
                                  <div className="fw-bold text-dark text-truncate small">
                                    {item.name}
                                  </div>
                                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                    {catName}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm p-1 rounded-circle flex-shrink-0"
                                onClick={() => handleToggleItem(item.id)}
                                title="Remove dish"
                                style={{ width: 26, height: 26 }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="d-flex flex-wrap justify-content-between align-items-center pt-3 border-top gap-2">
              <span className="fw-bold text-dark small">
                કુલ પસંદ કરેલી વાનગીઓ: <span className="badge bg-primary fs-6 ms-1 px-2.5 py-1">{selectedDishes.length}</span>
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm px-4 py-2 fw-bold shadow-sm"
                onClick={finishMenuSelection}
              >
                Confirm & Apply Menu (મેનુ કન્ફર્મ કરો)
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. DEDICATED LOCKED DATE MENU ONLY MODAL (ONLY SHOWS THE MENU, NO OTHER DETAILS) */}
      {viewingLockedMenuBooking && (
        <Modal
          size="md"
          isOpen={!!viewingLockedMenuBooking}
          onClose={() => setViewingLockedMenuBooking(null)}
          title="🍽️ નક્કી કરેલ ભોજન મેનુ (Menu)"
        >
          <div className="p-3">
            {/* Header info */}
            <div className="p-2.5 rounded-3 mb-3 border bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="small text-muted d-block">તારીખ અને સમય:</span>
                  <strong className="text-dark">
                    {viewingLockedMenuBooking.bookingDate} ({viewingLockedMenuBooking.timeSlot || 'Dinner'})
                  </strong>
                </div>
                <div className="text-end">
                  <span className="small text-muted d-block">યજમાન:</span>
                  <strong className="text-primary">{viewingLockedMenuBooking.customerName}</strong>
                  <span className="text-muted small ms-1">({viewingLockedMenuBooking.guestCount} મહેમાન)</span>
                </div>
              </div>
            </div>

            {/* Menu List */}
            <div className="card border shadow-xs mb-3">
              <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                <span className="fw-bold small text-dark d-flex align-items-center gap-1.5">
                  <Utensils size={14} className="text-warning" />
                  <span>પસંદ કરેલી વાનગીઓ:</span>
                </span>
                <span className="badge bg-primary px-2 py-1">
                  {viewingLockedMenuBooking.selectedMenu?.length || 0} વાનગીઓ
                </span>
              </div>

              <div className="card-body p-2" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {viewingLockedMenuBooking.selectedMenu && viewingLockedMenuBooking.selectedMenu.length > 0 ? (
                  <div className="d-flex flex-column gap-1.5">
                    {viewingLockedMenuBooking.selectedMenu.map((dishName, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-2 border bg-light d-flex align-items-center gap-2"
                      >
                        <span className="badge bg-secondary rounded-pill font-monospace" style={{ fontSize: '0.7rem' }}>
                          {idx + 1}
                        </span>
                        <span className="fw-semibold text-dark small">{dishName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted small">
                    આ તારીખ માટે હજુ કોઈ ભોજન મેનુ સિલેક્ટ કરેલ નથી.
                  </div>
                )}
              </div>
            </div>

            <div className="d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-secondary btn-sm px-4"
                onClick={() => setViewingLockedMenuBooking(null)}
              >
                Close (બંધ કરો)
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6.5 DEDICATED DAY FUNCTIONS HISTORY MODAL (SHOWS WHICH AND HOW MANY FUNCTIONS WERE HELD ON A SPECIFIC DATE) */}
      {viewingDayHistory && (
        <Modal
          size="lg"
          isOpen={!!viewingDayHistory}
          onClose={() => setViewingDayHistory(null)}
          title={`📅 તારીખ ${viewingDayHistory.date} ના ફંક્શન્સ • કુલ: ${viewingDayHistory.bookings.length} ફંક્શન`}
        >
          <div className="p-3">
            {/* Header info banner */}
            <div className="p-2.5 rounded-3 mb-3 border bg-light d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <span className="small text-muted d-block" style={{ fontSize: '0.75rem' }}>પસંદ કરેલ તારીખ:</span>
                <strong className="fs-6 text-dark">📅 {viewingDayHistory.date}</strong>
              </div>
              <div className="text-end">
                <span className="small text-muted d-block" style={{ fontSize: '0.75rem' }}>આ તારીખે યોજાયેલ ફંક્શન:</span>
                <span className="badge bg-primary fs-6 px-2.5 py-1">
                  કુલ {viewingDayHistory.bookings.length} ફંક્શન {viewingDayHistory.bookings.length > 1 ? 'હતા' : 'હતું'}
                </span>
              </div>
            </div>

            {/* List of functions on this date */}
            <div className="d-flex flex-column gap-3" style={{ maxHeight: '460px', overflowY: 'auto' }}>
              {viewingDayHistory.bookings.map((b, idx) => {
                const isCompleted = b.status === 'COMPLETED' || b.status === 'CHECKED_OUT';
                return (
                  <div key={b.id || idx} className="card border shadow-xs">
                    <div className="card-header bg-white py-2 d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="badge bg-dark font-monospace">{b.bookingNumber}</span>
                        <strong className="text-primary fs-6">{b.customerName}</strong>
                        <span className="badge bg-light text-dark border">
                          <Users size={12} className="me-1" />{b.guestCount} મહેમાન
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className={`badge px-2 py-1 ${
                          isCompleted
                            ? 'bg-success text-white'
                            : b.status === 'CHECKED_IN'
                              ? 'bg-warning text-dark'
                              : 'bg-primary text-white'
                        }`}>
                          {b.status}
                        </span>
                        <span className="badge bg-light text-secondary border">
                          {b.timeSlot || 'Evening'} ({b.bookingTime || ''})
                        </span>
                      </div>
                    </div>

                    <div className="card-body p-3">
                      <div className="row g-2 mb-2">
                        <div className="col-12 col-sm-6">
                          <div className="small text-muted">સંપર્ક નંબર:</div>
                          <div className="fw-semibold text-dark">📞 +91 {b.customerPhone}</div>
                        </div>
                        <div className="col-12 col-sm-6">
                          <div className="small text-muted">પ્રસંગનો પ્રકાર:</div>
                          <div className="fw-semibold text-dark">{b.functionType || 'Family Gathering'}</div>
                        </div>
                      </div>

                      {/* Menu list */}
                      <div className="mb-2 p-2 bg-light rounded-2 border">
                        <div className="fw-bold small text-secondary mb-1 d-flex align-items-center gap-1">
                          <Utensils size={13} className="text-warning" />
                          <span>નક્કી કરેલ ભોજન મેનુ ({b.selectedMenu?.length || 0} વાનગી):</span>
                        </div>
                        {b.selectedMenu && b.selectedMenu.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {b.selectedMenu.map((m, i) => (
                              <span key={i} className="badge bg-white text-dark border small fw-normal py-1 px-2">
                                <span className="text-warning me-1">✦</span>{m}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="small text-muted fst-italic">કોઈ મેનુ નક્કી નહોતું</span>
                        )}
                      </div>

                      {/* Billing details if billed */}
                      {b.billing && (
                        <div className="p-2.5 bg-success-subtle rounded-2 border border-success-subtle mb-2">
                          <div className="row g-2 text-dark small">
                            <div className="col-6 col-sm-3">
                              <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>બિલ નંબર:</span>
                              <strong className="font-monospace">{b.billing.billNumber || '—'}</strong>
                            </div>
                            <div className="col-6 col-sm-3">
                              <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>કુલ બિલ રકમ:</span>
                              <strong className="text-success">₹{(b.billing.totalAmount || 0).toLocaleString('en-IN')}</strong>
                            </div>
                            <div className="col-6 col-sm-3">
                              <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>એડવાન્સ જમા:</span>
                              <strong>₹{(b.billing.advanceAmount || b.advanceAmount || 0).toLocaleString('en-IN')}</strong>
                            </div>
                            <div className="col-6 col-sm-3">
                              <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>નેટ ચૂકવેલ:</span>
                              <strong className="text-dark">₹{(b.billing.netPayable || 0).toLocaleString('en-IN')} ({b.billing.paymentMode || 'Cash'})</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="d-flex flex-wrap justify-content-end gap-2 pt-2 border-top">
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm d-flex align-items-center gap-1.5 fw-semibold shadow-xs"
                          style={{ color: '#25D366', borderColor: '#25D366' }}
                          onClick={() => handleWhatsAppShare(b)}
                          title={isCompleted ? "Send WhatsApp Bill Receipt to customer" : "Send WhatsApp confirmation to customer"}
                        >
                          <MessageCircle size={14} />
                          <span>{isCompleted ? 'WhatsApp બિલ' : 'WhatsApp મેસેજ'}</span>
                        </button>

                        {isCompleted && (
                          <button
                            type="button"
                            className="btn btn-outline-dark btn-sm d-flex align-items-center gap-1 fw-bold shadow-xs"
                            onClick={() => {
                              setViewingDayHistory(null);
                              openBillModal(b);
                            }}
                          >
                            <Receipt size={14} />
                            <span>બિલ જુઓ</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-xs"
                          onClick={() => {
                            setViewingDayHistory(null);
                            setSelectedBookingForSlip(b);
                          }}
                        >
                          <Printer size={14} />
                          <span>વાઉચર સ્લિપ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="d-flex justify-content-between align-items-center pt-3 mt-3 border-top">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => {
                  setSelectedDateFilter(viewingDayHistory.date);
                  setViewingDayHistory(null);
                }}
              >
                નીચે રજીસ્ટ્રીમાં આ તારીખ ફિલ્ટર કરો
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm px-4"
                onClick={() => setViewingDayHistory(null)}
              >
                Close (બંધ કરો)
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. FUNCTION CHECK-OUT & BILLING MODAL */}
      {isCheckOutModalOpen && checkoutState.booking && (
        <Modal
          size="xl"
          isOpen={isCheckOutModalOpen}
          onClose={() => setIsCheckOutModalOpen(false)}
          title={`🏁 ફંક્શન ચેક આઉટ અને બિલ જનરેશન • ${checkoutState.booking.bookingNumber}`}
        >
          <div className="p-2">
            {/* Host & Function Summary Bar */}
            <div className="p-3 rounded-3 mb-3 border bg-light">
              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-4">
                  <div className="small text-muted">યજમાન (Host Name):</div>
                  <strong className="fs-6 text-dark">{checkoutState.booking.customerName}</strong>
                  <div className="small text-muted">📞 +91 {checkoutState.booking.customerPhone}</div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="small text-muted">તારીખ અને સમય:</div>
                  <strong>{checkoutState.booking.bookingDate}</strong>
                  <div className="small text-primary fw-semibold">
                    {checkoutState.booking.timeSlot || checkoutState.booking.bookingPeriod || 'Evening'} ({checkoutState.booking.bookingTime || ''})
                  </div>
                </div>
                <div className="col-6 col-md-2">
                  <div className="small text-muted">મહેમાનો (Guests):</div>
                  <span className="badge bg-primary fs-6 px-2.5 py-1">
                    {checkoutState.booking.guestCount} Persons
                  </span>
                </div>
                <div className="col-12 col-md-3 text-md-end">
                  <div className="small text-muted">જમા એડવાન્સ રકમ (Advance):</div>
                  <span className="badge bg-success-subtle text-success fs-6 border border-success-subtle fw-bold px-2.5 py-1">
                    ₹{(checkoutState.advanceAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="row g-3">
              {/* Left Column: Consumed Dishes & Extra Additions */}
              <div className="col-12 col-lg-7">
                <div className="card border shadow-xs h-100">
                  <div className="card-header bg-white py-2.5 d-flex justify-content-between align-items-center">
                    <div className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                      <Utensils size={15} className="text-warning" />
                      <span>ફંક્શનમાં વપરાયેલ વાનગીઓ અને આઇટમ્સ (Dishes / Items List)</span>
                    </div>
                    <span className="badge bg-light text-dark border">
                      {checkoutState.dishes.length} Items
                    </span>
                  </div>

                  <div className="card-body p-2" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    {checkoutState.dishes.length === 0 ? (
                      <div className="text-center py-4 text-muted small">
                        કોઈ વાનગી લિસ્ટમાં નથી. નીચેથી નવી વાનગીઓ ઉમેરો.
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '8%' }} className="text-center">#</th>
                              <th style={{ width: '82%' }}>વાનગી / આઇટમ નામ (Dish Name)</th>
                              <th style={{ width: '10%' }} className="text-center">ક્રિયા</th>
                            </tr>
                          </thead>
                          <tbody>
                            {checkoutState.dishes.map((dish, idx) => (
                              <tr key={idx}>
                                <td className="text-center text-muted">{idx + 1}</td>
                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm border-0 bg-transparent px-1 py-0 fw-semibold"
                                    value={dish.name}
                                    placeholder="વાનગીનું નામ"
                                    onChange={(e) => handleUpdateDish(idx, 'name', e.target.value)}
                                  />
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm p-1 border-0"
                                    onClick={() => handleRemoveDish(idx)}
                                    title="વાનગી હટાવો"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Add Extra Custom Dish Bar */}
                  <div className="card-footer bg-light p-2.5 border-top">
                    <div className="small fw-bold text-dark mb-1.5 d-flex align-items-center gap-1">
                      <Plus size={13} className="text-primary" />
                      <span>વધારાની વાનગી / આઇટમ ઉમેરો (Add Extra Dish/Item):</span>
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="વાનગીનું નામ લખો (દા.ત. કાજુ કરી, રસગુલ્લા)"
                        value={checkoutState.newDishName}
                        onChange={(e) => setCheckoutState(prev => ({ ...prev, newDishName: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddDishToCheckout(); }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm fw-bold d-flex align-items-center gap-1 text-nowrap px-3"
                        onClick={handleAddDishToCheckout}
                      >
                        <Plus size={13} /> <span>ઉમેરો</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Billing & Net Settlement Calculation */}
              <div className="col-12 col-lg-5">
                <div className="card border shadow-xs h-100">
                  <div className="card-header bg-white py-2.5 d-flex justify-content-between align-items-center">
                    <div className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                      <Receipt size={15} className="text-success" />
                      <span>બિલ ગણતરી અને પતાવટ (Billing & Settlement)</span>
                    </div>
                  </div>

                  <div className="card-body p-3 d-flex flex-column gap-2.5">
                    {(() => {
                      const count = Number(checkoutState.dishCount) || 0;
                      const rate = Number(checkoutState.dishRate) || 0;
                      const calculatedTotal = count * rate;
                      const totalBill = checkoutState.totalBillPrice !== undefined ? Number(checkoutState.totalBillPrice) : calculatedTotal;
                      const discount = Number(checkoutState.discount) || 0;
                      const advance = Number(checkoutState.advanceAmount) || 0;
                      const balanceToPay = Math.max(0, totalBill - discount - advance);

                      return (
                        <>
                          {/* Dish Count & Rate per Dish Section */}
                          <div className="p-2.5 rounded-3 border bg-light">
                            <div className="row g-2">
                              <div className="col-6">
                                <label className="form-label small fw-bold text-dark mb-1">
                                  ડિશ કેટલી થઈ (Dishes) <span className="text-danger">*</span>
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  className="form-control form-control-sm fw-bold text-dark"
                                  placeholder="દા.ત. 200"
                                  value={checkoutState.dishCount || ''}
                                  onChange={(e) => {
                                    const newCount = Math.max(0, Number(e.target.value) || 0);
                                    setCheckoutState(prev => ({
                                      ...prev,
                                      dishCount: newCount,
                                      totalBillPrice: newCount * (prev.dishRate || 0)
                                    }));
                                  }}
                                />
                              </div>
                              <div className="col-6">
                                <label className="form-label small fw-bold text-dark mb-1">
                                  ડિશનો ભાવ (Rate ₹) <span className="text-danger">*</span>
                                </label>
                                <div className="input-group input-group-sm">
                                  <span className="input-group-text fw-bold">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    className="form-control form-control-sm fw-bold text-dark"
                                    placeholder="દા.ત. 250"
                                    value={checkoutState.dishRate || ''}
                                    onChange={(e) => {
                                      const newRate = Math.max(0, Number(e.target.value) || 0);
                                      setCheckoutState(prev => ({
                                        ...prev,
                                        dishRate: newRate,
                                        totalBillPrice: (prev.dishCount || 0) * newRate
                                      }));
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="small text-muted mt-1.5 d-flex justify-content-between align-items-center" style={{ fontSize: '0.74rem' }}>
                              <span>ગણતરી: <strong>{count} ડિશ × ₹{rate}</strong></span>
                              <span className="text-primary fw-bold">₹{calculatedTotal.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {/* Total Bill Price Input */}
                          <div>
                            <label className="form-label small fw-bold text-dark mb-1 d-flex justify-content-between">
                              <span>કુલ બિલ રકમ (Total Bill Price ₹) <span className="text-danger">*</span>:</span>
                              <span className="badge bg-light text-muted border" style={{ fontSize: '0.7rem' }}>ઓટો-કેલ્ક્યુલેટ / એડિટેબલ</span>
                            </label>
                            <div className="input-group input-group-lg">
                              <span className="input-group-text fw-bold text-dark bg-light">₹</span>
                              <input
                                type="number"
                                min="0"
                                className="form-control form-control-lg fw-bold text-dark"
                                placeholder="0"
                                value={checkoutState.totalBillPrice === 0 ? '' : checkoutState.totalBillPrice}
                                onChange={(e) => setCheckoutState(prev => ({ ...prev, totalBillPrice: Math.max(0, Number(e.target.value) || 0) }))}
                              />
                            </div>
                          </div>

                          {/* Discount Input */}
                          <div className="row g-2">
                            <div className="col-6">
                              <label className="form-label small fw-semibold text-secondary mb-1">
                                ડિસ્કાઉન્ટ (Discount ₹):
                              </label>
                              <div className="input-group input-group-sm">
                                <span className="input-group-text">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  className="form-control form-control-sm"
                                  placeholder="0"
                                  value={checkoutState.discount || ''}
                                  onChange={(e) => setCheckoutState(prev => ({ ...prev, discount: Math.max(0, Number(e.target.value) || 0) }))}
                                />
                              </div>
                            </div>

                            {/* Advance Received */}
                            <div className="col-6">
                              <label className="form-label small fw-semibold text-secondary mb-1">
                                જમા એડવાન્સ (Advance ₹):
                              </label>
                              <div className="input-group input-group-sm">
                                <span className="input-group-text">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  className="form-control form-control-sm bg-light"
                                  value={checkoutState.advanceAmount || ''}
                                  onChange={(e) => setCheckoutState(prev => ({ ...prev, advanceAmount: Math.max(0, Number(e.target.value) || 0) }))}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Net Balance Payable Card */}
                          <div
                            className="p-3 rounded-3 text-center border"
                            style={{
                              backgroundColor: balanceToPay > 0 ? '#E8F5E9' : '#F1F8E9',
                              borderColor: '#A5D6A7'
                            }}
                          >
                            <div className="small fw-bold text-secondary text-uppercase tracking-wider">
                              ચૂકવવાપાત્ર બાકી રકમ (Balance to Collect)
                            </div>
                            <h2 className="fw-bolder mb-0 text-success my-1" style={{ letterSpacing: '-0.5px' }}>
                              ₹{balanceToPay.toLocaleString('en-IN')}
                            </h2>
                            <div className="small text-muted" style={{ fontSize: '0.73rem' }}>
                              (કુલ બિલ ₹{totalBill.toLocaleString('en-IN')} − ડિસ્કાઉન્ટ ₹{discount} − એડવાન્સ ₹{advance.toLocaleString('en-IN')})
                            </div>
                          </div>

                          {/* Payment Mode Selection */}
                          <div className="row g-2">
                            <div className="col-6">
                              <label className="form-label small fw-bold text-dark mb-1">ચુકવણી માધ્યમ (Mode):</label>
                              <select
                                className="form-select form-select-sm"
                                value={checkoutState.paymentMode}
                                onChange={(e) => setCheckoutState(prev => ({ ...prev, paymentMode: e.target.value }))}
                              >
                                <option value="Cash">Cash (રોકડ)</option>
                                <option value="UPI">UPI / QR (GPay, PhonePe, Paytm)</option>
                                <option value="Card">Card (ડેબિટ / ક્રેડિટ કાર્ડ)</option>
                                <option value="Bank Transfer">Bank Transfer / Cheque</option>
                              </select>
                            </div>
                            <div className="col-6">
                              <label className="form-label small fw-semibold text-secondary mb-1">UPI / Trx No (જો હોય):</label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Txn Ref No."
                                value={checkoutState.paymentReference}
                                onChange={(e) => setCheckoutState(prev => ({ ...prev, paymentReference: e.target.value }))}
                              />
                            </div>
                          </div>

                          {/* Remarks */}
                          <div>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="કોઈ નોંધ અથવા વિગત (Notes / Remarks)..."
                              value={checkoutState.notes}
                              onChange={(e) => setCheckoutState(prev => ({ ...prev, notes: e.target.value }))}
                            />
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Actions */}
                  <div className="card-footer bg-white p-3 border-top d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-light btn-sm flex-grow-1"
                      onClick={() => setIsCheckOutModalOpen(false)}
                      disabled={checkoutState.isCheckingOut}
                    >
                      રદ કરો (Cancel)
                    </button>
                    <button
                      type="button"
                      className="btn btn-success btn-sm flex-grow-1 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-1.5"
                      onClick={handleConfirmCheckOut}
                      disabled={checkoutState.isCheckingOut}
                    >
                      {checkoutState.isCheckingOut ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                          <span>ચેક આઉટ થઈ રહ્યું છે...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>ચેક આઉટ કરો અને બિલ બનાવો</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 8. PRINTABLE RESTAURANT FUNCTION BILL / TAX INVOICE MODAL */}
      {viewingBillBooking && (
        <Modal
          size="lg"
          isOpen={!!viewingBillBooking}
          onClose={() => setViewingBillBooking(null)}
          title={`ફંક્શન બિલ (Function Tax Invoice) • ${viewingBillBooking.billing?.billNumber || ('BILL-' + viewingBillBooking.bookingNumber)}`}
        >
          <div className="p-3">
            {/* Printable Invoice Container */}
            <div className="print-area p-3 bg-white rounded border">
              {/* Brand Header */}
              <div className="text-center pb-3 border-bottom mb-3">
                <h3 className="fw-bolder mb-0" style={{ color: 'var(--brand-maroon, #7A1B28)', letterSpacing: '0.5px' }}>
                  BHATIGAL BHANU (ભાતીગળ ભાણું)
                </h3>
                <div className="small fw-semibold text-secondary">
                  TRADITIONAL DINING & EXCLUSIVE BANQUET VENUE
                </div>
                <div className="small text-muted">
                  Authentic Kathiyawadi Cuisine • Banquets & Grand Celebrations
                </div>
                <div className="badge bg-dark text-white mt-2 px-3 py-1 fw-bold" style={{ fontSize: '0.8rem' }}>
                  TAX INVOICE / FUNCTION BILL (ફંક્શન બિલ)
                </div>
              </div>

              {/* Bill & Customer Meta Grid */}
              <div className="row g-2 mb-3 small">
                <div className="col-6">
                  <span className="text-muted d-block">Bill Number:</span>
                  <strong className="fs-6 text-dark">
                    {viewingBillBooking.billing?.billNumber || `BILL-${viewingBillBooking.bookingNumber}`}
                  </strong>
                  <span className="text-muted d-block mt-1">Booking Ref:</span>
                  <strong>{viewingBillBooking.bookingNumber}</strong>
                </div>
                <div className="col-6 text-end">
                  <span className="text-muted d-block">Bill Date & Time:</span>
                  <strong>
                    {viewingBillBooking.billing?.billedAt
                      ? new Date(viewingBillBooking.billing.billedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                      : todayStr}
                  </strong>
                  <span className="text-muted d-block mt-1">Billed By:</span>
                  <strong>{viewingBillBooking.billing?.billedBy || 'Staff'}</strong>
                </div>

                <div className="col-12"><hr className="my-1 text-muted" /></div>

                <div className="col-6">
                  <span className="text-muted d-block">Host / Client:</span>
                  <strong className="fs-6">{viewingBillBooking.customerName}</strong>
                  <div className="text-muted">📞 +91 {viewingBillBooking.customerPhone}</div>
                </div>
                <div className="col-6 text-end">
                  <span className="text-muted d-block">Event Date & Period:</span>
                  <strong>{viewingBillBooking.bookingDate} ({viewingBillBooking.timeSlot || viewingBillBooking.bookingPeriod || 'Evening'})</strong>
                  <div className="text-muted">Guests: <strong>{viewingBillBooking.guestCount} Persons</strong> • {viewingBillBooking.functionType || 'Gathering'}</div>
                </div>
              </div>

              {/* Package Details Banner */}
              <div className="p-2.5 mb-3 rounded-3 bg-light border d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-muted small d-block">કેટરિંગ પેકેજ (Catering Package):</span>
                  <strong className="text-dark fs-6">
                    {viewingBillBooking.billing?.dishCount || viewingBillBooking.guestCount} ડિશ / પ્લેટ
                    {viewingBillBooking.billing?.dishRate ? ` × ₹${viewingBillBooking.billing.dishRate} ભાવ પ્રતિ ડિશ` : ''}
                  </strong>
                </div>
                <div className="text-end">
                  <span className="text-muted small d-block">કુલ ભોજન રકમ:</span>
                  <span className="fw-bolder text-success fs-5">
                    ₹{(viewingBillBooking.billing?.subtotal || viewingBillBooking.billing?.totalAmount || viewingBillBooking.estimatedTotal || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Dishes Itemized Table */}
              <div className="table-responsive mb-3">
                <table className="table table-sm table-bordered align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '8%' }} className="text-center">#</th>
                      <th style={{ width: '92%' }}>મેનુ વાનગીઓની યાદી (Menu Items Included in Package)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingBillBooking.billing?.dishes && viewingBillBooking.billing.dishes.length > 0 ? (
                      viewingBillBooking.billing.dishes.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="text-center text-muted">{idx + 1}</td>
                          <td className="fw-semibold text-dark">{typeof item === 'string' ? item : (item.name || item)}</td>
                        </tr>
                      ))
                    ) : viewingBillBooking.selectedMenu && viewingBillBooking.selectedMenu.length > 0 ? (
                      viewingBillBooking.selectedMenu.map((m: string, idx: number) => (
                        <tr key={idx}>
                          <td className="text-center text-muted">{idx + 1}</td>
                          <td className="fw-semibold text-dark">{m}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="text-center text-muted py-2">
                          Special Banquet Catering Package
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="row g-2 justify-content-end mb-3">
                <div className="col-12 col-sm-6">
                  {viewingBillBooking.billing?.notes && (
                    <div className="p-2 bg-light rounded border small">
                      <span className="fw-bold d-block text-secondary">Notes / Remarks:</span>
                      <span className="text-dark">{viewingBillBooking.billing.notes}</span>
                    </div>
                  )}
                  {viewingBillBooking.billing?.paymentReference && (
                    <div className="small text-muted mt-1">
                      Payment Ref / Trx ID: <strong>{viewingBillBooking.billing.paymentReference}</strong>
                    </div>
                  )}
                </div>

                <div className="col-12 col-sm-6">
                  <div className="p-2.5 rounded-3 border bg-light small">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">
                        Total Food ({viewingBillBooking.billing?.dishCount || viewingBillBooking.guestCount} Dishes
                        {viewingBillBooking.billing?.dishRate ? ` @ ₹${viewingBillBooking.billing.dishRate}` : ''}):
                      </span>
                      <strong className="text-dark">
                        ₹{(viewingBillBooking.billing?.subtotal || viewingBillBooking.billing?.totalAmount || viewingBillBooking.estimatedTotal || 0).toLocaleString('en-IN')}
                      </strong>
                    </div>

                    {(viewingBillBooking.billing?.discount || 0) > 0 && (
                      <div className="d-flex justify-content-between mb-1 text-danger">
                        <span>Discount:</span>
                        <span>- ₹{Number(viewingBillBooking.billing.discount).toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="d-flex justify-content-between py-1 border-top fw-bold fs-6 text-dark">
                      <span>Total Bill Amount:</span>
                      <span>
                        ₹{(viewingBillBooking.billing?.totalAmount || viewingBillBooking.estimatedTotal || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between mb-1 text-muted">
                      <span>Less: Advance Deposited:</span>
                      <span>
                        - ₹{(viewingBillBooking.billing?.advanceAmount !== undefined ? viewingBillBooking.billing.advanceAmount : (viewingBillBooking.advanceAmount || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between pt-1.5 border-top fw-bold text-success fs-6">
                      <span>Net Balance Paid:</span>
                      <span>
                        ₹{(viewingBillBooking.billing?.netPayable !== undefined ? viewingBillBooking.billing.netPayable : Math.max(0, (viewingBillBooking.billing?.totalAmount || viewingBillBooking.estimatedTotal || 0) - (viewingBillBooking.advanceAmount || 0))).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-2 pt-1 border-top">
                      <span className="text-muted">Payment Mode:</span>
                      <span className="badge bg-success-subtle text-success border border-success-subtle fw-bold">
                        {viewingBillBooking.billing?.paymentMode || viewingBillBooking.paymentMode || 'Cash'} • PAID
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thank you note & computer generated notice */}
              <div className="text-center pt-2 border-top small text-muted">
                <div>🙏 ભાતીગળ ભાણુંની મુલાકાત બદલ આભાર! Visit Again.</div>
                <div style={{ fontSize: '0.7rem' }}>This is a computer-generated invoice and does not require a physical signature.</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="d-flex justify-content-between align-items-center pt-3 mt-2 border-top no-print flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setViewingBillBooking(null)}
              >
                Close (બંધ કરો)
              </button>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-success btn-sm fw-bold shadow-sm d-flex align-items-center gap-1.5 px-3 text-white"
                  style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                  onClick={() => sendWhatsAppBill(viewingBillBooking)}
                  title="Send WhatsApp Bill / Receipt to Customer"
                >
                  <MessageCircle size={15} />
                  <span>WhatsApp બિલ મોકલો</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm fw-bold shadow-sm d-flex align-items-center gap-1.5 px-3"
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  <span>Print Bill (બિલ પ્રિન્ટ કરો)</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
