from typing import Optional, List, Dict, Any, Union
from fastapi import HTTPException
from ..database import get_db
from ..sockets import SocketEvents
from .audit_service import create_audit_log

class TableService:
    @staticmethod
    async def get_floor_layout() -> List[Dict[str, Any]]:
        db = get_db()
        tables = list(db.dining_tables.find({}, {"_id": 0}).sort("tableNumber", 1))
        orders = list(db.orders.find(
            {"status": {"$in": ["NEW", "IN_KITCHEN", "READY", "SERVED", "BILLED"]}},
            {"_id": 0, "id": 1, "tableId": 1, "orderNumber": 1, "netAmount": 1, "items": 1, "status": 1, "createdAt": 1}
        ))

        # Attach active orders
        for t in tables:
            active_order = None
            for o in orders:
                is_match = (
                    o.get("tableId") == t.get("id")
                    or (t.get("isMergedChild") and t.get("primaryTableId") and o.get("tableId") == t.get("primaryTableId"))
                    or (t.get("isMerged") and t.get("mergedTableIds") and o.get("tableId") in t.get("mergedTableIds"))
                )
                if is_match:
                    active_order = o
                    break

            t["activeOrder"] = {
                "id": active_order["id"],
                "orderNumber": active_order.get("orderNumber"),
                "netAmount": active_order.get("netAmount", 0),
                "itemCount": len(active_order.get("items", [])),
                "status": active_order.get("status"),
                "createdAt": active_order.get("createdAt")
            } if active_order else None

        return tables

    @staticmethod
    async def update_status(table_id: str, status: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        table = db.dining_tables.find_one({"$or": [{"id": table_id}, {"tableNumber": table_id}]})
        if not table:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Table not found."})

        old_status = table.get("status")

        if status == "AVAILABLE" and (table.get("isMerged") or table.get("isMergedChild") or table.get("mergedTableIds")):
            await TableService.split_tables([table_id], user_id, username)
            refreshed = db.dining_tables.find_one({"id": table["id"]}, {"_id": 0})
            return refreshed or table

        update_fields = {"status": status}
        if status == "AVAILABLE":
            update_fields["currentOrderId"] = None

        db.dining_tables.update_one({"id": table["id"]}, {"$set": update_fields})
        table["status"] = status
        table.pop("_id", None)

        await SocketEvents.emit_table_updated(table)
        await SocketEvents.emit_data_changed("tables")

        await create_audit_log(
            module="Tables",
            action="STATUS_CHANGE",
            user_id=user_id,
            username=username,
            record_id=table_id,
            old_value={"status": old_status},
            new_value={"status": status}
        )

        return table

    @staticmethod
    async def transfer_table(source_table_id: str, dest_table_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        source_table = db.dining_tables.find_one({"$or": [{"id": source_table_id}, {"tableNumber": source_table_id}]})
        dest_table = db.dining_tables.find_one({"$or": [{"id": dest_table_id}, {"tableNumber": dest_table_id}]})

        if not source_table or not dest_table:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Table not found."})

        if dest_table.get("status") == "OCCUPIED":
            raise HTTPException(status_code=400, detail={"success": False, "message": "Destination table is currently occupied."})

        active_order = db.orders.find_one({
            "$or": [
                {"tableId": source_table["id"], "status": {"$in": ["NEW", "IN_KITCHEN", "READY", "SERVED", "BILLED"]}},
                *( [{"id": source_table.get("currentOrderId"), "status": {"$ne": "PAID"}}] if source_table.get("currentOrderId") else [] )
            ]
        })

        if active_order:
            db.orders.update_one(
                {"id": active_order["id"]},
                {"$set": {"tableId": dest_table["id"], "tableNumber": dest_table["tableNumber"]}}
            )

        db.dining_tables.update_one({"id": source_table["id"]}, {"$set": {"status": "AVAILABLE", "currentOrderId": None}})
        db.dining_tables.update_one({"id": dest_table["id"]}, {"$set": {"status": "OCCUPIED", "currentOrderId": active_order.get("id") if active_order else None}})

        s_tbl = db.dining_tables.find_one({"id": source_table["id"]}, {"_id": 0})
        d_tbl = db.dining_tables.find_one({"id": dest_table["id"]}, {"_id": 0})

        await SocketEvents.emit_table_updated(s_tbl)
        await SocketEvents.emit_table_updated(d_tbl)
        await SocketEvents.emit_data_changed("tables")

        await create_audit_log(
            module="Tables",
            action="TRANSFER_TABLE",
            user_id=user_id,
            username=username,
            record_id=dest_table["id"],
            old_value={"fromTable": source_table["tableNumber"]},
            new_value={"toTable": dest_table["tableNumber"], "orderId": active_order.get("id") if active_order else None}
        )

        return {"success": True, "message": f"Transferred from {source_table['tableNumber']} to {dest_table['tableNumber']}"}

    @staticmethod
    async def merge_tables(primary_table_id: str, secondary_table_ids: List[str], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        if not primary_table_id or not secondary_table_ids:
            raise HTTPException(status_code=400, detail={"success": False, "message": "Please select primary and secondary tables to merge."})

        all_ids = list(dict.fromkeys([primary_table_id, *secondary_table_ids]))
        db = get_db()
        tables = list(db.dining_tables.find({"$or": [{"id": {"$in": all_ids}}, {"tableNumber": {"$in": all_ids}}]}))
        if len(tables) < 2:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Selected tables not found."})

        primary_table = next((t for t in tables if t["id"] == primary_table_id or t.get("tableNumber") == primary_table_id), tables[0])
        secondary_tables = [t for t in tables if t["id"] != primary_table["id"]]

        total_capacity = sum(t.get("capacity", 4) for t in tables)
        all_table_numbers = [primary_table["tableNumber"]] + [s["tableNumber"] for s in secondary_tables]
        combined_name = " + ".join(all_table_numbers)
        final_all_ids = [primary_table["id"]] + [s["id"] for s in secondary_tables]

        # Combine active orders
        active_orders = list(db.orders.find({
            "tableId": {"$in": final_all_ids},
            "status": {"$in": ["NEW", "IN_KITCHEN", "READY", "SERVED", "BILLED"]}
        }).sort("createdAt", 1))

        combined_order = None
        if len(active_orders) == 1:
            combined_order = active_orders[0]
            db.orders.update_one(
                {"id": combined_order["id"]},
                {"$set": {"tableId": primary_table["id"], "tableNumber": combined_name}}
            )
            db.kot_tickets.update_many(
                {"orderId": combined_order["id"]},
                {"$set": {"tableNumber": combined_name, "tableId": primary_table["id"]}}
            )
        elif len(active_orders) > 1:
            primary_order = active_orders[0]
            other_orders = active_orders[1:]
            all_items = list(primary_order.get("items", []))
            total_amt = primary_order.get("totalAmount", 0)
            tax_amt = primary_order.get("taxAmount", 0)
            discount_amt = primary_order.get("discountAmount", 0)

            for ord_doc in other_orders:
                all_items.extend(ord_doc.get("items", []))
                total_amt += ord_doc.get("totalAmount", 0)
                tax_amt += ord_doc.get("taxAmount", 0)
                discount_amt += ord_doc.get("discountAmount", 0)

                db.kot_tickets.update_many(
                    {"orderId": ord_doc["id"]},
                    {"$set": {"orderId": primary_order["id"], "orderNumber": primary_order["orderNumber"], "tableNumber": combined_name, "tableId": primary_table["id"]}}
                )
                db.orders.update_one(
                    {"id": ord_doc["id"]},
                    {"$set": {"status": "CANCELLED", "notes": f"Items merged into {primary_order['orderNumber']}"}}
                )

            net_amt = total_amt + tax_amt - discount_amt
            db.orders.update_one(
                {"id": primary_order["id"]},
                {"$set": {
                    "items": all_items,
                    "totalAmount": total_amt,
                    "taxAmount": tax_amt,
                    "discountAmount": discount_amt,
                    "netAmount": net_amt,
                    "tableId": primary_table["id"],
                    "tableNumber": combined_name
                }}
            )
            combined_order = primary_order

        # Update primary table
        db.dining_tables.update_one(
            {"id": primary_table["id"]},
            {"$set": {
                "isMerged": True,
                "isMergedChild": False,
                "mergedWith": final_all_ids,
                "mergedTableIds": final_all_ids,
                "mergedTableNumbers": all_table_numbers,
                "mergedCapacity": total_capacity,
                "status": "OCCUPIED" if combined_order else "AVAILABLE",
                "currentOrderId": combined_order.get("id") if combined_order else None
            }}
        )

        # Update secondary tables
        for sec in secondary_tables:
            db.dining_tables.update_one(
                {"id": sec["id"]},
                {"$set": {
                    "isMerged": False,
                    "isMergedChild": True,
                    "primaryTableId": primary_table["id"],
                    "parentTableNumber": primary_table["tableNumber"],
                    "mergedWith": final_all_ids,
                    "mergedTableIds": final_all_ids,
                    "mergedTableNumbers": all_table_numbers,
                    "mergedCapacity": total_capacity,
                    "status": "OCCUPIED",
                    "currentOrderId": combined_order.get("id") if combined_order else None
                }}
            )

        refreshed_tables = list(db.dining_tables.find({"id": {"$in": final_all_ids}}, {"_id": 0}))
        for t in refreshed_tables:
            await SocketEvents.emit_table_updated(t)
        await SocketEvents.emit_data_changed("tables")
        await SocketEvents.emit_data_changed("orders")

        await create_audit_log(
            module="Tables",
            action="MERGE_TABLES",
            user_id=user_id,
            username=username,
            record_id=primary_table["id"],
            new_value={"primaryTable": primary_table["tableNumber"], "merged": all_table_numbers}
        )

        return {
            "success": True,
            "message": f"Tables {combined_name} merged successfully ({total_capacity} Seats)."
        }

    @staticmethod
    async def split_tables(table_ids: Union[List[str], str], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        ids = [table_ids] if isinstance(table_ids, str) else table_ids
        if not ids:
            raise HTTPException(status_code=400, detail={"success": False, "message": "No table IDs provided."})

        db = get_db()
        matched = list(db.dining_tables.find({"$or": [{"id": {"$in": ids}}, {"tableNumber": {"$in": ids}}]}))
        if not matched:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Tables not found."})

        group_ids = set()
        for t in matched:
            group_ids.add(t["id"])
            if t.get("mergedWith"):
                group_ids.update(t["mergedWith"])
            if t.get("primaryTableId"):
                group_ids.add(t["primaryTableId"])

        db.dining_tables.update_many(
            {"id": {"$in": list(group_ids)}},
            {"$set": {
                "isMerged": False,
                "isMergedChild": False,
                "primaryTableId": None,
                "parentTableNumber": None,
                "mergedWith": [],
                "mergedTableIds": [],
                "mergedTableNumbers": [],
                "mergedCapacity": None,
                "status": "AVAILABLE",
                "currentOrderId": None
            }}
        )

        refreshed = list(db.dining_tables.find({"id": {"$in": list(group_ids)}}, {"_id": 0}))
        for t in refreshed:
            await SocketEvents.emit_table_updated(t)
        await SocketEvents.emit_data_changed("tables")

        await create_audit_log(
            module="Tables",
            action="SPLIT_TABLES",
            user_id=user_id,
            username=username,
            record_id=",".join(ids)
        )

        return {"success": True, "message": "Tables unmerged successfully."}
