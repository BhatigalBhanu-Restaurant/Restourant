import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from ..database import get_db
from .inventory_service import InventoryService
from .audit_service import create_audit_log

class PurchaseService:
    @staticmethod
    async def get_purchase_orders(query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {}
        if query and query.get("status"):
            filter_q["status"] = query["status"]
        return list(db.purchase_orders.find(filter_q, {"_id": 0}).sort("createdAt", -1))

    @staticmethod
    async def create_purchase_order(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        count = db.purchase_orders.count_documents({})
        year = datetime.now(timezone.utc).year
        po_number = f"PO-{year}-{str(count + 1).zfill(4)}"
        po_id = f"po_{uuid.uuid4().hex[:8]}"

        doc = {
            "id": po_id,
            "poNumber": po_number,
            "supplierId": data.get("supplierId"),
            "supplierName": data.get("supplierName"),
            "items": data.get("items", []),
            "totalAmount": float(data.get("totalAmount", 0)),
            "status": "PENDING_APPROVAL",
            "deliveryDate": data.get("deliveryDate"),
            "notes": data.get("notes"),
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }
        db.purchase_orders.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @staticmethod
    async def approve_purchase_order(po_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        db.purchase_orders.update_one(
            {"id": po_id},
            {"$set": {"status": "APPROVED", "approvedBy": user_id, "updatedAt": datetime.now(timezone.utc)}}
        )
        return db.purchase_orders.find_one({"id": po_id}, {"_id": 0})

    @staticmethod
    async def receive_goods(po_id: str, grn_number: str, received_items: List[Dict[str, Any]], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        po = db.purchase_orders.find_one({"id": po_id})
        if not po:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Purchase order not found."})

        # Increase inventory for received items
        for it in received_items:
            item_id = it.get("inventoryItemId") or it.get("itemId")
            qty = float(it.get("quantity", 0))
            price = float(it.get("unitPrice", 0))
            if item_id and qty > 0:
                await InventoryService.perform_stock_in(
                    item_id=item_id,
                    quantity=qty,
                    unit_price=price,
                    notes=f"GRN Received: {grn_number} (PO: {po['poNumber']})",
                    user_id=user_id,
                    username=username
                )

        db.purchase_orders.update_one(
            {"id": po_id},
            {"$set": {"status": "RECEIVED", "grnNumber": grn_number, "receivedAt": datetime.now(timezone.utc), "updatedAt": datetime.now(timezone.utc)}}
        )
        return db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
