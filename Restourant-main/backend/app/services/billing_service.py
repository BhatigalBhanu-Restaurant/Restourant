import uuid
import math
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from ..database import get_db
from ..sockets import SocketEvents
from .audit_service import create_audit_log

class BillingService:
    @staticmethod
    async def get_bills(query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {}
        if query:
            if query.get("status"):
                filter_q["status"] = query["status"]
            if query.get("orderId"):
                filter_q["orderId"] = query["orderId"]

        return list(db.bills.find(filter_q, {"_id": 0}).sort("createdAt", -1))

    @staticmethod
    async def get_bill_by_id(bill_id: str) -> Dict[str, Any]:
        db = get_db()
        bill = db.bills.find_one({"id": bill_id}, {"_id": 0})
        if not bill:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Bill not found."})
        return bill

    @staticmethod
    async def generate_bill_from_order(order_id: str, options: Optional[Dict[str, Any]] = None, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        order = db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Order not found."})

        # Check existing bill
        existing_bill = db.bills.find_one({"orderId": order_id, "status": {"$in": ["UNPAID", "PARTIALLY_PAID", "PAID"]}})
        if existing_bill:
            existing_bill.pop("_id", None)
            return existing_bill

        count = db.bills.count_documents({})
        year = datetime.now(timezone.utc).year
        bill_number = f"BB-INV-{year}-{str(count + 1).zfill(4)}"
        bill_id = f"bil_{uuid.uuid4().hex[:8]}"

        subtotal = float(order.get("totalAmount", 0.0))
        discount_amount = float(options.get("discountAmount") if options and options.get("discountAmount") is not None else order.get("discountAmount", 0.0))
        tax_amount = float(order.get("taxAmount", 0.0))
        service_charge = float(options.get("serviceCharge", 0.0)) if options else 0.0

        raw_total = subtotal - discount_amount + tax_amount + service_charge
        rounded_total = round(raw_total)
        round_off = round(rounded_total - raw_total, 2)

        bill_items = [
            {
                "id": str(uuid.uuid4()),
                "itemName": it["itemName"],
                "quantity": it["quantity"],
                "unitPrice": it["unitPrice"],
                "totalPrice": it["totalPrice"],
                "taxRate": float(it.get("taxRate", 5)),
                "taxAmount": float(it.get("taxAmount", 0))
            }
            for it in order.get("items", [])
        ]

        bill_doc = {
            "id": bill_id,
            "billNumber": bill_number,
            "orderId": order_id,
            "tableId": order.get("tableId"),
            "tableNumber": order.get("tableNumber"),
            "customerId": order.get("customerId"),
            "customerName": order.get("customerName"),
            "items": bill_items,
            "subtotal": subtotal,
            "discountRuleId": options.get("discountRuleId") if options else None,
            "discountAmount": discount_amount,
            "discountApprovedBy": options.get("discountApprovedBy") if options else None,
            "taxAmount": tax_amount,
            "serviceCharge": service_charge,
            "roundOff": round_off,
            "totalPayable": rounded_total,
            "paidAmount": 0.0,
            "balanceAmount": rounded_total,
            "status": "UNPAID",
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }

        db.bills.insert_one(bill_doc)
        db.orders.update_one({"id": order_id}, {"$set": {"status": "BILLED", "updatedAt": datetime.now(timezone.utc)}})

        bill_doc.pop("_id", None)
        updated_order = db.orders.find_one({"id": order_id}, {"_id": 0})

        await SocketEvents.emit_order_updated(updated_order)
        await SocketEvents.emit_data_changed("billing")

        await create_audit_log(
            module="Billing",
            action="GENERATE_BILL",
            user_id=user_id,
            username=username,
            record_id=bill_id,
            new_value={"billNumber": bill_number, "totalPayable": rounded_total}
        )

        return bill_doc

    @staticmethod
    async def split_bill(bill_id: str, split_count: int = 2) -> List[Dict[str, Any]]:
        if split_count < 2:
            raise HTTPException(status_code=400, detail={"success": False, "message": "Split count must be at least 2."})

        db = get_db()
        bill = db.bills.find_one({"id": bill_id})
        if not bill:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Bill not found."})

        total = bill["totalPayable"]
        split_amount = round(total / split_count, 2)
        sub_bills = []

        for i in range(split_count):
            sub_id = f"{bill_id}_part_{i+1}"
            sub_doc = dict(bill)
            sub_doc["id"] = sub_id
            sub_doc["billNumber"] = f"{bill['billNumber']}-{i+1}"
            sub_doc["totalPayable"] = split_amount
            sub_doc["balanceAmount"] = split_amount
            sub_doc["status"] = "UNPAID"
            sub_doc["createdAt"] = datetime.now(timezone.utc)
            sub_doc["updatedAt"] = datetime.now(timezone.utc)
            sub_doc.pop("_id", None)
            db.bills.insert_one(sub_doc)
            sub_doc.pop("_id", None)
            sub_bills.append(sub_doc)

        db.bills.update_one({"id": bill_id}, {"$set": {"status": "SPLIT", "updatedAt": datetime.now(timezone.utc)}})
        await SocketEvents.emit_data_changed("billing")
        return sub_bills
