# EchoMind System Architecture

## 1. Architecture Goal

The system must support three user inputs:

1. spoken or typed WhatIf question
2. uploaded real-world video
3. voice command inside a simulated science lab

And produce four outputs:

1. real-time simulation
2. cinematic short video or rendered animation
3. explanatory diagram
4. spoken tutor response

The architecture should be modular so each engine can fallback independently.

## 2. High-Level Diagram

```text
┌─────────────────────────────────────────────────────────────────────┐
│                              Frontend                               │
│                                                                     │
│  Next.js App                                                        │
│  ├─ Home / Ask page                                                 │
│  ├─ Simulation viewer                                               │
│  ├─ Video upload page                                               │
│  ├─ Avatar tutor panel                                              │
│  ├─ Science lab page                                                │
│  └─ Timeline / memory panel                                         │
│                                                                     │
│  Browser APIs                                                       │
│  ├─ microphone input                                                │
│  ├─ WebSocket simulation stream                                     │
│  ├─ WebGL / Three.js preview                                        │
│  └─ audio playback                                                  │
└───────────────────────┬─────────────────────────────────────────────┘
                        │ REST + WebSocket
┌───────────────────────▼─────────────────────────────────────────────┐
│                              Backend                                │
│                                                                     │
│  FastAPI                                                            │
│  ├─ agent_router.py                                                 │
│  ├─ simulation_router.py                                            │
│  ├─ video_router.py                                                 │
│  ├─ avatar_router.py                                                │
│  ├─ lab_router.py                                                   │
│  └─ memory_router.py                                                │
│                                                                     │
│  Core Services                                                      │
│  ├─ Scenario Interpreter                                            │
│  ├─ Physics Planner                                                 │
│  ├─ Scene Builder                                                   │
│  ├─ Simulation Runner                                               │
│  ├─ Render Director                                                 │
│  ├─ Tutor/Narration Agent                                           │
│  ├─ Follow-up Generator                                             │
│  └─ Memory Manager                                                  │
└───────────┬────────────────┬─────────────────┬─────────────────────┘
            │                │                 │
            ▼                ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐
│ Physics Engines │ │ Media Engines   │ │ AI / Voice / Memory         │
│                 │ │                 │ │                             │
│ MuJoCo          │ │ Blender         │ │ LLM planner                 │
│ Three.js/Rapier │ │ Three.js        │ │ ElevenLabs TTS              │
│ Particle engine │ │ Runway/Sora API │ │ STT                         │
│ Molecule viewer │ │ FFmpeg          │ │ Backboard/local memory      │
└─────────────────┘ └─────────────────┘ └─────────────────────────────┘
```

## 3. Core Backend Modules

### `main.py`

Responsibilities:

- create FastAPI app
- configure CORS
- mount static outputs
- include routers
- expose `/health`
- create per-user sessions

### `agent_router.py`

Routes:

- `POST /api/agent/ask`
- `GET /api/agent/status/{job_id}`
- `GET /api/agent/result/{job_id}`
- `POST /api/agent/followup`

Responsibilities:

- accept typed or transcribed question
- call scenario interpreter
- start job orchestration
- return job id and initial response

### `scenario_interpreter.py`

Responsibilities:

- convert natural language into structured scenario JSON
- identify physics concepts
- choose simulation mode
- flag safety issues
- produce assumptions
- decide if a comparison simulation is useful

Example output:

```json
{
  "scenario_id": "moon_drop_001",
  "title": "Bowling ball and feather on the Moon",
  "domain": "rigid_body",
  "concepts": ["gravity", "vacuum", "mass independence"],
  "objects": [
    {"name": "bowling_ball", "shape": "sphere", "mass_kg": 7.0},
    {"name": "feather", "shape": "thin_plate", "mass_kg": 0.001}
  ],
  "environment": {
    "gravity_m_s2": 1.62,
    "air_density": 0.0,
    "surface": "moon"
  },
  "comparison_variants": ["earth_air", "jupiter_vacuum"],
  "explanation_level": "middle_school",
  "safety": {"allowed": true, "notes": []}
}
```

### `physics_planner.py`

Responsibilities:

- choose engine:
  - MuJoCo
  - browser physics
  - molecule renderer
  - diagram-only fallback
- decide timestep and duration
- generate equations for overlays
- create expected qualitative result
- choose camera/diagram framing

### `scene_builder.py`

Responsibilities:

- generate MuJoCo XML for rigid-body scenes
- generate Three.js scene JSON for frontend preview
- generate molecule scene JSON for atomic interactions
- generate annotation plan
- generate camera path

### `simulation_runner.py`

Responsibilities:

- run simulation jobs
- stream status and frames
- save trajectory data
- run parallel variations if useful
- fallback to deterministic analytic trajectories when engine fails

### `render_director.py`

Responsibilities:

- convert simulation data into visuals
- create diagram overlays
- produce a short clip using one of:
  - real-time WebGL capture
  - Blender render
  - video-generation API
  - simple FFmpeg frame stitch
- enforce cinematic educational style

### `tutor_agent.py`

Responsibilities:

- generate explanation script
- simplify or deepen explanation based on student level
- generate follow-up questions
- generate labels/captions
- call TTS service

### `memory_manager.py`

Responsibilities:

- store question history
- store concepts learned
- store misconceptions
- store preferred explanation style
- retrieve memory before new answer
- connect new questions to old ones

## 4. Frontend Routes

### `/`

Landing page.

Includes:

- product title
- microphone ask bar
- sample prompts
- upload video CTA
- science lab CTA

### `/ask`

Primary WhatIf interaction.

Includes:

- voice input
- text fallback
- simulation canvas
- agent status timeline
- spoken explanation
- follow-up buttons

### `/video-twin`

Real-world video upload and digital twin.

Includes:

- video uploader
- original video player
- reconstructed simulation view
- concept explanation panel
- side-by-side comparison

### `/lab`

Virtual science lab.

Includes:

- lab scene
- voice command input
- inventory/materials panel
- safety constraints
- experiment log

### `/memory`

Optional student memory map.

Includes:

- explored concepts
- prior questions
- misconceptions corrected
- suggested next experiments

### `/onboarding`

First-run personalization flow.

Includes:

- grade/learning level selection
- preferred learning style
- favorite topics
- explanation depth preference
- voice/avatar preference

Writes the answers to Backboard through the backend.

### `/feedback`

Lightweight feedback route or modal after every completed simulation.

Includes:

- 1-5 star rating
- quick feedback chips
- optional free-text feedback
- replay/skip behavior logging

## 5. Core API Contracts

### `POST /api/session`

Creates or returns session identity.

Request:

```json
{}
```

Response:

```json
{
  "session_id": "session_abc",
  "user_id": "user_abc"
}
```

### `POST /api/onboarding`

Stores initial personalization in Backboard.

Request:

```json
{
  "session_id": "session_abc",
  "user_id": "user_abc",
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
  "personalization_summary": "Use visual explanations with real-world analogies. Keep first answer quick, then offer deeper detail."
}
```

### `POST /api/agent/ask`

Request:

```json
{
  "question": "What if I jumped on Jupiter?",
  "session_id": "session_abc",
  "user_id": "user_abc",
  "mode": "voice_or_text",
  "student_level": "middle_school"
}
```

Response:

```json
{
  "job_id": "job_123",
  "scenario": {...},
  "initial_message": "I'll build that comparison now.",
  "status": "planning"
}
```

### `GET /api/agent/result/{job_id}`

Response:

```json
{
  "job_id": "job_123",
  "status": "complete",
  "scenario": {...},
  "simulation": {
    "viewer_url": "/sim/job_123",
    "trajectory_url": "/static/jobs/job_123/trajectory.json",
    "video_url": "/static/jobs/job_123/final.mp4",
    "diagram_url": "/static/jobs/job_123/diagram.png"
  },
  "teaching": {
    "spoken_audio_url": "/static/jobs/job_123/explanation.mp3",
    "transcript": "...",
    "key_takeaway": "...",
    "followups": ["Want to add air resistance?", "Want to try Jupiter?"]
  }
}
```

### `POST /api/feedback`

Stores rating and preference feedback after each result.

Request:

```json
{
  "job_id": "job_123",
  "session_id": "session_abc",
  "user_id": "user_abc",
  "rating": 5,
  "chips": ["more_visuals", "good_voice", "show_equation_next"],
  "free_text": "The animation helped, but I want the equation too.",
  "presentation_metrics": {
    "replayed_video": true,
    "clicked_followup": "Try Jupiter",
    "watched_percent": 0.92
  }
}
```

Response:

```json
{
  "status": "stored",
  "next_adaptation": "Future explanations will include visual animation first, then one equation card."
}
```

### `WS /ws/jobs/{job_id}`

Streams:

- agent status updates
- simulation frames or preview states
- render progress
- final result ready message

Text message shape:

```json
{
  "type": "status",
  "stage": "simulating",
  "message": "Running Moon gravity simulation...",
  "progress": 0.45
}
```

### `POST /api/video-twin/upload`

Request:

- multipart video file
- optional description
- session/user id

Response:

```json
{
  "job_id": "video_job_123",
  "status": "processing",
  "message": "Analyzing motion and scene geometry."
}
```

### `POST /api/lab/command`

Request:

```json
{
  "command": "Move the blue liquid into the petri dish",
  "lab_id": "lab_123",
  "session_id": "session_abc",
  "user_id": "user_abc"
}
```

Response:

```json
{
  "status": "ok",
  "action_plan": [...],
  "safety_notes": [...],
  "new_lab_state": {...},
  "explanation": "..."
}
```

## 6. Job System

Every expensive operation should become a job.

Job stages:

```text
queued
interpreting
planning
building_scene
simulating
rendering
teaching
complete
failed_with_fallback
```

Store job outputs under:

```text
backend/static/jobs/{job_id}/
```

Common files:

```text
scenario.json
scene.json
trajectory.json
preview_frames/
final.mp4
diagram.png
explanation.mp3
result.json
```

## 7. Data Contracts

### Scenario

The scenario is the core truth object. It must exist before any sim or video.

Required fields:

- `scenario_id`
- `title`
- `domain`
- `concepts`
- `objects`
- `environment`
- `assumptions`
- `safety`
- `simulation_plan`

### Simulation Result

Required fields:

- `engine`
- `duration_s`
- `fps`
- `trajectories`
- `events`
- `metrics`
- `warnings`

### Teaching Result

Required fields:

- `transcript`
- `key_takeaway`
- `concepts_explained`
- `misconceptions_corrected`
- `followups`
- `audio_url`

## 8. External APIs And Tools

Use these as pluggable services, not hard dependencies.

### API Responsibility Map

| API / Tool | Primary Use | Backend Module | Frontend Exposure | Fallback |
| --- | --- | --- | --- | --- |
| OpenAI or comparable LLM | Parse questions, plan simulations, write explanations, generate follow-ups | `scenario_interpreter.py`, `tutor_agent.py` | Never direct; backend only | Ollama/templates |
| Backboard | Persistent student context, onboarding preferences, feedback/rating memory, learning-style adaptation | `memory_manager.py` | Never direct; backend only | local JSON/SQLite |
| ElevenLabs | Polished tutor voice, optional conversational voice/avatar | `voice_service.py`, `avatar_router.py` | audio URL only | browser TTS |
| STT provider / browser speech | Voice input transcription | `voice_service.py` or browser | microphone UI | text input |
| MuJoCo | Rigid-body physics truth layer | `simulation_runner.py` | streamed frames/state | analytic/Three.js |
| OpenCV | Uploaded video analysis and digital-twin tracking | `video_twin.py` | upload UI only | manual object selection |
| Runway / Sora-style video API | Cinematic enhancement from simulation frames/storyboards | `render_director.py` | final video URL only | Blender/Three.js/FFmpeg |
| Three.js / React Three Fiber | Real-time browser visualization, molecular scenes, diagrams | frontend components | direct frontend renderer | SVG/canvas |

### LLM

Options:

- OpenAI Responses/API for highest reasoning quality.
- Local Ollama/Mistral fallback for offline demo.

Use for:

- scenario interpretation
- explanation generation
- follow-up generation
- lab command planning

### Voice

ElevenLabs provides text-to-speech, speech-to-text, conversational agents, and real-time voice infrastructure through API/SDKs. Use it for polished narration and avatar voice when available.

Fallback:

- browser SpeechSynthesis API
- prerecorded narration for the core demo

### Backboard

Backboard is the adaptive learning memory layer. It should receive structured messages whenever the product learns something about the student.

Use it for:

- onboarding preferences
- every asked question
- every completed simulation
- every misconception corrected
- every 1-5 star rating
- every feedback chip/free-text note
- presentation behavior such as replaying, skipping, clicking follow-ups, or asking for more math

Do not expose Backboard keys or direct calls to the browser. The frontend sends `user_id` and context to the backend; the backend writes to Backboard.

Example memory write:

```text
User prefers visual animations and real-world analogies. They rated the molecule interaction sim 5/5 and asked for more charge diagrams. Use diagram-first explanations for future chemistry questions.
```

Before generating an answer, retrieve memory and adapt:

- explanation level
- amount of math
- visual style
- voice tone
- follow-up suggestions
- whether to use analogy, equation, or experiment framing first

### Video Generation

OpenAI Sora-style APIs and Runway APIs can generate or enhance cinematic video from prompts/images where available. Runway currently documents API access for video generation and editing models; OpenAI developer docs describe Sora video generation capabilities. Availability, pricing, and access must be verified before the hackathon demo.

Fallback:

- Blender render
- Three.js capture
- FFmpeg stitched frames

### Physics

MuJoCo provides Python bindings for physics simulation and is open source. Use it for rigid-body scenes.

Fallback:

- analytic equations for simple gravity/projectile/ramp cases
- browser physics with Rapier/Cannon
- prebuilt deterministic scene templates

## 9. Reliability Philosophy

Every impressive external capability must have a fallback.

If LLM fails:

- use scenario templates

If MuJoCo fails:

- use analytic trajectories

If video generation API fails:

- use Three.js/Blender/FFmpeg render

If ElevenLabs fails:

- show transcript and use browser TTS

If memory fails:

- continue stateless

Judges should never see a dead app because one API timed out.

## 10. Source Notes

Current docs checked for planning:

- OpenAI video generation docs: https://developers.openai.com/api/docs/guides/video-generation
- ElevenLabs TTS docs: https://elevenlabs.io/docs/overview/capabilities/text-to-speech
- MuJoCo Python docs: https://mujoco.readthedocs.io/en/stable/python.html
- Runway API docs: https://docs.dev.runwayml.com/
