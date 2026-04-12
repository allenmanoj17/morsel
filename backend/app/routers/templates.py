from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import (
    MealTemplateCreate, MealTemplateUpdate, MealTemplateResponse,
    MealEntryResponse, MealEntryCreate
)
from app.services.normalizer import normalize_text
from app.routers.meals import create_meal

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=List[MealTemplateResponse])
def get_templates(
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    resp = (
        supabase.table("meal_templates")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []


@router.post("", response_model=MealTemplateResponse, status_code=201)
def create_template(
    body: MealTemplateCreate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    now = datetime.utcnow().isoformat()
    data = {
        "user_id":             user_id,
        "template_name":       body.template_name,
        "normalized_name":     normalize_text(body.template_name),
        "description":         body.description,
        "total_calories":      body.total_calories,
        "total_protein_g":     body.total_protein_g,
        "total_carbs_g":       body.total_carbs_g,
        "total_fat_g":         body.total_fat_g,
        "ingredient_snapshot": body.ingredient_snapshot,
        "created_at":          now,
        "updated_at":          now,
    }
    resp = supabase.table("meal_templates").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create template")
    return resp.data[0]


@router.patch("/{template_id}", response_model=MealTemplateResponse)
def update_template(
    template_id: str,
    body: MealTemplateUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    existing = (
        supabase.table("meal_templates")
        .select("id")
        .eq("id", template_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Template not found")

    update_data = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update_data:
        # just return existing
        full = supabase.table("meal_templates").select("*").eq("id", template_id).execute()
        return full.data[0]

    update_data["updated_at"] = datetime.utcnow().isoformat()
    if "template_name" in update_data:
        update_data["normalized_name"] = normalize_text(update_data["template_name"])

    resp = (
        supabase.table("meal_templates")
        .update(update_data)
        .eq("id", template_id)
        .execute()
    )
    return resp.data[0]


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    existing = (
        supabase.table("meal_templates")
        .select("id")
        .eq("id", template_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Template not found")
    supabase.table("meal_templates").delete().eq("id", template_id).execute()


@router.post("/{template_id}/log", response_model=MealEntryResponse, status_code=201)
def log_template(
    template_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    """One-tap log: create a meal entry from a template for the current time."""
    t_resp = (
        supabase.table("meal_templates")
        .select("*")
        .eq("id", template_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not t_resp.data:
        raise HTTPException(status_code=404, detail="Template not found")
    t = t_resp.data[0]

    body = MealEntryCreate(
        meal_name=t["template_name"],
        entry_text_raw=f"(From template: {t['template_name']})",
        logged_at=datetime.utcnow(),
        calories=t["total_calories"],
        protein_g=t["total_protein_g"],
        carbs_g=t["total_carbs_g"],
        fat_g=t["total_fat_g"],
        source_type="template",
        meal_template_id=template_id,
        confidence=1.0,
    )
    return create_meal(body, user_id, supabase)
