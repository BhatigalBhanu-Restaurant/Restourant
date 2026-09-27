from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from ..database import get_db
from ..sockets import sio

ALL_DAYS = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY"
]

class DailyMenuService:
    @staticmethod
    def get_current_day_of_week() -> str:
        days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
        now = datetime.now()
        idx = (now.weekday() + 1) % 7
        return days[idx]

    @staticmethod
    async def get_all_daily_menus() -> Dict[str, Any]:
        db = get_db()
        existing = list(db.daily_menus.find({}, {"_id": 0}))
        current_day = DailyMenuService.get_current_day_of_week()

        days_list = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
        now_local = datetime.now()
        current_idx = now_local.weekday()
        real_dates: Dict[str, str] = {}
        for d in days_list:
            target_idx = days_list.index(d)
            diff = target_idx - current_idx
            if diff < 0:
                diff += 7
            target_date = now_local + timedelta(days=diff)
            real_dates[d] = target_date.strftime("%Y-%m-%d")

        results = []
        for day in ALL_DAYS:
            menu = next((m for m in existing if m.get("dayOfWeek") == day), None)
            if not menu:
                menu = {
                    "id": f"daily_menu_{day.lower()}",
                    "dayOfWeek": day,
                    "lunchItemIds": [],
                    "dinnerItemIds": [],
                    "isActive": True,
                    "notes": ""
                }
                db.daily_menus.insert_one(menu)
                menu.pop("_id", None)

            lunch_item_ids = menu.get("lunchItemIds", [])
            dinner_item_ids = menu.get("dinnerItemIds", [])
            all_item_ids = list(set(lunch_item_ids + dinner_item_ids))

            lunch_items = list(db.menu_items.find(
                {"id": {"$in": lunch_item_ids}},
                {"_id": 0, "id": 1, "name": 1, "code": 1, "price": 1, "isVeg": 1, "isAvailable": 1, "categoryId": 1, "preparationTimeMinutes": 1}
            ))
            dinner_items = list(db.menu_items.find(
                {"id": {"$in": dinner_item_ids}},
                {"_id": 0, "id": 1, "name": 1, "code": 1, "price": 1, "isVeg": 1, "isAvailable": 1, "categoryId": 1, "preparationTimeMinutes": 1}
            ))

            results.append({
                "id": menu.get("id"),
                "dayOfWeek": day,
                "realDate": menu.get("realDate") or real_dates.get(day, ""),
                "lunchItemIds": lunch_item_ids,
                "dinnerItemIds": dinner_item_ids,
                "lunchItems": lunch_items,
                "dinnerItems": dinner_items,
                "lunchItemCount": len(lunch_item_ids),
                "dinnerItemCount": len(dinner_item_ids),
                "itemCount": len(all_item_ids),
                "isActive": menu.get("isActive", True),
                "notes": menu.get("notes", ""),
                "isToday": day == current_day
            })

        return {
            "currentDayOfWeek": current_day,
            "days": results,
            "menus": results
        }

    @staticmethod
    async def get_today_daily_menu(requested_day: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        current_day = DailyMenuService.get_current_day_of_week()

        target_day = (requested_day.upper() if requested_day else None) or current_day
        menu = db.daily_menus.find_one({"dayOfWeek": target_day}, {"_id": 0})

        lunch_item_ids = menu.get("lunchItemIds", []) if menu else []
        dinner_item_ids = menu.get("dinnerItemIds", []) if menu else []
        all_item_ids = list(set(lunch_item_ids + dinner_item_ids))

        lunch_items = list(db.menu_items.find(
            {"id": {"$in": lunch_item_ids}},
            {"_id": 0, "id": 1, "name": 1, "code": 1, "price": 1, "isVeg": 1, "isAvailable": 1, "categoryId": 1, "preparationTimeMinutes": 1}
        ))
        dinner_items = list(db.menu_items.find(
            {"id": {"$in": dinner_item_ids}},
            {"_id": 0, "id": 1, "name": 1, "code": 1, "price": 1, "isVeg": 1, "isAvailable": 1, "categoryId": 1, "preparationTimeMinutes": 1}
        ))
        all_items = list(db.menu_items.find(
            {"id": {"$in": all_item_ids}},
            {"_id": 0, "id": 1, "name": 1, "code": 1, "price": 1, "isVeg": 1, "isAvailable": 1, "categoryId": 1, "preparationTimeMinutes": 1}
        ))

        return {
            "dayOfWeek": target_day,
            "actualDayOfWeek": current_day,
            "isActive": menu.get("isActive", True) if menu else True,
            "notes": menu.get("notes", "") if menu else "",
            "lunchItemIds": lunch_item_ids,
            "dinnerItemIds": dinner_item_ids,
            "itemIds": all_item_ids,
            "lunchItemCount": len(lunch_item_ids),
            "dinnerItemCount": len(dinner_item_ids),
            "itemCount": len(all_item_ids),
            "lunchItems": lunch_items,
            "dinnerItems": dinner_items,
            "items": all_items
        }

    @staticmethod
    async def get_daily_menu_status() -> Dict[str, Any]:
        current_day = DailyMenuService.get_current_day_of_week()
        return {
            "currentDayOfWeek": current_day
        }

    @staticmethod
    async def get_daily_menu_by_day(day: str) -> Dict[str, Any]:
        db = get_db()
        menu = db.daily_menus.find_one({"dayOfWeek": day.upper()}, {"_id": 0})
        lunch_item_ids = menu.get("lunchItemIds", []) if menu else []
        dinner_item_ids = menu.get("dinnerItemIds", []) if menu else []
        all_item_ids = list(set(lunch_item_ids + dinner_item_ids))
        items = list(db.menu_items.find({"id": {"$in": all_item_ids}}, {"_id": 0}))
        return {
            "dayOfWeek": day.upper(),
            "lunchItemIds": lunch_item_ids,
            "dinnerItemIds": dinner_item_ids,
            "itemIds": all_item_ids,
            "items": items,
            "isActive": menu.get("isActive", True) if menu else True
        }

    @staticmethod
    async def save_daily_menu(
        day: str,
        lunch_item_ids: List[str] = None,
        dinner_item_ids: List[str] = None,
        item_ids: List[str] = None,
        notes: Optional[str] = None,
        is_active: bool = True,
        user_id: Optional[str] = None,
        username: Optional[str] = None
    ) -> Dict[str, Any]:
        db = get_db()
        day_upper = day.upper()
        now_utc = datetime.now(timezone.utc)

        # Handle backward compatibility - if only item_ids provided, split by current logic
        if item_ids is not None and lunch_item_ids is None and dinner_item_ids is None:
            # For backward compat, put all in lunch by default
            lunch_item_ids = item_ids
            dinner_item_ids = []

        if lunch_item_ids is None:
            lunch_item_ids = []
        if dinner_item_ids is None:
            dinner_item_ids = []

        days_list = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
        target_idx = days_list.index(day_upper)
        now_local = datetime.now()
        current_idx = now_local.weekday()
        diff = target_idx - current_idx
        if diff < 0:
            diff += 7
        target_date = now_local + timedelta(days=diff)
        real_date_str = target_date.strftime("%Y-%m-%d")

        all_item_ids = list(set(lunch_item_ids + dinner_item_ids))
        items = list(db.menu_items.find(
            {"id": {"$in": all_item_ids}},
            {"_id": 0, "id": 1, "name": 1, "nameGujarati": 1, "categoryId": 1, "price": 1}
        ))
        item_names = [it.get("nameGujarati") or it.get("name") for it in items]

        doc = {
            "id": f"daily_menu_{day_upper.lower()}",
            "dayOfWeek": day_upper,
            "realDate": real_date_str,
            "lunchItemIds": lunch_item_ids,
            "dinnerItemIds": dinner_item_ids,
            "itemNames": item_names,
            "notes": notes or "",
            "isActive": is_active,
            "updatedAt": now_utc
        }
        db.daily_menus.update_one({"dayOfWeek": day_upper}, {"$set": doc}, upsert=True)

        await sio.emit("daily_menu.updated", {
            "dayOfWeek": day_upper,
            "realDate": real_date_str,
            "lunchItemIds": lunch_item_ids,
            "dinnerItemIds": dinner_item_ids,
            "lunchItemCount": len(lunch_item_ids),
            "dinnerItemCount": len(dinner_item_ids),
            "itemCount": len(all_item_ids),
            "items": [{"id": it.get("id"), "name": it.get("name"), "nameGujarati": it.get("nameGujarati"), "categoryId": it.get("categoryId")} for it in items],
            "updatedAt": now_utc.isoformat(),
            "savedBy": username or "System"
        })

        try:
            from .google_calendar_service import GoogleCalendarService
            if GoogleCalendarService.is_configured():
                menu_doc = dict(doc)
                menu_doc["price"] = 250
                existing_event_id = db.daily_menu_configs.find_one(
                    {"id": "default_config"}, {"_id": 0}
                )
                event_id = await GoogleCalendarService.create_menu_event(menu_doc)
                if event_id:
                    doc["googleCalendarEventId"] = event_id
                    db.daily_menus.update_one(
                        {"dayOfWeek": day_upper},
                        {"$set": {"googleCalendarEventId": event_id}}
                    )
        except Exception as gc_err:
            print(f"[DailyMenuService] Google Calendar sync failed for {day_upper}: {gc_err}")

        return doc