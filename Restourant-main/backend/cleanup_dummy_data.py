from datetime import datetime
import re
from backend.app.database import get_db

def cleanup_corrupted_bookings():
    db = get_db()
    print("Starting database sanitization...")
    
    # 1. Find and remove bookings with invalid dates (e.g. 2027-004-22 or non YYYY-MM-DD)
    date_regex = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    all_bookings = list(db.bookings.find({}))
    deleted_count = 0

    for bkg in all_bookings:
        b_date = bkg.get("bookingDate", "")
        customer_name = (bkg.get("customerName") or "").strip()
        customer_phone = (bkg.get("customerPhone") or "").strip()
        
        should_delete = False
        reason = ""

        # Invalid date format (e.g., 2027-004-22)
        if not date_regex.match(b_date):
            should_delete = True
            reason = f"Invalid date format: '{b_date}'"
        else:
            # Check if valid calendar date
            try:
                datetime.strptime(b_date, "%Y-%m-%d")
            except ValueError:
                should_delete = True
                reason = f"Impossible calendar date: '{b_date}'"

        # Check dummy/test data
        if not should_delete:
            if customer_name.lower() in ["smoke test host", "dede"] or customer_phone == "wqdwdeqwd":
                should_delete = True
                reason = f"Dummy test customer: '{customer_name}' / '{customer_phone}'"

        if should_delete:
            print(f"Removing invalid booking [{bkg.get('bookingNumber', bkg.get('id'))}] - Reason: {reason}")
            db.bookings.delete_one({"_id": bkg["_id"]})
            deleted_count += 1

    print(f"Sanitization complete! Removed {deleted_count} corrupt or dummy test records.")
    remaining = db.bookings.count_documents({})
    print(f"Remaining clean bookings: {remaining}")

if __name__ == "__main__":
    cleanup_corrupted_bookings()
