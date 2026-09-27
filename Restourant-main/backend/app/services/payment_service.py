import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from ..database import get_db
from ..sockets import SocketEvents
from .order_service import OrderService
from .audit_service import create_audit_log

class PaymentService:
    @staticmethod
    async def get_payments(query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {}
        if query:
            if query.get("paymentMethod"):
                filter_q["paymentMethod"] = query["paymentMethod"]
            if query.get("status"):
                filter_q["status"] = query["status"]

        return list(db.payments.find(filter_q, {"_id": 0}).sort("createdAt", -1))

    @staticmethod
    async def get_payment_by_id(payment_id: str) -> Dict[str, Any]:
        db = get_db()
        payment = db.payments.find_one({"id": payment_id}, {"_id": 0})
        if not payment:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Payment not found."})
        return payment

    @staticmethod
    async def create_payment(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        bill = None
        if data.get("billId"):
            bill = db.bills.find_one({"id": data["billId"]})
        elif data.get("orderId"):
            bill = db.bills.find_one({"orderId": data["orderId"]})

        if not bill:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Bill not found."})

        if bill.get("status") == "PAID":
            raise HTTPException(status_code=400, detail={"success": False, "message": "This bill has already been fully paid."})

        count = db.payments.count_documents({})
        year = datetime.now(timezone.utc).year
        payment_number = f"PAY-{year}-{str(count + 1).zfill(4)}"
        payment_id = f"pay_{uuid.uuid4().hex[:8]}"

        transactions = []
        raw_txs = data.get("transactions", [])
        for tx in raw_txs:
            transactions.append({
                "id": str(uuid.uuid4()),
                "method": tx.get("method", "CASH"),
                "amount": float(tx.get("amount", 0)),
                "transactionRef": tx.get("transactionRef"),
                "status": "SUCCESS",
                "createdAt": datetime.now(timezone.utc).isoformat()
            })

        if not transactions and data.get("amount"):
            transactions.append({
                "id": str(uuid.uuid4()),
                "method": data.get("paymentMethod", "CASH"),
                "amount": float(data.get("amount")),
                "transactionRef": data.get("referenceNumber"),
                "status": "SUCCESS",
                "createdAt": datetime.now(timezone.utc).isoformat()
            })

        paid_this_time = sum(t["amount"] for t in transactions)
        current_paid = float(bill.get("paidAmount", 0.0)) + paid_this_time
        balance_amount = max(0.0, float(bill.get("totalPayable", 0.0)) - current_paid)
        is_fully_paid = balance_amount <= 0.0
        new_bill_status = "PAID" if is_fully_paid else "PARTIALLY_PAID"

        db.bills.update_one(
            {"id": bill["id"]},
            {"$set": {
                "paidAmount": current_paid,
                "balanceAmount": balance_amount,
                "status": new_bill_status,
                "updatedAt": datetime.now(timezone.utc)
            }}
        )

        payment_method = data.get("paymentMethod") or ("SPLIT" if len(transactions) > 1 else transactions[0]["method"] if transactions else "CASH")

        payment_doc = {
            "id": payment_id,
            "paymentNumber": payment_number,
            "billId": bill["id"],
            "orderId": bill.get("orderId"),
            "amount": paid_this_time,
            "paymentMethod": payment_method,
            "status": "COMPLETED",
            "transactions": transactions,
            "referenceNumber": data.get("referenceNumber"),
            "verifiedBy": user_id,
            "notes": data.get("notes"),
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }

        db.payments.insert_one(payment_doc)

        # 1. Complete Order & trigger recipe deductions if fully paid
        if is_fully_paid and bill.get("orderId"):
            await OrderService.complete_order(bill["orderId"], user_id, username)

        # 2. AUTOMATIC POSTING TO DOUBLE-ENTRY ACCOUNTS
        try:
            journal_count = db.journal_entries.count_documents({})
            entry_number = f"JRN-{year}-{str(journal_count + 1).zfill(4)}"
            journal_id = f"jrn_{uuid.uuid4().hex[:8]}"

            is_cash = payment_method == "CASH" or (transactions and transactions[0]["method"] == "CASH")
            debit_acc = db.chart_of_accounts.find_one({"$or": [{"id": "acc_cash_drawer"}, {"subType": "CASH"}]}) if is_cash else \
                        db.chart_of_accounts.find_one({"$or": [{"id": "acc_bank_sbi"}, {"id": "acc_bank_hdfc"}, {"subType": "BANK"}]})

            revenue_acc = db.chart_of_accounts.find_one({"$or": [{"id": "acc_food_sales"}, {"subType": "OPERATING_REVENUE"}]})
            tax_acc = db.chart_of_accounts.find_one({"$or": [{"id": "acc_gst_payable"}, {"accountCode": "2020"}]})

            if debit_acc and revenue_acc and tax_acc:
                subtotal = float(bill.get("subtotal", paid_this_time))
                tax_amt = float(bill.get("taxAmount", 0))

                journal_items = [
                    {
                        "id": str(uuid.uuid4()),
                        "accountId": debit_acc["id"],
                        "accountName": debit_acc["accountName"],
                        "debit": paid_this_time,
                        "credit": 0.0,
                        "description": f"Collection from Bill {bill['billNumber']}"
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "accountId": revenue_acc["id"],
                        "accountName": revenue_acc["accountName"],
                        "debit": 0.0,
                        "credit": round(subtotal, 2),
                        "description": f"Food sales revenue - Bill {bill['billNumber']}"
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "accountId": tax_acc["id"],
                        "accountName": tax_acc["accountName"],
                        "debit": 0.0,
                        "credit": round(tax_amt, 2),
                        "description": f"GST collection on Bill {bill['billNumber']}"
                    }
                ]

                db.journal_entries.insert_one({
                    "id": journal_id,
                    "entryNumber": entry_number,
                    "entryDate": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "referenceType": "SALES",
                    "referenceId": bill["billNumber"],
                    "narration": f"Auto sales & tax posting for Bill {bill['billNumber']}",
                    "items": journal_items,
                    "totalDebit": paid_this_time,
                    "totalCredit": round(subtotal + tax_amt, 2),
                    "status": "POSTED",
                    "createdBy": user_id,
                    "createdAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc)
                })

                # Update Account Balances
                db.chart_of_accounts.update_one({"id": debit_acc["id"]}, {"$inc": {"currentBalance": paid_this_time}})
                db.chart_of_accounts.update_one({"id": revenue_acc["id"]}, {"$inc": {"currentBalance": subtotal}})
                db.chart_of_accounts.update_one({"id": tax_acc["id"]}, {"$inc": {"currentBalance": tax_amt}})
        except Exception:
            pass

        payment_doc.pop("_id", None)

        await SocketEvents.emit_payment_completed(payment_doc)
        await SocketEvents.emit_data_changed("billing")
        await SocketEvents.emit_data_changed("payments")
        await SocketEvents.emit_data_changed("tables")

        await create_audit_log(
            module="Payment",
            action="PROCESS_PAYMENT",
            user_id=user_id,
            username=username,
            record_id=payment_id,
            new_value={"paymentNumber": payment_number, "amount": paid_this_time, "method": payment_method}
        )

        return payment_doc

    @staticmethod
    async def verify_payment(payment_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        db.payments.update_one(
            {"id": payment_id},
            {"$set": {"verifiedBy": user_id, "updatedAt": datetime.now(timezone.utc)}}
        )
        payment = db.payments.find_one({"id": payment_id}, {"_id": 0})
        return payment

    @staticmethod
    async def refund_payment(payment_id: str, refund_amount: float, reason: Optional[str] = None, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        db.payments.update_one(
            {"id": payment_id},
            {"$set": {"status": "REFUNDED", "notes": f"Refunded: {refund_amount}. Reason: {reason or 'N/A'}", "updatedAt": datetime.now(timezone.utc)}}
        )
        payment = db.payments.find_one({"id": payment_id}, {"_id": 0})
        await SocketEvents.emit_data_changed("payments")
        return payment
