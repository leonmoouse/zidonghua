from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    ds_base_url: str
    ds_api_key: str
    ds_model: str
    models_path: Path
    qdrant_url: str
    qdrant_api_key: str
    project_root: Path
    port: int
    cors_allow_origins: List[str]


REQUIRED_VARS: Iterable[str] = (
    "DS_BASE_URL",
    "DS_API_KEY",
    "DS_MODEL",
    "MODELS_PATH",
    "QDRANT_URL",
    "QDRANT_API_KEY",
    "PROJECT_ROOT",
    "PORT",
    "CORS_ALLOW_ORIGINS",
)


def load_settings(dotenv_path: Path | None = None) -> Settings:
    """Load and validate environment configuration."""
    if dotenv_path is None:
        dotenv_path = Path(".env")

    if dotenv_path.exists():
        load_dotenv(dotenv_path)

    missing = [var for var in REQUIRED_VARS if not os.getenv(var)]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

    cors_raw = os.getenv("CORS_ALLOW_ORIGINS", "*")
    cors_list = [origin.strip() for origin in cors_raw.split(",") if origin.strip()]
    if not cors_list:
        cors_list = ["*"]

    try:
        port = int(os.getenv("PORT", "7788"))
    except ValueError as exc:
        raise RuntimeError("PORT must be an integer") from exc

    project_root = Path(os.getenv("PROJECT_ROOT", ".")).resolve()
    models_path = Path(os.getenv("MODELS_PATH", "")).expanduser().resolve()

    return Settings(
        ds_base_url=os.environ["DS_BASE_URL"].rstrip("/"),
        ds_api_key=os.environ["DS_API_KEY"],
        ds_model=os.environ["DS_MODEL"],
        models_path=models_path,
        qdrant_url=os.environ["QDRANT_URL"],
        qdrant_api_key=os.environ["QDRANT_API_KEY"],
        project_root=project_root,
        port=port,
        cors_allow_origins=cors_list,
    )
