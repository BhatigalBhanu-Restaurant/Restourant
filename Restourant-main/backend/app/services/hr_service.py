import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from ..database import get_db

class HRService:
    # --- EMPLOYEES & STAFF MANAGEMENT ---
    @staticmethod
    async def get_employees() -> List[Dict[str, Any]]:
        db = get_db()
        employees = list(db.employees.find({}, {"_id": 0}).sort("employeeCode", 1))
        # Compute live hisab totals for each employee from employee_ledger
        for emp in employees:
            emp_id = emp.get("id")
            txs = list(db.employee_ledger.find({"employeeId": emp_id}))
            total_upad = sum(float(t.get("amount", 0)) for t in txs if t.get("type") == "UPAD")
            upad_deductions = sum(float(t.get("deductionAmount", 0)) for t in txs if t.get("type") == "SALARY_PAYMENT")
            salary_paid = sum(float(t.get("netPaid", t.get("amount", 0))) for t in txs if t.get("type") == "SALARY_PAYMENT")
            
            emp["totalUpad"] = total_upad
            emp["totalUpadDeducted"] = upad_deductions
            emp["outstandingUpad"] = max(0.0, total_upad - upad_deductions)
            emp["totalSalaryPaid"] = salary_paid
            emp["txCount"] = len(txs)
        return employees

    @staticmethod
    async def get_employee_by_id(emp_id: str) -> Dict[str, Any]:
        db = get_db()
        emp = db.employees.find_one({"id": emp_id}, {"_id": 0})
        if not emp:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Staff member not found."})
        txs = list(db.employee_ledger.find({"employeeId": emp_id}, {"_id": 0}).sort("date", -1))
        total_upad = sum(float(t.get("amount", 0)) for t in txs if t.get("type") == "UPAD")
        upad_deductions = sum(float(t.get("deductionAmount", 0)) for t in txs if t.get("type") == "SALARY_PAYMENT")
        salary_paid = sum(float(t.get("netPaid", t.get("amount", 0))) for t in txs if t.get("type") == "SALARY_PAYMENT")
        outstanding = max(0.0, total_upad - upad_deductions)
        emp["totalUpad"] = total_upad
        emp["totalUpadDeducted"] = upad_deductions
        emp["outstandingUpad"] = outstanding
        emp["totalSalaryPaid"] = salary_paid
        emp["txCount"] = len(txs)
        return {"employee": emp, "transactions": txs}

    @staticmethod
    async def create_employee(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        emp_id = data.get("id") or f"emp_{uuid.uuid4().hex[:8]}"
        
        # Determine next employee code if not specified or empty
        code = (data.get("employeeCode") or "").strip().upper()
        if not code:
            existing_codes = db.employees.distinct("employeeCode")
            max_num = 0
            for ec in existing_codes:
                if ec and ec.startswith("EMP-"):
                    try:
                        num = int(ec.split("-")[1])
                        if num > max_num:
                            max_num = num
                    except Exception:
                        pass
            code = f"EMP-{str(max_num + 1).zfill(3)}"

        name = (data.get("name") or f"{data.get('firstName', '')} {data.get('lastName', '')}").strip()
        wage_type = (data.get("wageType") or "MONTHLY").upper()
        base_salary = float(data.get("baseSalary") or 0.0)
        daily_rate = float(data.get("dailyRate") or 0.0)

        doc = {
            "id": emp_id,
            "employeeCode": code,
            "name": name,
            "firstName": data.get("firstName") or name,
            "lastName": data.get("lastName") or "",
            "phone": (data.get("phone") or "").strip(),
            "designationTitle": data.get("designationTitle") or data.get("role") or "સ્ટાફ (Staff)",
            "wageType": wage_type,
            "baseSalary": base_salary,
            "dailyRate": daily_rate,
            "aadharCardUrl": data.get("aadharCardUrl") or data.get("photoUrl") or "",
            "joiningDate": data.get("joiningDate") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "status": data.get("status") or "ACTIVE",
            "notes": (data.get("notes") or "").strip(),
            "totalUpad": 0.0,
            "totalUpadDeducted": 0.0,
            "outstandingUpad": 0.0,
            "totalSalaryPaid": 0.0,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }
        db.employees.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @staticmethod
    async def update_employee(emp_id: str, data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        update_data = {**data}
        update_data.pop("_id", None)
        update_data.pop("id", None)
        update_data["updatedAt"] = datetime.now(timezone.utc)
        if "name" in update_data and not update_data.get("firstName"):
            update_data["firstName"] = update_data["name"]
        db.employees.update_one({"id": emp_id}, {"$set": update_data})
        return db.employees.find_one({"id": emp_id}, {"_id": 0})

    @staticmethod
    async def delete_employee(emp_id: str):
        db = get_db()
        db.employees.delete_one({"id": emp_id})
        db.employee_ledger.delete_many({"employeeId": emp_id})
        db.employee_advances.delete_many({"employeeId": emp_id})
        db.salary_records.delete_many({"employeeId": emp_id})
        return {"success": True}

    # --- STAFF UPAD (ADVANCE) & SALARY PAYMENT ---
    @staticmethod
    async def add_advance(emp_id: str, data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        emp = db.employees.find_one({"id": emp_id})
        if not emp:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Staff member not found."})

        amount = float(data.get("amount") or 0.0)
        if amount <= 0:
            raise HTTPException(status_code=400, detail={"success": False, "message": "Upad amount must be greater than zero."})

        date_str = data.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        tx_id = f"upad_{uuid.uuid4().hex[:8]}"

        tx_doc = {
            "id": tx_id,
            "employeeId": emp_id,
            "employeeCode": emp.get("employeeCode"),
            "employeeName": emp.get("name") or f"{emp.get('firstName', '')} {emp.get('lastName', '')}".strip(),
            "type": "UPAD",
            "amount": amount,
            "grossSalary": 0.0,
            "deductionAmount": 0.0,
            "netPaid": 0.0,
            "date": date_str,
            "paymentMode": data.get("paymentMode") or "Cash",
            "reason": data.get("reason") or data.get("notes") or "ઉપાડ (Advance)",
            "referenceId": data.get("referenceId") or "",
            "createdBy": username or user_id or "admin",
            "createdAt": datetime.now(timezone.utc)
        }
        db.employee_ledger.insert_one(tx_doc)
        db.employee_advances.insert_one(tx_doc.copy())
        tx_doc.pop("_id", None)
        return tx_doc

    @staticmethod
    async def pay_salary(emp_id: str, data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        emp = db.employees.find_one({"id": emp_id})
        if not emp:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Staff member not found."})

        gross = float(data.get("grossSalary") or 0.0)
        deduction = float(data.get("advanceDeducted") or 0.0)
        net_paid = float(data.get("netPaid") or max(0.0, gross - deduction))
        date_str = data.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        period = data.get("period") or datetime.now(timezone.utc).strftime("%B %Y")
        tx_id = f"sal_{uuid.uuid4().hex[:8]}"

        tx_doc = {
            "id": tx_id,
            "employeeId": emp_id,
            "employeeCode": emp.get("employeeCode"),
            "employeeName": emp.get("name") or f"{emp.get('firstName', '')} {emp.get('lastName', '')}".strip(),
            "type": "SALARY_PAYMENT",
            "amount": net_paid,
            "grossSalary": gross,
            "deductionAmount": deduction,
            "netPaid": net_paid,
            "daysWorked": data.get("daysWorked"),
            "period": period,
            "date": date_str,
            "paymentMode": data.get("paymentMode") or "Cash",
            "reason": data.get("notes") or f"પગાર ચુકવણી ({period})",
            "referenceId": data.get("referenceId") or "",
            "createdBy": username or user_id or "admin",
            "createdAt": datetime.now(timezone.utc)
        }
        db.employee_ledger.insert_one(tx_doc)
        db.salary_records.insert_one(tx_doc.copy())
        tx_doc.pop("_id", None)
        return tx_doc

    @staticmethod
    async def get_employee_ledger(emp_id: str) -> Dict[str, Any]:
        db = get_db()
        emp = db.employees.find_one({"id": emp_id}, {"_id": 0})
        if not emp:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Staff member not found."})

        txs = list(db.employee_ledger.find({"employeeId": emp_id}, {"_id": 0}).sort("date", -1))
        
        total_upad = sum(float(t.get("amount", 0)) for t in txs if t.get("type") == "UPAD")
        total_deducted = sum(float(t.get("deductionAmount", 0)) for t in txs if t.get("type") == "SALARY_PAYMENT")
        total_salary_paid = sum(float(t.get("netPaid", t.get("amount", 0))) for t in txs if t.get("type") == "SALARY_PAYMENT")
        outstanding = max(0.0, total_upad - total_deducted)

        return {
            "employee": emp,
            "transactions": txs,
            "summary": {
                "totalUpad": total_upad,
                "totalDeducted": total_deducted,
                "outstandingUpad": outstanding,
                "totalSalaryPaid": total_salary_paid,
                "txCount": len(txs)
            }
        }

    @staticmethod
    async def delete_transaction(tx_id: str):
        db = get_db()
        db.employee_ledger.delete_one({"id": tx_id})
        db.employee_advances.delete_one({"id": tx_id})
        db.salary_records.delete_one({"id": tx_id})
        return {"success": True}

    # --- ATTENDANCE ---
    @staticmethod
    async def get_attendance(date: Optional[str] = None) -> List[Dict[str, Any]]:
        db = get_db()
        target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return list(db.attendance_records.find({"date": target_date}, {"_id": 0}))

    @staticmethod
    async def punch_in(employee_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        now = datetime.now(timezone.utc)

        emp = db.employees.find_one({"id": employee_id})
        emp_name = f"{emp.get('firstName', '')} {emp.get('lastName', '')}".strip() if emp else "Staff"

        doc = {
            "id": f"att_{uuid.uuid4().hex[:8]}",
            "employeeId": employee_id,
            "employeeName": emp_name,
            "date": today,
            "checkInTime": now,
            "status": "PRESENT",
            "totalHours": 0.0,
            "createdAt": now
        }
        db.attendance_records.update_one(
            {"employeeId": employee_id, "date": today},
            {"$setOnInsert": doc},
            upsert=True
        )
        return {"success": True, "message": f"{emp_name} checked in successfully."}

    @staticmethod
    async def punch_out(employee_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        now = datetime.now(timezone.utc)

        record = db.attendance_records.find_one({"employeeId": employee_id, "date": today})
        total_hours = 8.0
        if record and record.get("checkInTime"):
            diff = (now - record["checkInTime"]).total_seconds() / 3600.0
            total_hours = round(max(0.1, diff), 2)

        db.attendance_records.update_one(
            {"employeeId": employee_id, "date": today},
            {"$set": {"checkOutTime": now, "totalHours": total_hours, "updatedAt": now}}
        )
        return {"success": True, "message": "Checked out successfully.", "totalHours": total_hours}

    # --- LEAVES ---
    @staticmethod
    async def get_leaves() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.leave_applications.find({}, {"_id": 0}).sort("createdAt", -1))

    @staticmethod
    async def apply_leave(data: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        doc = {
            "id": f"lev_{uuid.uuid4().hex[:8]}",
            "employeeId": data.get("employeeId"),
            "leaveType": data.get("leaveType", "CASUAL"),
            "startDate": data.get("startDate"),
            "endDate": data.get("endDate"),
            "reason": data.get("reason"),
            "status": "PENDING",
            "createdAt": datetime.now(timezone.utc)
        }
        db.leave_applications.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @staticmethod
    async def update_leave_status(leave_id: str, status: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        db.leave_applications.update_one(
            {"id": leave_id},
            {"$set": {"status": status, "approvedBy": user_id, "updatedAt": datetime.now(timezone.utc)}}
        )
        return db.leave_applications.find_one({"id": leave_id}, {"_id": 0})

    # --- PAYROLL ---
    @staticmethod
    async def get_payroll_runs() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.payroll_runs.find({}, {"_id": 0}).sort("createdAt", -1))

    @staticmethod
    async def process_payroll(month: str, year: int, user_id: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        employees = list(db.employees.find({"status": "ACTIVE"}))
        total_payout = 0.0
        lines = []

        for e in employees:
            base = float(e.get("baseSalary", 25000))
            net = base # simplified net calculation
            total_payout += net
            lines.append({
                "employeeId": e["id"],
                "employeeName": f"{e.get('firstName')} {e.get('lastName')}",
                "baseSalary": base,
                "netSalary": net
            })

        doc = {
            "id": f"payrun_{uuid.uuid4().hex[:8]}",
            "month": month,
            "year": year,
            "totalPayout": total_payout,
            "employeeCount": len(employees),
            "lines": lines,
            "status": "PROCESSED",
            "processedBy": user_id,
            "createdAt": datetime.now(timezone.utc)
        }
        db.payroll_runs.insert_one(doc)
        doc.pop("_id", None)
        return doc
