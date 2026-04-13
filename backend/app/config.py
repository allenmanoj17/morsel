from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str = ""
    supabase_service_role_key: str
    supabase_jwt_secret: str = ""

    # Anthropic
    anthropic_api_key: str

    # App
    app_env: str = "production"
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,https://morsel-log.vercel.app",
        alias="CORS_ORIGINS",
    )
    secret_key: str = "morsel-secret-change-me"

    @property
    def cors_origins_list(self) -> List[str]:
        if self.cors_origins == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
