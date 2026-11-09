from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("keystore.env", "../keystore.env", ".env", "../.env"),
        extra="ignore",
        case_sensitive=True,
    )

    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-insecure-secret-change-me"
    ACCESS_TOKEN_TTL_MINUTES: int = 720
    DATABASE_URL: str = "sqlite:///./data/argus_dev.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_TASK_ALWAYS_EAGER: bool = True
    CORS_ORIGINS: str = "http://localhost:3000"

    LLM_BASE_URL: str = "https://openrouter.ai/api/v1"
    LLM_API_KEY: str = ""
    LLM_REASONING_MODEL: str = "nvidia/nemotron-3-ultra-550b-a55b:free"
    LLM_FAST_MODEL: str = "nvidia/nemotron-3.5-lightning:free"
    VISION_BASE_URL: str = "https://openrouter.ai/api/v1"
    VISION_API_KEY: str = ""
    VISION_MODEL: str = "google/gemma-4-26b-a4b-it:free"
    VISION_FALLBACK_MODEL: str = "nvidia/nemotron-3.5-super-vl:free"
    LLM_TIMEOUT_SECONDS: int = 120
    LLM_MAX_RETRIES: int = 3
    LLM_MAX_TOKENS_REASONING: int = 8000
    LLM_MAX_TOKENS_FAST: int = 2000
    LLM_DAILY_REQUEST_BUDGET: int = 45
    AI_DEV_MODE: bool = False

    EMBEDDING_PROVIDER: str = "openrouter"
    EMBEDDING_BASE_URL: str = "https://openrouter.ai/api/v1"
    EMBEDDING_API_KEY: str = ""
    EMBEDDING_MODEL: str = "qwen/qwen3-embedding-8b"
    EMBEDDING_DIM: int = 4096
    EMBEDDING_MAX_TOKENS_PER_MONTH: int = 2000000
    EMBEDDING_LOCAL_MODEL: str = "Qwen/Qwen3-Embedding-0.6B"

    STORAGE_BACKEND: str = "local"
    STORAGE_LOCAL_DIR: str = "./data/storage"
    SIGNED_URL_TTL_SECONDS: int = 900
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "argus-private"

    MAX_UPLOAD_MB: int = 25
    MAX_DOCUMENT_PAGES: int = 100
    RATE_LIMIT_PER_MINUTE: int = 60

    OPENROUTER_API_KEY_NVIDIA: str = ""
    OPENROUTER_API_KEY_GEMINI: str = ""
    OPENROUTER_API_KEY_QWEN: str = ""

    @property
    def llm_key(self) -> str:
        return self.LLM_API_KEY or self.OPENROUTER_API_KEY_NVIDIA

    @property
    def vision_key(self) -> str:
        return self.VISION_API_KEY or self.OPENROUTER_API_KEY_GEMINI or self.OPENROUTER_API_KEY_NVIDIA

    @property
    def embedding_key(self) -> str:
        return self.EMBEDDING_API_KEY or self.OPENROUTER_API_KEY_QWEN

    @property
    def ai_available(self) -> bool:
        return bool(self.llm_key) and not self.AI_DEV_MODE


@lru_cache
def get_settings() -> Settings:
    return Settings()