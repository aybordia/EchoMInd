# EchoMind Frontend, Voice, Avatar, And Science Lab Architecture

## 1. Goal

The frontend must make EchoMind feel magical but understandable.

The user should always know:

- what the agent heard
- what it is building
- what simulation is running
- what the visual means
- what they can ask next

The UI should feel like an interactive science studio, not a form-based app.

## 2. Frontend Stack

Recommended:

```text
Next.js + TypeScript + Tailwind + Three.js
```

Core packages:

- `next`
- `react`
- `typescript`
- `tailwindcss`
- `three`
- `@react-three/fiber`
- `@react-three/drei` — Environment (HDRI), ContactShadows, Html labels, Text
- `@react-three/postprocessing` — Bloom, SSAO, DepthOfField, Vignette, ToneMapping
- `maath` — easing / smooth-damping for camera choreography
- `framer-motion` — beat-card overlays and UI motion
- `lucide-react`

These power the real-time 3D Cinematic Engine. Its full spec (materials, lighting,
postFX, camera, presets, components) is in
[`07_CINEMATIC_RENDER_ENGINE.md`](07_CINEMATIC_RENDER_ENGINE.md).

Optional:

- `leva` (dev only) — live-tune lighting/postFX, stripped from prod
- `zustand` for app state
- `react-dropzone` for video upload
- `wavesurfer.js` or simple canvas for audio waveform

## 3. App Routes

### `/`

Home page.

Elements:

- hero: "Ask any what-if. Watch science happen."
- large voice ask button
- text input fallback
- sample prompt cards
- upload video card
- science lab card

Sample prompts:

- "What if I jumped on every planet?"
- "What if Earth stopped spinning?"
- "What happens when two water molecules meet?"
- "Why does this box slide down the ramp?"

### `/ask`

Main WhatIf interface.

Elements:

- voice/text question bar
- agent status timeline
- simulation viewer
- cinematic result player
- diagram panel
- avatar/tutor panel
- follow-up chips

### `/video-twin`

Upload-to-digital-twin workflow.

Elements:

- upload dropzone
- original video player
- processing status timeline
- detected object/ramp preview
- reconstructed simulation
- side-by-side compare
- explanation panel

### `/lab`

Science lab expansion mode.

Elements:

- 3D lab scene
- inventory shelf
- voice command bar
- experiment log
- safety monitor
- observations panel

### `/memory`

Student learning memory.

Elements:

- concept graph
- past questions
- misconceptions corrected
- recommended experiments

### `/onboarding`

First-run learning personalization.

Elements:

- grade/level selector
- learning-style selector
- topic interest selector
- explanation-depth selector
- avatar/voice preference selector
- "build my learning profile" CTA

The page sends answers to `POST /api/onboarding`, which writes to Backboard through the backend.

### Feedback Modal

After each completed simulation, show a lightweight feedback modal or bottom sheet.

Elements:

- 1-5 star rating
- quick chips:
  - More visuals
  - More equations
  - Less math
  - Too fast
  - Too slow
  - More realistic
  - Better voice
  - Show another example
- optional text box

Send to `POST /api/feedback`.

## 4. Frontend State Model

Use a centralized app state.

Core state:

```ts
type EchoMindState = {
  sessionId: string | null
  userId: string | null
  currentJobId: string | null
  currentQuestion: string
  currentScenario: Scenario | null
  jobStatus: JobStatus | null
  result: AgentResult | null
  voiceEnabled: boolean
  voiceId: string | null        // student's chosen ElevenLabs (or browser) voice
  voiceLabel: string | null
  avatarEnabled: boolean
  memorySummary: StudentMemory | null
  onboardingComplete: boolean
  learningStyle: string[]
  studentLevel: string
  explanationDepth: string
}
```

Persistent localStorage keys:

```text
session_id
user_id
echomind_last_job_id
echomind_voice_enabled
echomind_voice_id
echomind_voice_label
echomind_student_level
echomind_onboarding_complete
echomind_learning_style
echomind_explanation_depth
```

## 5. Voice Input

### MVP Voice Input

Use browser speech recognition if available.

Fallback:

- text input
- prerecorded demo prompt button

### Better Voice Input

Use STT API if available.

Options:

- ElevenLabs speech-to-text
- OpenAI transcription
- browser native speech recognition

### Voice UX Rules

The app should show:

- listening state
- live transcript if available
- confidence/error state
- editable transcript before submit if needed

## 6. Voice Output

### Best Option

Use ElevenLabs TTS for polished narration.

ElevenLabs documents text-to-speech APIs for lifelike audio, real-time audio use cases, and multiple voice styles. Use it for the final spoken explanation if API access is available.

### Let The Student Choose Their Own Voice

The tutor voice is personal, so the student picks it — do not hardcode one voice.

- A **voice picker** appears in onboarding and in a settings/voice menu on `/ask`.
- It lists the available ElevenLabs voices (the backend exposes them via
  `GET /api/voices`, which proxies the ElevenLabs voices list so the key stays on
  the backend). Each entry shows a name, a short style label, and a **"Preview"
  button** that plays a short sample line.
- Selecting a voice stores `voice_id` (and a friendly `voice_label`) in app state +
  localStorage, and persists it to memory via onboarding/feedback so it carries
  across sessions (see `08` profile and `06` voice service).
- A student may also pick from their **own ElevenLabs library** — any custom or
  cloned voice on the account behind the configured key shows up in the same list,
  so they can use a voice they created themselves.
- If ElevenLabs is unavailable, the picker falls back to the browser
  `speechSynthesis` voice list (still selectable), so the choice always works.

Every request then narrates with the student's chosen `voice_id`; `voice_preference`
(calm / excited / professor / friendly) only sets tone/pacing when no explicit
voice is chosen.

### Fallback

Use browser `speechSynthesis` (with its own selectable voice list).

### Audio Output Contract

Backend returns:

```json
{
  "audio_url": "/static/jobs/job_123/explanation.mp3",
  "voice_id": "elevenlabs_voice_abc",
  "transcript": "Without air resistance, mass does not change how fast objects fall..."
}
```

Frontend:

- autoplay only after user gesture if browser allows
- show play button
- show transcript
- highlight current sentence if possible

## 7. Avatar Tutor

The avatar is the face of the teacher.

### MVP Avatar

Do not build a fully photoreal talking head first.

Build:

- animated orb or simple character
- mouth/audio pulse
- expression states
- pointing/highlighting behavior

States:

```text
idle
listening
thinking
simulating
explaining
asking_followup
```

### Advanced Avatar

Later options:

- ElevenLabs conversational agent
- avatar video API
- Ready Player Me / RPM avatar
- simple 2D animated character

### Avatar Responsibilities

The avatar should:

- repeat what it understood
- explain the simulation
- ask follow-up questions
- reference memory
- point attention to visual labels
- adapt tone and pacing based on onboarding and feedback
- explicitly say when it is changing teaching style because of feedback

It should not block the simulation if voice fails.

Example adaptive line:

```text
You asked for more diagrams last time, so I’ll show the force arrows before the animation.
```

## 8. Simulation Viewer

Component:

```text
frontend/components/SimulationViewer.tsx
```

This is a thin wrapper. The real rendering is the Cinematic Engine
(`components/cinematic/CinematicStage.tsx`), specified fully in
[`07_CINEMATIC_RENDER_ENGINE.md`](07_CINEMATIC_RENDER_ENGINE.md). `SimulationViewer`
just receives an `AgentResult`, pulls its `simulation.cinematic_scene_spec`, and
mounts `CinematicStage`.

Responsibilities:

- pass the `CinematicSceneSpec` to `CinematicStage`
- show loading states while the result is being prepared
- toggle between scripted playback and free-explore (OrbitControls) modes
- support split-screen / side-by-side for comparisons and video-twin
- drop to the `diagram_fallback` preset if WebGL2 is unavailable (see 07 §8)

Viewer modes (all are presets of the same engine):

```text
planet_jump
molecule
moon_drop
ramp_box
side_by_side
diagram_fallback
```

## 9. Cinematic Player

Component:

```text
frontend/components/CinematicPlayer.tsx
```

`CinematicPlayer` is `CinematicStage` in scripted-playback mode plus playback UI.
The default "film" is always the real-time 3D render; an AI-enhanced MP4, when
present, appears as an alternate tab (see 07 §12).

Responsibilities:

- play the real-time 3D clip on the master clock (audio + visuals synced, 07 §9)
- replay / scrub the clip
- if an optional `video_url` exists, offer it as a "Film" tab; otherwise hide it
- never block or error if the AI video is missing — real-time 3D is the deliverable

## 10. Diagram Overlay

Component:

```text
frontend/components/DiagramOverlay.tsx
```

Responsibilities:

- draw arrows
- draw labels
- show equations
- show force vectors
- show key takeaways

This component is crucial for education. Hyperreal video without labels is less useful.

## 11. Follow-Up Interface

After every answer, show follow-up chips.

Example:

```text
[Add air resistance]
[Try Jupiter]
[Double the mass]
[Show the equation]
```

Clicking a chip should call:

```text
POST /api/agent/followup
```

with prior job context.

## 12. Video Twin UI

The video twin interface should show three stages:

### Stage 1 - Original

- uploaded video
- trim/select clip if needed
- optional user hint: "This is a box sliding down a ramp."

### Stage 2 - Detection

- object bounding box
- tracked path
- detected ramp line
- confidence indicators

### Stage 3 - Twin

- reconstructed sim
- original-vs-sim side-by-side
- explanation of estimated values

If detection is weak, ask the user for one click:

```text
Click the object you want me to track.
```

This saves the demo.

## 13. Science Lab Mode

Science Lab is a future-wow feature. Architect it, but don't let it derail MVP.

### Lab Concept

The lab is a virtual environment where students can run simulated experiments with world-class tools.

Example command:

```text
Move the blue liquid into the petri dish.
```

The agent should:

1. parse command
2. check safety
3. update lab state
4. animate the action
5. explain observation
6. log result

### Lab UI Elements

- lab bench
- materials shelf
- instruments
- procedure timeline
- observation notebook
- safety warnings
- voice command bar

### MVP Lab Demo

If included, use one safe prebuilt experiment:

- pH color indicator
- bacterial growth concept model
- microscopy zoom simulation
- diffusion across membrane

## 14. Visual Design Direction

The app should feel premium and cinematic.

Style:

- dark background
- neon scientific accents
- glass panels
- glowing labels
- smooth motion
- high-contrast diagrams
- large visual center stage

Avoid:

- cluttered dashboards
- raw JSON exposed to users
- unstyled file inputs
- long paragraphs without visuals

## 15. Accessibility And Classroom Use

Include:

- captions for all voice explanations
- text input fallback for voice
- transcript for audio
- reduce motion option
- clear safety messaging
- student-level selector

## 16. Frontend Success Criteria

The frontend succeeds when:

- a judge can ask a question without typing
- the app visibly progresses through agent stages
- simulation/video appears in the center
- voice explanation plays or transcript appears
- follow-up suggestions are obvious
- upload video flow creates a visible digital twin result
- app remains usable if backend is slow or an API fails
- onboarding captures learning style before the first full session
- every result can be rated 1-5 stars
- feedback chips are sent to the backend with `user_id` and `job_id`
- future explanations visibly adapt to stored preferences
