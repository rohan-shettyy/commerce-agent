"""
Configuration settings for the ShopBot AI backend.

Uses pydantic-settings to load configuration from environment variables
and a .env file.
"""

import json
from typing import List, Union

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    Attributes:
        GEMINI_API_KEY: API key for Google Gemini services.
        GEMINI_MODEL: The model version to use for chat and vision tasks.
        ENVIRONMENT: Current deployment environment (e.g., development, production).
        LOG_LEVEL: Logging verbosity level.
        ALLOWED_ORIGINS: List of origins allowed for CORS.
    """

    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-3.1-flash-lite-preview"
    GEMINI_TTS_MODEL: str = "gemini-2.5-pro-preview-tts"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    ALLOWED_ORIGINS: Union[List[str], str] = ["http://localhost:5173"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse comma-separated or JSON array origins from environment.

        Args:
            v: The origin string or list from the environment.

        Returns:
            A list of validated origin strings.
        """
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except (json.JSONDecodeError, ValueError):
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# Singleton settings instance
settings = Settings()
