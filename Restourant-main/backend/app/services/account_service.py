import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from ..database import get_db
from .audit_service import create_audit_log

class AccountService:
    @staticmethod
    async def get_chart_of_accounts() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.chart_of_accounts.find({}, {"_id": 0}).sort("accountCode", 1))

    @staticmethod
    async def create_account_head(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        acc_id = data.get("id") or f"acc_{uuid.uuid4().hex[:8]}"
        doc = {
            "id": acc_id,
            "accountCode": data.get("accountCode"),
            "accountName": data.get("accountName"),
            "accountType": data.get("accountType", "EXPENSE"),
            "subType": data.get("subType"),
            "openingBalance": float(data.get("openingBalance", 0.0)),
            "currentBalance": float(data.get("openingBalance", 0.0)),
            "description": data.get("description"),
            "isActive": True,
            "createdAt": datetime.now(timezone.utc)
        }
        db.chart_of_accounts.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @staticmethod
    async def update_account_head(acc_id: str, data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        data["updatedAt"] = datetime.now(timezone.utc)
        db.chart_of_accounts.update_one({"id": acc_id}, {"$set": data})
        return db.chart_of_accounts.find_one({"id": acc_id}, {"_id": 0})

    @staticmethod
    async def get_journal_entries(query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {}
        if query and query.get("startDate") and query.get("endDate"):
            filter_q["entryDate"] = {"$gte": query["startDate"], "$lte": query["endDate"]}
        return list(db.journal_entries.find(filter_q, {"_id": 0}).sort("entryDate", -1))

    @staticmethod
    async def create_journal_entry(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        items = data.get("items", [])
        total_debit = sum(float(it.get("debit", 0)) for it in items)
        total_credit = sum(float(it.get("credit", 0)) for it in items)

        if abs(total_debit - total_credit) > 0.01:
            raise HTTPException(status_code=400, detail={"success": False, "message": f"Unbalanced journal entry! Total Debit ({total_debit}) must equal Total Credit ({total_credit})."})

        count = db.journal_entries.count_documents({})
        year = datetime.now(timezone.utc).year
        entry_number = f"JRN-{year}-{str(count + 1).zfill(4)}"
        entry_id = f"jrn_{uuid.uuid4().hex[:8]}"

        doc = {
            "id": entry_id,
            "entryNumber": entry_number,
            "entryDate": data.get("entryDate", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
            "referenceType": data.get("referenceType", "MANUAL"),
            "referenceId": data.get("referenceId"),
            "narration": data.get("narration", "Manual journal entry"),
            "items": items,
            "totalDebit": total_debit,
            "totalCredit": total_credit,
            "status": "POSTED",
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }

        db.journal_entries.insert_one(doc)

        # Update balance for each account
        for it in items:
            acc_id = it.get("accountId")
            d_amt = float(it.get("debit", 0))
            c_amt = float(it.get("credit", 0))
            net_change = d_amt - c_amt
            if acc_id:
                db.chart_of_accounts.update_one({"id": acc_id}, {"$inc": {"currentBalance": net_change}})

        doc.pop("_id", None)
        return doc

    @staticmethod
    async def get_ledger_statement(account_id: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        account = db.chart_of_accounts.find_one({"id": account_id}, {"_id": 0}) if account_id else None
        filter_q = {}
        if start_date and end_date:
            filter_q["entryDate"] = {"$gte": start_date, "$lte": end_date}

        journals = list(db.journal_entries.find(filter_q, {"_id": 0}).sort("entryDate", 1))
        matched_lines = []
        for j in journals:
            for it in j.get("items", []):
                if not account_id or it.get("accountId") == account_id:
                    matched_lines.append({
                        "entryNumber": j.get("entryNumber"),
                        "entryDate": j.get("entryDate"),
                        "narration": j.get("narration"),
                        "accountName": it.get("accountName"),
                        "debit": it.get("debit", 0),
                        "credit": it.get("credit", 0)
                    })

        return {"account": account, "transactions": matched_lines}

    @staticmethod
    async def get_day_closing(date: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        record = db.day_closings.find_one({"closingDate": target_date}, {"_id": 0})
        if record:
            return record

        # Calculate daily totals
        orders = list(db.orders.find({"createdAt": {"$gte": datetime.strptime(f"{target_date} 00:00:00", "%Y-%m-%d %H:%M:%S")}}, {"_id": 0}))
        payments = list(db.payments.find({"createdAt": {"$gte": datetime.strptime(f"{target_date} 00:00:00", "%Y-%m-%d %H:%M:%S")}}, {"_id": 0}))

        total_sales = sum(float(o.get("netAmount", 0)) for o in orders if o.get("status") == "COMPLETED")
        cash_sales = sum(float(p.get("amount", 0)) for p in payments if p.get("paymentMethod") == "CASH" and p.get("status") == "COMPLETED")
        upi_sales = sum(float(p.get("amount", 0)) for p in payments if p.get("paymentMethod") == "UPI" and p.get("status") == "COMPLETED")
        card_sales = sum(float(p.get("amount", 0)) for p in payments if p.get("paymentMethod") == "CARD" and p.get("status") == "COMPLETED")

        return {
            "closingDate": target_date,
            "openingCash": 5000.0,
            "totalSales": total_sales,
            "cashSales": cash_sales,
            "upiSales": upi_sales,
            "cardSales": card_sales,
            "totalOrders": len(orders),
            "status": "OPEN"
        }

    @staticmethod
    async def execute_day_closing(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        date = data.get("closingDate", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
        doc = {
            "id": f"dc_{uuid.uuid4().hex[:8]}",
            "closingDate": date,
            "openingCash": float(data.get("openingCash", 0)),
            "totalSales": float(data.get("totalSales", 0)),
            "cashSales": float(data.get("cashSales", 0)),
            "upiSales": float(data.get("upiSales", 0)),
            "cardSales": float(data.get("cardSales", 0)),
            "totalExpenses": float(data.get("totalExpenses", 0)),
            "expectedCash": float(data.get("expectedCash", 0)),
            "actualCash": float(data.get("actualCash", 0)),
            "cashDifference": float(data.get("cashDifference", 0)),
            "totalOrders": int(data.get("totalOrders", 0)),
            "status": "CLOSED",
            "closedBy": user_id,
            "notes": data.get("notes"),
            "createdAt": datetime.now(timezone.utc)
        }
        db.day_closings.update_one({"closingDate": date}, {"$set": doc}, upsert=True)
        doc.pop("_id", None)
        return doc
