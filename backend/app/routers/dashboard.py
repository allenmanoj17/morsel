from datetime import date as date_type
from typing import Optional
from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import (
    DailyDashboardResponse,
    HomeCompositeResponse,
    MacroProgress,
    MealTemplatePreviewResponse,
    SupplementLogResponse,
    SupplementResponse,
    WeightLatestResponse,
    WorkoutSummaryResponse,
)
from app.utils.timezone import get_sydney_today_iso

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _make_progress(consumed: float, target: Optional[float]) -> MacroProgress:
    if target and target > 0:
        remaining = max(0.0, target - consumed)
        percent = round(min(100.0, consumed / target * 100), 1)
        hit = consumed >= target * 0.9
        return MacroProgress(consumed=consumed, target=target, remaining=remaining, percent=percent, hit=hit)
    return MacroProgress(consumed=consumed, target=None, remaining=None, percent=None, hit=None)


def _build_dashboard_payload(supabase: Client, user_id: str, date: str) -> DailyDashboardResponse:
    entries_resp = (
        supabase.table("meal_entries")
        .select("*")
        .eq("user_id", user_id)
        .eq("meal_date", date)
        .order("logged_at")
        .execute()
    )
    entries = entries_resp.data or []

    try:
        cal = sum(float(e.get("calories", 0) or 0) for e in entries)
        prot = sum(float(e.get("protein_g", 0) or 0) for e in entries)
        carbs = sum(float(e.get("carbs_g", 0) or 0) for e in entries)
        fat = sum(float(e.get("fat_g", 0) or 0) for e in entries)
    except Exception:
        cal = prot = carbs = fat = 0.0

    t_resp = (
        supabase.table("daily_targets")
        .select("calories_target,protein_target_g,carbs_target_g,fat_target_g,water_target_ml")
        .eq("user_id", user_id)
        .eq("target_type", "default")
        .lte("effective_from", date)
        .order("effective_from", desc=True)
        .limit(1)
        .execute()
    )
    target = t_resp.data[0] if t_resp.data else None

    cal_target = float(target["calories_target"]) if target and target.get("calories_target") else None
    prot_target = float(target["protein_target_g"]) if target and target.get("protein_target_g") else None
    carbs_target = float(target["carbs_target_g"]) if target and target.get("carbs_target_g") else None
    fat_target = float(target["fat_target_g"]) if target and target.get("fat_target_g") else None
    water_target = float(target["water_target_ml"]) if target and target.get("water_target_ml") else None

    w_resp = supabase.table("water_logs").select("amount_ml").eq("user_id", user_id).eq("date", date).execute()
    water_consumed = sum(entry["amount_ml"] for entry in w_resp.data) if w_resp.data else 0

    r_resp = (
        supabase.table("daily_rollups")
        .select("adherence_score")
        .eq("user_id", user_id)
        .eq("date", date)
        .limit(1)
        .execute()
    )
    adherence_score = None
    if r_resp.data and r_resp.data[0].get("adherence_score") is not None:
        adherence_score = float(r_resp.data[0]["adherence_score"])

    return DailyDashboardResponse(
        date=date,
        calories=_make_progress(cal, cal_target),
        protein=_make_progress(prot, prot_target),
        carbs=_make_progress(carbs, carbs_target),
        fat=_make_progress(fat, fat_target),
        water=_make_progress(water_consumed, water_target),
        adherence_score=adherence_score,
        entry_count=len(entries),
        entries=entries,
    )


@router.get("/daily", response_model=DailyDashboardResponse)
def get_daily_dashboard(
    date: Optional[str] = Query(default=None),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    if date is None:
        date = get_sydney_today_iso()
    return _build_dashboard_payload(supabase, user_id, date)


@router.get("/home-composite", response_model=HomeCompositeResponse)
def get_home_composite(
    date: Optional[str] = Query(default=None),
    template_limit: int = Query(default=4, ge=1, le=12),
    workout_limit: int = Query(default=30, ge=1, le=365),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    if date is None:
        date = get_sydney_today_iso()

    dashboard = _build_dashboard_payload(supabase, user_id, date)

    stack_resp = (
        supabase.table("supplement_stack")
        .select("id, name, dosage, is_active, created_at, updated_at")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .order("name")
        .execute()
    )

    logs_resp = (
        supabase.table("supplement_logs")
        .select("id, date, supplement_id, taken, created_at")
        .eq("user_id", user_id)
        .eq("date", date)
        .execute()
    )

    workout_resp = (
        supabase.table("workout_sessions")
        .select("session_date, total_volume")
        .eq("user_id", user_id)
        .order("session_date", desc=True)
        .limit(workout_limit)
        .execute()
    )
    workout_sessions = workout_resp.data or []

    weight_resp = (
        supabase.table("weight_logs")
        .select("id, date, weight_value, unit")
        .eq("user_id", user_id)
        .eq("date", date)
        .limit(1)
        .execute()
    )
    latest_weight = weight_resp.data[0] if weight_resp.data else None
    if latest_weight is None:
        fallback_weight_resp = (
            supabase.table("weight_logs")
            .select("id, date, weight_value, unit")
            .eq("user_id", user_id)
            .order("date", desc=True)
            .limit(1)
            .execute()
        )
        latest_weight = fallback_weight_resp.data[0] if fallback_weight_resp.data else None

    templates_resp = (
        supabase.table("meal_templates")
        .select("id, template_name, description, total_calories, total_protein_g")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(template_limit)
        .execute()
    )

    workout_summary = WorkoutSummaryResponse(
        sessions=len(workout_sessions),
        total_volume=sum(float(s.get("total_volume") or 0) for s in workout_sessions),
        last_session_date=workout_sessions[0]["session_date"] if workout_sessions else None,
    )

    return HomeCompositeResponse(
        dashboard=dashboard,
        supplements=[SupplementResponse(**item) for item in (stack_resp.data or [])],
        supplement_logs=[SupplementLogResponse(**item) for item in (logs_resp.data or [])],
        workout_summary=workout_summary,
        latest_weight=WeightLatestResponse(**latest_weight) if latest_weight else None,
        quick_templates=[MealTemplatePreviewResponse(**item) for item in (templates_resp.data or [])],
    )
