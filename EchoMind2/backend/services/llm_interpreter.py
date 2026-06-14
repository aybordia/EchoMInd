"""LLM-powered question interpreter using OpenAI.

Routes any science question to one of EchoMind's simulation types:
  - Known optimized: planet_jump, moon_drop, molecule_interaction
  - Dynamic computed: projectile, pendulum, energy_comparison, collision, orbit, wave, spring
"""

from __future__ import annotations

import json
import logging
import math
import os
import re
import uuid
from typing import Any

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

SYSTEM_PROMPT = """You are EchoMind's physics simulation planner. Given a student's question, return JSON to configure a physics simulation.

STEP 1 — check if the question matches a KNOWN scenario:
  "planet_jump" — jumping/gravity comparison across planets/moons
  "moon_drop" — dropping objects in vacuum, mass independence of free fall
  "molecule_interaction" — water H-bonding, ionic bonding, molecular forces

If it matches, return: {"use_known": true, "domain": "<name>"}

STEP 2 — if NOT a known scenario, pick the best simulation TYPE from this list:

"projectile" — anything thrown, launched, shot, dropped from height, roller coaster, catapult, cannon
  Required params: v0 (launch speed m/s), angle_deg (launch angle), gravity (m/s²), num_scenarios (2-5 comparisons), scenarios: [{label, v0, angle_deg, gravity, color}]

"pendulum" — swinging, pendulum, wrecking ball, playground swing, metronome, Foucault
  Required params: lengths (array of pendulum lengths in meters, 2-4 items), gravity (m/s²), labels (array of labels), colors (array of hex colors)

"energy_comparison" — energy types, efficiency, power output, calories, electricity, fuel
  Required params: bars: [{label, value, unit, color}] (3-6 items with real calculated physics values)

"collision" — Newton's cradle, billiards, car crash, bumper cars, momentum, elastic/inelastic
  Required params: objects: [{label, mass_kg, velocity_m_s, color}] (2-4 objects), collision_type: "elastic" | "inelastic"

"orbit" — satellites, space stations, planets orbiting stars, Kepler's laws, escape velocity
  Required params: bodies: [{label, orbital_radius_au, period_years, color, size}] (2-5 orbiting bodies)

"wave" — sound waves, light waves, earthquake waves, radio, interference, frequency, wavelength
  Required params: waves: [{label, frequency_hz, amplitude, wavelength_m, color}] (2-4 waves)

"spring" — springs, Hooke's law, elastic energy, bungee jump, trampoline, suspension
  Required params: springs: [{label, k_constant, mass_kg, color}] (2-4 springs)

Return this JSON structure:
{
  "use_known": false,
  "sim_type": "<type from list above>",
  "title": "Short descriptive title",
  "params": { <required params for the chosen type> },
  "teaching": {
    "misconception": "common wrong belief this corrects",
    "core_takeaway": "the key physics insight in one sentence",
    "transcript": "A 3-4 sentence spoken explanation. Be conversational and reference what the student will see in the simulation. Explain the physics clearly.",
    "equation_label": "equation name",
    "equation_formula": "the key equation in text form",
    "equation_explanation": "what each variable means",
    "followups": ["follow-up question 1", "follow-up question 2"]
  },
  "concepts": ["concept1", "concept2", "concept3"]
}

RULES:
- Return ONLY valid JSON
- Use REAL physics values — calculate them. A baseball pitch is 40 m/s not 100. Earth gravity is 9.81.
- Roller coaster, coaster, loop-the-loop, hill/drop ride, or theme park ride prompts MUST use sim_type "projectile" because EchoMind has a dedicated roller-coaster track renderer for that.
- For comparisons, pick scenarios that show dramatic visual differences
- The transcript must reference the simulation ("Notice how..." / "Watch the..." / "See how...")
- Pick vivid, distinct hex colors for each item
- Always include at least 3 comparison items where the type supports it
"""


def _contains_any(text: str, keywords: list[str]) -> bool:
    return any(keyword in text for keyword in keywords)


def _is_roller_coaster_question(text: str) -> bool:
    return _contains_any(
        text.lower(),
        [
            "roller coaster",
            "rollercoaster",
            "coaster",
            "loop-the-loop",
            "loop de loop",
            "theme park",
            "first hill",
            "mega drop",
            "cart on a track",
        ],
    )


def _heuristic_dynamic_plan(question: str, student_context: dict[str, Any]) -> dict[str, Any] | None:
    q = question.lower()

    def result(
        sim_type: str,
        title: str,
        params: dict[str, Any],
        misconception: str,
        core_takeaway: str,
        transcript: str,
        equation_label: str,
        equation_formula: str,
        equation_explanation: str,
        concepts: list[str],
        followups: list[str],
    ) -> dict[str, Any]:
        return {
            "use_known": False,
            "sim_type": sim_type,
            "title": title,
            "params": params,
            "teaching": {
                "misconception": misconception,
                "core_takeaway": core_takeaway,
                "transcript": transcript,
                "equation_label": equation_label,
                "equation_formula": equation_formula,
                "equation_explanation": equation_explanation,
                "followups": followups,
            },
            "concepts": concepts,
        }

    if _is_roller_coaster_question(q):
        coaster_has_friction = _contains_any(
            q,
            ["friction", "rough", "brake", "brakes", "air resistance", "drag", "energy loss", "slows down"],
        )
        if coaster_has_friction:
            return result(
                "projectile",
                "Roller Coaster Energy With Friction",
                {
                    "coaster_mode": True,
                    "track_length_m": 120,
                    "loop_radius_m": 12,
                    "scenarios": [
                        {"label": "Low friction", "hill_height_m": 24, "friction_loss_fraction": 0.05, "gravity": 9.81, "color": "#50e080"},
                        {"label": "Medium friction", "hill_height_m": 24, "friction_loss_fraction": 0.18, "gravity": 9.81, "color": "#ff8c42"},
                        {"label": "Heavy friction", "hill_height_m": 24, "friction_loss_fraction": 0.35, "gravity": 9.81, "color": "#ff4d6d"},
                    ]
                },
                "Friction destroys energy completely.",
                "Friction transforms some mechanical energy into heat and sound, so the coaster keeps less speed for the same starting height.",
                "Watch the same roller coaster with different friction levels. With low friction, most of the height energy turns into speed, so the car carries more motion through the loop. With heavier friction, more energy leaves the mechanical system as heat and sound, so the car slows down sooner. As you can see in the simulation, the track is the same, but the available energy changes how much speed the car can keep.",
                "Mechanical Energy With Friction",
                "E_final = mgh - W_friction",
                "mgh is the starting gravitational potential energy, and W_friction is the energy transformed away from motion by friction.",
                ["energy conservation", "friction", "kinetic energy", "gravitational potential energy"],
                [
                    "What if the first hill were taller to overcome friction?",
                    "How much speed is needed at the top of the loop?",
                    "What if the track had brakes after the first drop?",
                ],
            )
        return result(
            "projectile",
            "Roller Coaster Energy Through the Ride",
            {
                "coaster_mode": True,
                "track_length_m": 120,
                "loop_radius_m": 12,
                "scenarios": [
                    {"label": "18 m hill", "hill_height_m": 18, "gravity": 9.81, "color": "#ff8c42"},
                    {"label": "24 m hill", "hill_height_m": 24, "gravity": 9.81, "color": "#4d8fe0"},
                    {"label": "30 m hill", "hill_height_m": 30, "gravity": 9.81, "color": "#7c5cff"},
                ]
            },
            "Roller coasters need engines the whole time to stay moving.",
            "At the top of the ride, energy is mostly gravitational potential energy, and as the car drops that stored energy converts into speed.",
            "Watch the coaster climb slowly, then speed up through the drop and the loop. The big idea is that height stores gravitational potential energy, and that stored energy turns into kinetic energy as the car descends. Notice how the fastest part of the ride happens after the biggest drop. The loop works because the car carries enough speed to keep the needed centripetal force all the way around the track.",
            "Mechanical Energy",
            "E_total = PE + KE = mgh + 1/2 mv^2",
            "m is mass, g is gravity, h is height, and v is speed. As height decreases, speed increases if total energy stays nearly constant.",
            ["energy conservation", "gravitational potential energy", "kinetic energy", "centripetal force"],
            [
                "What if the first hill were twice as high?",
                "What if friction took away more energy before the loop?",
                "How much speed is needed at the top of the loop to stay on the track?",
            ],
        )

    if _contains_any(q, ["pendulum", "swing", "metronome", "wrecking ball", "foucault"]):
        return result(
            "pendulum",
            "How Pendulum Length Changes the Swing",
            {
                "lengths": [0.8, 1.6, 2.6],
                "gravity": 9.81,
                "labels": ["Short swing", "Medium swing", "Long swing"],
                "colors": ["#4d8fe0", "#ff8c42", "#7c5cff"],
            },
            "Heavier pendulums swing faster just because they are heavier.",
            "For the same gravity, pendulum timing mainly depends on length, not mass.",
            "Notice how the longest swing takes the most time to complete each cycle. The shorter one moves back and forth more quickly, even though they are all under the same gravity. That happens because pendulum period depends on length. Mass barely matters for the timing in this idealized model.",
            "Pendulum Period",
            "T = 2π√(L / g)",
            "T is period, L is pendulum length, and g is gravity.",
            ["pendulum motion", "period", "gravity"],
            [
                "What if we did this on the Moon?",
                "What if the swing started from a much larger angle?",
                "Would changing the mass affect the timing in real life?",
            ],
        )

    if _contains_any(q, ["collision", "car crash", "crash", "bumper car", "newton's cradle", "billiard", "pool ball"]):
        elastic = not _contains_any(q, ["stick together", "inelastic"])
        return result(
            "collision",
            "Momentum During a Collision",
            {
                "objects": [
                    {"label": "Object A", "mass_kg": 1.5, "velocity_m_s": 6, "color": "#4d8fe0"},
                    {"label": "Object B", "mass_kg": 1.2, "velocity_m_s": -3, "color": "#ff8c42"},
                ],
                "collision_type": "elastic" if elastic else "inelastic",
            },
            "A harder crash means momentum disappears.",
            "Momentum is conserved through the collision, even though the speeds can change dramatically.",
            "Watch the objects approach with different momenta, then collide and leave with new speeds. The important idea is that total momentum before and after stays the same. In an elastic collision, kinetic energy also stays closer to constant. In an inelastic collision, some kinetic energy turns into sound, heat, or deformation instead.",
            "Momentum Conservation",
            "m1v1 + m2v2 = m1v1f + m2v2f",
            "Mass times velocity gives momentum for each object before and after impact.",
            ["momentum", "collisions", "conservation laws"],
            [
                "What if one object were much heavier?",
                "What changes if the collision is perfectly inelastic?",
                "How is this different from hitting a wall?",
            ],
        )

    if _contains_any(q, ["orbit", "satellite", "planet around", "space station", "kepler", "solar system", "black hole"]):
        return result(
            "orbit",
            "Orbiting Bodies and Gravity",
            {
                "bodies": [
                    {"label": "Low orbit satellite", "orbital_radius_au": 0.45, "period_years": 0.2, "color": "#4d8fe0", "size": 4},
                    {"label": "Planet A", "orbital_radius_au": 1.0, "period_years": 1.0, "color": "#ff8c42", "size": 8},
                    {"label": "Planet B", "orbital_radius_au": 1.8, "period_years": 2.4, "color": "#7c5cff", "size": 10},
                ]
            },
            "Objects in orbit are beyond gravity's reach.",
            "Orbit happens because gravity pulls inward while sideways motion keeps the body continuously missing the thing it is falling toward.",
            "Watch how the inner orbit completes much faster than the outer one. Gravity is always pulling these bodies inward, but their sideways speed keeps them moving around instead of straight in. That balance between inward pull and forward motion is what creates an orbit. The closer an object is, the stronger gravity is and the faster it must move.",
            "Centripetal Motion",
            "v^2 / r = GM / r^2",
            "The left side is the inward acceleration needed for circular motion, and the right side is gravity's pull.",
            ["gravity", "orbits", "centripetal acceleration"],
            [
                "What if the satellite moved faster?",
                "What if the orbit were farther from the star?",
                "How does escape velocity connect to this?",
            ],
        )

    if _contains_any(q, ["wave", "sound", "frequency", "wavelength", "light", "interference", "earthquake"]):
        return result(
            "wave",
            "Comparing Different Waves",
            {
                "waves": [
                    {"label": "Low frequency", "frequency_hz": 1.5, "amplitude": 0.9, "wavelength_m": 5.5, "color": "#4d8fe0"},
                    {"label": "Medium frequency", "frequency_hz": 3.0, "amplitude": 0.7, "wavelength_m": 3.2, "color": "#ff8c42"},
                    {"label": "High frequency", "frequency_hz": 5.5, "amplitude": 0.5, "wavelength_m": 1.9, "color": "#7c5cff"},
                ]
            },
            "Bigger waves always travel faster just because they look taller.",
            "Frequency, wavelength, and amplitude each describe different parts of a wave, and changing one does not automatically change the others in the same way.",
            "Notice how the high-frequency wave oscillates many more times across the same space. The lower-frequency wave spreads out with a longer wavelength. Amplitude tells you how tall the wave is, while frequency tells you how often it repeats. Those are different properties, and mixing them up is a common mistake.",
            "Wave Speed",
            "v = fλ",
            "Wave speed equals frequency times wavelength.",
            ["waves", "frequency", "wavelength", "amplitude"],
            [
                "What if we doubled the frequency?",
                "How is a sound wave different from a light wave?",
                "What happens when two waves interfere?",
            ],
        )

    if _contains_any(q, ["spring", "hooke", "hooke's law", "trampoline", "bungee", "elastic", "suspension"]):
        return result(
            "spring",
            "Springs, Mass, and Oscillation",
            {
                "springs": [
                    {"label": "Soft spring", "k_constant": 12, "mass_kg": 1.0, "color": "#4d8fe0"},
                    {"label": "Medium spring", "k_constant": 22, "mass_kg": 1.0, "color": "#ff8c42"},
                    {"label": "Stiff spring", "k_constant": 36, "mass_kg": 1.0, "color": "#7c5cff"},
                ]
            },
            "A stiffer spring always stretches farther.",
            "Stiffer springs resist displacement more strongly and oscillate faster for the same mass.",
            "Watch the softer spring stretch more and move more slowly, while the stiffer spring snaps back more quickly. Spring stiffness changes how much force you get for a given displacement. That also changes the oscillation period. The same mass behaves very differently depending on the spring constant.",
            "Hooke's Law",
            "F = -kx",
            "k is the spring constant and x is displacement from equilibrium. The minus sign means the force pulls back toward equilibrium.",
            ["springs", "Hooke's law", "oscillation"],
            [
                "What if the mass were doubled?",
                "What happens if damping removes energy each cycle?",
                "How does elastic potential energy fit into this?",
            ],
        )

    if _contains_any(q, ["throw", "launch", "projectile", "catapult", "cannon", "drop from", "arc", "trajectory"]):
        return result(
            "projectile",
            "Projectile Motion Comparison",
            {
                "scenarios": [
                    {"label": "30° launch", "v0": 20, "angle_deg": 30, "gravity": 9.81, "color": "#4d8fe0"},
                    {"label": "45° launch", "v0": 20, "angle_deg": 45, "gravity": 9.81, "color": "#ff8c42"},
                    {"label": "60° launch", "v0": 20, "angle_deg": 60, "gravity": 9.81, "color": "#7c5cff"},
                ]
            },
            "A steeper launch always goes farther.",
            "Launch angle changes height, airtime, and range in different ways, so the farthest shot is not simply the steepest one.",
            "Notice how the steep launch rises higher but lands closer, while the shallow one travels lower and faster. The 45-degree launch often gives the greatest range in this idealized case without air resistance. Horizontal and vertical motion combine to create the full arc. Gravity only accelerates the vertical part downward.",
            "Projectile Motion",
            "y = v0t sin(θ) - 1/2 gt^2",
            "v0 is launch speed, θ is launch angle, g is gravity, and t is time.",
            ["projectile motion", "gravity", "kinematics"],
            [
                "What if air resistance mattered?",
                "What if we changed the launch speed instead of the angle?",
                "How would this look on the Moon?",
            ],
        )

    if _contains_any(q, ["energy", "power", "efficiency", "battery", "fuel", "electricity", "work"]):
        return result(
            "energy_comparison",
            "Energy Comparison",
            {
                "bars": [
                    {"label": "Input energy", "value": 100, "unit": "J", "color": "#4d8fe0"},
                    {"label": "Useful output", "value": 72, "unit": "J", "color": "#50e080"},
                    {"label": "Lost to heat", "value": 28, "unit": "J", "color": "#ff8c42"},
                ]
            },
            "All input energy becomes useful work.",
            "Energy is conserved overall, but not all of it ends up in the form you want.",
            "Watch the energy amounts side by side. The total still balances, but some energy is transformed into less useful forms like heat or sound. That is why real systems are not perfectly efficient. Conservation of energy still holds the whole time.",
            "Efficiency",
            "efficiency = useful output / total input",
            "Efficiency compares the wanted energy output to the total energy supplied.",
            ["energy", "efficiency", "conservation of energy"],
            [
                "What if the system were more efficient?",
                "Where does the lost energy actually go?",
                "How does this connect to roller coaster friction?",
            ],
        )

    return None


async def interpret_with_llm(question: str, student_context: dict[str, Any]) -> dict[str, Any] | None:
    heuristic = _heuristic_dynamic_plan(question, student_context)
    if not OPENAI_API_KEY:
        return heuristic

    try:
        import httpx

        level = student_context.get("student_level", "middle_school")

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "temperature": 0.2,
                    "max_tokens": 1200,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": f"Student level: {level}\nQuestion: {question}"},
                    ],
                    "response_format": {"type": "json_object"},
                },
            )

        if resp.status_code != 200:
            logger.warning(f"OpenAI returned {resp.status_code}: {resp.text[:200]}")
            return heuristic

        body = resp.json()
        content = body["choices"][0]["message"]["content"]
        result = json.loads(content)
        if heuristic and _is_roller_coaster_question(question):
            logger.info("Forcing roller-coaster prompt to dedicated coaster renderer")
            return heuristic
        logger.info(f"LLM classified as: {result.get('sim_type', result.get('domain', 'unknown'))}")
        return result

    except Exception as e:
        logger.warning(f"LLM interpreter failed: {e}")
        return heuristic


# ── Physics computation for each sim type ───────────────────────────────────

def _compute_projectile(params: dict) -> dict[str, Any]:
    scenarios = params.get("scenarios", [])
    if params.get("coaster_mode"):
        track_length = float(params.get("track_length_m", 120))
        loop_radius = float(params.get("loop_radius_m", 12))
        computed = []
        for s in scenarios:
            g = float(s.get("gravity", 9.81))
            hill_height = max(1.0, float(s.get("hill_height_m", 24)))
            loss_fraction = max(
                0.0,
                min(
                    0.85,
                    float(s.get("friction_loss_fraction", params.get("friction_loss_fraction", 0))),
                ),
            )
            ideal_speed = math.sqrt(max(0.0, (1 - loss_fraction) * 2 * g * hill_height))
            loop_top_min_speed = math.sqrt(g * loop_radius)
            estimated_ride_time = track_length / max(ideal_speed * 0.68, 1.0)
            computed.append({
                "label": s.get("label", f"{round(hill_height)} m hill"),
                "color": s.get("color", "#4d8fe0"),
                "v0": round(ideal_speed, 2),
                "angle_deg": 0,
                "gravity": g,
                "max_height_m": round(hill_height, 2),
                "range_m": round(track_length, 2),
                "flight_time_s": round(estimated_ride_time, 3),
                "loop_top_min_speed_m_s": round(loop_top_min_speed, 2),
                "energy_loss_percent": round(loss_fraction * 100, 1),
                "can_complete_loop": ideal_speed >= loop_top_min_speed,
                "keyframes": [],
            })
        return {"trajectories": computed, "coaster_mode": True, "track_length_m": track_length, "loop_radius_m": loop_radius}

    if not scenarios:
        scenarios = [
            {"label": "45°", "v0": params.get("v0", 20), "angle_deg": 45, "gravity": params.get("gravity", 9.81), "color": "#4d8fe0"},
            {"label": "30°", "v0": params.get("v0", 20), "angle_deg": 30, "gravity": params.get("gravity", 9.81), "color": "#e05050"},
            {"label": "60°", "v0": params.get("v0", 20), "angle_deg": 60, "gravity": params.get("gravity", 9.81), "color": "#50e080"},
        ]

    # Fix degenerate angles — 0° gives flat trajectory, bump to 15° minimum
    for s in scenarios:
        if abs(s.get("angle_deg", 0)) < 5:
            s["angle_deg"] = 45

    computed = []
    for s in scenarios:
        v0 = s.get("v0", 20)
        angle = math.radians(s.get("angle_deg", 45))
        g = s.get("gravity", 9.81)
        vx = v0 * math.cos(angle)
        vy = v0 * math.sin(angle)
        t_flight = 2 * vy / g
        max_height = (vy ** 2) / (2 * g)
        range_m = vx * t_flight

        keyframes = []
        steps = 30
        for i in range(steps + 1):
            t = t_flight * i / steps
            x = vx * t
            y = max(0.0, vy * t - 0.5 * g * t * t)
            keyframes.append({"t": round(t, 3), "x": round(x, 3), "y": round(y, 4)})

        computed.append({
            "label": s.get("label", f"{s.get('angle_deg', 45)}°"),
            "color": s.get("color", "#4d8fe0"),
            "v0": v0,
            "angle_deg": s.get("angle_deg", 45),
            "gravity": g,
            "max_height_m": round(max_height, 2),
            "range_m": round(range_m, 2),
            "flight_time_s": round(t_flight, 3),
            "keyframes": keyframes,
        })

    return {"trajectories": computed}


def _compute_pendulum(params: dict) -> dict[str, Any]:
    lengths = params.get("lengths", [0.5, 1.0, 2.0])
    g = params.get("gravity", 9.81)
    labels = params.get("labels", [f"{l}m" for l in lengths])
    colors = params.get("colors", ["#4d8fe0", "#e05050", "#50e080", "#e0c050"])

    pendulums = []
    for i, L in enumerate(lengths):
        period = 2 * math.pi * math.sqrt(L / g)
        pendulums.append({
            "label": labels[i] if i < len(labels) else f"{L}m",
            "length_m": L,
            "period_s": round(period, 3),
            "color": colors[i] if i < len(colors) else "#4d8fe0",
        })

    return {"pendulums": pendulums, "gravity": g}


def _compute_energy(params: dict) -> dict[str, Any]:
    return {"bars": params.get("bars", [])}


def _compute_collision(params: dict) -> dict[str, Any]:
    objects = params.get("objects", [])
    collision_type = params.get("collision_type", "elastic")

    if len(objects) >= 2 and collision_type == "elastic":
        m1, v1 = objects[0].get("mass_kg", 1), objects[0].get("velocity_m_s", 5)
        m2, v2 = objects[1].get("mass_kg", 1), objects[1].get("velocity_m_s", -3)
        v1f = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2)
        v2f = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2)
        objects[0]["final_velocity_m_s"] = round(v1f, 2)
        objects[1]["final_velocity_m_s"] = round(v2f, 2)
    elif len(objects) >= 2:
        m1, v1 = objects[0].get("mass_kg", 1), objects[0].get("velocity_m_s", 5)
        m2, v2 = objects[1].get("mass_kg", 1), objects[1].get("velocity_m_s", -3)
        vf = (m1 * v1 + m2 * v2) / (m1 + m2)
        objects[0]["final_velocity_m_s"] = round(vf, 2)
        objects[1]["final_velocity_m_s"] = round(vf, 2)

    return {"objects": objects, "collision_type": collision_type}


def _compute_orbit(params: dict) -> dict[str, Any]:
    return {"bodies": params.get("bodies", [])}


def _compute_wave(params: dict) -> dict[str, Any]:
    return {"waves": params.get("waves", [])}


def _compute_spring(params: dict) -> dict[str, Any]:
    springs = params.get("springs", [])
    for s in springs:
        k = s.get("k_constant", 10)
        m = s.get("mass_kg", 1)
        period = 2 * math.pi * math.sqrt(m / k)
        s["period_s"] = round(period, 3)
        s["frequency_hz"] = round(1 / period, 3) if period > 0 else 0
    return {"springs": springs}


COMPUTE_MAP = {
    "projectile": _compute_projectile,
    "pendulum": _compute_pendulum,
    "energy_comparison": _compute_energy,
    "collision": _compute_collision,
    "orbit": _compute_orbit,
    "wave": _compute_wave,
    "spring": _compute_spring,
}


def _build_journey_waypoints(sim_type: str, computed: dict, teaching: dict) -> list[dict]:
    """Generate camera waypoints for the guided journey mode."""
    transcript = teaching.get("transcript", "")
    sentences = [s.strip() for s in transcript.replace("!", ".").split(".") if s.strip()]

    if sim_type == "projectile":
        return [
            {"id": "overview", "time": 0, "label": "Overview", "narration": sentences[0] if len(sentences) > 0 else "Let's explore this roller coaster!", "cameraPos": [0, 8, 24], "cameraTarget": [0, 3, 0]},
            {"id": "climb", "time": 3, "label": "The Climb", "narration": sentences[1] if len(sentences) > 1 else "Watch as potential energy builds during the climb.", "cameraPos": [-8, 6.5, 13], "cameraTarget": [-8, 4, 0]},
            {"id": "drop", "time": 6, "label": "The Drop", "narration": sentences[2] if len(sentences) > 2 else "Potential energy converts to kinetic energy in the drop!", "cameraPos": [-4, 4, 12], "cameraTarget": [-4, 1.4, 0]},
            {"id": "loop", "time": 9, "label": "The Loop", "narration": sentences[3] if len(sentences) > 3 else "Centripetal force keeps the car on the track through the loop.", "cameraPos": [0.5, 5.5, 12], "cameraTarget": [0, 3.4, 0]},
            {"id": "finish", "time": 12, "label": "Summary", "narration": teaching.get("core_takeaway", "Energy transforms between kinetic and potential throughout the ride."), "cameraPos": [0, 7, 22], "cameraTarget": [0, 3, 0]},
        ]
    elif sim_type == "pendulum":
        return [
            {"id": "overview", "time": 0, "label": "The Swing Set", "narration": sentences[0] if len(sentences) > 0 else "Let's look at these pendulums!", "cameraPos": [0, 4, 14], "cameraTarget": [0, 3, 0]},
            {"id": "motion", "time": 3, "label": "Swing Motion", "narration": sentences[1] if len(sentences) > 1 else "Watch how the swing converts between potential and kinetic energy.", "cameraPos": [3, 3, 8], "cameraTarget": [0, 4, 0]},
            {"id": "comparison", "time": 6, "label": "Length Matters", "narration": sentences[2] if len(sentences) > 2 else "Longer pendulums swing more slowly — period depends on length.", "cameraPos": [-4, 2, 10], "cameraTarget": [0, 3, 0]},
            {"id": "finish", "time": 9, "label": "Summary", "narration": teaching.get("core_takeaway", "A pendulum's period depends only on its length and gravity."), "cameraPos": [0, 4, 14], "cameraTarget": [0, 3, 0]},
        ]
    elif sim_type == "collision":
        return [
            {"id": "overview", "time": 0, "label": "The Setup", "narration": sentences[0] if len(sentences) > 0 else "Here's our collision experiment!", "cameraPos": [0, 5, 12], "cameraTarget": [0, 0.9, 0]},
            {"id": "approach", "time": 3, "label": "Before Impact", "narration": sentences[1] if len(sentences) > 1 else "The objects approach each other with their initial momentum.", "cameraPos": [-3, 2, 6], "cameraTarget": [0, 0.9, 0]},
            {"id": "impact", "time": 6, "label": "Collision!", "narration": sentences[2] if len(sentences) > 2 else "Momentum is always conserved — watch the velocities change!", "cameraPos": [0, 2, 5], "cameraTarget": [0, 0.9, 0]},
            {"id": "finish", "time": 9, "label": "Summary", "narration": teaching.get("core_takeaway", "Total momentum before and after is the same."), "cameraPos": [2, 4, 10], "cameraTarget": [0, 0.9, 0]},
        ]
    elif sim_type == "orbit":
        return [
            {"id": "overview", "time": 0, "label": "The System", "narration": sentences[0] if len(sentences) > 0 else "Welcome to this orbital system!", "cameraPos": [5, 10, 18], "cameraTarget": [0, 0, 0]},
            {"id": "star", "time": 3, "label": "The Star", "narration": sentences[1] if len(sentences) > 1 else "The central star provides the gravitational pull.", "cameraPos": [2, 3, 5], "cameraTarget": [0, 0, 0]},
            {"id": "orbits", "time": 6, "label": "Orbital Paths", "narration": sentences[2] if len(sentences) > 2 else "Closer planets orbit faster — Kepler's third law in action.", "cameraPos": [8, 6, 12], "cameraTarget": [0, 0, 0]},
            {"id": "finish", "time": 9, "label": "Summary", "narration": teaching.get("core_takeaway", "Gravity and orbital speed are balanced in each orbit."), "cameraPos": [4, 8, 16], "cameraTarget": [0, 0, 0]},
        ]
    elif sim_type == "wave":
        return [
            {"id": "overview", "time": 0, "label": "Wave Motion", "narration": sentences[0] if len(sentences) > 0 else "Let's explore wave behavior!", "cameraPos": [0, 5, 12], "cameraTarget": [0, 1.5, 0]},
            {"id": "properties", "time": 3, "label": "Amplitude & Frequency", "narration": sentences[1] if len(sentences) > 1 else "Higher frequency means more oscillations per second.", "cameraPos": [5, 3, 8], "cameraTarget": [0, 1.5, 0]},
            {"id": "comparison", "time": 6, "label": "Comparing Waves", "narration": sentences[2] if len(sentences) > 2 else "Notice how wavelength and frequency are inversely related.", "cameraPos": [-4, 4, 10], "cameraTarget": [0, 1.5, 0]},
            {"id": "finish", "time": 9, "label": "Summary", "narration": teaching.get("core_takeaway", "Waves carry energy through oscillation."), "cameraPos": [0, 5, 12], "cameraTarget": [0, 1.5, 0]},
        ]
    elif sim_type == "spring":
        return [
            {"id": "overview", "time": 0, "label": "Spring System", "narration": sentences[0] if len(sentences) > 0 else "Here are springs with different properties!", "cameraPos": [0, 4, 14], "cameraTarget": [0, 3, 0]},
            {"id": "oscillation", "time": 3, "label": "Oscillation", "narration": sentences[1] if len(sentences) > 1 else "Springs convert between elastic potential and kinetic energy.", "cameraPos": [3, 3, 8], "cameraTarget": [0, 3.5, 0]},
            {"id": "stiffness", "time": 6, "label": "Stiffness Effect", "narration": sentences[2] if len(sentences) > 2 else "Stiffer springs oscillate faster — higher k means shorter period.", "cameraPos": [-3, 3, 10], "cameraTarget": [0, 3, 0]},
            {"id": "finish", "time": 9, "label": "Summary", "narration": teaching.get("core_takeaway", "Period depends on mass and spring constant."), "cameraPos": [0, 3.5, 14], "cameraTarget": [0, 3, 0]},
        ]
    else:
        return [
            {"id": "overview", "time": 0, "label": "Overview", "narration": sentences[0] if len(sentences) > 0 else "Let's explore this!", "cameraPos": [0, 5, 16], "cameraTarget": [0, 2, 0]},
            {"id": "detail", "time": 4, "label": "Key Details", "narration": sentences[1] if len(sentences) > 1 else "Here are the important differences.", "cameraPos": [4, 4, 10], "cameraTarget": [0, 2, 0]},
            {"id": "finish", "time": 8, "label": "Summary", "narration": teaching.get("core_takeaway", "Here is the key physics insight."), "cameraPos": [0, 5, 16], "cameraTarget": [0, 2, 0]},
        ]


def build_dynamic_scenario(llm_result: dict[str, Any], question: str) -> dict[str, Any]:
    sim_type = llm_result.get("sim_type", "energy_comparison")
    teaching = llm_result.get("teaching", {})

    return {
        "scenario_id": f"scenario_{uuid.uuid4().hex[:8]}",
        "title": llm_result.get("title", "Physics Simulation"),
        "domain": "dynamic",
        "student_question": question,
        "concepts": llm_result.get("concepts", []),
        "objects": [],
        "environment": {},
        "known_values": {},
        "unknown_values": {},
        "assumptions": [],
        "safety": {"allowed": True, "risk_level": "low", "notes": []},
        "simulation_plan": {"engine": "dynamic"},
        "teaching_plan": {
            "level": "middle_school",
            "misconception_to_address": teaching.get("misconception", ""),
            "core_takeaway": teaching.get("core_takeaway", ""),
        },
        "dynamic_config": llm_result,
    }


def build_dynamic_simulation_payload(scenario: dict[str, Any]) -> dict[str, Any]:
    config = scenario.get("dynamic_config", {})
    sim_type = config.get("sim_type", "energy_comparison")
    params = config.get("params", {})
    teaching = config.get("teaching", {})

    compute_fn = COMPUTE_MAP.get(sim_type, _compute_energy)
    computed = compute_fn(params)

    journey_waypoints = _build_journey_waypoints(sim_type, computed, teaching)

    return {
        "type": "dynamic",
        "sim_type": sim_type,
        "title": config.get("title", scenario.get("title", "Simulation")),
        "computed": computed,
        "equation": {
            "label": teaching.get("equation_label", ""),
            "formula": teaching.get("equation_formula", ""),
            "explanation": teaching.get("equation_explanation", ""),
        },
        "takeaway": teaching.get("core_takeaway", ""),
        "concepts": scenario.get("concepts", []),
        "labels": [teaching.get("core_takeaway", "")],
        "journey_waypoints": journey_waypoints,
    }


def build_dynamic_teaching(scenario: dict[str, Any], sim_payload: dict[str, Any], student_context: dict[str, Any]) -> dict[str, Any]:
    config = scenario.get("dynamic_config", {})
    teaching = config.get("teaching", {})

    transcript = teaching.get("transcript", "")
    if not transcript:
        transcript = f"Let me show you: {teaching.get('core_takeaway', 'Here is the simulation.')}"

    followups = teaching.get("followups", ["Want to explore a related concept?", "What if we changed the conditions?"])

    return {
        "transcript": transcript,
        "key_takeaway": teaching.get("core_takeaway", ""),
        "concepts_explained": scenario.get("concepts", []),
        "misconceptions_corrected": [teaching.get("misconception", "")] if teaching.get("misconception") else [],
        "followups": followups[:3],
        "visual_style_instructions": {
            "lead_with": "animation",
            "diagram_density": "medium",
            "equation_card": True,
            "pace": "quick_then_deeper",
            "voice_style": "friendly_excited",
        },
        "adaptation_note": "",
    }
