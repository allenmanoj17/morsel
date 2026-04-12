from typing import Optional
from supabase import Client
from rapidfuzz import fuzz
from app.services.normalizer import normalize_text

FUZZY_THRESHOLD = 85  # minimum similarity score (0–100)


def find_template_match(supabase: Client, user_id: str, normalized_text: str) -> Optional[dict]:
    """Steps 1 & 2: Exact then fuzzy meal template match."""
    # 1. Exact normalized name
    resp = (
        supabase.table("meal_templates")
        .select("*")
        .eq("user_id", user_id)
        .eq("normalized_name", normalized_text)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]

    # 2. Fuzzy across all user templates
    all_resp = (
        supabase.table("meal_templates")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    templates = all_resp.data or []
    best_score, best_match = 0, None
    for t in templates:
        score = fuzz.ratio(normalized_text, t.get("normalized_name", ""))
        if score > best_score:
            best_score, best_match = score, t
    return best_match if best_score >= FUZZY_THRESHOLD else None


def find_food_match(supabase: Client, user_id: str, normalized_text: str) -> Optional[dict]:
    """Steps 3 & 4: Exact then fuzzy food item match."""
    # 3. Exact normalized name
    resp = (
        supabase.table("food_items")
        .select("*")
        .eq("user_id", user_id)
        .eq("normalized_name", normalized_text)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]

    # 4. Fuzzy
    all_resp = (
        supabase.table("food_items")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    foods = all_resp.data or []
    best_score, best_match = 0, None
    for f in foods:
        score = fuzz.ratio(normalized_text, f.get("normalized_name", ""))
        # Also check aliases
        for alias in (f.get("aliases") or []):
            alias_score = fuzz.ratio(normalized_text, normalize_text(str(alias)))
            score = max(score, alias_score)
        if score > best_score:
            best_score, best_match = score, f
    return best_match if best_score >= FUZZY_THRESHOLD else None
