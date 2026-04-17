from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import WeightCreate, WeightUpdate, WeightResponse

router = APIRouter(prefix="/api/weights", tags=["weights"])

@router.get("", response_model=List[WeightResponse])
def get_weights(
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    resp = (
        supabase.table("weight_logs")
        .select("*")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .execute()
    )
    return resp.data or []

@router.post("", response_model=WeightResponse, status_code=status.HTTP_201_CREATED)
def create_weight(
    body: WeightCreate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    now = datetime.utcnow().isoformat()
    # Check if entry already exists for this date, if so we update it
    existing = supabase.table("weight_logs").select("id").eq("user_id", user_id).eq("date", body.date.isoformat()).execute()
    
    if existing.data:
        resp = supabase.table("weight_logs").update({
            "weight_value": body.weight_value,
            "unit": body.unit,
            "updated_at": now
        }).eq("id", existing.data[0]["id"]).execute()
        return resp.data[0]
        
    data = {
        "user_id": user_id,
        "date": body.date.isoformat(),
        "weight_value": body.weight_value,
        "unit": body.unit,
        "created_at": now,
        "updated_at": now,
    }
    resp = supabase.table("weight_logs").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create weight log")
    return resp.data[0]

@router.patch("/{weight_id}", response_model=WeightResponse)
def update_weight(
    weight_id: str,
    body: WeightUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    existing = supabase.table("weight_logs").select("id").eq("id", weight_id).eq("user_id", user_id).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Weight entry not found")

    update_data = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    update_data["updated_at"] = datetime.utcnow().isoformat()

    resp = supabase.table("weight_logs").update(update_data).eq("id", weight_id).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to update weight log")
    return resp.data[0]

@router.delete("/{weight_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_weight(
    weight_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    existing = supabase.table("weight_logs").select("id").eq("id", weight_id).eq("user_id", user_id).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Weight entry not found")
    supabase.table("weight_logs").delete().eq("id", weight_id).eq("user_id", user_id).execute()
