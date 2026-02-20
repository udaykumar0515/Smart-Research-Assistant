from __future__ import annotations

import os
from pathlib import Path

from pydantic import BaseModel


def _load_dotenv() -> None:
    """Load .env from project root (parent of backend/)."""
    from dotenv import load_dotenv

    root = Path(__file__).resolve().parent.parent
    env_file = root / ".env"
    if env_file.exists():
        load_dotenv(env_file)


class Settings(BaseModel):
    api_prefix: str = "/api"
    data_dir: str = "./backend_data"
    sqlite_path: str = "./backend_data/app.db"

    # Document AI
    docai_project_id: str = ""
    docai_location: str = "us"
    docai_processor_id: str = ""
    google_credentials_path: str = ""

    # LLM (provider-agnostic)
    llm_provider: str = ""
    llm_api_key: str = ""
    llm_model: str = ""


def load_settings() -> Settings:
    _load_dotenv()

    # Set Google credentials env var so client libraries can find it
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    if creds_path:
        resolved = str(Path(creds_path).resolve())
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = resolved

    return Settings(
        api_prefix=os.getenv("API_PREFIX", "/api"),
        data_dir=os.getenv("DATA_DIR", "./backend_data"),
        sqlite_path=os.getenv("SQLITE_PATH", "./backend_data/app.db"),
        docai_project_id=os.getenv("DOC_AI_PROJECT_ID", ""),
        docai_location=os.getenv("DOC_AI_LOCATION", "us"),
        docai_processor_id=os.getenv("DOC_AI_PROCESSOR_ID", ""),
        google_credentials_path=creds_path,
        llm_provider=os.getenv("LLM_PROVIDER", ""),
        llm_api_key=os.getenv("LLM_API_KEY", ""),
        llm_model=os.getenv("LLM_MODEL", ""),
    )
