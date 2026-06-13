"""Question -> Scenario classifier.

When `OPENAI_API_KEY` is set, an LLM classifies the question into the right
simulation and enriches the title/concepts/takeaway, so arbitrary questions
map accurately instead of always defaulting to a planet jump. Keyword
matching is the deterministic fallback used when no key is present or the LLM
call fails, so the product never breaks.
"""

from __future__ import annotations

import json
import os
import uuid
from typing import Any

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("ECHOMIND_LLM_MODEL", "gpt-4o-mini").strip()

MOLECULE_KEYWORDS = [
    "molecule", "molecules", "water", "h2o", "sodium", "chlorine",
    "salt", "nacl", "ionic", "bond", "atom", "atoms",
]
MOON_DROP_KEYWORDS = ["feather", "bowling ball", "vacuum"]
PLANET_KEYWORDS = [
    "planet", "planets", "jump", "solar system", "gravity",
    "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "moon",
]
IONIC_KEYWORDS = ["sodium", "chlorine", "salt", "nacl", "ionic", "na+", "cl-", "na ", "cl "]


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def interpret_question(question: str, student_context: dict[str, Any]) -> dict[str, Any]:
    level = student_context.get("student_level", "middle_school")

    llm = _llm_classify(question)
    if llm is not None:
        category = llm.get("category")
        if category == "molecule_interaction":
            return _molecule_scenario(question, level, ionic_hint=llm.get("ionic"))
        if category == "moon_drop":
            return _moon_drop_scenario(question, level)
        if category == "planet_jump":
            return _planet_jump_scenario(question, level, fallback=False)
        # Anything the 3D templates can't faithfully render -> honest diagram.
        return _generic_scenario(question, level, llm)

    return _keyword_interpret(question, level)


def _keyword_interpret(question: str, level: str) -> dict[str, Any]:
    q = question.lower()

    if any(k in q for k in MOLECULE_KEYWORDS):
        return _molecule_scenario(question, level)

    if any(k in q for k in MOON_DROP_KEYWORDS) or (
        "moon" in q and any(k in q for k in ["drop", "fall", "falling", "dropped"])
    ):
        return _moon_drop_scenario(question, level)

    if any(k in q for k in PLANET_KEYWORDS):
        return _planet_jump_scenario(question, level, fallback=False)

    return _planet_jump_scenario(question, level, fallback=True)


def _llm_classify(question: str) -> dict[str, Any] | None:
    """Classify the question into a renderable simulation. Returns None when no
    key is set or the call fails, so callers fall back to keyword matching."""
    if not OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=OPENAI_API_KEY)
        system = (
            "You route a student's science question to ONE simulation EchoMind can render. "
            "Categories: 'planet_jump' (gravity/jumping/weight across planets or the Moon), "
            "'moon_drop' (two objects falling, air resistance, free fall), "
            "'molecule_interaction' (molecules/atoms/bonds/charges; set ionic=true for "
            "salt/ionic/metal+nonmetal, else false for polar/hydrogen-bond), "
            "'diagram' (anything else: astrophysics, biology, weather, large-scale, unsafe). "
            "Reply ONLY with compact JSON: "
            '{"category": "...", "ionic": true|false, "title": "...", '
            '"concepts": ["..."], "takeaway": "...", "misconception": "..."}'
        )
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": question},
            ],
            temperature=0.2,
            max_tokens=300,
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        if data.get("category") in {
            "planet_jump",
            "moon_drop",
            "molecule_interaction",
            "diagram",
        }:
            return data
        return None
    except Exception:
        return None


def _generic_scenario(question: str, level: str, llm: dict[str, Any]) -> dict[str, Any]:
    """A real (diagram) scenario for questions outside the 3D template set,
    enriched by the LLM so it is accurate rather than a fake planet jump."""
    return _base_scenario(
        scenario_id=_new_id("scenario"),
        title=llm.get("title") or "Science Explainer",
        domain="diagram_only",
        question=question,
        concepts=llm.get("concepts") or ["core principle"],
        objects=[],
        environment={},
        known_values={},
        assumptions=[
            "EchoMind built a guided diagram explainer because this question is best "
            "shown conceptually rather than as one of its built-in 3D simulations.",
        ],
        simulation_plan={
            "engine": "diagram",
            "duration_s": 6,
            "comparison_count": 1,
            "needs_cinematic_render": True,
            "needs_diagram": True,
        },
        teaching_plan={
            "level": level,
            "misconception_to_address": llm.get("misconception"),
            "core_takeaway": llm.get("takeaway")
            or "Here is the key idea behind your question.",
        },
    )


def _base_scenario(
    *,
    scenario_id: str,
    title: str,
    domain: str,
    question: str,
    concepts: list[str],
    objects: list[dict[str, Any]],
    environment: dict[str, Any],
    known_values: dict[str, Any],
    assumptions: list[str],
    simulation_plan: dict[str, Any],
    teaching_plan: dict[str, Any],
) -> dict[str, Any]:
    return {
        "scenario_id": scenario_id,
        "title": title,
        "domain": domain,
        "student_question": question,
        "concepts": concepts,
        "objects": objects,
        "environment": environment,
        "known_values": known_values,
        "unknown_values": {},
        "assumptions": assumptions,
        "safety": {"allowed": True, "risk_level": "low", "notes": []},
        "simulation_plan": simulation_plan,
        "teaching_plan": teaching_plan,
    }


def _planet_jump_scenario(question: str, level: str, *, fallback: bool) -> dict[str, Any]:
    assumptions = [
        "The same takeoff velocity (3 m/s) is used on every planet.",
        "Air resistance and terrain shape are ignored.",
        "The student is modeled as a point mass for height calculations.",
    ]
    if fallback:
        assumptions.insert(
            0,
            "EchoMind didn't find a specialized simulation for this exact question, "
            "so it built the closest matching simulation: a gravity jump comparison "
            "across the solar system.",
        )

    return _base_scenario(
        scenario_id=_new_id("scenario"),
        title="Jumping Across the Solar System",
        domain="planet_jump",
        question=question,
        concepts=["gravity", "kinematics", "comparative planetary physics"],
        objects=[{"name": "student", "shape": "capsule", "mass_kg": 60}],
        environment={"reference_velocity_m_s": 3.0},
        known_values={"initial_jump_velocity_m_s": 3.0},
        assumptions=assumptions,
        simulation_plan={
            "engine": "analytic",
            "duration_s": 6,
            "comparison_count": 9,
            "needs_cinematic_render": True,
            "needs_diagram": True,
        },
        teaching_plan={
            "level": level,
            "misconception_to_address": "Gravity feels the same everywhere in the universe.",
            "core_takeaway": (
                "Jump height depends on surface gravity: the same effort sends you "
                "much higher on low-gravity worlds like the Moon than on Jupiter."
            ),
        },
    )


def _moon_drop_scenario(question: str, level: str) -> dict[str, Any]:
    return _base_scenario(
        scenario_id=_new_id("scenario"),
        title="Bowling Ball and Feather on the Moon",
        domain="moon_drop",
        question=question,
        concepts=["gravity", "mass independence of acceleration", "air resistance"],
        objects=[
            {"name": "Bowling Ball", "shape": "sphere", "mass_kg": 7.0},
            {"name": "Feather", "shape": "thin_plate", "mass_kg": 0.001},
        ],
        environment={"gravity_m_s2": 1.62, "air_density": 0.0, "surface": "moon"},
        known_values={"drop_height_m": 5.0},
        assumptions=[
            "The Moon has no atmosphere, so air resistance is zero.",
            "Both objects are dropped from the same height at the same instant.",
        ],
        simulation_plan={
            "engine": "analytic",
            "duration_s": 4,
            "comparison_count": 2,
            "needs_cinematic_render": True,
            "needs_diagram": True,
        },
        teaching_plan={
            "level": level,
            "misconception_to_address": "Heavier objects always fall faster than lighter ones.",
            "core_takeaway": (
                "Without air resistance, gravity accelerates every object at the same "
                "rate, no matter how heavy or light it is."
            ),
        },
    )


def _molecule_scenario(question: str, level: str, ionic_hint: bool | None = None) -> dict[str, Any]:
    q = question.lower()
    ionic = ionic_hint if ionic_hint is not None else any(k in q for k in IONIC_KEYWORDS)

    if ionic:
        return _base_scenario(
            scenario_id=_new_id("scenario"),
            title="Sodium and Chloride Ions Attracting",
            domain="molecule_interaction",
            question=question,
            concepts=["ionic bonding", "electrostatic attraction", "electron transfer"],
            objects=[
                {"name": "Sodium ion", "formula": "Na+", "charge": "+1"},
                {"name": "Chloride ion", "formula": "Cl-", "charge": "-1"},
            ],
            environment={"medium": "vacuum_for_clarity"},
            known_values={"interaction": "ionic_attraction"},
            assumptions=[
                "Charges are shown as simple point charges rather than full electron clouds.",
                "Surrounding water molecules (as in real dissolved salt) are omitted for clarity.",
            ],
            simulation_plan={
                "engine": "molecule",
                "duration_s": 4,
                "comparison_count": 1,
                "needs_cinematic_render": True,
                "needs_diagram": True,
            },
            teaching_plan={
                "level": level,
                "misconception_to_address": "Atoms in ionic compounds share electrons like in covalent bonds.",
                "core_takeaway": (
                    "Sodium gives up an electron to chlorine. The resulting "
                    "oppositely-charged ions attract each other strongly — that's an ionic bond."
                ),
            },
        )

    return _base_scenario(
        scenario_id=_new_id("scenario"),
        title="Two Water Molecules Coming Together",
        domain="molecule_interaction",
        question=question,
        concepts=["molecular polarity", "hydrogen bonding", "intermolecular forces"],
        objects=[
            {"name": "Water molecule A", "formula": "H2O"},
            {"name": "Water molecule B", "formula": "H2O"},
        ],
        environment={"medium": "vacuum_for_clarity"},
        known_values={"interaction": "hydrogen_bond"},
        assumptions=[
            "Each water molecule is shown as a simplified bent shape with partial charges.",
            "Only one hydrogen bond is highlighted for clarity.",
        ],
        simulation_plan={
            "engine": "molecule",
            "duration_s": 4,
            "comparison_count": 1,
            "needs_cinematic_render": True,
            "needs_diagram": True,
        },
        teaching_plan={
            "level": level,
            "misconception_to_address": "Molecules must share electrons (covalent bonds) to interact at all.",
            "core_takeaway": (
                "Water is polar — the slightly negative oxygen on one molecule attracts "
                "a slightly positive hydrogen on another, forming a hydrogen bond."
            ),
        },
    )
