# Kathiyawadi Restaurant Management ERP System (Python + React)

A production-grade, enterprise-ready full-stack Restaurant Management ERP System powered by **Python FastAPI** and **React TypeScript**.

```
RESTOURANT/
├── backend/       → Python FastAPI + Uvicorn + PyMongo + python-socketio (Port 5000)
│   ├── app/
│   │   ├── constants/    → 272 fine-grained permissions & 10 default roles
│   │   ├── middleware/   → JWT PBAC & Emergency lockdown guard
│   │   ├── routers/      → 19 domain-driven REST API routers under /api
│   │   ├── services/     → POS, KOT, Billing, Double-entry accounting, Recipes, HR
│   │   ├── utils/        → Security (bcrypt/pyjwt), response envelope, logging
│   │   ├── database.py   → MongoDB driver, connection pool & index engine
│   │   ├── seeds.py      → Authentic Kathiyawadi menu, tables, inventory seed dataset
│   │   └── sockets.py    → Real-time Socket.IO event broadcaster
│   ├── main.py           → ASGI Application combining FastAPI & Socket.IO
│   └── test_api.py       → Automated end-to-end integration smoke test suite
├── admin/         → React 18 + Vite + Bootstrap 5 Unified ERP & POS Portal (Port 3000)
├── run.py         → Single-command Python backend launcher
├── requirements.txt → Python package dependencies
├── start.bat      → Windows One-Click Full-Stack Launcher
└── start.ps1      → PowerShell Full-Stack Launcher
```

---

## 🌟 Application Architecture

### 1. Python Backend Core (`backend/` - Port 5000)
- **FastAPI & Uvicorn ASGI**: High performance asynchronous web server.
- **Interactive Swagger Documentation**: Available at `http://localhost:5000/docs`.
- **PyMongo & MongoDB**: Native connection to MongoDB (`mongodb://localhost:27017/restaurant_erp`).
- **Real-Time Socket.IO Server**: Asynchronous real-time events for POS orders, KOT state transitions, table status, and token calls.
- **272 Fine-Grained Permissions**: RBAC & PBAC engine supporting 10 system roles and per-user permission evaluation.
- **Automated Pipelines**:
  - Recipe-based raw inventory reduction upon order completion.
  - Balanced double-entry journal vouchers upon bill payment.
  - Immutable audit logging on operations.
  - 7-day Kathiyawadi daily menu rotation engine.

### 2. Unified ERP Operations Portal (`admin/` - Port 3000)
All ERP and restaurant operations are unified:
- **POS Touch Terminal (`/pos`)**: Fast ordering, category filtering, Kathiyawadi daily specials, kitchen instructions, request bill.
- **Kitchen Display System (`/kitchen`)**: Real-time KDS board (`New` → `Accepted` → `Preparing` → `Ready` → `Served`), urgent flags, and audio chimes.
- **Table Floor Plan (`/tables`)**: Visual layout, occupancy tracking, table merging & transfers.
- **Queue Tokens & TV Display (`/tokens` & `/display/tokens`)**: Live token queue and waiting area TV display.
- **Billing & Multi-Pay (`/billing`)**: Split bill calculations, GST tax computation, Cash/UPI/Card multi-pay.
- **Inventory & Recipes (`/inventory` & `/recipe`)**: Stock in/out, automatic BOM consumption, low stock alerts.
- **Purchases & Suppliers (`/purchase`)**: Purchase orders and GRN receiving.
- **Accounting & Expenses (`/accounts` & `/expenses`)**: Chart of accounts, journals, trial balance, day-closing cash drawer.
- **HR & Payroll (`/employees`, `/attendance`, `/leave`, `/payroll`)**: Biometric check-in/out, leave approvals, monthly payroll.
- **BI Analytics & Reports (`/reports`)**: Sales summaries, item breakdown, financial P&L.
- **Governance & RBAC (`/admin/users`, `/admin/roles`)**: 272-node permission matrix editor, database query explorer, emergency lockdown switch.

---

## 👥 Default Demo Credentials

| Persona | Username | Password | Role & Permissions |
|---|---|---|---|
| **Super Admin** | `superadmin` | `Admin@12345` | Full ERP + Governance Console (All 272 Permissions) |
| **Store Manager** | `manager` | `Manager@12345` | Store Operations, Reports & Approvals |
| **Head Cashier** | `cashier` | `Cashier@12345` | POS, Billing & Payments |
| **Captain / Waiter** | `waiter` | `Waiter@12345` | POS Orders & Floor Tables |
| **Kitchen Chef** | `chef` | `Chef@12345` | Kitchen Display System (KDS) |
| **Accountant** | `accountant` | `Accountant@12345` | Ledgers, Journals, Day Close |
| **Inventory Manager**| `inventory` | `Inventory@12345` | Stock, Recipes & Procurement |
| **HR Manager** | `hr` | `Hr@12345` | Staff, Attendance & Payroll |
| **Receptionist** | `receptionist`| `Reception@12345`| Bookings & Queue Tokens |

---

## 🚀 Running the Project (Pure Python Full-Stack)

### Prerequisites
1. **Python 3.10+**: Make sure Python is installed (`python --version`).
2. **MongoDB**: Local MongoDB running on `mongodb://localhost:27017` or cloud MongoDB URI in `.env`.

### Step 1: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Start the ERP Server (Single Command)
```bash
python run.py
```
> The entire ERP application (Unified UI, POS, KDS, Functions, Real-time WebSockets & REST APIs) will immediately be live at:
> **http://localhost:5000**

### Or One-Click Launcher (Windows):
Double-click **`start.bat`** or run in PowerShell:
```powershell
.\start.ps1
```

---

## 🧪 Running Automated Tests

Run the built-in end-to-end integration test suite:
```bash
python -m backend.test_api
```
Tests will verify health, login, JWT authorization, POS order creation, KOT generation, billing, payment settlement, recipe stock deduction, and system settings.
