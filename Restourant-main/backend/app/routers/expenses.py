from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional, List
from ..services.expense_service import ExpenseService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.get("")
async def get_expenses(category: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    query = {"category": category} if category else None
    expenses = await ExpenseService.get_expenses(query)
    return ApiResponse.success(data=expenses)

@router.post("")
async def create_expense(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    expense = await ExpenseService.create_expense(body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=expense, message="Expense recorded successfully")

@router.delete("/{expense_id}")
async def delete_expense(expense_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    from ..database import get_db
    db = get_db()
    db.expenses.delete_one({"id": expense_id})
    return ApiResponse.success(message="Expense deleted successfully")
