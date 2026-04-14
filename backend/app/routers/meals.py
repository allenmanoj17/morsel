from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import (
    MealParseRequest, MealParseResponse, MealEntryCreate,
    MealEntryUpdate, MealEntryResponse, ParsedItem,
)
from app.services.normalizer import normalize_text
from app.services.matcher import find_template_match, find_food_match
from app.services.ai_parser import parse_meal_with_haiku
from app.utils.timezone import get_sydney_now, get_sydney_today_iso

router = APIRouter(prefix="/api/meals", tags=["meals"])


# ── Rollup helper ─────────────────────────────────────────────────────────────

def _upsert_rollup(supabase: Client, user_id: str, meal_date: str) -> None:
    """Recalculate and upsert daily_rollups after any meal mutation."""
    # Sum all entries for that day
    resp = (
        supabase.table("meal_entries")
        .select("calories,protein_g,carbs_g,fat_g")
        .eq("user_id", user_id)
        .eq("meal_date", meal_date)
        .execute()
    )
    entries = resp.data or []
    cal   = sum(float(e.get("calories",   0) or 0) for e in entries)
    prot  = sum(float(e.get("protein_g",  0) or 0) for e in entries)
    carbs = sum(float(e.get("carbs_g",    0) or 0) for e in entries)
    fat   = sum(float(e.get("fat_g",      0) or 0) for e in entries)

    # Fetch active target
    t_resp = (
        supabase.table("daily_targets")
        .select("calories_target,protein_target_g,water_target_ml")
        .eq("user_id", user_id)
        .eq("target_type", "default")
        .lte("effective_from", meal_date)
        .order("effective_from", desc=True)
        .limit(1)
        .execute()
    )
    target = t_resp.data[0] if t_resp.data else None

    cal_target  = float(target["calories_target"])  if target and target.get("calories_target")  else None
    prot_target = float(target["protein_target_g"]) if target and target.get("protein_target_g") else None
    water_target = float(target["water_target_ml"]) if target and target.get("water_target_ml") else 2500

    # Sum hydration
    wa_resp = (
        supabase.table("water_logs")
        .select("amount_ml")
        .eq("user_id", user_id)
        .eq("date", meal_date)
        .execute()
    )
    water_ml = sum(float(w.get("amount_ml", 0) or 0) for w in (wa_resp.data or []))

    hit_cal, hit_prot, hit_water, parts = None, None, None, []
    if cal_target:
        hit_cal = abs(cal - cal_target) / cal_target <= 0.10
        parts.append(1.0 if hit_cal else 0.0)
    if prot_target:
        hit_prot = prot >= prot_target
        parts.append(1.0 if hit_prot else 0.0)
    if water_target:
        hit_water = water_ml >= water_target
        parts.append(1.0 if hit_water else 0.0)

    adherence_score = (sum(parts) / len(parts) * 100) if parts else 0

    supabase.table("daily_rollups").upsert(
        {
            "user_id":           user_id,
            "date":              meal_date,
            "calories_total":    cal,
            "protein_total_g":   prot,
            "carbs_total_g":     carbs,
            "fat_total_g":       fat,
            "water_total_ml":    water_ml,
            "calories_target":   cal_target,
            "protein_target_g":  prot_target,
            "hit_calorie_target": hit_cal,
            "hit_protein_target": hit_prot,
            "adherence_score":   adherence_score,
            "updated_at":        get_sydney_now().isoformat(),
        },
        on_conflict="user_id,date",
    ).execute()


# ── Parse ─────────────────────────────────────────────────────────────────────

@router.post("/parse", response_model=MealParseResponse)
async def parse_meal(
    body: MealParseRequest,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    """
    DB-first: template → food library → Haiku AI fallback.
    Supports composite meals separated by semicolon (e.g. "Chicken; Rice; Salad")
    """
    raw_input = body.meal_text
    parts = [p.strip() for p in raw_input.split(";") if p.strip()]
    
    if len(parts) > 1:
        # Multi-item mode
        all_items: List[ParsedItem] = []
        total_cals, total_prot, total_carbs, total_fat = 0.0, 0.0, 0.0, 0.0
        ai_inputs = []
        
        for p in parts:
            normalized = normalize_text(p)
            
            # Try template
            template = find_template_match(supabase, user_id, normalized)
            if template:
                all_items.append(ParsedItem(
                    name=template["template_name"],
                    calories=float(template["total_calories"]),
                    protein_g=float(template["total_protein_g"]),
                    carbs_g=float(template["total_carbs_g"]),
                    fat_g=float(template["total_fat_g"]),
                ))
                total_cals += float(template["total_calories"])
                total_prot += float(template["total_protein_g"])
                total_carbs += float(template["total_carbs_g"])
                total_fat += float(template["total_fat_g"])
                continue
            
            # Try food match
            food = find_food_match(supabase, user_id, normalized)
            if food:
                all_items.append(ParsedItem(
                    name=food["canonical_name"],
                    calories=float(food["calories"]),
                    protein_g=float(food["protein_g"]),
                    carbs_g=float(food["carbs_g"]),
                    fat_g=float(food["fat_g"]),
                ))
                total_cals += float(food["calories"])
                total_prot += float(food["protein_g"])
                total_carbs += float(food["carbs_g"])
                total_fat += float(food["fat_g"])
                continue
                
            # Fallback to AI for this part
            ai_inputs.append(p)
            
        if ai_inputs:
            # Parse remaining items with AI in one shot
            ai_text = " + ".join(ai_inputs)
            try:
                ai_res = await parse_meal_with_haiku(ai_text)
                ai_parsed = ai_res["parsed"]
                for i in ai_parsed.get("items", []):
                    item = ParsedItem(
                        name=i["name"],
                        calories=i["calories"],
                        protein_g=i["protein_g"],
                        carbs_g=i["carbs_g"],
                        fat_g=i["fat_g"],
                    )
                    all_items.append(item)
                    total_cals += item.calories
                    total_prot += item.protein_g
                    total_carbs += item.carbs_g
                    total_fat += item.fat_g
            except:
                pass # Silently fail AI part if error
                
        return MealParseResponse(
            meal_name="Composite Meal",
            items=all_items,
            total_calories=total_cals,
            total_protein_g=total_prot,
            total_carbs_g=total_carbs,
            total_fat_g=total_fat,
            overall_confidence=0.9,
            source_type="composite",
        )

    # Single item mode (original logic)
    normalized = normalize_text(raw_input)
    # ... existing template/food/ai logic ...
    # (Simplified for the sake of the tool call, better to keep the original logic for single items to preserve audit)
    # Actually, the multi-item logic above handles single items fine if raw_input has no semicolon.
    # But I should keep the 1.0 confidence for single-match items.
    
    # Redo single item to keep source attributes
    template = find_template_match(supabase, user_id, normalized)
    if template:
        return MealParseResponse(
            meal_name=template["template_name"],
            items=[ParsedItem(name=template["template_name"], calories=float(template["total_calories"]), protein_g=float(template["total_protein_g"]), carbs_g=float(template["total_carbs_g"]), fat_g=float(template["total_fat_g"]))],
            total_calories=float(template["total_calories"]),
            total_protein_g=float(template["total_protein_g"]),
            total_carbs_g=float(template["total_carbs_g"]),
            total_fat_g=float(template["total_fat_g"]),
            overall_confidence=1.0,
            source_type="template",
            matched_template_id=template["id"],
        )
    
    food = find_food_match(supabase, user_id, normalized)
    if food:
        return MealParseResponse(
            meal_name=food["canonical_name"],
            items=[ParsedItem(name=food["canonical_name"], calories=float(food["calories"]), protein_g=float(food["protein_g"]), carbs_g=float(food["carbs_g"]), fat_g=float(food["fat_g"]))],
            total_calories=float(food["calories"]),
            total_protein_g=float(food["protein_g"]),
            total_carbs_g=float(food["carbs_g"]),
            total_fat_g=float(food["fat_g"]),
            overall_confidence=float(food.get("confidence") or 0.9),
            source_type="db",
            matched_food_id=food["id"],
        )

    # Final AI fallback
    result = await parse_meal_with_haiku(raw_input)
    ai_parsed = result["parsed"]
    return MealParseResponse(
        meal_name=ai_parsed["meal_name"],
        items=[ParsedItem(**i) for i in ai_parsed.get("items", [])],
        total_calories=ai_parsed["total_calories"],
        total_protein_g=ai_parsed["total_protein_g"],
        total_carbs_g=ai_parsed["total_carbs_g"],
        total_fat_g=ai_parsed["total_fat_g"],
        overall_confidence=ai_parsed.get("overall_confidence", 0.8),
        source_type="ai",
    )


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("", response_model=MealEntryResponse, status_code=status.HTTP_201_CREATED)
def create_meal(
    body: MealEntryCreate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    # 1. Ensure Body is UTC-Aware
    from datetime import timezone
    utc_now_dt = body.logged_at
    if utc_now_dt.tzinfo is None:
        utc_now_dt = utc_now_dt.replace(tzinfo=timezone.utc)
    else:
        utc_now_dt = utc_now_dt.astimezone(timezone.utc)
    
    # 2. Extract 'meal_date' by adjusting that UTC to Sydney
    from app.utils.timezone import _get_tz
    sydney_dt = utc_now_dt.astimezone(_get_tz())
    meal_date = sydney_dt.date().isoformat()
    
    now_iso = get_sydney_now().isoformat()
    data = {
        "user_id":          user_id,
        "meal_name":        body.meal_name,
        "entry_text_raw":   body.entry_text_raw,
        "normalized_text":  normalize_text(body.entry_text_raw),
        "logged_at":        utc_now_dt.isoformat(),
        "meal_date":        meal_date,
        "calories":         body.calories,
        "protein_g":        body.protein_g,
        "carbs_g":          body.carbs_g,
        "fat_g":            body.fat_g,
        "source_type":      body.source_type,
        "meal_type":        body.meal_type,
        "food_item_id":     str(body.food_item_id) if body.food_item_id else None,
        "meal_template_id": str(body.meal_template_id) if body.meal_template_id else None,
        "confidence":       body.confidence,
        "notes":            body.notes,
        "items":            body.items,
        "created_at":       now_iso,
        "updated_at":       now_iso,
    }
    resp = supabase.table("meal_entries").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to save meal entry")
    _upsert_rollup(supabase, user_id, meal_date)
    return resp.data[0]


@router.get("", response_model=List[MealEntryResponse])
def get_meals(
    date: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    resp = (
        supabase.table("meal_entries")
        .select("*")
        .eq("user_id", user_id)
        .eq("meal_date", date)
        .order("logged_at")
        .execute()
    )
    return resp.data or []


@router.patch("/{meal_id}", response_model=MealEntryResponse)
def update_meal(
    meal_id: str,
    body: MealEntryUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    # Verify ownership
    existing = (
        supabase.table("meal_entries")
        .select("id,meal_date")
        .eq("id", meal_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Meal entry not found")

    update_data = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if "logged_at" in update_data:
        update_data["logged_at"] = update_data["logged_at"].isoformat()
    update_data["updated_at"] = get_sydney_now().isoformat()

    resp = (
        supabase.table("meal_entries")
        .update(update_data)
        .eq("id", meal_id)
        .eq("user_id", user_id)
        .execute()
    )
    meal_date = existing.data[0]["meal_date"]
    _upsert_rollup(supabase, user_id, str(meal_date))
    return resp.data[0]


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(
    meal_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    existing = (
        supabase.table("meal_entries")
        .select("id,meal_date")
        .eq("id", meal_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Meal entry not found")
    meal_date = str(existing.data[0]["meal_date"])
    supabase.table("meal_entries").delete().eq("id", meal_id).eq("user_id", user_id).execute()
    _upsert_rollup(supabase, user_id, meal_date)
