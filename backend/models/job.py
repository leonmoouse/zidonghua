from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional


class JobStage(str, enum.Enum):
    CREATED = "CREATED"
    RETRIEVING = "RETRIEVING"
    TEMPLATE = "TEMPLATE"
    TONE = "TONE"
    EVIDENCE = "EVIDENCE"
    WRITING = "WRITING"
    DONE = "DONE"
    ERROR = "ERROR"


@dataclass
class JobState:
    job_id: str
    status: JobStage = JobStage.CREATED
    message: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    payload: Dict[str, Any] = field(default_factory=dict)
    result: Optional[Dict[str, Any]] = None

    def update(self, status: JobStage, message: Optional[str] = None, **payload: Any) -> None:
        self.status = status
        self.message = message
        if payload:
            self.payload.update(payload)
        self.updated_at = datetime.utcnow()

    def set_result(self, result: Dict[str, Any]) -> None:
        self.result = result
        self.update(JobStage.DONE)

    def set_error(self, message: str) -> None:
        self.update(JobStage.ERROR, message=message)
