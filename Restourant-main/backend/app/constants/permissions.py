# Comprehensive Permission Registry for Enterprise Restaurant ERP

ALL_PERMISSIONS = [
  {
    "id": "dashboard.view",
    "module": "Dashboard",
    "submodule": "Overview",
    "action": "view",
    "name": "View Dashboard",
    "description": "Access main ERP executive dashboard"
  },
  {
    "id": "dashboard.sales.view",
    "module": "Dashboard",
    "submodule": "Sales",
    "action": "view",
    "name": "View Sales Widgets",
    "description": "View sales figures, order counts and revenue metrics"
  },
  {
    "id": "dashboard.orders.view",
    "module": "Dashboard",
    "submodule": "Orders",
    "action": "view",
    "name": "View Order Widgets",
    "description": "View live active orders and KOT counters"
  },
  {
    "id": "dashboard.booking.view",
    "module": "Dashboard",
    "submodule": "Bookings",
    "action": "view",
    "name": "View Booking Widgets",
    "description": "View today reservations and waiting queues"
  },
  {
    "id": "dashboard.inventory.view",
    "module": "Dashboard",
    "submodule": "Inventory",
    "action": "view",
    "name": "View Stock Widgets",
    "description": "View low stock alerts and inventory valuation"
  },
  {
    "id": "dashboard.accounts.view",
    "module": "Dashboard",
    "submodule": "Accounts",
    "action": "view",
    "name": "View Accounts Widgets",
    "description": "View cash drawer, bank balances and P&L widgets"
  },
  {
    "id": "dashboard.payroll.view",
    "module": "Dashboard",
    "submodule": "Payroll",
    "action": "view",
    "name": "View HR Widgets",
    "description": "View staff attendance and payroll summaries"
  },
  {
    "id": "dashboard.reports.view",
    "module": "Dashboard",
    "submodule": "Reports",
    "action": "view",
    "name": "View Analytical Charts",
    "description": "View visual trend charts and analytics"
  },
  {
    "id": "masters.customer.view",
    "module": "Masters",
    "submodule": "Customer",
    "action": "view",
    "name": "View Customers",
    "description": "View customer directory"
  },
  {
    "id": "masters.customer.create",
    "module": "Masters",
    "submodule": "Customer",
    "action": "create",
    "name": "Create Customer",
    "description": "Add new customer record"
  },
  {
    "id": "masters.customer.edit",
    "module": "Masters",
    "submodule": "Customer",
    "action": "edit",
    "name": "Edit Customer",
    "description": "Update customer details"
  },
  {
    "id": "masters.customer.delete",
    "module": "Masters",
    "submodule": "Customer",
    "action": "delete",
    "name": "Delete Customer",
    "description": "Remove customer record"
  },
  {
    "id": "masters.customer.history",
    "module": "Masters",
    "submodule": "Customer",
    "action": "history",
    "name": "Customer History",
    "description": "View customer order history and loyalty points"
  },
  {
    "id": "masters.employee.view",
    "module": "Masters",
    "submodule": "Employee",
    "action": "view",
    "name": "View Employees",
    "description": "View employee list"
  },
  {
    "id": "masters.employee.create",
    "module": "Masters",
    "submodule": "Employee",
    "action": "create",
    "name": "Create Employee",
    "description": "Add new employee"
  },
  {
    "id": "masters.employee.edit",
    "module": "Masters",
    "submodule": "Employee",
    "action": "edit",
    "name": "Edit Employee",
    "description": "Update employee profile"
  },
  {
    "id": "masters.employee.delete",
    "module": "Masters",
    "submodule": "Employee",
    "action": "delete",
    "name": "Delete Employee",
    "description": "Archive or remove employee"
  },
  {
    "id": "masters.supplier.view",
    "module": "Masters",
    "submodule": "Supplier",
    "action": "view",
    "name": "View Suppliers",
    "description": "View vendor list"
  },
  {
    "id": "masters.supplier.create",
    "module": "Masters",
    "submodule": "Supplier",
    "action": "create",
    "name": "Create Supplier",
    "description": "Register new vendor"
  },
  {
    "id": "masters.supplier.edit",
    "module": "Masters",
    "submodule": "Supplier",
    "action": "edit",
    "name": "Edit Supplier",
    "description": "Modify vendor profile"
  },
  {
    "id": "masters.supplier.delete",
    "module": "Masters",
    "submodule": "Supplier",
    "action": "delete",
    "name": "Delete Supplier",
    "description": "Remove vendor"
  },
  {
    "id": "masters.supplier.ledger",
    "module": "Masters",
    "submodule": "Supplier",
    "action": "ledger",
    "name": "View Supplier Ledger",
    "description": "View vendor transactions and payables"
  },
  {
    "id": "masters.menu.view",
    "module": "Masters",
    "submodule": "Menu",
    "action": "view",
    "name": "View Menu Items",
    "description": "View menu categories and dishes"
  },
  {
    "id": "masters.menu.create",
    "module": "Masters",
    "submodule": "Menu",
    "action": "create",
    "name": "Create Menu Item",
    "description": "Add category or dish"
  },
  {
    "id": "masters.menu.edit",
    "module": "Masters",
    "submodule": "Menu",
    "action": "edit",
    "name": "Edit Menu Item",
    "description": "Modify menu prices and descriptions"
  },
  {
    "id": "masters.menu.delete",
    "module": "Masters",
    "submodule": "Menu",
    "action": "delete",
    "name": "Delete Menu Item",
    "description": "Remove dishes from menu"
  },
  {
    "id": "masters.menu.price",
    "module": "Masters",
    "submodule": "Menu",
    "action": "price",
    "name": "Change Menu Pricing",
    "description": "Update dish pricing structure"
  },
  {
    "id": "masters.menu.availability",
    "module": "Masters",
    "submodule": "Menu",
    "action": "availability",
    "name": "Toggle Item Availability",
    "description": "Toggle item in-stock/86 status"
  },
  {
    "id": "masters.table.view",
    "module": "Masters",
    "submodule": "Table",
    "action": "view",
    "name": "View Tables Master",
    "description": "View floor table configurations"
  },
  {
    "id": "masters.table.create",
    "module": "Masters",
    "submodule": "Table",
    "action": "create",
    "name": "Create Table",
    "description": "Add dining table or zone"
  },
  {
    "id": "masters.table.edit",
    "module": "Masters",
    "submodule": "Table",
    "action": "edit",
    "name": "Edit Table",
    "description": "Update table capacity or zone"
  },
  {
    "id": "masters.table.delete",
    "module": "Masters",
    "submodule": "Table",
    "action": "delete",
    "name": "Delete Table",
    "description": "Remove table from layout"
  },
  {
    "id": "masters.table.status",
    "module": "Masters",
    "submodule": "Table",
    "action": "status",
    "name": "Change Table Status Master",
    "description": "Manage table maintenance status"
  },
  {
    "id": "booking.view",
    "module": "Booking",
    "submodule": "Reservations",
    "action": "view",
    "name": "View Bookings",
    "description": "Access reservation list and calendar"
  },
  {
    "id": "booking.create",
    "module": "Booking",
    "submodule": "Reservations",
    "action": "create",
    "name": "Create Booking",
    "description": "Take new table reservation"
  },
  {
    "id": "booking.edit",
    "module": "Booking",
    "submodule": "Reservations",
    "action": "edit",
    "name": "Edit Booking",
    "description": "Modify reservation time or party size"
  },
  {
    "id": "booking.delete",
    "module": "Booking",
    "submodule": "Reservations",
    "action": "delete",
    "name": "Delete Booking",
    "description": "Delete booking record"
  },
  {
    "id": "booking.confirm",
    "module": "Booking",
    "submodule": "Reservations",
    "action": "confirm",
    "name": "Confirm Booking",
    "description": "Mark reservation as confirmed"
  },
  {
    "id": "booking.cancel",
    "module": "Booking",
    "submodule": "Reservations",
    "action": "cancel",
    "name": "Cancel Booking",
    "description": "Cancel guest reservation"
  },
  {
    "id": "booking.assign_table",
    "module": "Booking",
    "submodule": "Reservations",
    "action": "assign_table",
    "name": "Assign Table to Booking",
    "description": "Map table to reservation"
  },
  {
    "id": "booking.change_table",
    "module": "Booking",
    "submodule": "Reservations",
    "action": "change_table",
    "name": "Change Assigned Table",
    "description": "Reassign booking table"
  },
  {
    "id": "booking.checkin",
    "module": "Booking",
    "submodule": "Reservations",
    "action": "checkin",
    "name": "Check-in Guest",
    "description": "Mark guest arrived and seated"
  },
  {
    "id": "booking.no_show",
    "module": "Booking",
    "submodule": "Reservations",
    "action": "no_show",
    "name": "Mark No Show",
    "description": "Record missed reservation"
  },
  {
    "id": "booking.complete",
    "module": "Booking",
    "submodule": "Reservations",
    "action": "complete",
    "name": "Complete Booking",
    "description": "Close finished booking"
  },
  {
    "id": "booking.print",
    "module": "Booking",
    "submodule": "Reservations",
    "action": "print",
    "name": "Print Booking Voucher",
    "description": "Print reservation slip"
  },
  {
    "id": "booking.export",
    "module": "Booking",
    "submodule": "Reservations",
    "action": "export",
    "name": "Export Bookings",
    "description": "Export booking records to Excel/PDF"
  },
  {
    "id": "token.view",
    "module": "Token & Queue",
    "submodule": "Queue",
    "action": "view",
    "name": "View Queue",
    "description": "Access live token queue"
  },
  {
    "id": "token.create",
    "module": "Token & Queue",
    "submodule": "Queue",
    "action": "create",
    "name": "Generate Token",
    "description": "Issue waiting token"
  },
  {
    "id": "token.call",
    "module": "Token & Queue",
    "submodule": "Queue",
    "action": "call",
    "name": "Call Token",
    "description": "Call waiting customer"
  },
  {
    "id": "token.recall",
    "module": "Token & Queue",
    "submodule": "Queue",
    "action": "recall",
    "name": "Recall Token",
    "description": "Repeat call for token"
  },
  {
    "id": "token.skip",
    "module": "Token & Queue",
    "submodule": "Queue",
    "action": "skip",
    "name": "Skip Token",
    "description": "Pass absent token"
  },
  {
    "id": "token.seat",
    "module": "Token & Queue",
    "submodule": "Queue",
    "action": "seat",
    "name": "Seat Customer",
    "description": "Assign table to token"
  },
  {
    "id": "token.complete",
    "module": "Token & Queue",
    "submodule": "Queue",
    "action": "complete",
    "name": "Complete Token",
    "description": "Mark token served"
  },
  {
    "id": "token.history",
    "module": "Token & Queue",
    "submodule": "Queue",
    "action": "history",
    "name": "Token History",
    "description": "Review queue analytics and wait times"
  },
  {
    "id": "token.display",
    "module": "Token & Queue",
    "submodule": "Display",
    "action": "display",
    "name": "Access Token Display",
    "description": "Open public queue display screen"
  },
  {
    "id": "tables.view",
    "module": "Tables",
    "submodule": "Floor",
    "action": "view",
    "name": "View Table Floor Map",
    "description": "View real-time visual table statuses"
  },
  {
    "id": "tables.assign",
    "module": "Tables",
    "submodule": "Floor",
    "action": "assign",
    "name": "Assign Table",
    "description": "Assign guest to dining table"
  },
  {
    "id": "tables.transfer",
    "module": "Tables",
    "submodule": "Floor",
    "action": "transfer",
    "name": "Transfer Table",
    "description": "Move order from one table to another"
  },
  {
    "id": "tables.merge",
    "module": "Tables",
    "submodule": "Floor",
    "action": "merge",
    "name": "Merge Tables",
    "description": "Combine multiple tables for large party"
  },
  {
    "id": "tables.split",
    "module": "Tables",
    "submodule": "Floor",
    "action": "split",
    "name": "Split Tables",
    "description": "Divide merged tables"
  },
  {
    "id": "tables.status",
    "module": "Tables",
    "submodule": "Floor",
    "action": "status",
    "name": "Update Table Status",
    "description": "Change table status (Cleaning, Occupied, etc.)"
  },
  {
    "id": "tables.history",
    "module": "Tables",
    "submodule": "Floor",
    "action": "history",
    "name": "Table History",
    "description": "View table turnover history"
  },
  {
    "id": "orders.view",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "view",
    "name": "View Orders",
    "description": "Access POS terminal and active orders"
  },
  {
    "id": "orders.create",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "create",
    "name": "Create Order",
    "description": "Place Dine-In, Takeaway or Delivery order"
  },
  {
    "id": "orders.edit",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "edit",
    "name": "Edit Order",
    "description": "Modify active order"
  },
  {
    "id": "orders.item_add",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "item_add",
    "name": "Add Items to Order",
    "description": "Add items or running KOT"
  },
  {
    "id": "orders.item_remove",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "item_remove",
    "name": "Remove Items from Order",
    "description": "Void or cancel ordered items"
  },
  {
    "id": "orders.hold",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "hold",
    "name": "Hold Order",
    "description": "Park running order on hold"
  },
  {
    "id": "orders.resume",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "resume",
    "name": "Resume Order",
    "description": "Retrieve held order"
  },
  {
    "id": "orders.cancel",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "cancel",
    "name": "Cancel Order",
    "description": "Void entire order ticket"
  },
  {
    "id": "orders.send_kot",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "send_kot",
    "name": "Send KOT",
    "description": "Dispatch order ticket to kitchen display"
  },
  {
    "id": "orders.print_kot",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "print_kot",
    "name": "Print KOT Slip",
    "description": "Print kitchen order ticket"
  },
  {
    "id": "orders.request_bill",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "request_bill",
    "name": "Request Bill",
    "description": "Send bill request from table"
  },
  {
    "id": "orders.complete",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "complete",
    "name": "Complete Order",
    "description": "Finalize order and trigger inventory deductions"
  },
  {
    "id": "orders.override_price",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "override_price",
    "name": "Override Dish Price",
    "description": "Manually adjust line item selling price during order entry"
  },
  {
    "id": "orders.discount",
    "module": "POS / Orders",
    "submodule": "Terminal",
    "action": "discount",
    "name": "Apply Order Discount",
    "description": "Apply order level discount or complimentary concession"
  },
  {
    "id": "kot.view",
    "module": "Kitchen / KOT",
    "submodule": "KDS",
    "action": "view",
    "name": "View Kitchen Display",
    "description": "Open Kitchen Display System (KDS)"
  },
  {
    "id": "kot.accept",
    "module": "Kitchen / KOT",
    "submodule": "KDS",
    "action": "accept",
    "name": "Accept KOT",
    "description": "Acknowledge kitchen ticket"
  },
  {
    "id": "kot.prepare",
    "module": "Kitchen / KOT",
    "submodule": "KDS",
    "action": "prepare",
    "name": "Start Preparing",
    "description": "Mark items currently being cooked"
  },
  {
    "id": "kot.ready",
    "module": "Kitchen / KOT",
    "submodule": "KDS",
    "action": "ready",
    "name": "Mark Food Ready",
    "description": "Notify waiter that food is ready for pickup"
  },
  {
    "id": "kot.served",
    "module": "Kitchen / KOT",
    "submodule": "KDS",
    "action": "served",
    "name": "Mark Food Served",
    "description": "Confirm dish served to table"
  },
  {
    "id": "kot.cancel",
    "module": "Kitchen / KOT",
    "submodule": "KDS",
    "action": "cancel",
    "name": "Cancel KOT Item",
    "description": "Kitchen rejection of item"
  },
  {
    "id": "kot.reprint",
    "module": "Kitchen / KOT",
    "submodule": "KDS",
    "action": "reprint",
    "name": "Reprint KOT",
    "description": "Reprint kitchen slip"
  },
  {
    "id": "kot.priority",
    "module": "Kitchen / KOT",
    "submodule": "KDS",
    "action": "priority",
    "name": "Set KOT Priority",
    "description": "Mark ticket as Urgent / VIP"
  },
  {
    "id": "billing.view",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "view",
    "name": "View Bills",
    "description": "Access billing center and past invoices"
  },
  {
    "id": "billing.create",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "create",
    "name": "Generate Bill",
    "description": "Create bill for an active order"
  },
  {
    "id": "billing.edit",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "edit",
    "name": "Edit Bill",
    "description": "Modify taxes, charges or items before settlement"
  },
  {
    "id": "billing.print",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "print",
    "name": "Print Bill",
    "description": "Print guest receipt"
  },
  {
    "id": "billing.reprint",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "reprint",
    "name": "Reprint Bill",
    "description": "Reprint duplicate invoice"
  },
  {
    "id": "billing.cancel",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "cancel",
    "name": "Cancel Bill",
    "description": "Void generated invoice"
  },
  {
    "id": "billing.split",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "split",
    "name": "Split Bill",
    "description": "Split bill among multiple guests"
  },
  {
    "id": "billing.merge",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "merge",
    "name": "Merge Bills",
    "description": "Combine multiple bills into single invoice"
  },
  {
    "id": "billing.apply_tax",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "apply_tax",
    "name": "Configure Tax",
    "description": "Apply or exempt specific taxes"
  },
  {
    "id": "billing.request_payment",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "request_payment",
    "name": "Request Payment",
    "description": "Hand over bill to payment register"
  },
  {
    "id": "billing.refund",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "refund",
    "name": "Issue Bill Refund",
    "description": "Process full or partial bill refund"
  },
  {
    "id": "billing.bypass_served",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "bypass_served",
    "name": "Bypass Served Check",
    "description": "Generate bill even if order is not marked served"
  },
  {
    "id": "billing.discount_override",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "discount_override",
    "name": "Discount Limit Override",
    "description": "Apply bill discount exceeding maximum configured threshold"
  },
  {
    "id": "billing.void",
    "module": "Billing",
    "submodule": "Invoices",
    "action": "void",
    "name": "Void Settled Bill",
    "description": "Void or cancel bill after settlement"
  },
  {
    "id": "payment.view",
    "module": "Payment",
    "submodule": "Settlements",
    "action": "view",
    "name": "View Payments",
    "description": "Access payment records and ledger"
  },
  {
    "id": "payment.create",
    "module": "Payment",
    "submodule": "Settlements",
    "action": "create",
    "name": "Process Payment",
    "description": "Collect and settle guest payment"
  },
  {
    "id": "payment.edit",
    "module": "Payment",
    "submodule": "Settlements",
    "action": "edit",
    "name": "Edit Payment",
    "description": "Correct payment transaction details"
  },
  {
    "id": "payment.delete",
    "module": "Payment",
    "submodule": "Settlements",
    "action": "delete",
    "name": "Delete Payment",
    "description": "Remove payment transaction"
  },
  {
    "id": "payment.verify",
    "module": "Payment",
    "submodule": "Settlements",
    "action": "verify",
    "name": "Verify Payment",
    "description": "Confirm digital receipt / UPI transaction"
  },
  {
    "id": "payment.history",
    "module": "Payment",
    "submodule": "Settlements",
    "action": "history",
    "name": "Payment History",
    "description": "View transaction logs"
  },
  {
    "id": "payment.partial",
    "module": "Payment",
    "submodule": "Settlements",
    "action": "partial",
    "name": "Accept Partial Payment",
    "description": "Collect installment on bill"
  },
  {
    "id": "payment.split",
    "module": "Payment",
    "submodule": "Settlements",
    "action": "split",
    "name": "Process Split Payment",
    "description": "Collect mix of Cash, Card and UPI"
  },
  {
    "id": "payment.refund",
    "module": "Payment",
    "submodule": "Settlements",
    "action": "refund",
    "name": "Execute Refund",
    "description": "Refund funds to customer"
  },
  {
    "id": "payment.cash",
    "module": "Payment",
    "submodule": "Methods",
    "action": "cash",
    "name": "Process Cash Payment",
    "description": "Accept Cash Tender"
  },
  {
    "id": "payment.upi",
    "module": "Payment",
    "submodule": "Methods",
    "action": "upi",
    "name": "Process UPI Payment",
    "description": "Accept QR / UPI Tender"
  },
  {
    "id": "payment.card",
    "module": "Payment",
    "submodule": "Methods",
    "action": "card",
    "name": "Process Card Payment",
    "description": "Accept Debit/Credit Card Tender"
  },
  {
    "id": "payment.online",
    "module": "Payment",
    "submodule": "Methods",
    "action": "online",
    "name": "Process Online Payment",
    "description": "Accept Online Gateway Tender"
  },
  {
    "id": "payment.report",
    "module": "Payment",
    "submodule": "Reports",
    "action": "report",
    "name": "View Payment Reports",
    "description": "Generate payment settlement summary"
  },
  {
    "id": "payment.export",
    "module": "Payment",
    "submodule": "Reports",
    "action": "export",
    "name": "Export Payment Data",
    "description": "Export transactions to Excel"
  },
  {
    "id": "inventory.view",
    "module": "Inventory / Stock",
    "submodule": "Stock",
    "action": "view",
    "name": "View Stock",
    "description": "Check live raw material stock levels"
  },
  {
    "id": "inventory.item.create",
    "module": "Inventory / Stock",
    "submodule": "Items",
    "action": "create",
    "name": "Create Stock Item",
    "description": "Add new raw item to catalog"
  },
  {
    "id": "inventory.item.edit",
    "module": "Inventory / Stock",
    "submodule": "Items",
    "action": "edit",
    "name": "Edit Stock Item",
    "description": "Update item units or thresholds"
  },
  {
    "id": "inventory.item.delete",
    "module": "Inventory / Stock",
    "submodule": "Items",
    "action": "delete",
    "name": "Delete Stock Item",
    "description": "Remove stock item"
  },
  {
    "id": "inventory.opening",
    "module": "Inventory / Stock",
    "submodule": "Stock",
    "action": "opening",
    "name": "Set Opening Stock",
    "description": "Initialize inventory counts"
  },
  {
    "id": "inventory.stock_in",
    "module": "Inventory / Stock",
    "submodule": "Transactions",
    "action": "stock_in",
    "name": "Perform Stock In",
    "description": "Receive inward goods manually"
  },
  {
    "id": "inventory.stock_out",
    "module": "Inventory / Stock",
    "submodule": "Transactions",
    "action": "stock_out",
    "name": "Perform Stock Out",
    "description": "Issue stock to kitchen"
  },
  {
    "id": "inventory.adjust",
    "module": "Inventory / Stock",
    "submodule": "Transactions",
    "action": "adjust",
    "name": "Adjust Stock",
    "description": "Record wastage, damage or corrections"
  },
  {
    "id": "inventory.transfer",
    "module": "Inventory / Stock",
    "submodule": "Transactions",
    "action": "transfer",
    "name": "Transfer Stock",
    "description": "Move stock between stores"
  },
  {
    "id": "inventory.closing",
    "module": "Inventory / Stock",
    "submodule": "Transactions",
    "action": "closing",
    "name": "Stock Day Closing",
    "description": "Execute physical count closing"
  },
  {
    "id": "inventory.ledger",
    "module": "Inventory / Stock",
    "submodule": "Ledger",
    "action": "ledger",
    "name": "View Stock Ledger",
    "description": "Audit all item stock movements"
  },
  {
    "id": "inventory.valuation",
    "module": "Inventory / Stock",
    "submodule": "Reports",
    "action": "valuation",
    "name": "View Stock Valuation",
    "description": "View current inventory asset valuation"
  },
  {
    "id": "inventory.report",
    "module": "Inventory / Stock",
    "submodule": "Reports",
    "action": "report",
    "name": "Stock Reports",
    "description": "Export stock consumption reports"
  },
  {
    "id": "inventory.recipe.view",
    "module": "Inventory / Stock",
    "submodule": "Recipes",
    "action": "view",
    "name": "View Recipes",
    "description": "View dish formulas and ingredients"
  },
  {
    "id": "inventory.recipe.create",
    "module": "Inventory / Stock",
    "submodule": "Recipes",
    "action": "create",
    "name": "Create Recipe",
    "description": "Formulate dish recipe"
  },
  {
    "id": "inventory.recipe.edit",
    "module": "Inventory / Stock",
    "submodule": "Recipes",
    "action": "edit",
    "name": "Edit Recipe",
    "description": "Update ingredient portions"
  },
  {
    "id": "inventory.recipe.delete",
    "module": "Inventory / Stock",
    "submodule": "Recipes",
    "action": "delete",
    "name": "Delete Recipe",
    "description": "Remove dish recipe"
  },
  {
    "id": "inventory.recipe.cost",
    "module": "Inventory / Stock",
    "submodule": "Recipes",
    "action": "cost",
    "name": "Calculate Recipe Cost",
    "description": "View food cost % analysis"
  },
  {
    "id": "inventory.recipe.consumption",
    "module": "Inventory / Stock",
    "submodule": "Recipes",
    "action": "consumption",
    "name": "Recipe Auto Consumption",
    "description": "Audit auto inventory deduction"
  },
  {
    "id": "purchase.view",
    "module": "Purchase",
    "submodule": "Procurement",
    "action": "view",
    "name": "View Purchases",
    "description": "Access purchase orders and receipts"
  },
  {
    "id": "purchase.create",
    "module": "Purchase",
    "submodule": "Procurement",
    "action": "create",
    "name": "Create Purchase Request/PO",
    "description": "Initiate vendor purchase order"
  },
  {
    "id": "purchase.edit",
    "module": "Purchase",
    "submodule": "Procurement",
    "action": "edit",
    "name": "Edit Purchase Order",
    "description": "Modify purchase order items"
  },
  {
    "id": "purchase.delete",
    "module": "Purchase",
    "submodule": "Procurement",
    "action": "delete",
    "name": "Delete Purchase Order",
    "description": "Cancel purchase requisition"
  },
  {
    "id": "purchase.approve",
    "module": "Purchase",
    "submodule": "Procurement",
    "action": "approve",
    "name": "Approve Purchase Order",
    "description": "Authorize procurement PO"
  },
  {
    "id": "purchase.receive",
    "module": "Purchase",
    "submodule": "Procurement",
    "action": "receive",
    "name": "Receive Goods (GRN)",
    "description": "Receive vendor shipment and increase stock"
  },
  {
    "id": "purchase.return",
    "module": "Purchase",
    "submodule": "Procurement",
    "action": "return",
    "name": "Purchase Return",
    "description": "Return damaged goods to vendor"
  },
  {
    "id": "purchase.invoice",
    "module": "Purchase",
    "submodule": "Procurement",
    "action": "invoice",
    "name": "Process Purchase Invoice",
    "description": "Record vendor bill and post to Accounts"
  },
  {
    "id": "purchase.payment",
    "module": "Purchase",
    "submodule": "Procurement",
    "action": "payment",
    "name": "Supplier Payment",
    "description": "Pay vendor against invoices"
  },
  {
    "id": "purchase.report",
    "module": "Purchase",
    "submodule": "Reports",
    "action": "report",
    "name": "Purchase Reports",
    "description": "Generate vendor purchase analytics"
  },
  {
    "id": "accounts.dashboard.view",
    "module": "Accounts",
    "submodule": "Dashboard",
    "action": "view",
    "name": "View Accounts Dashboard",
    "description": "Financial KPI summary"
  },
  {
    "id": "accounts.chart.view",
    "module": "Accounts",
    "submodule": "ChartOfAccounts",
    "action": "view",
    "name": "View Chart of Accounts",
    "description": "View financial account tree"
  },
  {
    "id": "accounts.chart.create",
    "module": "Accounts",
    "submodule": "ChartOfAccounts",
    "action": "create",
    "name": "Create Account Head",
    "description": "Add new ledger account"
  },
  {
    "id": "accounts.chart.edit",
    "module": "Accounts",
    "submodule": "ChartOfAccounts",
    "action": "edit",
    "name": "Edit Account Head",
    "description": "Update ledger account details"
  },
  {
    "id": "accounts.chart.delete",
    "module": "Accounts",
    "submodule": "ChartOfAccounts",
    "action": "delete",
    "name": "Delete Account Head",
    "description": "Archive unused account head"
  },
  {
    "id": "accounts.ledger.view",
    "module": "Accounts",
    "submodule": "GeneralLedger",
    "action": "view",
    "name": "View General Ledger",
    "description": "Audit account statements"
  },
  {
    "id": "accounts.ledger.create",
    "module": "Accounts",
    "submodule": "GeneralLedger",
    "action": "create",
    "name": "Post Ledger Entry",
    "description": "Post manual ledger adjustment"
  },
  {
    "id": "accounts.ledger.edit",
    "module": "Accounts",
    "submodule": "GeneralLedger",
    "action": "edit",
    "name": "Edit Ledger Entry",
    "description": "Modify ledger entry"
  },
  {
    "id": "accounts.ledger.export",
    "module": "Accounts",
    "submodule": "GeneralLedger",
    "action": "export",
    "name": "Export Ledger",
    "description": "Download statement in PDF/Excel"
  },
  {
    "id": "accounts.journal.view",
    "module": "Accounts",
    "submodule": "Journal",
    "action": "view",
    "name": "View Journal Entries",
    "description": "View double-entry vouchers"
  },
  {
    "id": "accounts.journal.create",
    "module": "Accounts",
    "submodule": "Journal",
    "action": "create",
    "name": "Create Journal Voucher",
    "description": "Draft debit/credit journal entry"
  },
  {
    "id": "accounts.journal.edit",
    "module": "Accounts",
    "submodule": "Journal",
    "action": "edit",
    "name": "Edit Journal Voucher",
    "description": "Modify journal voucher"
  },
  {
    "id": "accounts.journal.delete",
    "module": "Accounts",
    "submodule": "Journal",
    "action": "delete",
    "name": "Delete Journal Voucher",
    "description": "Void draft journal voucher"
  },
  {
    "id": "accounts.journal.approve",
    "module": "Accounts",
    "submodule": "Journal",
    "action": "approve",
    "name": "Approve Journal Voucher",
    "description": "Post voucher to live books"
  },
  {
    "id": "accounts.income.view",
    "module": "Accounts",
    "submodule": "Income",
    "action": "view",
    "name": "View Income Accounts",
    "description": "Review restaurant revenue breakdown"
  },
  {
    "id": "accounts.income.create",
    "module": "Accounts",
    "submodule": "Income",
    "action": "create",
    "name": "Record Other Income",
    "description": "Post non-sales income"
  },
  {
    "id": "accounts.income.edit",
    "module": "Accounts",
    "submodule": "Income",
    "action": "edit",
    "name": "Edit Income",
    "description": "Modify income entry"
  },
  {
    "id": "accounts.income.delete",
    "module": "Accounts",
    "submodule": "Income",
    "action": "delete",
    "name": "Delete Income",
    "description": "Remove income entry"
  },
  {
    "id": "accounts.income.approve",
    "module": "Accounts",
    "submodule": "Income",
    "action": "approve",
    "name": "Approve Income",
    "description": "Verify income deposit"
  },
  {
    "id": "accounts.receivable.view",
    "module": "Accounts",
    "submodule": "Receivables",
    "action": "view",
    "name": "View Receivables",
    "description": "Review customer credit dues"
  },
  {
    "id": "accounts.receivable.create",
    "module": "Accounts",
    "submodule": "Receivables",
    "action": "create",
    "name": "Create Receivable",
    "description": "Record customer invoice credit"
  },
  {
    "id": "accounts.receivable.edit",
    "module": "Accounts",
    "submodule": "Receivables",
    "action": "edit",
    "name": "Edit Receivable",
    "description": "Update receivable terms"
  },
  {
    "id": "accounts.receivable.collect",
    "module": "Accounts",
    "submodule": "Receivables",
    "action": "collect",
    "name": "Collect Receivable",
    "description": "Settle customer dues"
  },
  {
    "id": "accounts.payable.view",
    "module": "Accounts",
    "submodule": "Payables",
    "action": "view",
    "name": "View Payables",
    "description": "Review outstanding vendor bills"
  },
  {
    "id": "accounts.payable.create",
    "module": "Accounts",
    "submodule": "Payables",
    "action": "create",
    "name": "Create Payable",
    "description": "Record vendor payable obligation"
  },
  {
    "id": "accounts.payable.edit",
    "module": "Accounts",
    "submodule": "Payables",
    "action": "edit",
    "name": "Edit Payable",
    "description": "Update payable schedule"
  },
  {
    "id": "accounts.payable.pay",
    "module": "Accounts",
    "submodule": "Payables",
    "action": "pay",
    "name": "Pay Payable",
    "description": "Execute vendor disbursement"
  },
  {
    "id": "accounts.cashbook.view",
    "module": "Accounts",
    "submodule": "CashBook",
    "action": "view",
    "name": "View Cash Book",
    "description": "Audit daily cash in/out"
  },
  {
    "id": "accounts.cashbook.create",
    "module": "Accounts",
    "submodule": "CashBook",
    "action": "create",
    "name": "Post Cash Book Entry",
    "description": "Record cash deposit or withdrawal"
  },
  {
    "id": "accounts.cashbook.edit",
    "module": "Accounts",
    "submodule": "CashBook",
    "action": "edit",
    "name": "Edit Cash Book Entry",
    "description": "Adjust cash entry"
  },
  {
    "id": "accounts.bankbook.view",
    "module": "Accounts",
    "submodule": "BankBook",
    "action": "view",
    "name": "View Bank Book",
    "description": "Audit bank transfers and cheques"
  },
  {
    "id": "accounts.bankbook.create",
    "module": "Accounts",
    "submodule": "BankBook",
    "action": "create",
    "name": "Post Bank Transaction",
    "description": "Record bank transfer"
  },
  {
    "id": "accounts.bankbook.edit",
    "module": "Accounts",
    "submodule": "BankBook",
    "action": "edit",
    "name": "Edit Bank Transaction",
    "description": "Adjust bank entry"
  },
  {
    "id": "accounts.tax.view",
    "module": "Accounts",
    "submodule": "Taxation",
    "action": "view",
    "name": "View Tax Reports",
    "description": "Review GST / VAT collection & liability"
  },
  {
    "id": "accounts.tax.create",
    "module": "Accounts",
    "submodule": "Taxation",
    "action": "create",
    "name": "File Tax Entry",
    "description": "Post tax settlement voucher"
  },
  {
    "id": "accounts.tax.edit",
    "module": "Accounts",
    "submodule": "Taxation",
    "action": "edit",
    "name": "Edit Tax Entry",
    "description": "Adjust tax calculation"
  },
  {
    "id": "accounts.dayclosing.view",
    "module": "Accounts",
    "submodule": "DayClosing",
    "action": "view",
    "name": "View Day Closing Register",
    "description": "Inspect daily shift & register closings"
  },
  {
    "id": "accounts.dayclosing.execute",
    "module": "Accounts",
    "submodule": "DayClosing",
    "action": "execute",
    "name": "Execute Day Closing",
    "description": "Run end-of-day register closing summary"
  },
  {
    "id": "accounts.dayclosing.approve",
    "module": "Accounts",
    "submodule": "DayClosing",
    "action": "approve",
    "name": "Approve Day Closing",
    "description": "Manager sign-off on day closing"
  },
  {
    "id": "accounts.dayclosing.reopen",
    "module": "Accounts",
    "submodule": "DayClosing",
    "action": "reopen",
    "name": "Reopen Day Closing",
    "description": "Emergency reopen of locked day closing"
  },
  {
    "id": "accounts.report.view",
    "module": "Accounts",
    "submodule": "Reports",
    "action": "view",
    "name": "View Financial Statements",
    "description": "View Balance Sheet and Profit & Loss"
  },
  {
    "id": "accounts.report.export",
    "module": "Accounts",
    "submodule": "Reports",
    "action": "export",
    "name": "Export Financials",
    "description": "Export trial balance & P&L"
  },
  {
    "id": "expense.view",
    "module": "Expenses",
    "submodule": "Vouchers",
    "action": "view",
    "name": "View Expenses",
    "description": "Access expense vouchers and bills"
  },
  {
    "id": "expense.create",
    "module": "Expenses",
    "submodule": "Vouchers",
    "action": "create",
    "name": "Create Expense Voucher",
    "description": "Record operational expense"
  },
  {
    "id": "expense.edit",
    "module": "Expenses",
    "submodule": "Vouchers",
    "action": "edit",
    "name": "Edit Expense Voucher",
    "description": "Update expense bill"
  },
  {
    "id": "expense.delete",
    "module": "Expenses",
    "submodule": "Vouchers",
    "action": "delete",
    "name": "Delete Expense Voucher",
    "description": "Void expense voucher"
  },
  {
    "id": "expense.approve",
    "module": "Expenses",
    "submodule": "Vouchers",
    "action": "approve",
    "name": "Approve Expense Voucher",
    "description": "Manager authorization for expense"
  },
  {
    "id": "expense.reject",
    "module": "Expenses",
    "submodule": "Vouchers",
    "action": "reject",
    "name": "Reject Expense Voucher",
    "description": "Deny expense claim"
  },
  {
    "id": "expense.receipt",
    "module": "Expenses",
    "submodule": "Vouchers",
    "action": "receipt",
    "name": "Upload/View Receipt",
    "description": "Attach physical bill scans"
  },
  {
    "id": "expense.report",
    "module": "Expenses",
    "submodule": "Reports",
    "action": "report",
    "name": "Expense Reports",
    "description": "Analyze overhead spending breakdown"
  },
  {
    "id": "employee.view",
    "module": "Employees",
    "submodule": "Staff",
    "action": "view",
    "name": "View Staff Directory",
    "description": "View employee records"
  },
  {
    "id": "employee.create",
    "module": "Employees",
    "submodule": "Staff",
    "action": "create",
    "name": "Onboard Employee",
    "description": "Register new staff member"
  },
  {
    "id": "employee.edit",
    "module": "Employees",
    "submodule": "Staff",
    "action": "edit",
    "name": "Edit Employee Record",
    "description": "Update designation and bio"
  },
  {
    "id": "employee.delete",
    "module": "Employees",
    "submodule": "Staff",
    "action": "delete",
    "name": "Offboard Employee",
    "description": "Terminate/archive staff member"
  },
  {
    "id": "employee.documents",
    "module": "Employees",
    "submodule": "Staff",
    "action": "documents",
    "name": "Manage KYC Documents",
    "description": "View/upload identity documents"
  },
  {
    "id": "employee.bank_details",
    "module": "Employees",
    "submodule": "Staff",
    "action": "bank_details",
    "name": "Manage Bank Details",
    "description": "Update salary payout bank account"
  },
  {
    "id": "employee.salary.view",
    "module": "Employees",
    "submodule": "Compensation",
    "action": "view",
    "name": "View Salary Details",
    "description": "View base salary and CTC"
  },
  {
    "id": "employee.salary.edit",
    "module": "Employees",
    "submodule": "Compensation",
    "action": "edit",
    "name": "Edit Salary Structure",
    "description": "Update salary allowances and deductions"
  },
  {
    "id": "attendance.view",
    "module": "Attendance",
    "submodule": "Logs",
    "action": "view",
    "name": "View Daily Attendance",
    "description": "Inspect staff check-in times and punches"
  },
  {
    "id": "attendance.create",
    "module": "Attendance",
    "submodule": "Logs",
    "action": "create",
    "name": "Check In / Out",
    "description": "Record attendance punch"
  },
  {
    "id": "attendance.edit",
    "module": "Attendance",
    "submodule": "Logs",
    "action": "edit",
    "name": "Edit Attendance",
    "description": "Modify attendance hours"
  },
  {
    "id": "attendance.delete",
    "module": "Attendance",
    "submodule": "Logs",
    "action": "delete",
    "name": "Delete Attendance Record",
    "description": "Remove faulty punch"
  },
  {
    "id": "attendance.correction",
    "module": "Attendance",
    "submodule": "Logs",
    "action": "correction",
    "name": "Request Attendance Correction",
    "description": "Submit punch adjustment"
  },
  {
    "id": "attendance.approve",
    "module": "Attendance",
    "submodule": "Logs",
    "action": "approve",
    "name": "Approve Attendance & OT",
    "description": "Approve overtime and attendance corrections"
  },
  {
    "id": "attendance.report",
    "module": "Attendance",
    "submodule": "Reports",
    "action": "report",
    "name": "Attendance Reports",
    "description": "Export monthly attendance sheet"
  },
  {
    "id": "leave.view",
    "module": "Leave",
    "submodule": "Requests",
    "action": "view",
    "name": "View Leave Applications",
    "description": "View leave requests and balances"
  },
  {
    "id": "leave.create",
    "module": "Leave",
    "submodule": "Requests",
    "action": "create",
    "name": "Apply for Leave",
    "description": "Submit leave request"
  },
  {
    "id": "leave.edit",
    "module": "Leave",
    "submodule": "Requests",
    "action": "edit",
    "name": "Edit Leave Application",
    "description": "Update leave application dates"
  },
  {
    "id": "leave.approve",
    "module": "Leave",
    "submodule": "Requests",
    "action": "approve",
    "name": "Approve Leave",
    "description": "Grant requested leave"
  },
  {
    "id": "leave.reject",
    "module": "Leave",
    "submodule": "Requests",
    "action": "reject",
    "name": "Reject Leave",
    "description": "Decline leave request"
  },
  {
    "id": "leave.balance",
    "module": "Leave",
    "submodule": "Balance",
    "action": "balance",
    "name": "Manage Leave Balance",
    "description": "Credit or adjust leave entitlements"
  },
  {
    "id": "leave.report",
    "module": "Leave",
    "submodule": "Reports",
    "action": "report",
    "name": "Leave Reports",
    "description": "Export staff leave ledger"
  },
  {
    "id": "payroll.view",
    "module": "Payroll",
    "submodule": "Processing",
    "action": "view",
    "name": "View Payroll Runs",
    "description": "View monthly payroll sheets"
  },
  {
    "id": "payroll.create",
    "module": "Payroll",
    "submodule": "Processing",
    "action": "create",
    "name": "Generate Payroll Run",
    "description": "Calculate monthly payroll"
  },
  {
    "id": "payroll.edit",
    "module": "Payroll",
    "submodule": "Processing",
    "action": "edit",
    "name": "Edit Payroll Calculation",
    "description": "Adjust bonus or deduction lines"
  },
  {
    "id": "payroll.process",
    "module": "Payroll",
    "submodule": "Processing",
    "action": "process",
    "name": "Process Payroll Calculation",
    "description": "Run automatic gross-to-net computation"
  },
  {
    "id": "payroll.approve",
    "module": "Payroll",
    "submodule": "Processing",
    "action": "approve",
    "name": "Approve Payroll & Disburse",
    "description": "Authorize disbursement and post to Accounts"
  },
  {
    "id": "payroll.salary.view",
    "module": "Payroll",
    "submodule": "Salaries",
    "action": "view",
    "name": "View Net Salaries",
    "description": "View employee payout figures"
  },
  {
    "id": "payroll.salary.edit",
    "module": "Payroll",
    "submodule": "Salaries",
    "action": "edit",
    "name": "Adjust Payout Figures",
    "description": "Manual payout adjustment"
  },
  {
    "id": "payroll.payslip",
    "module": "Payroll",
    "submodule": "Payslips",
    "action": "payslip",
    "name": "Generate/Print Payslips",
    "description": "Print employee payslips"
  },
  {
    "id": "payroll.export",
    "module": "Payroll",
    "submodule": "Reports",
    "action": "export",
    "name": "Export Payroll Bank File",
    "description": "Export bank batch salary transfer file"
  },
  {
    "id": "reports.sales.view",
    "module": "Reports",
    "submodule": "Sales",
    "action": "view",
    "name": "View Sales Reports",
    "description": "Access itemized, category and daily sales reports"
  },
  {
    "id": "reports.sales.export",
    "module": "Reports",
    "submodule": "Sales",
    "action": "export",
    "name": "Export Sales Reports",
    "description": "Download sales reports in Excel/PDF"
  },
  {
    "id": "reports.payment.view",
    "module": "Reports",
    "submodule": "Payments",
    "action": "view",
    "name": "View Payment Reports",
    "description": "Access settlement and refund breakdown"
  },
  {
    "id": "reports.payment.export",
    "module": "Reports",
    "submodule": "Payments",
    "action": "export",
    "name": "Export Payment Reports",
    "description": "Download payment summaries"
  },
  {
    "id": "reports.inventory.view",
    "module": "Reports",
    "submodule": "Inventory",
    "action": "view",
    "name": "View Inventory Reports",
    "description": "Access stock, wastage and consumption reports"
  },
  {
    "id": "reports.inventory.export",
    "module": "Reports",
    "submodule": "Inventory",
    "action": "export",
    "name": "Export Inventory Reports",
    "description": "Download stock reports"
  },
  {
    "id": "reports.accounts.view",
    "module": "Reports",
    "submodule": "Accounts",
    "action": "view",
    "name": "View Financial Reports",
    "description": "Access P&L, balance sheet and trial balance"
  },
  {
    "id": "reports.accounts.export",
    "module": "Reports",
    "submodule": "Accounts",
    "action": "export",
    "name": "Export Financial Reports",
    "description": "Download financial statements"
  },
  {
    "id": "reports.payroll.view",
    "module": "Reports",
    "submodule": "HR",
    "action": "view",
    "name": "View HR & Payroll Reports",
    "description": "Access staff attendance and wage reports"
  },
  {
    "id": "reports.payroll.export",
    "module": "Reports",
    "submodule": "HR",
    "action": "export",
    "name": "Export HR Reports",
    "description": "Download wage registers"
  },
  {
    "id": "reports.import",
    "module": "Reports",
    "submodule": "Import",
    "action": "import",
    "name": "Bulk Import Data",
    "description": "Upload Excel/CSV bulk data into reports and logs"
  },
  {
    "id": "users.view",
    "module": "Users & Roles",
    "submodule": "Users",
    "action": "view",
    "name": "View User Accounts",
    "description": "View system login users"
  },
  {
    "id": "users.create",
    "module": "Users & Roles",
    "submodule": "Users",
    "action": "create",
    "name": "Create User Account",
    "description": "Provision new login credentials"
  },
  {
    "id": "users.edit",
    "module": "Users & Roles",
    "submodule": "Users",
    "action": "edit",
    "name": "Edit User Account",
    "description": "Update profile or status"
  },
  {
    "id": "users.delete",
    "module": "Users & Roles",
    "submodule": "Users",
    "action": "delete",
    "name": "Delete User Account",
    "description": "Revoke user account"
  },
  {
    "id": "roles.view",
    "module": "Users & Roles",
    "submodule": "Roles",
    "action": "view",
    "name": "View Roles",
    "description": "View system roles"
  },
  {
    "id": "roles.create",
    "module": "Users & Roles",
    "submodule": "Roles",
    "action": "create",
    "name": "Create Role",
    "description": "Define custom role"
  },
  {
    "id": "roles.edit",
    "module": "Users & Roles",
    "submodule": "Roles",
    "action": "edit",
    "name": "Edit Role",
    "description": "Modify role details"
  },
  {
    "id": "roles.delete",
    "module": "Users & Roles",
    "submodule": "Roles",
    "action": "delete",
    "name": "Delete Role",
    "description": "Remove custom role"
  },
  {
    "id": "roles.permissions",
    "module": "Users & Roles",
    "submodule": "Roles",
    "action": "permissions",
    "name": "Configure Role Permissions Tree",
    "description": "Assign granular permissions to role"
  },
  {
    "id": "notification.view",
    "module": "Notifications",
    "submodule": "Feed",
    "action": "view",
    "name": "View Notifications",
    "description": "Access notification alerts center"
  },
  {
    "id": "notification.send",
    "module": "Notifications",
    "submodule": "Feed",
    "action": "send",
    "name": "Send Notification",
    "description": "Send targeted internal message"
  },
  {
    "id": "notification.broadcast",
    "module": "Notifications",
    "submodule": "Feed",
    "action": "broadcast",
    "name": "Broadcast Announcement",
    "description": "Broadcast alert to all terminals"
  },
  {
    "id": "notification.delete",
    "module": "Notifications",
    "submodule": "Feed",
    "action": "delete",
    "name": "Clear Notifications",
    "description": "Dismiss/delete notification"
  },
  {
    "id": "settings.view",
    "module": "Settings",
    "submodule": "Config",
    "action": "view",
    "name": "View System Settings",
    "description": "Inspect restaurant profile and printer configuration"
  },
  {
    "id": "settings.edit",
    "module": "Settings",
    "submodule": "Config",
    "action": "edit",
    "name": "Modify System Settings",
    "description": "Update taxes, currency, and business profile"
  },
  {
    "id": "settings.reset",
    "module": "Settings",
    "submodule": "Config",
    "action": "reset",
    "name": "Reset System Settings",
    "description": "Restore all store parameters to factory defaults"
  },
  {
    "id": "audit.view",
    "module": "Audit Logs",
    "submodule": "Security",
    "action": "view",
    "name": "View Audit Logs",
    "description": "Audit all sensitive mutations and logins"
  },
  {
    "id": "audit.export",
    "module": "Audit Logs",
    "submodule": "Security",
    "action": "export",
    "name": "Export Audit Trail",
    "description": "Download immutable audit logs"
  },
  {
    "id": "system.control.view",
    "module": "System Control",
    "submodule": "Status",
    "action": "view",
    "name": "View System Switchboard",
    "description": "Inspect operational health and active sessions"
  },
  {
    "id": "system.maintenance.enable",
    "module": "System Control",
    "submodule": "Maintenance",
    "action": "enable",
    "name": "Enable Maintenance Mode",
    "description": "Put ERP into maintenance mode"
  },
  {
    "id": "system.maintenance.disable",
    "module": "System Control",
    "submodule": "Maintenance",
    "action": "disable",
    "name": "Disable Maintenance Mode",
    "description": "Restore ERP to ONLINE status"
  },
  {
    "id": "system.maintenance.schedule",
    "module": "System Control",
    "submodule": "Maintenance",
    "action": "schedule",
    "name": "Schedule Maintenance",
    "description": "Set upcoming maintenance window"
  },
  {
    "id": "system.lockdown.enable",
    "module": "System Control",
    "submodule": "Emergency",
    "action": "enable",
    "name": "Trigger Emergency Lockdown",
    "description": "Instantly lock all user sessions"
  },
  {
    "id": "system.lockdown.disable",
    "module": "System Control",
    "submodule": "Emergency",
    "action": "disable",
    "name": "Lift Emergency Lockdown",
    "description": "Resume normal operations"
  },
  {
    "id": "system.recovery.execute",
    "module": "System Control",
    "submodule": "Recovery",
    "action": "execute",
    "name": "Execute Data Recovery",
    "description": "Trigger automatic consistency checks"
  },
  {
    "id": "daily_menu.view",
    "module": "Daily Menu",
    "submodule": "Scheduler",
    "action": "view",
    "name": "View Daily Menu",
    "description": "Access day-wise rotating daily menu schedule"
  },
  {
    "id": "daily_menu.edit",
    "module": "Daily Menu",
    "submodule": "Scheduler",
    "action": "edit",
    "name": "Configure Daily Menu",
    "description": "Assign dishes, copy menu across days, and toggle strict mode"
  },
  {
    "id": "database.tools.view",
    "module": "Database Tools",
    "submodule": "Explorer",
    "action": "view",
    "name": "View Database Schema",
    "description": "Inspect MongoDB collections, document counts and schema"
  },
  {
    "id": "database.tools.query",
    "module": "Database Tools",
    "submodule": "Explorer",
    "action": "query",
    "name": "Query Collection Records",
    "description": "Search, filter and inspect collection documents"
  },
  {
    "id": "database.tools.create",
    "module": "Database Tools",
    "submodule": "CRUD",
    "action": "create",
    "name": "Direct Insert Record",
    "description": "Manually insert document into MongoDB collection"
  },
  {
    "id": "database.tools.edit",
    "module": "Database Tools",
    "submodule": "CRUD",
    "action": "edit",
    "name": "Direct Update Record",
    "description": "Manually modify document in MongoDB collection"
  },
  {
    "id": "database.tools.delete",
    "module": "Database Tools",
    "submodule": "CRUD",
    "action": "delete",
    "name": "Direct Delete Record",
    "description": "Delete individual document from MongoDB"
  },
  {
    "id": "database.tools.export",
    "module": "Database Tools",
    "submodule": "Migration",
    "action": "export",
    "name": "Export Collections",
    "description": "Export collection records to JSON format"
  },
  {
    "id": "database.tools.import",
    "module": "Database Tools",
    "submodule": "Migration",
    "action": "import",
    "name": "Import Collections",
    "description": "Import and merge JSON documents into collections"
  },
  {
    "id": "database.tools.purge",
    "module": "Database Tools",
    "submodule": "Maintenance",
    "action": "purge",
    "name": "Purge Transactional Data",
    "description": "Permanent date-wise deletion of orders, bills, and logs"
  },
  {
    "id": "system.diagnostics.view",
    "module": "System Diagnostics",
    "submodule": "Telemetry",
    "action": "view",
    "name": "View Diagnostics",
    "description": "Inspect API gateway latency and runtime telemetry"
  },
  {
    "id": "system.diagnostics.run",
    "module": "System Diagnostics",
    "submodule": "Telemetry",
    "action": "run",
    "name": "Execute Health Probes",
    "description": "Trigger real-time network and database health probes"
  },
  {
    "id": "system.diagnostics.cache",
    "module": "System Diagnostics",
    "submodule": "Telemetry",
    "action": "cache",
    "name": "Manage Cache & Memory",
    "description": "Inspect and clear runtime application cache"
  }
]

DEFAULT_ROLES = [
  {
    "id": "role_super_admin",
    "name": "Super Admin",
    "description": "Unrestricted enterprise super administrator with full system privileges",
    "is_system": True,
    "permissions": [
      "dashboard.view",
      "dashboard.sales.view",
      "dashboard.orders.view",
      "dashboard.booking.view",
      "dashboard.inventory.view",
      "dashboard.accounts.view",
      "dashboard.payroll.view",
      "dashboard.reports.view",
      "masters.customer.view",
      "masters.customer.create",
      "masters.customer.edit",
      "masters.customer.delete",
      "masters.customer.history",
      "masters.employee.view",
      "masters.employee.create",
      "masters.employee.edit",
      "masters.employee.delete",
      "masters.supplier.view",
      "masters.supplier.create",
      "masters.supplier.edit",
      "masters.supplier.delete",
      "masters.supplier.ledger",
      "masters.menu.view",
      "masters.menu.create",
      "masters.menu.edit",
      "masters.menu.delete",
      "masters.menu.price",
      "masters.menu.availability",
      "masters.table.view",
      "masters.table.create",
      "masters.table.edit",
      "masters.table.delete",
      "masters.table.status",
      "booking.view",
      "booking.create",
      "booking.edit",
      "booking.delete",
      "booking.confirm",
      "booking.cancel",
      "booking.assign_table",
      "booking.change_table",
      "booking.checkin",
      "booking.no_show",
      "booking.complete",
      "booking.print",
      "booking.export",
      "token.view",
      "token.create",
      "token.call",
      "token.recall",
      "token.skip",
      "token.seat",
      "token.complete",
      "token.history",
      "token.display",
      "tables.view",
      "tables.assign",
      "tables.transfer",
      "tables.merge",
      "tables.split",
      "tables.status",
      "tables.history",
      "orders.view",
      "orders.create",
      "orders.edit",
      "orders.item_add",
      "orders.item_remove",
      "orders.hold",
      "orders.resume",
      "orders.cancel",
      "orders.send_kot",
      "orders.print_kot",
      "orders.request_bill",
      "orders.complete",
      "orders.override_price",
      "orders.discount",
      "kot.view",
      "kot.accept",
      "kot.prepare",
      "kot.ready",
      "kot.served",
      "kot.cancel",
      "kot.reprint",
      "kot.priority",
      "billing.view",
      "billing.create",
      "billing.edit",
      "billing.print",
      "billing.reprint",
      "billing.cancel",
      "billing.split",
      "billing.merge",
      "billing.apply_tax",
      "billing.request_payment",
      "billing.refund",
      "billing.bypass_served",
      "billing.discount_override",
      "billing.void",
      "payment.view",
      "payment.create",
      "payment.edit",
      "payment.delete",
      "payment.verify",
      "payment.history",
      "payment.partial",
      "payment.split",
      "payment.refund",
      "payment.cash",
      "payment.upi",
      "payment.card",
      "payment.online",
      "payment.report",
      "payment.export",
      "inventory.view",
      "inventory.item.create",
      "inventory.item.edit",
      "inventory.item.delete",
      "inventory.opening",
      "inventory.stock_in",
      "inventory.stock_out",
      "inventory.adjust",
      "inventory.transfer",
      "inventory.closing",
      "inventory.ledger",
      "inventory.valuation",
      "inventory.report",
      "inventory.recipe.view",
      "inventory.recipe.create",
      "inventory.recipe.edit",
      "inventory.recipe.delete",
      "inventory.recipe.cost",
      "inventory.recipe.consumption",
      "purchase.view",
      "purchase.create",
      "purchase.edit",
      "purchase.delete",
      "purchase.approve",
      "purchase.receive",
      "purchase.return",
      "purchase.invoice",
      "purchase.payment",
      "purchase.report",
      "accounts.dashboard.view",
      "accounts.chart.view",
      "accounts.chart.create",
      "accounts.chart.edit",
      "accounts.chart.delete",
      "accounts.ledger.view",
      "accounts.ledger.create",
      "accounts.ledger.edit",
      "accounts.ledger.export",
      "accounts.journal.view",
      "accounts.journal.create",
      "accounts.journal.edit",
      "accounts.journal.delete",
      "accounts.journal.approve",
      "accounts.income.view",
      "accounts.income.create",
      "accounts.income.edit",
      "accounts.income.delete",
      "accounts.income.approve",
      "accounts.receivable.view",
      "accounts.receivable.create",
      "accounts.receivable.edit",
      "accounts.receivable.collect",
      "accounts.payable.view",
      "accounts.payable.create",
      "accounts.payable.edit",
      "accounts.payable.pay",
      "accounts.cashbook.view",
      "accounts.cashbook.create",
      "accounts.cashbook.edit",
      "accounts.bankbook.view",
      "accounts.bankbook.create",
      "accounts.bankbook.edit",
      "accounts.tax.view",
      "accounts.tax.create",
      "accounts.tax.edit",
      "accounts.dayclosing.view",
      "accounts.dayclosing.execute",
      "accounts.dayclosing.approve",
      "accounts.dayclosing.reopen",
      "accounts.report.view",
      "accounts.report.export",
      "expense.view",
      "expense.create",
      "expense.edit",
      "expense.delete",
      "expense.approve",
      "expense.reject",
      "expense.receipt",
      "expense.report",
      "employee.view",
      "employee.create",
      "employee.edit",
      "employee.delete",
      "employee.documents",
      "employee.bank_details",
      "employee.salary.view",
      "employee.salary.edit",
      "attendance.view",
      "attendance.create",
      "attendance.edit",
      "attendance.delete",
      "attendance.correction",
      "attendance.approve",
      "attendance.report",
      "leave.view",
      "leave.create",
      "leave.edit",
      "leave.approve",
      "leave.reject",
      "leave.balance",
      "leave.report",
      "payroll.view",
      "payroll.create",
      "payroll.edit",
      "payroll.process",
      "payroll.approve",
      "payroll.salary.view",
      "payroll.salary.edit",
      "payroll.payslip",
      "payroll.export",
      "reports.sales.view",
      "reports.sales.export",
      "reports.payment.view",
      "reports.payment.export",
      "reports.inventory.view",
      "reports.inventory.export",
      "reports.accounts.view",
      "reports.accounts.export",
      "reports.payroll.view",
      "reports.payroll.export",
      "reports.import",
      "users.view",
      "users.create",
      "users.edit",
      "users.delete",
      "roles.view",
      "roles.create",
      "roles.edit",
      "roles.delete",
      "roles.permissions",
      "notification.view",
      "notification.send",
      "notification.broadcast",
      "notification.delete",
      "settings.view",
      "settings.edit",
      "settings.reset",
      "audit.view",
      "audit.export",
      "system.control.view",
      "system.maintenance.enable",
      "system.maintenance.disable",
      "system.maintenance.schedule",
      "system.lockdown.enable",
      "system.lockdown.disable",
      "system.recovery.execute",
      "daily_menu.view",
      "daily_menu.edit",
      "database.tools.view",
      "database.tools.query",
      "database.tools.create",
      "database.tools.edit",
      "database.tools.delete",
      "database.tools.export",
      "database.tools.import",
      "database.tools.purge",
      "system.diagnostics.view",
      "system.diagnostics.run",
      "system.diagnostics.cache"
    ]
  },
  {
    "id": "role_manager",
    "name": "Manager",
    "description": "Floor and operations manager overseeing POS, kitchen, reservations, discounts & day closing",
    "is_system": True,
    "permissions": [
      "dashboard.view",
      "dashboard.sales.view",
      "dashboard.orders.view",
      "dashboard.booking.view",
      "dashboard.inventory.view",
      "dashboard.reports.view",
      "masters.customer.view",
      "masters.customer.create",
      "masters.customer.edit",
      "masters.customer.history",
      "masters.supplier.view",
      "masters.menu.view",
      "masters.menu.create",
      "masters.menu.edit",
      "masters.menu.delete",
      "masters.menu.availability",
      "masters.table.view",
      "masters.table.status",
      "daily_menu.view",
      "daily_menu.edit",
      "booking.view",
      "booking.create",
      "booking.edit",
      "booking.confirm",
      "booking.cancel",
      "booking.assign_table",
      "booking.change_table",
      "booking.checkin",
      "booking.no_show",
      "booking.complete",
      "booking.print",
      "booking.export",
      "token.view",
      "token.create",
      "token.call",
      "token.recall",
      "token.skip",
      "token.seat",
      "token.complete",
      "token.history",
      "token.display",
      "tables.view",
      "tables.assign",
      "tables.transfer",
      "tables.merge",
      "tables.split",
      "tables.status",
      "tables.history",
      "orders.view",
      "orders.create",
      "orders.edit",
      "orders.item_add",
      "orders.item_remove",
      "orders.hold",
      "orders.resume",
      "orders.cancel",
      "orders.send_kot",
      "orders.print_kot",
      "orders.request_bill",
      "orders.complete",
      "orders.override_price",
      "orders.discount",
      "kot.view",
      "kot.accept",
      "kot.prepare",
      "kot.ready",
      "kot.served",
      "kot.reprint",
      "kot.priority",
      "billing.view",
      "billing.create",
      "billing.edit",
      "billing.print",
      "billing.reprint",
      "billing.cancel",
      "billing.split",
      "billing.merge",
      "billing.apply_tax",
      "billing.request_payment",
      "billing.refund",
      "billing.bypass_served",
      "billing.discount_override",
      "payment.view",
      "payment.create",
      "payment.edit",
      "payment.verify",
      "payment.history",
      "payment.partial",
      "payment.split",
      "payment.refund",
      "payment.cash",
      "payment.upi",
      "payment.card",
      "payment.online",
      "payment.report",
      "payment.export",
      "inventory.view",
      "inventory.stock_in",
      "inventory.stock_out",
      "inventory.adjust",
      "inventory.transfer",
      "inventory.ledger",
      "inventory.valuation",
      "inventory.recipe.view",
      "inventory.recipe.cost",
      "purchase.view",
      "purchase.create",
      "purchase.approve",
      "purchase.receive",
      "accounts.dashboard.view",
      "accounts.dayclosing.view",
      "accounts.dayclosing.execute",
      "accounts.dayclosing.approve",
      "expense.view",
      "expense.create",
      "expense.approve",
      "expense.receipt",
      "expense.report",
      "employee.view",
      "attendance.view",
      "attendance.create",
      "attendance.approve",
      "attendance.report",
      "leave.view",
      "leave.approve",
      "leave.reject",
      "leave.report",
      "reports.sales.view",
      "reports.sales.export",
      "reports.payment.view",
      "reports.payment.export",
      "reports.inventory.view",
      "reports.import",
      "settings.view",
      "database.tools.view",
      "database.tools.query",
      "database.tools.export",
      "system.diagnostics.view",
      "system.diagnostics.run",
      "notification.view",
      "notification.send",
      "audit.view"
    ]
  },
  {
    "id": "role_cashier",
    "name": "Cashier",
    "description": "Front-of-house cashier managing POS orders, bill generation, and payments",
    "is_system": True,
    "permissions": [
      "dashboard.view",
      "dashboard.sales.view",
      "dashboard.orders.view",
      "masters.customer.view",
      "masters.customer.create",
      "masters.menu.view",
      "masters.table.view",
      "daily_menu.view",
      "booking.view",
      "tables.view",
      "tables.status",
      "orders.view",
      "orders.create",
      "orders.edit",
      "orders.item_add",
      "orders.hold",
      "orders.resume",
      "orders.send_kot",
      "orders.print_kot",
      "orders.request_bill",
      "orders.complete",
      "orders.discount",
      "billing.view",
      "billing.create",
      "billing.print",
      "billing.reprint",
      "billing.split",
      "billing.request_payment",
      "payment.view",
      "payment.create",
      "payment.verify",
      "payment.history",
      "payment.partial",
      "payment.split",
      "payment.cash",
      "payment.upi",
      "payment.card",
      "payment.online",
      "payment.report",
      "accounts.dashboard.view",
      "accounts.cashbook.view",
      "accounts.dayclosing.view",
      "accounts.dayclosing.execute",
      "notification.view"
    ]
  },
  {
    "id": "role_waiter",
    "name": "Waiter",
    "description": "Floor staff handling table seating, taking customer orders, and food delivery",
    "is_system": True,
    "permissions": [
      "dashboard.view",
      "dashboard.orders.view",
      "masters.menu.view",
      "masters.table.view",
      "daily_menu.view",
      "tables.view",
      "tables.assign",
      "tables.status",
      "orders.view",
      "orders.create",
      "orders.item_add",
      "orders.send_kot",
      "orders.request_bill",
      "kot.view",
      "kot.served",
      "notification.view"
    ]
  },
  {
    "id": "role_kitchen",
    "name": "Kitchen Staff",
    "description": "Culinary team managing kitchen orders, cooking stages and food readiness on KDS",
    "is_system": True,
    "permissions": [
      "dashboard.view",
      "dashboard.orders.view",
      "masters.menu.view",
      "masters.menu.availability",
      "daily_menu.view",
      "kot.view",
      "kot.accept",
      "kot.prepare",
      "kot.ready",
      "kot.cancel",
      "kot.reprint",
      "kot.priority",
      "inventory.recipe.view",
      "notification.view"
    ]
  },
  {
    "id": "role_inventory",
    "name": "Inventory Manager",
    "description": "Stores and stock manager controlling inward/outward materials and recipe formulas",
    "is_system": True,
    "permissions": [
      "dashboard.view",
      "dashboard.inventory.view",
      "masters.supplier.view",
      "masters.supplier.create",
      "masters.supplier.edit",
      "masters.supplier.ledger",
      "inventory.view",
      "inventory.item.create",
      "inventory.item.edit",
      "inventory.item.delete",
      "inventory.opening",
      "inventory.stock_in",
      "inventory.stock_out",
      "inventory.adjust",
      "inventory.transfer",
      "inventory.closing",
      "inventory.ledger",
      "inventory.valuation",
      "inventory.report",
      "inventory.recipe.view",
      "inventory.recipe.create",
      "inventory.recipe.edit",
      "inventory.recipe.delete",
      "inventory.recipe.cost",
      "inventory.recipe.consumption",
      "purchase.view",
      "purchase.create",
      "purchase.receive",
      "purchase.return",
      "purchase.report",
      "reports.inventory.view",
      "reports.inventory.export",
      "notification.view"
    ]
  },
  {
    "id": "role_purchase",
    "name": "Purchase Manager",
    "description": "Procurement head handling vendor requisitions, purchase orders, and supplier payables",
    "is_system": True,
    "permissions": [
      "dashboard.view",
      "dashboard.inventory.view",
      "masters.supplier.view",
      "masters.supplier.create",
      "masters.supplier.edit",
      "masters.supplier.ledger",
      "inventory.view",
      "inventory.valuation",
      "purchase.view",
      "purchase.create",
      "purchase.edit",
      "purchase.approve",
      "purchase.receive",
      "purchase.return",
      "purchase.invoice",
      "purchase.payment",
      "purchase.report",
      "reports.inventory.view",
      "notification.view"
    ]
  },
  {
    "id": "role_accountant",
    "name": "Accountant",
    "description": "Senior finance officer managing general ledger, journal entries, taxes, P&L, and balance sheet",
    "is_system": True,
    "permissions": [
      "dashboard.view",
      "dashboard.sales.view",
      "dashboard.accounts.view",
      "dashboard.payroll.view",
      "dashboard.reports.view",
      "masters.customer.view",
      "masters.supplier.view",
      "masters.supplier.ledger",
      "billing.view",
      "billing.print",
      "payment.view",
      "payment.verify",
      "payment.history",
      "payment.report",
      "payment.export",
      "accounts.dashboard.view",
      "accounts.chart.view",
      "accounts.chart.create",
      "accounts.chart.edit",
      "accounts.chart.delete",
      "accounts.ledger.view",
      "accounts.ledger.create",
      "accounts.ledger.edit",
      "accounts.ledger.export",
      "accounts.journal.view",
      "accounts.journal.create",
      "accounts.journal.edit",
      "accounts.journal.delete",
      "accounts.journal.approve",
      "accounts.income.view",
      "accounts.income.create",
      "accounts.income.edit",
      "accounts.income.approve",
      "accounts.expense.view",
      "accounts.expense.create",
      "accounts.expense.edit",
      "accounts.expense.approve",
      "accounts.receivable.view",
      "accounts.receivable.create",
      "accounts.receivable.edit",
      "accounts.receivable.collect",
      "accounts.payable.view",
      "accounts.payable.create",
      "accounts.payable.edit",
      "accounts.payable.pay",
      "accounts.cashbook.view",
      "accounts.cashbook.create",
      "accounts.cashbook.edit",
      "accounts.bankbook.view",
      "accounts.bankbook.create",
      "accounts.bankbook.edit",
      "accounts.tax.view",
      "accounts.tax.create",
      "accounts.tax.edit",
      "accounts.dayclosing.view",
      "accounts.dayclosing.approve",
      "accounts.dayclosing.reopen",
      "accounts.report.view",
      "accounts.report.export",
      "expense.view",
      "expense.create",
      "expense.approve",
      "expense.receipt",
      "expense.report",
      "payroll.view",
      "payroll.salary.view",
      "payroll.payslip",
      "payroll.export",
      "reports.sales.view",
      "reports.sales.export",
      "reports.payment.view",
      "reports.payment.export",
      "reports.accounts.view",
      "reports.accounts.export",
      "notification.view",
      "audit.view"
    ]
  },
  {
    "id": "role_hr",
    "name": "HR Manager",
    "description": "Human resources head overseeing staff onboarding, attendance, leave approvals & payroll calculations",
    "is_system": True,
    "permissions": [
      "dashboard.view",
      "dashboard.payroll.view",
      "masters.employee.view",
      "masters.employee.create",
      "masters.employee.edit",
      "masters.employee.delete",
      "masters.employee.documents",
      "masters.employee.bank_details",
      "employee.view",
      "employee.create",
      "employee.edit",
      "employee.delete",
      "employee.documents",
      "employee.bank_details",
      "employee.salary.view",
      "employee.salary.edit",
      "attendance.view",
      "attendance.create",
      "attendance.edit",
      "attendance.delete",
      "attendance.correction",
      "attendance.approve",
      "attendance.report",
      "leave.view",
      "leave.create",
      "leave.edit",
      "leave.approve",
      "leave.reject",
      "leave.balance",
      "leave.report",
      "payroll.view",
      "payroll.create",
      "payroll.edit",
      "payroll.process",
      "payroll.approve",
      "payroll.salary.view",
      "payroll.salary.edit",
      "payroll.payslip",
      "payroll.export",
      "reports.payroll.view",
      "reports.payroll.export",
      "notification.view"
    ]
  },
  {
    "id": "role_receptionist",
    "name": "Receptionist / Host",
    "description": "Guest host managing reservations, queues, table check-in, and customer records",
    "is_system": True,
    "permissions": [
      "dashboard.view",
      "dashboard.booking.view",
      "masters.customer.view",
      "masters.customer.create",
      "masters.customer.edit",
      "masters.customer.history",
      "masters.table.view",
      "masters.table.status",
      "masters.menu.view",
      "daily_menu.view",
      "booking.view",
      "booking.create",
      "booking.edit",
      "booking.confirm",
      "booking.cancel",
      "booking.assign_table",
      "booking.change_table",
      "booking.checkin",
      "booking.no_show",
      "booking.complete",
      "booking.print",
      "booking.export",
      "token.view",
      "token.create",
      "token.call",
      "token.recall",
      "token.skip",
      "token.seat",
      "token.complete",
      "token.history",
      "token.display",
      "tables.view",
      "tables.assign",
      "tables.status",
      "notification.view"
    ]
  }
]
