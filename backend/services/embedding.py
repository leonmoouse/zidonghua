from __future__ import annotations

import logging
from functools import lru_cache
from typing import Iterable, List

import numpy as np
from FlagEmbedding import BGEM3FlagModel

from backend.config import Settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model = self._load_model()
        self._dimension = self._probe_dimension()
        logger.info("Loaded BGE-M3 model", extra={"dimension": self._dimension})

    def _load_model(self) -> BGEM3FlagModel:
        logger.info("Loading BGE-M3 model", extra={"path": str(self._settings.models_path)})
        return BGEM3FlagModel(
            str(self._settings.models_path),
            use_fp16=True,
        )

    def _probe_dimension(self) -> int:
        vectors = self.embed(["probe"], ensure_min_batch=False)
        return len(vectors[0]) if vectors else 0

    @property
    def dimension(self) -> int:
        return self._dimension

    def embed(self, texts: Iterable[str], ensure_min_batch: bool = True) -> List[List[float]]:
        texts_list = list(texts)
        if not texts_list:
            return []
        original_len = len(texts_list)
        batch_size = original_len
        if ensure_min_batch and original_len < 8:
            padding = [texts_list[-1]] * (8 - original_len)
            texts_list.extend(padding)
            batch_size = 8
        encode_batch_size = max(8, len(texts_list)) if ensure_min_batch else max(1, batch_size)
        result = self._model.encode(
            texts_list,
            batch_size=encode_batch_size,
            return_dense=True,
            return_sparse=False,
        )

        dense_vectors = result.get("dense_vecs")
        if dense_vectors is None:
            raise RuntimeError("BGE-M3 encode() did not return dense vectors")

        dense_vectors = dense_vectors[:original_len]
        return [np.asarray(vec, dtype=np.float32).tolist() for vec in dense_vectors]


@lru_cache(maxsize=1)
def get_embedding_service(settings: Settings) -> EmbeddingService:
    return EmbeddingService(settings)
