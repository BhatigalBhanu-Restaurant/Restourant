import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from ..database import get_db

class HRService:
    # --- EMPLOYEES ---
    @staticmethod
    async def get_employees() -> List[Dict[str, Any]]:
        db = get_db()
        return list(db.employees.find({}, {"_id": 0}).sort("firstName", 1))

    @staticmethod
    async def get_employee_by_id(emp_id: str) -> Dict[str, Any]:
        db = get_db()
        emp = db.employees.find_one({"id": emp_id}, {"_id": 0})
        if not emp:
            raise HTTPException(status_code=404, detail={"success": False, "message": "Employee not found."})
        salary = db.salary_structures.find_one({"employeeId": emp_id}, {"_id": 0})
        return {"employee": emp, "salary": salary}

    @staticmethod
    async def create_employee(data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        emp_id = data.get("id") or f"emp_{uuid.uuid4().hex[:8]}"
        count = db.employees.count_documents({})
        doc = {
            "id": emp_id,
            "employeeCode": data.get("employeeCode") or f"EMP-{str(count + 1).zfill(3)}",
            "firstName": data.get("firstName"),
            "lastName": data.get("lastName"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "departmentId": data.get("departmentId"),
            "departmentName": data.get("departmentName"),
            "designationId": data.get("designationId"),
            "designationTitle": data.get("designationTitle"),
            "joiningDate": data.get("joiningDate", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
            "baseSalary": float(data.get("baseSalary", 25000)),
            "status": "ACTIVE",
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }
        db.employees.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @staticmethod
    async def update_employee(emp_id: str, data: Dict[str, Any], user_id: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        db = get_db()
        data["updatedAt"] = datetime.now(timezone.utc)
        db.employees.update_one({"id": emp_id}, {"$set": data})
        return db.employees.find_one({"id": emp_id}, {"_id": 0})

    @staticmethod
    async def delete_employee(emp_id: str):
        db = get_db()
        db.employees.delete_one({"id": emp_id})
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
