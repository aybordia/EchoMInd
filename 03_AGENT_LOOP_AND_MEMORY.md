# EchoMind Agent Loop And Memory Architecture

## 1. Goal

EchoMind should feel agentic because it does more than answer. It interprets, builds, simulates, teaches, extends, and remembers.

The agent loop is the product.

```text
INTERPRET -> PLAN -> BUILD -> SIMULATE -> RENDER -> TEACH -> EXTEND -> REMEMBER
```

## 2. Agent Responsibilities

The agent owns the full learning cycle:

- understand the student's question
- decide what kind of simulation is needed
- make safe simplifications
- generate scene parameters
- run or request simulation
- inspect results
- produce explanation
- generate next curiosity prompt
- store memory

The agent should never simply say:

```text
I can't simulate that.
```

Instead it should say:

```text
I can model a simplified version that shows the core physics.
```

## 3. Agent Modes

### Mode A - WhatIf Question

Input:

```text
What if I dropped a bowling ball and a feather on the Moon?
```

Output:

- scenario JSON
- simulation
- diagram
- spoken explanation
- follow-up suggestions

### Mode B - Video Digital Twin

Input:

- uploaded real-world video
- optional prompt: "Explain this ramp motion."

Output:

- detected objects
- reconstructed simplified scene
- digital twin simulation
- concept explanation
- follow-up suggestions

### Mode C - Molecular Interaction

Input:

```text
What happens when these two molecules come together?
```

Output:

- molecule identification
- simplified interaction model
- molecular visualization
- forces/charges diagram
- chemistry explanation
- safety and accuracy notes

### Mode D - Science Lab

Input:

```text
Move this chemical to the petri dish.
```

Output:

- action plan
- lab state update
- safety check
- simulated reaction/observation
- explanation

## 4. Scenario Interpreter

The scenario interpreter converts open-ended language into structured science tasks.

### Required Output Schema

```json
{
  "title": "string",
  "domain": "rigid_body | molecular | fluid | structural | lab | video_twin | diagram_only",
  "student_question": "string",
  "concepts": ["string"],
  "objects": [],
  "environment": {},
  "known_values": {},
  "unknown_values": {},
  "assumptions": [],
  "safety": {
    "allowed": true,
    "risk_level": "low | medium | high",
    "notes": []
  },
  "simulation_plan": {
    "engine": "mujoco | threejs | molecule | blender | analytic | video_api | hybrid",
    "duration_s": 5,
    "comparison_count": 1,
    "needs_cinematic_render": true,
    "needs_diagram": true
  },
  "teaching_plan": {
    "level": "elementary | middle_school | high_school | college",
    "misconception_to_address": "string or null",
    "core_takeaway": "string"
  }
}
```

## 5. Planning Rules

### Rule 1 - Prefer Simple Correct Models

For hackathon reliability, a simplified correct model beats an ambitious wrong one.

Examples:

- Earth stopping: simulate a ball on a suddenly stopped rotating platform.
- Bridge cable removal: simulate a simplified truss/cable network, not a full bridge FEA.
- Molecules: visualize charges and bonds, not full quantum chemistry.
- Diet Coke/Mentos: simulate pressure/nucleation conceptually, not true CFD.

### Rule 2 - Always State Assumptions

Every explanation should include what was simplified.

Example:

```text
I modeled the feather as a light flat object and turned air resistance off to match the Moon's vacuum.
```

### Rule 3 - Use Comparisons When They Teach Fast

If a scenario is clearer with comparison, run variants.

Examples:

- Moon vs Earth vs Jupiter
- vacuum vs air
- low friction vs high friction
- small bottle vs 10x bottle

### Rule 4 - Never Teach Unsafe Action As Instruction

For dangerous experiments, show simulated concepts and safety warnings.

Do not provide actionable hazardous instructions for:

- explosives
- toxic chemistry
- weapons
- unsafe biological procedures
- dangerous human experiments

### Rule 5 - Always Extend Curiosity

Every result should include at least two follow-up options:

- one nearby variation
- one surprising deeper variation

Example:

```json
[
  "Want to add air resistance?",
  "Want to see how this becomes orbital motion?"
]
```

## 6. Memory Model

EchoMind memory should track learning, not just chat history.

Backboard's job is to answer this question over time:

```text
What is the best way to teach this specific student?
```

That means EchoMind should remember both science understanding and presentation preferences.

### Student Memory Fields

```json
{
  "user_id": "user_abc",
  "interests": ["space", "chemistry", "collisions"],
  "concepts_seen": ["gravity", "momentum", "friction"],
  "misconceptions_corrected": [
    {
      "misconception": "heavier objects always fall faster",
      "corrected_by": "Moon feather and bowling ball sim",
      "date": "..."
    }
  ],
  "preferred_explanation_level": "middle_school",
  "favorite_visual_style": "cinematic_with_labels",
  "learning_style": ["visual_animations", "real_world_analogies"],
  "presentation_preferences": {
    "math_level": "light_equations",
    "pace": "quick_then_deeper",
    "voice_style": "friendly_excited",
    "diagram_density": "high",
    "analogy_preference": "everyday_examples"
  },
  "feedback_history": [
    {
      "job_id": "job_123",
      "rating": 5,
      "chips": ["more_visuals", "show_equation_next"],
      "free_text": "The animation helped, but I want the equation too."
    }
  ],
  "recent_scenarios": [],
  "next_recommended_questions": []
}
```

### Onboarding Memory

Before the first major simulation, EchoMind should ask a short onboarding flow and store it in Backboard.

Recommended onboarding questions:

1. What grade or level should I teach at?
2. Do you learn best through visuals, equations, stories, real examples, or hands-on experiments?
3. Do you prefer quick answers or deeper breakdowns?
4. Which science topics are you most curious about?
5. Should the avatar sound calm, excited, funny, or professor-like?

Backboard write example:

```text
Onboarding: user is a high-school student, prefers visual animations and real-world analogies, wants quick explanations first with optional deeper math, likes space and chemistry, and prefers an excited friendly tutor voice.
```

### Memory Writes

Write memory after:

- every completed WhatIf sim
- every uploaded video twin explanation
- every lab experiment
- every answered follow-up
- every corrected misconception
- onboarding completion
- every 1-5 star rating
- feedback chips and free-text comments
- presentation behavior such as replay, skip, pause, follow-up click, and request for more detail

### Memory Reads

Read memory before:

- generating a new explanation
- selecting follow-ups
- choosing explanation level
- connecting a new question to previous concepts
- choosing visual style
- choosing amount of math
- choosing voice tone
- deciding whether to lead with animation, analogy, equation, or experiment

Example:

```text
Remember when you asked about car crashes? This is the same conservation-of-momentum idea, but now in a pendulum.
```

## 7. Backboard Or Local Memory

> The concrete, buildable version of everything in §6–§7 — the memory file format,
> the manager API, the deterministic adaptation rules, and the Backboard adapter —
> is in [`08_BACKBOARD_MEMORY_AND_LEARNING.md`](08_BACKBOARD_MEMORY_AND_LEARNING.md).
> Decision: the local memory file is always-on and is the runtime source of truth;
> Backboard is the durable sync target. The product never blocks on Backboard.

If Backboard access is available, use it as the durable memory system.

Backend-only usage:

- frontend never calls memory APIs directly
- backend sends messages and memories with `user_id`
- backend retrieves student context before scenario interpretation and tutor generation
- backend writes structured feedback after each completed job

If Backboard is unavailable, use local JSON or SQLite fallback:

```text
backend/data/memory/{user_id}.json
```

The product should never fail because memory is unavailable.

### Backboard Feedback / Implement Loop

The loop should be:

```text
OBSERVE -> STORE -> ADAPT -> TEST -> STORE AGAIN
```

1. Observe what happened:
   - rating
   - feedback chips
   - whether the student replayed the video
   - whether they clicked a follow-up
   - whether they asked "explain simpler" or "show the equation"
2. Store the pattern in Backboard.
3. Adapt the next explanation:
   - more diagrams
   - less math
   - slower narration
   - more equations
   - more analogies
   - more realistic render style
4. Test whether adaptation helped through the next rating.
5. Store the result again.

Example:

```text
Student rated the ramp digital twin 2/5 and selected "too fast" and "more diagrams". For future mechanics explanations, slow down narration, add a force diagram before the animation, and avoid jumping directly to formulas.
```

## 8. Agent Job State

Each agent request should create a job.

Job object:

```json
{
  "job_id": "job_123",
  "user_id": "user_abc",
  "session_id": "session_abc",
  "question": "What if I jumped on Jupiter?",
  "stage": "planning",
  "scenario": null,
  "simulation_result": null,
  "render_result": null,
  "teaching_result": null,
  "error": null,
  "fallback_used": false
}
```

## 9. Agent Status Messages

Send frontend-friendly updates:

```text
Listening...
Understanding your question...
Choosing the physics model...
Building the scene...
Running the simulation...
Rendering the explanation...
Preparing the voiceover...
Done.
```

These messages matter because they make the autonomy visible.

## 10. Prompting Strategy

### Interpreter Prompt

The interpreter prompt should force JSON and prevent overclaiming.

Key instruction:

```text
If exact simulation is impossible, choose a simplified simulation that accurately demonstrates the main physics principle. Include simplifications in assumptions.
```

### Tutor Prompt

The tutor prompt should create short educational narration.

Target style:

- clear
- cinematic
- student-friendly
- not too long
- one misconception correction
- one memorable line

### Follow-Up Prompt

The follow-up generator should produce questions that make the student keep exploring.

Good follow-ups:

- change one variable
- compare a different environment
- connect to another domain
- ask a surprising edge case

Bad follow-ups:

- generic "Want to learn more?"
- too broad
- unrelated

## 11. Safety Filter

Before building a scenario, classify safety.

Allowed:

- classroom physics
- safe chemistry concepts
- astronomy
- mechanics
- biology education without procedural wetlab detail

Allowed with caution:

- dangerous chemistry shown conceptually
- crashes/explosions as physics explanations
- natural disasters as simplified models

Disallowed or heavily restricted:

- instructions to build weapons
- instructions for explosives
- harmful biological protocols
- unsafe human experimentation

For restricted topics, the agent can simulate harmless analogies.

Example:

```text
I can't help create an explosive setup, but I can simulate pressure buildup using a safe sealed-air model.
```

## 12. Success Criteria

The agent loop is successful when:

- it turns open-ended questions into structured scenario JSON
- it chooses appropriate engines automatically
- it uses fallbacks without exposing ugly failures
- it speaks an explanation tied to the simulation result
- it suggests smart follow-ups
- it remembers concepts across sessions
