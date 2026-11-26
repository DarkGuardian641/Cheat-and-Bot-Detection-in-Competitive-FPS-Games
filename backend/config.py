from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FPS Cheat & Bot Detection API"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DATA_DIR: Path = Path(__file__).resolve().parent.parent / "data"
    MODELS_DIR: Path = Path(__file__).resolve().parent.parent / "models"
    MAX_DEMO_SIZE_MB: int = 500
    DEFAULT_MODEL_PATH: Path = Path(__file__).resolve().parent.parent / "models" / "best_detector.joblib"
    DEFAULT_CONFIG_PATH: Path = Path(__file__).resolve().parent.parent / "models" / "best_detector.json"

    # Directory layout for local persistence
    @property
    def DEMOS_DIR(self) -> Path:
        p = self.DATA_DIR / "demos"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def ANALYSIS_DIR(self) -> Path:
        p = self.DATA_DIR / "analysis"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def LOGS_DIR(self) -> Path:
        p = self.DATA_DIR / "logs"
        p.mkdir(parents=True, exist_ok=True)
        return p

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
