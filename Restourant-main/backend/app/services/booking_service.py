import re
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from ..database import get_db
from ..sockets import SocketEvents, sio
from .audit_service import create_audit_log
from .google_calendar_service import GoogleCalendarService

class BookingService:
    @staticmethod
    def booking_period(data: Dict[str, Any]) -> str:
        value = f"{data.get('bookingPeriod', '')} {data.get('timeSlot', '')}".lower()
        return "LUNCH" if "lunch" in value else "DINNER"

    @staticmethod
    def ensure_period_available(booking_date: str, period: str, exclude_id: Optional[str] = None) -> None:
        db = get_db()
        candidates = db.bookings.find({"bookingDate": booking_date, "status": {"$ne": "CANCELLED"}}, {"_id": 0, "id": 1, "bookingPeriod": 1, "timeSlot": 1})
        for booking in candidates:
            if booking.get("id") != exclude_id and BookingService.booking_period(booking) == period:
                label = "Lunch" if period == "LUNCH" else "Dinner"
                raise HTTPException(status_code=409, detail={"success": False, "message": f"{label} slot is already booked for {booking_date}. Only one lunch and one dinner function are allowed per day."})

    @staticmethod
    async def get_bookings(query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        db = get_db()
        filter_q = {}
        if query:
            if query.get("date"):
                filter_q["bookingDate"] = query["date"]
            if query.get("month"):
                filter_q["bookingDate"] = {"$regex": f"^{query['month']}"}
            if query.get("status"):
                filter_q["status"] = query["status"]
            if query.get("customerPhone"):
                filter_q["customerPhone"] = query["customerPhone"]

        return list(db.bookings.find(filter_q, {"_id": 0}).sort("bookingDate", 1))

    @staticmethod
    async def create_booking(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        raw_booking_date = str(data.get("bookingDate", "")).strip()
        if not raw_booking_date:
            raise HTTPException(status_code=400, detail={"success": False, "message": "Booking date is required."})

        # Validate date format YYYY-MM-DD
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", raw_booking_date):
            raise HTTPException(
                status_code=400, 
                detail={"success": False, "message": "Invalid date format. Expected YYYY-MM-DD (e.g. 2026-09-18)."}
            )

        # Validate real calendar date
        try:
            parsed_date = datetime.strptime(raw_booking_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail={"success": False, "message": f"'{raw_booking_date}' is not a valid calendar date."}
            )

        # Prevent past date bookings
        today_local_str = datetime.now().strftime("%Y-%m-%d")
        if raw_booking_date < today_local_str:
            raise HTTPException(
                status_code=400,
                detail={"success": False, "message": "Cannot book functions for past dates. Please pick today or a future date."}
            )

        # Validate customer name
        customer_name = str(data.get("customerName", "")).strip()
        if len(customer_name) < 2:
            raise HTTPException(
                status_code=400,
                detail={"success": False, "message": "Customer/Host name must be at least 2 characters long."}
            )

        # Validate customer phone (10-digit Indian mobile number)
        customer_phone = re.sub(r"\D", "", str(data.get("customerPhone", "")))
        if len(customer_phone) > 10 and customer_phone.startswith("91"):
            customer_phone = customer_phone[2:]
        if not re.match(r"^[6-9]\d{9}$", customer_phone):
            raise HTTPException(
                status_code=400,
                detail={"success": False, "message": "Invalid mobile number. Please provide a valid 10-digit phone number (starts with 6-9)."}
            )

        booking_period = BookingService.booking_period(data)
        # A manager can explicitly approve an exceptional third function through
        # the confirmation dialog. Ordinary bookings always remain two-slot only.
        is_overbooked = bool(data.get("allowOverbook", False))
        if not is_overbooked:
            BookingService.ensure_period_available(raw_booking_date, booking_period)
        count = db.bookings.count_documents({})
        booking_number = f"BK-{datetime.now().year}-{str(count + 1).zfill(4)}"
        booking_id = f"bkg_{uuid.uuid4().hex[:8]}"

        doc = {
            "id": booking_id,
            "bookingNumber": booking_number,
            "customerId": data.get("customerId"),
            "customerName": customer_name,
            "customerPhone": customer_phone,
            "alternatePhone": str(data.get("alternatePhone", "")).strip(),
            "tableId": data.get("tableId"),
            "guestCount": max(1, int(data.get("guestCount", 50))),
            "advanceAmount": max(0.0, float(data.get("advanceAmount", 0))),
            "estimatedTotal": max(0.0, float(data.get("estimatedTotal", 0))),
            "functionType": data.get("functionType", "Family Dinner"),
            "timeSlot": data.get("timeSlot", "સાંજે (Dinner)"),
            "bookingPeriod": booking_period,
            "isOverbooked": is_overbooked,
            "venueArea": data.get("venueArea", "AC Banquet Hall"),
            "paymentMode": data.get("paymentMode", "Cash"),
            "referenceId": str(data.get("referenceId", "")).strip(),
            "acceptedBy": data.get("acceptedBy") or username or "Staff Admin",
            "notes": str(data.get("notes", "")).strip(),
            "isLocked": data.get("isLocked", True),
            "bookingDate": raw_booking_date,
            "bookingTime": data.get("bookingTime", "08:00 PM"),
            "selectedMenu": data.get("selectedMenu", []),
            "status": "CONFIRMED",
            "specialRequests": data.get("specialRequests"),
            "createdBy": user_id,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }

        db.bookings.insert_one(doc)
        doc.pop("_id", None)


        # Auto create or update customer
        phone = doc["customerPhone"]
        if phone:
            db.customers.update_one(
                {"phone": phone},
                {
                    "$set": {
                        "name": doc["customerName"],
                        "phone": phone,
                        "updatedAt": datetime.now(timezone.utc)
                    },
                    "$setOnInsert": {
                        "id": f"cust_{uuid.uuid4().hex[:8]}",
                        "loyaltyPoints": 0,
                        "totalSpent": 0,
                        "createdAt": datetime.now(timezone.utc)
                    }
                },
                upsert=True
            )

        # Sync to Google Calendar (async, non-blocking)
        try:
            google_event_id = await GoogleCalendarService.create_event(doc)
            if google_event_id:
                db.bookings.update_one(
                    {"id": booking_id},
                    {"$set": {"googleCalendarEventId": google_event_id}}
                )
                doc["googleCalendarEventId"] = google_event_id
        except Exception as gcal_err:
            pass  # Google Calendar is optional

        # Emit rich real-time Socket events
        await SocketEvents.emit_booking_updated(doc)
        await sio.emit("booking.created", {
            "booking": doc,
            "bookingDate": raw_booking_date,
            "customerName": doc["customerName"],
            "bookingNumber": booking_number,
            "isLocked": doc.get("isLocked", True)
        })
        await sio.emit("calendar.refresh", {
            "action": "BOOKING_CREATED",
            "date": raw_booking_date,
            "bookingId": booking_id
        })
        await SocketEvents.emit_data_changed("bookings")

        await create_audit_log(
            module="Booking",
            action="CREATE_BOOKING",
            user_id=user_id,
            username=username,
            record_id=booking_id,
            new_value={"number": booking_number, "date": raw_booking_date}
        )


        return doc

    @staticmethod
    async def update_booking(booking_id: str, data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        booking = db.bookings.find_one({"id": booking_id}, {"_id": 0})
        if not booking:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Booking not found."})
        booking_date = str(data.get("bookingDate", booking.get("bookingDate", ""))).strip()
        try:
            datetime.strptime(booking_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail={"success": False, "message": "A valid booking date is required."})
        candidate = {**booking, **data, "bookingDate": booking_date}
        period = BookingService.booking_period(candidate)
        BookingService.ensure_period_available(booking_date, period, exclude_id=booking_id)
        phone = re.sub(r"\D", "", str(candidate.get("customerPhone", "")))
        if len(phone) > 10 and phone.startswith("91"):
            phone = phone[2:]
        if not re.match(r"^[6-9]\d{9}$", phone) or len(str(candidate.get("customerName", "")).strip()) < 2:
            raise HTTPException(status_code=400, detail={"success": False, "message": "Provide a valid host name and 10-digit mobile number."})
        keys = ("bookingDate", "timeSlot", "bookingTime", "customerName", "alternatePhone", "guestCount", "functionType", "acceptedBy", "notes", "selectedMenu", "selectedMenuIds")
        fields = {key: candidate[key] for key in keys if key in candidate}
        fields.update({"customerPhone": phone, "bookingPeriod": period, "updatedAt": datetime.now(timezone.utc)})
        db.bookings.update_one({"id": booking_id}, {"$set": fields})
        booking.update(fields)
        await SocketEvents.emit_booking_updated(booking)
        await sio.emit("calendar.refresh", {"action": "BOOKING_UPDATED", "date": booking_date, "bookingId": booking_id})
        await SocketEvents.emit_data_changed("bookings")
        return booking

    @staticmethod
    async def update_booking_status(booking_id: str, status: str, user_id: Optional[str] = None, username: Optional[str] = None, reason: Optional[str] = None, extra_fields: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        db = get_db()
        booking = db.bookings.find_one({"id": booking_id})
        if not booking:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Booking not found."})

        now_utc = datetime.now(timezone.utc)
        update_fields = {"status": status, "updatedAt": now_utc}
        if status == "CHECKED_IN" and not booking.get("checkedInAt"):
            update_fields["checkedInAt"] = now_utc.isoformat()
            update_fields["checkedInBy"] = username or "Staff"
        if status in ("COMPLETED", "CHECKED_OUT") and not booking.get("checkedOutAt"):
            update_fields["checkedOutAt"] = now_utc.isoformat()
            update_fields["checkedOutBy"] = username or "Staff"
        if reason:
            update_fields["notes"] = f"{booking.get('notes', '')}; Status {status}: {reason}".strip("; ")
        if extra_fields:
            for k, v in extra_fields.items():
                if k not in update_fields:
                    update_fields[k] = v

        db.bookings.update_one({"id": booking_id}, {"$set": update_fields})
        booking.update(update_fields)
        booking.pop("_id", None)

        # Sync status update to Google Calendar
        try:
            google_event_id = booking.get("googleCalendarEventId")
            if google_event_id:
                if status == "CANCELLED":
                    await GoogleCalendarService.delete_event(google_event_id)
                else:
                    await GoogleCalendarService.update_event(google_event_id, booking)
        except Exception:
            pass

        await SocketEvents.emit_booking_updated(booking)
        await sio.emit("calendar.refresh", {
            "action": "BOOKING_UPDATED",
            "date": booking.get("bookingDate"),
            "bookingId": booking_id,
            "newStatus": status
        })
        await SocketEvents.emit_data_changed("bookings")
        return booking

    @staticmethod
    async def checkout_booking(booking_id: str, bill_data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        return await BookingService.update_booking_status(
            booking_id=booking_id,
            status="COMPLETED",
            user_id=user_id,
            username=username,
            extra_fields={"billing": bill_data}
        )


    @staticmethod
    async def assign_table(booking_id: str, table_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        db.bookings.update_one({"id": booking_id}, {"$set": {"tableId": table_id, "updatedAt": datetime.now(timezone.utc)}})
        booking = db.bookings.find_one({"id": booking_id}, {"_id": 0})
        await SocketEvents.emit_booking_updated(booking)
        await SocketEvents.emit_data_changed("bookings")
        return booking

    @staticmethod
    async def delete_booking(booking_id: str, user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        booking = db.bookings.find_one({"$or": [{"id": booking_id}, {"bookingNumber": booking_id}]}, {"_id": 0})
        booking_date = booking.get("bookingDate") if booking else None

        # Remove from Google Calendar
        try:
            if booking:
                google_event_id = booking.get("googleCalendarEventId")
                if google_event_id:
                    await GoogleCalendarService.delete_event(google_event_id)
        except Exception:
            pass

        db.bookings.delete_one({"$or": [{"id": booking_id}, {"bookingNumber": booking_id}]})
        await sio.emit("calendar.refresh", {
            "action": "BOOKING_DELETED",
            "date": booking_date,
            "bookingId": booking_id
        })
        await SocketEvents.emit_data_changed("bookings")
        return {"success": True, "message": "Booking deleted."}

    @staticmethod
    async def purge_cancelled_bookings() -> Dict[str, Any]:
        db = get_db()
        res = db.bookings.delete_many({"status": "CANCELLED"})
        await sio.emit("calendar.refresh", {"action": "CANCELLED_PURGED"})
        await SocketEvents.emit_data_changed("bookings")
        return {"success": True, "deletedCount": res.deleted_count, "message": f"Purged {res.deleted_count} cancelled bookings."}

    @staticmethod
    def generate_ics(bookings: List[Dict[str, Any]], calendar_name: str = "Bhatigal Bhanu Function Bookings") -> str:
        """Generate standard RFC 5545 iCalendar content (.ics) for external calendar apps."""
        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Bhatigal Bhanu//Restaurant ERP Calendar//EN",
            f"X-WR-CALNAME:{calendar_name}",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH"
        ]
        now_stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

        for b in bookings:
            b_id = b.get("id", "bkg")
            b_date = b.get("bookingDate", "")
            if not b_date or len(b_date) != 10:
                continue
            date_compact = b_date.replace("-", "")
            summary = f"Function: {b.get('customerName', 'Guest')} ({b.get('functionType', 'Event')})"
            desc = (
                f"Booking No: {b.get('bookingNumber', '')}\\n"
                f"Client: {b.get('customerName', '')}\\n"
                f"Phone: {b.get('customerPhone', '')}\\n"
                f"Guests: {b.get('guestCount', 0)}\\n"
                f"Slot: {b.get('timeSlot', b.get('bookingTime', ''))}\\n"
                f"Venue: {b.get('venueArea', 'Banquet Hall')}\\n"
                f"Advance: Rs. {b.get('advanceAmount', 0)}\\n"
                f"Status: {b.get('status', 'CONFIRMED')}\\n"
                f"Notes: {b.get('notes', 'None')}"
            )
            event_status = "CANCELLED" if b.get("status") == "CANCELLED" else "CONFIRMED"

            lines.extend([
                "BEGIN:VEVENT",
                f"UID:{b_id}@bhatigalbhanu.com",
                f"DTSTAMP:{now_stamp}",
                f"DTSTART;VALUE=DATE:{date_compact}",
                f"DTEND;VALUE=DATE:{date_compact}",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{desc}",
                "LOCATION:Bhatigal Bhanu Traditional Dining & Banquet",
                f"STATUS:{event_status}",
                "END:VEVENT"
            ])

        lines.append("END:VCALENDAR")
        return "\r\n".join(lines)
