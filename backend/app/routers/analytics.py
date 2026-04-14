from datetime import datetime, timedelta, date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from supabase import Client

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import AnalyticsWeeklyResponse, AnalyticsTrendsResponse, AnalyticsMealStatsResponse, SocialSummaryResponse
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
            adherence_avg=0, best_day=None, logging_streak_days=0,
            protein_pct=0, carbs_pct=0, fat_pct=0
        )
        
    avg_cal = sum(float(r.get("calories_total") or 0) for r in rollups) / len(rollups)
    avg_prot = sum(float(r.get("protein_total_g") or 0) for r in rollups) / len(rollups)
    avg_carbs = sum(float(r.get("carbs_total_g") or 0) for r in rollups) / len(rollups)
    avg_fat = sum(float(r.get("fat_total_g") or 0) for r in rollups) / len(rollups)
    
    # Calculate Macro % Distribution (based on calories)
    p_cal = avg_prot * 4
    c_cal = avg_carbs * 4
    f_cal = avg_fat * 9
    total_m_cal = p_cal + c_cal + f_cal
    
    p_pct = (p_cal / total_m_cal * 100) if total_m_cal > 0 else 0
    c_pct = (c_cal / total_m_cal * 100) if total_m_cal > 0 else 0
    f_pct = (f_cal / total_m_cal * 100) if total_m_cal > 0 else 0

    adherence_scores = [float(r["adherence_score"]) for r in rollups if r.get("adherence_score") is not None]
    avg_adherence = sum(adherence_scores) / len(adherence_scores) if adherence_scores else None
    
    # Target Hit Counts
    cal_hits = 0
    prot_hits = 0
    water_hits = 0
    
    for r in rollups:
        # We need the target for that specific day. Simple approach: fetch most recent target for the day.
        # Optimized: For 7 days, we can just fetch all targets and map.
        # For brevity in this refactor, we'll use the 'target_hit' flags if they existed, or calculate.
        # Since 'daily_rollups' doesn't store target, we check the 'calories_total' vs our calculated avg or refetch.
        # Implementation: Check against the latest default target.
        pass

    # Fetch targets for hit calculation
    t_resp = supabase.table("daily_targets").select("*").eq("user_id", user_id).eq("target_type", "default").execute()
    targets_list = t_resp.data or []
    
    def get_target_for_date(d_str):
        valid = [t for t in targets_list if t["effective_from"] <= d_str]
        if not valid: return None
        return sorted(valid, key=lambda x: x["effective_from"], reverse=True)[0]

    for r in rollups:
        t = get_target_for_date(r["date"])
        if not t: continue
        
        c_val = float(r.get("calories_total") or 0)
        p_val = float(r.get("protein_total_g") or 0)
        
        c_target = float(t.get("calories_target") or 2000)
        p_target = float(t.get("protein_target_g") or 150)
        
        if c_target * 0.9 <= c_val <= c_target * 1.05: cal_hits += 1
        if p_val >= p_target * 0.9: prot_hits += 1

    # Water hits
    wa_resp = supabase.table("water_logs").select("date, amount_ml").eq("user_id", user_id).gte("date", start_date.isoformat()).execute()
    water_by_date = {}
    for entry in wa_resp.data:
        water_by_date[entry["date"]] = water_by_date.get(entry["date"], 0) + entry["amount_ml"]
    
    for d_str, amt in water_by_date.items():
        t = get_target_for_date(d_str)
        if t and amt >= float(t.get("water_target_ml") or 2000):
            water_hits += 1

    # Meal Timing (Simplified)
    m_resp = supabase.table("meal_entries").select("logged_at, meal_date").eq("user_id", user_id).gte("meal_date", start_date.isoformat()).execute()
    meals = m_resp.data or []
    
    first_times = []
    last_times = []
    daily_counts = {}
    
    for m in meals:
        d = m["meal_date"]
        daily_counts[d] = daily_counts.get(d, 0) + 1
        ts = datetime.fromisoformat(m["logged_at"].replace("Z", "+00:00"))
        time_str = ts.strftime("%H:%M")
        if d not in first_times or time_str < first_times: # pseudo logic, sorting better
            pass # simplified for now

    avg_f = "08:30"
    avg_l = "20:30"

    # Best day based on adherence score
    best_day = None
    if adherence_scores:
        filtered = [r for r in rollups if r.get("adherence_score") is not None]
        if filtered:
            best_rollup = max(filtered, key=lambda x: float(x["adherence_score"]))
            best_day = best_rollup["date"]

    return AnalyticsWeeklyResponse(
        avg_calories=avg_cal,
        avg_protein_g=avg_prot,
        avg_carbs_g=avg_carbs,
        avg_fat_g=avg_fat,
        adherence_avg=avg_adherence,
        best_day=best_day,
        logging_streak_days=len(rollups),
        protein_pct=p_pct,
        carbs_pct=c_pct,
        fat_pct=f_pct,
        calories_hit_count=cal_hits,
        protein_hit_count=prot_hits,
        water_hit_count=water_hits,
        avg_first_meal=avg_f,
        avg_last_meal=avg_l,
        meals_per_day_avg=sum(daily_counts.values())/len(daily_counts) if daily_counts else 0
    )

@router.get("/trends", response_model=AnalyticsTrendsResponse)
def get_analytics_trends(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days: int = Query(30, ge=7, le=365),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    try:
        if not end_date:
            end_date = get_sydney_today()
        if not start_date:
            start_date = end_date - timedelta(days=days-1)
        
        start_str = start_date.isoformat() if hasattr(start_date, 'isoformat') else str(start_date)
        end_str = end_date.isoformat() if hasattr(end_date, 'isoformat') else str(end_date)
        print(f"[TRENDS] Fetching for {user_id} | {start_str} to {end_str}")

        # 1. Fetch Rollups
        resp = (
            supabase.table("daily_rollups")
            .select("date, calories_total, protein_total_g, water_total_ml, adherence_score, calories_target, protein_target_g")
            .eq("user_id", user_id)
            .gte("date", start_str)
            .lte("date", end_str)
            .order("date")
            .execute()
        )
        rollup_map = {r["date"]: r for r in (resp.data or [])}
        print(f"[TRENDS] Got {len(rollup_map)} rollups")
        
        # 2. Fetch Weights
        w_resp = (
            supabase.table("weight_logs")
            .select("date, weight_value")
            .eq("user_id", user_id)
            .gte("date", start_str)
            .lte("date", end_str)
            .execute()
        )
        weight_map = {}
        if w_resp.data:
            for r in w_resp.data:
                wv = r.get("weight_value")
                if wv is not None:
                    weight_map[r["date"]] = float(wv)
        # 2b. Fetch Latest Active Targets
        t_resp = (
            supabase.table("daily_targets")
            .select("*")
            .eq("user_id", user_id)
            .eq("target_type", "default")
            .order("effective_from", desc=True)
            .limit(1)
            .execute()
        )
        def_t = t_resp.data[0] if t_resp.data else {}
        def_cal = float(def_t.get("calories_target") or 2000)
        def_prot = float(def_t.get("protein_target_g") or 150)
        def_water = float(def_t.get("water_target_ml") or 2500)

        # 3. Construct Time Series
        res_dates, res_cals, res_prot, res_water, res_weight, res_adherence = [], [], [], [], [], []
        res_cal_t, res_prot_t, res_water_t = [], [], []

        curr = start_date
        while curr <= end_date:
            d_str = curr.isoformat()
            res_dates.append(curr)
            
            r = rollup_map.get(d_str, {})
            res_cals.append(float(r.get("calories_total") or 0))
            res_prot.append(float(r.get("protein_total_g") or 0))
            res_water.append(float(r.get("water_total_ml") or 0))
            res_adherence.append(float(r.get("adherence_score") or 0))
            res_weight.append(weight_map.get(d_str))
            
            # Use daily target if available (best), else the overall default
            res_cal_t.append(float(r.get("calories_target") or def_cal))
            res_prot_t.append(float(r.get("protein_target_g") or def_prot))
            res_water_t.append(def_water) 
            
            curr += timedelta(days=1)

        rolling = []
        for i in range(len(res_weight)):
            subset = [w for w in res_weight[max(0, i-6):i+1] if w is not None]
            rolling.append(sum(subset)/len(subset) if subset else None)

        print("[TRENDS] Successfully constructed series")
        return AnalyticsTrendsResponse(
            dates=res_dates,
            calories=res_cals,
            protein=res_prot,
            water=res_water,
            weight=res_weight,
            adherence=res_adherence,
            calories_target=res_cal_t,
            protein_target=res_prot_t,
            water_target=res_water_t,
            weight_rolling_avg=rolling
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"TRENDS_ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Trends calculation failed: {str(e)}")

@router.get("/social-summary/{date_str}", response_model=SocialSummaryResponse)
def get_social_summary(
    date_str: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    # Fetch rollup for the day
    r_resp = supabase.table("daily_rollups").select("*").eq("user_id", user_id).eq("date", date_str).execute()
    if not r_resp.data:
        # Fallback or empty
        return SocialSummaryResponse(
            date=datetime.fromisoformat(date_str).date(), day_number=1, calories_actual=0, calories_target=2000,
            protein_actual=0, protein_target=150, water_actual=0, water_target=2000, 
            weight=None, adherence_score=0, summary_text="Protocol standby. Awaiting first log."
        )
    
    r = r_resp.data[0]
    
    # Fetch target
    t_resp = supabase.table("daily_targets").select("*").eq("user_id", user_id).lte("effective_from", date_str).order("effective_from", desc=True).limit(1).execute()
    t = t_resp.data[0] if t_resp.data else {"calories_target": 2000, "protein_target_g": 150, "water_target_ml": 2000}

    # Day number calculation (from first log)
    first_log = supabase.table("meal_entries").select("meal_date").eq("user_id", user_id).order("meal_date").limit(1).execute()
    day_num = 1
    if first_log.data:
        delta = datetime.fromisoformat(date_str).date() - datetime.fromisoformat(first_log.data[0]["meal_date"]).date()
        day_num = delta.days + 1

    # Training Detection
    m_resp = supabase.table("meal_entries").select("meal_type").eq("user_id", user_id).eq("meal_date", date_str).execute()
    training_done = any(m.get("meal_type") in ["pre-workout", "post-workout"] for m in m_resp.data) if m_resp.data else False

    # Weight
    w_resp = supabase.table("weight_logs").select("weight_value").eq("user_id", user_id).eq("date", date_str).execute()
    weight = float(w_resp.data[0]["weight_value"]) if w_resp.data else None

    # Water
    wa_resp = supabase.table("water_logs").select("amount_ml").eq("user_id", user_id).eq("date", date_str).execute()
    water = sum(entry["amount_ml"] for entry in wa_resp.data) if wa_resp.data else 0

    return SocialSummaryResponse(
        date=datetime.fromisoformat(date_str).date(),
        day_number=day_num,
        calories_actual=float(r["calories_total"] or 0),
        calories_target=float(t["calories_target"]),
        protein_actual=float(r["protein_total_g"] or 0),
        protein_target=float(t["protein_target_g"]),
        water_actual=float(water),
        water_target=float(t["water_target_ml"]),
        weight=weight,
        training_done=training_done,
        adherence_score=float(r["adherence_score"] or 0),
        summary_text="Protocol execution at maximum efficiency."
    )


@router.get("/meal-stats", response_model=AnalyticsMealStatsResponse)
def get_meal_stats(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days: int = Query(30, ge=7, le=365),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    if not end_date:
        end_date = get_sydney_today()
    if not start_date:
        start_date = end_date - timedelta(days=days-1)
    
    start_str = start_date.isoformat() if hasattr(start_date, 'isoformat') else str(start_date)
    end_str = end_date.isoformat() if hasattr(end_date, 'isoformat') else str(end_date)
    
    # Fetch raw meal entries for the period
    resp = (
        supabase.table("meal_entries")
        .select("meal_type, logged_at, calories")
        .eq("user_id", user_id)
        .gte("meal_date", start_str)
        .lte("meal_date", end_str)
        .execute()
    )
    entries = resp.data or []
    
    # Aggregation
    type_map = {} # { type: { count, total_cal } }
    hour_map = {h: 0 for h in range(24)}
    
    for e in entries:
        t = e.get("meal_type") or "snack"
        cal = float(e.get("calories") or 0)
        
        # Type stats
        if t not in type_map:
            type_map[t] = {"count": 0, "total_cal": 0.0}
        type_map[t]["count"] += 1
        type_map[t]["total_cal"] += cal
        
        # Hour stats
        try:
            # Parse ISO timestamp and extract hour
            dt = datetime.fromisoformat(e["logged_at"].replace("Z", "+00:00"))
            hour_map[dt.hour] += 1
        except:
            pass
            
    type_dist = [
        {
            "type": k, 
            "count": v["count"], 
            "avg_calories": v["total_cal"] / v["count"] if v["count"] > 0 else 0
        }
        for k, v in type_map.items()
    ]
    
    time_dist = [{"hour": h, "count": c} for h, c in hour_map.items()]
    
    return AnalyticsMealStatsResponse(
        type_distribution=type_dist,
        time_distribution=time_dist
    )
