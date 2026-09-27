from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Set
from ..database import get_db

class DashboardService:
    @staticmethod
    async def get_dashboard_metrics(effective_permissions: Optional[Set[str]] = None) -> Dict[str, Any]:
        db = get_db()
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        current_day_name = now.strftime("%A").upper()

        # 1. Functions / Bookings (Today & Upcoming)
        today_bookings = list(db.bookings.find({"bookingDate": today_str, "status": {"$ne": "CANCELLED"}}, {"_id": 0}))
        upcoming_bookings = list(db.bookings.find(
            {"bookingDate": {"$gte": today_str}, "status": {"$ne": "CANCELLED"}},
            {"_id": 0}
        ).sort("bookingDate", 1).limit(10))

        # 2. Inventory Low Stock
        inventory = list(db.inventory_items.find({}, {"_id": 0}))
        low_stock_items = [
            i for i in inventory 
            if float(i.get("currentStock", 0)) <= float(i.get("minimumStockLevel", 5))
        ]

        # 3. Staff Count
        staff_count = db.employees.count_documents({"status": "ACTIVE"})

        # 4. Today's Daily Menu Rotation
        daily_menu_doc = db.daily_menus.find_one({"dayOfWeek": current_day_name}, {"_id": 0})
        daily_menu_item_ids = daily_menu_doc.get("itemIds", []) if daily_menu_doc else []

        # 5. Catalog Dishes & Active Users
        catalog_dishes_count = db.menu_items.count_documents({"isAvailable": True})
        active_users_count = db.users.count_documents({"status": "ACTIVE"})

        return {
            "todayBookingsCount": len(today_bookings),
            "recentBookings": upcoming_bookings,
            "lowStockItemsCount": len(low_stock_items),
            "inventory": {
                "lowStockCount": len(low_stock_items),
                "lowStockItems": low_stock_items[:8]
            },
            "totalStaffCount": staff_count,
            "catalogDishesCount": catalog_dishes_count,
            "activeUsersCount": active_users_count,
            "currentDay": current_day_name,
            "dailyMenuItemsCount": len(daily_menu_item_ids)
        }
