export interface PrintAndBillSettings {
  // 1. Automation Settings
  autoPrintOnPayment: boolean; // Auto open print dialog on payment settlement
  autoDownloadPdfOnPayment: boolean; // Auto download PDF invoice on payment
  printReceiptFormat: '80MM' | 'A4'; // 80mm POS Thermal Slip (default matching print) vs Full A4
  copiesCount: 1 | 2; // 1: Single copy, 2: Customer + Merchant copies

  // 2. Receipt Header Details
  restaurantName: string;
  tagline: string;
  address: string;
  phone: string;
  gstin: string;
  fssai: string;

  // 3. Point-to-Point Slip Content Toggles
  showLogo: boolean;
  showGstin: boolean;
  showCustomer: boolean;
  showTable: boolean;
  showTaxBreakdown: boolean; // CGST (2.5%) & SGST (2.5%) lines
  showServiceCharge: boolean;
  showPaymentMethod: boolean;
  showFooterNote: boolean;
  customFooterText: string;

  // 4. UI & Audio Preferences
  compactMode: boolean; // High-density compact screen
  playPaymentSound: boolean; // Play cash register / confirmation chime
}

export const DEFAULT_PRINT_SETTINGS: PrintAndBillSettings = {
  autoPrintOnPayment: false,
  autoDownloadPdfOnPayment: false,
  printReceiptFormat: '80MM',
  copiesCount: 1,

  restaurantName: 'BHATIGAL BHANU',
  tagline: 'Traditional Kathiyawadi & Gujarati Dining',
  address: 'Kothariya Ring Road, Rajkot, Gujarat - 360022',
  phone: '+91 98790 12345',
  gstin: '24AAAFB1234A1Z8',
  fssai: '10724026000123',

  showLogo: true,
  showGstin: true,
  showCustomer: true,
  showTable: true,
  showTaxBreakdown: true,
  showServiceCharge: true,
  showPaymentMethod: true,
  showFooterNote: true,
  customFooterText: 'Thank you for dining with us! Please Visit Again 🙏',

  compactMode: true,
  playPaymentSound: true
};

const STORAGE_KEY = 'bb_erp_print_pos_settings_v1';

/**
 * Retrieves saved settings from localStorage or returns defaults
 */
export function getPrintSettings(): PrintAndBillSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PRINT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PRINT_SETTINGS, ...parsed };
  } catch (e) {
    return { ...DEFAULT_PRINT_SETTINGS };
  }
}

/**
 * Saves updated settings to localStorage
 */
export function savePrintSettings(updates: Partial<PrintAndBillSettings>): PrintAndBillSettings {
  try {
    const current = getPrintSettings();
    const merged = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.error('Failed to save print settings to localStorage:', e);
    return { ...DEFAULT_PRINT_SETTINGS, ...updates };
  }
}

/**
 * Resets settings back to factory default
 */
export function resetPrintSettings(): PrintAndBillSettings {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  return { ...DEFAULT_PRINT_SETTINGS };
}

/**
 * Web Audio API synthesizer for clean, pleasant cash register / payment chime
 * Zero external audio files or network requests required.
 */
export function playPaymentChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // First tone (high chime)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Second tone (higher resolving chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.55);
  } catch (e) {
    // AudioContext autoplay restriction fallback
  }
}
