import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PORT: int = 5000
    HOST: str = "0.0.0.0"
    MONGODB_URI: str = "mongodb://localhost:27017/restaurant_erp"
    DB_NAME: str = "restaurant_erp"
    JWT_SECRET: str = "royal_heritage_restaurant_jwt_secure_super_secret_key_2026"
    JWT_REFRESH_SECRET: str = "royal_heritage_restaurant_jwt_refresh_secure_secret_key_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5000,http://127.0.0.1:3000,http://127.0.0.1:5000"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def CORS_ORIGINS(self) -> List[str]:
        return self.cors_origins

settings = Settings()
