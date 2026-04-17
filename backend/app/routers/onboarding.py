from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import OnboardingCreate, OnboardingResponse, ProfileCompositeResponse, TargetResponse, WeightResponse
from app.utils.timezone import get_sydney_now, get_sydney_today_iso

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.get("/profile-composite", response_model=ProfileCompositeResponse)
def get_profile_composite(
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    """
    High-speed composite endpoint to fetch all profile-related data in a single round-trip.
    Reduces latency on the Settings/Profile page significantly.
    """
    # 1. Fetch Profile
    p_resp = supabase.table("profiles").select("*").eq("user_id", user_id).limit(1).execute()
    profile = p_resp.data[0] if p_resp.data else {"user_id": user_id, "onboarding_completed": False}

    # 2. Fetch Active Targets
    t_resp = (
        supabase.table("daily_targets")
        .select("*")
        .eq("user_id", user_id)
        .order("effective_from", desc=True)
        .execute()
    )
    targets = t_resp.data or []

    # 3. Fetch Recent Weights (Limit to last 30 for performance)
    w_resp = (
        supabase.table("weight_logs")
        .select("*")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .limit(30)
        .execute()
    )
    weights = w_resp.data or []

    # Extract current target for the profile response format
    if targets:
        t = targets[0] # Most recent
        profile["calories_target"] = t.get("calories_target")
        profile["protein_target_g"] = t.get("protein_target_g")
        profile["carbs_target_g"] = t.get("carbs_target_g")
        profile["fat_target_g"] = t.get("fat_target_g")
        profile["water_target_ml"] = t.get("water_target_ml") or 2500

    return {
        "profile": profile,
        "targets": targets,
        "weights": weights
    }


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
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to retrieve profile after onboarding")
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

    if not existing.data:
        data["onboarding_completed"] = True
        data["created_at"] = now
        res = supabase.table("profiles").insert(data).execute()
    else:
        res = supabase.table("profiles").update(data).eq("user_id", user_id).execute()

    resp = (
        supabase.table("profiles")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to retrieve updated profile")
    return resp.data[0]
