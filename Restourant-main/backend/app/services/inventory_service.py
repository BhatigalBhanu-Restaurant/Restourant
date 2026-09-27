import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from ..database import get_db
from .audit_service import create_audit_log

class InventoryService:
    @staticmethod
    async def get_items(query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {}
        if query and query.get("category"):
            filter_q["category"] = query["category"]
        return list(db.inventory_items.find(filter_q, {"_id": 0}).sort("name", 1))

    @staticmethod
    async def create_item(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        item_id = data.get("id") or f"inv_{uuid.uuid4().hex[:8]}"
        doc = {
            "id": item_id,
            "itemCode": data.get("itemCode", item_id.upper()[:8]),
            "name": data.get("name"),
            "category": data.get("category", "RAW_MATERIAL"),
            "unitId": data.get("unitId", "unit_kg"),
            "unitSymbol": data.get("unitSymbol", "kg"),
            "currentStock": float(data.get("currentStock", 0.0)),
            "minimumStockLevel": float(data.get("minimumStockLevel", 5.0)),
            "reorderQuantity": float(data.get("reorderQuantity", 20.0)),
            "costPerUnit": float(data.get("costPerUnit", 0.0)),
            "isActive": True,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }
        db.inventory_items.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @staticmethod
    async def update_item(item_id: str, data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        data["updatedAt"] = datetime.now(timezone.utc)
        db.inventory_items.update_one({"id": item_id}, {"$set": data})
        return db.inventory_items.find_one({"id": item_id}, {"_id": 0})

    @staticmethod
    async def perform_stock_in(item_id: str, quantity: float, unit_price: float = 0.0, notes: Optional[str] = None, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        item = db.inventory_items.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Inventory item not found."})

        stock_before = float(item.get("currentStock", 0.0))
        stock_after = stock_before + quantity

        db.inventory_items.update_one(
            {"id": item_id},
            {"$set": {"currentStock": stock_after, "updatedAt": datetime.now(timezone.utc)}}
        )

        db.stock_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "itemId": item_id,
            "itemName": item.get("name"),
            "transactionType": "STOCK_IN",
            "quantity": quantity,
            "unitPrice": unit_price,
            "totalCost": quantity * unit_price,
            "stockBefore": stock_before,
            "stockAfter": stock_after,
            "notes": notes,
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc)
        })

        return {"item": item.get("name"), "currentStock": stock_after, "added": quantity}

    @staticmethod
    async def perform_stock_out(item_id: str, quantity: float, notes: Optional[str] = None, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        item = db.inventory_items.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Inventory item not found."})

        stock_before = float(item.get("currentStock", 0.0))
        stock_after = max(0.0, stock_before - quantity)

        db.inventory_items.update_one(
            {"id": item_id},
            {"$set": {"currentStock": stock_after, "updatedAt": datetime.now(timezone.utc)}}
        )

        db.stock_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "itemId": item_id,
            "itemName": item.get("name"),
            "transactionType": "STOCK_OUT",
            "quantity": quantity,
            "stockBefore": stock_before,
            "stockAfter": stock_after,
            "notes": notes,
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc)
        })

        return {"item": item.get("name"), "currentStock": stock_after, "deducted": quantity}

    @staticmethod
    async def adjust_stock(item_id: str, adj_type: str, quantity: float, reason: Optional[str] = None, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        if adj_type == "INCREASE":
            return await InventoryService.perform_stock_in(item_id, quantity, notes=reason, user_id=user_id, username=username)
        else:
            return await InventoryService.perform_stock_out(item_id, quantity, notes=reason, user_id=user_id, username=username)

    @staticmethod
    async def get_low_stock_alerts() -> List[Dict[str, Any]]:
        db = get_db()
        items = list(db.inventory_items.find({}, {"_id": 0}))
        return [it for it in items if float(it.get("currentStock", 0)) <= float(it.get("minimumStockLevel", 5))]

    @staticmethod
    async def get_recipes() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.recipes.find({}, {"_id": 0}))

    @staticmethod
    async def create_recipe(data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        recipe_id = data.get("id") or f"rec_{uuid.uuid4().hex[:8]}"
        doc = {"id": recipe_id, **data, "createdAt": datetime.now(timezone.utc)}
        db.recipes.update_one({"menuItemId": data.get("menuItemId")}, {"$set": doc}, upsert=True)
        doc.pop("_id", None)
        return doc
