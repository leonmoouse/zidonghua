from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional


class PipelineStage(str, enum.Enum):
    INIT = "INIT"
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"
    DONE = "DONE"
    ERROR = "ERROR"


class PipelineStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    DONE = "DONE"
    ERROR = "ERROR"


@dataclass
class JobState:
    job_id: str
    stage: PipelineStage = PipelineStage.INIT
    status: PipelineStatus = PipelineStatus.PENDING
    progress: int = 0
    message: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    payload: Dict[str, Any] = field(default_factory=dict)
    result: Optional[Dict[str, Any]] = None

    def mark_running(self, payload: Optional[Dict[str, Any]] = None) -> None:
        self.status = PipelineStatus.RUNNING
        self.stage = PipelineStage.INIT
        self.progress = max(self.progress, 5)
        self.message = None
        if payload:
            self.payload.update(payload)
        self._touch()

    def advance(
        self,
        stage: PipelineStage,
        progress: int,
        message: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.stage = stage
        # 仅在未完成的情况下更新状态
        if self.status not in (PipelineStatus.DONE, PipelineStatus.ERROR):
            self.status = PipelineStatus.RUNNING
        self.progress = max(0, min(100, progress))
        self.message = message
        if payload:
            self.payload.update(payload)
        self._touch()

    def complete(self, result: Dict[str, Any]) -> None:
        self.result = result
        self.stage = PipelineStage.DONE
        self.status = PipelineStatus.DONE
        self.progress = 100
        self.message = None
        self._touch()

    def fail(self, message: str) -> None:
        self.stage = PipelineStage.ERROR
        self.status = PipelineStatus.ERROR
        self.message = message
        self.progress = max(self.progress, 5)
        self._touch()

    def _touch(self) -> None:
        self.updated_at = datetime.utcnow()
