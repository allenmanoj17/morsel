from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.config import get_settings

from functools import lru_cache

@lru_cache()
def get_auth_client():
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)

bearer_scheme = HTTPBearer()

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    auth_client: Client = Depends(get_auth_client),
) -> str:
    """
    Validates Supabase JWT by making a secure request to the Supabase Auth server.
    This bypasses any local JWT Secret configuration issues.
    """
    token = credentials.credentials
    try:
        # Securely verify the token directly against the Supabase instance
        user_response = auth_client.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user",
            )
            
        return user_response.user.id
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
        )
