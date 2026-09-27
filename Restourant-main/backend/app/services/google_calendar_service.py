"""
Google Calendar Service — Bhatigal Bhanu Restaurant
====================================================
Service Account based integration. Automatically syncs Function bookings to Google Calendar.

SETUP GUIDE (Step-by-step):
1. Go to https://console.cloud.google.com/
2. Create a project called "Bhatigal-Bhanu"
3. Enable "Google Calendar API" in APIs & Services
4. Go to "IAM & Admin" → "Service Accounts" → "Create Service Account"
5. Name: "bhatigal-bhanu-calendar", click Create
6. Click on the created service account → "Keys" tab → "Add Key" → "JSON"
7. Download the JSON file and save it as: backend/google_service_account.json
8. Open Google Calendar → Settings → Your calendar → "Share with specific people"
9. Add the service account email (shown in step 5) with "Make changes to events" permission
10. Copy the Calendar ID from Calendar Settings and set it in .env as:
    GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com

The system will automatically:
- Create an event when a booking is CONFIRMED
- Update the event when booking is updated
- Delete the event when booking is CANCELLED
"""

import os
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, date, timezone, timedelta

logger = logging.getLogger("restaurant_erp")

# Try to import Google libraries — graceful fallback if not installed
try:
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    from google.oauth2 import service_account
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    logger.warning("[GoogleCalendar] google-api-python-client not installed. Run: pip install google-api-python-client google-auth")

SCOPES = ["https://www.googleapis.com/auth/calendar"]
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "google_service_account.json")
CALENDAR_ID = os.getenv("GOOGLE_CALENDAR_ID", "")  # Set in .env file


def _get_service():
    """Build Google Calendar API service using Service Account credentials."""
    if not GOOGLE_AVAILABLE:
        raise RuntimeError("google-api-python-client not installed")

    sa_file = os.path.abspath(SERVICE_ACCOUNT_FILE)
    if not os.path.exists(sa_file):
        raise FileNotFoundError(
            f"Service account file not found: {sa_file}\n"
            "Please follow the SETUP GUIDE in this file to configure Google Calendar."
        )

    if not CALENDAR_ID:
        raise ValueError(
            "GOOGLE_CALENDAR_ID not set in .env file.\n"
            "Please add GOOGLE_CALENDAR_ID=your-calendar-id@gmail.com to backend/.env"
        )

    credentials = service_account.Credentials.from_service_account_file(
        sa_file, scopes=SCOPES
    )
    return build("calendar", "v3", credentials=credentials)


def _is_configured() -> bool:
    """Check if Google Calendar is properly configured."""
    if not GOOGLE_AVAILABLE:
        return False
    sa_file = os.path.abspath(SERVICE_ACCOUNT_FILE)
    return os.path.exists(sa_file) and bool(CALENDAR_ID)


def _booking_to_event(booking: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a booking document to a Google Calendar event."""
    booking_date = booking.get("bookingDate", "")  # format: YYYY-MM-DD
    customer_name = booking.get("customerName", "Valued Guest")
    customer_phone = booking.get("customerPhone", "")
    guest_count = booking.get("guestCount", 1)
    event_type = booking.get("eventType", "Function")
    booking_number = booking.get("bookingNumber", "")
    advance = booking.get("advanceAmount", 0)
    notes = booking.get("specialRequirements", "")
    status = booking.get("status", "CONFIRMED")

    # Color ID based on status
    color_map = {
        "CONFIRMED": "9",   # Blueberry
        "SEATED": "11",     # Tomato (active)
        "CHECKED_IN": "2",  # Sage (in-house)
        "CHECKED_OUT": "8", # Graphite (done)
        "CANCELLED": "4",   # Flamingo (cancelled)
        "PENDING": "5",     # Banana (pending)
    }
    color_id = color_map.get(status, "9")

    description_parts = [
        f"Booking #: {booking_number}",
        f"Guests: {guest_count}",
        f"Phone: {customer_phone}",
        f"Advance Paid: ₹{advance}",
        f"Status: {status}",
    ]
    if notes:
        description_parts.append(f"Notes: {notes}")

    event = {
        "summary": f"🍽️ {customer_name} — {event_type} [{booking_number}]",
        "description": "\n".join(description_parts),
        "colorId": color_id,
        "start": {
            "date": booking_date,
            "timeZone": "Asia/Kolkata"
        },
        "end": {
            "date": booking_date,
            "timeZone": "Asia/Kolkata"
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email",   "minutes": 24 * 60},
                {"method": "popup",   "minutes": 60},
            ]
        },
        "extendedProperties": {
            "private": {
                "bhatigalBookingId": booking.get("id", ""),
                "system": "bhatigal-bhanu-erp"
            }
        }
    }
    return event


class GoogleCalendarService:
    """Service to sync bookings with Google Calendar."""

    @staticmethod
    def is_configured() -> bool:
        return _is_configured()

    @staticmethod
    def _menu_to_event(menu: Dict[str, Any]) -> Dict[str, Any]:
        """Convert a daily menu document to a Google Calendar event."""
        day_of_week = menu.get("dayOfWeek", "MONDAY")
        real_date = menu.get("realDate", "")  # YYYY-MM-DD format
        item_names = menu.get("itemNames", [])
        notes = menu.get("notes", "")
        price = menu.get("price", 250)
        saved_by = menu.get("savedBy", "System")

        items_text = "\n".join(f"• {n}" for n in item_names) if item_names else "No items scheduled"

        description_parts = [
            f"Day: {day_of_week}",
            f"Unlimited Thali Price: ₹{price}/-",
            f"Items ({len(item_names)}):",
            items_text,
        ]
        if notes:
            description_parts.append(f"Chef Notes: {notes}")
        description_parts.append(f"Last Updated By: {saved_by}")

        event = {
            "summary": f"🍽️ Daily Menu — {day_of_week} ({len(item_names)} items)",
            "description": "\n".join(description_parts),
            "colorId": "2",  # Sage green for daily menus
            "start": {
                "date": real_date,
                "timeZone": "Asia/Kolkata"
            },
            "end": {
                "date": real_date,
                "timeZone": "Asia/Kolkata"
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": 60},
                ]
            },
            "extendedProperties": {
                "private": {
                    "bhatigalMenuDay": day_of_week,
                    "system": "bhatigal-bhanu-erp",
                    "type": "daily_menu"
                }
            }
        }
        return event

    @staticmethod
    def _calculate_real_date(day_of_week: str) -> str:
        """Calculate the real calendar date for the given day-of-week (next occurrence)."""
        days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
        target_idx = days.index(day_of_week.upper())
        now = datetime.now()
        current_idx = now.weekday()  # Monday=0, Sunday=6
        diff = target_idx - current_idx
        if diff < 0:
            diff += 7
        target_date = now + timedelta(days=diff)
        return target_date.strftime("%Y-%m-%d")

    @staticmethod
    async def create_menu_event(menu: Dict[str, Any]) -> Optional[str]:
        """Create a Google Calendar event for a daily menu. Returns event ID."""
        if not _is_configured():
            logger.debug("[GoogleCalendar] Not configured, skipping create_menu_event")
            return None
        try:
            service = _get_service()
            # Ensure realDate is set
            if not menu.get("realDate"):
                menu = dict(menu)
                menu["realDate"] = GoogleCalendarService._calculate_real_date(menu.get("dayOfWeek", "MONDAY"))
            event_body = GoogleCalendarService._menu_to_event(menu)
            result = service.events().insert(
                calendarId=CALENDAR_ID,
                body=event_body
            ).execute()
            event_id = result.get("id")
            logger.info(f"[GoogleCalendar] Created menu event: {event_id} for {menu.get('dayOfWeek')}")
            return event_id
        except Exception as e:
            logger.error(f"[GoogleCalendar] Failed to create menu event: {e}")
            return None

    @staticmethod
    async def update_menu_event(google_event_id: str, menu: Dict[str, Any]) -> bool:
        """Update an existing Google Calendar menu event."""
        if not _is_configured() or not google_event_id:
            return False
        try:
            service = _get_service()
            if not menu.get("realDate"):
                menu = dict(menu)
                menu["realDate"] = GoogleCalendarService._calculate_real_date(menu.get("dayOfWeek", "MONDAY"))
            event_body = GoogleCalendarService._menu_to_event(menu)
            service.events().update(
                calendarId=CALENDAR_ID,
                eventId=google_event_id,
                body=event_body
            ).execute()
            logger.info(f"[GoogleCalendar] Updated menu event: {google_event_id}")
            return True
        except Exception as e:
            logger.error(f"[GoogleCalendar] Failed to update menu event {google_event_id}: {e}")
            return False

    @staticmethod
    async def delete_menu_event(google_event_id: str) -> bool:
        """Delete a Google Calendar menu event."""
        if not _is_configured() or not google_event_id:
            return False
        try:
            service = _get_service()
            service.events().delete(
                calendarId=CALENDAR_ID,
                eventId=google_event_id
            ).execute()
            logger.info(f"[GoogleCalendar] Deleted menu event: {google_event_id}")
            return True
        except Exception as e:
            logger.error(f"[GoogleCalendar] Failed to delete menu event {google_event_id}: {e}")
            return False

    @staticmethod
    async def create_event(booking: Dict[str, Any]) -> Optional[str]:
        """Create a Google Calendar event for a booking. Returns event ID."""
        if not _is_configured():
            logger.debug("[GoogleCalendar] Not configured, skipping create_event")
            return None
        try:
            service = _get_service()
            event_body = _booking_to_event(booking)
            result = service.events().insert(
                calendarId=CALENDAR_ID,
                body=event_body
            ).execute()
            event_id = result.get("id")
            logger.info(f"[GoogleCalendar] Created event: {event_id} for booking {booking.get('id')}")
            return event_id
        except Exception as e:
            logger.error(f"[GoogleCalendar] Failed to create event: {e}")
            return None

    @staticmethod
    async def update_event(google_event_id: str, booking: Dict[str, Any]) -> bool:
        """Update an existing Google Calendar event."""
        if not _is_configured() or not google_event_id:
            return False
        try:
            service = _get_service()
            event_body = _booking_to_event(booking)
            service.events().update(
                calendarId=CALENDAR_ID,
                eventId=google_event_id,
                body=event_body
            ).execute()
            logger.info(f"[GoogleCalendar] Updated event: {google_event_id}")
            return True
        except Exception as e:
            logger.error(f"[GoogleCalendar] Failed to update event {google_event_id}: {e}")
            return False

    @staticmethod
    async def delete_event(google_event_id: str) -> bool:
        """Delete a Google Calendar event."""
        if not _is_configured() or not google_event_id:
            return False
        try:
            service = _get_service()
            service.events().delete(
                calendarId=CALENDAR_ID,
                eventId=google_event_id
            ).execute()
            logger.info(f"[GoogleCalendar] Deleted event: {google_event_id}")
            return True
        except Exception as e:
            logger.error(f"[GoogleCalendar] Failed to delete event {google_event_id}: {e}")
            return False

    @staticmethod
    async def get_events_for_month(year: int, month: int) -> List[Dict[str, Any]]:
        """Fetch all Google Calendar events for a given month."""
        if not _is_configured():
            return []
        try:
            from datetime import datetime as dt
            import calendar as cal

            service = _get_service()
            start = dt(year, month, 1).isoformat() + "Z"
            last_day = cal.monthrange(year, month)[1]
            end = dt(year, month, last_day, 23, 59, 59).isoformat() + "Z"

            result = service.events().list(
                calendarId=CALENDAR_ID,
                timeMin=start,
                timeMax=end,
                singleEvents=True,
                orderBy="startTime"
            ).execute()
            return result.get("items", [])
        except Exception as e:
            logger.error(f"[GoogleCalendar] Failed to fetch events: {e}")
            return []

    @staticmethod
    async def get_calendar_info() -> Dict[str, Any]:
        """Get basic info about the configured calendar."""
        if not _is_configured():
            return {
                "configured": False,
                "message": "Google Calendar not configured. Follow setup guide in google_calendar_service.py"
            }
        try:
            service = _get_service()
            cal = service.calendars().get(calendarId=CALENDAR_ID).execute()
            return {
                "configured": True,
                "calendarId": CALENDAR_ID,
                "summary": cal.get("summary", ""),
                "timeZone": cal.get("timeZone", "Asia/Kolkata")
            }
        except Exception as e:
            return {
                "configured": False,
                "error": str(e)
            }
