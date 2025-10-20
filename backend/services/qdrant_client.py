from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List

from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import ScoredPoint

from backend.config import Settings

logger = logging.getLogger(__name__)


COLLECTION_RULES: Dict[str, int] = {
    "muban": 2,
    "yuqi": 1,
    "cross": 1,
    "daojia": 1,
}


@dataclass
class RetrievalResult:
    collection: str
    points: List[ScoredPoint]


class QdrantService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = AsyncQdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def search(self, collection: str, vector: List[float], limit: int) -> RetrievalResult:
        logger.info(
            "Searching Qdrant collection",
            extra={"collection": collection, "limit": limit},
        )
        points = await self._client.search(
            collection_name=collection,
            query_vector=vector,
            limit=limit,
            with_payload=True,
            score_threshold=None,
        )
        return RetrievalResult(collection=collection, points=points)

    async def retrieve_all(self, vector: List[float]) -> Dict[str, RetrievalResult]:
        results: Dict[str, RetrievalResult] = {}
        for collection, limit in COLLECTION_RULES.items():
            results[collection] = await self.search(collection, vector, limit)
        return results
