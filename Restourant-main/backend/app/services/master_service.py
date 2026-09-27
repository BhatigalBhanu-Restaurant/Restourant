import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from ..database import get_db
from ..sockets import SocketEvents
from .audit_service import create_audit_log

class MasterService:
    # --- CUSTOMERS ---
    @staticmethod
    async def get_customers(query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {}
        if query and query.get("search"):
            s = query["search"]
            filter_q["$or"] = [
                {"name": {"$regex": s, "$options": "i"}},
                {"phone": {"$regex": s, "$options": "i"}}
            ]
        return list(db.customers.find(filter_q, {"_id": 0}).sort("name", 1))

    @staticmethod
    async def create_customer(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        cust_id = f"cust_{uuid.uuid4().hex[:8]}"
        doc = {
            "id": cust_id,
            "name": data.get("name"),
            "phone": data.get("phone"),
            "email": data.get("email"),
            "address": data.get("address"),
            "city": data.get("city", "Rajkot"),
            "loyaltyPoints": int(data.get("loyaltyPoints", 0)),
            "totalSpent": float(data.get("totalSpent", 0)),
            "notes": data.get("notes"),
            "isActive": True,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }
        db.customers.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @staticmethod
    async def update_customer(customer_id: str, data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        data["updatedAt"] = datetime.now(timezone.utc)
        db.customers.update_one({"id": customer_id}, {"$set": data})
        return db.customers.find_one({"id": customer_id}, {"_id": 0})

    @staticmethod
    async def delete_customer(customer_id: str, user_id: Optional[str] = None, username: Optional[str] = None):
        db = get_db()
        db.customers.delete_one({"id": customer_id})
        return {"success": True}

    @staticmethod
    async def get_customer_history(customer_id: str) -> Dict[str, Any]:
        db = get_db()
        customer = db.customers.find_one({"id": customer_id}, {"_id": 0})
        orders = list(db.orders.find({"customerId": customer_id}, {"_id": 0}).sort("createdAt", -1))
        return {"customer": customer, "orders": orders}

    # --- SUPPLIERS ---
    @staticmethod
    async def get_suppliers() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.suppliers.find({}, {"_id": 0}).sort("name", 1))

    @staticmethod
    async def create_supplier(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        sup_id = f"sup_{uuid.uuid4().hex[:8]}"
        doc = {
            "id": sup_id,
            "name": data.get("name"),
            "companyName": data.get("companyName"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "taxId": data.get("taxId"),
            "address": data.get("address"),
            "paymentTerms": data.get("paymentTerms", "NET30"),
            "outstandingBalance": float(data.get("outstandingBalance", 0)),
            "isActive": True,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }
        db.suppliers.insert_one(doc)
        doc.pop("_id", None)
        return doc

    # --- DEPARTMENTS & DESIGNATIONS ---
    @staticmethod
    async def get_departments() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.departments.find({}, {"_id": 0}).sort("name", 1))

    @staticmethod
    async def create_department(data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        dept_id = data.get("id") or f"dept_{uuid.uuid4().hex[:8]}"
        doc = {"id": dept_id, **data, "createdAt": datetime.now(timezone.utc)}
        db.departments.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @staticmethod
    async def get_designations(dept_id: Optional[str] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {"departmentId": dept_id} if dept_id else {}
        return list(db.designations.find(filter_q, {"_id": 0}).sort("title", 1))

    # --- UNITS & TAXES ---
    @staticmethod
    async def get_units() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.units.find({}, {"_id": 0}))

    @staticmethod
    async def get_taxes() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.taxes.find({}, {"_id": 0}))

    # --- MENU CATEGORIES & ITEMS ---
    @staticmethod
    async def get_categories() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.menu_categories.find({}, {"_id": 0}).sort("displayOrder", 1))

    @staticmethod
    async def create_category(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        name = str(data.get("name") or "").strip()
        code = str(data.get("code") or "").strip().upper()
        if not name or not code:
            raise HTTPException(status_code=400, detail="Category name and code are required")
        if db.menu_categories.find_one({"code": code}):
            raise HTTPException(status_code=400, detail="A category with this code already exists")
        meal_period = data.get("mealPeriod") or "LUNCH"
        cat_id = f"cat_{uuid.uuid4().hex[:8]}"
        doc = {
            "id": cat_id,
            "name": name,
            "code": code,
            "description": str(data.get("description") or "").strip(),
            "mealPeriod": meal_period,
            "displayOrder": int(data.get("displayOrder", 1)),
            "isActive": data.get("isActive", True),
            "createdAt": datetime.now(timezone.utc)
        }
        db.menu_categories.insert_one(doc)
        doc.pop("_id", None)
        await SocketEvents.emit_master_updated({"entity": "menu_categories"})
        return doc

    @staticmethod
    async def update_category(cat_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        if "name" in data and not str(data["name"] or "").strip():
            raise HTTPException(status_code=400, detail="Category name is required")
        if "code" in data:
            data["code"] = str(data["code"] or "").strip().upper()
            if not data["code"]:
                raise HTTPException(status_code=400, detail="Category code is required")
            if db.menu_categories.find_one({"code": data["code"], "id": {"$ne": cat_id}}):
                raise HTTPException(status_code=400, detail="A category with this code already exists")
        if "name" in data:
            data["name"] = str(data["name"]).strip()
        data["updatedAt"] = datetime.now(timezone.utc)
        db.menu_categories.update_one({"id": cat_id}, {"$set": data})
        await SocketEvents.emit_master_updated({"entity": "menu_categories"})
        return db.menu_categories.find_one({"id": cat_id}, {"_id": 0})

    @staticmethod
    async def delete_category(cat_id: str):
        db = get_db()
        if db.menu_items.count_documents({"categoryId": cat_id}):
            raise HTTPException(status_code=400, detail="This category has food items. Move or delete its food items before deleting it")
        db.menu_categories.delete_one({"id": cat_id})
        await SocketEvents.emit_master_updated({"entity": "menu_categories"})
        return {"success": True}

    @staticmethod
    async def get_menu_items(query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {}
        if query:
            if query.get("categoryId"):
                filter_q["categoryId"] = query["categoryId"]
            if query.get("isVeg") is not None:
                filter_q["isVeg"] = str(query["isVeg"]).lower() == "true"
            if query.get("search"):
                filter_q["name"] = {"$regex": query["search"], "$options": "i"}

        return list(db.menu_items.find(filter_q, {"_id": 0}).sort("displayOrder", 1))

    @staticmethod
    async def create_menu_item(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        name = str(data.get("name") or "").strip()
        code = str(data.get("code") or "").strip().upper()
        category_id = data.get("categoryId")
        if not name or not code or not category_id:
            raise HTTPException(status_code=400, detail="Food item name, code and category are required")
        if not db.menu_categories.find_one({"id": category_id}):
            raise HTTPException(status_code=400, detail="Please select a valid menu category")
        if db.menu_items.find_one({"code": code}):
            raise HTTPException(status_code=400, detail="A food item with this code already exists")
        meal_period = data.get("mealPeriod")
        if not meal_period:
            cat = db.menu_categories.find_one({"id": category_id})
            meal_period = cat.get("mealPeriod", "LUNCH") if cat else "LUNCH"
        doc = {
            "id": item_id,
            "categoryId": category_id,
            "name": name,
            "code": code,
            "description": str(data.get("description") or "").strip(),
            "price": float(data.get("price", 0)),
            "costPrice": float(data.get("costPrice", 0)),
            "taxId": data.get("taxId", "tax_gst_5"),
            "isVeg": data.get("isVeg", True),
            "mealPeriod": meal_period,
            "preparationTimeMinutes": int(data.get("preparationTimeMinutes", 10)),
            "displayOrder": int(data.get("displayOrder", 1)),
            "isAvailable": data.get("isAvailable", True),
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }
        db.menu_items.insert_one(doc)
        doc.pop("_id", None)
        await SocketEvents.emit_master_updated({"entity": "menu_items"})
        return doc

    @staticmethod
    async def update_menu_item(item_id: str, data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        if "name" in data and not str(data["name"] or "").strip():
            raise HTTPException(status_code=400, detail="Food item name is required")
        if "code" in data:
            data["code"] = str(data["code"] or "").strip().upper()
            if not data["code"]:
                raise HTTPException(status_code=400, detail="Food item code is required")
            if db.menu_items.find_one({"code": data["code"], "id": {"$ne": item_id}}):
                raise HTTPException(status_code=400, detail="A food item with this code already exists")
        if "categoryId" in data and not db.menu_categories.find_one({"id": data["categoryId"]}):
            raise HTTPException(status_code=400, detail="Please select a valid menu category")
        if "name" in data:
            data["name"] = str(data["name"]).strip()
        data["updatedAt"] = datetime.now(timezone.utc)
        db.menu_items.update_one({"id": item_id}, {"$set": data})
        updated = db.menu_items.find_one({"id": item_id}, {"_id": 0})
        await SocketEvents.emit_master_updated({"entity": "menu_items"})
        return updated

    @staticmethod
    async def delete_menu_item(item_id: str):
        db = get_db()
        db.menu_items.delete_one({"id": item_id})
        await SocketEvents.emit_master_updated({"entity": "menu_items"})
        return {"success": True}

    # --- FLOOR ZONES & DINING TABLES ---
    @staticmethod
    async def get_floor_zones() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.floor_zones.find({}, {"_id": 0}).sort("displayOrder", 1))

    @staticmethod
    async def create_floor_zone(data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        zone_id = data.get("id") or f"zone_{uuid.uuid4().hex[:8]}"
        doc = {
            "id": zone_id,
            "code": data.get("code", zone_id.upper()),
            "name": data.get("name"),
            "description": data.get("description"),
            "color": data.get("color", "#0d6efd"),
            "displayOrder": int(data.get("displayOrder", 1)),
            "isActive": True
        }
        db.floor_zones.insert_one(doc)
        doc.pop("_id", None)
        await SocketEvents.emit_data_changed("floor-zones")
        return doc

    @staticmethod
    async def get_tables() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.dining_tables.find({}, {"_id": 0}).sort("tableNumber", 1))

    @staticmethod
    async def create_table(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        table_id = data.get("id") or f"tbl_{uuid.uuid4().hex[:8]}"
        doc = {
            "id": table_id,
            "tableNumber": data.get("tableNumber"),
            "capacity": int(data.get("capacity", 4)),
            "floorZone": data.get("floorZone", "MAIN_HALL"),
            "status": "AVAILABLE",
            "isMerged": False,
            "isMergedChild": False
        }
        db.dining_tables.insert_one(doc)
        doc.pop("_id", None)
        await SocketEvents.emit_table_updated(doc)
        await SocketEvents.emit_data_changed("tables")
        return doc

    @staticmethod
    async def update_table(table_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        db.dining_tables.update_one({"id": table_id}, {"$set": data})
        table = db.dining_tables.find_one({"id": table_id}, {"_id": 0})
        await SocketEvents.emit_table_updated(table)
        await SocketEvents.emit_data_changed("tables")
        return table

    @staticmethod
    async def delete_table(table_id: str):
        db = get_db()
        db.dining_tables.delete_one({"id": table_id})
        await SocketEvents.emit_data_changed("tables")
        return {"success": True}

    # --- DISCOUNT RULES ---
    @staticmethod
    async def get_discount_rules() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.discount_rules.find({}, {"_id": 0}))

    @staticmethod
    async def create_discount_rule(data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_db()
        doc = {"id": f"disc_{uuid.uuid4().hex[:8]}", **data, "createdAt": datetime.now(timezone.utc)}
        db.discount_rules.insert_one(doc)
        doc.pop("_id", None)
        return doc
