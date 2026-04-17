from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from supabase import Client
from datetime import date

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import WaterLogCreate, WaterLogResponse, WaterLogUpdate

router = APIRouter(prefix="/api/water", tags=["water"])

@router.get("", response_model=List[WaterLogResponse])
def get_water_logs(
    date: Optional[date] = Query(None),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("water_logs").select("*").eq("user_id", user_id)
    if date:
        query = query.eq("date", date.isoformat())
    
    resp = query.order("created_at").execute()
    return resp.data or []

@router.post("", response_model=WaterLogResponse)
def log_water(
    body: WaterLogCreate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    # We upsert by date if you want a daily aggregate, or just insert new rows.
    # The user request implies simple + and - buttons, so an upsert of the daily total is cleaner.
    
    existing = (
        supabase.table("water_logs")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", body.date.isoformat())
        .limit(1)
        .execute()
    )
    
    if existing.data:
        # Increment existing record
        new_total = existing.data[0]["amount_ml"] + body.amount_ml
        resp = (
            supabase.table("water_logs")
            .update({"amount_ml": max(0, new_total)})
            .eq("id", existing.data[0]["id"])
            .execute()
        )
    else:
        # Create new record
        resp = (
            supabase.table("water_logs")
            .insert({
                "user_id": user_id,
                "date": body.date.isoformat(),
                "amount_ml": body.amount_ml
            })
            .execute()
        )
    
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to save water log")
    return resp.data[0]

@router.patch("/{record_id}", response_model=WaterLogResponse)
def update_water(
    record_id: str,
    body: WaterLogUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    resp = (
        supabase.table("water_logs")
        .update({"amount_ml": body.amount_ml})
        .eq("id", record_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Log not found")
    return resp.data[0]
