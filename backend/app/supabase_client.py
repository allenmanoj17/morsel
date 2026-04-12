from supabase import create_client, Client
from functools import lru_cache
from app.config import get_settings


@lru_cache()
def get_supabase() -> Client:
    """
    Returns a singleton Supabase client using the service role key.
    Service role bypasses RLS — we enforce data isolation manually via user_id filters.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
