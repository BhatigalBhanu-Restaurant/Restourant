import React, { useState, useEffect, useMemo } from 'react';
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
  Pencil
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

export const BookingPage: React.FC = () => {
  const { socket } = useSocket();
  const { user } = useAuth();

  // Current real date & system clock in Indian Standard Time format
  const todayStr = useMemo(() => getLocalDateStr(new Date()), []);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');
  
  // Active calendar view (month & year) - real current date
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Selected date for locking form (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [venueFilter, setVenueFilter] = useState('ALL');

  // =========================================================================
  // DAILY MENU FORMAT CATERING DISHES (EXACT SAME FORMAT AS DAILY MENU PAGE)
  // =========================================================================
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [dailyMenus, setDailyMenus] = useState<DailyMenu[]>([]);
  
  // Active item IDs selected for this function (same as activeItemIds in DailyMenuPage)
  const [activeItemIds, setActiveItemIds] = useState<string[]>([]);
  
  // Filter states for Master Catalog (same as DailyMenuPage)
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');

  // Modal toggle for full Dual-Panel Menu Builder
  const [isMenuModalOpen, setIsMenuModalOpen] = useState<boolean>(false);

  // Staff / Employees list for Manager assignment
  const [staffList, setStaffList] = useState<string[]>([
    'Bhanubhai Patel',
    'Rameshbhai Patel',
    'Pareshbhai Vora',
    'Store Manager',
    'Desk Hostess'
  ]);

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
    acceptedBy: user?.username || 'Bhanubhai Patel',
    notes: ''
  });

  // Slip / Receipt Modal
  const [selectedBookingForSlip, setSelectedBookingForSlip] = useState<Booking | null>(null);
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

  // Fetch active staff for the Manager dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res: any = await apiClient.get('/hr/employees');
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const names = res.data.map((emp: any) => `${emp.firstName || ''} ${emp.lastName || ''}`.trim()).filter(Boolean);
          if (names.length > 0) {
            setStaffList(Array.from(new Set([...names, 'Bhanubhai Patel', 'Rameshbhai Patel'])));
          }
        }
      } catch {
        // Fallback to defaults
      }
    };
    fetchStaff();
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
        }
        if (itemRes?.success && Array.isArray(itemRes.data)) {
          setAllMenuItems(itemRes.data);
        }
        if (dailyRes?.success && dailyRes.data) {
          setDailyMenus(dailyRes.data.menus || []);
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

  // Load Day's Scheduled Daily Menu into this function
  const handleLoadDayMenu = () => {
    const currentDayMenu = dailyMenus.find(m => m.dayOfWeek === bookingDayName);
    if (currentDayMenu && Array.isArray(currentDayMenu.itemIds) && currentDayMenu.itemIds.length > 0) {
      const merged = Array.from(new Set([...activeItemIds, ...currentDayMenu.itemIds]));
      setActiveItemIds(merged);
      setAlertMessage({
        type: 'success',
        text: `${DAY_NAME_GUJARATI[bookingDayName] || bookingDayName} નું ડેઇલી મેનુ (${currentDayMenu.itemIds.length} વાનગીઓ) સફળતાપૂર્વક ફંક્શનમાં ઉમેરાયું!`
      });
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

  // Filtered master catalog items (identical to DailyMenuPage logic)
  const filteredCatalog = useMemo(() => {
    return allMenuItems.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.code.toLowerCase().includes(catalogSearch.toLowerCase());
      const matchesCategory = 
        selectedCategoryId === 'ALL' || item.categoryId === selectedCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [allMenuItems, catalogSearch, selectedCategoryId]);

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
      if (res.success) {
        setBookings(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load function bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings(false, true);
  }, [currentDate]);

  useAutoRefresh(() => loadBookings(false, true), {
    entities: ['bookings'],
    intervalMs: 4000,
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
  const selectedDateBookings = useMemo(() => {
    return bookings.filter(b => b.bookingDate === selectedDate && b.status !== 'CANCELLED');
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
      const dayBookings = bookings.filter(
        b => b.bookingDate === dateStr && b.status !== 'CANCELLED'
      );

      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;

      days.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        isToday,
        isPast,
        bookings: dayBookings,
        booking: dayBookings[0]
      });
    }

    return days;
  }, [year, month, bookings, todayStr]);

  // Filtered bookings for registry table
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = 
        b.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customerPhone?.includes(searchTerm) ||
        b.bookingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.bookingDate?.includes(searchTerm);

      const matchesStatus = 
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
            ? b.status !== 'CANCELLED'
            : b.status === statusFilter;
      const matchesVenue = venueFilter === 'ALL' || b.venueArea === venueFilter;
      return matchesSearch && matchesStatus && matchesVenue;
    });
  }, [bookings, searchTerm, statusFilter, venueFilter]);

  return (
    <div className="d-flex flex-column gap-3 pb-5">
      {/* 1. TOP HEADER BAR WITH LIVE REAL-TIME CLOCK & CALENDAR EXPORT */}
      <div className="d-flex flex-wrap justify-content-between align-items-center py-2 px-3 border-bottom bg-white rounded-3 shadow-sm gap-2">
        {/* Breadcrumb & Subtitle */}
        <div className="d-flex align-items-center gap-2">
          <span className="text-secondary fw-semibold" style={{ fontSize: '0.9rem' }}>
            Bhatigal Bhanu
          </span>
          <span className="text-muted">/</span>
          <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
            Functions & Banquet Calendar
          </span>
        </div>

        {/* Real-time Digital Clock & Live Sync */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Real IST Clock Banner */}
          <div
            className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-light border shadow-xs"
            title="Real-time Indian Standard Time (IST)"
          >
            <CalendarIcon size={14} className="text-danger" />
            <span className="fw-semibold text-dark small">{currentDateFormatted || 'Loading Date...'}</span>
            <span className="text-muted">|</span>
            <Clock size={14} className="text-danger" />
            <span className="fw-bold text-danger font-monospace small">{currentTime || '00:00:00'}</span>
          </div>

          {/* Export Full iCal (.ics) */}
          <a
            href="/api/calendar/export.ics"
            download="bhatigal_bhanu_functions.ics"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
            title="Export all restaurant functions to your mobile or desktop calendar"
          >
            <Download size={13} />
            <span className="d-none d-sm-inline">Export Full iCal (.ics)</span>
          </a>
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

      {/* 2. MAIN SPLIT: FUNCTION BOOKING FORM (LEFT) & REAL CALENDAR (RIGHT) */}
      <div className="row g-3">
        {/* LEFT CARD: FUNCTION BOOKING FORM */}
        <div className="col-12 col-lg-5">
          <div 
            className="card h-100 shadow-sm border-0" 
            style={{ 
              borderRadius: '16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #F0E6E6'
            }}
          >
            {/* Header: Bhatigal Bhanu Styled Brand Box */}
            <div 
              className="card-header py-3 px-3 px-sm-4 border-0 text-white d-flex justify-content-between align-items-center"
              style={{
                backgroundColor: 'var(--brand-maroon, #7A1B28)',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px'
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <CalendarPlus size={20} className="text-gold" />
                <div>
                  <h6 className="fw-bold mb-0 text-white">Book Function (ફંક્શન બુકિંગ)</h6>
                </div>
              </div>
              <span className="badge bg-gold text-dark fw-bold" style={{ fontSize: '0.7rem' }}>
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
                    style={{ borderColor: '#E8DCCF', fontSize: '0.9rem' }}
                  />
                  <small className="text-muted">
                    તારીખનો વાર: <strong className="text-primary">{DAY_NAME_GUJARATI[bookingDayName] || bookingDayName}</strong>
                  </small>
                </div>

                {/* 2. TIME SLOT: STRICTLY 2 OPTIONS (બપોરે / સાંજે) + MANUAL TIME SELECT */}
                <div className="p-2.5 rounded-3 bg-light border">
                  <label className="form-label small fw-bold text-dark mb-1 d-flex align-items-center gap-1">
                    <Clock size={13} className="text-danger" /> Time Slot (સમય ગાળો) & Manual Time <span className="text-danger">*</span>
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
                        Manual Exact Time (ચોક્કસ સમય):
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
                        Quick Presets:
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
                <div className="p-3 rounded-3 border" style={{ backgroundColor: '#FDFCF9', borderColor: '#E8DCCF' }}>
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
                        <Eye size={14} className="me-1" /> {menuPosterLoading ? 'Creating menu card…' : 'Open Menu Card Preview'}
                      </button>
                      {menuPosterUrl && <button type="button" className="btn btn-outline-success btn-sm" onClick={downloadFunctionMenuPoster}><Download size={14} className="me-1" />Download</button>}
                    </div>
                  )}
                  {menuPosterUrl && <div className="mt-2 text-center border rounded-3 p-2 bg-light"><img src={menuPosterUrl} alt="Function menu card" className="img-fluid rounded" style={{ maxHeight: 360 }} /></div>}

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
                    <Users size={12} className="text-danger" /> Guests Expected (મહેમાનોની સંખ્યા) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-control form-control-sm border rounded-3 p-2 fw-semibold"
                    placeholder="દા.ત. 50"
                    required
                    value={formData.guestCount}
                    onChange={e => setFormData({ ...formData, guestCount: Number(e.target.value) })}
                    style={{ borderColor: '#E8DCCF', fontSize: '0.9rem' }}
                  />
                </div>

                {/* 5. Client Name & Mobile Phone */}
                <div className="row g-2">
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-secondary mb-1">
                      Host Name (યજમાનનું નામ) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm border rounded-3 p-2"
                      placeholder="દા.ત. રાજેશભાઈ પટેલ"
                      required
                      value={formData.customerName}
                      onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                      style={{ borderColor: '#E8DCCF', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-secondary mb-1">
                      Mobile Phone (મોબાઈલ નંબર) <span className="text-danger">*</span>
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
                        style={{ borderColor: '#E8DCCF', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Payment collection is handled outside this booking module. */}
                <div className="d-none">
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label small fw-semibold text-secondary mb-1">
                      Advance Paid (એડવાન્સ ડિપોઝીટ ₹) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      className="form-control form-control-sm border rounded-3 p-2"
                      placeholder="5000"
                      required
                      value={formData.advanceAmount}
                      onChange={e => setFormData({ ...formData, advanceAmount: Number(e.target.value) })}
                      style={{ borderColor: '#E8DCCF', fontSize: '0.9rem', fontWeight: 600, color: '#198754' }}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-semibold text-secondary mb-1">
                      Estimated Budget (અંદાજિત રકમ ₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      className="form-control form-control-sm border rounded-3 p-2"
                      placeholder="25000"
                      value={formData.estimatedTotal}
                      onChange={e => setFormData({ ...formData, estimatedTotal: Number(e.target.value) })}
                      style={{ borderColor: '#E8DCCF', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* 7. Payment Mode & Reference ID */}
                <div className="row g-2">
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-secondary mb-1 d-flex align-items-center gap-1">
                      <CreditCard size={12} /> Advance Mode
                    </label>
                    <select
                      className="form-select form-select-sm border rounded-3 p-2"
                      value={formData.paymentMode}
                      onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
                      style={{ borderColor: '#E8DCCF', fontSize: '0.85rem' }}
                    >
                      <option value="Cash">Cash (રોકડ)</option>
                      <option value="UPI (GPay / PhonePe / Paytm / QR)">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="Card (Debit / Credit)">Card (કાર્ડ)</option>
                      <option value="Bank Transfer / RTGS / NEFT">Bank Transfer / NEFT</option>
                    </select>
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-secondary mb-1">
                      UPI / Txn Ref ID
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm border rounded-3 p-2"
                      placeholder="e.g. UPI-123456"
                      value={formData.referenceId}
                      onChange={e => setFormData({ ...formData, referenceId: e.target.value })}
                      style={{ borderColor: '#E8DCCF', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                </div>
                {/* 8. Function Type & Manager */}
                <div className="row g-2">
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-secondary mb-1">
                      Function Type (પ્રસંગનો પ્રકાર)
                    </label>
                    <select
                      className="form-select form-select-sm border rounded-3 p-2"
                      value={formData.functionType}
                      onChange={e => setFormData({ ...formData, functionType: e.target.value })}
                      style={{ borderColor: '#E8DCCF', fontSize: '0.85rem' }}
                    >
                      <option value="Family Dinner & Gathering">Family Dinner & Gathering</option>
                      <option value="Wedding / Reception">Wedding / Reception</option>
                      <option value="Ring Ceremony / Sagai">Ring Ceremony / Sagai</option>
                      <option value="Birthday Party">Birthday Party</option>
                      <option value="Corporate Event & Dinner">Corporate Event & Dinner</option>
                      <option value="Babri / Mundan Sanskar">Babri / Mundan Sanskar</option>
                      <option value="Traditional Feast / Rasoi">Traditional Feast / Rasoi</option>
                      <option value="Other Celebration">Other Celebration</option>
                    </select>
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold text-secondary mb-1">
                      Accepted By (મેનેજર)
                    </label>
                    <select
                      className="form-select form-select-sm border rounded-3 p-2"
                      value={formData.acceptedBy}
                      onChange={e => setFormData({ ...formData, acceptedBy: e.target.value })}
                      style={{ borderColor: '#E8DCCF', fontSize: '0.85rem' }}
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
                    Special Instructions (વિશેષ નોંધ)
                  </label>
                  <textarea
                    rows={2}
                    className="form-control form-control-sm border rounded-3 p-2"
                    placeholder="દા.ત. એસી ચાલુ રાખવું, બેઠક વ્યવસ્થા, વધારાની છાસ..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    style={{ borderColor: '#E8DCCF', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn w-100 py-2.5 text-white fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                    style={{
                      backgroundColor: 'var(--brand-maroon, #7A1B28)',
                      borderColor: 'var(--brand-maroon-dark, #56101B)',
                      borderRadius: '10px',
                      fontSize: '0.95rem'
                    }}
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
        <div className="col-12 col-lg-7">
          <div 
            className="card h-100 shadow-sm border-0" 
            style={{ 
              borderRadius: '16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #F0E6E6'
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
                    className="fw-bold mb-0 text-capitalize"
                    style={{ color: 'var(--brand-maroon, #7A1B28)', fontSize: '1.25rem', minWidth: '160px' }}
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
                </div>
              </div>

              {/* Day-of-week headers */}
              <div className="d-grid text-center mb-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                  <div 
                    key={d} 
                    className="fw-bold small py-1"
                    style={{ color: 'var(--brand-maroon, #7A1B28)', fontSize: '0.75rem', letterSpacing: '0.05em' }}
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

                  const dayBookings = item.bookings || (item.booking ? [item.booking] : []);
                  const isLocked = dayBookings.length > 0;
                  const isSelected = item.dateStr === selectedDate;

                  return (
                    <div
                      key={item.dateStr}
                      onClick={() => {
                        if (item.isPast && !isLocked) {
                          setAlertMessage({
                            type: 'info',
                            text: `Date ${item.dateStr} is in the past. Only today and future dates can be locked.`
                          });
                          return;
                        }
                        setSelectedDate(item.dateStr);
                        setFormData(prev => ({ ...prev, bookingDate: item.dateStr }));
                        if (dayBookings.length > 0) {
                          setSelectedBookingForSlip(dayBookings[0]);
                        }
                      }}
                      className="p-1.5 rounded-3 d-flex flex-column justify-content-between position-relative"
                      style={{
                        cursor: item.isPast && !isLocked ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease-in-out',
                        height: '60px',
                        backgroundColor: isLocked 
                          ? '#FFF5F5' 
                          : item.isPast 
                            ? '#F8F9FA' 
                            : isSelected 
                              ? '#FDF8F2' 
                              : '#FAFAFA',
                        opacity: item.isPast && !isLocked ? 0.45 : 1,
                        border: item.isToday 
                          ? '2px solid var(--brand-maroon, #7A1B28)' 
                          : isSelected 
                            ? '2px solid var(--brand-gold, #D48B28)' 
                            : '1px solid #ECECEC',
                        boxShadow: isSelected ? '0 2px 6px rgba(122, 27, 40, 0.12)' : 'none'
                      }}
                      title={
                        isLocked 
                          ? dayBookings.length > 1
                            ? `${dayBookings.length} functions on ${item.dateStr}:\n` + dayBookings.map(b => `• ${b.customerName} (${b.timeSlot || ''} ${b.bookingTime || ''}, ${b.guestCount} pax)`).join('\n')
                            : `Locked for ${item.booking?.customerName} (${item.booking?.guestCount} Guests, Advance: ₹${item.booking?.advanceAmount || 0})`
                          : item.isPast 
                            ? `Date: ${item.dateStr} (Past date - not available for booking)`
                            : `Date: ${item.dateStr} (Click to select)`
                      }
                    >
                      {/* Day Number and Today Badge */}
                      <div className="d-flex justify-content-between align-items-center">
                        <span 
                          className="fw-bold" 
                          style={{ 
                            fontSize: '0.8rem',
                            color: item.isToday 
                              ? 'var(--brand-maroon, #7A1B28)' 
                              : item.isPast 
                                ? '#999999' 
                                : '#333333'
                          }}
                        >
                          {item.dayNumber}
                        </span>
                        {item.isToday && (
                          <span 
                            className="badge text-white px-1 py-0 rounded"
                            style={{ 
                              backgroundColor: 'var(--brand-maroon, #7A1B28)', 
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
                              {dayBookings.length} Function{dayBookings.length > 1 ? 's' : ''} booked
                            </span>
                            <span 
                              className="d-sm-none p-1 rounded-circle bg-danger d-inline-block" 
                              style={{ width: 6, height: 6 }} 
                              title={`Locked (${dayBookings.length})`}
                            />
                            <span 
                              className="text-truncate small text-secondary d-none d-md-block" 
                              style={{ fontSize: '0.62rem', maxWidth: '65px' }}
                            >
                              {item.booking?.customerName}
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
              <div className="mt-3 p-3 rounded-3 border" style={{ backgroundColor: '#FAF7F2', borderColor: '#EADBC8' }}>
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
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedBookingForSlip(b)}
                            className="btn btn-sm btn-outline-secondary py-0.5 px-2.5 flex-shrink-0 d-flex align-items-center gap-1"
                            style={{ fontSize: '0.72rem' }}
                          >
                            <Printer size={12} />
                            <span>સ્લિપ જુઓ</span>
                          </button>
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
      <div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
        <div className="card-header bg-white p-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h6 className="fw-bold mb-0 text-dark">Function Bookings Registry ({filteredBookings.length})</h6>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="input-group input-group-sm" style={{ width: 220 }}>
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
              className="form-select form-select-sm"
              style={{ width: 160 }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ACTIVE">Active (સક્રિય - Default)</option>
              <option value="ALL">All Status (બધા બુકિંગ)</option>
              <option value="CONFIRMED">Confirmed Only</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled (રદ થયેલા)</option>
            </select>

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
          <div className="table-responsive">
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
                          b.status === 'CONFIRMED' ? 'bg-success-subtle text-success border border-success-subtle' :
                          b.status === 'CHECKED_IN' ? 'bg-info-subtle text-info border border-info-subtle' :
                          b.status === 'COMPLETED' ? 'bg-primary-subtle text-primary border border-primary-subtle' :
                          'bg-danger-subtle text-danger border border-danger-subtle'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex gap-1 justify-content-end">
                          <button onClick={() => setSelectedBookingForSlip(b)} className="btn btn-outline-primary btn-sm p-1" title="View booking details"><Eye size={14} /></button>
                          {b.status !== 'CANCELLED' && <button onClick={() => openBookingEditor(b)} className="btn btn-outline-secondary btn-sm p-1" title="Edit booking"><Pencil size={14} /></button>}
                          {/* View Slip Button */}
                          <button
                            onClick={() => setSelectedBookingForSlip(b)}
                            className="btn btn-outline-secondary btn-sm p-1 px-2 d-flex align-items-center gap-1 shadow-xs"
                            title="Print GST Function Confirmation Voucher Slip"
                          >
                            <Printer size={13} />
                            <span className="small">Slip</span>
                          </button>

                          {/* Complete Status */}
                          {b.status === 'CHECKED_IN' && (
                            <button
                              onClick={() => handleStatusChange(b.id, 'COMPLETED')}
                              className="btn btn-primary btn-sm p-1 px-2 d-flex align-items-center gap-1 shadow-sm"
                              title="Mark Function Completed"
                            >
                              <UserCheck size={13} />
                              <span className="small">Done</span>
                            </button>
                          )}

                          {/* Cancel Function */}
                          {b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && (
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
            <div className="col-6"><label className="small fw-bold">Event type</label><input className="form-control" value={formData.functionType} onChange={e => setFormData({ ...formData, functionType: e.target.value })} /></div>
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

              <div className="d-flex gap-2 ms-auto">
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
          title={`🍽️ ફંક્શન કેટરિંગ ભોજન મેનુ (Function Catering Menu) • ${formData.bookingDate} (${DAY_NAME_GUJARATI[bookingDayName] || bookingDayName})`}
        >
          <div className="d-flex flex-column gap-3 p-1">
            {/* Top Action Bar */}
            <div className="p-2.5 bg-light rounded-3 border d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="fw-bold text-dark d-flex align-items-center gap-2 small">
                <Utensils size={16} className="text-warning" />
                <span>Select Dishes (વાનગીઓ પસંદ કરો)</span>
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary btn-sm fw-semibold shadow-xs d-flex align-items-center gap-1 px-3 py-1"
                onClick={handleLoadDayMenu}
              >
                <span>Load {DAY_NAME_GUJARATI[bookingDayName]?.split(' ')[0] || 'Day'} Menu</span>
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

                    {/* Category Filter Pills */}
                    <div className="d-flex flex-wrap gap-1 mt-2.5" style={{ overflowX: 'visible' }}>
                      <button
                        type="button"
                        className={`btn btn-xs btn-sm py-1 px-2.5 rounded-2 fw-semibold ${
                          selectedCategoryId === 'ALL' ? 'btn-dark text-white' : 'btn-outline-secondary bg-white'
                        }`}
                        onClick={() => setSelectedCategoryId('ALL')}
                      >
                        All Categories ({allMenuItems.length})
                      </button>
                      {categories.map(cat => {
                        const catItemsCount = allMenuItems.filter(m => m.categoryId === cat.id).length;
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
    </div>
  );
};
