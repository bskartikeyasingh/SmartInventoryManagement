import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    APP_NAME: str = "StockPilot API"
    APP_ENV: str = "development"
    DATABASE_URL: str = "postgresql://postgreskartikeyasingh@db.dcnpylkjncogzsfuvoyq.supabase.co:5432/postgres"
    ALLOW_SQLITE_FALLBACK: bool = True
    
    SUPABASE_URL: str = "https://dcnpylkjncogzsfuvoyq.supabase.co"
    SUPABASE_PUBLISHABLE_KEY: str = "sb_publishable_NhLPHJIuofNsp7Q3vPf22g_4i6q-2RN"
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    
    SECRET_KEY: str = "stockpilot-dev-jwt-secret-key-32-chars-minimum-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    FRONTEND_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.FRONTEND_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
