"""Deterministic question -> Scenario classifier.

MVP rule: use keyword matching first. An LLM-backed interpreter can be
layered on later without changing this contract.
"""

from __future__ import annotations

import uuid
from typing import Any

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
    q = question.lower()
    level = student_context.get("student_level", "middle_school")

    if any(k in q for k in MOLECULE_KEYWORDS):
        return _molecule_scenario(question, level)

    if any(k in q for k in MOON_DROP_KEYWORDS) or (
        "moon" in q and any(k in q for k in ["drop", "fall", "falling", "dropped"])
    ):
        return _moon_drop_scenario(question, level)

    if any(k in q for k in PLANET_KEYWORDS):
        return _planet_jump_scenario(question, level, fallback=False)

    return _planet_jump_scenario(question, level, fallback=True)


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


def _molecule_scenario(question: str, level: str) -> dict[str, Any]:
    q = question.lower()
    ionic = any(k in q for k in IONIC_KEYWORDS)

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
