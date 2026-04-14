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
        return OnboardingResponse(user_id=user_id, onboarding_completed=False)
    
    profile = resp.data[0]
    
    # Fetch active targets to merge
    t_resp = (
        supabase.table("daily_targets")
        .select("*")
        .eq("user_id", user_id)
        .eq("target_type", "default")
        .order("effective_from", desc=True)
        .limit(1)
        .execute()
    )
    if t_resp.data:
        t = t_resp.data[0]
        profile["calories_target"] = t.get("calories_target")
        profile["protein_target_g"] = t.get("protein_target_g")
        profile["carbs_target_g"] = t.get("carbs_target_g")
        profile["fat_target_g"] = t.get("fat_target_g")
        profile["water_target_ml"] = t.get("water_target_ml") or 2500
        
    return profile


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
        "goal_weight":           body.goal_weight,
        "height_cm":             body.height_cm,
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
    # Check if exists to decide insert vs update
    existing = (
        supabase.table("profiles")
        .select("id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    now = get_sydney_now().isoformat()
    data = {
        "user_id":      user_id,
        "display_name": body.display_name,
        "goal_weight":  body.goal_weight,
        "height_cm":    body.height_cm,
        "updated_at":   now,
    }

    print(f"DEBUG: Updating profile for user {user_id}")
    print(f"DEBUG: Payload: {data}")

    if not existing.data:
        print("DEBUG: Profile missing - performing INSERT")
        data["onboarding_completed"] = True
        data["created_at"] = now
        res = supabase.table("profiles").insert(data).execute()
        print(f"DEBUG: Insert result: {res.data}")
    else:
        print("DEBUG: Profile exists - performing UPDATE")
        res = supabase.table("profiles").update(data).eq("user_id", user_id).execute()
        print(f"DEBUG: Update result: {res.data}")

    resp = (
        supabase.table("profiles")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return resp.data[0]
