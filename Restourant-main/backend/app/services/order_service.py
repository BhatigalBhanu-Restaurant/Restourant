import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from ..database import get_db
from ..sockets import SocketEvents
from .audit_service import create_audit_log

class OrderService:
    @staticmethod
    async def get_orders(query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {}
        if query:
            status = query.get("status")
            if status == "ACTIVE":
                filter_q["status"] = {"$in": ["NEW", "IN_KITCHEN", "READY", "SERVED", "BILLED"]}
            elif status:
                filter_q["status"] = status
            if query.get("orderType"):
                filter_q["orderType"] = query["orderType"]
            if query.get("tableId"):
                filter_q["tableId"] = query["tableId"]

        return list(db.orders.find(filter_q, {"_id": 0}).sort("createdAt", -1))

    @staticmethod
    async def get_order_by_id(order_id: str) -> Dict[str, Any]:
        db = get_db()
        order = db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Order not found."})
        return order

    @staticmethod
    async def create_order(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        count = db.orders.count_documents({})
        year = datetime.now(timezone.utc).year
        order_number = f"ORD-{year}-{str(count + 1).zfill(4)}"
        order_id = f"ord_{uuid.uuid4().hex[:8]}"

        raw_items = data.get("items", [])
        item_ids = [it.get("menuItemId") for it in raw_items if it.get("menuItemId")]
        menu_items_map = {m["id"]: m for m in db.menu_items.find({"id": {"$in": item_ids}})}

        total_amount = 0.0
        tax_amount = 0.0
        processed_items = []

        for it in raw_items:
            m_item = menu_items_map.get(it.get("menuItemId"))
            item_name = it.get("itemName") or (m_item.get("name") if m_item else "Dish")
            unit_price = float(it.get("unitPrice") or (it.get("price") or (m_item.get("price", 0) if m_item else 0)))
            qty = int(it.get("quantity", 1))
            line_total = unit_price * qty
            tax_rate = float(it.get("taxRate") or (m_item.get("taxRate", 5) if m_item else 5))
            line_tax = (line_total * tax_rate) / 100.0

            total_amount += line_total
            tax_amount += line_tax

            processed_items.append({
                "id": str(uuid.uuid4()),
                "menuItemId": it.get("menuItemId"),
                "itemName": item_name,
                "quantity": qty,
                "unitPrice": unit_price,
                "totalPrice": line_total,
                "taxAmount": line_tax,
                "discountAmount": float(it.get("discountAmount", 0)),
                "notes": it.get("notes"),
                "status": "KOT_SENT",
                "createdAt": datetime.now(timezone.utc).isoformat()
            })

        effective_table_id = data.get("tableId")
        effective_table_number = data.get("tableNumber")

        if effective_table_id:
            table = db.dining_tables.find_one({"$or": [{"id": effective_table_id}, {"tableNumber": effective_table_id}]})
            if table:
                effective_table_id = table["id"]
                if table.get("isMergedChild") and table.get("primaryTableId"):
                    effective_table_id = table["primaryTableId"]
                    parent_tbl = db.dining_tables.find_one({"id": table["primaryTableId"]})
                    if parent_tbl and parent_tbl.get("mergedTableNumbers"):
                        effective_table_number = " + ".join(parent_tbl["mergedTableNumbers"])
                    else:
                        effective_table_number = parent_tbl.get("tableNumber") if parent_tbl else table["tableNumber"]
                elif table.get("isMerged") and table.get("mergedTableNumbers"):
                    effective_table_number = " + ".join(table["mergedTableNumbers"])
                else:
                    effective_table_number = effective_table_number or table.get("tableNumber")

                all_group_ids = [effective_table_id] + (table.get("mergedTableIds") or [])
                db.dining_tables.update_many(
                    {"$or": [{"id": {"$in": all_group_ids}}, {"primaryTableId": effective_table_id}]},
                    {"$set": {"status": "OCCUPIED", "currentOrderId": order_id}}
                )
                await SocketEvents.emit_table_updated({"id": effective_table_id, "status": "OCCUPIED"})
                await SocketEvents.emit_data_changed("tables")

        discount_amount = float(data.get("discountAmount", 0))
        net_amount = total_amount + tax_amount - discount_amount

        order_doc = {
            "id": order_id,
            "orderNumber": order_number,
            "orderType": data.get("orderType", "DINE_IN"),
            "tableId": effective_table_id,
            "tableNumber": effective_table_number,
            "customerId": data.get("customerId"),
            "customerName": data.get("customerName"),
            "customerPhone": data.get("customerPhone"),
            "deliveryAddress": data.get("deliveryAddress"),
            "status": "IN_KITCHEN",
            "items": processed_items,
            "totalAmount": total_amount,
            "taxAmount": tax_amount,
            "discountAmount": discount_amount,
            "netAmount": net_amount,
            "waiterId": data.get("waiterId") or user_id,
            "createdBy": user_id,
            "notes": data.get("notes"),
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }

        db.orders.insert_one(order_doc)

        # Generate KOT Ticket
        kot_count = db.kot_tickets.count_documents({})
        kot_number = f"KOT-{kot_count + 1001}"
        kot_id = f"kot_{uuid.uuid4().hex[:8]}"

        kot_items = [
            {
                "id": str(uuid.uuid4()),
                "orderItemId": it["id"],
                "menuItemId": it["menuItemId"],
                "itemName": it["itemName"],
                "quantity": it["quantity"],
                "notes": it.get("notes"),
                "status": "NEW"
            }
            for it in processed_items
        ]

        kot_doc = {
            "id": kot_id,
            "kotNumber": kot_number,
            "orderId": order_id,
            "tableId": effective_table_id,
            "tableNumber": effective_table_number,
            "orderType": order_doc["orderType"],
            "status": "NEW",
            "priority": data.get("priority", "NORMAL"),
            "items": kot_items,
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }

        db.kot_tickets.insert_one(kot_doc)

        # Remove mongo _id for socket broadcasting
        order_doc.pop("_id", None)
        kot_doc.pop("_id", None)

        await SocketEvents.emit_order_created(order_doc)
        await SocketEvents.emit_kot_created(kot_doc)
        await SocketEvents.emit_data_changed("orders")

        await create_audit_log(
            module="POS / Orders",
            action="CREATE_ORDER",
            user_id=user_id,
            username=username,
            record_id=order_id,
            new_value={"orderNumber": order_number, "netAmount": net_amount}
        )

        return {"order": order_doc, "kot": kot_doc}

    @staticmethod
    async def add_items_to_order(order_id: str, new_items: List[Dict[str, Any]], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        order = db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Order not found."})

        item_ids = [it.get("menuItemId") for it in new_items if it.get("menuItemId")]
        menu_items_map = {m["id"]: m for m in db.menu_items.find({"id": {"$in": item_ids}})}

        existing_items = list(order.get("items", []))
        total_amount = order.get("totalAmount", 0.0)
        tax_amount = order.get("taxAmount", 0.0)
        added_items = []

        for it in new_items:
            m_item = menu_items_map.get(it.get("menuItemId"))
            item_name = it.get("itemName") or (m_item.get("name") if m_item else "Dish")
            unit_price = float(it.get("unitPrice") or (it.get("price") or (m_item.get("price", 0) if m_item else 0)))
            qty = int(it.get("quantity", 1))
            line_total = unit_price * qty
            tax_rate = float(it.get("taxRate") or (m_item.get("taxRate", 5) if m_item else 5))
            line_tax = (line_total * tax_rate) / 100.0

            total_amount += line_total
            tax_amount += line_tax

            item_obj = {
                "id": str(uuid.uuid4()),
                "menuItemId": it.get("menuItemId"),
                "itemName": item_name,
                "quantity": qty,
                "unitPrice": unit_price,
                "totalPrice": line_total,
                "taxAmount": line_tax,
                "discountAmount": float(it.get("discountAmount", 0)),
                "notes": it.get("notes"),
                "status": "KOT_SENT",
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            existing_items.append(item_obj)
            added_items.append(item_obj)

        discount_amount = order.get("discountAmount", 0.0)
        net_amount = total_amount + tax_amount - discount_amount

        db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "items": existing_items,
                "totalAmount": total_amount,
                "taxAmount": tax_amount,
                "netAmount": net_amount,
                "status": "IN_KITCHEN",
                "updatedAt": datetime.now(timezone.utc)
            }}
        )

        # Generate Running KOT Ticket
        kot_count = db.kot_tickets.count_documents({})
        kot_number = f"KOT-{kot_count + 1001}"
        kot_id = f"kot_{uuid.uuid4().hex[:8]}"

        kot_items = [
            {
                "id": str(uuid.uuid4()),
                "orderItemId": it["id"],
                "menuItemId": it["menuItemId"],
                "itemName": it["itemName"],
                "quantity": it["quantity"],
                "notes": it.get("notes"),
                "status": "NEW"
            }
            for it in added_items
        ]

        kot_doc = {
            "id": kot_id,
            "kotNumber": kot_number,
            "orderId": order_id,
            "tableId": order.get("tableId"),
            "tableNumber": order.get("tableNumber"),
            "orderType": order.get("orderType", "DINE_IN"),
            "status": "NEW",
            "priority": "NORMAL",
            "items": kot_items,
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }

        db.kot_tickets.insert_one(kot_doc)

        updated_order = db.orders.find_one({"id": order_id}, {"_id": 0})
        kot_doc.pop("_id", None)

        await SocketEvents.emit_order_updated(updated_order)
        await SocketEvents.emit_kot_created(kot_doc)
        await SocketEvents.emit_data_changed("orders")

        return {"order": updated_order, "kot": kot_doc}

    @staticmethod
    async def hold_order(order_id: str) -> Dict[str, Any]:
        db = get_db()
        db.orders.update_one({"id": order_id}, {"$set": {"isHeld": True, "status": "ON_HOLD", "updatedAt": datetime.now(timezone.utc)}})
        order = db.orders.find_one({"id": order_id}, {"_id": 0})
        await SocketEvents.emit_order_updated(order)
        return order

    @staticmethod
    async def resume_order(order_id: str) -> Dict[str, Any]:
        db = get_db()
        db.orders.update_one({"id": order_id}, {"$set": {"isHeld": False, "status": "IN_KITCHEN", "updatedAt": datetime.now(timezone.utc)}})
        order = db.orders.find_one({"id": order_id}, {"_id": 0})
        await SocketEvents.emit_order_updated(order)
        return order

    @staticmethod
    async def mark_served(order_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        order = db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Order not found."})

        now = datetime.now(timezone.utc)
        db.orders.update_one({"id": order_id}, {"$set": {"status": "SERVED", "updatedAt": now}})
        db.kot_tickets.update_many(
            {"orderId": order_id, "status": {"$ne": "CANCELLED"}},
            {"$set": {"status": "SERVED", "servedAt": now, "items.$[].status": "SERVED", "updatedAt": now}}
        )

        updated = db.orders.find_one({"id": order_id}, {"_id": 0})
        await SocketEvents.emit_order_updated(updated)
        await SocketEvents.emit_data_changed("orders")

        await create_audit_log(
            module="POS / Orders",
            action="ORDER_SERVED",
            user_id=user_id,
            username=username,
            record_id=order_id,
            new_value={"status": "SERVED"}
        )

        return updated

    @staticmethod
    async def cancel_order(order_id: str, reason: Optional[str] = None, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        order = db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Order not found."})

        now = datetime.now(timezone.utc)
        notes = f"{order.get('notes', '')}; Cancelled: {reason or 'N/A'}".strip("; ")
        db.orders.update_one({"id": order_id}, {"$set": {"status": "CANCELLED", "notes": notes, "updatedAt": now}})
        db.kot_tickets.update_many({"orderId": order_id}, {"$set": {"status": "CANCELLED", "updatedAt": now}})

        table_id = order.get("tableId")
        if table_id:
            table = db.dining_tables.find_one({"id": table_id})
            if table:
                if table.get("isMerged") or table.get("isMergedChild") or table.get("mergedTableIds"):
                    await TableService.split_tables([table_id], user_id, username)
                else:
                    db.dining_tables.update_one({"id": table_id}, {"$set": {"status": "AVAILABLE", "currentOrderId": None}})
                    t_doc = db.dining_tables.find_one({"id": table_id}, {"_id": 0})
                    await SocketEvents.emit_table_updated(t_doc)
                    await SocketEvents.emit_data_changed("tables")

        updated = db.orders.find_one({"id": order_id}, {"_id": 0})
        await SocketEvents.emit_order_updated(updated)
        await SocketEvents.emit_data_changed("orders")

        await create_audit_log(
            module="POS / Orders",
            action="CANCEL_ORDER",
            user_id=user_id,
            username=username,
            record_id=order_id,
            new_value={"status": "CANCELLED", "reason": reason}
        )

        return updated

    @staticmethod
    async def complete_order(order_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        """Finalize order, free tables, and perform Recipe-based inventory deduction."""
        db = get_db()
        order = db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Order not found."})

        now = datetime.now(timezone.utc)
        db.orders.update_one({"id": order_id}, {"$set": {"status": "COMPLETED", "updatedAt": now}})

        # Free table
        table_id = order.get("tableId")
        if table_id:
            table = db.dining_tables.find_one({"id": table_id})
            if table:
                if table.get("isMerged") or table.get("isMergedChild") or table.get("mergedTableIds"):
                    await TableService.split_tables([table_id], user_id, username)
                else:
                    db.dining_tables.update_one({"id": table_id}, {"$set": {"status": "AVAILABLE", "currentOrderId": None}})
                    t_doc = db.dining_tables.find_one({"id": table_id}, {"_id": 0})
                    await SocketEvents.emit_table_updated(t_doc)
                    await SocketEvents.emit_data_changed("tables")

        # AUTOMATIC RECIPE INVENTORY CONSUMPTION
        try:
            for item in order.get("items", []):
                recipe = db.recipes.find_one({"menuItemId": item.get("menuItemId")})
                if recipe and recipe.get("ingredients"):
                    for ing in recipe["ingredients"]:
                        consumed_qty = float(ing.get("quantity", 0)) * int(item.get("quantity", 1))
                        inv_item = db.inventory_items.find_one({"id": ing.get("inventoryItemId")})
                        if inv_item:
                            stock_before = float(inv_item.get("currentStock", 0))
                            stock_after = max(0.0, stock_before - consumed_qty)
                            db.inventory_items.update_one(
                                {"id": inv_item["id"]},
                                {"$set": {"currentStock": stock_after, "updatedAt": now}}
                            )
                            # Record transaction ledger
                            db.stock_transactions.insert_one({
                                "id": str(uuid.uuid4()),
                                "itemId": inv_item["id"],
                                "itemName": inv_item.get("name"),
                                "transactionType": "RECIPE_CONSUMPTION",
                                "quantity": consumed_qty,
                                "unitPrice": inv_item.get("costPerUnit", 0),
                                "totalCost": consumed_qty * float(inv_item.get("costPerUnit", 0)),
                                "referenceType": "ORDER",
                                "referenceId": order.get("orderNumber"),
                                "stockBefore": stock_before,
                                "stockAfter": stock_after,
                                "createdBy": user_id,
                                "createdAt": now
                            })
        except Exception as e:
            pass

        updated = db.orders.find_one({"id": order_id}, {"_id": 0})
        await SocketEvents.emit_order_updated(updated)
        await SocketEvents.emit_data_changed("orders")
        return updated
