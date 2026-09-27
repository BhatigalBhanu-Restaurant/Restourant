from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, List
from ..services.table_service import TableService
from ..middleware.auth import get_current_user
from ..utils.response import ApiResponse

router = APIRouter(prefix="/tables", tags=["Dining Tables"])

@router.get("/floor-layout")
async def get_floor_layout(current_user: Dict[str, Any] = Depends(get_current_user)):
    layout = await TableService.get_floor_layout()
    return ApiResponse.success(data=layout)

@router.patch("/{table_id}/status")
async def update_table_status(table_id: str, body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    status = body.get("status", "AVAILABLE")
    table = await TableService.update_status(
        table_id=table_id,
        status=status,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=table, message=f"Table status updated to {status}")

@router.post("/transfer")
async def transfer_table(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    source_id = body.get("fromTableId") or body.get("sourceTableId")
    dest_id = body.get("toTableId") or body.get("destTableId")
    if not source_id or not dest_id:
        raise HTTPException(status_code=400, detail={"success": False, "message": "Source and destination table IDs required."})
    
    res = await TableService.transfer_table(
        source_table_id=source_id,
        dest_table_id=dest_id,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=res, message=res.get("message", "Table transferred"))

@router.post("/merge")
async def merge_tables(body: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    primary_id = body.get("primaryTableId") or body.get("mainTableId")
    secondary_ids = body.get("secondaryTableIds") or body.get("mergeTableIds") or []
    
    res = await TableService.merge_tables(
        primary_table_id=primary_id,
        secondary_table_ids=secondary_ids,
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=res, message=res.get("message", "Tables merged"))

@router.post("/{table_id}/unmerge")
async def unmerge_table(table_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    res = await TableService.split_tables(
        table_ids=[table_id],
        user_id=current_user["userId"],
        username=current_user["username"]
    )
    return ApiResponse.success(data=res, message="Tables unmerged successfully")
