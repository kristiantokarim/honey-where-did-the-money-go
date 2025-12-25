from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    llm_provider: str = "gemini"
    gemini_api_key: str = ""
    claude_api_key: str = ""
    
    # Ensure DATABASE_PATH is absolute or correctly relative to where app runs
    database_path: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "transactions.db")
    upload_dir: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "uploads")
    
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:5173" # Comma-separated string for multiple origins
    
    max_uploads_per_minute: int = 10

@lru_cache()
def get_settings():
    return Settings()
