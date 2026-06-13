"""Builds the spoken/written explanation and follow-up suggestions.

Adapts tone, depth, and emphasis based on the student's stored
presentation preferences (Backboard / local memory).
"""

from __future__ import annotations

from typing import Any

_TRANSCRIPTS: dict[str, str] = {
    "planet_jump": (
        "You asked what would happen if you could jump on every planet. The simulation "
        "keeps your jump effort exactly the same everywhere and lets gravity decide the "
        "result. On the Moon, weak gravity lets you soar far higher than on Earth. On "
        "Jupiter, much stronger gravity barely lifts you off the ground. Same legs, same "
        "push -- gravity makes all the difference."
    ),
    "moon_drop": (
        "You asked about dropping a bowling ball and a feather on the Moon. Because the "
        "Moon has no air, nothing slows the feather down -- both objects fall side by "
        "side and land at the same instant. This corrects a famous misconception: "
        "heavier objects don't actually fall faster. Air resistance just usually hides "
        "that truth here on Earth."
    ),
    "molecule_interaction_water": (
        "You asked what happens when two water molecules come close. Each molecule is "
        "bent, with a slightly negative oxygen and two slightly positive hydrogens. As "
        "the molecules approach, the positive hydrogen on one is pulled toward the "
        "negative oxygen on the other, forming a hydrogen bond. Repeated billions of "
        "times, this tiny attraction is why water sticks to itself and forms droplets."
    ),
    "molecule_interaction_ionic": (
        "You asked about sodium and chlorine coming together. Sodium has one loosely "
        "held electron, and chlorine is just one electron short of being full. Sodium "
        "hands that electron over, becoming a positive ion, while chlorine becomes "
        "negative. Opposite charges attract strongly, locking the two ions together -- "
        "that's an ionic bond, the same force that holds table salt together."
    ),
    "ramp_box": (
        "You uploaded a clip of a box sliding down a ramp. EchoMind tracked its motion "
        "and rebuilt it as a digital twin. Gravity pulls the box straight down, but the "
        "ramp only lets it move along the slope -- that's the gravity component along "
        "the incline. The ramp pushes back perpendicular to its surface as the normal "
        "force, while friction resists the sliding motion. Together, these three forces "
        "set how quickly the box speeds up."
    ),
}

_EQUATION_LINES: dict[str, str] = {
    "planet_jump": "The simple rule behind every bar you see is h equals v-zero squared over two g.",
    "moon_drop": "The fall time only depends on height and gravity: t equals the square root of two h over g.",
    "molecule_interaction_water": "The attraction follows Coulomb's law: opposite charges pull together with a force proportional to one over distance squared.",
    "molecule_interaction_ionic": "The attraction follows Coulomb's law: opposite charges pull together with a force proportional to one over distance squared.",
    "ramp_box": "The box accelerates down the slope at a equals g times sine theta, minus mu times g times cosine theta.",
}

_FOLLOWUPS: dict[str, list[str]] = {
    "planet_jump": [
        "What if you doubled your jump speed?",
        "What if you tried this near a black hole?",
    ],
    "moon_drop": [
        "What if we add Earth's air resistance to the feather?",
        "What if we tried this drop on Jupiter instead?",
    ],
    "molecule_interaction_water": [
        "What if we add a third water molecule?",
        "What if we cool this down until it freezes into ice?",
    ],
    "molecule_interaction_ionic": [
        "What if we drop these ions into water?",
        "What if both atoms started out neutral instead of charged?",
    ],
    "ramp_box": [
        "What if the ramp were steeper?",
        "What if the surface were frictionless?",
    ],
    "fallback_diagram": [
        "Want to try a planet jump comparison?",
        "Want to see a molecule interaction instead?",
    ],
}

_CHIP_ADAPTATION_NOTES: dict[str, str] = {
    "more_visuals": "You asked for more visuals last time, so this explanation leads with the diagram.",
    "more_equations": "You asked for more math last time, so an equation card is included.",
    "show_equation_next": "You asked to see the equation next time, so it's included below.",
    "less_math": "You asked for less math last time, so the equation card is hidden.",
    "too_fast": "You said the last explanation felt fast, so this one is a little slower and more spelled-out.",
    "too_slow": "You said the last explanation felt slow, so this one stays concise.",
    "more_realistic": "You asked for a more realistic look, so the visuals lean into cinematic lighting.",
    "better_voice": "Tuning the narration tone based on your last rating.",
}


def _payload_key(scenario: dict[str, Any], sim_payload: dict[str, Any]) -> str:
    domain = scenario.get("domain", "fallback_diagram")
    if domain == "molecule_interaction":
        interaction_type = sim_payload.get("interaction", {}).get("type", "hydrogen_bond")
        return "molecule_interaction_ionic" if interaction_type == "ionic_attraction" else "molecule_interaction_water"
    if domain in _TRANSCRIPTS:
        return domain
    return "fallback_diagram"


def _fallback_transcript(sim_payload: dict[str, Any]) -> str:
    message = sim_payload.get("message", "Here is a simplified explanation of the core idea.")
    takeaway = sim_payload.get("takeaway", "")
    return f"{message} {takeaway}".strip()


def _adaptation_note(student_context: dict[str, Any]) -> str:
    history = student_context.get("feedback_history", [])
    if not history:
        return ""
    last = history[-1]
    for chip in last.get("chips", []):
        note = _CHIP_ADAPTATION_NOTES.get(chip)
        if note:
            return note
    if last.get("rating", 5) <= 2:
        return "Your last rating was low, so this explanation is slower and more focused."
    return ""


def build_teaching_result(
    scenario: dict[str, Any], sim_payload: dict[str, Any], student_context: dict[str, Any]
) -> dict[str, Any]:
    key = _payload_key(scenario, sim_payload)
    teaching_plan = scenario.get("teaching_plan", {})
    prefs = student_context.get("presentation_preferences", {})
    learning_style = student_context.get("learning_style", [])

    transcript = _TRANSCRIPTS.get(key, "")
    if not transcript:
        transcript = _fallback_transcript(sim_payload)

    math_level = prefs.get("math_level", "light_equations")
    include_equation = math_level != "minimal"
    if include_equation and key in _EQUATION_LINES:
        transcript = f"{transcript} {_EQUATION_LINES[key]}"

    assumptions = scenario.get("assumptions", [])
    if assumptions and ("real_world_examples" in learning_style or "stories_analogies" in learning_style):
        transcript = f"{transcript} To keep things clear, {assumptions[-1][0].lower()}{assumptions[-1][1:]}"

    adaptation_note = _adaptation_note(student_context)

    key_takeaway = sim_payload.get("takeaway") or teaching_plan.get("core_takeaway", "")

    misconception = teaching_plan.get("misconception_to_address")
    misconceptions_corrected = [misconception] if misconception else []

    followups = list(_FOLLOWUPS.get(key, _FOLLOWUPS["fallback_diagram"]))
    if "hands_on_experiments" in learning_style:
        followups.append("Want to design your own version of this experiment?")
    if prefs.get("math_level") == "minimal":
        followups.append("Want to see the math behind this?")

    visual_style_instructions = {
        "lead_with": "diagram" if (
            "visual_animations" in learning_style or prefs.get("diagram_density") == "high"
        ) else "animation",
        "diagram_density": prefs.get("diagram_density", "medium"),
        "equation_card": include_equation,
        "pace": prefs.get("pace", "quick_then_deeper"),
        "voice_style": prefs.get("voice_style", "friendly_excited"),
        "analogy_preference": prefs.get("analogy_preference", "everyday_examples"),
    }

    return {
        "transcript": transcript,
        "key_takeaway": key_takeaway,
        "concepts_explained": scenario.get("concepts", []),
        "misconceptions_corrected": misconceptions_corrected,
        "followups": followups[:3],
        "visual_style_instructions": visual_style_instructions,
        "adaptation_note": adaptation_note,
    }
