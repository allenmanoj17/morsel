from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import OnboardingCreate, OnboardingResponse
from app.utils.timezone import get_sydney_now, get_sydney_today_iso

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.get("", response_model=OnboardingResponse)
def get_onboarding(
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    resp = (
        supabase.table("profiles")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Profile not found — complete onboarding first")
    return resp.data[0]


@router.post("", response_model=OnboardingResponse, status_code=201)
def complete_onboarding(
    body: OnboardingCreate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    now = get_sydney_now().isoformat()
    today = get_sydney_today_iso()

    # Upsert profile
    existing = (
        supabase.table("profiles")
        .select("id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    profile_data = {
        "user_id":               user_id,
        "display_name":          body.display_name,
        "onboarding_completed":  True,
        "updated_at":            now,
    }
    if existing.data:
        supabase.table("profiles").update(profile_data).eq("user_id", user_id).execute()
    else:
        profile_data["created_at"] = now
        supabase.table("profiles").insert(profile_data).execute()

    # Create default target if any macro provided
    if any([body.calories_target, body.protein_target_g, body.carbs_target_g, body.fat_target_g]):
        supabase.table("daily_targets").insert({
            "user_id":          user_id,
            "target_type":      "default",
            "calories_target":  body.calories_target,
            "protein_target_g": body.protein_target_g,
            "carbs_target_g":   body.carbs_target_g,
            "fat_target_g":     body.fat_target_g,
            "effective_from":   today,
            "created_at":       now,
            "updated_at":       now,
        }).execute()

    resp = (
        supabase.table("profiles")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return resp.data[0]


@router.patch("", response_model=OnboardingResponse)
def update_onboarding(
    body: OnboardingCreate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    existing = (
        supabase.table("profiles")
        .select("id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    supabase.table("profiles").update({
        "display_name": body.display_name,
        "updated_at":   get_sydney_now().isoformat(),
    }).eq("user_id", user_id).execute()

    resp = (
        supabase.table("profiles")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return resp.data[0]
