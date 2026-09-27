from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from ..database import get_db
from ..services.report_service import ReportService
from ..services.account_service import AccountService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/reports", tags=["Reports & BI Analytics"])

@router.get("/sales")
@router.get("/sales-summary")
async def get_sales_report(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    db = get_db()
    filter_q = {"status": {"$in": ["COMPLETED", "SERVED", "BILLED"]}}
    if startDate and endDate:
        filter_q["createdAt"] = {
            "$gte": datetime.strptime(f"{startDate} 00:00:00", "%Y-%m-%d %H:%M:%S"),
            "$lte": datetime.strptime(f"{endDate} 23:59:59", "%Y-%m-%d %H:%M:%S")
        }

    orders = list(db.orders.find(filter_q, {"_id": 0}).sort("createdAt", -1))
    total_sales = sum(float(o.get("netAmount", 0)) for o in orders)
    total_gross = sum(float(o.get("totalAmount", 0)) for o in orders)
    total_tax = sum(float(o.get("taxAmount", 0)) for o in orders)
    total_discount = sum(float(o.get("discountAmount", 0)) for o in orders)

    # Item breakdown
    item_map = {}
    for o in orders:
        for it in o.get("items", []):
            name = it.get("itemName", "Dish")
            qty = int(it.get("quantity", 1))
            rev = float(it.get("totalPrice", 0))
            if name not in item_map:
                item_map[name] = {"itemName": name, "quantitySold": 0, "totalRevenue": 0.0}
            item_map[name]["quantitySold"] += qty
            item_map[name]["totalRevenue"] += rev

    item_breakdown = sorted(list(item_map.values()), key=lambda x: x["totalRevenue"], reverse=True)

    return ApiResponse.success(data={
        "summary": {
            "totalNetSales": total_sales,
            "totalGrossSales": total_gross,
            "totalTax": total_tax,
            "totalDiscount": total_discount,
            "totalOrders": len(orders)
        },
        "orders": orders,
        "itemBreakdown": item_breakdown
    })

@router.get("/bills")
async def get_bills_report(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    db = get_db()
    bills = list(db.bills.find({}, {"_id": 0}).sort("createdAt", -1))
    return ApiResponse.success(data={
        "bills": bills,
        "totalBilled": sum(float(b.get("totalPayable", 0)) for b in bills),
        "totalPaid": sum(float(b.get("paidAmount", 0)) for b in bills),
        "totalBalance": sum(float(b.get("balanceAmount", 0)) for b in bills)
    })

@router.get("/payments")
@router.get("/payment-modes")
async def get_payments_report(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    db = get_db()
    payments = list(db.payments.find({"status": "COMPLETED"}, {"_id": 0}).sort("createdAt", -1))
    by_method = {}
    for p in payments:
        m = p.get("paymentMethod", "CASH")
        by_method[m] = by_method.get(m, 0.0) + float(p.get("amount", 0))

    return ApiResponse.success(data={
        "payments": payments,
        "totalCollections": sum(float(p.get("amount", 0)) for p in payments),
        "byMethod": by_method
    })

@router.get("/inventory")
@router.get("/inventory-valuation")
async def get_inventory_report(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    raw_items = list(db.inventory_items.find({}, {"_id": 0}))
    processed = []
    total_val = 0.0
    for it in raw_items:
        stock = float(it.get("currentStock", 0))
        cost = float(it.get("costPerUnit", 0))
        val = stock * cost
        total_val += val
        min_lvl = float(it.get("minimumStockLevel", 5))
        it_copy = dict(it)
        it_copy["stockValue"] = val
        it_copy["isLow"] = stock <= min_lvl
        processed.append(it_copy)

    return ApiResponse.success(data={
        "items": processed,
        "totalValuation": total_val,
        "lowStockCount": sum(1 for i in processed if i["isLow"])
    })

@router.get("/expenses")
async def get_expenses_report(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    db = get_db()
    expenses = list(db.expenses.find({"status": "APPROVED"}, {"_id": 0}).sort("expenseDate", -1))
    return ApiResponse.success(data={
        "expenses": expenses,
        "totalExpenses": sum(float(e.get("amount", 0)) for e in expenses)
    })

@router.get("/financials")
async def get_financials_report(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    orders = list(db.orders.find({"status": {"$in": ["COMPLETED", "SERVED", "BILLED"]}}))
    revenue = sum(float(o.get("netAmount", 0)) for o in orders)
    expenses = sum(float(e.get("amount", 0)) for e in db.expenses.find({"status": "APPROVED"}))
    profit = revenue - expenses

    return ApiResponse.success(data={
        "revenue": revenue,
        "expenses": expenses,
        "netProfit": profit,
        "profitMargin": round((profit / revenue * 100) if revenue > 0 else 0, 1)
    })

@router.post("/import")
async def import_report_data(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    import_type = body.get("type", "customers")
    rows = body.get("rows", [])
    res = await ReportService.import_data(import_type, rows, current_user["userId"])
    return ApiResponse.success(data=res, message=f"Successfully imported {res.get('importedCount', 0)} records")
