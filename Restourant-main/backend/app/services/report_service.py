from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from ..database import get_db

class ReportService:
    @staticmethod
    async def get_sales_report(start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        filter_q = {"status": {"$in": ["COMPLETED", "SERVED", "BILLED"]}}
        orders = list(db.orders.find(filter_q, {"_id": 0}))

        total_sales = sum(float(o.get("netAmount", 0)) for o in orders)
        total_tax = sum(float(o.get("taxAmount", 0)) for o in orders)
        total_discount = sum(float(o.get("discountAmount", 0)) for o in orders)

        # Category sales aggregation
        category_sales: Dict[str, float] = {}
        for o in orders:
            for it in o.get("items", []):
                name = it.get("itemName", "Other")
                category_sales[name] = category_sales.get(name, 0) + float(it.get("totalPrice", 0))

        top_dishes = sorted([{"name": k, "revenue": v} for k, v in category_sales.items()], key=lambda x: x["revenue"], reverse=True)[:10]

        return {
            "totalRevenue": total_sales,
            "totalTax": total_tax,
            "totalDiscount": total_discount,
            "orderCount": len(orders),
            "topDishes": top_dishes,
            "orders": orders[:50]
        }

    @staticmethod
    async def get_payment_report(start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        payments = list(db.payments.find({"status": "COMPLETED"}, {"_id": 0}))

        by_method = {}
        for p in payments:
            m = p.get("paymentMethod", "CASH")
            by_method[m] = by_method.get(m, 0.0) + float(p.get("amount", 0.0))

        return {
            "totalCollections": sum(float(p.get("amount", 0)) for p in payments),
            "paymentCount": len(payments),
            "byMethod": by_method,
            "payments": payments[:50]
        }

    @staticmethod
    async def get_inventory_report() -> Dict[str, Any]:
        db = get_db()
        items = list(db.inventory_items.find({}, {"_id": 0}))
        total_val = sum(float(it.get("currentStock", 0)) * float(it.get("costPerUnit", 0)) for it in items)
        low_stock = [it for it in items if float(it.get("currentStock", 0)) <= float(it.get("minimumStockLevel", 5))]

        return {
            "totalValuation": total_val,
            "totalItems": len(items),
            "lowStockCount": len(low_stock),
            "items": items
        }

    @staticmethod
    async def get_billing_report(start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        bills = list(db.bills.find({}, {"_id": 0}))
        return {
            "totalBilled": sum(float(b.get("totalPayable", 0)) for b in bills),
            "totalPaid": sum(float(b.get("paidAmount", 0)) for b in bills),
            "totalBalance": sum(float(b.get("balanceAmount", 0)) for b in bills),
            "billCount": len(bills),
            "bills": bills[:50]
        }

    @staticmethod
    async def get_expense_report(start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        expenses = list(db.expenses.find({"status": "APPROVED"}, {"_id": 0}))
        by_cat = {}
        for e in expenses:
            c = e.get("category", "MISC")
            by_cat[c] = by_cat.get(c, 0.0) + float(e.get("amount", 0))

        return {
            "totalExpenses": sum(float(e.get("amount", 0)) for e in expenses),
            "expenseCount": len(expenses),
            "byCategory": by_cat,
            "expenses": expenses
        }

    @staticmethod
    async def import_data(import_type: str, rows: List[Dict[str, Any]], user_id: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        imported = 0
        if import_type == "customers" and rows:
            for r in rows:
                if r.get("phone") and r.get("name"):
                    db.customers.update_one({"phone": r["phone"]}, {"$set": r}, upsert=True)
                    imported += 1
        elif import_type == "menu_items" and rows:
            for r in rows:
                if r.get("name") and r.get("price"):
                    item_id = r.get("id") or f"item_{uuid.uuid4().hex[:8]}"
                    db.menu_items.update_one({"name": r["name"]}, {"$set": {"id": item_id, **r}}, upsert=True)
                    imported += 1
        elif import_type == "inventory_items" and rows:
            for r in rows:
                if r.get("name"):
                    inv_id = r.get("id") or f"inv_{uuid.uuid4().hex[:8]}"
                    db.inventory_items.update_one({"name": r["name"]}, {"$set": {"id": inv_id, **r}}, upsert=True)
                    imported += 1

        return {"importedCount": imported, "type": import_type}
