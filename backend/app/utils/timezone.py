from datetime import datetime, date
try:
    from zoneinfo import ZoneInfo
except ImportError:
    # Fallback for Python < 3.9
    from backports.zoneinfo import ZoneInfo

def _get_tz():
    return ZoneInfo("Australia/Sydney")

def get_sydney_now() -> datetime:
    """Returns the current aware datetime in Sydney."""
    return datetime.now(_get_tz())

def get_sydney_today() -> date:
    """Returns the current date in Sydney."""
    return get_sydney_now().date()

def get_sydney_today_iso() -> str:
    """Returns the current date in Sydney as ISO string (YYYY-MM-DD)."""
    return get_sydney_today().isoformat()
