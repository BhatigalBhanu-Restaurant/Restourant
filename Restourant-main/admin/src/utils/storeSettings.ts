// Universal Store & Module Settings Engine for Bhatigal Bhanu ERP
import { apiClient } from '../api/client';

export interface EnterpriseSettings {
  // 1. General & Store Identity
  restaurant_name: string;
  restaurant_name_gujarati: string;
  restaurant_tagline: string;
  restaurant_address: string;
  restaurant_phone: string;
  restaurant_email: string;
  restaurant_website: string;
  gst_number: string;
  fssai_license: string;
  currency_symbol: string;
  currency_code: string;
  system_timezone: string;

  // 2. Date & Time Formats
  date_format: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY';
  time_format: '12_HOUR' | '24_HOUR';
  financial_year_start: string;

  // 3. Taxes, Charges & Percentages
  tax_gst_enabled: string;
  tax_gst_percentage: string;
  tax_cgst_percentage: string;
  tax_sgst_percentage: string;
  tax_inclusive_pricing: string;
  service_charge_enabled: string;
  service_charge_percentage: string;
  packaging_charge_takeaway: string;
  delivery_charge_fixed: string;
  max_discount_percentage: string;

  // 4. Invoicing, Rounding & Financials
  bill_rounding_mode: 'NEAREST' | 'UP' | 'DOWN' | 'NONE';
  bill_invoice_prefix: string;
  bill_kot_prefix: string;
  accounts_default_cash_account: string;
  accounts_cash_variance_alert_threshold: string;
  accounts_auto_journal_on_billing: string;

  // 5. POS & Billing Workflows
  billing_require_order_served: string;
  billing_confirm_before_generation: string;
  billing_allow_custom_price: string;
  orders_auto_send_kot: string;
  orders_dinein_customer_mandatory: string;
  orders_takeaway_customer_mandatory: string;

  // 6. Print & Thermal Slips
  receipt_format: '80MM' | '58MM' | 'A4';
  receipt_copies: string;
  print_font_scale: 'SMALL' | 'MEDIUM' | 'LARGE';
  payment_auto_print_receipt: string;
  auto_kot_print: string;
  payment_auto_download_pdf: string;
  payment_audio_chime: string;
  receipt_show_logo: string;
  receipt_show_gstin: string;
  receipt_show_table: string;
  receipt_show_customer: string;
  receipt_show_tax_breakdown: string;
  receipt_show_service_charge: string;
  receipt_show_footer: string;
  receipt_header_note: string;
  receipt_custom_footer: string;

  // 7. Kitchen Display System (KDS)
  kds_refresh_seconds: string;
  kds_warning_minutes: string;
  kds_critical_minutes: string;
  kds_audio_alert: string;
  kds_group_by_station: string;

  // 8. Tables & Token Queue
  tables_dining_warning_minutes: string;
  tables_auto_vacate_on_settlement: string;
  token_auto_clear_seconds: string;
  token_voice_announcement: string;
  token_prefix: string;

  // 9. Inventory & Procurement
  inventory_auto_recipe_deduction: string;
  inventory_allow_negative_stock: string;
  inventory_low_stock_threshold_percentage: string;
  purchase_po_approval_threshold: string;

  // 10. Staff, HR & Attendance
  attendance_shift_duration_hours: string;
  attendance_grace_period_minutes: string;
  attendance_half_day_hours: string;
  attendance_overtime_multiplier: string;
  payroll_monthly_calculation_days: string;

  // 11. Security & Overrides
  security_manager_pin: string;
  security_session_timeout_minutes: string;
  security_audit_log_retention_days: string;
  system_status: string;
}

export const DEFAULT_STORE_SETTINGS: Record<string, string> = {
  // Store Profile & Legal
  restaurant_name: 'Bhatigal Bhanu (ભાતીગળ ભાણું)',
  restaurant_name_gujarati: 'ભાતીગળ ભાણું',
  restaurant_tagline: '...ભાવ, ભજન અને ભોજનનો ત્રિવેણી સંગમ...',
  restaurant_address: 'Kothariya Ring Road, Near HP Petrol Pump, Rajkot, Gujarat - 360022',
  restaurant_phone: '+91 98790 12345',
  restaurant_email: 'contact@bhatigalbhanu.com',
  restaurant_website: 'https://bhatigalbhanu.com',
  gst_number: '24AAAFB1234A1Z8',
  fssai_license: '10724026000123',
  currency_symbol: '₹',
  currency_code: 'INR',
  system_timezone: 'Asia/Kolkata',

  // Date & Time Formats
  date_format: 'DD/MM/YYYY',
  time_format: '12_HOUR',
  financial_year_start: '04-01',

  // Taxes, GST & Charges
  tax_gst_enabled: 'true',
  tax_gst_percentage: '5.0',
  tax_cgst_percentage: '2.5',
  tax_sgst_percentage: '2.5',
  tax_inclusive_pricing: 'false',
  service_charge_enabled: 'false',
  service_charge_percentage: '0.0',
  packaging_charge_takeaway: '20',
  delivery_charge_fixed: '40',
  max_discount_percentage: '10',

  // Invoicing, Rounding & Financials
  bill_rounding_mode: 'NEAREST',
  bill_invoice_prefix: 'BB-INV-',
  bill_kot_prefix: 'KOT-',
  accounts_default_cash_account: 'Cash in Drawer',
  accounts_cash_variance_alert_threshold: '200',
  accounts_auto_journal_on_billing: 'true',

  // POS & Billing Workflows
  billing_require_order_served: 'true',
  billing_confirm_before_generation: 'true',
  billing_allow_custom_price: 'false',
  orders_auto_send_kot: 'false',
  orders_dinein_customer_mandatory: 'false',
  orders_takeaway_customer_mandatory: 'true',

  // Print & Thermal Printer
  receipt_format: '80MM',
  receipt_copies: '1',
  print_font_scale: 'MEDIUM',
  payment_auto_print_receipt: 'true',
  auto_kot_print: 'true',
  payment_auto_download_pdf: 'false',
  payment_audio_chime: 'true',
  receipt_show_logo: 'true',
  receipt_show_gstin: 'true',
  receipt_show_table: 'true',
  receipt_show_customer: 'true',
  receipt_show_tax_breakdown: 'true',
  receipt_show_service_charge: 'false',
  receipt_show_footer: 'true',
  receipt_header_note: 'જય શ્રી કૃષ્ણ! પધારજો...',
  receipt_custom_footer: 'મુલાકાત બદલ આભાર! ફરી પધારશો... 🙏',

  // Kitchen Display (KDS)
  kds_refresh_seconds: '10',
  kds_warning_minutes: '15',
  kds_critical_minutes: '25',
  kds_audio_alert: 'true',
  kds_group_by_station: 'true',

  // Tables & Token Management
  tables_dining_warning_minutes: '45',
  tables_auto_vacate_on_settlement: 'true',
  token_auto_clear_seconds: '120',
  token_voice_announcement: 'false',
  token_prefix: 'BB-T',

  // Inventory & Recipe Procurement
  inventory_auto_recipe_deduction: 'true',
  inventory_allow_negative_stock: 'false',
  inventory_low_stock_threshold_percentage: '20',
  purchase_po_approval_threshold: '10000',

  // HR, Attendance & Payroll
  attendance_shift_duration_hours: '9',
  attendance_grace_period_minutes: '15',
  attendance_half_day_hours: '4.5',
  attendance_overtime_multiplier: '1.5',
  payroll_monthly_calculation_days: '30',

  // Security & Manager PIN Overrides
  security_manager_pin: '1234',
  security_session_timeout_minutes: '480',
  security_audit_log_retention_days: '365',
  system_status: 'ONLINE'
};

const STORAGE_KEY = 'bb_erp_store_settings_cache_v2';

/**
 * Retrieve cached settings or default dictionary
 */
export function getStoreSettings(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STORE_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STORE_SETTINGS, ...parsed };
  } catch (_) {
    return { ...DEFAULT_STORE_SETTINGS };
  }
}

/**
 * Get setting value with fallback
 */
export function getStoreSetting(key: string, fallback: string = ''): string {
  const current = getStoreSettings();
  if (current[key] !== undefined && current[key] !== null) {
    return String(current[key]);
  }
  if (DEFAULT_STORE_SETTINGS[key] !== undefined) {
    return DEFAULT_STORE_SETTINGS[key];
  }
  return fallback;
}

/**
 * Get boolean setting value
 */
export function getBoolSetting(key: string, fallback: boolean = false): boolean {
  const val = getStoreSetting(key, fallback ? 'true' : 'false');
  return val === 'true' || val === '1';
}

/**
 * Get numeric setting value
 */
export function getNumSetting(key: string, fallback: number = 0): number {
  const val = getStoreSetting(key, String(fallback));
  const num = parseFloat(val);
  return isNaN(num) ? fallback : num;
}

/**
 * Save settings to local cache
 */
export function saveStoreSettings(updates: Record<string, string>): void {
  try {
    const current = getStoreSettings();
    const merged = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.error('Failed to cache store settings:', e);
  }
}

/**
 * Sync settings with backend server
 */
export async function syncSettingsWithServer(): Promise<Record<string, string>> {
  try {
    const res: any = await apiClient.get('/system/settings');
    if (res?.success && res.data) {
      saveStoreSettings(res.data);
      return res.data;
    }
  } catch (err) {
    console.warn('Could not sync settings with server, using local cache:', err);
  }
  return getStoreSettings();
}

/**
 * Format a date string or object according to the active date_format setting
 */
export function formatStoreDate(dateInput?: string | Date | number | null, formatOverride?: string): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const format = formatOverride || getStoreSetting('date_format', 'DD/MM/YYYY');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    case 'DD/MM/YYYY':
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Format a time string or object according to the active time_format setting
 */
export function formatStoreTime(dateInput?: string | Date | number | null, formatOverride?: string): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const format = formatOverride || getStoreSetting('time_format', '12_HOUR');
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');

  if (format === '24_HOUR') {
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  } else {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }
}

/**
 * Format both date and time
 */
export function formatStoreDateTime(dateInput?: string | Date | number | null): string {
  if (!dateInput) return '';
  return `${formatStoreDate(dateInput)} ${formatStoreTime(dateInput)}`;
}

/**
 * Format an amount in the restaurant's active currency
 */
export function formatStoreCurrency(amount: number): string {
  const symbol = getStoreSetting('currency_symbol', '₹');
  const formatted = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol}${formatted}`;
}
