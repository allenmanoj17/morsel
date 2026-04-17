from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import FoodItemResponse, FoodItemUpdate

router = APIRouter(prefix="/api/foods", tags=["foods"])


@router.get("/search", response_model=List[FoodItemResponse])
def search_foods(
    q: str = Query(..., min_length=1),
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    """Simple text search over food names."""
    # Supabase ilike search
    resp = (
        supabase.table("food_items")
        .select("*")
        .eq("user_id", user_id)
        .ilike("canonical_name", f"%{q}%")
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return resp.data or []


@router.patch("/{food_id}", response_model=FoodItemResponse)
def update_food(
    food_id: str,
    body: FoodItemUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    existing = (
        supabase.table("food_items")
        .select("id")
        .eq("id", food_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Food item not found")

    update_data = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update_data:
        return existing.data[0]

    update_data["updated_at"] = datetime.utcnow().isoformat()
    # We don't bother regenerating normalized_name on updates for now

    resp = (
        supabase.table("food_items")
        .update(update_data)
        .eq("id", food_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to update food item")
    return resp.data[0]
