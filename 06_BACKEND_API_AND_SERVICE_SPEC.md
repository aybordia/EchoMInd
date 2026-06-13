# EchoMind Backend API And Service Spec

## 1. Goal

The backend is the autonomous science engine.

It should accept questions, videos, and lab commands, then orchestrate interpretation, simulation, rendering, teaching, and memory.

## 2. Backend Stack

Recommended:

```text
Python + FastAPI + Pydantic + WebSockets
```

Core packages:

```text
fastapi
uvicorn
pydantic
python-multipart
numpy
opencv-python
Pillow
moviepy or ffmpeg-python
mujoco
requests
websockets
aiofiles
```

Optional:

```text
openai
elevenlabs
rdkit
trimesh
scipy
```

## 3. Directory Structure

Recommended:

```text
backend/
  main.py
  routers/
    agent_router.py
    simulation_router.py
    video_twin_router.py
    avatar_router.py
    lab_router.py
    memory_router.py
  services/
    scenario_interpreter.py
    physics_planner.py
    scene_builder.py
    simulation_runner.py
    render_director.py
    tutor_agent.py
    memory_manager.py
    backboard_client.py
    video_twin.py
    molecule_engine.py
    voice_service.py
    safety.py
  models/
    schemas.py
  static/
    jobs/
  data/
    memory/
    templates/
```

## 4. Environment Variables

```text
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
RUNWAY_API_KEY=
BACKBOARD_API_KEY=
ECHOMIND_USE_LOCAL_LLM=false
OLLAMA_BASE_URL=http://localhost:11434
ECHOMIND_RENDER_MODE=threejs_or_blender_or_api
ECHOMIND_MEMORY_MODE=backboard_or_local
```

All keys are optional for development. The app must have fallbacks.

## 5. Core Pydantic Models

### SessionResponse

```python
class SessionResponse(BaseModel):
    session_id: str
    user_id: str
```

### AskRequest

```python
class AskRequest(BaseModel):
    question: str
    session_id: str
    user_id: str
    student_level: str = "middle_school"
    mode: str = "voice_or_text"
```

### OnboardingRequest

```python
class OnboardingRequest(BaseModel):
    session_id: str
    user_id: str
    student_level: str = "middle_school"
    learning_style: list[str] = []
    favorite_topics: list[str] = []
    explanation_depth: str = "quick_then_deeper"
    voice_preference: str = "friendly_excited"
```

### FeedbackRequest

```python
class FeedbackRequest(BaseModel):
    job_id: str
    session_id: str
    user_id: str
    rating: int
    chips: list[str] = []
    free_text: str = ""
    presentation_metrics: dict = {}
```

### Scenario

```python
class Scenario(BaseModel):
    scenario_id: str
    title: str
    domain: str
    student_question: str
    concepts: list[str]
    objects: list[dict]
    environment: dict
    known_values: dict = {}
    unknown_values: dict = {}
    assumptions: list[str] = []
    safety: dict
    simulation_plan: dict
    teaching_plan: dict
```

### AgentJob

```python
class AgentJob(BaseModel):
    job_id: str
    session_id: str
    user_id: str
    question: str
    stage: str
    scenario: Scenario | None = None
    result: dict | None = None
    error: str | None = None
    fallback_used: bool = False
```

### AgentResult

The full payload returned by `GET /api/agent/result/{job_id}` and written to
`result.json`. This is the contract the frontend renders.

```python
class SimulationOut(BaseModel):
    engine: str                       # template | mujoco | analytic
    preset: str                       # planet_jump | molecule | moon_drop | ramp_box | diagram_fallback
    cinematic_scene_spec: dict        # the CinematicSceneSpec (see 07) — drives the 3D
    trajectory_url: str | None = None
    diagram_url: str | None = None
    video_url: str | None = None      # optional AI-enhanced clip; null is fine

class TeachingOut(BaseModel):
    transcript: str
    key_takeaway: str
    concepts_explained: list[str]
    misconceptions_corrected: list[str] = []
    followups: list[str]
    audio_url: str | None = None      # null → frontend uses browser TTS
    visual_style_instructions: dict = {}

class AgentResult(BaseModel):
    job_id: str
    status: str                       # complete | failed_with_fallback
    scenario: Scenario
    simulation: SimulationOut
    teaching: TeachingOut
    fallback_used: bool = False
```

### DigitalTwinPayload

Returned by the video-twin route (and embeddable as a `ramp_box` scene spec).

```python
class DigitalTwinPayload(BaseModel):
    type: str = "ramp_box"
    ramp_angle_deg: float
    friction_coefficient_estimate: float
    trajectory: list                  # engine-independent position keys
    concepts: list[str]
    estimated: bool = True            # true when reconstruction is approximate

class VideoTwinResult(BaseModel):
    job_id: str
    status: str
    original_video_url: str
    cinematic_scene_spec: dict        # a ramp_box CinematicSceneSpec (see 07)
    digital_twin_payload: DigitalTwinPayload
    teaching: TeachingOut
```

The `CinematicSceneSpec` itself is defined in
[`07_CINEMATIC_RENDER_ENGINE.md`](07_CINEMATIC_RENDER_ENGINE.md). The backend
treats it as a `dict` produced by the Render Director; the frontend has the typed
version in `frontend/lib/types.ts`.

## 6. API Routes

### Health

```text
GET /health
```

Response:

```json
{"status":"ok"}
```

### Session

```text
POST /api/session
```

Response:

```json
{"session_id":"session_...","user_id":"user_..."}
```

### Ask Agent

```text
POST /api/agent/ask
```

Request:

```json
{
  "question": "What if I jumped on every planet?",
  "session_id": "session_123",
  "user_id": "user_123",
  "student_level": "middle_school"
}
```

Response:

```json
{
  "job_id": "job_123",
  "status": "queued",
  "message": "I'll build that simulation now."
}
```

### Onboarding

```text
POST /api/onboarding
```

Stores the student's learning preferences in Backboard or local memory.

Request:

```json
{
  "session_id": "session_123",
  "user_id": "user_123",
  "student_level": "middle_school",
  "learning_style": ["visual_animations", "real_world_analogies"],
  "favorite_topics": ["space", "chemistry"],
  "explanation_depth": "quick_then_deeper",
  "voice_preference": "friendly_excited"
}
```

Response:

```json
{
  "status": "stored",
  "personalization_summary": "Use visual animations and real-world analogies. Start concise, then offer deeper explanations."
}
```

### Feedback

```text
POST /api/feedback
```

Stores ratings, feedback chips, and presentation behavior in Backboard so future simulations adapt to the student's learning style.

Request:

```json
{
  "job_id": "job_123",
  "session_id": "session_123",
  "user_id": "user_123",
  "rating": 4,
  "chips": ["more_visuals", "show_equation_next"],
  "free_text": "The visual was great, but I wanted the formula.",
  "presentation_metrics": {
    "replayed_video": true,
    "watched_percent": 0.88,
    "clicked_followup": "Add air resistance"
  }
}
```

Response:

```json
{
  "status": "stored",
  "next_adaptation": "Future explanations will show the visual first, then a single equation card."
}
```

### Agent Result

```text
GET /api/agent/result/{job_id}
```

Response:

```json
{
  "job_id": "job_123",
  "status": "complete",
  "scenario": {},
  "simulation": {},
  "teaching": {}
}
```

### Follow-Up

```text
POST /api/agent/followup
```

Request:

```json
{
  "job_id": "job_123",
  "followup": "Try Jupiter",
  "session_id": "session_123",
  "user_id": "user_123"
}
```

### Video Twin Upload

```text
POST /api/video-twin/upload
```

Request:

- multipart file
- `session_id`
- `user_id`
- optional `description`

Response:

```json
{
  "job_id": "video_job_123",
  "status": "processing"
}
```

### Memory Summary

```text
GET /api/memory/{user_id}
```

Response:

```json
{
  "user_id": "user_123",
  "summary": "This student has explored gravity and collisions.",
  "concepts_seen": [],
  "suggested_questions": []
}
```

### Lab Command

```text
POST /api/lab/command
```

Request:

```json
{
  "command": "Move the sample to the microscope",
  "lab_id": "lab_123",
  "session_id": "session_123",
  "user_id": "user_123"
}
```

## 7. WebSocket Routes

### Job Stream

```text
WS /ws/jobs/{job_id}
```

Purpose:

- stream agent status
- stream preview frames
- announce final result

Text message:

```json
{
  "type": "status",
  "stage": "building_scene",
  "message": "Creating the planet gravity comparison...",
  "progress": 0.35
}
```

Frame message:

- binary JPEG/PNG frame
- or JSON state if frontend renders directly

## 8. Service Behavior

### Scenario Interpreter

Inputs:

- question
- memory context
- student level

Outputs:

- `Scenario`

Fallback:

- template scenarios for known demos:
  - planet jumping
  - Moon feather/ball
  - ramp slide
  - molecule attraction

### Physics Planner

Inputs:

- `Scenario`

Outputs:

- engine choice
- equations
- scene settings
- comparison variants

Fallback:

- analytic equations

### Scene Builder

Inputs:

- simulation plan

Outputs:

- MuJoCo XML
- Three.js JSON
- molecule scene JSON
- camera/annotation plan

Fallback:

- simple primitives

### Simulation Runner

Inputs:

- scene
- engine

Outputs:

- trajectory
- metrics
- frames

Fallback:

- deterministic generated trajectories

### Render Director

Inputs:

- trajectory
- scenario
- annotations
- student context (for visual style / pace via memory)

Primary output:

- a **`CinematicSceneSpec`** (see [`07_CINEMATIC_RENDER_ENGINE.md`](07_CINEMATIC_RENDER_ENGINE.md))
  built from the chosen preset's defaults, overriding only objects, trajectories,
  annotations, camera shots, and beats. This is the main deliverable — the
  real-time 3D engine renders it in the browser.

Optional outputs:

- diagram PNG (always useful as a thumbnail/fallback)
- AI-enhanced `final.mp4` only when `video_enhancement.requested` and a key exists

Fallback:

- `diagram_fallback` preset (still graded, labeled, with beat cards) — never a raw
  failure. AI video is never on the critical path.

### Tutor Agent

Inputs:

- scenario
- simulation result
- memory

Outputs:

- transcript
- key takeaway
- followups
- audio file

Fallback:

- text transcript + browser TTS

### Memory Manager

Inputs:

- user_id
- completed scenario
- teaching result
- onboarding preferences
- rating and feedback data
- presentation behavior metrics

Outputs:

- stored memory
- retrieved context
- personalization summary
- teaching adaptation instructions

Fallback:

- local JSON files

Backboard behavior — fully specified in
[`08_BACKBOARD_MEMORY_AND_LEARNING.md`](08_BACKBOARD_MEMORY_AND_LEARNING.md):

- The always-on **local memory file** (`backend/data/memory/{user_id}.json`) is the
  runtime source of truth; Backboard is the durable sync target via `BackboardClient`.
- Before `POST /api/agent/ask` finishes interpretation, retrieve student context.
- Pass the context to the scenario interpreter and tutor agent.
- After a completed simulation, write concepts learned and misconceptions corrected.
- After `POST /api/onboarding`, write explicit learning preferences.
- After `POST /api/feedback`, run the deterministic adaptation rules (08 §5) to
  mutate preferences, then write rating, chips, free text, and behavior metrics.
- The app must work fully with `BACKBOARD_API_KEY` unset (file-only). Backboard is
  additive, never load-bearing.
- Never expose `BACKBOARD_API_KEY` to the frontend.

Example Backboard write for feedback:

```text
Student rated job_123 4/5. They selected more_visuals and show_equation_next. They replayed the final video and watched 88%. Adapt future explanations by leading with diagrams and adding one concise equation card.
```

## 9. Job Storage

Each job should get a folder:

```text
backend/static/jobs/{job_id}/
```

Files:

```text
question.txt
scenario.json
scene.json
trajectory.json
metrics.json
diagram.png
final.mp4
explanation.txt
explanation.mp3
result.json
```

## 10. Fallback Demos

Build these deterministic demos first:

### Planet Jump

- no external API required
- uses gravity table
- renders jump height comparison
- explains force/mass/gravity

### Moon Drop

- no external API required
- two objects under same gravity
- vacuum vs Earth air comparison optional

### Ramp Box Video Twin

- can run from uploaded or sample video
- uses OpenCV tracking or manual fallback
- reconstructs simple ramp scene

### Molecule Attraction

- uses prebuilt molecule data
- renders spheres/bonds/charge arrows
- conceptual explanation

These demos make the product robust even if APIs are slow.

## 11. Security And Safety

- validate uploaded file types
- limit file size
- store uploads under temp/job folder
- do not execute arbitrary generated code without sandboxing
- restrict dangerous science instructions
- sanitize prompts before external video APIs
- do not expose API keys to frontend

## 12. Backend Success Criteria

Backend is successful when:

- `/health` works
- session route works
- `POST /api/agent/ask` creates jobs
- job WebSocket streams progress
- at least two deterministic simulations work
- video twin upload produces a simplified reconstruction
- TTS works or falls back
- memory works or falls back
- final result includes simulation, diagram, transcript, followups

---

# Build Plan, Testing, And Demo Strategy

## 13. Build Philosophy

Build the product in layers:

```text
reliable core -> beautiful visuals -> voice polish -> memory -> lab expansion
```

Do not start with the hardest general case. Start with three demo-perfect examples and generalize after.

## 14. Recommended MVP Build Order

### Phase 1 - App Foundation

Build:

- FastAPI backend
- Next.js frontend
- session route
- ask page
- job creation
- WebSocket status stream
- static job file serving

Success:

- user submits text question
- backend creates job
- frontend shows status timeline

### Phase 2 - Deterministic Planet Jump Demo

Build:

- scenario template for planet jumping
- gravity table
- analytic jump simulation
- Three.js or canvas visualization
- explanation transcript
- follow-up chips

Why first:

- visually impressive
- scientifically simple
- no video upload needed
- no expensive external API needed

### Phase 3 - Voice Layer

Build:

- browser microphone input
- text fallback
- ElevenLabs TTS if key exists
- browser TTS fallback
- avatar pulse/teacher panel

Success:

- ask out loud
- hear answer back

### Phase 4 - Cinematic Render Layer

Build:

- labeled frames
- short MP4 export
- diagram card
- optional Runway/OpenAI video enhancement
- fallback FFmpeg/Three.js render

Success:

- result looks like a polished science short
- labels/arrows are readable
- final takeaway card appears

### Phase 5 - Video Digital Twin

Build:

- upload endpoint
- frame extraction
- simple object tracking
- ramp/box reconstruction
- side-by-side viewer
- concept explanation

Success:

- uploaded ramp video becomes a moving digital twin

### Phase 6 - Molecular Visualization

Build:

- molecule scene JSON
- sphere/bond renderer
- charge arrows
- simplified interactions
- chemistry explanation

Success:

- "what happens when these molecules come together" produces a beautiful conceptual animation

### Phase 7 - Memory

Build:

- memory manager
- local JSON fallback
- optional Backboard integration
- memory summary UI
- follow-up personalization

Success:

- agent references previous questions

### Phase 8 - Science Lab Expansion

Build only after MVP is stable.

- lab scene
- voice commands
- safety rules
- one safe experiment

## 15. Team Split Suggestion

If two people build in parallel:

### Person A - Agent + Backend Simulation

Owns:

- FastAPI app
- scenario interpreter
- physics planner
- simulation runner
- job system
- video twin backend
- memory backend

### Person B - Frontend + Visual Experience

Owns:

- Next.js app
- ask interface
- simulation viewer
- avatar panel
- cinematic player
- diagram overlays
- video twin UI
- lab UI shell

Shared contract:

- API schemas in `schemas.py`
- TypeScript types in `frontend/lib/types.ts`
- job folder outputs
- WebSocket message shape

## 16. Testing Plan

### Backend Smoke Tests

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/session
```

### Ask Job Test

```bash
curl -X POST http://localhost:8000/api/agent/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question":"What if I jumped on every planet?",
    "session_id":"test-session",
    "user_id":"test-user",
    "student_level":"middle_school"
  }'
```

Expected:

- returns `job_id`
- job status eventually reaches complete
- result includes transcript and followups

### Job Result Test

```bash
curl http://localhost:8000/api/agent/result/JOB_ID
```

Expected fields:

- `scenario`
- `simulation`
- `teaching`

### Video Upload Test

```bash
curl -X POST http://localhost:8000/api/video-twin/upload \
  -F "file=@sample_ramp.mp4" \
  -F "session_id=test-session" \
  -F "user_id=test-user" \
  -F "description=box sliding down ramp"
```

Expected:

- returns job id
- creates job folder
- extracts frames or falls back gracefully

### Frontend Tests

Manual:

1. open `/`
2. ask typed question
3. see status timeline
4. see simulation/result
5. play voice explanation or read transcript
6. click follow-up
7. upload sample video
8. see digital twin result

### Failure Tests

Turn off each optional service and confirm app still works:

- no ElevenLabs key
- no video API key
- no Backboard key
- no MuJoCo
- no local LLM

Expected:

- app uses fallback
- no ugly crash
- user sees clear message

## 17. Demo Script

### Opening Line

```text
EchoMind turns student curiosity into live scientific simulations. You ask a what-if question, and the agent builds the experiment, runs it, explains it, and suggests what to explore next.
```

### Demo 1 - Planet Jump

Say:

```text
What if you could jump on every planet in the solar system?
```

Expected visual:

- eight planet panels
- stick figure or avatar jumps
- jump height labels
- gravity values
- voice explanation

Narration target:

```text
Same legs, same force, different gravity. On the Moon you soar; on Jupiter you barely leave the ground.
```

### Demo 2 - Follow-Up

Click or say:

```text
What about a black hole?
```

Expected:

- simplified tidal force/spaghettification diagram
- safety/scale explanation
- not full black hole simulation, but accurate concept visualization

### Demo 3 - Molecular Interaction

Say:

```text
What happens when two water molecules come together?
```

Expected:

- molecules approach
- partial charge labels
- hydrogen bond arrow
- energy/attraction explanation

### Demo 4 - Real Video Twin

Upload ramp clip.

Say:

```text
Now instead of asking a hypothetical, I can upload real life.
```

Expected:

- original clip
- detected box/ramp
- reconstructed moving twin
- force arrows
- explanation of friction and gravity component

### Closing Line

```text
The student's curiosity becomes the curriculum. Every question becomes a simulation, every simulation becomes an explanation, and every explanation leads to the next question.
```

## 18. What To Prioritize For Judge Wow

Priority order:

1. fast voice-to-sim loop
2. beautiful labeled visuals
3. spoken explanation
4. follow-up suggestions
5. video twin side-by-side
6. memory reference
7. science lab preview

The lab is exciting, but it should not steal time from the core magic.

## 19. Visual Quality Checklist

For every demo visual:

- dark cinematic background
- crisp object labels
- force arrows
- one slow-motion moment
- one comparison chart or split screen
- one final takeaway card
- no raw developer UI
- no unstyled default buttons

## 20. Science Accuracy Checklist

For every answer:

- name the physics principle
- state assumptions
- avoid overclaiming precision
- explain the surprising result
- include one equation only if useful
- connect to real-world example

## 21. Fallback Checklist

Before demo, prepare:

- prerecorded sample outputs for top demos
- sample ramp video
- deterministic planet jump scene
- deterministic molecule scene
- browser TTS fallback
- no-key mode

The live app should run, but the demo should not depend on internet/API perfection.

## 22. Final Acceptance Criteria

EchoMind is demo-ready when:

- student can ask a question by voice or text
- agent creates a structured scenario
- simulation appears within seconds for MVP demos
- explanation is spoken or transcripted
- follow-up question appears
- uploaded ramp video produces a digital twin
- molecule question produces a beautiful conceptual animation
- app works without dedicated GPU
- optional APIs enhance quality but are not required
- judges can understand the value in under 90 seconds
