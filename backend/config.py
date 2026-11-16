from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "FPS Cheat & Bot Detection API"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DATA_DIR: Path = Path(__file__).resolve().parent.parent / "data"
    MODELS_DIR: Path = Path(__file__).resolve().parent.parent / "models"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
