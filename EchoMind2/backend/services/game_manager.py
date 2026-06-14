"""Curiosity XP, concept mastery, badges, and lightweight prediction checks.

The game layer is intentionally metadata-only. It never changes simulation
geometry; it records progress around the simulation so the core viewer stays
stable.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from models.schemas import PredictionSubmitRequest
from services import memory_manager

XP_AMOUNTS = {
    "ask_question": 10,
    "run_simulation": 20,
    "ask_followup": 15,
    "make_prediction": 20,
    "correct_prediction": 30,
    "rate_explanation": 5,
    "written_feedback": 10,
    "explore_new_concept": 25,
    "correct_misconception": 50,
}

BADGES = {
    "gravity_explorer": {
        "id": "gravity_explorer",
        "name": "Gravity Explorer",
        "description": "Compared motion under different gravitational fields.",
    },
    "prediction_pro": {
        "id": "prediction_pro",
        "name": "Prediction Pro",
        "description": "Made a prediction before seeing the simulation.",
    },
    "mass_myth_busted": {
        "id": "mass_myth_busted",
        "name": "Mass Myth Busted",
        "description": "Learned why mass does not change free-fall acceleration in vacuum.",
    },
    "molecule_matchmaker": {
        "id": "molecule_matchmaker",
        "name": "Molecule Matchmaker",
        "description": "Explored molecular attraction and bonding.",
    },
    "feedback_scientist": {
        "id": "feedback_scientist",
        "name": "Feedback Scientist",
        "description": "Helped EchoMind adapt its teaching style.",
    },
}

TOOL_RULES = {
    "gravity_slider": {
        "id": "gravity_slider",
        "name": "Gravity Slider",
        "description": "Change gravity in mechanics simulations.",
        "requirements": {"Gravity": 50},
    },
    "force_arrows": {
        "id": "force_arrows",
        "name": "Force Arrow Overlay",
        "description": "Reveal force vectors in motion simulations.",
        "requirements": {"Normal Force": 25, "Friction": 25},
    },
    "charge_labels": {
        "id": "charge_labels",
        "name": "Charge Labels",
        "description": "Show partial charges on molecules.",
        "requirements": {"Charge Attraction": 25},
    },
    "slow_motion_camera": {
        "id": "slow_motion_camera",
        "name": "Slow Motion Camera",
        "description": "Replay key simulation moments in slow motion.",
        "requirements": {"Scientific Prediction": 50},
    },
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def calculate_level(xp_total: int) -> int:
    return int((max(0, xp_total) / 100) ** 0.5) + 1


def _default_game_state(user_id: str) -> dict[str, Any]:
    return {
        "user_id": user_id,
        "xp_total": 0,
        "level": 1,
        "concept_mastery": {},
        "badges": [],
        "unlocked_tools": [],
        "prediction_stats": {"attempts": 0, "correct": 0},
        "xp_events": [],
    }


def _load_memory(user_id: str) -> dict[str, Any]:
    return memory_manager._load(user_id)  # shared structured memory file


def _save_memory(user_id: str, memory: dict[str, Any]) -> None:
    memory_manager._save(user_id, memory)


def _ensure_game_state(memory: dict[str, Any], user_id: str) -> dict[str, Any]:
    state = _default_game_state(user_id)
    state.update(memory.get("game_state") or {})
    state["user_id"] = user_id
    state["level"] = calculate_level(int(state.get("xp_total", 0)))
    memory["game_state"] = state
    return state


async def get_game_state(user_id: str) -> dict[str, Any]:
    memory = _load_memory(user_id)
    state = _ensure_game_state(memory, user_id)
    _save_memory(user_id, memory)
    return state


async def award_xp(
    user_id: str,
    event_type: str,
    amount: int | None = None,
    job_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    memory = _load_memory(user_id)
    state = _ensure_game_state(memory, user_id)
    points = int(amount if amount is not None else XP_AMOUNTS.get(event_type, 0))
    if points <= 0:
        return state

    event = {
        "type": event_type,
        "amount": points,
        "job_id": job_id,
        "metadata": metadata or {},
        "timestamp": _now(),
    }
    state["xp_total"] = int(state.get("xp_total", 0)) + points
    state["level"] = calculate_level(state["xp_total"])
    state["xp_events"] = (state.get("xp_events", []) + [event])[-60:]
    _save_memory(user_id, memory)

    memory_manager._backboard_write(
        user_id,
        f"Game event: awarded {points} XP for {event_type}. Job: {job_id or 'none'}.",
    )
    return state


def _normalize_concept(concept: str) -> str:
    low = concept.lower()
    if "gravity" in low or "gravitational" in low:
        return "Gravity"
    if "friction" in low:
        return "Friction"
    if "normal" in low:
        return "Normal Force"
    if "air" in low:
        return "Air Resistance"
    if "momentum" in low or "collision" in low:
        return "Momentum"
    if "molecular" in low or "bond" in low or "molecule" in low:
        return "Molecular Bonds"
    if "charge" in low or "electrostatic" in low:
        return "Charge Attraction"
    if "energy" in low or "kinetic" in low or "potential" in low:
        return "Energy"
    if "digital" in low or "twin" in low:
        return "Digital Twins"
    if "prediction" in low:
        return "Scientific Prediction"
    return concept.strip().title()


async def update_concept_mastery(user_id: str, concepts: list[str], job_id: str) -> dict[str, Any]:
    memory = _load_memory(user_id)
    state = _ensure_game_state(memory, user_id)
    mastery = state.setdefault("concept_mastery", {})
    new_concepts = 0

    for raw in concepts:
        concept = _normalize_concept(str(raw))
        if not concept:
            continue
        current = mastery.get(concept, {"status": "unseen", "progress": 0, "evidence": []})
        before = int(current.get("progress", 0))
        progress = min(100, before + (25 if before else 35))
        if progress >= 100:
            status = "mastered"
        elif progress >= 75:
            status = "applied"
        elif progress >= 50:
            status = "explored"
        else:
            status = "introduced"
        evidence = list(dict.fromkeys([*current.get("evidence", []), job_id]))[-5:]
        mastery[concept] = {"status": status, "progress": progress, "evidence": evidence}
        if before == 0:
            new_concepts += 1

    state["unlocked_tools"] = _evaluate_unlocks(state)
    _save_memory(user_id, memory)

    if new_concepts:
        await award_xp(user_id, "explore_new_concept", XP_AMOUNTS["explore_new_concept"], job_id)
    return state


def _evaluate_unlocks(state: dict[str, Any]) -> list[dict[str, Any]]:
    mastery = state.get("concept_mastery", {})
    unlocked: list[dict[str, Any]] = []
    for rule in TOOL_RULES.values():
        if all(int(mastery.get(concept, {}).get("progress", 0)) >= need for concept, need in rule["requirements"].items()):
            unlocked.append({k: v for k, v in rule.items() if k != "requirements"})
    return unlocked


async def award_badge(user_id: str, badge_id: str, job_id: str | None = None) -> dict[str, Any]:
    badge = BADGES.get(badge_id)
    if not badge:
        return await get_game_state(user_id)

    memory = _load_memory(user_id)
    state = _ensure_game_state(memory, user_id)
    badges = state.setdefault("badges", [])
    if any(existing.get("id") == badge_id for existing in badges):
        return state

    earned = {**badge, "earned_at": _now(), "job_id": job_id}
    badges.append(earned)
    _save_memory(user_id, memory)
    memory_manager._backboard_write(
        user_id,
        f"Student earned badge '{badge['name']}'. {badge['description']}",
    )
    return state


async def evaluate_result_rewards(
    user_id: str, job_id: str, scenario: dict[str, Any], teaching: dict[str, Any]
) -> dict[str, Any]:
    state = await update_concept_mastery(user_id, scenario.get("concepts", []), job_id)
    concepts_text = " ".join(str(c).lower() for c in scenario.get("concepts", []))
    domain = str(scenario.get("domain", "")).lower()
    if "gravity" in concepts_text or domain in {"planet_jump", "moon_drop"}:
        state = await award_badge(user_id, "gravity_explorer", job_id)
    if "molecule" in concepts_text or "bond" in concepts_text:
        state = await award_badge(user_id, "molecule_matchmaker", job_id)
    if "mass" in " ".join(teaching.get("misconceptions_corrected", [])).lower():
        await award_xp(user_id, "correct_misconception", XP_AMOUNTS["correct_misconception"], job_id)
        state = await award_badge(user_id, "mass_myth_busted", job_id)
    return state


def build_prediction(result: dict[str, Any]) -> dict[str, Any] | None:
    scenario = result.get("scenario", {})
    simulation = result.get("simulation", {})
    domain = str(scenario.get("domain", simulation.get("type", ""))).lower()
    concepts = " ".join(str(c).lower() for c in scenario.get("concepts", []))
    title = str(scenario.get("title", "")).lower()

    if domain == "planet_jump":
        return {
            "prediction_prompt": "Before we run it, where do you think the jump will be highest?",
            "prediction_options": ["Moon", "Earth", "Jupiter", "Neptune"],
            "correct_prediction": "Moon",
            "prediction_explanation": "The Moon has much lower gravity, so the same launch speed creates a higher jump.",
        }
    if domain == "moon_drop":
        return {
            "prediction_prompt": "On the Moon, which object lands first?",
            "prediction_options": ["Bowling ball", "Feather", "They land together", "Neither falls"],
            "correct_prediction": "They land together",
            "prediction_explanation": "With no air resistance, both objects accelerate at the same rate.",
        }
    if domain == "molecule_interaction" or "molecule" in concepts:
        return {
            "prediction_prompt": "What do you think attracts two water molecules to each other?",
            "prediction_options": ["Partial charges", "Gravity", "Air pressure", "Magnetism"],
            "correct_prediction": "Partial charges",
            "prediction_explanation": "Water molecules are polar, so slightly positive and negative regions attract.",
        }
    if domain == "ramp_box":
        return {
            "prediction_prompt": "Which force mostly pulls the box down the ramp?",
            "prediction_options": ["Gravity component along the ramp", "Normal force", "Friction", "Air pressure"],
            "correct_prediction": "Gravity component along the ramp",
            "prediction_explanation": "Gravity points downward, and part of it acts along the ramp to speed the box up.",
        }
    if "energy" in concepts or "roller coaster" in title:
        return {
            "prediction_prompt": "Where will the coaster cart usually move fastest?",
            "prediction_options": ["At the lowest point", "At the highest hill", "While climbing", "At rest"],
            "correct_prediction": "At the lowest point",
            "prediction_explanation": "Lower height means more gravitational potential energy has converted into kinetic energy.",
        }
    return None


async def submit_prediction(req: PredictionSubmitRequest, job_result: dict[str, Any]) -> dict[str, Any]:
    prediction = build_prediction(job_result)
    if not prediction:
        return {"correct": False, "message": "No prediction is available for this simulation.", "game_state": await get_game_state(req.user_id)}

    selected = req.selected_answer.strip()
    correct_answer = prediction["correct_prediction"]
    correct = selected.lower() == correct_answer.lower()

    await award_xp(req.user_id, "make_prediction", XP_AMOUNTS["make_prediction"], req.job_id, {"selected": selected})
    if correct:
        await award_xp(req.user_id, "correct_prediction", XP_AMOUNTS["correct_prediction"], req.job_id)
    state = await award_badge(req.user_id, "prediction_pro", req.job_id)
    await update_concept_mastery(req.user_id, ["Scientific Prediction"], req.job_id)

    memory = _load_memory(req.user_id)
    state = _ensure_game_state(memory, req.user_id)
    stats = state.setdefault("prediction_stats", {"attempts": 0, "correct": 0})
    stats["attempts"] = int(stats.get("attempts", 0)) + 1
    stats["correct"] = int(stats.get("correct", 0)) + (1 if correct else 0)
    stats["last_prediction"] = {
        "job_id": req.job_id,
        "selected": selected,
        "correct_answer": correct_answer,
        "correct": correct,
        "timestamp": _now(),
    }
    _save_memory(req.user_id, memory)

    memory_manager._backboard_write(
        req.user_id,
        (
            f"Student predicted '{selected}' for job {req.job_id}. Correct answer: "
            f"'{correct_answer}'. Correct: {correct}. {prediction['prediction_explanation']}"
        ),
    )

    return {
        "correct": correct,
        "correct_answer": correct_answer,
        "explanation": prediction["prediction_explanation"],
        "game_state": state,
    }
