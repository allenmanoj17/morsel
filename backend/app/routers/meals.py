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
        .select("calories_target,protein_target_g")
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

    hit_cal, hit_prot, parts = None, None, []
    if cal_target:
        hit_cal = abs(cal - cal_target) / cal_target <= 0.10
        parts.append(1.0 if hit_cal else 0.0)
    if prot_target:
        hit_prot = prot >= prot_target
        parts.append(1.0 if hit_prot else 0.0)

    adherence_score = (sum(parts) / len(parts) * 100) if parts else None

    supabase.table("daily_rollups").upsert(
        {
            "user_id":           user_id,
            "date":              meal_date,
            "calories_total":    cal,
            "protein_total_g":   prot,
            "carbs_total_g":     carbs,
            "fat_total_g":       fat,
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
    """DB-first: template → food library → Haiku AI fallback."""
    normalized = normalize_text(body.meal_text)

    # 1. Template match
    template = find_template_match(supabase, user_id, normalized)
    if template:
        return MealParseResponse(
            meal_name=template["template_name"],
            items=[ParsedItem(
                name=template["template_name"],
                calories=float(template["total_calories"]),
                protein_g=float(template["total_protein_g"]),
                carbs_g=float(template["total_carbs_g"]),
                fat_g=float(template["total_fat_g"]),
            )],
            total_calories=float(template["total_calories"]),
            total_protein_g=float(template["total_protein_g"]),
            total_carbs_g=float(template["total_carbs_g"]),
            total_fat_g=float(template["total_fat_g"]),
            overall_confidence=1.0,
            source_type="template",
            matched_template_id=template["id"],
        )

    # 2. Food item match
    food = find_food_match(supabase, user_id, normalized)
    if food:
        return MealParseResponse(
            meal_name=food["canonical_name"],
            items=[ParsedItem(
                name=food["canonical_name"],
                calories=float(food["calories"]),
                protein_g=float(food["protein_g"]),
                carbs_g=float(food["carbs_g"]),
                fat_g=float(food["fat_g"]),
            )],
            total_calories=float(food["calories"]),
            total_protein_g=float(food["protein_g"]),
            total_carbs_g=float(food["carbs_g"]),
            total_fat_g=float(food["fat_g"]),
            overall_confidence=float(food.get("confidence") or 0.9),
            source_type="db",
            matched_food_id=food["id"],
        )

    # 3. AI fallback
    try:
        result = await parse_meal_with_haiku(body.meal_text)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    parsed = result["parsed"]
    now = get_sydney_now().isoformat()

    # Auto-save each parsed item to food library (skip if already exists)
    for item in parsed.get("items", []):
        item_norm = normalize_text(item["name"])
        if not find_food_match(supabase, user_id, item_norm):
            supabase.table("food_items").insert({
                "user_id":           user_id,
                "canonical_name":    item["name"],
                "normalized_name":   item_norm,
                "serving_description": item["name"],
                "calories":          item["calories"],
                "protein_g":         item["protein_g"],
                "carbs_g":           item["carbs_g"],
                "fat_g":             item["fat_g"],
                "source_type":       "ai",
                "confidence":        item.get("confidence"),
                "created_at":        now,
                "updated_at":        now,
            }).execute()

    # Write parse audit
    supabase.table("parse_audit").insert({
        "user_id":           user_id,
        "raw_input":         body.meal_text,
        "normalized_input":  normalized,
        "ai_model":          result["model"],
        "ai_request_tokens": result["input_tokens"],
        "ai_response_tokens": result["output_tokens"],
        "ai_response_raw":   result["raw_response"],
        "validation_result": {"ok": True},
        "created_at":        get_sydney_now().isoformat(),
    }).execute()

    items = [
        ParsedItem(
            name=i["name"],
            calories=i["calories"],
            protein_g=i["protein_g"],
            carbs_g=i["carbs_g"],
            fat_g=i["fat_g"],
            assumptions=i.get("assumptions"),
            confidence=i.get("confidence"),
        )
        for i in parsed.get("items", [])
    ]

    return MealParseResponse(
        meal_name=parsed["meal_name"],
        items=items,
        total_calories=parsed["total_calories"],
        total_protein_g=parsed["total_protein_g"],
        total_carbs_g=parsed["total_carbs_g"],
        total_fat_g=parsed["total_fat_g"],
        overall_confidence=parsed.get("overall_confidence", 0.8),
        source_type="ai",
    )


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("", response_model=MealEntryResponse, status_code=status.HTTP_201_CREATED)
def create_meal(
    body: MealEntryCreate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    meal_date = body.logged_at.date().isoformat()
    now = get_sydney_now().isoformat()
    data = {
        "user_id":          user_id,
        "meal_name":        body.meal_name,
        "entry_text_raw":   body.entry_text_raw,
        "normalized_text":  normalize_text(body.entry_text_raw),
        "logged_at":        body.logged_at.isoformat(),
        "meal_date":        meal_date,
        "calories":         body.calories,
        "protein_g":        body.protein_g,
        "carbs_g":          body.carbs_g,
        "fat_g":            body.fat_g,
        "source_type":      body.source_type,
        "food_item_id":     str(body.food_item_id) if body.food_item_id else None,
        "meal_template_id": str(body.meal_template_id) if body.meal_template_id else None,
        "confidence":       body.confidence,
        "notes":            body.notes,
        "created_at":       now,
        "updated_at":       now,
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
