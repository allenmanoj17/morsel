from uuid import UUID
from datetime import datetime, date
from typing import Optional, List, Any
from pydantic import BaseModel, Field


# ─── Shared ───────────────────────────────────────────────────────────────────

class MacroBase(BaseModel):
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float


# ─── Onboarding / Profile ─────────────────────────────────────────────────────

class OnboardingCreate(BaseModel):
    display_name: str
    calories_target: Optional[float] = None
    protein_target_g: Optional[float] = None
    carbs_target_g: Optional[float] = None
    fat_target_g: Optional[float] = None
    day_types: Optional[List[str]] = None  # ["default", "training", "rest"]


class OnboardingResponse(BaseModel):
    user_id: Optional[UUID] = None
    display_name: Optional[str] = "New User"
    onboarding_completed: bool = False

    class Config:
        from_attributes = True


# ─── Targets ──────────────────────────────────────────────────────────────────

class TargetCreate(BaseModel):
    target_type: str = "default"
    calories_target: Optional[float] = None
    protein_target_g: Optional[float] = None
    carbs_target_g: Optional[float] = None
    fat_target_g: Optional[float] = None
    water_target_ml: Optional[float] = 2500
    effective_from: date
    effective_to: Optional[date] = None


class TargetUpdate(BaseModel):
    target_type: Optional[str] = None
    calories_target: Optional[float] = None
    protein_target_g: Optional[float] = None
    carbs_target_g: Optional[float] = None
    fat_target_g: Optional[float] = None
    water_target_ml: Optional[float] = None
    effective_to: Optional[date] = None


class TargetResponse(BaseModel):
    id: UUID
    user_id: UUID
    target_type: str
    calories_target: Optional[float]
    protein_target_g: Optional[float]
    carbs_target_g: Optional[float]
    fat_target_g: Optional[float]
    water_target_ml: Optional[float]
    effective_from: date
    effective_to: Optional[date]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Meal Parse ───────────────────────────────────────────────────────────────

class MealParseRequest(BaseModel):
    meal_text: str
    logged_at: Optional[datetime] = None


class ParsedItem(BaseModel):
    name: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    assumptions: Optional[str] = None
    confidence: Optional[float] = None


class MealParseResponse(BaseModel):
    meal_name: str
    items: List[ParsedItem]
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    overall_confidence: float
    source_type: str  # ai, db, template
    matched_template_id: Optional[UUID] = None
    matched_food_id: Optional[UUID] = None


# ─── Meal Entry ───────────────────────────────────────────────────────────────

class MealEntryCreate(BaseModel):
    meal_name: str
    entry_text_raw: str
    logged_at: datetime
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    source_type: str  # ai, db, template, manual
    meal_type: str = "snack"  # breakfast, snack, lunch, pre-workout, post-workout, dinner
    food_item_id: Optional[UUID] = None
    meal_template_id: Optional[UUID] = None
    confidence: Optional[float] = None
    notes: Optional[str] = None


class MealEntryUpdate(BaseModel):
    meal_name: Optional[str] = None
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    meal_type: Optional[str] = None
    notes: Optional[str] = None
    logged_at: Optional[datetime] = None


class MealEntryResponse(BaseModel):
    id: UUID
    user_id: UUID
    meal_name: str
    entry_text_raw: str
    logged_at: datetime
    meal_date: date
    meal_type: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    source_type: str
    food_item_id: Optional[UUID]
    meal_template_id: Optional[UUID]
    confidence: Optional[float]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Dashboard ────────────────────────────────────────────────────────────────

class MacroProgress(BaseModel):
    consumed: float
    target: Optional[float]
    remaining: Optional[float]
    percent: Optional[float]
    hit: Optional[bool]


class DailyDashboardResponse(BaseModel):
    date: date
    calories: MacroProgress
    protein: MacroProgress
    carbs: MacroProgress
    fat: MacroProgress
    adherence_score: Optional[float]
    water: Optional[MacroProgress] = None
    entry_count: int
    entries: List[MealEntryResponse]


# ─── Foods ────────────────────────────────────────────────────────────────────

class FoodItemUpdate(BaseModel):
    canonical_name: Optional[str] = None
    serving_description: Optional[str] = None
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None


class FoodItemResponse(BaseModel):
    id: UUID
    user_id: UUID
    canonical_name: str
    normalized_name: str
    aliases: Optional[List[str]] = None
    serving_description: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    source_type: str
    confidence: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Templates ────────────────────────────────────────────────────────────────

class MealTemplateCreate(BaseModel):
    template_name: str
    description: Optional[str] = None
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    ingredient_snapshot: Any  # JSONB


class MealTemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    description: Optional[str] = None
    total_calories: Optional[float] = None
    total_protein_g: Optional[float] = None
    total_carbs_g: Optional[float] = None
    total_fat_g: Optional[float] = None
    ingredient_snapshot: Optional[Any] = None


class MealTemplateResponse(BaseModel):
    id: UUID
    user_id: UUID
    template_name: str
    normalized_name: str
    description: Optional[str] = None
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    ingredient_snapshot: Any
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Analytics & Review ───────────────────────────────────────────────────────

class ReviewResponse(BaseModel):
    day_complete: bool
    targets_met: dict
    anomalies: List[str]
    summary: str


class AnalyticsWeeklyResponse(BaseModel):
    avg_calories: float
    avg_protein_g: float
    avg_carbs_g: float
    avg_fat_g: float
    adherence_avg: Optional[float]
    best_day: Optional[date]
    logging_streak_days: int
    protein_pct: Optional[float] = 0
    carbs_pct: Optional[float] = 0
    fat_pct: Optional[float] = 0
    avg_water_ml: Optional[float] = 0


class AnalyticsTrendsResponse(BaseModel):
    dates: List[date]
    calories: List[float]
    protein: List[float]
    water: List[float]
    weight: List[Optional[float]]
    adherence: List[Optional[float]]


class AnalyticMealTypeDist(BaseModel):
    type: str
    count: int
    avg_calories: float


class AnalyticTimeDist(BaseModel):
    hour: int
    count: int


class AnalyticsMealStatsResponse(BaseModel):
    type_distribution: List[AnalyticMealTypeDist]
    time_distribution: List[AnalyticTimeDist]


# ─── Weights ──────────────────────────────────────────────────────────────────

class WeightCreate(BaseModel):
    date: date
    weight_value: float
    unit: str = "kg"


class WeightUpdate(BaseModel):
    weight_value: Optional[float] = None
    unit: Optional[str] = None


class WeightResponse(BaseModel):
    id: UUID
    user_id: UUID
    date: date
    weight_value: float
    unit: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Water ────────────────────────────────────────────────────────────────────

class WaterLogCreate(BaseModel):
    date: date
    amount_ml: int


class WaterLogUpdate(BaseModel):
    amount_ml: int


class WaterLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    date: date
    amount_ml: int
    created_at: datetime

    class Config:
        from_attributes = True
