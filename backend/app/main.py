"""
Morsel Entry Point (FastAPI Runtime)
====================================
This module aggregates the API routers and configures the core FastAPI ASGI application.
It defines CORS middleware for the Next.js PWA and explicitly mounts routes for:
- Core Meal/Target CRUD
- Onboarding & Dashboard Rollups
- AI Coaching engines & parsing logic

Usage:
  uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from fastapi.responses import JSONResponse
from app.routers import meals as meals_router
from app.routers import targets as targets_router
from app.routers import onboarding as onboarding_router
from app.routers import dashboard as dashboard_router
from app.routers import foods as foods_router
from app.routers import templates as templates_router
from app.routers import review as review_router
from app.routers import weights as weights_router
from app.routers import analytics as analytics_router
from app.routers import water as water_router
from app.routers import workouts as workouts_router
from app.routers import supplements as supplements_router

settings = get_settings()

app = FastAPI(
    title="Morsel API",
    version="0.1.0",
    description="Private nutrition tracking API — Supabase backend",
)

# CORS configuration
has_wildcard = "*" in settings.cors_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in settings.cors_origins_list if o != "*"] or ["http://localhost:3000"],
    allow_credentials=not has_wildcard,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    import logging
    logger = logging.getLogger(__name__)
    
    # Log full trace only to server logs (not to client)
    error_detail = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    logger.error(f"FATAL_ERROR: {error_detail}")
    
    # Send minimal user-friendly response
    detail = "An error occurred. Please try again later." if settings.app_env == "production" else str(exc)
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
        headers={"Access-Control-Allow-Origin": "*"} 
    )

app.include_router(meals_router.router)
app.include_router(targets_router.router)
app.include_router(onboarding_router.router)
app.include_router(dashboard_router.router)
app.include_router(foods_router.router)
app.include_router(templates_router.router)
app.include_router(review_router.router)
app.include_router(weights_router.router)
app.include_router(analytics_router.router)
app.include_router(water_router.router)
app.include_router(workouts_router.router)
app.include_router(supplements_router.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": "morsel"}
