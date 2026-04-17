from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from uuid import UUID

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import (
    SupplementResponse, SupplementCreate,
    SupplementLogResponse, SupplementLogCreate
)

router = APIRouter(prefix="/api/supplements", tags=["supplements"])

# ─── Supplement Stack Management ───────────────────────────────────────────

@router.get("/stack", response_model=List[SupplementResponse])
def get_supplement_stack(
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase)
):
    """Fetch the user's defined supplement stack."""
    resp = supabase.table("supplement_stack").select("*").eq("user_id", user_id).order("created_at").execute()
    return resp.data or []

@router.post("/stack", response_model=SupplementResponse)
def create_supplement(
    body: SupplementCreate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase)
):
    """Add a new target to the bio-stack."""
    payload = {**body.model_dump(), "user_id": user_id}
    resp = supabase.table("supplement_stack").insert(payload).execute()
    if not resp.data:
        raise HTTPException(status_code=400, detail="Failed to create supplement")
    return resp.data[0]

@router.patch("/stack/{supplement_id}", response_model=SupplementResponse)
def update_supplement_status(
    supplement_id: UUID,
    is_active: bool,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase)
):
    """Enable/Disable a supplement in the stack."""
    resp = (
        supabase.table("supplement_stack")
        .update({"is_active": is_active})
        .eq("id", str(supplement_id))
        .eq("user_id", user_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Supplement not found")
    return resp.data[0]

@router.delete("/stack/{supplement_id}")
def delete_supplement(
    supplement_id: UUID,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase)
):
    """Permanently remove a target from the bio-stack."""
    resp = (
        supabase.table("supplement_stack")
        .delete()
        .eq("id", str(supplement_id))
        .eq("user_id", user_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Supplement not found or access denied")
    return {"status": "deleted"}


# ─── Daily Ritual Logging ──────────────────────────────────────────────────

@router.get("/logs", response_model=List[SupplementLogResponse])
def get_supplement_logs(
    date: date,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase)
):
    """Fetch daily checklist results for a specific date."""
    resp = (
        supabase.table("supplement_logs")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", date.isoformat())
        .execute()
    )
    return resp.data or []

@router.post("/logs", response_model=SupplementLogResponse)
def log_supplement_hit(
    body: SupplementLogCreate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase)
):
    """Save the taken state for a supplement on a given day."""
    payload = {
        "user_id": user_id,
        "date": body.date.isoformat(),
        "supplement_id": str(body.supplement_id),
        "taken": body.taken,
    }

    # Do not depend on a live unique constraint for upsert.
    # Some deployed DBs may be missing it, which causes 500 errors.
    existing = (
        supabase.table("supplement_logs")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", body.date.isoformat())
        .eq("supplement_id", str(body.supplement_id))
        .limit(1)
        .execute()
    )

    if existing.data:
        resp = (
            supabase.table("supplement_logs")
            .update({"taken": body.taken})
            .eq("id", existing.data[0]["id"])
            .eq("user_id", user_id)
            .execute()
        )
    else:
        resp = (
            supabase.table("supplement_logs")
            .insert(payload)
            .execute()
        )

    if not resp.data:
        raise HTTPException(status_code=400, detail="Failed to log supplement")
    return resp.data[0]
