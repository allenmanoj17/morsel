from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
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

# CORS must be the absolute first middleware added to prevent preflight errors on 404/500s
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
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
