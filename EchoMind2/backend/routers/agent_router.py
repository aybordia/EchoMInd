"""Agent job system.

For the MVP, jobs run synchronously: a single request walks the full
INTERPRET -> PLAN -> BUILD -> SIMULATE -> TEACH pipeline and returns a
complete result. `stages` is returned so the frontend can animate an
agent timeline even though the work already happened.
"""

from __future__ import annotations

import json
import os
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from models.schemas import AskRequest, FollowupRequest
from services import memory_manager, scenario_interpreter, simulation_templates, tutor_agent, voice_service

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOBS_DIR = os.path.join(BASE_DIR, "static", "jobs")

AGENT_STAGES = [
    "Listening...",
    "Understanding your question...",
    "Choosing the physics model...",
    "Building the scene...",
    "Running the simulation...",
    "Rendering the explanation...",
    "Preparing the voiceover...",
    "Done.",
]


def _write_json(path: str, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


async def _run_pipeline(
    question: str,
    session_id: str,
    user_id: str,
    student_level: str,
    voice_id: str | None = None,
) -> dict[str, Any]:
    job_id = f"job_{uuid.uuid4().hex[:10]}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    student_context = await memory_manager.get_student_context(user_id)
    if student_level:
        student_context["student_level"] = student_level

    scenario = scenario_interpreter.interpret_question(question, student_context)
    sim_payload = simulation_templates.build_simulation_payload(scenario)
    teaching = tutor_agent.build_teaching_result(scenario, sim_payload, student_context)

    voice_pref = student_context.get("presentation_preferences", {}).get("voice_style", "friendly_excited")
    chosen_voice = voice_id or student_context.get("voice_id")
    audio_url = await voice_service.synthesize_voice(
        teaching["transcript"], job_id, voice_pref, chosen_voice
    )
    teaching["audio_url"] = audio_url
    teaching["spoken_audio_url"] = audio_url

    # Per-beat narration so the guided journey can pause and speak each step.
    beats = teaching.get("beats", [])
    beat_audio = await voice_service.synthesize_beats(beats, job_id, voice_pref, chosen_voice)
    for beat in beats:
        beat["audio_url"] = beat_audio.get(beat.get("id"))

    simulation = {**sim_payload, "viewer_url": f"/sim/{job_id}"}

    fallback_used = bool(
        scenario.get("assumptions")
        and scenario["assumptions"][0].startswith("EchoMind didn't find")
    )

    result = {
        "job_id": job_id,
        "status": "complete",
        "message": "Done! Here's what I built.",
        "stages": AGENT_STAGES,
        "scenario": scenario,
        "simulation": simulation,
        "teaching": teaching,
        "fallback_used": fallback_used,
    }

    with open(os.path.join(job_dir, "question.txt"), "w", encoding="utf-8") as f:
        f.write(question)
    _write_json(os.path.join(job_dir, "scenario.json"), scenario)
    _write_json(os.path.join(job_dir, "simulation_payload.json"), simulation)
    _write_json(os.path.join(job_dir, "teaching.json"), teaching)
    _write_json(os.path.join(job_dir, "result.json"), result)

    await memory_manager.store_simulation_memory(user_id, scenario, teaching)

    return result


@router.post("/agent/ask")
async def ask_agent(req: AskRequest) -> dict[str, Any]:
    return await _run_pipeline(
        req.question, req.session_id, req.user_id, req.student_level, req.voice_id
    )


@router.get("/agent/result/{job_id}")
async def get_agent_result(job_id: str) -> dict[str, Any]:
    path = os.path.join(JOBS_DIR, job_id, "result.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Job not found")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.post("/agent/followup")
async def followup_agent(req: FollowupRequest) -> dict[str, Any]:
    return await _run_pipeline(req.followup, req.session_id, req.user_id, "", req.voice_id)


@router.get("/voices")
async def get_voices() -> list[dict[str, Any]]:
    """Selectable voices for the student's picker (proxies ElevenLabs)."""
    return await voice_service.list_voices()
