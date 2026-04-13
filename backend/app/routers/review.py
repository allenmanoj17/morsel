from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import ReviewResponse
from app.services.validation import run_validation
from app.services.ai_review import review_day_with_haiku

router = APIRouter(prefix="/api/review", tags=["review"])

@router.post("/end-of-day", response_model=ReviewResponse)
async def generate_eod_review(
    date: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    """Generates an End of Day coaching review using Sonnet."""
    
    # Get entries
    e_resp = supabase.table("meal_entries").select("*").eq("user_id", user_id).eq("meal_date", date).execute()
    entries = e_resp.data or []
    
    # Get targets
    t_resp = (
        supabase.table("daily_targets")
        .select("*")
        .eq("user_id", user_id)
        .eq("target_type", "default")
        .lte("effective_from", date)
        .order("effective_from", desc=True)
        .limit(1)
        .execute()
    )
    target = t_resp.data[0] if t_resp.data else {}

    # Get rollup
    r_resp = supabase.table("daily_rollups").select("*").eq("user_id", user_id).eq("date", date).limit(1).execute()
    rollup = r_resp.data[0] if r_resp.data else {}

    # 1. Run deterministic validation rules first
    flags = run_validation(entries, target, date)
    
    totals = {
        "calories": float(rollup.get("calories_total", 0) or 0),
        "protein_g": float(rollup.get("protein_total_g", 0) or 0),
        "carbs_g": float(rollup.get("carbs_total_g", 0) or 0),
        "fat_g": float(rollup.get("fat_total_g", 0) or 0),
    }

    targets_dict = {
        "calories": float(target.get("calories_target") or 0),
        "protein_g": float(target.get("protein_target_g") or 0)
    }

    # 2. Call Sonnet
    review = await review_day_with_haiku(date, entries, totals, targets_dict, flags)

    # 3. Save validation flags back to rollup (optional audit trail)
    if r_resp.data:
        supabase.table("daily_rollups").update({"validation_flags": flags}).eq("id", rollup["id"]).execute()

    return ReviewResponse(**review)
