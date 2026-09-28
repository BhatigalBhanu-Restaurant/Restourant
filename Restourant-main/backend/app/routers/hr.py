from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional, List
from ..services.hr_service import HRService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/hr", tags=["Human Resources"])

# --- EMPLOYEES & STAFF MANAGEMENT ---
@router.get("/employees")
async def get_employees(current_user: Dict[str, Any] = Depends(get_current_user)):
    employees = await HRService.get_employees()
    return ApiResponse.success(data=employees)

@router.post("/employees")
async def create_employee(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    emp = await HRService.create_employee(body, current_user.get("userId"), current_user.get("username"))
    return ApiResponse.success(data=emp, message="Staff member added successfully")

@router.get("/employees/{emp_id}")
async def get_employee(emp_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    data = await HRService.get_employee_by_id(emp_id)
    return ApiResponse.success(data=data)

@router.put("/employees/{emp_id}")
async def update_employee(emp_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    emp = await HRService.update_employee(emp_id, body, current_user.get("userId"), current_user.get("username"))
    return ApiResponse.success(data=emp, message="Staff member updated successfully")

@router.delete("/employees/{emp_id}")
async def delete_employee(emp_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    await HRService.delete_employee(emp_id)
    return ApiResponse.success(message="Staff member deleted successfully")

# --- STAFF UPAD (ADVANCE) & SALARY PAYMENT ---
@router.post("/employees/{emp_id}/advance")
async def add_advance(emp_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    res = await HRService.add_advance(emp_id, body, current_user.get("userId"), current_user.get("username"))
    return ApiResponse.success(data=res, message="Upad / Advance recorded successfully")

@router.post("/employees/{emp_id}/salary-payment")
async def pay_salary(emp_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    res = await HRService.pay_salary(emp_id, body, current_user.get("userId"), current_user.get("username"))
    return ApiResponse.success(data=res, message="Salary payment recorded successfully")

@router.get("/employees/{emp_id}/ledger")
async def get_employee_ledger(emp_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    data = await HRService.get_employee_ledger(emp_id)
    return ApiResponse.success(data=data)

@router.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    await HRService.delete_transaction(tx_id)
    return ApiResponse.success(message="Transaction deleted successfully")

# --- ATTENDANCE ---
@router.get("/attendance")
async def get_attendance(date: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    records = await HRService.get_attendance(date)
    return ApiResponse.success(data=records)

@router.post("/attendance/punch")
async def punch_attendance(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    emp_id = body.get("employeeId")
    punch_type = body.get("type", "IN").upper()
    if punch_type == "OUT":
        res = await HRService.punch_out(emp_id, current_user["userId"])
    else:
        res = await HRService.punch_in(emp_id, current_user["userId"])
    return ApiResponse.success(data=res, message=res.get("message", "Attendance recorded"))

# --- LEAVES ---
@router.get("/leaves")
async def get_leaves(current_user: Dict[str, Any] = Depends(get_current_user)):
    leaves = await HRService.get_leaves()
    return ApiResponse.success(data=leaves)

@router.post("/leaves")
async def apply_leave(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    leave = await HRService.apply_leave(body, current_user["userId"])
    return ApiResponse.success(data=leave, message="Leave application submitted")

@router.patch("/leaves/{leave_id}/status")
async def update_leave_status(leave_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    status = body.get("status", "APPROVED")
    res = await HRService.update_leave_status(leave_id, status, current_user["userId"])
    return ApiResponse.success(data=res, message=f"Leave status updated to {status}")

# --- PAYROLL ---
@router.get("/payroll/runs")
async def get_payroll_runs(current_user: Dict[str, Any] = Depends(get_current_user)):
    runs = await HRService.get_payroll_runs()
    return ApiResponse.success(data=runs)

@router.post("/payroll/process")
async def process_payroll(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    from datetime import datetime, timezone
    month = body.get("month", datetime.now(timezone.utc).strftime("%B"))
    year = int(body.get("year", datetime.now(timezone.utc).year))
    run = await HRService.process_payroll(month, year, current_user["userId"])
    return ApiResponse.success(data=run, message="Payroll processed successfully")

@router.get("/payroll/runs/{run_id}/payslips")
async def get_payslips(run_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..database import get_db
    db = get_db()
    run = db.payroll_runs.find_one({"id": run_id}, {"_id": 0})
    lines = run.get("lines", []) if run else []
    return ApiResponse.success(data=lines)

@router.post("/payroll/runs/{run_id}/approve")
async def approve_payroll(run_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..database import get_db
    from datetime import datetime, timezone
    db = get_db()
    db.payroll_runs.update_one({"id": run_id}, {"$set": {"status": "APPROVED", "approvedBy": current_user["userId"], "updatedAt": datetime.now(timezone.utc)}})
    return ApiResponse.success(message="Payroll approved successfully")
