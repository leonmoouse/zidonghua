from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import Settings, load_settings
from backend.services.ds_client import DSClient
from backend.services.embedding import get_embedding_service
from backend.services.job_manager import JobManager
from backend.services.pipeline import PipelineRunner
from backend.services.qdrant_client import QdrantService

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class TitleRequest(BaseModel):
    keywords: List[str] = Field(..., min_items=1, max_items=8, description="关键词列表")


class TitleResponse(BaseModel):
    result: Dict[str, Any]


class PipelineStartRequest(BaseModel):
    title: str
    description: str | None = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    message: str | None = None
    payload: Dict[str, Any]


class PipelineResultResponse(BaseModel):
    job_id: str
    title: str
    drafts: Dict[str, Any]


class Author(BaseModel):
    name: str
    description: str | None = None


class AuthorsResponse(BaseModel):
    authors: List[Author]


def get_settings() -> Settings:
    return load_settings()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="文案自动化后端")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.settings = settings
    app.state.ds_client = DSClient(settings)
    app.state.embedding = get_embedding_service(settings)
    app.state.qdrant = QdrantService(settings)
    output_dir = Path(settings.project_root) / "backend" / "outputs"
    output_dir.mkdir(parents=True, exist_ok=True)
    pipeline_runner = PipelineRunner(app.state.ds_client, app.state.embedding, app.state.qdrant)
    app.state.job_manager = JobManager(output_dir, pipeline_runner)

    register_routes(app)
    register_lifecycle(app)

    return app


app = create_app()


def register_lifecycle(app: FastAPI) -> None:
    @app.on_event("shutdown")
    async def _shutdown() -> None:
        await app.state.ds_client.close()
        await app.state.qdrant.close()


def register_routes(app: FastAPI) -> None:
    @app.post("/api/p0/titles", response_model=TitleResponse)
    async def generate_titles(request: TitleRequest) -> TitleResponse:
        result = await app.state.ds_client.generate_titles(request.keywords)
        return TitleResponse(result=result)

    @app.post("/api/pipeline/start", response_model=JobStatusResponse)
    async def start_pipeline(request: PipelineStartRequest) -> JobStatusResponse:
        state = await app.state.job_manager.start_job(request.dict())
        return JobStatusResponse(
            job_id=state.job_id,
            status=state.status,
            message=state.message,
            payload=state.payload,
        )

    @app.get("/api/pipeline/status/{job_id}", response_model=JobStatusResponse)
    async def get_status(job_id: str) -> JobStatusResponse:
        state = app.state.job_manager.get_job(job_id)
        if not state:
            raise HTTPException(status_code=404, detail="Job not found")
        return JobStatusResponse(
            job_id=state.job_id,
            status=state.status,
            message=state.message,
            payload=state.payload,
        )

    @app.get("/api/pipeline/result/{job_id}", response_model=PipelineResultResponse)
    async def get_result(job_id: str) -> PipelineResultResponse:
        state = app.state.job_manager.get_job(job_id)
        if not state:
            raise HTTPException(status_code=404, detail="Job not found")
        if not state.result:
            raise HTTPException(status_code=409, detail="Job not finished")
        return PipelineResultResponse(**state.result)

    @app.get("/api/authors", response_model=AuthorsResponse)
    async def list_authors() -> AuthorsResponse:
        return AuthorsResponse(authors=_read_authors(app.state.settings))

    @app.post("/api/authors", response_model=AuthorsResponse)
    async def add_author(author: Author) -> AuthorsResponse:
        authors = _read_authors(app.state.settings)
        if any(existing.name == author.name for existing in authors):
            raise HTTPException(status_code=409, detail="Author already exists")
        authors.append(author)
        _write_authors(app.state.settings, authors)
        return AuthorsResponse(authors=authors)


def _read_authors(settings: Settings) -> List[Author]:
    path = Path(settings.project_root) / "backend" / "data" / "authors.json"
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return [Author(**item) for item in data.get("authors", [])]


def _write_authors(settings: Settings, authors: List[Author]) -> None:
    path = Path(settings.project_root) / "backend" / "data" / "authors.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"authors": [author.dict() for author in authors]}
    tmp_path = path.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(path)
