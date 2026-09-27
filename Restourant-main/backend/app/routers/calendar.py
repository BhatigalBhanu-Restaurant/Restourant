from fastapi import APIRouter, Depends, Query, Response, HTTPException
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import urllib.parse
from ..middleware.auth import get_current_user, get_optional_current_user
from ..utils.response import ApiResponse
from ..database import get_db
from ..services.google_calendar_service import GoogleCalendarService
from ..services.booking_service import BookingService

router = APIRouter(prefix="/calendar", tags=["Calendar"])

@router.get("/status")
async def calendar_status(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Check if Google Calendar is configured and connected."""
    info = await GoogleCalendarService.get_calendar_info()
    return ApiResponse.success(data=info)

@router.get("/events")
async def get_calendar_events(
    month: Optional[str] = Query(None, description="Month in YYYY-MM format"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all bookings + Google Calendar events for a month.
    Returns combined data: local DB bookings + Google Calendar events.
    """
    db = get_db()
    now = datetime.now()
    
    if month:
        try:
            year, mon = int(month.split("-")[0]), int(month.split("-")[1])
        except Exception:
            year, mon = now.year, now.month
    else:
        year, mon = now.year, now.month

    month_prefix = f"{year}-{str(mon).zfill(2)}"

    # Local DB bookings for the month
    local_bookings = list(db.bookings.find(
        {"bookingDate": {"$regex": f"^{month_prefix}"}},
        {"_id": 0}
    ).sort("bookingDate", 1))

    # Google Calendar events (if configured)
    google_events = await GoogleCalendarService.get_events_for_month(year, mon)

    # Build a map of date → bookings for easy frontend consumption
    date_map: Dict[str, Any] = {}
    for booking in local_bookings:
        d = booking.get("bookingDate", "")
        if d not in date_map:
            date_map[d] = {"bookings": [], "isLocked": False}
        date_map[d]["bookings"].append(booking)
        if booking.get("isLocked"):
            date_map[d]["isLocked"] = True

    return ApiResponse.success(data={
        "month": month_prefix,
        "dateMap": date_map,
        "bookings": local_bookings,
        "googleEvents": [
            {
                "id": e.get("id"),
                "summary": e.get("summary"),
                "date": (e.get("start", {}).get("date") or e.get("start", {}).get("dateTime", "")[:10]),
                "colorId": e.get("colorId"),
                "description": e.get("description", "")
            }
            for e in google_events
        ],
        "googleConfigured": GoogleCalendarService.is_configured()
    })

@router.get("/today")
async def get_today_data(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    """Get today's bookings + daily menu for the real-time widget."""
    db = get_db()
    now_local = datetime.now()
    today = now_local.strftime("%Y-%m-%d")
    today_day = now_local.strftime("%A").upper()

    # Today's bookings
    bookings_today = list(db.bookings.find({"bookingDate": today}, {"_id": 0}))

    # Today's daily menu
    menu_doc = db.daily_menus.find_one({"dayOfWeek": today_day}, {"_id": 0})
    menu_items = []
    if menu_doc and menu_doc.get("itemIds"):
        menu_items = list(db.menu_items.find(
            {"id": {"$in": menu_doc["itemIds"]}},
            {"_id": 0, "id": 1, "name": 1, "nameGujarati": 1, "categoryId": 1, "price": 1}
        ))

    return ApiResponse.success(data={
        "date": today,
        "dayOfWeek": today_day,
        "bookingsCount": len(bookings_today),
        "bookings": bookings_today,
        "menuItemCount": len(menu_items),
        "menuItems": menu_items,
        "isMenuSet": len(menu_items) > 0
    })

@router.get("/export.ics")
async def export_ics_calendar(
    month: Optional[str] = Query(None, description="Optional YYYY-MM filter")
):
    """
    Export all bookings as an RFC 5545 standard .ics file.
    Can be imported or subscribed to directly in Google Calendar, Apple Calendar, or Outlook.
    """
    db = get_db()
    query = {"status": {"$ne": "CANCELLED"}}
    if month:
        query["bookingDate"] = {"$regex": f"^{month}"}

    bookings = list(db.bookings.find(query, {"_id": 0}).sort("bookingDate", 1))
    ics_content = BookingService.generate_ics(bookings, "Bhatigal Bhanu Function Bookings")

    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": 'attachment; filename="bhatigal_bhanu_functions.ics"',
            "Cache-Control": "no-cache"
        }
    )

@router.get("/{booking_id}/ics")
async def export_single_booking_ics(booking_id: str):
    """Export a single function booking as a calendar invite .ics file."""
    db = get_db()
    booking = db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    ics_content = BookingService.generate_ics([booking], f"Booking {booking.get('bookingNumber', '')}")
    filename = f"booking_{booking.get('bookingNumber', booking_id)}.ics"

    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache"
        }
    )

@router.get("/google-url/{booking_id}")
async def get_google_calendar_url(booking_id: str):
    """Generate a direct web 1-click Google Calendar URL to add this booking to personal Google Calendar."""
    db = get_db()
    booking = db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    b_date = booking.get("bookingDate", "")
    date_compact = b_date.replace("-", "")
    title = f"Function: {booking.get('customerName')} ({booking.get('functionType', 'Banquet')})"
    details = (
        f"Booking Number: {booking.get('bookingNumber')}\n"
        f"Host: {booking.get('customerName')}\n"
        f"Mobile: {booking.get('customerPhone')}\n"
        f"Guests Expected: {booking.get('guestCount')}\n"
        f"Time Slot: {booking.get('timeSlot', booking.get('bookingTime'))}\n"
        f"Venue: {booking.get('venueArea', 'Banquet Hall')}\n"
        f"Advance Paid: Rs. {booking.get('advanceAmount', 0)}\n"
        f"Notes: {booking.get('notes', '')}"
    )
    location = "Bhatigal Bhanu Traditional Dining & Banquet Hall"

    params = {
        "action": "TEMPLATE",
        "text": title,
        "dates": f"{date_compact}/{date_compact}",
        "details": details,
        "location": location
    }
    url = f"https://calendar.google.com/calendar/render?{urllib.parse.urlencode(params)}"
    return ApiResponse.success(data={"url": url})

@router.post("/sync-google")
async def sync_to_google(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Manually sync all CONFIRMED bookings to Google Calendar."""
    if not GoogleCalendarService.is_configured():
        return ApiResponse.success(data={"synced": 0, "message": "Google Calendar not configured"})

    db = get_db()
    bookings = list(db.bookings.find(
        {"status": {"$in": ["CONFIRMED", "SEATED", "CHECKED_IN"]}, "googleCalendarEventId": {"$exists": False}},
        {"_id": 0}
    ))

    synced = 0
    for booking in bookings:
        event_id = await GoogleCalendarService.create_event(booking)
        if event_id:
            db.bookings.update_one(
                {"id": booking["id"]},
                {"$set": {"googleCalendarEventId": event_id}}
            )
            synced += 1

    return ApiResponse.success(data={"synced": synced, "total": len(bookings)},
                               message=f"Synced {synced} bookings to Google Calendar")

