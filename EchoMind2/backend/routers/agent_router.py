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

from models.schemas import AskRequest, ConversationTurnRequest, FollowupRequest
from services import (
    game_manager,
    llm_interpreter,
    memory_manager,
    scenario_interpreter,
    simulation_templates,
    tutor_agent,
    voice_service,
)

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


def _read_parent_context(parent_job_id: str | None) -> dict[str, Any]:
    if not parent_job_id or os.path.basename(parent_job_id) != parent_job_id:
        return {}

    job_dir = os.path.join(JOBS_DIR, parent_job_id)
    context: dict[str, Any] = {}

    question_path = os.path.join(job_dir, "question.txt")
    if os.path.exists(question_path):
        with open(question_path, "r", encoding="utf-8") as f:
            context["original_question"] = f.read().strip()

    result_path = os.path.join(job_dir, "result.json")
    if os.path.exists(result_path):
        with open(result_path, "r", encoding="utf-8") as f:
            result = json.load(f)
        scenario = result.get("scenario", {})
        simulation = result.get("simulation", {})
        context["title"] = scenario.get("title") or simulation.get("title")
        context["sim_type"] = simulation.get("sim_type")
        context["concepts"] = scenario.get("concepts", [])

    return context


def _contextualize_followup(followup: str, parent_job_id: str | None) -> str:
    context = _read_parent_context(parent_job_id)
    if not context:
        return followup

    title = context.get("title") or "the previous simulation"
    sim_type = context.get("sim_type") or "the previous simulation type"
    original_question = context.get("original_question") or "not available"
    concepts = ", ".join(context.get("concepts", [])[:4])

    return (
        "Continue the same simulation context instead of starting over. "
        f"Previous simulation title: {title}. "
        f"Previous simulation type: {sim_type}. "
        f"Original student question: {original_question}. "
        f"Concepts already in play: {concepts or 'not listed'}. "
        f"New student follow-up: {followup}. "
        "If the previous simulation was a roller coaster, keep the dedicated roller-coaster track renderer and update only the requested condition."
    )


async def _run_pipeline(
    question: str,
    session_id: str,
    user_id: str,
    student_level: str,
    voice_id: str | None = None,
    source: str = "ask",
    parent_job_id: str | None = None,
    display_question: str | None = None,
) -> dict[str, Any]:
    job_id = f"job_{uuid.uuid4().hex[:10]}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    student_context = await memory_manager.get_student_context(user_id)
    if student_level:
        student_context["student_level"] = student_level

    llm_result = await llm_interpreter.interpret_with_llm(question, student_context)
    stored_question = display_question or question

    if llm_result and llm_result.get("use_known") is False:
        scenario = llm_interpreter.build_dynamic_scenario(llm_result, question)
        scenario["student_question"] = stored_question
        sim_payload = llm_interpreter.build_dynamic_simulation_payload(scenario)
        teaching = llm_interpreter.build_dynamic_teaching(scenario, sim_payload, student_context)
    elif llm_result and llm_result.get("use_known") is True:
        scenario = scenario_interpreter.interpret_question(question, student_context)
        scenario["student_question"] = stored_question
        if llm_result.get("domain"):
            scenario["domain"] = llm_result["domain"]
        sim_payload = simulation_templates.build_simulation_payload(scenario)
        teaching = tutor_agent.build_teaching_result(scenario, sim_payload, student_context)
    else:
        scenario = scenario_interpreter.interpret_question(question, student_context)
        scenario["student_question"] = stored_question
        sim_payload = simulation_templates.build_simulation_payload(scenario)
        teaching = tutor_agent.build_teaching_result(scenario, sim_payload, student_context)

    voice_pref = student_context.get("presentation_preferences", {}).get("voice_style", "friendly_excited")
    chosen_voice = voice_id or student_context.get("voice_id")
    audio_url = await voice_service.synthesize_voice(
        teaching["transcript"], job_id, voice_pref, chosen_voice
    )
    teaching["audio_url"] = audio_url
    teaching["spoken_audio_url"] = audio_url

    if sim_payload.get("journey_waypoints"):
        sim_payload["journey_waypoints"] = await voice_service.synthesize_waypoint_voices(
            sim_payload["journey_waypoints"], job_id, voice_pref, chosen_voice
        )

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

    prediction = game_manager.build_prediction(result)
    if prediction:
        result.update(prediction)

    with open(os.path.join(job_dir, "question.txt"), "w", encoding="utf-8") as f:
        f.write(stored_question)
    _write_json(os.path.join(job_dir, "scenario.json"), scenario)
    _write_json(os.path.join(job_dir, "simulation_payload.json"), simulation)
    _write_json(os.path.join(job_dir, "teaching.json"), teaching)
    _write_json(os.path.join(job_dir, "result.json"), result)

    await memory_manager.store_simulation_memory(user_id, scenario, teaching)
    await memory_manager.store_conversation_turn(
        user_id,
        job_id,
        session_id,
        "user",
        stored_question,
        {"source": source, "parent_job_id": parent_job_id},
    )

    try:
        if source == "followup":
            await game_manager.award_xp(user_id, "ask_followup", job_id=job_id)
        else:
            await game_manager.award_xp(user_id, "ask_question", job_id=job_id)
        await game_manager.award_xp(user_id, "run_simulation", job_id=job_id)
        game_state = await game_manager.evaluate_result_rewards(user_id, job_id, scenario, teaching)
        result["game_state"] = game_state
        _write_json(os.path.join(job_dir, "result.json"), result)
    except Exception:
        result["game_state"] = await game_manager.get_game_state(user_id)

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
    contextual_followup = _contextualize_followup(req.followup, req.job_id)
    return await _run_pipeline(
        contextual_followup,
        req.session_id,
        req.user_id,
        "",
        req.voice_id,
        source="followup",
        parent_job_id=req.job_id,
        display_question=req.followup,
    )


@router.post("/agent/conversation")
async def store_conversation_turn(req: ConversationTurnRequest) -> dict[str, str]:
    await memory_manager.store_conversation_turn(
        req.user_id, req.job_id, req.session_id, req.role, req.text, req.metadata
    )
    return {"status": "stored"}


@router.get("/voices")
async def get_voices() -> list[dict[str, Any]]:
    return await voice_service.list_voices()
