from __future__ import annotations

import asyncio
import json
import logging
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.models.job import JobState

logger = logging.getLogger(__name__)


class JobManager:
    def __init__(
        self,
        output_dir: Path,
        runner,
        max_concurrency: int = 8,
    ) -> None:
        self._output_dir = output_dir
        self._runner = runner
        self._jobs: Dict[str, JobState] = {}
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self._lock = asyncio.Lock()

    def list_jobs(self) -> List[JobState]:
        return list(self._jobs.values())

    def get_job(self, job_id: str) -> Optional[JobState]:
        return self._jobs.get(job_id)

    async def start_job(self, payload: Dict[str, Any]) -> JobState:
        job_id = str(uuid.uuid4())
        state = JobState(job_id=job_id, payload=payload)
        async with self._lock:
            self._jobs[job_id] = state
        asyncio.create_task(self._execute(job_id, payload))
        return state

    async def _execute(self, job_id: str, payload: Dict[str, Any]) -> None:
        state = self._jobs[job_id]
        try:
            async with self._semaphore:
                logger.info("Job started", extra={"job_id": job_id})
                result = await self._runner(job_id, state, payload, self._output_dir)
                state.set_result(result)
        except Exception as exc:  # pragma: no cover - runtime safety
            logger.exception("Job failed", extra={"job_id": job_id})
            state.set_error(str(exc))

    def ensure_output_dir(self, job_id: str) -> Path:
        path = self._output_dir / job_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    @staticmethod
    def write_text_file(path: Path, content: str) -> None:
        tmp_path = path.with_suffix(path.suffix + ".tmp")
        tmp_path.write_text(content, encoding="utf-8")
        tmp_path.replace(path)

    def write_result_files(self, job_id: str, final_a: str, final_b: str) -> None:
        directory = self.ensure_output_dir(job_id)
        self.write_text_file(directory / "final_A.md", final_a)
        self.write_text_file(directory / "final_B.md", final_b)

    def write_json(self, job_id: str, filename: str, data: Dict[str, Any]) -> None:
        directory = self.ensure_output_dir(job_id)
        tmp_path = directory / f"{filename}.json.tmp"
        tmp_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp_path.replace(directory / f"{filename}.json")
