# FINAL_IMPLEMENTATION_FILE.md - EchoMind Step-By-Step Build Instructions

> Purpose: This is the file Claude Code should follow when it is time to stop architecting and start building.
> Goal: Build the smallest possible EchoMind MVP that actually works, looks judge-impressive, and does not collapse because one external API fails.
> Rule: Do not wander. Do not overbuild. Complete the steps in order.

## 0. Product Target

EchoMind is a voice-driven science simulation tutor.

The MVP must do four things extremely well:

1. Let a student ask a WhatIf question by voice or text.
2. Generate a structured science scenario and run/render a simulation.
3. Produce a cinematic 3D explainer with clean diagrams, labels, and voice narration.
4. Learn the student's presentation preferences through onboarding, ratings, and Backboard memory.

The MVP must support these three demo cases first:

1. Planet jump comparison.
2. Molecular interaction visualization.
3. Uploaded ramp/box video to digital twin.

Everything else is future expansion.

## 1. Ruthless Scope

### Build Now

Build only:

- app foundation
- onboarding
- ask page
- agent job system
- planet jump demo
- molecule interaction demo
- ramp video digital twin demo
- cinematic 3D viewer/diagrams
- voice narration
- Backboard adaptive memory
- feedback/rating loop

### Do Not Build Yet

Do not build:

- full arbitrary physics engine for every possible question
- full chemical reaction simulator
- true quantum chemistry
- full fluid simulation
- full science lab mode
- realistic human avatar talking head
- teacher dashboard
- accounts/auth beyond local `user_id`
- multiplayer classroom
- mobile app
- perfect photogrammetry

### Fake Gracefully If Needed

It is acceptable to use deterministic templates for the three MVP demos as long as the app still feels generated and agentic.

The demo can say:

```text
For speed and reliability, EchoMind chooses a simplified physics model that captures the core principle.
```

That is better than attempting everything and failing.

## 2. Visual Quality Bar

> The concrete, buildable version of this bar — exact stack, materials, lighting,
> postFX, camera, and a per-scene acceptance checklist — is in
> [`07_CINEMATIC_RENDER_ENGINE.md`](07_CINEMATIC_RENDER_ENGINE.md). This section is
> the summary; 07 is the law.

The visuals must feel like a premium cinematic short-form science explainer: glossy
3D, real lighting, clean labels, smooth camera motion. **Flat diagrams or an
unstyled physics applet are a failure, not an MVP.**

Implement these concrete visual traits (all guaranteed by the real-time 3D engine):

- HDRI image-based lighting (real reflections) + a warm 3-point rig
- glossy PBR materials (never flat colors)
- soft contact shadows under every object
- postFX: ACES tone mapping, bloom, SSAO, subtle depth of field, vignette
- eased camera choreography with a slow-motion hero moment
- force arrows and labels living in 3D space
- split-screen comparisons
- title / callout / equation / final-takeaway beat cards
- dark graded premium background, never white/default
- no raw developer UI

The target polish: high-end product-render clarity applied to science, with crisp
labels. If a scene does not pass the 07 §13 checklist, it is not done.

## 3. Final Architecture To Implement

Read these first:

1. `01_PRODUCT_VISION_AND_SCOPE.md`
2. `02_SYSTEM_ARCHITECTURE.md`
3. `03_AGENT_LOOP_AND_MEMORY.md`
4. `04_SIMULATION_VIDEO_DIGITAL_TWIN_ARCHITECTURE.md`
5. `05_FRONTEND_VOICE_AVATAR_AND_LAB_ARCHITECTURE.md`
6. `06_BACKEND_API_AND_SERVICE_SPEC.md`
7. `07_CINEMATIC_RENDER_ENGINE.md` — **the "looks real" engine; read before any 3D work**
8. `08_BACKBOARD_MEMORY_AND_LEARNING.md` — **the constant-context-learning loop**

Then build according to this file.

Two things are the soul of this product and must never be cut to save time: the
**real-time 3D cinematic look** (07) and the **constant-context learning** (08).

## 4. Recommended Repo Structure

Create:

```text
backend/
  main.py
  requirements.txt
  routers/
    agent_router.py
    video_twin_router.py
    memory_router.py
  services/
    scenario_interpreter.py
    simulation_templates.py
    render_director.py          # builds the CinematicSceneSpec (07)
    tutor_agent.py
    memory_manager.py           # always-on memory file (08)
    backboard_client.py         # Backboard adapter (08 §6)
    voice_service.py
    video_twin.py
  models/
    schemas.py
  static/
    jobs/
  data/
    memory/                     # {user_id}.json constant-context learning files

frontend/
  package.json
  app/
    layout.tsx
    globals.css
    page.tsx
    ask/page.tsx
    onboarding/page.tsx
    video-twin/page.tsx
  components/
    AskBar.tsx
    AgentTimeline.tsx
    SimulationViewer.tsx        # thin wrapper around cinematic/CinematicStage
    DiagramOverlay.tsx
    TutorPanel.tsx
    FeedbackModal.tsx
    VideoTwinCompare.tsx
    cinematic/                  # the real-time 3D engine (07 §11)
      CinematicStage.tsx
      SceneEnvironment.tsx
      GradeComposer.tsx
      CameraDirector.tsx
      SceneObjects.tsx
      Trajectory.tsx
      ForceArrow.tsx
      Label3D.tsx
      BeatOverlay.tsx
      MaterialLibrary.ts
      usePerfTier.ts
      useMasterClock.ts
      presets/
        planetJump.ts
        molecule.ts
        moonDrop.ts
        rampBox.ts
  lib/
    api.ts
    types.ts                    # includes CinematicSceneSpec + AgentResult types
    speech.ts
    websocket.ts
```

Do not create extra folders unless required.

## 5. Environment Variables

Backend `.env.example`:

```text
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
BACKBOARD_API_KEY=
RUNWAY_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
ECHOMIND_MEMORY_MODE=backboard_or_local
ECHOMIND_RENDER_MODE=threejs_first
```

Frontend `.env.local.example`:

```text
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

Important:

- Never expose API keys in frontend.
- All OpenAI, ElevenLabs, Runway, and Backboard calls happen in backend.
- Frontend receives URLs, JSON payloads, and safe status updates only.

## 6. Step 1 - Backend Foundation

Build:

- `backend/main.py`
- `backend/requirements.txt`
- `backend/models/schemas.py`

Backend requirements:

```text
fastapi
uvicorn
pydantic
python-multipart
python-dotenv
numpy
opencv-python
Pillow
aiofiles
requests
```

Optional later:

```text
openai
elevenlabs
backboard
mujoco
```

`main.py` must:

- create FastAPI app named `EchoMind API`
- enable CORS for local frontend
- mount `/static` to `backend/static`
- include routers
- expose `GET /health`
- expose `POST /api/session`

Minimum routes:

```text
GET  /health
POST /api/session
POST /api/onboarding
GET  /api/memory/{user_id}
POST /api/agent/ask
GET  /api/agent/result/{job_id}
POST /api/feedback
POST /api/video-twin/upload
```

Test:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/session
```

Pass condition:

- backend starts
- health returns ok
- session returns `session_id` and `user_id`

## 7. Step 2 - Shared Schemas

Create `backend/models/schemas.py`.

Include:

```python
SessionResponse
OnboardingRequest
FeedbackRequest
AskRequest
AgentJob
Scenario
AgentResult
VideoTwinUploadResponse
```

Types must match the architecture files.

Critical fields:

- `session_id`
- `user_id`
- `job_id`
- `student_level`
- `learning_style`
- `rating`
- `presentation_metrics`

Do not allow frontend/backend field drift.

## 8. Step 3 - Memory Manager With Backboard

Create `backend/services/memory_manager.py`.

Responsibilities:

- initialize Backboard if `BACKBOARD_API_KEY` exists
- fallback to local JSON files if not
- store onboarding
- retrieve student context
- store completed simulation summary
- store feedback/rating

Functions:

```python
async def get_student_context(user_id: str) -> dict:
    ...

async def store_onboarding(req: OnboardingRequest) -> dict:
    ...

async def store_simulation_memory(user_id: str, scenario: dict, teaching: dict) -> None:
    ...

async def store_feedback(req: FeedbackRequest) -> dict:
    ...
```

Backboard framing:

```text
Backboard stores how to teach this student best.
```

Store messages like:

```text
Onboarding: user prefers visual animations, real-world analogies, quick answers first, and excited voice tone.
```

```text
Feedback: user rated job planet_jump_123 5/5, clicked More visuals and Show equation next, replayed the Moon comparison twice. Future explanations should lead with diagrams and include one equation card.
```

Local fallback path:

```text
backend/data/memory/{user_id}.json
```

Test:

```bash
curl -X POST http://localhost:8000/api/onboarding \
  -H "Content-Type: application/json" \
  -d '{"session_id":"s1","user_id":"u1","student_level":"middle_school","learning_style":["visual_animations"],"favorite_topics":["space"],"explanation_depth":"quick_then_deeper","voice_preference":"friendly_excited"}'

curl http://localhost:8000/api/memory/u1
```

Pass condition:

- works with or without `BACKBOARD_API_KEY`
- local fallback file is created if Backboard is unavailable

## 9. Step 4 - Scenario Interpreter

Create `backend/services/scenario_interpreter.py`.

Ruthless MVP behavior:

Use deterministic classification first. LLM can improve later.

Classify the question into a `preset` that matches the cinematic preset names in
07 exactly (`planet_jump | molecule | moon_drop | ramp_box | diagram_fallback`), so
the same string flows from interpreter → Render Director → frontend with no
renaming:

- `planet`, `jump`, `solar system` -> `planet_jump`
- `molecule`, `water`, `sodium`, `chlorine`, `bond` -> `molecule`
- `moon`, `feather`, `bowling ball` -> `moon_drop`
- `ramp`, `incline`, `slide`, `box` (or video upload) -> `ramp_box`
- otherwise -> `diagram_fallback` (still cinematic) with an assumption note, or map
  to `planet_jump` if the question is clearly about gravity

Function:

```python
def interpret_question(question: str, student_context: dict) -> dict:
    ...
```

Output scenario fields:

```text
title
domain
concepts
objects
environment
assumptions
simulation_plan
teaching_plan
```

Do not call an LLM until deterministic templates work.

## 10. Step 5 - Simulation Templates

Create `backend/services/simulation_templates.py`.

Build three deterministic templates.

### Template A - Planet Jump

Data:

```python
PLANETS = [
  {"name": "Mercury", "gravity": 3.7},
  {"name": "Venus", "gravity": 8.87},
  {"name": "Earth", "gravity": 9.81},
  {"name": "Moon", "gravity": 1.62},
  {"name": "Mars", "gravity": 3.71},
  {"name": "Jupiter", "gravity": 24.79},
  {"name": "Saturn", "gravity": 10.44},
  {"name": "Uranus", "gravity": 8.69},
  {"name": "Neptune", "gravity": 11.15}
]
```

Compute jump height using simplified energy relation:

```text
h = v0² / (2g)
```

Use a fixed initial jump velocity.

Output:

- planet names
- gravity
- jump height
- airtime
- animation keyframes
- labels

### Template B - Molecule Interaction

Support first:

- water-water attraction
- sodium-chlorine ionic attraction

Output:

- atoms as spheres
- bonds
- charges
- attraction arrows
- short interaction animation
- simplified accuracy note

### Template C - Moon Drop

Output:

- two objects
- moon gravity
- no air resistance
- same fall acceleration
- optional Earth-air comparison

## 11. Step 6 - Tutor Agent

Create `backend/services/tutor_agent.py`.

Function:

```python
def build_teaching_result(scenario: dict, sim_payload: dict, student_context: dict) -> dict:
    ...
```

Output:

```text
transcript
key_takeaway
concepts_explained
misconceptions_corrected
followups
visual_style_instructions
```

Adapt using memory:

- if `learning_style` includes visuals: emphasize diagrams
- if feedback asked for equations: include one equation card
- if user prefers quick answers: keep transcript under 45 seconds
- if user likes depth: add optional deeper follow-up

Do not make narration too long.

Target narration length:

```text
20-45 seconds
```

## 12. Step 7 - Voice Service

Create `backend/services/voice_service.py`.

Function:

```python
async def synthesize_voice(text: str, job_id: str, voice_preference: str) -> str | None:
    ...
```

If `ELEVENLABS_API_KEY` exists:

- generate MP3
- save to `backend/static/jobs/{job_id}/explanation.mp3`
- return URL

If unavailable:

- return `None`
- frontend uses browser TTS

Do not block result completion if TTS fails.

## 13. Step 8 - Agent Router And Job System

Create:

- `backend/routers/agent_router.py`

`POST /api/agent/ask` should:

1. create `job_id`
2. retrieve student context from memory
3. interpret question
4. generate simulation payload from template
5. generate teaching result
6. synthesize voice if available
7. store result files under `backend/static/jobs/{job_id}/`
8. store simulation memory
9. return job id and result immediately for MVP

For MVP, jobs can run synchronously. Add async queue later only if needed.

Files to write per job:

```text
scenario.json
simulation_payload.json
teaching.json
result.json
```

`GET /api/agent/result/{job_id}` should read `result.json`.

## 14. Step 9 - Feedback Router

Create route in memory or agent router:

```text
POST /api/feedback
```

It must:

1. accept `FeedbackRequest`
2. validate rating is 1-5
3. call `store_feedback`
4. return `next_adaptation`

This is required for the Backboard value story.

## 15. Step 10 - Video Twin Backend

Create:

- `backend/routers/video_twin_router.py`
- `backend/services/video_twin.py`

MVP target:

- support ramp/box video
- use OpenCV frame extraction
- if tracking works, track moving object center
- if tracking fails, return deterministic demo reconstruction

Do not try full 3D reconstruction.

Return:

```json
{
  "job_id": "video_job_123",
  "status": "complete",
  "original_video_url": "...",
  "digital_twin_payload": {
    "type": "ramp_box",
    "ramp_angle_deg": 25,
    "friction_coefficient_estimate": 0.25,
    "trajectory": [...],
    "concepts": ["gravity component", "normal force", "friction"]
  },
  "teaching": {...}
}
```

Important:

- If the uploaded video is hard to analyze, fallback to a clean ramp demo.
- Explain that it is an estimated reconstruction.

## 16. Step 11 - Frontend Foundation

Create Next.js app.

Routes:

```text
/
/onboarding
/ask
/video-twin
```

Global style:

- dark cinematic background
- warm glows
- glass panels
- large central visual
- no raw white default pages

Install:

```bash
npm install three @react-three/fiber framer-motion lucide-react
```

## 17. Step 12 - Frontend API Client

Create `frontend/lib/api.ts`.

Functions:

```ts
createSession()
submitOnboarding(payload)
getMemory(userId)
askAgent(payload)
getAgentResult(jobId)
submitFeedback(payload)
uploadVideoTwin(file, metadata)
```

No component should call `fetch` directly except through this file.

## 18. Step 13 - Onboarding UI

Create `frontend/app/onboarding/page.tsx`.

Flow:

1. create/load session
2. ask learning level
3. ask learning style
4. ask favorite topics
5. ask explanation depth
6. ask voice style
7. call `submitOnboarding`
8. route to `/ask`

Learning-style options:

- Visual animations
- Equations
- Stories/analogies
- Real-world examples
- Hands-on experiments

Pass condition:

- data persists to backend
- localStorage stores `session_id`, `user_id`, `echomind_onboarding_complete`

## 19. Step 14 - Ask Page

Create `frontend/app/ask/page.tsx`.

Components:

- `AskBar`
- `AgentTimeline`
- `SimulationViewer`
- `TutorPanel`
- `FeedbackModal`

Flow:

1. load session/user id
2. redirect to onboarding if not complete
3. accept voice or text question
4. call `askAgent`
5. show timeline states
6. render simulation payload
7. play audio URL or browser TTS
8. show follow-up chips
9. show feedback modal

## 20. Step 15 - Cinematic 3D Engine (the "looks real" core)

> Build this exactly per [`07_CINEMATIC_RENDER_ENGINE.md`](07_CINEMATIC_RENDER_ENGINE.md).
> Do not improvise the look. This is the single most important visual step — get the
> engine right once and every preset inherits the film quality.

Build the engine under `frontend/components/cinematic/` (07 §11):

1. `MaterialLibrary.ts` — the named PBR materials (07 §5).
2. `SceneEnvironment.tsx` — HDRI `<Environment>`, graded dark background, fog,
   3-point light rig, `<ContactShadows>` (07 §4).
3. `GradeComposer.tsx` — the postFX stack in exact order: SSAO → Bloom →
   DepthOfField → ChromaticAberration → Vignette → ACES ToneMapping (07 §6).
4. `CameraDirector.tsx` — plays `spec.shots` on the master clock with eased moves
   and the slow-mo hero window (07 §7).
5. `SceneObjects.tsx` + `Trajectory.tsx` — instantiate `spec.objects` and drive
   them from `spec.trajectories`.
6. `ForceArrow.tsx` + `Label3D.tsx` — 3D arrows and anchored labels (07 annotations).
7. `BeatOverlay.tsx` — title / callout / equation / takeaway cards synced to
   `spec.beats` (07 §9).
8. `usePerfTier.ts` + `useMasterClock.ts` — fps tiering (07 §8) and the single
   audio+visual clock (07 §9).
9. `CinematicStage.tsx` — mounts all of the above from a `CinematicSceneSpec`.

`SimulationViewer.tsx` becomes a thin wrapper that reads
`result.simulation.cinematic_scene_spec` and renders `CinematicStage`.

Acceptance: run the cinematic checklist in 07 §13 against a hand-written sample
spec before wiring real data. If any box fails, fix the look first.

## 21. Step 16 - Planet Jump Preset

Create `frontend/components/cinematic/presets/planetJump.ts`.

It returns a complete `CinematicSceneSpec` (preset `planet_jump`) per the recipe in
07 §10.1. The Render Director calls it and overrides only the computed values.

Must produce:

- planets along a gentle arc (not a flat row), each a glossy sphere with a capsule
  figure standing on it
- gravity + jump-height labels per planet
- a `gravity` force arrow on the hero figure
- camera shots: establish → push-to-Moon hero (slow-mo) → wide compare
- highlighted comparison: Moon vs Earth vs Jupiter glow brighter
- beats: title → "same push, different gravity" → equation `h=v₀²/2g` → takeaway

Jump motion (the Truth Layer fills the trajectory):

```text
y(t) = v0*t - 0.5*g*t²
```

Use normalized scale so jumps stay readable across very different gravities.

## 22. Step 17 - Molecule Preset

Create `frontend/components/cinematic/presets/molecule.ts`.

Returns a `CinematicSceneSpec` (preset `molecule`) per 07 §10.2.

Must produce:

- atoms as `atom_glossy` spheres, bonds as `bond_metal` cylinders
- semi-transparent `electron_cloud` shells (transmission material)
- partial-charge labels and an emissive attraction/hydrogen-bond arc
- slow approach animation; slow-mo bloom pulse when the bond forms
- a simplified energy/interaction beat card

For water-water:

- oxygen red-ish (`#ff5a5a`), hydrogen white/blue-ish (`#f4f6ff`)
- dotted/emissive hydrogen-bond line
- label: `partial negative oxygen attracts partial positive hydrogen`
- mandatory disclaimer beat: "Simplified model — not full quantum chemistry."

Do not claim full quantum accuracy.

## 23. Step 18 - Diagram Overlay

Create `DiagramOverlay.tsx`.

It renders:

- force arrows
- labels
- equation card
- final takeaway card

This component is essential. The video must teach, not just look pretty.

## 24. Step 19 - Tutor Panel And Feedback Modal

`TutorPanel.tsx`:

- shows avatar orb
- transcript
- play audio button
- follow-up chips
- memory adaptation note

`FeedbackModal.tsx`:

- star rating 1-5
- chips
- optional text
- submit to `/api/feedback`

After feedback submit, show:

```text
Got it — I’ll tailor the next explanation based on that.
```

## 25. Step 20 - Video Twin Page

Create `frontend/app/video-twin/page.tsx`.

Flow:

1. upload video
2. call `/api/video-twin/upload`
3. show original video
4. show digital twin payload in `SimulationViewer`
5. show side-by-side comparison
6. show explanation
7. collect feedback

MVP fallback:

- if backend cannot analyze the video, show a clean ramp/box digital twin and say it is an estimated reconstruction.

## 26. Step 21 - Run The MVP Locally

Backend:

```bash
cd backend
pip install -r requirements.txt --break-system-packages
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## 27. Step 22 - Required Manual Tests

### Test A - Onboarding

1. Visit `/onboarding`.
2. Select visual animations, real-world analogies, space/chemistry.
3. Submit.
4. Confirm backend stores memory.

### Test B - Planet Jump

Ask:

```text
What if I could jump on every planet?
```

Pass if:

- simulation renders
- planets compare clearly
- voice/transcript explains gravity
- follow-up chips appear
- feedback modal works

### Test C - Molecule Interaction

Ask:

```text
What happens when two water molecules come together?
```

Pass if:

- atoms render as 3D spheres
- charges/arrows appear
- hydrogen bond concept is explained
- accuracy disclaimer is included

### Test D - Video Twin

Upload sample ramp/box video.

Pass if:

- original video appears
- digital twin appears
- ramp forces are labeled
- explanation mentions gravity component, normal force, and friction

### Test E - API Failure

Run without:

- Backboard key
- ElevenLabs key
- Runway key
- OpenAI key

Pass if:

- app still works
- local memory fallback works
- browser TTS or transcript fallback works
- deterministic templates work

## 28. Demo Script

Opening:

```text
EchoMind turns student curiosity into live scientific simulations. The student asks a question, the agent builds the experiment, explains the science, and learns how to teach them better over time.
```

Demo 1:

```text
What if I could jump on every planet?
```

Show:

- planet comparison
- cinematic labels
- voice explanation
- feedback rating

Say:

```text
Notice this is not just a video. The simulation has gravity parameters behind it, and the explanation adapts to the student's learning profile.
```

Demo 2:

```text
What happens when two water molecules come together?
```

Show:

- molecule animation
- charges
- hydrogen bond
- clean diagram

Demo 3:

Upload ramp video.

Say:

```text
Now we can go from real life into a digital twin. EchoMind estimates the motion, rebuilds the scene, and explains the forces.
```

Close:

```text
The student's curiosity becomes the curriculum. Backboard remembers what they ask, what they understand, and how they learn best, so every simulation gets more personalized.
```

## 29. Final Definition Of Done

The MVP is done only when:

- backend starts with one command
- frontend starts with one command
- onboarding works
- Backboard/local memory stores preferences
- planet jump works
- molecule viewer works
- video twin fallback works
- 1-5 star feedback works
- future response adapts to stored preferences (passes the 08 §9 checklist)
- every rendered scene passes the cinematic checklist in 07 §13
- app survives missing external API keys (including no Backboard key)
- demo can be completed in under 3 minutes

If any of these fail, do not add new features. Fix the core loop first.

The two soul features — the real-time 3D look (07 §13) and the constant-context
learning (08 §9) — are the difference between a demo and a winner. Never ship with
either one half-done.
