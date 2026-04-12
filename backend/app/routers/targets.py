from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import TargetCreate, TargetUpdate, TargetResponse

router = APIRouter(prefix="/api/targets", tags=["targets"])


@router.get("", response_model=List[TargetResponse])
def get_targets(
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    resp = (
        supabase.table("daily_targets")
        .select("*")
        .eq("user_id", user_id)
        .order("effective_from", desc=True)
        .execute()
    )
    return resp.data or []


@router.post("", response_model=TargetResponse, status_code=201)
def create_target(
    body: TargetCreate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    now = datetime.utcnow().isoformat()
    data = {
        "user_id":          user_id,
        "target_type":      body.target_type,
        "calories_target":  body.calories_target,
        "protein_target_g": body.protein_target_g,
        "carbs_target_g":   body.carbs_target_g,
        "fat_target_g":     body.fat_target_g,
        "effective_from":   body.effective_from.isoformat(),
        "effective_to":     body.effective_to.isoformat() if body.effective_to else None,
        "created_at":       now,
        "updated_at":       now,
    }
    resp = supabase.table("daily_targets").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create target")
    return resp.data[0]


@router.patch("/{target_id}", response_model=TargetResponse)
def update_target(
    target_id: str,
    body: TargetUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    existing = (
        supabase.table("daily_targets")
        .select("id")
        .eq("id", target_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Target not found")

    update_data = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if "effective_to" in update_data and update_data["effective_to"]:
        update_data["effective_to"] = update_data["effective_to"].isoformat()
    update_data["updated_at"] = datetime.utcnow().isoformat()

    resp = (
        supabase.table("daily_targets")
        .update(update_data)
        .eq("id", target_id)
        .eq("user_id", user_id)
        .execute()
    )
    return resp.data[0]
