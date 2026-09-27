// TypeScript Data Contracts for Restaurant ERP Client

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  roleName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LOCKED';
  avatarUrl?: string;
}

export interface PermissionDetail {
  permissionId: string;
  source: 'SYSTEM' | 'ROLE';
  granted: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: string[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  loyaltyPoints: number;
  totalSpent: number;
  notes?: string;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  email?: string;
  phone: string;
  taxId?: string;
  address?: string;
  paymentTerms?: string;
  outstandingBalance: number;
  isActive: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  displayOrder: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  code: string;
  description?: string;
  price: number;
  costPrice: number;
  taxId?: string;
  isVeg: boolean;
  isAvailable: boolean;
  preparationTimeMinutes: number;
  imageUrl?: string;
  displayOrder: number;
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface DailyMenu {
  id: string;
  dayOfWeek: DayOfWeek;
  lunchItemIds: string[];
  dinnerItemIds: string[];
  itemIds?: string[];
  lunchItems?: MenuItem[];
  dinnerItems?: MenuItem[];
  items?: MenuItem[];
  lunchItemCount?: number;
  dinnerItemCount?: number;
  itemCount?: number;
  isActive: boolean;
  notes?: string;
  realDate?: string;
  isToday?: boolean;
}

export interface DailyMenuConfig {
  id: string;
}

export interface FloorZone {
  id: string;
  name: string;
  code: string;
  description?: string;
  color?: string;
  displayOrder?: number;
  isActive?: boolean;
  tableCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DiningTable {
  id: string;
  tableNumber: string;
  capacity: number;
  floorZone: string;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'CLEANING' | 'BLOCKED' | 'MAINTENANCE';
  currentOrderId?: string;
  isMerged?: boolean;
  mergedWith?: string[];
  mergedTableIds?: string[];
  primaryTableId?: string;
  mergedTableNumbers?: string[];
  parentTableNumber?: string;
  mergedCapacity?: number;
  isMergedChild?: boolean;
  activeOrder?: {
    id: string;
    orderNumber: string;
    netAmount: number;
    itemCount: number;
    status: string;
    createdAt: string;
  } | null;
  isActive: boolean;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  alternatePhone?: string;
  tableId?: string;
  guestCount: number;
  advanceAmount?: number;
  estimatedTotal?: number;
  functionType?: string;
    timeSlot?: string;
    bookingPeriod?: 'LUNCH' | 'DINNER';
  venueArea?: string;
  paymentMode?: string;
  referenceId?: string;
  acceptedBy?: string;
  notes?: string;
  isLocked?: boolean;
  bookingDate: string;
  bookingTime?: string;
    selectedMenu?: string[];
    selectedMenuIds?: string[];
  status: 'PENDING' | 'CONFIRMED' | 'LOCKED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  specialRequests?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  checkedOutAt?: string;
  checkedOutBy?: string;
  billing?: any;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxAmount: number;
  discountAmount: number;
  notes?: string;
  status: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'ONLINE';
  tableId?: string;
  tableNumber?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  status: 'NEW' | 'IN_KITCHEN' | 'READY' | 'SERVED' | 'BILLED' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
  items: OrderItem[];
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  netAmount: number;
  waiterId?: string;
  notes?: string;
  isHeld?: boolean;
  createdAt: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  orderId: string;
  tableId?: string;
  tableNumber?: string;
  customerName?: string;
  items: Array<{
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxAmount: number;
  }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceCharge: number;
  roundOff: number;
  totalPayable: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  billId: string;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'ONLINE' | 'SPLIT';
  status: 'COMPLETED' | 'REFUNDED';
  referenceNumber?: string;
  transactions?: Array<{
    method: string;
    amount: number;
    transactionRef?: string;
  }>;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  unitId: string;
  unitSymbol?: string;
  currentStock: number;
  minimumStockLevel: number;
  reorderQuantity: number;
  costPerUnit: number;
  isActive: boolean;
}

export interface Recipe {
  id: string;
  menuItemId: string;
  menuItemName?: string;
  yieldQuantity: number;
  totalCost: number;
  foodCostPercentage: number;
  instructions?: string;
  ingredients: Array<{
    id: string;
    inventoryItemId: string;
    itemName: string;
    quantity: number;
    unitSymbol?: string;
    cost: number;
  }>;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName?: string;
  orderDate: string;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';
  items: Array<{
    inventoryItemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  createdAt: string;
}

export interface ChartOfAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  subType?: string;
  openingBalance?: number;
  currentBalance: number;
  description?: string;
  isActive: boolean;
}

export interface LedgerTransaction {
  id: string;
  entryId: string;
  entryNumber: string;
  entryDate: string;
  referenceType?: string;
  referenceId?: string;
  narration: string;
  particulars: string;
  debit: number;
  credit: number;
  runningBalance: number;
  balanceType: 'Dr' | 'Cr';
}

export interface AccountLedgerStatement {
  account: ChartOfAccount;
  period: {
    startDate: string;
    endDate: string;
  };
  openingBalance: number;
  openingBalanceType: 'Dr' | 'Cr';
  totalDebit: number;
  totalCredit: number;
  netChange: number;
  closingBalance: number;
  closingBalanceType: 'Dr' | 'Cr';
  transactions: LedgerTransaction[];
}

export interface TrialBalanceRow {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  subType?: string;
  totalDebit: number;
  totalCredit: number;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceReport {
  asOfDate: string;
  grandDebit: number;
  grandCredit: number;
  isBalanced: boolean;
  rows: TrialBalanceRow[];
}


export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  referenceType?: string;
  referenceId?: string;
  narration: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
  items: Array<{
    accountId: string;
    accountName: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
  createdAt: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  title: string;
  category: string;
  amount: number;
  paymentMethod: string;
  expenseDate: string;
  status: string;
  notes?: string;
}

export interface DayClosing {
  id: string;
  closingDate: string;
  openingCash: number;
  totalSales: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  totalExpenses: number;
  cashExpenses: number;
  expectedCash: number;
  actualCash: number;
  cashDifference: number;
  totalOrders: number;
  status: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentName?: string;
  designationTitle?: string;
  baseSalary: number;
  status: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalHours: number;
  status: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  rejectionReason?: string;
}

export interface PayrollRun {
  id: string;
  payrollCode: string;
  month: number;
  year: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  status: string;
  createdAt: string;
}

export interface Payslip {
  id: string;
  employeeName: string;
  month: number;
  year: number;
  presentDays: number;
  basicSalary: number;
  allowances: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  paymentStatus: string;
}

export interface AuditLog {
  id: string;
  username: string;
  roleName?: string;
  module: string;
  submodule?: string;
  action: string;
  recordId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  status: string;
  timestamp: string;
}

export interface SystemNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  roleName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LOCKED';
  lastLogin?: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: string[];
}

export interface SystemHealthMetrics {
  serverStatus: string;
  uptimeSeconds: number;
  memoryUsageMb: number;
  activeSockets: number;
  dbStatus: string;
  dbCollections: number;
  dbTotalRecords: number;
}
