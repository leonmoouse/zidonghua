from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, List

import httpx

from backend.config import Settings

logger = logging.getLogger(__name__)


class DSClient:
    """Client wrapper for the downstream LLM service."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.ds_base_url,
            headers={
                "Authorization": f"Bearer {settings.ds_api_key}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(60.0, connect=10.0),
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def chat_completion(self, messages: Iterable[Dict[str, Any]], **params: Any) -> Dict[str, Any]:
        payload = {
            "model": self._settings.ds_model,
            "messages": list(messages),
            **params,
        }
        logger.info("Calling DS chat completion", extra={"model": self._settings.ds_model})
        response = await self._client.post("/chat/completions", json=payload)
        response.raise_for_status()
        return response.json()

    async def generate_titles(self, keywords: List[str]) -> Dict[str, Any]:
        user_prompt = self._build_titles_prompt(keywords)
        messages = [
            {
                "role": "system",
                "content": "你是资深中文标题编辑，注意精炼有冲击力，只返回JSON，不要解释。",
            },
            {"role": "user", "content": user_prompt},
        ]
        logger.info("Generating P0 titles", extra={"keywords": keywords})
        return await self.chat_completion(
            messages,
            temperature=0.7,
            max_tokens=800,
            response_format={"type": "json_object"},
        )

    @staticmethod
    def _build_titles_prompt(keywords: List[str]) -> str:
        keyword_text = "、".join(keywords)
        return (
            "请根据以下关键词生成四个视角的标题，每个视角提供 3 条标题，以 JSON 格式返回。\n"
            "关键词："
            f"{keyword_text}\n"
            "返回 JSON 结构：{\n"
            "  \"市场洞察\": [\"...\"],\n"
            "  \"问题驱动\": [\"...\"],\n"
            "  \"解决方案\": [\"...\"],\n"
            "  \"行动号召\": [\"...\"]\n"
            "}\n"
            "要求：所有标题必须为中文，28 字以内，避免重复或带有解释性文字。"
        )
