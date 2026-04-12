from datetime import datetime, date
from functools import lru_cache

@lru_cache()
def _get_tz():
    try:
        import pytz
        return pytz.timezone("Australia/Sydney")
    except (ImportError, Exception):
        # Fallback to local/UTC if pytz isn't available or fails
        return None

def get_sydney_now() -> datetime:
    """Returns the current aware datetime in Sydney."""
    tz = _get_tz()
    if tz is None:
        return datetime.now() # System local
    return datetime.now(tz)

def get_sydney_today() -> date:
    """Returns the current date in Sydney."""
    return get_sydney_now().date()

def get_sydney_today_iso() -> str:
    """Returns the current date in Sydney as ISO string (YYYY-MM-DD)."""
    return get_sydney_today().isoformat()
