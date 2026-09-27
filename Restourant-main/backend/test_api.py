import sys
from starlette.testclient import TestClient
from backend.main import app

def run_tests():
    print("=" * 60)
    print("Running Restaurant ERP Backend Smoke Tests...")
    print("=" * 60)
    
    client = TestClient(app)
    
    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print(" [PASS] /api/health returns 200 OK")
    
    # 2. Login as superadmin
    login_payload = {"username": "superadmin", "password": "Admin@12345"}
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200, f"Login failed: {res.text}"
    login_data = res.json()
    assert login_data["success"] is True, f"Login unsuccessful: {login_data}"
    access_token = login_data["data"]["accessToken"]
    print(f" [PASS] /api/auth/login successful. Received JWT token.")
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 3. Profile verification
    res = client.get("/api/auth/profile", headers=headers)
    assert res.status_code == 200, f"Profile check failed: {res.text}"
    profile_data = res.json()
    assert profile_data["success"] is True
    print(f" [PASS] /api/auth/profile loaded for user: {profile_data['data']['user']['username']}")
    
    # 4. Dashboard metrics
    res = client.get("/api/dashboard/metrics", headers=headers)
    assert res.status_code == 200, f"Dashboard metrics failed: {res.text}"
    dash_data = res.json()
    assert dash_data["success"] is True
    print(f" [PASS] /api/dashboard/metrics loaded. Active day: {dash_data['data']['currentDay']}, Staff: {dash_data['data']['totalStaffCount']}")
    
    # 5. Menu Items & Categories (Catalog Masters)
    res = client.get("/api/masters/menu-items", headers=headers)
    assert res.status_code == 200
    items = res.json()["data"]
    assert len(items) > 0, "No menu items found!"
    print(f" [PASS] /api/masters/menu-items returned {len(items)} items (Kathiyawadi dishes loaded)")
    
    # 6. Today Daily Menu
    res = client.get("/api/daily-menu/today")
    assert res.status_code == 200
    daily_menu = res.json()["data"]
    print(f" [PASS] /api/daily-menu/today active day: {daily_menu.get('dayOfWeek')} with {daily_menu.get('itemCount')} items")
    
    # 7. Function Date Locker (Bookings)
    import random
    test_month = random.randint(1, 12)
    test_day = random.randint(1, 28)
    test_date_str = f"2027-{test_month:02d}-{test_day:02d}"
    booking_payload = {
        "bookingDate": test_date_str,
        "bookingTime": "19:30",
        "customerName": "Test Guest",
        "customerPhone": "9876543210",
        "guestCount": 30,
        "advanceAmount": 3000,
        "functionType": "Family Dinner",
        "acceptedBy": "Bhanubhai Patel",
        "isLocked": True
    }
    res = client.post("/api/bookings", json=booking_payload, headers=headers)
    assert res.status_code == 200, f"Function booking failed: {res.text}"
    bkg = res.json()["data"]
    test_booking_id = bkg.get("id")
    print(f" [PASS] /api/bookings locked date {test_date_str}: {bkg.get('bookingNumber')}")
    
    # Clean up test booking immediately to keep database clean
    if test_booking_id:
        client.delete(f"/api/bookings/{test_booking_id}", headers=headers)

    
    # 8. List Functions
    res = client.get("/api/bookings?month=2026-11", headers=headers)
    assert res.status_code == 200
    print(f" [PASS] /api/bookings list returned {len(res.json()['data'])} function bookings")
    
    # 9. Inventory Stock
    res = client.get("/api/inventory/items", headers=headers)
    assert res.status_code == 200
    print(f" [PASS] /api/inventory/items loaded {len(res.json().get('data', []))} raw stock items")
    
    # 10. Staff Directory
    res = client.get("/api/hr/employees", headers=headers)
    assert res.status_code == 200
    print(f" [PASS] /api/hr/employees loaded {len(res.json().get('data', []))} employee records")
    
    # 11. System Settings
    res = client.get("/api/system/settings")
    assert res.status_code == 200
    settings = res.json()["data"]
    rest_name = settings.get('restaurant_name', '').encode('ascii', 'replace').decode('ascii')
    print(f" [PASS] /api/system/settings loaded: {rest_name}")
    
    print("=" * 60)
    print(" ALL 11 ACTIVE MODULE SMOKE TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
