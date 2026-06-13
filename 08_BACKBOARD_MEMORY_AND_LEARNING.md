# EchoMind Backboard Memory And Constant-Context Learning

> This file makes the "EchoMind learns how to teach each student" promise
> buildable. It defines the exact memory file, the read/write loop, the adaptation
> rules, and the Backboard adapter — so wiring it up is mechanical.

## 0. The Core Idea

```text
EchoMind does not just answer. After every interaction it writes what it learned
about the student, and before every answer it reads that back and adapts.
```

There are two layers, and both are always present:

1. **The Memory File (always-on, local, the source of truth at runtime).**
   A per-user JSON file that is read before every answer and updated after every
   interaction. This is the "constant context learning on the file." It works with
   zero external dependencies and never fails the product.

2. **Backboard (the durable brain / sync target).**
   The same structured learning is mirrored to Backboard so memory survives,
   aggregates, and can be queried richly. Backboard is authoritative for long-term
   storage; the local file is authoritative for the live request.

If Backboard is unreachable, the product keeps learning via the file and re-syncs
later. The student never sees a failure.

## 1. The Learning Loop

```text
READ (file → context)  →  ADAPT (shape the answer)  →  TEACH  →  OBSERVE (rating, behavior)
        ▲                                                                    │
        └──────────────── WRITE (file + queue Backboard sync) ◀──────────────┘
```

This is the same `OBSERVE → STORE → ADAPT → TEST → STORE AGAIN` loop named in
`03`, made concrete.

## 2. The Memory File Format

Path:

```text
backend/data/memory/{user_id}.json
```

Written atomically (write to `*.tmp`, then `os.replace`) to avoid corruption.
Schema (`memory_version` lets us migrate safely):

```jsonc
{
  "memory_version": "1.0",
  "user_id": "user_abc",
  "created_at": "2026-06-13T00:00:00Z",
  "updated_at": "2026-06-13T00:00:00Z",

  // ---- WHO THIS STUDENT IS ----
  "profile": {
    "student_level": "middle_school",          // elementary | middle_school | high_school | college
    "favorite_topics": ["space", "chemistry"],
    "voice_preference": "friendly_excited"      // calm | excited | funny | professor | friendly_excited
  },

  // ---- HOW THEY LEARN BEST (the adaptive dials) ----
  "preferences": {
    "learning_style": ["visual_animations", "real_world_analogies"],
    "math_level": "light_equations",            // none | light_equations | show_equations | math_first
    "pace": "quick_then_deeper",                // quick | quick_then_deeper | deep
    "diagram_density": "high",                  // low | medium | high
    "analogy_preference": "everyday_examples",
    "narration_seconds_target": 35,             // derived from pace + ratings
    "visual_style": "cinematic_with_labels"
  },

  // ---- WHAT THEY KNOW / GOT WRONG ----
  "knowledge": {
    "concepts_seen": ["gravity", "momentum", "friction"],
    "concepts_mastered": ["gravity"],
    "misconceptions_corrected": [
      { "misconception": "heavier objects always fall faster",
        "corrected_by": "moon_drop sim", "date": "2026-06-13" }
    ]
  },

  // ---- HISTORY ----
  "recent_scenarios": [
    { "job_id": "planet_jump_123", "preset": "planet_jump",
      "title": "Jump on every planet", "concepts": ["gravity"], "date": "2026-06-13" }
  ],
  "feedback_history": [
    { "job_id": "planet_jump_123", "rating": 5,
      "chips": ["more_visuals", "show_equation_next"],
      "free_text": "Loved the animation, show me the formula too.",
      "presentation_metrics": { "replayed_video": true, "watched_percent": 0.92,
                                "clicked_followup": "Try Jupiter" },
      "date": "2026-06-13" }
  ],
  "next_recommended_questions": ["What if there were no air on Earth?"],

  // ---- DERIVED, HUMAN-READABLE SUMMARY (fed to the LLM/tutor) ----
  "teaching_summary": "Middle-school student who loves space. Learns best from visual animations and everyday analogies. Keep narration ~35s, lead with the 3D visual, then offer one equation card. Rated planet-jump 5/5 and asked for formulas.",

  // ---- BACKBOARD SYNC BOOKKEEPING ----
  "sync": { "pending_writes": [], "last_synced_at": null, "backboard_thread_id": null }
}
```

### Field ownership

- `onboarding` writes `profile` + `preferences` (initial values).
- A completed job appends to `recent_scenarios` and `knowledge`.
- `feedback` appends to `feedback_history` and **mutates `preferences`** via §5.
- `teaching_summary` is regenerated on every write (deterministic template now, LLM
  polish later) and is the single string handed to the interpreter/tutor.

## 3. The Memory Manager API (backend)

`backend/services/memory_manager.py` — the ONLY module that touches memory. The
Backboard key is never exposed beyond it.

```python
async def get_student_context(user_id: str) -> StudentContext:
    """Read the memory file (create default if missing). Returns the live context
    used by the scenario interpreter and tutor. Never raises — returns a blank
    default on any error."""

async def store_onboarding(req: OnboardingRequest) -> dict:
    """Initialize profile + preferences, write file, queue Backboard sync.
    Returns {status, personalization_summary}."""

async def store_simulation_memory(user_id: str, scenario: dict, teaching: dict) -> None:
    """Append scenario + concepts; update concepts_seen; regenerate summary;
    write file; queue Backboard sync."""

async def store_feedback(req: FeedbackRequest) -> dict:
    """Append feedback, run the adaptation rules (§5) to mutate preferences,
    regenerate summary, write file, queue Backboard sync.
    Returns {status, next_adaptation}."""

async def get_memory_summary(user_id: str) -> dict:
    """Public-safe read for GET /api/memory/{user_id}: summary, concepts_seen,
    suggested_questions. Never returns raw Backboard ids or keys."""
```

`StudentContext` (Pydantic) is a typed view of `profile` + `preferences` +
`teaching_summary` + a short slice of recent history — exactly what the
interpreter and tutor need, nothing more.

## 4. Read Before / Write After (wiring)

| Hook | When | Call |
| --- | --- | --- |
| READ | start of `POST /api/agent/ask`, before interpretation | `get_student_context(user_id)` |
| READ | before tutor narration generation | reuse the same context |
| WRITE | `POST /api/onboarding` | `store_onboarding(req)` |
| WRITE | after a job reaches `complete` | `store_simulation_memory(...)` |
| WRITE | `POST /api/feedback` | `store_feedback(req)` |

The interpreter uses context to bias domain/level; the tutor uses it to shape
length, math, analogies, and voice. See `06` service behavior.

## 5. Adaptation Rules (deterministic, the heart of "it learns")

These run inside `store_feedback` and shape the next answer. They are explicit so
behavior is testable without an LLM.

| Observation | Mutation to `preferences` |
| --- | --- |
| chip `more_visuals` OR rating ≤ 3 with style not visual | add `visual_animations`, bump `diagram_density` toward `high` |
| chip `more_equations` / `show_equation_next` | `math_level` → at least `show_equations` |
| chip `less_math` | `math_level` → step down (`math_first`→`show`→`light`→`none`) |
| chip `too_fast` | shrink `narration_seconds_target` is WRONG → **increase** it +8s, `pace` → `quick_then_deeper` or `deep` |
| chip `too_slow` | decrease `narration_seconds_target` −8s (floor 18s), `pace` → `quick` |
| chip `more_realistic` | `visual_style` → `cinematic_with_labels`, request `video_enhancement` next time |
| chip `better_voice` | flag voice tone for review; try alternate ElevenLabs voice |
| `clicked_followup` present | push related concept into `next_recommended_questions` |
| `replayed_video` true | mark that scenario's concept as high-interest (boost in recs) |
| `watched_percent` < 0.4 | answer was too long/boring → trim target length, add a hook beat |
| rating 5 two times with same style | lock that style as the default; stop asking |

After mutation, regenerate `teaching_summary` and return a human `next_adaptation`
string, e.g.:

```text
Future explanations will lead with the 3D visual, then show one equation card, and run about 35 seconds.
```

`narration_seconds_target` flows directly into the tutor's length budget and into
`CinematicSceneSpec.duration_s` (via the timing handshake in `07` §9).

## 6. Backboard Adapter

`backend/services/backboard_client.py` — wraps the real Backboard API behind a
stable interface so the rest of the app never changes when keys/endpoints arrive.

```python
class BackboardClient:
    def __init__(self, api_key: str | None):
        self.enabled = bool(api_key)
        # TODO(when docs provided): base_url, auth header, thread/collection setup

    async def upsert_student(self, user_id: str, memory: dict) -> str | None:
        """Push the full structured memory (or a delta). Returns a backboard
        thread/record id to store in memory['sync']['backboard_thread_id'].
        No-op returning None when disabled."""

    async def append_event(self, user_id: str, kind: str, payload: dict) -> None:
        """kind ∈ {onboarding, simulation, feedback, misconception}.
        Sends a structured learning event. No-op when disabled."""

    async def fetch_student(self, user_id: str) -> dict | None:
        """Optional: pull durable memory to seed/repair the local file
        (e.g. on a fresh device). None when disabled."""
```

### >>> SLOT FOR REAL BACKBOARD CREDENTIALS/DOCS <<<

When the Backboard docs/keys are provided, fill in EXACTLY these and nothing else
changes elsewhere:

```text
BACKBOARD_BASE_URL   = <from docs>
BACKBOARD_API_KEY    = <from .env>            # already reserved in 06 §4
auth header          = <e.g. "Authorization: Bearer ...">  # confirm with docs
upsert endpoint      = <method + path>        # maps to upsert_student
event endpoint       = <method + path>        # maps to append_event
fetch endpoint       = <method + path>        # maps to fetch_student
request/response body = <map memory schema §2 fields to Backboard's fields>
```

Until then, `BackboardClient(api_key=None)` makes every method a safe no-op and the
local file carries the product. **This is by design — Backboard is additive, never
load-bearing for a live demo.**

### Event message style (what we send Backboard)

Backboard should receive readable, structured learning events — the same content
as `teaching_summary` plus the raw fields. Examples:

```text
[onboarding] user_abc: middle-school, loves space + chemistry, learns via visual
animations and everyday analogies, wants quick answers first then depth, excited voice.

[feedback] user_abc / planet_jump_123: rated 5/5, chips=[more_visuals,
show_equation_next], replayed the Moon comparison, watched 92%. Adapt: lead with
the 3D visual, add one equation card, ~35s narration.
```

## 7. Sync Strategy (file ↔ Backboard)

- Every write updates the file first (synchronous, must succeed), then enqueues a
  Backboard sync in `memory['sync']['pending_writes']`.
- A lightweight background task (or fire-and-forget `asyncio.create_task`) flushes
  pending writes via `append_event` / `upsert_student`. On success it clears the
  queue and sets `last_synced_at`.
- On Backboard failure: leave the item queued, keep going. Retry on next write.
- On a fresh environment with no file but Backboard available: `fetch_student` once
  to seed the file (best-effort).

This guarantees: **local file = never lose a beat; Backboard = durable truth.**

## 8. Privacy & Safety

- Frontend NEVER calls Backboard and NEVER sees the key. It sends `user_id` +
  context to the backend only (`05` state model already does this).
- `GET /api/memory/{user_id}` returns only the public-safe summary (§3), never raw
  sync ids, keys, or full feedback free-text unless the same user.
- No PII required: `user_id` is an opaque local id created at `POST /api/session`.

## 9. Acceptance Checklist

The learning system is done when:

- [ ] a missing memory file is created with sane defaults on first read
- [ ] onboarding persists profile + preferences to the file
- [ ] every completed job appends scenario + concepts
- [ ] feedback mutates preferences per §5 and returns a `next_adaptation` string
- [ ] the next answer visibly changes (length / math / visuals) based on stored prefs
- [ ] `teaching_summary` is regenerated on every write and fed to interpreter + tutor
- [ ] the app works fully with `BACKBOARD_API_KEY` unset (file-only)
- [ ] when the key is set, events sync and `last_synced_at` updates
- [ ] no Backboard key or raw sync id ever reaches the frontend
</content>
