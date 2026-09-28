from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional
from ..services.booking_service import BookingService
from ..services.poster_service import PosterService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/bookings", tags=["Table Bookings"])

@router.get("")
async def get_bookings(
    month: Optional[str] = None,
    date: Optional[str] = None,
    status: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    from ..database import get_db
    db = get_db()
    filter_q = {}
    if month:
        filter_q["bookingDate"] = {"$regex": f"^{month}"}
    elif date:
        filter_q["bookingDate"] = date
    if status:
        filter_q["status"] = status

    bookings = list(db.bookings.find(filter_q, {"_id": 0}).sort("bookingDate", -1))
    return ApiResponse.success(data=bookings)

@router.post("")
async def create_booking(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    booking = await BookingService.create_booking(
        data=body,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=booking, message="Booking created successfully")

@router.post("/menu-poster")
async def function_menu_poster(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    from datetime import datetime
    import base64
    booking_date = str(body.get("bookingDate", "")).strip()
    item_ids = body.get("itemIds", [])
    if not booking_date or not isinstance(item_ids, list) or not item_ids:
        raise HTTPException(status_code=400, detail={"success": False, "message": "Select a date and at least one dish before creating the menu card."})
    try:
        day = datetime.strptime(booking_date, "%Y-%m-%d").strftime("%A").upper()
    except ValueError:
        raise HTTPException(status_code=400, detail={"success": False, "message": "Invalid booking date."})
    image = PosterService.generate_menu_poster(day, theme="royal_maroon", format_style="FORMAT_KATHIYAWADI_CARD", custom_date_str=booking_date, item_ids=item_ids)
    return ApiResponse.success(data={"imageDataUrl": "data:image/png;base64," + base64.b64encode(image.getvalue()).decode("ascii"), "itemCount": len(item_ids)})

@router.put("/{booking_id}")
async def update_booking(booking_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    booking = await BookingService.update_booking(booking_id, body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=booking, message="Booking updated successfully")

@router.patch("/{booking_id}/status")
async def update_status(booking_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    status = body.get("status", "CONFIRMED")
    reason = body.get("reason")
    extra = {k: v for k, v in body.items() if k not in ("status", "reason")}
    res = await BookingService.update_booking_status(
        booking_id=booking_id,
        status=status,
        user_id=current_user["userId"],
        username=current_user["username"],
        reason=reason,
        extra_fields=extra if extra else None
    )
    return ApiResponse.success(data=res, message=f"Booking status changed to {status}")

@router.post("/{booking_id}/checkout")
async def checkout_booking(booking_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    bill_data = body.get("billing") or body.get("bill") or body
    res = await BookingService.checkout_booking(
        booking_id=booking_id,
        bill_data=bill_data,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=res, message="Booking checked out and completed successfully")


@router.patch("/{booking_id}/cancel")
async def cancel_booking(booking_id: str, body: Optional[Dict[str, Any]] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    reason = (body or {}).get("reason", "Cancelled by user")
    res = await BookingService.update_booking_status(
        booking_id=booking_id,
        status="CANCELLED",
        user_id=current_user["userId"],
        username=current_user["username"],
        reason=reason
    )
    return ApiResponse.success(data=res, message="Booking cancelled")

@router.delete("/purge/cancelled")
async def purge_cancelled(current_user: Dict[str, Any] = Depends(get_current_user)):
    res = await BookingService.purge_cancelled_bookings()
    return ApiResponse.success(data=res, message="Cancelled bookings deleted")

@router.delete("/{booking_id}")
async def delete_booking(booking_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    res = await BookingService.delete_booking(
        booking_id=booking_id,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=res, message="Booking deleted")
