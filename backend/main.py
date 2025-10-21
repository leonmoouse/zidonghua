from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import Settings, load_settings
from backend.services.ds_client import DSClient
from backend.services.embedding import get_embedding_service
from backend.services.job_manager import JobManager
from backend.services.pipeline import PipelineRunner
from backend.services.qdrant_client import QdrantService
from backend.models.job import JobState, PipelineStage, PipelineStatus

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class QuadrantTitles(BaseModel):
    behavior: List[str] = Field(default_factory=list)
    emotion: List[str] = Field(default_factory=list)
    mechanism: List[str] = Field(default_factory=list)
    philosophy: List[str] = Field(default_factory=list)


class TitleRequest(BaseModel):
    keywords: List[str] = Field(..., min_items=1, max_items=10, description="关键词列表")


class TitleResponse(BaseModel):
    quadrants: QuadrantTitles


class PipelineStartRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    author: str
    voice: str
    primary_intent: str
    secondary_intents: List[str] = Field(default_factory=list)
    description: str | None = None


class PipelineStartResponse(BaseModel):
    job_id: str


class JobStatusResponse(BaseModel):
    job_id: str
    stage: PipelineStage
    status: PipelineStatus
    progress: int
    message: str | None = None


class PipelineResultResponse(BaseModel):
    job_id: str
    title: str
    final_a: str
    final_b: str
    variants: Dict[str, Any] | None = None


class Author(BaseModel):
    name: str
    description: str | None = None
    voices: List[str] = Field(default_factory=list)


class AuthorsResponse(BaseModel):
    authors: List[Author]


class VoicesResponse(BaseModel):
    author: str
    voices: List[str]


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
        keywords = [item.strip() for item in request.keywords if item.strip()]
        if not keywords:
            raise HTTPException(status_code=422, detail="关键词不能为空")
        raw = await app.state.ds_client.generate_titles(keywords)
        quadrants = _normalize_title_response(raw)
        return TitleResponse(quadrants=QuadrantTitles(**quadrants))

    @app.post("/api/pipeline/start", response_model=PipelineStartResponse)
    async def start_pipeline(request: PipelineStartRequest) -> PipelineStartResponse:
        payload = _prepare_pipeline_payload(app.state.settings, request)
        state = await app.state.job_manager.start_job(payload)
        return PipelineStartResponse(job_id=state.job_id)

    @app.get("/api/pipeline/status", response_model=JobStatusResponse)
    async def get_status(job_id: str = Query(..., min_length=1)) -> JobStatusResponse:
        state = app.state.job_manager.get_job(job_id)
        if not state:
            raise HTTPException(status_code=404, detail="Job not found")
        return _serialize_job_state(state)

    @app.get("/api/pipeline/result", response_model=PipelineResultResponse)
    async def get_result(job_id: str = Query(..., min_length=1)) -> PipelineResultResponse:
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
        if not author.voices:
            author.voices = _load_default_voices(app.state.settings)
        authors.append(author)
        _write_authors(app.state.settings, authors)
        return AuthorsResponse(authors=authors)

    @app.get("/api/voices", response_model=VoicesResponse)
    async def list_voices(author: str = Query(..., min_length=1)) -> VoicesResponse:
        authors = _read_authors(app.state.settings)
        target = next((item for item in authors if item.name == author), None)
        voices = target.voices if target else _load_default_voices(app.state.settings)
        return VoicesResponse(author=author, voices=voices)


def _read_authors(settings: Settings) -> List[Author]:
    path = Path(settings.project_root) / "backend" / "data" / "authors.json"
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    authors: List[Author] = []
    for item in data.get("authors", []):
        author = Author(**item)
        if not author.voices:
            author.voices = _load_default_voices(settings)
        authors.append(author)
    return authors


def _write_authors(settings: Settings, authors: List[Author]) -> None:
    path = Path(settings.project_root) / "backend" / "data" / "authors.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"authors": [author.dict() for author in authors]}
    tmp_path = path.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(path)


def _load_default_voices(settings: Settings) -> List[str]:
    path = Path(settings.project_root) / "backend" / "charters" / "tones.json"
    if not path.exists():
        return []
    try:
        entries = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    voices: List[str] = []
    for entry in entries:
        name = entry.get("name")
        if isinstance(name, str):
            voices.append(name)
    return voices


def _normalize_title_response(raw: Dict[str, Any]) -> Dict[str, List[str]]:
    try:
        content = raw["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=502, detail="标题生成返回格式异常") from exc

    try:
        payload = json.loads(content)
    except json.JSONDecodeError as exc:  # pragma: no cover - model may返回非法 JSON
        raise HTTPException(status_code=502, detail="标题生成结果非 JSON 格式") from exc

    if not isinstance(payload, dict):  # pragma: no cover - defensive
        raise HTTPException(status_code=502, detail="标题生成结果结构异常")

    quadrants: Dict[str, List[str]] = {key: [] for key in ("behavior", "emotion", "mechanism", "philosophy")}
    mapping = {
        "behavior": {"behavior", "行为", "行动号召", "行动", "call_to_action"},
        "emotion": {"emotion", "情绪", "emotion_driven", "问题驱动"},
        "mechanism": {"mechanism", "机制", "mechanism_focus", "解决方案"},
        "philosophy": {"philosophy", "哲思", "insight", "市场洞察", "洞察"},
    }

    for key, values in payload.items():
        normalized = _match_quadrant_key(str(key), mapping)
        if not normalized:
            continue
        items = values if isinstance(values, list) else [values]
        for item in items:
            if not isinstance(item, str):
                continue
            text = item.strip()
            if text:
                quadrants[normalized].append(text)

    for key in quadrants:
        quadrants[key] = quadrants[key][:3]

    return quadrants


def _match_quadrant_key(key: str, mapping: Dict[str, set[str]]) -> str | None:
    lowered = key.strip().lower()
    for target, aliases in mapping.items():
        lowered_aliases = {alias.lower() for alias in aliases}
        lowered_aliases.add(target.lower())
        if lowered in lowered_aliases:
            return target
    return None


def _serialize_job_state(state: JobState) -> JobStatusResponse:
    stage = state.stage
    if state.status == PipelineStatus.ERROR:
        stage = PipelineStage.ERROR
    return JobStatusResponse(
        job_id=state.job_id,
        stage=stage,
        status=state.status,
        progress=state.progress,
        message=state.message,
    )


ALLOWED_INTENTS = {
    "troubleshooting",
    "mythbusting",
    "mechanism",
    "howto",
    "conversion",
    "decision",
    "editorial",
    "mobilization",
}


def _prepare_pipeline_payload(settings: Settings, request: PipelineStartRequest) -> Dict[str, Any]:
    authors = _read_authors(settings)
    author = next((item for item in authors if item.name == request.author), None)
    if not author:
        raise HTTPException(status_code=422, detail="作者不存在")
    voices = author.voices or _load_default_voices(settings)
    if request.voice not in voices:
        raise HTTPException(status_code=422, detail="所选语气不可用")
    if request.primary_intent not in ALLOWED_INTENTS:
        raise HTTPException(status_code=422, detail="主写作目的不在允许范围内")

    sanitized_secondary = []
    for intent in request.secondary_intents:
        if intent in ALLOWED_INTENTS and intent != request.primary_intent and intent not in sanitized_secondary:
            sanitized_secondary.append(intent)

    title = request.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="标题不能为空")

    payload = request.dict()
    payload["title"] = title
    payload["secondary_intents"] = sanitized_secondary
    payload["voice"] = request.voice
    payload["author"] = request.author
    return payload
