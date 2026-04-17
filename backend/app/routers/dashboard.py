from datetime import date as date_type
from typing import Optional
from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import DailyDashboardResponse, MacroProgress, MealEntryResponse
from app.utils.timezone import get_sydney_today_iso

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _make_progress(consumed: float, target: Optional[float]) -> MacroProgress:
    if target and target > 0:
        remaining = max(0.0, target - consumed)
        percent = round(min(100.0, consumed / target * 100), 1)
        hit = consumed >= target * 0.9
        return MacroProgress(consumed=consumed, target=target, remaining=remaining, percent=percent, hit=hit)
    return MacroProgress(consumed=consumed, target=None, remaining=None, percent=None, hit=None)


@router.get("/daily", response_model=DailyDashboardResponse)
def get_daily_dashboard(
    date: Optional[str] = Query(default=None),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    if date is None:
        date = get_sydney_today_iso()

    # Entries for the day
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
        cal   = sum(float(e.get("calories",  0) or 0) for e in entries)
        prot  = sum(float(e.get("protein_g", 0) or 0) for e in entries)
        carbs = sum(float(e.get("carbs_g",   0) or 0) for e in entries)
        fat   = sum(float(e.get("fat_g",     0) or 0) for e in entries)
    except Exception as e:
        import logging
        logging.error(f"DASHBOARD_AGGREGATION_FAILED: {str(e)}")
        cal = prot = carbs = fat = 0.0

    # Active target
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

    cal_target   = float(target["calories_target"])   if target and target.get("calories_target")   else None
    prot_target  = float(target["protein_target_g"])  if target and target.get("protein_target_g")  else None
    carbs_target = float(target["carbs_target_g"])    if target and target.get("carbs_target_g")    else None
    fat_target   = float(target["fat_target_g"])      if target and target.get("fat_target_g")      else None
    water_target = float(target["water_target_ml"])   if target and target.get("water_target_ml")   else None

    # Water consumed
    w_resp = supabase.table("water_logs").select("amount_ml").eq("user_id", user_id).eq("date", date).execute()
    water_consumed = sum(entry["amount_ml"] for entry in w_resp.data) if w_resp.data else 0

    # Adherence from rollup
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
