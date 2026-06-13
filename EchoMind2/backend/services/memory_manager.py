"""Adaptive memory layer.

Backboard answers one question over time: "What is the best way to
teach this specific student?" When `BACKBOARD_API_KEY` is configured we
mirror narrative memory writes to Backboard so that story stays true.
The local JSON file under `backend/data/memory/{user_id}.json` is always
the canonical, structured source of truth so the product never breaks
when Backboard is unavailable.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

import requests

from models.schemas import FeedbackRequest, OnboardingRequest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEMORY_DIR = os.path.join(BASE_DIR, "data", "memory")

BACKBOARD_API_KEY = os.getenv("BACKBOARD_API_KEY", "").strip()
BACKBOARD_BASE_URL = os.getenv("BACKBOARD_BASE_URL", "https://api.backboard.io/v1").strip()

LEARNING_STYLE_LABELS = {
    "visual_animations": "visual animations",
    "equations": "equations and formulas",
    "stories_analogies": "stories and analogies",
    "real_world_examples": "real-world examples",
    "hands_on_experiments": "hands-on experiments",
}


def _ensure_dir() -> None:
    os.makedirs(MEMORY_DIR, exist_ok=True)


def _path(user_id: str) -> str:
    safe_id = "".join(c for c in user_id if c.isalnum() or c in ("-", "_")) or "anonymous"
    return os.path.join(MEMORY_DIR, f"{safe_id}.json")


def _default_memory(user_id: str) -> dict[str, Any]:
    return {
        "user_id": user_id,
        "interests": [],
        "concepts_seen": [],
        "misconceptions_corrected": [],
        "student_level": "middle_school",
        "preferred_explanation_level": "middle_school",
        "favorite_visual_style": "cinematic_with_labels",
        "learning_style": [],
        "explanation_depth": "quick_then_deeper",
        "voice_id": None,
        "voice_label": None,
        "presentation_preferences": {
            "math_level": "light_equations",
            "pace": "quick_then_deeper",
            "voice_style": "friendly_excited",
            "diagram_density": "medium",
            "analogy_preference": "everyday_examples",
        },
        "feedback_history": [],
        "recent_scenarios": [],
        "next_recommended_questions": [],
        "onboarding_complete": False,
    }


def _load(user_id: str) -> dict[str, Any]:
    _ensure_dir()
    path = _path(user_id)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            merged = _default_memory(user_id)
            merged.update(data)
            return merged
        except (json.JSONDecodeError, OSError):
            pass
    return _default_memory(user_id)


def _save(user_id: str, data: dict[str, Any]) -> None:
    _ensure_dir()
    with open(_path(user_id), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _backboard_enabled() -> bool:
    return bool(BACKBOARD_API_KEY)


def _backboard_write(user_id: str, message: str) -> None:
    """Best-effort narrative memory write. Never raises."""
    if not _backboard_enabled():
        return
    try:
        requests.post(
            f"{BACKBOARD_BASE_URL}/memories",
            headers={
                "Authorization": f"Bearer {BACKBOARD_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"user_id": user_id, "content": message},
            timeout=4,
        )
    except requests.RequestException:
        pass


def _backboard_read(user_id: str) -> list[str]:
    """Best-effort fetch of narrative memories. Never raises."""
    if not _backboard_enabled():
        return []
    try:
        resp = requests.get(
            f"{BACKBOARD_BASE_URL}/memories",
            headers={"Authorization": f"Bearer {BACKBOARD_API_KEY}"},
            params={"user_id": user_id},
            timeout=4,
        )
        if resp.ok:
            data = resp.json()
            if isinstance(data, dict):
                return [str(m) for m in data.get("memories", [])]
            if isinstance(data, list):
                return [str(m) for m in data]
    except (requests.RequestException, ValueError):
        pass
    return []


def _personalization_summary(memory: dict[str, Any]) -> str:
    styles = [LEARNING_STYLE_LABELS.get(s, s.replace("_", " ")) for s in memory.get("learning_style", [])]
    style_text = " and ".join(styles) if styles else "a balanced mix of visuals and explanation"
    depth = memory.get("explanation_depth", "quick_then_deeper").replace("_", " ")
    return f"Use {style_text}. Explanation pace: {depth}."


async def get_student_context(user_id: str) -> dict[str, Any]:
    """Read full personalization context used by the interpreter and tutor."""
    memory = _load(user_id)
    memory["personalization_summary"] = _personalization_summary(memory)
    return memory


async def store_onboarding(req: OnboardingRequest) -> dict[str, Any]:
    memory = _load(req.user_id)
    memory["student_level"] = req.student_level
    memory["preferred_explanation_level"] = req.student_level
    memory["learning_style"] = req.learning_style
    memory["explanation_depth"] = req.explanation_depth
    memory["presentation_preferences"]["pace"] = req.explanation_depth
    memory["presentation_preferences"]["voice_style"] = req.voice_preference
    if req.voice_id:
        memory["voice_id"] = req.voice_id
        memory["voice_label"] = req.voice_label
    memory["interests"] = list(dict.fromkeys(memory.get("interests", []) + req.favorite_topics))
    memory["onboarding_complete"] = True
    _save(req.user_id, memory)

    summary = _personalization_summary(memory)
    styles = ", ".join(req.learning_style) or "no strong preference"
    topics = ", ".join(req.favorite_topics) or "general science"
    _backboard_write(
        req.user_id,
        (
            f"Onboarding: student level is {req.student_level}. They learn best through "
            f"{styles}. Favorite topics: {topics}. Explanation pace preference: "
            f"{req.explanation_depth}. Preferred tutor voice tone: {req.voice_preference}."
        ),
    )
    return {"status": "stored", "personalization_summary": summary}


async def store_simulation_memory(user_id: str, scenario: dict[str, Any], teaching: dict[str, Any]) -> None:
    memory = _load(user_id)

    for concept in scenario.get("concepts", []):
        if concept not in memory["concepts_seen"]:
            memory["concepts_seen"].append(concept)

    for item in teaching.get("misconceptions_corrected", []):
        memory["misconceptions_corrected"].append(
            {
                "misconception": item,
                "corrected_by": scenario.get("title", "a simulation"),
                "date": datetime.now(timezone.utc).isoformat(),
            }
        )

    memory["recent_scenarios"] = (memory.get("recent_scenarios", []) + [
        {
            "scenario_id": scenario.get("scenario_id"),
            "title": scenario.get("title"),
            "domain": scenario.get("domain"),
            "concepts": scenario.get("concepts", []),
            "key_takeaway": teaching.get("key_takeaway", ""),
            "date": datetime.now(timezone.utc).isoformat(),
        }
    ])[-10:]

    memory["next_recommended_questions"] = teaching.get("followups", memory.get("next_recommended_questions", []))

    _save(user_id, memory)

    _backboard_write(
        user_id,
        (
            f"Completed simulation '{scenario.get('title')}' covering concepts: "
            f"{', '.join(scenario.get('concepts', []))}. Key takeaway: "
            f"{teaching.get('key_takeaway', '')}"
        ),
    )


# Maps feedback chips to presentation preference adaptations.
_CHIP_ADAPTATIONS: dict[str, dict[str, str]] = {
    "more_visuals": {"diagram_density": "high"},
    "more_equations": {"math_level": "more_equations"},
    "less_math": {"math_level": "minimal"},
    "too_fast": {"pace": "slower"},
    "too_slow": {"pace": "quick_then_deeper"},
    "more_realistic": {"favorite_visual_style": "cinematic_with_labels"},
    "better_voice": {"voice_style": "friendly_excited"},
    "show_equation_next": {"math_level": "one_equation_card"},
}


async def store_feedback(req: FeedbackRequest) -> dict[str, Any]:
    memory = _load(req.user_id)

    memory["feedback_history"] = (memory.get("feedback_history", []) + [
        {
            "job_id": req.job_id,
            "rating": req.rating,
            "chips": req.chips,
            "free_text": req.free_text,
            "presentation_metrics": req.presentation_metrics,
            "date": datetime.now(timezone.utc).isoformat(),
        }
    ])[-20:]

    adaptations: list[str] = []
    for chip in req.chips:
        changes = _CHIP_ADAPTATIONS.get(chip)
        if not changes:
            continue
        for key, value in changes.items():
            if key == "favorite_visual_style":
                memory["favorite_visual_style"] = value
            else:
                memory["presentation_preferences"][key] = value
        adaptations.append(chip.replace("_", " "))

    if req.rating <= 2 and "too_fast" not in req.chips:
        memory["presentation_preferences"]["pace"] = "slower"
        adaptations.append("slow down narration")

    _save(req.user_id, memory)

    if adaptations:
        next_adaptation = "Future explanations will adapt: " + ", ".join(sorted(set(adaptations))) + "."
    else:
        next_adaptation = "Thanks — I'll keep teaching this way since it's working well."

    _backboard_write(
        req.user_id,
        (
            f"Student rated job {req.job_id} {req.rating}/5. Selected: "
            f"{', '.join(req.chips) or 'no chips'}. Free text: '{req.free_text}'. "
            f"Adaptation: {next_adaptation}"
        ),
    )

    return {"status": "stored", "next_adaptation": next_adaptation}


async def get_memory_summary(user_id: str) -> dict[str, Any]:
    memory = _load(user_id)
    concepts = memory.get("concepts_seen", [])
    if concepts:
        summary = f"This student has explored: {', '.join(concepts)}."
    else:
        summary = "This student hasn't explored any simulations yet."

    backboard_notes = _backboard_read(user_id)
    if backboard_notes:
        summary += " " + backboard_notes[-1]

    return {
        "user_id": user_id,
        "summary": summary,
        "concepts_seen": concepts,
        "suggested_questions": memory.get("next_recommended_questions", []),
    }
