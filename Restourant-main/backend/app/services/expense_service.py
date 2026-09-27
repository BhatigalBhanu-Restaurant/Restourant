import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from ..database import get_db

class ExpenseService:
    @staticmethod
    async def get_expenses(query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {}
        if query and query.get("category"):
            filter_q["category"] = query["category"]
        return list(db.expenses.find(filter_q, {"_id": 0}).sort("expenseDate", -1))

    @staticmethod
    async def create_expense(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        count = db.expenses.count_documents({})
        year = datetime.now(timezone.utc).year
        exp_number = f"EXP-{year}-{str(count + 1).zfill(4)}"
        exp_id = f"exp_{uuid.uuid4().hex[:8]}"

        doc = {
            "id": exp_id,
            "expenseNumber": exp_number,
            "accountId": data.get("accountId", "acc_exp_utilities"),
            "accountName": data.get("accountName", "Operating Expense"),
            "title": data.get("title"),
            "category": data.get("category", "MISC"),
            "amount": float(data.get("amount", 0)),
            "paymentMethod": data.get("paymentMethod", "CASH"),
            "expenseDate": data.get("expenseDate", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
            "receiptUrl": data.get("receiptUrl"),
            "status": "APPROVED",
            "notes": data.get("notes"),
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }
        db.expenses.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @staticmethod
    async def approve_expense(exp_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        db.expenses.update_one(
            {"id": exp_id},
            {"$set": {"status": "APPROVED", "approvedBy": user_id, "updatedAt": datetime.now(timezone.utc)}}
        )
        return db.expenses.find_one({"id": exp_id}, {"_id": 0})

    @staticmethod
    async def reject_expense(exp_id: str, reason: Optional[str] = None, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        db.expenses.update_one(
            {"id": exp_id},
            {"$set": {"status": "REJECTED", "notes": f"Rejected: {reason}", "updatedAt": datetime.now(timezone.utc)}}
        )
        return db.expenses.find_one({"id": exp_id}, {"_id": 0})
