# EchoMind

> A voice-driven curiosity engine that turns any student question or real-world
> video into a physics-aware simulation, a **cinematic 3D explainer**, and an
> interactive learning loop that **remembers how each student learns best**.

EchoMind lets a student ask "what if?" out loud, upload a real-world clip, or
enter a virtual science lab. An autonomous agent then builds the right
simulation, renders it as a polished real-time 3D scene, explains the science
with voice, suggests the next curiosity path, and **stores what it learned about
the student** so every future explanation is more personal.

---

## The Two Non-Negotiables

This project lives or dies on two things. Everything in these docs serves them.

### 1. It must LOOK REAL

The output must feel like a premium short-form cinematic science explainer:
glossy 3D, real lighting, soft shadows, bloom, depth of field, smooth camera
choreography, force arrows and labels living in 3D space. **Not flat diagrams.
Not a physics-class applet.** The guaranteed look is delivered by a real-time
WebGL engine (React Three Fiber + postprocessing + PBR materials + HDRI image-
based lighting). AI video generation is an optional polish layer on top, never a
dependency.

→ Spec: [`07_CINEMATIC_RENDER_ENGINE.md`](07_CINEMATIC_RENDER_ENGINE.md)

### 2. It must KEEP LEARNING THE STUDENT

EchoMind is not a one-shot answer machine. After every interaction it writes what
it learned — favorite topics, misconceptions corrected, preferred pace, math
tolerance, voice tone, what they replayed, what they skipped — and reads it back
before the next answer. This "constant context learning" lives **on a file**
(always-on local memory) and syncs to **Backboard** as the durable brain.

→ Spec: [`08_BACKBOARD_MEMORY_AND_LEARNING.md`](08_BACKBOARD_MEMORY_AND_LEARNING.md)

---

## Architecture Index

Read in this order. Each file is meant to be precise enough that building it is
mechanical.

| # | File | What it nails down |
| --- | --- | --- |
| 01 | [`01_PRODUCT_VISION_AND_SCOPE.md`](01_PRODUCT_VISION_AND_SCOPE.md) | What we are building, for whom, MVP scope, the wow factor |
| 02 | [`02_SYSTEM_ARCHITECTURE.md`](02_SYSTEM_ARCHITECTURE.md) | Modules, routes, API contracts, the shared data objects |
| 03 | [`03_AGENT_LOOP_AND_MEMORY.md`](03_AGENT_LOOP_AND_MEMORY.md) | The agent loop, planning rules, safety, memory model |
| 04 | [`04_SIMULATION_VIDEO_DIGITAL_TWIN_ARCHITECTURE.md`](04_SIMULATION_VIDEO_DIGITAL_TWIN_ARCHITECTURE.md) | Simulation modes, the Truth Layer, video digital twin |
| 05 | [`05_FRONTEND_VOICE_AVATAR_AND_LAB_ARCHITECTURE.md`](05_FRONTEND_VOICE_AVATAR_AND_LAB_ARCHITECTURE.md) | Next.js app, voice, avatar, viewer components, lab shell |
| 06 | [`06_BACKEND_API_AND_SERVICE_SPEC.md`](06_BACKEND_API_AND_SERVICE_SPEC.md) | FastAPI services, schemas, job system, build plan |
| 07 | [`07_CINEMATIC_RENDER_ENGINE.md`](07_CINEMATIC_RENDER_ENGINE.md) | **The "looks real" engine**: scene spec, lighting, materials, postFX, camera |
| 08 | [`08_BACKBOARD_MEMORY_AND_LEARNING.md`](08_BACKBOARD_MEMORY_AND_LEARNING.md) | **The constant-context-learning loop**: file format, adapter, adaptation rules |
| — | [`FINAL_IMPLEMENTATION_FILE.md`](FINAL_IMPLEMENTATION_FILE.md) | Step-by-step build order once architecture is locked |

## The North Star (two layers)

```text
TRUTH LAYER  (deterministic, physics-aware)   ->   CinematicSceneSpec   ->   CINEMATIC LAYER (real-time 3D, beautiful)
  scenario params, equations, trajectories          the hand-off contract        PBR + HDRI + postFX + camera + labels
```

The Truth Layer prevents hallucinated science. The Cinematic Layer wins the room.
The [`CinematicSceneSpec`](07_CINEMATIC_RENDER_ENGINE.md#2-the-cinematicscenespec-contract)
is the single contract that connects them — produce it correctly and the renderer
is "just code."

## Status

Architecture phase. No application code yet. Build order is in
[`FINAL_IMPLEMENTATION_FILE.md`](FINAL_IMPLEMENTATION_FILE.md).
</content>
</invoke>
