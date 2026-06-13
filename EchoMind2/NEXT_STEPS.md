# EchoMind2 — Handoff: Validate What Exists, Then Finish

> Read this first. It tells you (the next builder) exactly what is already built,
> how to **validate** it, and the **remaining work** in priority order. The repo
> architecture/vision lives in the root `01..08_*.md` files; this file is the
> concrete to-do for the `EchoMind2/` app.

## 0. Environment & Run (do this before anything)

This cloud sandbox **blocks outbound network** to the providers (egress allowlist
returns 403 for `api.openai.com`, `api.elevenlabs.io`, `app.backboard.io`,
`api.dev.runwayml.com`). So **live API features can only be validated on a machine
with open network** (the user's laptop) OR after those hosts are added to the
environment's egress allowlist. Everything else runs here.

Keys live in `EchoMind2/backend/.env` (gitignored — recreate from the values the
user provided; template in `backend/.env.example`).

```bash
# Backend  (MUST be port 8001 — the frontend defaults to http://localhost:8001)
cd EchoMind2/backend
pip install -r requirements.txt
uvicorn main:app --port 8001

# Frontend (new terminal)
cd EchoMind2/frontend
npm install
npm run build      # must pass with zero errors
npm start          # http://localhost:3000
```

Port note: `frontend/lib/api.ts` → `BACKEND_URL` defaults to `:8001`. Either run
uvicorn on 8001 or set `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local`.

Headless screenshot harness (works in-sandbox, software WebGL): use the global
Playwright at `/opt/node22/lib/node_modules/playwright` with browser
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` and flags
`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --no-sandbox`.

---

## 1. What Is Already Built (state at this handoff)

Branch: `claude/trusting-hamilton-ttpx1s`. Frontend production build passes.

- **Backend (FastAPI)** `backend/`
  - Pipeline: `routers/agent_router.py` → `scenario_interpreter` → `simulation_templates`
    → `tutor_agent` → `voice_service`, persisted under `static/jobs/{job_id}/`.
  - `scenario_interpreter.py`: OpenAI classifier routes arbitrary questions to the
    right sim (planet_jump / moon_drop / molecule_interaction / diagram); keyword
    fallback when no key.
  - `tutor_agent.py`: builds transcript + **journey beats** (each with a keyword-aware
    `focus`), takeaway, followups, adaptation note.
  - `voice_service.py`: `list_voices()` (ElevenLabs catalog incl. custom voices),
    `synthesize_voice()` (full narration), `synthesize_beats()` (per-beat audio).
  - `memory_manager.py`: local JSON memory (always-on) + Backboard sync; onboarding,
    feedback adaptation, voice_id persistence.
  - Routes: `/health`, `/api/session`, `/api/agent/ask`, `/api/agent/result/{id}`,
    `/api/agent/followup`, `/api/voices`, `/api/onboarding`, `/api/memory/{user}`,
    `/api/feedback`, `/api/video-twin/upload`.
- **Frontend (Next 16 / React 19)** `frontend/`
  - Cinematic stage `components/simulation/SceneStage.tsx`: IBL (inline lightformers),
    3-point rig, contact shadows, postFX (N8AO, Bloom, DoF, Vignette, ACES).
  - Viewers: `PlanetJumpViewer` (astronaut figures, hero glow rings, **activeFocus
    spotlight**), `MoleculeViewer`, `MoonDropViewer`, `RampBoxViewer`, `DiagramOverlay`.
  - `components/CinematicJourney.tsx`: narrated step-by-step tour (per-beat audio →
    browser-TTS fallback → safety timer), play/pause/prev/next/replay, emits focus.
  - `components/VoicePicker.tsx`: ElevenLabs-style picker with preview, persisted.
  - Pages: `/`, `/onboarding`, `/ask` (journey wired), `/video-twin`.

---

## 2. VALIDATION CHECKLIST (do this FIRST, fix what fails)

Run locally (open network) so APIs are live. Mark each ✅/❌ and fix ❌ before new work.

### 2a. Backend smoke (curl)
- [ ] `curl localhost:8001/health` → `{"status":"ok"}`.
- [ ] `POST /api/session` → returns `session_id` + `user_id`.
- [ ] `POST /api/agent/ask` with `"What if I jumped on every planet?"` → `simulation.type=="planet_jump"`, 9 planets, `teaching.beats` non-empty, each beat has `audio_url` (when ElevenLabs reachable).
- [ ] Repeat for "two water molecules" → `molecule_interaction`; "bowling ball and feather on the moon" → `moon_drop`; an off-domain Q like "how do volcanoes erupt" → with OpenAI key returns `diagram`/`fallback_diagram` (NOT a fake planet jump).
- [ ] `GET /api/voices` → returns real ElevenLabs voices (name + preview_url). Confirm the user's custom voice appears.
- [ ] `static/jobs/{job_id}/explanation.mp3` and `beat_*.mp3` exist and play.
- [ ] `POST /api/onboarding` then `GET /api/memory/{user}` → preferences stored; `data/memory/{user}.json` written.
- [ ] `POST /api/feedback` (rating + chips) → returns `next_adaptation`; re-ask and confirm transcript/length/voice adapts.

### 2b. Frontend (browser + headless screenshot)
- [ ] `npm run build` passes with **zero** errors/warnings that matter.
- [ ] `/ask?q=What if I jumped on every planet?` auto-runs; agent timeline → result.
- [ ] **Cinematic look**: dark graded bg, glossy planets, contact shadows, bloom on glow rings, astronaut figures visible on each planet. (On a GPU; sandbox screenshots are software-rendered and dull.)
- [ ] **Journey**: caption bar steps through beats; voice narrates each step in the chosen voice; pause/next/prev/replay work; the spotlighted planet scales+glows in sync with the line; finishing opens feedback.
- [ ] **VoicePicker**: lists voices, preview plays, selection persists across reload and is used for narration.
- [ ] Molecule + moon-drop + a diagram-fallback question all render without console errors.
- [ ] **Resilience**: with backend stopped, the UI shows a clean error (no crash). With ElevenLabs key removed, journey falls back to browser TTS.

### 2c. Known gaps to confirm/fix during validation
- [ ] `voice-twin` page upload flow end-to-end (OpenCV path in `services/video_twin.py`).
- [ ] Onboarding page does **not** yet include the VoicePicker (only `/ask` does) — add it (see 3.2).
- [ ] Camera is auto-orbit only; journey spotlight currently = scale+emissive, **not** a real camera move (see 3.1).
- [ ] `molecule/moon_drop/ramp` viewers ignore `activeFocus` (see 3.3).

---

## 3. REMAINING WORK (priority order)

> DONE since handoff: **3.1 camera choreography** (CameraDirector in `SceneStage`,
> driven by PlanetJumpViewer's `cameraFocus`) and **3.2 onboarding voice picker**
> (VoicePicker added to onboarding step 4, persists `voice_id`/`voice_label`). Both
> validated: build passes, headless journey advanced 3/6 with the camera moving and
> zero console errors. Single-origin proxy (`next.config.ts`) also landed so the app
> runs behind one port. Remaining items below.

### 3.1 Real camera choreography for the journey  — ✅ DONE (extend to other viewers)
Implemented for planet jump. To finish: give `MoleculeViewer` / `MoonDropViewer` /
`RampBoxViewer` their own `cameraFocus` mapping so their journeys move the camera too
(currently only PlanetJumpViewer passes `cameraFocus` to `SceneStage`). Reference
`07_CINEMATIC_RENDER_ENGINE.md` §7:
- Accept an optional `focusTarget` (world position or object id) + a `shot` hint.
- In `useFrame`, ease `camera.position`/`lookAt` toward the focused element using
  `maath/easing.damp3` (already installed). Disable `autoRotate` while a focus is
  active; resume on `overview`.
- Add a **slow-motion** factor on the "hero" beat (scale trajectory playback).
- Wire: `CinematicJourney` already emits `focus`; pass it down to `SceneStage` and
  map focus→target position per viewer.

### 3.2 Voice picker in onboarding + persist to backend  — ✅ DONE
VoicePicker added to onboarding step 4; `voice_id`/`voice_label` sent in
`submitOnboarding` and stored in memory. (Already confirmed `/ask` restores the
persisted voice via localStorage `echomind_voice_id` / `echomind_voice_label`.)

### 3.3 Extend `activeFocus` spotlight to the other viewers
- `MoleculeViewer`: focus `charges` → highlight partial-charge labels/atoms; focus
  `bond` → pulse the hydrogen-bond/ionic arc (bloom).
- `MoonDropViewer`: focus `drop`/`land` → emphasize the falling objects / impact.
- `RampBoxViewer`: focus `gravity`/`normal`/`friction` → light up the matching arrow.
- Each viewer takes `activeFocus?: string | null` like `PlanetJumpViewer`.

### 3.4 Runway human-video layer (people scenarios)  — needs RUNWAY key + open egress
Per `07 §12` (optional, never on critical path):
- Backend `services/render_director.py` (new): when a scenario involves a person
  (e.g., planet jump), capture/define hero keyframes and call Runway image-to-video
  with the style prompt in `07 §12`; save `static/jobs/{id}/final.mp4`; return
  `simulation.video_url`. Must be best-effort + fully async; never block the result.
- Frontend: add a "Film" tab in a `CinematicPlayer` next to the real-time 3D
  (default stays 3D; show the mp4 only if present).
- Validate egress to `api.dev.runwayml.com` first; keep 3D as the guaranteed output.

### 3.5 Backboard verification
- Confirm `memory_manager._backboard_write/read` match the real Backboard API at
  `BACKBOARD_BASE_URL=https://app.backboard.io/api` (endpoints/auth/body). Adjust the
  adapter (see `08_BACKBOARD_MEMORY_AND_LEARNING.md` §6) once validated against a live
  call. Local JSON memory must keep working regardless.

### 3.6 Polish
- Equation card + final takeaway as proper "beat cards" (07 §10) synced to the last beats.
- `framer-motion` transitions on caption changes.
- Mobile layout for `/ask` (viewer stacks above tutor panel).
- Replace placeholder favicon/og; tighten copy.

---

## 4. Guardrails
- Never commit `backend/.env` (gitignored). Never expose any key to the frontend —
  all OpenAI/ElevenLabs/Runway/Backboard calls stay server-side.
- Every external call must have a fallback; the demo must survive a dead/blocked API.
- Keep `frontend/lib/types.ts` in sync with `backend/models/schemas.py`.
- Run `npm run build` (frontend) and import-check the backend before every push.
- Heed `frontend/AGENTS.md` (Next 16 has breaking changes; check `node_modules/next/dist/docs`).

## 5. Definition of Done (full product)
- [ ] Voice or text question → accurate sim → narrated journey with real camera moves.
- [ ] Narration in the user's chosen ElevenLabs voice; pause/continue per step.
- [ ] Spotlight + camera follow the explanation across all viewers.
- [ ] People-scenarios optionally show a Runway film tab; 3D is the fallback.
- [ ] Onboarding captures voice + style; feedback visibly adapts the next answer.
- [ ] Backboard sync verified; local memory fallback intact.
- [ ] Survives missing keys / blocked APIs; build clean; demo < 3 min.
