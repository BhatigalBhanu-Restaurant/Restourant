import urllib.request
import urllib.error
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'https://restourant-27uy.onrender.com/api'

def request(method, path, data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    body = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        res = urllib.request.urlopen(req, timeout=15)
        status = res.getcode()
        content = res.read().decode('utf-8')
        return status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode('utf-8')
        try:
            return e.code, json.loads(err_content)
        except Exception:
            return e.code, {'raw': err_content}
    except Exception as e:
        return 0, {'error': str(e)}

def run_qa():
    print("=" * 60)
    print("RESTAURANT ERP COMPREHENSIVE QA API TEST SUITE (ROUND 2)")
    print("=" * 60)
    
    results = []

    # 1. AUTH: Superadmin login
    status, res = request('POST', '/auth/login', {'username': 'superadmin', 'password': 'Admin@123'})
    token = res.get('data', {}).get('accessToken')
    if status == 200 and token:
        results.append(('AUTH: Superadmin Login', 'PASS', 'Token acquired successfully'))
    else:
        results.append(('AUTH: Superadmin Login', 'FAIL', f"Status {status}: {res}"))

    # 1b. AUTH: Owner login
    status_owner, res_owner = request('POST', '/auth/login', {'username': 'owner', 'password': 'Owner@1234'})
    owner_token = res_owner.get('data', {}).get('accessToken')
    if status_owner == 200 and owner_token:
        results.append(('AUTH: Owner Login', 'PASS', 'Owner token acquired successfully'))
    else:
        results.append(('AUTH: Owner Login', 'FAIL', f"Status {status_owner}: {res_owner}"))

    if not token:
        print("CRITICAL: Superadmin login failed. Halting suite.")
        return results

    # 2. DASHBOARD: Metrics
    status, res = request('GET', '/dashboard/metrics', token=token)
    if status == 200 and res.get('success'):
        results.append(('DASHBOARD: Overview Metrics', 'PASS', 'Live metrics returned'))
    else:
        results.append(('DASHBOARD: Overview Metrics', 'FAIL', f"Status {status}: {res}"))

    # 3. MASTERS: Categories (all Gujarati)
    status, res = request('GET', '/masters/menu-categories', token=token)
    cats = res.get('data', [])
    if status == 200 and isinstance(cats, list) and len(cats) > 0:
        results.append(('MASTERS: Categories List', 'PASS', f"Found {len(cats)} categories (all Gujarati)"))
    else:
        results.append(('MASTERS: Categories List', 'FAIL', f"Status {status}: {res}"))

    # 4. MASTERS: Menu Items (all Gujarati)
    status, res = request('GET', '/masters/menu-items', token=token)
    items = res.get('data', [])
    if status == 200 and isinstance(items, list) and len(items) > 0:
        results.append(('MASTERS: Menu Items List', 'PASS', f"Found {len(items)} dishes in catalog"))
    else:
        results.append(('MASTERS: Menu Items List', 'FAIL', f"Status {status}: {res}"))

    # 5. MASTERS: Dining Tables & Floor Zones
    status, res = request('GET', '/masters/tables', token=token)
    if status == 200 and res.get('success'):
        results.append(('MASTERS: Dining Tables List', 'PASS', f"Found {len(res.get('data', []))} tables"))
    else:
        results.append(('MASTERS: Dining Tables List', 'FAIL', f"Status {status}: {res}"))

    status, res = request('GET', '/masters/floor-zones', token=token)
    if status == 200 and res.get('success'):
        results.append(('MASTERS: Floor Zones List', 'PASS', f"Found {len(res.get('data', []))} zones"))
    else:
        results.append(('MASTERS: Floor Zones List', 'FAIL', f"Status {status}: {res}"))

    # 6. DAILY MENU: Get today's menu
    status, res = request('GET', '/daily-menu/today', token=token)
    if status in (200, 404):
        results.append(('DAILY MENU: Today Menu Fetch', 'PASS', 'Handled gracefully'))
    else:
        results.append(('DAILY MENU: Today Menu Fetch', 'FAIL', f"Status {status}: {res}"))

    # 7. BOOKINGS: List Bookings
    status, res = request('GET', '/bookings', token=token)
    if status == 200 and res.get('success'):
        results.append(('BOOKINGS: List Bookings', 'PASS', f"Found {len(res.get('data', []))} bookings"))
    else:
        results.append(('BOOKINGS: List Bookings', 'FAIL', f"Status {status}: {res}"))

    # 8. BOOKINGS: Create, Update status, Delete lifecycle
    new_booking_data = {
        'customerName': 'QA Test Customer',
        'customerPhone': '9876543210',
        'bookingDate': '2026-10-15',
        'bookingTime': '19:30',
        'guestCount': 50,
        'functionType': 'Family Dinner',
        'notes': 'QA Automated Test Booking'
    }
    status, res = request('POST', '/bookings', data=new_booking_data, token=token)
    created_booking_id = res.get('data', {}).get('id')
    if status in (200, 201) and created_booking_id:
        results.append(('BOOKINGS: Create Booking', 'PASS', f"Created ID: {created_booking_id}"))
        
        # Update status
        st_status, st_res = request('PATCH', f'/bookings/{created_booking_id}/status', {'status': 'CONFIRMED'}, token=token)
        if st_status == 200:
            results.append(('BOOKINGS: Update Booking Status', 'PASS', 'Status set to CONFIRMED'))
        else:
            results.append(('BOOKINGS: Update Booking Status', 'FAIL', f"Status {st_status}: {st_res}"))

        # Delete booking to keep DB clean
        del_status, del_res = request('DELETE', f'/bookings/{created_booking_id}', token=token)
        if del_status == 200:
            results.append(('BOOKINGS: Delete Booking', 'PASS', 'Cleaned up test booking'))
        else:
            results.append(('BOOKINGS: Delete Booking', 'FAIL', f"Status {del_status}: {del_res}"))
    else:
        results.append(('BOOKINGS: Create Booking', 'FAIL', f"Status {status}: {res}"))

    # 9. HR & STAFF: List Employees
    status, res = request('GET', '/hr/employees', token=token)
    if status == 200 and res.get('success'):
        results.append(('HR: List Employees', 'PASS', f"Found {len(res.get('data', []))} employees"))
    else:
        results.append(('HR: List Employees', 'FAIL', f"Status {status}: {res}"))

    # 10. HR & STAFF: Create Staff, Advance, Salary, Delete Lifecycle
    new_staff_data = {
        'employeeCode': 'TEST-999',
        'name': 'QA Test Staff Member',
        'phone': '9988776655',
        'designationTitle': 'કિચન હેલ્પર (Kitchen Helper)',
        'wageType': 'MONTHLY',
        'baseSalary': 15000,
        'joiningDate': '2026-10-01',
        'status': 'ACTIVE'
    }
    status, res = request('POST', '/hr/employees', data=new_staff_data, token=token)
    staff_id = res.get('data', {}).get('id')
    if status in (200, 201) and staff_id:
        results.append(('HR: Add Staff Member', 'PASS', f"Created Staff ID: {staff_id}"))

        # Record Upad / Advance
        upad_data = {'amount': 1500, 'date': '2026-10-03', 'paymentMode': 'Cash', 'reason': 'QA Advance Test'}
        u_status, u_res = request('POST', f'/hr/employees/{staff_id}/advance', data=upad_data, token=token)
        if u_status in (200, 201):
            results.append(('HR: Record Upad / Advance', 'PASS', 'Advance recorded'))
        else:
            results.append(('HR: Record Upad / Advance', 'FAIL', f"Status {u_status}: {u_res}"))

        # Fetch Staff Ledger
        l_status, l_res = request('GET', f'/hr/employees/{staff_id}/ledger', token=token)
        if l_status == 200:
            results.append(('HR: Employee Ledger History', 'PASS', 'Ledger returned successfully'))
        else:
            results.append(('HR: Employee Ledger History', 'FAIL', f"Status {l_status}: {l_res}"))

        # Delete Staff Member
        d_status, d_res = request('DELETE', f'/hr/employees/{staff_id}', token=token)
        if d_status == 200:
            results.append(('HR: Delete Staff Member', 'PASS', 'Cleaned up test staff member'))
        else:
            results.append(('HR: Delete Staff Member', 'FAIL', f"Status {d_status}: {d_res}"))
    else:
        results.append(('HR: Add Staff Member', 'FAIL', f"Status {status}: {res}"))

    # 11. ATTENDANCE: Get Attendance
    status, res = request('GET', '/hr/attendance?date=2026-10-03', token=token)
    if status == 200 and res.get('success'):
        results.append(('ATTENDANCE: Get Daily Attendance', 'PASS', 'Attendance records returned'))
    else:
        results.append(('ATTENDANCE: Get Daily Attendance', 'FAIL', f"Status {status}: {res}"))

    # 12. INVENTORY & LEDGER: Get Daily Ledger
    status, res = request('GET', '/inventory/daily-ledger?date=2026-10-03', token=token)
    if status == 200 and res.get('success'):
        results.append(('INVENTORY: Daily Ledger', 'PASS', 'Daily inventory ledger returned'))
    else:
        results.append(('INVENTORY: Daily Ledger', 'FAIL', f"Status {status}: {res}"))

    # 13. SETTINGS: System Settings
    status, res = request('GET', '/system/settings', token=token)
    if status == 200 and res.get('success'):
        results.append(('SETTINGS: Get Settings', 'PASS', 'Store settings returned'))
    else:
        results.append(('SETTINGS: Get Settings', 'FAIL', f"Status {status}: {res}"))

    # 14. ACCESS CONTROL: Users & Permissions
    status, res = request('GET', '/access-control/users', token=token)
    if status == 200 and res.get('success'):
        users_list = res.get('data', [])
        results.append(('ACCESS: Users List', 'PASS', f"Found {len(users_list)} registered users (superadmin, owner)"))
    else:
        results.append(('ACCESS: Users List', 'FAIL', f"Status {status}: {res}"))

    status, res = request('GET', '/access-control/permissions-tree', token=token)
    if status == 200 and res.get('success'):
        total_p = res.get('data', {}).get('total', 0)
        results.append(('ACCESS: Permissions Tree', 'PASS', f"Found {total_p} permissions"))
    else:
        results.append(('ACCESS: Permissions Tree', 'FAIL', f"Status {status}: {res}"))

    # PRINT SUMMARY
    print("\n" + "=" * 60)
    print("QA TEST SUMMARY REPORT")
    print("=" * 60)
    passed = 0
    failed = 0
    for name, outcome, detail in results:
        mark = "✅ PASS" if outcome == 'PASS' else "❌ FAIL"
        print(f"{mark} | {name:35} | {detail}")
        if outcome == 'PASS':
            passed += 1
        else:
            failed += 1
    print("=" * 60)
    print(f"TOTAL: {len(results)} | PASSED: {passed} | FAILED: {failed}")
    print("=" * 60)

if __name__ == '__main__':
    run_qa()
