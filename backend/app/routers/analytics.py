from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import AnalyticsWeeklyResponse, AnalyticsTrendsResponse
from app.utils.timezone import get_sydney_today

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/weekly", response_model=AnalyticsWeeklyResponse)
def get_weekly_analytics(
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    # Last 7 days
    end_date = get_sydney_today()
    start_date = end_date - timedelta(days=6)
    
    resp = (
        supabase.table("daily_rollups")
        .select("*")
        .eq("user_id", user_id)
        .gte("date", start_date.isoformat())
        .lte("date", end_date.isoformat())
        .execute()
    )
    rollups = resp.data or []
    
    if not rollups:
        return AnalyticsWeeklyResponse(
            avg_calories=0, avg_protein_g=0, avg_carbs_g=0, avg_fat_g=0,
            adherence_avg=0, best_day=None, logging_streak_days=0
        )
        
    avg_cal = sum(float(r.get("calories_total") or 0) for r in rollups) / len(rollups)
    avg_prot = sum(float(r.get("protein_total_g") or 0) for r in rollups) / len(rollups)
    avg_carbs = sum(float(r.get("carbs_total_g") or 0) for r in rollups) / len(rollups)
    avg_fat = sum(float(r.get("fat_total_g") or 0) for r in rollups) / len(rollups)
    
    adherence_scores = [float(r["adherence_score"]) for r in rollups if r.get("adherence_score") is not None]
    avg_adherence = sum(adherence_scores) / len(adherence_scores) if adherence_scores else None
    
    # Best day based on adherence score
    best_day = None
    if adherence_scores:
        best_rollup = max((r for r in rollups if r.get("adherence_score") is not None), key=lambda x: float(x["adherence_score"]))
        best_day = best_rollup["date"]
        
    return AnalyticsWeeklyResponse(
        avg_calories=avg_cal,
        avg_protein_g=avg_prot,
        avg_carbs_g=avg_carbs,
        avg_fat_g=avg_fat,
        adherence_avg=avg_adherence,
        best_day=best_day,
        logging_streak_days=len(rollups) # simplified for now
    )

@router.get("/trends", response_model=AnalyticsTrendsResponse)
def get_analytics_trends(
    days: int = Query(30, ge=7, le=90),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    end_date = get_sydney_today()
    start_date = end_date - timedelta(days=days-1)
    
    resp = (
        supabase.table("daily_rollups")
        .select("date, calories_total, protein_total_g, adherence_score")
        .eq("user_id", user_id)
        .gte("date", start_date.isoformat())
        .lte("date", end_date.isoformat())
        .order("date")
        .execute()
    )
    rollups = resp.data or []
    
    # Map by date to guarantee continuity
    rollup_map = {r["date"]: r for r in rollups}
    
    dates = []
    calories = []
    protein = []
    adherence = []
    
    curr = start_date
    while curr <= end_date:
        d_str = curr.isoformat()
        dates.append(curr)
        if d_str in rollup_map:
            r = rollup_map[d_str]
            calories.append(float(r.get("calories_total") or 0))
            protein.append(float(r.get("protein_total_g") or 0))
            a = r.get("adherence_score")
            adherence.append(float(a) if a is not None else None)
        else:
            calories.append(0)
            protein.append(0)
            adherence.append(None)
        curr += timedelta(days=1)

    return AnalyticsTrendsResponse(
        dates=dates,
        calories=calories,
        protein=protein,
        adherence=adherence
    )
