"""Deterministic render payloads consumed by the frontend SimulationViewer.

Each builder returns a JSON-serializable dict with a `type` field that the
frontend uses to pick the right viewer component.
"""

from __future__ import annotations

import math
from typing import Any

PLANETS = [
    {"name": "Mercury", "gravity": 3.7, "color": "#9c9c9c"},
    {"name": "Venus", "gravity": 8.87, "color": "#e8c08a"},
    {"name": "Earth", "gravity": 9.81, "color": "#4d8fe0"},
    {"name": "Moon", "gravity": 1.62, "color": "#cfcfcf"},
    {"name": "Mars", "gravity": 3.71, "color": "#c1542d"},
    {"name": "Jupiter", "gravity": 24.79, "color": "#d9b38c"},
    {"name": "Saturn", "gravity": 10.44, "color": "#e0c98f"},
    {"name": "Uranus", "gravity": 8.69, "color": "#9fe0d8"},
    {"name": "Neptune", "gravity": 11.15, "color": "#5a6fe0"},
]

JUMP_VELOCITY_M_S = 3.0


def build_planet_jump_payload(scenario: dict[str, Any]) -> dict[str, Any]:
    v0 = scenario.get("known_values", {}).get("initial_jump_velocity_m_s", JUMP_VELOCITY_M_S)

    planets: list[dict[str, Any]] = []
    for planet in PLANETS:
        g = planet["gravity"]
        jump_height = (v0 ** 2) / (2 * g)
        airtime = (2 * v0) / g

        keyframes = []
        steps = 24
        for i in range(steps + 1):
            t = airtime * i / steps
            y = max(0.0, v0 * t - 0.5 * g * t * t)
            keyframes.append({"t": round(t, 3), "y": round(y, 4)})

        planets.append({
            "name": planet["name"],
            "gravity": g,
            "color": planet["color"],
            "jump_height_m": round(jump_height, 3),
            "airtime_s": round(airtime, 3),
            "keyframes": keyframes,
        })

    return {
        "type": "planet_jump",
        "title": scenario.get("title", "Jumping Across the Solar System"),
        "v0": v0,
        "equation": "h = v0² / (2g)",
        "planets": planets,
        "highlight": ["Moon", "Earth", "Jupiter"],
        "labels": [
            f"Same jump effort ({v0} m/s takeoff) produces very different heights.",
            "Lower gravity -> higher jump and longer airtime.",
        ],
        "takeaway": scenario.get("teaching_plan", {}).get(
            "core_takeaway", "Jump height depends on gravity."
        ),
    }


def build_moon_drop_payload(scenario: dict[str, Any]) -> dict[str, Any]:
    env = scenario.get("environment", {})
    g_moon = env.get("gravity_m_s2", 1.62)
    g_earth = 9.81
    drop_height = scenario.get("known_values", {}).get("drop_height_m", 5.0)

    fall_time_moon = math.sqrt(2 * drop_height / g_moon)
    fall_time_earth_ball = math.sqrt(2 * drop_height / g_earth)
    # Illustrative only: a feather on Earth is slowed dramatically by air drag.
    fall_time_earth_feather = fall_time_earth_ball * 3.4

    objects = []
    for obj in scenario.get("objects", []):
        is_feather = "feather" in obj.get("name", "").lower()
        objects.append({
            "name": obj.get("name"),
            "mass_kg": obj.get("mass_kg"),
            "radius": 0.22 if is_feather else 0.4,
            "color": "#f5f5f5" if is_feather else "#c9c9c9",
        })

    return {
        "type": "moon_drop",
        "title": scenario.get("title", "Bowling Ball and Feather on the Moon"),
        "gravity_m_s2": g_moon,
        "drop_height_m": drop_height,
        "objects": objects,
        "fall_time_s": round(fall_time_moon, 3),
        "equation": "t = √(2h / g)  -- independent of mass",
        "comparison": {
            "label": "On Earth, air resistance makes the feather drift down far slower.",
            "earth_gravity_m_s2": g_earth,
            "earth_fall_time_ball_s": round(fall_time_earth_ball, 3),
            "earth_fall_time_feather_s": round(fall_time_earth_feather, 3),
        },
        "labels": [
            "No air on the Moon -> both objects fall together.",
            "Mass does not change free-fall acceleration.",
        ],
        "takeaway": scenario.get("teaching_plan", {}).get(
            "core_takeaway", "Gravity accelerates all masses equally in a vacuum."
        ),
    }


def _water_molecule(mol_id: str, start_x: float, end_x: float, facing: int) -> dict[str, Any]:
    """`facing` is +1 or -1 and points the hydrogens toward the other molecule."""
    return {
        "id": mol_id,
        "name": "Water",
        "formula": "H2O",
        "start_position": [start_x, 0, 0],
        "end_position": [end_x, 0, 0],
        "atoms": [
            {"id": "O", "element": "O", "label": "O", "offset": [0, 0, 0], "radius": 0.5,
             "color": "#ff5252", "partial_charge": "negative"},
            {"id": "H1", "element": "H", "label": "H", "offset": [0.7 * facing, 0.55, 0], "radius": 0.26,
             "color": "#eaf6ff", "partial_charge": "positive"},
            {"id": "H2", "element": "H", "label": "H", "offset": [0.7 * facing, -0.55, 0], "radius": 0.26,
             "color": "#eaf6ff", "partial_charge": "positive"},
        ],
        "bonds": [["O", "H1"], ["O", "H2"]],
    }


def build_molecule_payload(scenario: dict[str, Any]) -> dict[str, Any]:
    interaction_type = scenario.get("known_values", {}).get("interaction", "hydrogen_bond")

    if interaction_type == "ionic_attraction":
        molecules = [
            {
                "id": "na",
                "name": "Sodium ion",
                "formula": "Na+",
                "start_position": [-3.2, 0, 0],
                "end_position": [-0.95, 0, 0],
                "atoms": [{"id": "Na", "element": "Na", "label": "Na+", "offset": [0, 0, 0],
                           "radius": 0.55, "color": "#b388ff", "partial_charge": "positive"}],
                "bonds": [],
            },
            {
                "id": "cl",
                "name": "Chloride ion",
                "formula": "Cl-",
                "start_position": [3.2, 0, 0],
                "end_position": [0.95, 0, 0],
                "atoms": [{"id": "Cl", "element": "Cl", "label": "Cl-", "offset": [0, 0, 0],
                           "radius": 0.7, "color": "#69f0ae", "partial_charge": "negative"}],
                "bonds": [],
            },
        ]
        interaction = {
            "type": "ionic_attraction",
            "from": {"molecule": "na", "atom": "Na"},
            "to": {"molecule": "cl", "atom": "Cl"},
            "label": "Positive sodium ion attracts negative chloride ion -- an ionic bond.",
        }
        accuracy_note = (
            "Simplified to two isolated ions. Real dissolved salt is surrounded by "
            "many water molecules, which is omitted here for clarity."
        )
    else:
        molecules = [
            _water_molecule("mol_a", -3.4, -1.15, facing=1),
            _water_molecule("mol_b", 3.4, 1.15, facing=-1),
        ]
        interaction = {
            "type": "hydrogen_bond",
            "from": {"molecule": "mol_a", "atom": "H1"},
            "to": {"molecule": "mol_b", "atom": "O"},
            "label": "Partial-positive hydrogen attracts partial-negative oxygen -- a hydrogen bond.",
        }
        accuracy_note = (
            "EchoMind shows a simplified electrostatic picture of polarity. Real "
            "hydrogen bonding also involves quantum-mechanical effects not modeled here."
        )

    return {
        "type": "molecule_interaction",
        "title": scenario.get("title", "Molecules Interacting"),
        "molecules": molecules,
        "interaction": interaction,
        "animation": {"duration_s": 4},
        "accuracy_note": accuracy_note,
        "takeaway": scenario.get("teaching_plan", {}).get(
            "core_takeaway", "Opposite charges attract."
        ),
    }


def build_fallback_payload(scenario: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "fallback_diagram",
        "title": scenario.get("title", "Concept Overview"),
        "message": (
            "For speed and reliability, EchoMind chose a simplified physics model "
            "that captures the core principle."
        ),
        "concepts": scenario.get("concepts", []),
        "takeaway": scenario.get("teaching_plan", {}).get("core_takeaway", ""),
    }


def build_simulation_payload(scenario: dict[str, Any]) -> dict[str, Any]:
    domain = scenario.get("domain")
    if domain == "planet_jump":
        return build_planet_jump_payload(scenario)
    if domain == "molecule_interaction":
        return build_molecule_payload(scenario)
    if domain == "moon_drop":
        return build_moon_drop_payload(scenario)
    return build_fallback_payload(scenario)
