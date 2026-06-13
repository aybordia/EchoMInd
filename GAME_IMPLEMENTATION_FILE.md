# GAME_IMPLEMENTATION_FILE.md - EchoMind Rewards, Progression, And Learning Game Layer

> Purpose: Add easy-to-build but impressive game mechanics to EchoMind.
> Goal: Make students feel rewarded for curiosity, experimentation, prediction, and learning style feedback without overbuilding a full game.
> Rule: This file is implementation-first. Claude Code should follow the steps in order and avoid adding extra systems until the MVP loop works.

## 1. The Game Layer In One Sentence

EchoMind turns curiosity into progress: every question, prediction, simulation, follow-up, and feedback rating helps the student unlock concepts, earn badges, build a science identity, and personalize the AI tutor through Backboard.

## 2. Why This Matters

The core EchoMind product is already powerful:

```text
Ask question -> generate simulation -> explain science -> suggest follow-up -> remember learning style
```

The game layer makes that loop addictive and judge-impressive:

```text
Ask question -> predict outcome -> watch simulation -> earn XP -> unlock concept -> correct misconception -> get personalized next challenge
```

The game mechanics should not distract from learning. They should make the student want to ask one more question.

## 3. Ruthless Scope

### Build Now

Build only five mechanics:

1. **Curiosity XP**
2. **Prediction Challenge**
3. **Concept Mastery Map**
4. **Misconception Badges**
5. **Lab Tool Unlocks**

These are high-impact and easy to implement with metadata, cards, and local/Backboard memory.

### Do Not Build Yet

Do not build:

- multiplayer leaderboards
- real-money rewards
- complex economy
- NFT/marketplace mechanics
- full classroom competition
- account system beyond `user_id`
- daily notification system
- large quest engine
- social sharing platform

These waste time and can make the product feel less serious.

## 4. The Five Mechanics

## Mechanic 1 - Curiosity XP

### Concept

Students earn XP for curiosity behaviors.

XP rewards:

```text
Ask a question: +10 XP
Run a simulation: +20 XP
Ask a follow-up: +15 XP
Make a prediction before sim: +20 XP
Correctly predict result: +30 XP
Rate the explanation: +5 XP
Give written feedback: +10 XP
Explore a new concept: +25 XP
Correct a misconception: +50 XP
Upload a real-world video: +40 XP
```

### Why It Works

It rewards the exact behaviors EchoMind wants:

- asking questions
- testing hypotheses
- reflecting on explanations
- exploring deeper
- learning from mistakes

### Implementation

Backend stores:

```json
{
  "user_id": "user_123",
  "xp_total": 320,
  "xp_events": [
    {
      "type": "ask_question",
      "amount": 10,
      "job_id": "job_123",
      "timestamp": "..."
    }
  ]
}
```

Frontend shows:

- XP pill in header
- small XP toast after actions
- level progress bar

Level formula:

```text
level = floor(sqrt(xp_total / 100)) + 1
```

Keep this simple.

## Mechanic 2 - Prediction Challenge

### Concept

Before running certain simulations, EchoMind asks the student to predict what will happen.

Example:

```text
Before I run it: on which planet do you think the jump will be highest?
```

Options:

```text
Moon
Earth
Jupiter
Neptune
```

After the simulation:

```text
Correct — the Moon has much lower gravity, so the same jump force sends you higher.
```

or:

```text
Not quite — this is the surprising part. Jupiter's gravity is so strong that you barely leave the ground.
```

### Why It Works

Prediction creates active learning. Students learn more when they commit to an answer before seeing the result.

### Implementation

Add prediction fields to simulation result:

```json
{
  "prediction_prompt": "Which planet gives the highest jump?",
  "prediction_options": ["Moon", "Earth", "Jupiter", "Neptune"],
  "correct_prediction": "Moon",
  "prediction_explanation": "The Moon has much lower gravity, so the same launch speed creates a higher jump."
}
```

Frontend flow:

1. User asks question.
2. Backend returns scenario and prediction prompt before final reveal.
3. Frontend displays prediction card.
4. User picks answer.
5. Frontend sends prediction to backend.
6. Backend stores prediction result and awards XP.
7. Simulation reveal plays.

MVP shortcut:

If full pre-reveal flow is too slow, show the prediction card immediately before playing the already-loaded animation.

## Mechanic 3 - Concept Mastery Map

### Concept

Every simulation unlocks science concept nodes.

Example nodes:

```text
Gravity
Friction
Momentum
Air Resistance
Molecular Bonds
Charge Attraction
Normal Force
Energy
Pressure
Tidal Forces
```

Each node has progress:

```text
0% unseen
25% introduced
50% explored
75% applied
100% mastered
```

### Why It Works

It makes learning feel visible. Students can see their science world expanding.

### Implementation

Backend stores:

```json
{
  "concept_mastery": {
    "gravity": {
      "status": "explored",
      "progress": 50,
      "evidence": ["planet_jump", "moon_drop"]
    },
    "friction": {
      "status": "introduced",
      "progress": 25,
      "evidence": ["ramp_video_twin"]
    }
  }
}
```

Progress rules:

```text
First exposure: 25%
Second related sim: 50%
Correct prediction involving concept: +25%
Misconception corrected: +25%
Student explains concept in feedback/free text: +25%
Max: 100%
```

Frontend route:

```text
/progress
```

Frontend components:

```text
ConceptMap.tsx
ConceptNode.tsx
MasteryPanel.tsx
```

MVP UI:

- node grid, not complex graph
- glowing completed nodes
- locked faded future nodes
- click node to see related simulations

## Mechanic 4 - Misconception Badges

### Concept

When a simulation corrects a common misconception, the student earns a badge.

Examples:

```text
Mass Myth Busted
Gravity Explorer
Friction Detective
Momentum Master
Molecule Matchmaker
Charge Whisperer
Air Resistance Revealed
Digital Twin Builder
Black Hole Survivor
```

### Why It Works

Badges become memorable learning moments. They also make wrong predictions feel positive, not embarrassing.

### Implementation

Scenario templates include possible misconceptions:

```json
{
  "misconception": {
    "id": "heavier_falls_faster",
    "statement": "Heavier objects always fall faster.",
    "corrected_by": "In vacuum, all objects accelerate equally under gravity.",
    "badge": "Mass Myth Busted"
  }
}
```

Award badge when:

- student predicts the misconception answer and learns correction
- simulation is completed and misconception is explained
- student asks a question tied to known misconception

Backend stores:

```json
{
  "badges": [
    {
      "id": "mass_myth_busted",
      "name": "Mass Myth Busted",
      "earned_at": "...",
      "job_id": "job_123"
    }
  ]
}
```

Frontend:

- badge toast after explanation
- badge shelf on `/progress`
- badge cards with short explanation

## Mechanic 5 - Lab Tool Unlocks

### Concept

As students master concepts, they unlock virtual science tools.

Examples:

```text
Gravity Slider
Vacuum Chamber
Wind Tunnel
Friction Pad
Molecule Viewer
Charge Visualizer
Slow Motion Camera
Force Arrow Overlay
Digital Twin Scanner
Mini Lab Bench
```

### Why It Works

This makes progress feel concrete and supports the future Science Lab mode.

### Implementation

Unlock rules:

```json
{
  "gravity_slider": {
    "name": "Gravity Slider",
    "requires": ["gravity:50"],
    "description": "Change gravity in any mechanics simulation."
  },
  "vacuum_chamber": {
    "name": "Vacuum Chamber",
    "requires": ["gravity:50", "air_resistance:25"],
    "description": "Toggle air resistance on and off."
  },
  "molecule_viewer": {
    "name": "Molecule Viewer",
    "requires": ["molecular_bonds:25"],
    "description": "See atoms, bonds, and charges in 3D."
  }
}
```

Frontend:

- show unlock toast
- show tools in `/progress`
- optionally show unlocked tool buttons inside simulations

MVP:

Unlocks can be mostly cosmetic plus one or two real toggles.

Real toggles to build first:

- gravity slider for planet jump
- force arrows toggle
- molecule charge labels toggle

## 5. Backboard Integration

Backboard is the memory brain for the game layer.

It should remember:

- XP events
- concepts explored
- badges earned
- prediction accuracy
- tools unlocked
- preferred challenge difficulty
- which rewards motivate the student
- whether the student likes competitive, exploratory, or story-based progress

### Backboard Write Examples

After prediction:

```text
Student predicted Jupiter would have the highest jump, then learned the Moon gives the highest jump because lower gravity means greater height for the same launch velocity. Awarded Gravity Explorer progress and Mass/Gravity misconception correction context.
```

After feedback:

```text
Student rated the planet jump challenge 5/5 and clicked 'more challenges'. They appear motivated by prediction games and visual comparison. Offer prediction prompts earlier in future lessons.
```

After badge:

```text
Student earned 'Mass Myth Busted' after learning that in vacuum, mass does not affect gravitational acceleration. Connect future gravity explanations to this badge.
```

### Backboard Read Behavior

Before generating the next simulation, retrieve context and adapt:

- if student likes challenges, show prediction first
- if student dislikes quizzes, make prediction optional
- if student likes badges, emphasize unlocks
- if student struggles with a concept, recommend a simpler sim
- if student mastered a concept, unlock harder variants

## 6. Backend Implementation Steps

## Step 1 - Add Game Schemas

In `backend/models/schemas.py`, add:

```python
class XPEvent(BaseModel):
    type: str
    amount: int
    job_id: str | None = None
    metadata: dict = {}

class PredictionSubmitRequest(BaseModel):
    job_id: str
    session_id: str
    user_id: str
    selected_answer: str

class GameState(BaseModel):
    user_id: str
    xp_total: int = 0
    level: int = 1
    concept_mastery: dict = {}
    badges: list[dict] = []
    unlocked_tools: list[str] = []
    prediction_stats: dict = {}
```

## Step 2 - Add Game Service

Create:

```text
backend/services/game_manager.py
```

Functions:

```python
def calculate_level(xp_total: int) -> int:
    ...

async def get_game_state(user_id: str) -> dict:
    ...

async def award_xp(user_id: str, event_type: str, amount: int, job_id: str | None = None, metadata: dict | None = None) -> dict:
    ...

async def update_concept_mastery(user_id: str, concepts: list[str], job_id: str) -> dict:
    ...

async def award_badge(user_id: str, badge: dict, job_id: str) -> dict:
    ...

async def evaluate_unlocks(user_id: str) -> list[dict]:
    ...

async def submit_prediction(req: PredictionSubmitRequest, job_result: dict) -> dict:
    ...
```

Storage:

```text
backend/data/memory/{user_id}.json
```

The game manager should use the same local memory file as `memory_manager.py` so learning memory and game state stay together.

## Step 3 - Add Game Routes

Create:

```text
backend/routers/game_router.py
```

Routes:

```text
GET  /api/game/state/{user_id}
POST /api/game/prediction
POST /api/game/xp
```

Required behavior:

- `/api/game/state/{user_id}` returns XP, level, concept mastery, badges, tools.
- `/api/game/prediction` checks selected answer, awards XP, updates stats, writes Backboard memory.
- `/api/game/xp` is internal/dev utility; do not expose in final UI unless useful.

## Step 4 - Connect Game Events To Agent Flow

In `POST /api/agent/ask`:

- award `ask_question` XP
- after simulation complete, award `run_simulation` XP
- update concept mastery using scenario concepts
- include prediction prompt if available
- include earned badges/unlocks in result

In `POST /api/feedback`:

- award `rate_explanation` XP
- if free text exists, award `written_feedback` XP
- write motivation pattern to Backboard

In `POST /api/video-twin/upload`:

- award `upload_real_video` XP
- unlock or progress `Digital Twin Builder`

## 7. Frontend Implementation Steps

## Step 1 - Add Types

In `frontend/lib/types.ts`, add:

```ts
export type GameState = {
  user_id: string
  xp_total: number
  level: number
  concept_mastery: Record<string, ConceptMastery>
  badges: Badge[]
  unlocked_tools: string[]
  prediction_stats: Record<string, unknown>
}

export type ConceptMastery = {
  status: 'unseen' | 'introduced' | 'explored' | 'applied' | 'mastered'
  progress: number
  evidence: string[]
}

export type Badge = {
  id: string
  name: string
  description: string
  earned_at: string
  job_id?: string
}
```

## Step 2 - Add API Functions

In `frontend/lib/api.ts`, add:

```ts
getGameState(userId: string)
submitPrediction(payload)
```

## Step 3 - Add Game UI Components

Create:

```text
frontend/components/XPToast.tsx
frontend/components/XPHeader.tsx
frontend/components/PredictionCard.tsx
frontend/components/BadgeToast.tsx
frontend/components/ConceptMap.tsx
frontend/components/ToolUnlockCard.tsx
```

Keep UI simple and polished.

## Step 4 - Add Progress Page

Create:

```text
frontend/app/progress/page.tsx
```

Show:

- total XP
- level
- concept nodes
- badges
- unlocked tools
- suggested next challenge

## Step 5 - Add Prediction Flow To Ask Page

In `/ask`:

1. after agent result arrives, check for `prediction_prompt`
2. show `PredictionCard`
3. after answer, call `submitPrediction`
4. then reveal/play simulation
5. show XP/badge toasts

MVP shortcut:

If reveal sequencing is too hard, show prediction before playing animation even if data is already loaded.

## 8. Required Prediction Prompts For MVP

### Planet Jump

Prompt:

```text
Before we run it, where do you think the jump will be highest?
```

Options:

```text
Moon
Earth
Jupiter
Neptune
```

Correct:

```text
Moon
```

### Molecule Interaction

Prompt:

```text
What do you think attracts two water molecules to each other?
```

Options:

```text
Partial charges
Gravity
Air pressure
Magnetism
```

Correct:

```text
Partial charges
```

### Ramp Digital Twin

Prompt:

```text
Which force mostly pulls the box down the ramp?
```

Options:

```text
Gravity component along the ramp
Normal force
Friction
Air pressure
```

Correct:

```text
Gravity component along the ramp
```

## 9. Badge List For MVP

Implement these first:

```json
[
  {
    "id": "gravity_explorer",
    "name": "Gravity Explorer",
    "description": "Compared motion under different gravitational fields."
  },
  {
    "id": "prediction_pro",
    "name": "Prediction Pro",
    "description": "Made a prediction before seeing the simulation."
  },
  {
    "id": "mass_myth_busted",
    "name": "Mass Myth Busted",
    "description": "Learned why mass does not change free-fall acceleration in vacuum."
  },
  {
    "id": "molecule_matchmaker",
    "name": "Molecule Matchmaker",
    "description": "Explored molecular attraction and bonding."
  },
  {
    "id": "digital_twin_builder",
    "name": "Digital Twin Builder",
    "description": "Turned a real-world video into a simulated physics model."
  },
  {
    "id": "feedback_scientist",
    "name": "Feedback Scientist",
    "description": "Helped EchoMind adapt its teaching style."
  }
]
```

## 10. Concept Nodes For MVP

Implement these nodes:

```text
Gravity
Friction
Normal Force
Air Resistance
Momentum
Molecular Bonds
Charge Attraction
Energy
Digital Twins
Scientific Prediction
```

Each scenario maps to concepts:

```text
planet_jump -> Gravity, Energy, Scientific Prediction
moon_drop -> Gravity, Air Resistance, Scientific Prediction
molecule_interaction -> Molecular Bonds, Charge Attraction, Scientific Prediction
ramp_video_twin -> Gravity, Friction, Normal Force, Digital Twins
```

## 11. Tool Unlocks For MVP

Implement these unlocks:

```json
{
  "gravity_slider": {
    "name": "Gravity Slider",
    "requires": ["Gravity:50"],
    "description": "Change gravity in mechanics simulations."
  },
  "force_arrows": {
    "name": "Force Arrow Overlay",
    "requires": ["Normal Force:25", "Friction:25"],
    "description": "Reveal force vectors in motion simulations."
  },
  "charge_labels": {
    "name": "Charge Labels",
    "requires": ["Charge Attraction:25"],
    "description": "Show partial charges on molecules."
  },
  "slow_motion_camera": {
    "name": "Slow Motion Camera",
    "requires": ["Scientific Prediction:50"],
    "description": "Replay key simulation moments in slow motion."
  }
}
```

## 12. Visual Design Requirements

Game UI should feel premium, not childish.

Use:

- glowing XP pill
- glassy progress cards
- animated badge reveal
- concept nodes with soft glow
- clean icons
- short text
- dark cinematic background

Avoid:

- cartoon clutter
- loud casino effects
- too many popups
- competitive leaderboard pressure

Tone:

```text
You are becoming a better scientist, not just earning points.
```

## 13. Game Event Flow

Complete flow for a WhatIf question:

```text
User asks question
-> award ask XP
-> agent creates scenario
-> frontend shows prediction card
-> user predicts
-> backend stores prediction
-> reveal simulation
-> award sim XP
-> update concepts
-> award badges/unlocks
-> explanation plays
-> user rates experience
-> feedback stored in Backboard
-> next lesson adapts
```

## 14. Testing Checklist

### Backend

```bash
curl http://localhost:8000/api/game/state/u1
```

Should return default game state.

Prediction test:

```bash
curl -X POST http://localhost:8000/api/game/prediction \
  -H "Content-Type: application/json" \
  -d '{"job_id":"job_123","session_id":"s1","user_id":"u1","selected_answer":"Moon"}'
```

Should return:

- correct/incorrect
- XP awarded
- updated game state

### Frontend

Manual tests:

1. Ask planet jump question.
2. Prediction card appears.
3. Submit prediction.
4. Simulation reveals.
5. XP toast appears.
6. Badge toast appears if earned.
7. `/progress` shows updated concept nodes.
8. Submit feedback.
9. Memory/adaptation message appears.

### Fallback

Run without Backboard key.

Pass if:

- XP still works
- badges still work
- concept map still works
- local JSON memory updates

## 15. Demo Script For Game Layer

Say:

```text
EchoMind is not just a simulator. It turns curiosity into progression. Before each simulation, students predict what will happen, then the physics reveals whether their intuition was right.
```

Show planet jump prediction.

Say:

```text
If the student gets it wrong, that is not failure — that is where learning happens. EchoMind awards misconception badges when it corrects a wrong intuition.
```

Show concept map.

Say:

```text
Backboard remembers which concepts the student has explored and how they like to learn. If they keep asking for more visuals, future challenges become more visual. If they ask for equations, EchoMind starts adding equation cards.
```

Show feedback modal.

Close:

```text
The reward is not points for points' sake. The reward system makes curiosity visible, and the memory system makes every lesson more personalized.
```

## 16. Definition Of Done

The game layer is done when:

- `GET /api/game/state/{user_id}` works
- predictions work for the three MVP demo types
- XP awards after questions, sims, predictions, and feedback
- badges unlock for at least three moments
- concept map updates after completed simulations
- at least two lab tools unlock visually
- Backboard/local memory stores game progress and preferences
- `/progress` page renders without backend crashes
- the game layer never blocks the core simulation if it fails

If the core simulation breaks because of the game layer, remove complexity until the simulation works again.
