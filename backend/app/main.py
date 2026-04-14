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

settings = get_settings()

app = FastAPI(
    title="Morsel API",
    version="0.1.0",
    description="Private nutrition tracking API — Supabase backend",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    error_detail = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    print(f"FATAL_ERROR: {error_detail}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}", "trace": error_detail if settings.app_env == "development" else None},
        headers={"Access-Control-Allow-Origin": "http://localhost:3000"} 
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


@app.get("/health")
def health():
    return {"status": "ok", "app": "morsel"}
