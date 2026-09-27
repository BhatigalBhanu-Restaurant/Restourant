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
    ledger = db.daily_inventory_ledgers.find_one({"date": date}, {"_id": 0}) or _empty_ledger(date)
    return ApiResponse.success(data={"ledger": ledger, "totals": _totals(ledger)})

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
