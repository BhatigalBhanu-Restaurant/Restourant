from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from ..database import get_db
from ..services.daily_menu_service import DailyMenuService
from ..middleware.auth import get_current_user, get_optional_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/daily-menu", tags=["7-Day Daily Menu"])

@router.get("")
async def get_all_menus(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    data = await DailyMenuService.get_all_daily_menus()
    return ApiResponse.success(data=data)

@router.get("/today")
async def get_today_menu(day: Optional[str] = None):
    data = await DailyMenuService.get_today_daily_menu(requested_day=day)
    return ApiResponse.success(data=data)

@router.post("")
async def save_menu(body: Dict[str, Any], current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    day = body.get("dayOfWeek") or body.get("day")
    if not day:
        raise HTTPException(status_code=400, detail={"success": False, "message": "dayOfWeek is required."})
    
    lunch_item_ids = body.get("lunchItemIds", [])
    dinner_item_ids = body.get("dinnerItemIds", [])
    item_ids = body.get("itemIds", [])
    notes = body.get("notes", "")
    is_active = body.get("isActive", True)

    user_id = current_user.get("userId") if current_user else "usr_superadmin"
    username = current_user.get("username") if current_user else "superadmin"

    res = await DailyMenuService.save_daily_menu(
        day=day,
        lunch_item_ids=lunch_item_ids,
        dinner_item_ids=dinner_item_ids,
        item_ids=item_ids if item_ids else None,
        notes=notes,
        is_active=is_active,
        user_id=user_id,
        username=username
    )
    return ApiResponse.success(data=res, message=f"{day} menu updated successfully")

@router.post("/copy")
async def copy_menu(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    src = (body.get("fromDay") or body.get("sourceDay") or "").upper()
    target_days = body.get("toDays") or [body.get("targetDay")]
    target_days = [str(day).upper() for day in target_days if day]
    if not src or not target_days:
        raise HTTPException(status_code=400, detail={"success": False, "message": "fromDay and at least one target day are required."})

    src_menu = db.daily_menus.find_one({"dayOfWeek": src})
    if not src_menu:
        raise HTTPException(status_code=404, detail={"success": False, "message": f"Source menu for {src} not found."})

    lunch_item_ids = src_menu.get("lunchItemIds", [])
    dinner_item_ids = src_menu.get("dinnerItemIds", [])
    copied_menus = []
    for target_day in target_days:
        if target_day == src:
            continue
        copied_menus.append(await DailyMenuService.save_daily_menu(
            day=target_day,
            lunch_item_ids=lunch_item_ids,
            dinner_item_ids=dinner_item_ids,
            notes=f"Copied from {src}",
            user_id=current_user["userId"],
            username=current_user["username"]
        ))

    return ApiResponse.success(
        data={"sourceDay": src, "targetDays": [menu["dayOfWeek"] for menu in copied_menus], "menus": copied_menus},
        message=f"Menu successfully copied from {src} to {len(copied_menus)} day(s)"
    )

from fastapi.responses import StreamingResponse
import base64
from ..services.poster_service import PosterService

@router.get("/{day}/poster")
async def get_menu_poster(day: str, price: int = 250, theme: str = "maroon", format: str = "image"):
    buf = PosterService.generate_menu_poster(day_of_week=day, price=price, theme=theme)
    if format == "json":
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return ApiResponse.success(data={
            "day": day.upper(),
            "price": price,
            "theme": theme,
            "dataUrl": f"data:image/png;base64,{b64}"
        })
    return StreamingResponse(buf, media_type="image/png")

@router.post("/{day}/poster")
async def create_custom_poster(day: str, body: Dict[str, Any] = {}):
    price = body.get("price", 220)
    theme = body.get("theme", "royal_maroon")
    format_style = body.get("format", "FORMAT_KATHIYAWADI_CARD")
    custom_date = body.get("date")
    buf = PosterService.generate_menu_poster(
        day_of_week=day,
        price=price,
        theme=theme,
        format_style=format_style,
        custom_date_str=custom_date
    )
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return ApiResponse.success(data={
        "day": day.upper(),
        "price": price,
        "theme": theme,
        "formatStyle": format_style,
        "dataUrl": f"data:image/png;base64,{b64}"
    })

@router.post("/{day}/poster/save")
async def save_poster(day: str, body: Dict[str, Any] = {}, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    price = body.get("price", 220)
    theme = body.get("theme", "royal_maroon")
    format_style = body.get("format", "FORMAT_KATHIYAWADI_CARD")
    custom_date = body.get("date")
    username = current_user.get("username") if current_user else "System"
    record = PosterService.save_poster(
        day_of_week=day,
        price=price,
        theme=theme,
        format_style=format_style,
        custom_date_str=custom_date,
        saved_by=username,
        preview_data_url=body.get("previewDataUrl")
    )
    return ApiResponse.success(data=record, message=f"Poster saved for {day.upper()}")

@router.get("/{day}/posters")
async def list_posters(day: str):
    posters = PosterService.list_posters(day_of_week=day)
    return ApiResponse.success(data={"day": day.upper(), "posters": posters, "count": len(posters)})

@router.get("/posters/all")
async def list_all_posters():
    posters = PosterService.list_posters()
    return ApiResponse.success(data={"posters": posters, "count": len(posters)})

@router.delete("/posters/{poster_id}")
async def delete_poster(poster_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    ok = PosterService.delete_poster(poster_id)
    if not ok:
        raise HTTPException(status_code=404, detail={"success": False, "message": "Poster not found."})
    return ApiResponse.success(data={"id": poster_id}, message="Poster deleted successfully")

@router.post("/sync-google-calendar")
async def sync_daily_menus_to_google(current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..services.google_calendar_service import GoogleCalendarService
    if not GoogleCalendarService.is_configured():
        return ApiResponse.success(data={"synced": 0, "message": "Google Calendar not configured"})

    db = get_db()
    menus = list(db.daily_menus.find({"isActive": True}, {"_id": 0}))
    synced = 0
    for menu in menus:
        try:
            if not menu.get("realDate"):
                from ..services.daily_menu_service import DailyMenuService
                days_list = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
                target_idx = days_list.index(menu["dayOfWeek"])
                now_local = datetime.now()
                current_idx = now_local.weekday()
                diff = target_idx - current_idx
                if diff < 0:
                    diff += 7
                target_date = now_local + timedelta(days=diff)
                menu["realDate"] = target_date.strftime("%Y-%m-%d")

            existing_event_id = menu.get("googleCalendarEventId")
            if existing_event_id:
                await GoogleCalendarService.update_menu_event(existing_event_id, menu)
            else:
                event_id = await GoogleCalendarService.create_menu_event(menu)
                if event_id:
                    db.daily_menus.update_one(
                        {"dayOfWeek": menu["dayOfWeek"]},
                        {"$set": {"googleCalendarEventId": event_id}}
                    )
                    menu["googleCalendarEventId"] = event_id
            synced += 1
        except Exception as e:
            print(f"[DailyMenu] Failed to sync menu for {menu.get('dayOfWeek')}: {e}")

    return ApiResponse.success(
        data={"synced": synced, "total": len(menus)},
        message=f"Synced {synced} daily menus to Google Calendar"
    )