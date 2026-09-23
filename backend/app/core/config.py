from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/lostmatch")
    
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-key-change-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
    
    APP_NAME: str = os.getenv("APP_NAME", "LostMatch")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    TEXT_EMBEDDING_MODEL: str = os.getenv("TEXT_EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    IMAGE_EMBEDDING_MODEL: str = os.getenv("IMAGE_EMBEDDING_MODEL", "openai/clip-vit-base-patch32")
    
    STORAGE_PATH: str = os.getenv("STORAGE_PATH", "../storage/images")
    FAISS_INDEX_PATH: str = os.getenv("FAISS_INDEX_PATH", "./faiss_indexes")
    TOP_K_MATCHES: int = int(os.getenv("TOP_K_MATCHES", "5"))
    
    IMAGE_WEIGHT: float = float(os.getenv("IMAGE_WEIGHT", "0.40"))
    TEXT_WEIGHT: float = float(os.getenv("TEXT_WEIGHT", "0.30"))
    LOCATION_WEIGHT: float = float(os.getenv("LOCATION_WEIGHT", "0.20"))
    TIME_WEIGHT: float = float(os.getenv("TIME_WEIGHT", "0.10"))
    
    # CORS origins as comma-separated string
    CORS_ORIGINS_STR: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS_STR.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"


settings = Settings()