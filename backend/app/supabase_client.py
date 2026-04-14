from supabase import create_client, Client
from functools import lru_cache
from app.config import get_settings


def get_supabase() -> Client:
    """
    Returns a fresh Supabase client using the service role key.
    We removed lru_cache to prevent 'deque mutated during iteration' errors 
    during high concurrency across sync/async boundaries.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
