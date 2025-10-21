from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from backend.models.job import JobState, PipelineStage
from backend.services.ds_client import DSClient
from backend.services.embedding import EmbeddingService
from backend.services.qdrant_client import QdrantService

logger = logging.getLogger(__name__)


class PipelineRunner:
    def __init__(
        self,
        ds_client: DSClient,
        embedding_service: EmbeddingService,
        qdrant_service: QdrantService,
    ) -> None:
        self._ds_client = ds_client
        self._embedding = embedding_service
        self._qdrant = qdrant_service

    async def __call__(
        self,
        job_id: str,
        state: JobState,
        payload: Dict[str, Any],
        output_dir: Path,
    ) -> Dict[str, Any]:
        title: str = payload["title"]
        description: str = payload.get("description", "")
        texts_for_embedding = [title, description]
        state.advance(
            PipelineStage.P1,
            progress=20,
            message="检索模板与语气",
            payload={"title": title},
        )
        embedding_vector = self._embedding.embed(["\n".join(texts_for_embedding)])[0]

        retrievals = await self._qdrant.retrieve_all(embedding_vector)
        state.advance(
            PipelineStage.P2,
            progress=40,
            message="完成检索，准备生成初稿",
            payload={"retrievals": {k: len(v.points) for k, v in retrievals.items()}},
        )
        template_payloads = _collect_payloads(retrievals, "muban")
        tone_payloads = _collect_payloads(retrievals, "yuqi")
        evidence_payloads = _collect_payloads(retrievals, "cross") + _collect_payloads(retrievals, "daojia")

        drafts = await self._run_parallel_flows(
            title,
            payload.get("voice"),
            template_payloads,
            tone_payloads,
            evidence_payloads,
            state,
        )
        state.advance(PipelineStage.P4, progress=85, message="融合证据，生成最终文案")

        job_directory = output_dir / job_id
        job_directory.mkdir(parents=True, exist_ok=True)
        final_a = drafts["A"]["final"]
        final_b = drafts["B"]["final"]
        _write_text(job_directory / "final_A.md", final_a)
        _write_text(job_directory / "final_B.md", final_b)
        _write_text(
            job_directory / "result.json",
            json.dumps(
                {
                    "job_id": job_id,
                    "title": title,
                    "final_a": final_a,
                    "final_b": final_b,
                    "variants": drafts,
                },
                ensure_ascii=False,
                indent=2,
            ),
        )
        return {
            "job_id": job_id,
            "title": title,
            "final_a": final_a,
            "final_b": final_b,
            "variants": drafts,
        }

    async def _run_parallel_flows(
        self,
        title: str,
        selected_voice: str | None,
        templates: List[Dict[str, Any]],
        tones: List[Dict[str, Any]],
        evidences: List[Dict[str, Any]],
        state: JobState,
    ) -> Dict[str, Any]:
        tone_candidates = _prioritize_tones(tones, selected_voice)
        flows = []
        for index in range(2):
            template = templates[index % len(templates)] if templates else {"content": ""}
            tone = tone_candidates[index % len(tone_candidates)] if tone_candidates else {"guideline": ""}
            evidence = evidences[index % len(evidences)] if evidences else {"content": ""}
            flows.append(
                self._run_single_flow(
                    flow_name="A" if index == 0 else "B",
                    title=title,
                    selected_voice=selected_voice,
                    template=template,
                    tone=tone,
                    evidence=evidence,
                    state=state,
                )
            )
        flow_results = await asyncio.gather(*flows)
        return {result["flow_name"]: result for result in flow_results}

    async def _run_single_flow(
        self,
        flow_name: str,
        title: str,
        selected_voice: str | None,
        template: Dict[str, Any],
        tone: Dict[str, Any],
        evidence: Dict[str, Any],
        state: JobState,
    ) -> Dict[str, Any]:
        state.advance(
            PipelineStage.P2,
            progress=50,
            message="生成初稿",
            payload={"flow": flow_name},
        )
        draft = await self._call_stage(
            stage="P2",
            system_prompt="你是中文资深文案，依据模板句式快速产出段落。",
            user_prompt=_build_template_prompt(title, template["content"]),
        )
        tone_guideline = _match_tone_guideline(tone, selected_voice)
        state.advance(
            PipelineStage.P3,
            progress=65,
            message="语气调校", 
            payload={"flow": flow_name, "voice": selected_voice},
        )
        middle = await self._call_stage(
            stage="P3",
            system_prompt="你是文案风格调校器，严格套入给定语气要素。",
            user_prompt=_build_tone_prompt(title, tone_guideline, draft),
        )
        state.advance(
            PipelineStage.P4,
            progress=80,
            message="融合证据",
            payload={"flow": flow_name},
        )
        final_text = await self._call_stage(
            stage="P4",
            system_prompt="你是事实/论证增强器，请在不改变大意的情况下把证据融入文案，增强可信度。",
            user_prompt=_build_evidence_prompt(title, evidence.get("content", ""), middle),
        )
        return {
            "flow_name": flow_name,
            "template": template,
            "tone": {**tone, "selected": selected_voice},
            "evidence": evidence,
            "draft": draft,
            "middle": middle,
            "final": final_text,
        }

    async def _call_stage(self, stage: str, system_prompt: str, user_prompt: str) -> str:
        response = await self._ds_client.chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=1024,
        )
        return response["choices"][0]["message"]["content"].strip()


def _write_text(path: Path, content: str) -> None:
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_text(content, encoding="utf-8")
    tmp_path.replace(path)


def _collect_payloads(retrievals: Dict[str, Any], key: str) -> List[Dict[str, Any]]:
    result: List[Dict[str, Any]] = []
    value = retrievals.get(key)
    if not value:
        return result
    for point in value.points:
        payload = point.payload or {}
        payload["score"] = point.score
        result.append(payload)
    return result


def _prioritize_tones(tones: List[Dict[str, Any]], selected_voice: str | None) -> List[Dict[str, Any]]:
    if not tones:
        return []
    if not selected_voice:
        return tones
    preferred: List[Dict[str, Any]] = []
    fallback: List[Dict[str, Any]] = []
    for tone in tones:
        name = str(tone.get("name") or tone.get("title") or "").strip()
        if name and name == selected_voice:
            preferred.append(tone)
        else:
            fallback.append(tone)
    return preferred + fallback if preferred else tones


def _match_tone_guideline(tone: Dict[str, Any], selected_voice: str | None) -> str:
    guideline = str(tone.get("guideline") or tone.get("content") or "").strip()
    if selected_voice:
        name = str(tone.get("name") or tone.get("title") or "").strip()
        if not guideline and name and name == selected_voice:
            guideline = f"语气要求：保持{selected_voice}的表达特征，兼顾专业度与可读性。"
        elif not guideline and not name:
            guideline = f"语气要求：保持{selected_voice}风格。"
    return guideline or "保持真诚、清晰的中文表达。"


def _build_template_prompt(title: str, template_text: str) -> str:
    return (
        f"题目：《{title}》\n"
        "请根据给定模板生成《初级文案》，要求：\n"
        f"模板内容：{template_text}\n"
        "- 中文输出，篇幅控制在 120-180 字之间；\n"
        "- 保持结构与模板一致。"
    )


def _build_tone_prompt(title: str, tone_guideline: str, draft: str) -> str:
    return (
        f"题目：《{title}》\n"
        "以下是《初级文案》，请严格依据语气指引生成《中级文案》。\n"
        f"语气指引：{tone_guideline}\n"
        f"《初级文案》：{draft}"
    )


def _build_evidence_prompt(title: str, evidence_text: str, middle: str) -> str:
    return (
        f"题目：《{title}》\n"
        "以下是《中级文案》与证据材料，请整合证据输出《最终文案》，保证叙事连贯。\n"
        f"证据：{evidence_text}\n"
        f"《中级文案》：{middle}"
    )
