from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional, List
from ..services.master_service import MasterService
from ..middleware.auth import get_current_user, get_optional_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/masters", tags=["Master Data"])

# --- CUSTOMERS ---
@router.get("/customers")
async def get_customers(search: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    query = {"search": search} if search else None
    customers = await MasterService.get_customers(query)
    return ApiResponse.success(data=customers)

@router.post("/customers")
async def create_customer(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    cust = await MasterService.create_customer(body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=cust, message="Customer created successfully")

@router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    cust = await MasterService.update_customer(customer_id, body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=cust, message="Customer updated successfully")

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    await MasterService.delete_customer(customer_id, current_user["userId"], current_user["username"])
    return ApiResponse.success(message="Customer deleted successfully")

# --- SUPPLIERS ---
@router.get("/suppliers")
async def get_suppliers(current_user: Dict[str, Any] = Depends(get_current_user)):
    suppliers = await MasterService.get_suppliers()
    return ApiResponse.success(data=suppliers)

@router.post("/suppliers")
async def create_supplier(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    sup = await MasterService.create_supplier(body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=sup, message="Supplier created successfully")

@router.put("/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..database import get_db
    from datetime import datetime, timezone
    db = get_db()
    body["updatedAt"] = datetime.now(timezone.utc)
    db.suppliers.update_one({"id": supplier_id}, {"$set": body})
    updated = db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    return ApiResponse.success(data=updated, message="Supplier updated successfully")

@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..database import get_db
    db = get_db()
    db.suppliers.delete_one({"id": supplier_id})
    return ApiResponse.success(message="Supplier deleted successfully")

# --- DEPARTMENTS & DESIGNATIONS ---
@router.get("/departments")
async def get_departments(current_user: Dict[str, Any] = Depends(get_current_user)):
    depts = await MasterService.get_departments()
    return ApiResponse.success(data=depts)

@router.post("/departments")
async def create_department(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    dept = await MasterService.create_department(body)
    return ApiResponse.success(data=dept, message="Department created successfully")

@router.get("/designations")
async def get_designations(departmentId: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    desigs = await MasterService.get_designations(departmentId)
    return ApiResponse.success(data=desigs)

# --- UNITS & TAXES ---
@router.get("/units")
async def get_units(current_user: Dict[str, Any] = Depends(get_current_user)):
    units = await MasterService.get_units()
    return ApiResponse.success(data=units)

@router.get("/taxes")
async def get_taxes(current_user: Dict[str, Any] = Depends(get_current_user)):
    taxes = await MasterService.get_taxes()
    return ApiResponse.success(data=taxes)

# --- MENU CATEGORIES ---
@router.get("/menu-categories")
async def get_categories(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    cats = await MasterService.get_categories()
    return ApiResponse.success(data=cats)

@router.post("/menu-categories")
async def create_category(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    cat = await MasterService.create_category(body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=cat, message="Menu category created successfully")

@router.put("/menu-categories/{cat_id}")
async def update_category(cat_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    cat = await MasterService.update_category(cat_id, body)
    return ApiResponse.success(data=cat, message="Menu category updated successfully")

@router.delete("/menu-categories/{cat_id}")
async def delete_category(cat_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    await MasterService.delete_category(cat_id)
    return ApiResponse.success(message="Menu category deleted successfully")

# --- MENU ITEMS ---
@router.get("/menu-items")
async def get_menu_items(
    categoryId: Optional[str] = None,
    isVeg: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    query = {}
    if categoryId:
        query["categoryId"] = categoryId
    if isVeg is not None:
        query["isVeg"] = isVeg
    if search:
        query["search"] = search
    
    items = await MasterService.get_menu_items(query)
    return ApiResponse.success(data=items)

@router.post("/menu-items")
async def create_menu_item(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    item = await MasterService.create_menu_item(body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=item, message="Menu item created successfully")

@router.put("/menu-items/{item_id}")
async def update_menu_item(item_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    item = await MasterService.update_menu_item(item_id, body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=item, message="Menu item updated successfully")

@router.patch("/menu-items/{item_id}/availability")
async def update_availability(item_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    is_avail = body.get("isAvailable", True)
    item = await MasterService.update_menu_item(item_id, {"isAvailable": is_avail}, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=item, message="Availability updated")

@router.delete("/menu-items/{item_id}")
async def delete_menu_item(item_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    await MasterService.delete_menu_item(item_id)
    return ApiResponse.success(message="Menu item deleted successfully")

# --- FLOOR ZONES ---
@router.get("/floor-zones")
async def get_floor_zones(current_user: Dict[str, Any] = Depends(get_current_user)):
    zones = await MasterService.get_floor_zones()
    return ApiResponse.success(data=zones)

@router.post("/floor-zones")
async def create_floor_zone(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    zone = await MasterService.create_floor_zone(body)
    return ApiResponse.success(data=zone, message="Floor zone created successfully")

@router.put("/floor-zones/{zone_id}")
async def update_floor_zone(zone_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..database import get_db
    from ..sockets import SocketEvents
    db = get_db()
    db.floor_zones.update_one({"id": zone_id}, {"$set": body})
    updated = db.floor_zones.find_one({"id": zone_id}, {"_id": 0})
    await SocketEvents.emit_data_changed("floor-zones")
    return ApiResponse.success(data=updated, message="Floor zone updated successfully")

@router.delete("/floor-zones/{zone_id}")
async def delete_floor_zone(zone_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..database import get_db
    from ..sockets import SocketEvents
    db = get_db()
    db.floor_zones.delete_one({"id": zone_id})
    await SocketEvents.emit_data_changed("floor-zones")
    return ApiResponse.success(message="Floor zone deleted successfully")

# --- TABLES ---
@router.get("/tables")
async def get_tables(current_user: Dict[str, Any] = Depends(get_current_user)):
    tables = await MasterService.get_tables()
    return ApiResponse.success(data=tables)

@router.post("/tables")
async def create_table(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    table = await MasterService.create_table(body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=table, message="Table created successfully")

@router.put("/tables/{table_id}")
async def update_table(table_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    table = await MasterService.update_table(table_id, body)
    return ApiResponse.success(data=table, message="Table updated successfully")

@router.delete("/tables/{table_id}")
async def delete_table(table_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    await MasterService.delete_table(table_id)
    return ApiResponse.success(message="Table deleted successfully")

# --- DISCOUNT RULES ---
@router.get("/discount-rules")
async def get_discount_rules(current_user: Dict[str, Any] = Depends(get_current_user)):
    rules = await MasterService.get_discount_rules()
    return ApiResponse.success(data=rules)

@router.post("/discount-rules")
async def create_discount_rule(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    rule = await MasterService.create_discount_rule(body)
    return ApiResponse.success(data=rule, message="Discount rule created successfully")
