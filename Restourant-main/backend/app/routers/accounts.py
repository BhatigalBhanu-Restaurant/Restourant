from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, Optional, List
from ..services.account_service import AccountService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/accounts", tags=["Accounts"])

@router.get("/chart")
async def get_chart(current_user: Dict[str, Any] = Depends(get_current_user)):
    chart = await AccountService.get_chart_of_accounts()
    return ApiResponse.success(data=chart)

@router.post("/chart")
async def create_account(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    acc = await AccountService.create_account_head(body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=acc, message="Account head created successfully")

@router.put("/chart/{acc_id}")
async def update_account(acc_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    acc = await AccountService.update_account_head(acc_id, body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=acc, message="Account head updated successfully")

@router.get("/ledger/{account_id}")
async def get_ledger(
    account_id: str,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    stmt = await AccountService.get_ledger_statement(account_id, startDate, endDate)
    return ApiResponse.success(data=stmt)

@router.get("/journal")
async def get_journal(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    query = {}
    if startDate and endDate:
        query["startDate"] = startDate
        query["endDate"] = endDate
    entries = await AccountService.get_journal_entries(query)
    return ApiResponse.success(data=entries)

@router.post("/journal")
async def create_journal(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    entry = await AccountService.create_journal_entry(body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=entry, message="Journal entry posted successfully")

@router.get("/trial-balance")
async def get_trial_balance(current_user: Dict[str, Any] = Depends(get_current_user)):
    chart = await AccountService.get_chart_of_accounts()
    total_debit = 0.0
    total_credit = 0.0
    tb_rows = []
    
    for acc in chart:
        balance = float(acc.get("currentBalance", 0.0))
        acc_type = acc.get("accountType")
        debit = balance if balance > 0 and acc_type in ["ASSET", "EXPENSE"] else 0.0
        credit = abs(balance) if balance < 0 or acc_type in ["LIABILITY", "EQUITY", "REVENUE"] else 0.0
        total_debit += debit
        total_credit += credit
        tb_rows.append({
            "accountCode": acc.get("accountCode"),
            "accountName": acc.get("accountName"),
            "accountType": acc_type,
            "debit": debit,
            "credit": credit
        })

    return ApiResponse.success(data={
        "rows": tb_rows,
        "totalDebit": total_debit,
        "totalCredit": total_credit,
        "isBalanced": abs(total_debit - total_credit) < 0.01
    })

@router.get("/day-closing")
async def get_day_closing(date: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    res = await AccountService.get_day_closing(date)
    return ApiResponse.success(data=res)

@router.post("/day-closing")
@router.post("/dayclosing")
async def execute_day_closing(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    res = await AccountService.execute_day_closing(body, current_user["userId"], current_user["username"])
    return ApiResponse.success(data=res, message="Day closed successfully")

@router.get("/financial-summary")
async def get_financial_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    chart = await AccountService.get_chart_of_accounts()
    total_assets = sum(a.get("currentBalance", 0) for a in chart if a.get("accountType") == "ASSET")
    total_liabilities = sum(a.get("currentBalance", 0) for a in chart if a.get("accountType") == "LIABILITY")
    total_equity = sum(a.get("currentBalance", 0) for a in chart if a.get("accountType") == "EQUITY")
    total_revenue = sum(a.get("currentBalance", 0) for a in chart if a.get("accountType") == "REVENUE")
    total_expenses = sum(a.get("currentBalance", 0) for a in chart if a.get("accountType") == "EXPENSE")
    net_profit = total_revenue - total_expenses

    return ApiResponse.success(data={
        "totalAssets": total_assets,
        "totalLiabilities": total_liabilities,
        "totalEquity": total_equity,
        "totalRevenue": total_revenue,
        "totalExpenses": total_expenses,
        "netProfit": net_profit
    })
