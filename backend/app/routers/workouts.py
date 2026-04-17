from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from uuid import UUID

from app.supabase_client import get_supabase
from app.dependencies import get_current_user_id
from app.schemas import (
    ExerciseResponse, ExerciseCreate,
    WorkoutSessionResponse, WorkoutSessionCreate, WorkoutSetBase
)

router = APIRouter(prefix="/api/workouts", tags=["workouts"])

# ─── Exercises Hub ──────────────────────────────────────────────────────────

@router.get("/exercises", response_model=List[ExerciseResponse])
def get_exercises(
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase)
):
    """Fetch global exercises and user-specific entries."""
    resp = supabase.table("exercises").select("*").or_(f"user_id.eq.{user_id},user_id.is.null").order("name").execute()
    return resp.data or []

@router.post("/exercises", response_model=ExerciseResponse)
def create_exercise(
    body: ExerciseCreate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase)
):
    """Add a new exercise to the personal hub."""
    payload = {**body.model_dump(), "user_id": user_id}
    resp = supabase.table("exercises").insert(payload).execute()
    if not resp.data:
        raise HTTPException(status_code=400, detail="Failed to create exercise")
    return resp.data[0]

# ─── Workout Sessions ───────────────────────────────────────────────────────

@router.get("/sessions", response_model=List[WorkoutSessionResponse])
def get_workout_sessions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase)
):
    """Fetch workout sessions with sets included."""
    query = supabase.table("workout_sessions").select("*, workout_sets(*)").eq("user_id", user_id)
    if start_date:
        query = query.gte("session_date", start_date.isoformat())
    if end_date:
        query = query.lte("session_date", end_date.isoformat())
    
    resp = query.order("session_date", desc=True).execute()
    
    # Map sets to the response format
    result = []
    for s in (resp.data or []):
        sets = [WorkoutSetBase(**set_item) for set_item in s.get("workout_sets", [])]
        result.append(WorkoutSessionResponse(**{**s, "sets": sets}))
    
    return result

@router.post("/sessions", response_model=WorkoutSessionResponse)
def create_workout_session(
    body: WorkoutSessionCreate,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase)
):
    """Log a complete training session with granular sets."""
    # 1. Calculate Total Volume
    volume = sum(s.reps * s.weight for s in body.sets)
    
    # 2. Insert Session
    session_payload = {
        "user_id": user_id,
        "session_date": body.session_date.isoformat(),
        "notes": body.notes,
        "total_volume": volume
    }
    s_resp = supabase.table("workout_sessions").insert(session_payload).execute()
    if not s_resp.data:
        raise HTTPException(status_code=400, detail="Failed to create workout session")
    
    session = s_resp.data[0]
    session_id = session["id"]
    
    # 3. Insert Sets
    sets_payload = []
    for s in body.sets:
        sets_payload.append({
            "session_id": session_id,
            "exercise_name": s.exercise_name,
            "set_index": s.set_index,
            "reps": s.reps,
            "weight": s.weight
        })
    
    if sets_payload:
        supabase.table("workout_sets").insert(sets_payload).execute()
    
    return WorkoutSessionResponse(**{**session, "sets": body.sets})

@router.delete("/sessions/{session_id}")
def delete_workout_session(
    session_id: UUID,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase)
):
    """Remove a session record."""
    supabase.table("workout_sessions").delete().eq("id", str(session_id)).eq("user_id", user_id).execute()
    return {"status": "deleted"}

@router.get("/history/{exercise_name}")
def get_exercise_history(
    exercise_name: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase)
):
    """Fetch the last 3 performance instances for this exercise."""
    resp = (
        supabase.table("workout_sets")
        .select("*, workout_sessions(session_date, user_id)")
        .eq("exercise_name", exercise_name)
        .order("created_at", desc=True)
        .limit(10) # Get enough to group by session
        .execute()
    )
    
    # Filter by current user to prevent data leakage
    user_data = [d for d in resp.data if d.get("workout_sessions", {}).get("user_id") == user_id]
    
    # Simple grouping by session logic if we wanted full sessions, 
    # but for progressive overload, we just want the raw recent sets.
    # We'll just return the recent sets with their session dates.
    
    data = []
    for s in (user_data or []):
        data.append({
            "weight": s.get("weight"),
            "reps": s.get("reps"),
            "date": s.get("workout_sessions", {}).get("session_date")
        })
        
    return data[:5] # Return top 5 recent sets
