from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional, List
from ..services.inventory_service import InventoryService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/inventory", tags=["Inventory"])

DEFAULT_DAILY_EXPENSES = [
    {"key": "vegetables", "name": "Vegetables / શાકભાજી"},
    {"key": "groceries", "name": "Groceries / કરિયાણું"},
    {"key": "milk_dairy", "name": "Milk & Dairy / દૂધ"},
    {"key": "gas", "name": "Cooking Gas / ગેસ"},
    {"key": "oil_spices", "name": "Oil & Spices / મસાલા"},
    {"key": "cleaning", "name": "Cleaning Materials / સફાઈ"},
    {"key": "water", "name": "Water Cans / પાણી"},
    {"key": "other", "name": "Other Daily Expense / અન્ય"},
]

DEFAULT_DAILY_INCOME = [
    {"key": "counter_sales", "name": "Counter Sales / રોકડા"},
    {"key": "online_sales", "name": "Online Sales / ઓનલાઈન"},
    {"key": "function_income", "name": "Function Income / ફંક્શન"},
]

def _empty_ledger(date: str) -> Dict[str, Any]:
    return {"date": date, "expenses": [{**item, "amount": 0, "note": ""} for item in DEFAULT_DAILY_EXPENSES], "income": [{**item, "amount": 0, "note": ""} for item in DEFAULT_DAILY_INCOME]}

def _totals(ledger: Dict[str, Any]) -> Dict[str, float]:
    expense = sum(float(row.get("amount") or 0) for row in ledger.get("expenses", []))
    income = sum(float(row.get("amount") or 0) for row in ledger.get("income", []))
    return {"expenseTotal": expense, "incomeTotal": income, "profit": income - expense}

@router.get("/daily-ledger")
async def get_daily_ledger(date: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..database import get_db
    db = get_db()
    existing = db.daily_inventory_ledgers.find_one({"date": date}, {"_id": 0})
    
    # Query bookings on this date
    bookings_cur = list(db.bookings.find({"bookingDate": date}, {"_id": 0}))
    booking_list = []
    function_revenue = 0.0
    completed_functions = 0
    
    for b in bookings_cur:
        status = b.get("status", "")
        billing = b.get("billing") or {}
        bill_amount = float(billing.get("totalAmount") or billing.get("netPayable") or b.get("totalAmount") or 0.0)
        advance = float(b.get("advanceAmount") or 0.0)
        
        is_completed = status in ["COMPLETED", "CHECKED_OUT"] or bool(billing)
        if is_completed:
            completed_functions += 1
            function_revenue += bill_amount if bill_amount > 0 else advance
        elif advance > 0:
            function_revenue += advance

        booking_list.append({
            "bookingNumber": b.get("bookingNumber", ""),
            "customerName": b.get("customerName", ""),
            "guestCount": b.get("guestCount", 0),
            "timeSlot": b.get("timeSlot", ""),
            "status": status,
            "totalAmount": bill_amount,
            "advanceAmount": advance,
            "isCompleted": is_completed
        })
    
    if existing:
        ledger = existing
    else:
        ledger = _empty_ledger(date)
        if function_revenue > 0:
            for inc in ledger.get("income", []):
                if inc.get("key") == "function_income":
                    inc["amount"] = function_revenue
                    inc["note"] = f"{completed_functions} function(s) on this date"
    
    totals = _totals(ledger)
    
    recorded_dates = db.daily_inventory_ledgers.distinct("date")
    booking_dates = db.bookings.distinct("bookingDate")
    all_active_dates = sorted(list(set(recorded_dates + booking_dates)), reverse=True)
    
    booking_stats = {
        "totalBookings": len(booking_list),
        "completedCount": completed_functions,
        "functionRevenue": function_revenue,
        "bookings": booking_list
    }
    
    return ApiResponse.success(data={
        "ledger": ledger,
        "totals": totals,
        "bookingStats": booking_stats,
        "isSaved": bool(existing),
        "allRecordedDates": sorted(recorded_dates, reverse=True),
        "allAvailableDates": all_active_dates
    })

@router.put("/daily-ledger")
async def save_daily_ledger(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    from datetime import datetime, timezone
    from ..database import get_db
    date = str(body.get("date", "")).strip()
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail={"success": False, "message": "Choose a valid ledger date."})
    ledger = {"date": date, "expenses": body.get("expenses", []), "income": body.get("income", []), "updatedAt": datetime.now(timezone.utc), "updatedBy": current_user.get("username")}
    totals = _totals(ledger)
    ledger.update(totals)
    get_db().daily_inventory_ledgers.update_one({"date": date}, {"$set": ledger, "$setOnInsert": {"createdAt": datetime.now(timezone.utc)}}, upsert=True)
    ledger.pop("_id", None)
    return ApiResponse.success(data={"ledger": ledger, "totals": totals}, message="Daily inventory ledger saved")

@router.get("/monthly-ledger")
async def get_monthly_ledger(month: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    import calendar
    from datetime import datetime
    from ..database import get_db
    db = get_db()
    
    if not month:
        month = datetime.now().strftime("%Y-%m")
    
    try:
        parts = month.split("-")
        year_int = int(parts[0])
        month_int = int(parts[1])
        num_days = calendar.monthrange(year_int, month_int)[1]
    except Exception:
        now = datetime.now()
        year_int = now.year
        month_int = now.month
        month = f"{year_int:04d}-{month_int:02d}"
        num_days = calendar.monthrange(year_int, month_int)[1]

    # Find all ledgers in this month
    ledgers = list(db.daily_inventory_ledgers.find({"date": {"$regex": f"^{month}"}}, {"_id": 0}))
    ledger_by_date = {l.get("date"): l for l in ledgers if l.get("date")}

    # Find all bookings in this month
    bookings = list(db.bookings.find({"bookingDate": {"$regex": f"^{month}"}}, {"_id": 0}))
    bookings_by_date: Dict[str, List[Any]] = {}
    for b in bookings:
        b_date = b.get("bookingDate")
        if b_date:
            if b_date not in bookings_by_date:
                bookings_by_date[b_date] = []
            bookings_by_date[b_date].append(b)

    expense_categories: Dict[str, Dict[str, Any]] = {}
    income_categories: Dict[str, Dict[str, Any]] = {}

    total_month_income = 0.0
    total_month_expense = 0.0
    total_month_functions = 0
    total_month_function_rev = 0.0

    calendar_days = []
    days_names = ["સોમવાર (Mon)", "મંગળવાર (Tue)", "બુધવાર (Wed)", "ગુરુવાર (Thu)", "શુક્રવાર (Fri)", "શનિવાર (Sat)", "રવિવાર (Sun)"]
    today_str = datetime.now().strftime("%Y-%m-%d")

    for day_num in range(1, num_days + 1):
        date_str = f"{year_int:04d}-{month_int:02d}-{day_num:02d}"
        dt = datetime(year_int, month_int, day_num)
        day_name = days_names[dt.weekday()]
        
        day_bookings = bookings_by_date.get(date_str, [])
        day_fn_count = len(day_bookings)
        day_fn_rev = 0.0
        for b in day_bookings:
            b_bill = b.get("billing") or {}
            is_done = b.get("status") in ["COMPLETED", "CHECKED_OUT"] or bool(b_bill)
            amt = float(b_bill.get("totalAmount") or b_bill.get("netPayable") or b.get("totalAmount") or 0.0)
            adv = float(b.get("advanceAmount") or 0.0)
            if is_done:
                day_fn_rev += amt if amt > 0 else adv
            elif adv > 0:
                day_fn_rev += adv
                
        total_month_functions += day_fn_count
        total_month_function_rev += day_fn_rev

        l = ledger_by_date.get(date_str)
        if l:
            inc = float(l.get("incomeTotal") or 0.0)
            exp = float(l.get("expenseTotal") or 0.0)
            prof = inc - exp
            total_month_income += inc
            total_month_expense += exp

            top_expense_name = ""
            top_expense_amt = 0.0

            for e_item in l.get("expenses", []):
                key = e_item.get("key") or e_item.get("name")
                name = e_item.get("name") or key
                amt = float(e_item.get("amount") or 0.0)
                if amt > top_expense_amt:
                    top_expense_amt = amt
                    top_expense_name = name
                if key not in expense_categories:
                    expense_categories[key] = {"key": key, "name": name, "amount": 0.0, "count": 0}
                expense_categories[key]["amount"] += amt
                if amt > 0:
                    expense_categories[key]["count"] += 1

            for i_item in l.get("income", []):
                key = i_item.get("key") or i_item.get("name")
                name = i_item.get("name") or key
                amt = float(i_item.get("amount") or 0.0)
                if key not in income_categories:
                    income_categories[key] = {"key": key, "name": name, "amount": 0.0, "count": 0}
                income_categories[key]["amount"] += amt
                if amt > 0:
                    income_categories[key]["count"] += 1

            calendar_days.append({
                "date": date_str,
                "dayNumber": day_num,
                "dayName": day_name,
                "isToday": date_str == today_str,
                "hasRecord": True,
                "incomeTotal": inc,
                "expenseTotal": exp,
                "profit": prof,
                "functionCount": day_fn_count,
                "functionRevenue": day_fn_rev,
                "topExpense": {"name": top_expense_name, "amount": top_expense_amt} if top_expense_amt > 0 else None,
                "expensesCount": len([e for e in l.get("expenses", []) if float(e.get("amount") or 0) > 0]),
                "updatedAt": str(l.get("updatedAt")) if l.get("updatedAt") else None,
                "updatedBy": l.get("updatedBy")
            })
        else:
            calendar_days.append({
                "date": date_str,
                "dayNumber": day_num,
                "dayName": day_name,
                "isToday": date_str == today_str,
                "hasRecord": False,
                "incomeTotal": 0.0,
                "expenseTotal": 0.0,
                "profit": 0.0,
                "functionCount": day_fn_count,
                "functionRevenue": day_fn_rev,
                "topExpense": None,
                "expensesCount": 0,
                "updatedAt": None,
                "updatedBy": None
            })

    days_with_record = len(ledgers)
    avg_expense = round((total_month_expense / days_with_record), 2) if days_with_record > 0 else 0.0
    avg_income = round((total_month_income / days_with_record), 2) if days_with_record > 0 else 0.0

    all_dates = db.daily_inventory_ledgers.distinct("date")
    all_booking_dates = db.bookings.distinct("bookingDate")
    distinct_months = set()
    for d in (all_dates + all_booking_dates):
        if d and len(d) >= 7 and "-" in d:
            distinct_months.add(d[:7])
    distinct_months.add(datetime.now().strftime("%Y-%m"))
    sorted_months = sorted(list(distinct_months), reverse=True)

    exp_cat_list = sorted(list(expense_categories.values()), key=lambda x: x["amount"], reverse=True)
    inc_cat_list = sorted(list(income_categories.values()), key=lambda x: x["amount"], reverse=True)

    return ApiResponse.success(data={
        "month": month,
        "totals": {
            "incomeTotal": total_month_income,
            "expenseTotal": total_month_expense,
            "profit": total_month_income - total_month_expense,
            "daysRecorded": days_with_record,
            "totalDays": num_days,
            "functionCount": total_month_functions,
            "functionRevenue": total_month_function_rev,
            "avgDailyExpense": avg_expense,
            "avgDailyIncome": avg_income
        },
        "calendarDays": calendar_days,
        "expenseCategories": exp_cat_list,
        "incomeCategories": inc_cat_list,
        "availableMonths": sorted_months
    })

@router.get("/daily-ledger/summary")
async def daily_ledger_summary(date: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..database import get_db
    db = get_db()
    month_prefix, year_prefix = date[:7], date[:4]
    def aggregate(prefix: str):
        records = list(db.daily_inventory_ledgers.find({"date": {"$regex": f"^{prefix}"}}, {"_id": 0, "incomeTotal": 1, "expenseTotal": 1}))
        income = sum(float(row.get("incomeTotal") or 0) for row in records)
        expense = sum(float(row.get("expenseTotal") or 0) for row in records)
        return {"incomeTotal": income, "expenseTotal": expense, "profit": income - expense, "days": len(records)}
    return ApiResponse.success(data={"monthly": aggregate(month_prefix), "yearly": aggregate(year_prefix)})

@router.get("/items")
async def get_items(category: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    query = {"category": category} if category else None
    items = await InventoryService.get_items(query)
    return ApiResponse.success(data=items)

@router.post("/items")
async def create_item(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    item = await InventoryService.create_item(body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=item, message="Inventory item created successfully")

@router.put("/items/{item_id}")
async def update_item(item_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    item = await InventoryService.update_item(item_id, body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=item, message="Inventory item updated successfully")

@router.post("/stock-in")
async def stock_in(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    item_id = body.get("itemId") or body.get("inventoryItemId")
    qty = float(body.get("quantity", 0))
    price = float(body.get("unitPrice", 0))
    notes = body.get("notes") or body.get("reason")
    res = await InventoryService.perform_stock_in(
        item_id=item_id,
        quantity=qty,
        unit_price=price,
        notes=notes,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=res, message="Stock added successfully")

@router.post("/stock-out")
async def stock_out(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    item_id = body.get("itemId") or body.get("inventoryItemId")
    qty = float(body.get("quantity", 0))
    notes = body.get("notes") or body.get("reason")
    res = await InventoryService.perform_stock_out(
        item_id=item_id,
        quantity=qty,
        notes=notes,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=res, message="Stock deducted successfully")

@router.post("/adjust")
async def adjust(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    item_id = body.get("itemId") or body.get("inventoryItemId")
    adj_type = body.get("adjustmentType") or body.get("type", "INCREASE")
    qty = float(body.get("quantity", 0))
    reason = body.get("reason") or body.get("notes")
    res = await InventoryService.adjust_stock(
        item_id=item_id,
        adj_type=adj_type,
        quantity=qty,
        reason=reason,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=res, message="Stock adjusted successfully")

@router.get("/ledger")
async def get_ledger(itemId: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..database import get_db
    db = get_db()
    filter_q = {"itemId": itemId} if itemId else {}
    txs = list(db.stock_transactions.find(filter_q, {"_id": 0}).sort("createdAt", -1).limit(200))
    return ApiResponse.success(data=txs)

@router.get("/alerts")
async def get_alerts(current_user: Dict[str, Any] = Depends(get_current_user)):
    alerts = await InventoryService.get_low_stock_alerts()
    return ApiResponse.success(data=alerts)

@router.get("/recipes")
async def get_recipes(current_user: Dict[str, Any] = Depends(get_current_user)):
    recipes = await InventoryService.get_recipes()
    return ApiResponse.success(data=recipes)

@router.post("/recipes")
async def create_recipe(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    recipe = await InventoryService.create_recipe(body)
    return ApiResponse.success(data=recipe, message="Recipe saved successfully")
