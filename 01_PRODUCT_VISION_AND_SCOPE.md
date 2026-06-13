# EchoMind / WhatIf - Product Vision And Scope

> Working name: EchoMind
> Core experience: WhatIf
> One-line pitch: A voice-driven curiosity engine that turns any student question or real-world video into a physics-aware simulation, cinematic explanation, and interactive learning loop.

## 1. The Product In One Sentence

EchoMind lets a student ask "what if?" out loud, upload a real-world clip, or enter a virtual science lab, then an autonomous AI agent builds the right simulation, renders it beautifully, explains the underlying science with voice, and suggests the next curiosity path.

## 2. The Hackathon Pivot

The previous Forgebot architecture was about robot design. EchoMind keeps the best parts of that architecture:

- voice-first interaction
- agentic planning loop
- generated simulations
- real-time visual streaming
- persistent memory
- polished demo flow
- fallback-first build strategy

But the goal changes completely.

Forgebot answered:

```text
How do we design a robot from natural language and motion input?
```

EchoMind answers:

```text
How do we make any science question visually explorable in seconds?
```

## 3. The Main User Promise

A student should be able to say:

```text
What if I dropped a bowling ball and a feather on the Moon?
```

EchoMind should:

1. Hear or read the question.
2. Identify the science domain: gravity, vacuum, air resistance, mass independence.
3. Build a simulation plan.
4. Generate a real-time physics simulation.
5. Render a beautiful short visual explanation.
6. Speak the explanation naturally.
7. Ask a smart follow-up question.
8. Remember what the student just learned.

The product should feel less like a chatbot and more like a tiny autonomous science studio.

## 4. Product Pillars

### Pillar 1 - On-Demand WhatIf Simulations

Students ask any curiosity question.

Examples:

- "What if I jumped on every planet?"
- "What if Earth stopped spinning?"
- "What if a bowling ball and feather fell on the Moon?"
- "What if two cars hit each other at 60 mph?"
- "What if I removed one cable from a bridge?"
- "What happens when these two molecules come together?"

The agent chooses the right simplification, builds the sim, and explains the result.

### Pillar 2 - Real-World Video To Digital Twin

A student uploads a video of something real.

Examples:

- a box sliding down a ramp
- a ball bouncing
- a pendulum swinging
- water pouring
- a skateboard rolling
- a bottle rocket launching

EchoMind should:

1. analyze the video
2. detect objects and motion
3. estimate scene geometry
4. infer physical parameters
5. recreate a simplified moving digital twin
6. explain the physics concepts

The key is not perfect photogrammetry. The key is a believable, teachable reconstruction that maps the real clip into physics concepts.

### Pillar 3 - Cinematic Science Explainers

EchoMind should produce visuals that feel like high-retention educational shorts: fast, clear, dramatic, hyperreal, labeled, and satisfying.

The target is not to copy any specific creator. The target visual language is:

- macro closeups
- crisp labels
- dramatic lighting
- slow motion at key moments
- clean diagrams overlaid on realistic scenes
- cause/effect arrows
- split-screen comparisons
- short punchy narration
- clean final takeaway

For docs and prompts, describe this as:

```text
cinematic short-form science explainer style
```

Avoid requiring exact imitation of any named creator. Use general visual descriptors instead.

### Pillar 4 - Interactive Avatar Teacher

Students should be able to talk to an avatar that explains what is happening.

The avatar is not the core simulation engine. It is the teaching interface.

It should:

- listen to questions
- answer with voice
- point to parts of the sim
- ask follow-ups
- remember student interests
- adapt explanations to student level

### Pillar 5 - Science Lab Mode

This is an expansion feature, not the first hackathon MVP.

A student says:

```text
I want to test how bacterial growth changes under different light exposure.
```

EchoMind creates a simulated lab with relevant instruments, materials, and safety constraints. The student can speak actions:

```text
Move this chemical to the petri dish.
```

The virtual lab responds visually and explains what is happening.

This should be architected now but built after the core WhatIf and video-to-digital-twin flows.

## 5. MVP Scope

The MVP should not attempt every possible physics domain at full accuracy.

The MVP should support three strong demo tracks:

### Demo Track A - Voice WhatIf

Primary demo:

```text
What if you could jump on every planet in the solar system?
```

Output:

- eight parallel gravity comparisons
- stick figure or simple human avatar jumping
- planet labels
- jump height/time labels
- narrated explanation
- follow-up prompt: "Want to see a black hole version?"

### Demo Track B - Molecular WhatIf

Primary demo:

```text
What happens when sodium and chlorine come together?
```

or safer/simple:

```text
What happens when two water molecules attract each other?
```

Output:

- hyperreal molecular visualization
- orbital/charge simplified diagram
- attraction/repulsion arrows
- reaction/interaction explanation
- safety note if chemistry is dangerous

### Demo Track C - Real Video Digital Twin

Primary demo:

```text
Upload a video of a box sliding down a ramp.
```

Output:

- detected ramp and box
- reconstructed simulation
- friction/gravity arrows
- estimated acceleration
- narrated explanation of normal force, friction, gravity component

## 6. Non-MVP Scope

Do not prioritize these for the first build unless the MVP is already stable:

- full fluid simulation
- full bridge finite-element stress simulation
- accurate quantum chemistry
- full-body photoreal avatar animation
- multiplayer classrooms
- teacher dashboards
- exact real-world measurement calibration
- long-form curriculum generation
- full VR lab

These can be shown as future architecture.

## 7. What Makes EchoMind Agentic

EchoMind is not just a text-to-video wrapper.

The agent has an autonomous loop:

```text
INTERPRET -> PLAN -> BUILD -> SIMULATE -> RENDER -> TEACH -> EXTEND -> REMEMBER
```

### Interpret

Parse the student's question into:

- objects
- forces
- environment
- physics concepts
- assumptions
- safety constraints
- required simplification

### Plan

Choose the simulation strategy:

- rigid-body physics
- particle/molecule visualization
- video digital twin reconstruction
- diagram-only fallback
- cinematic generated video enhancement

### Build

Generate:

- simulation scene
- object parameters
- environment parameters
- annotations
- camera path
- narration outline

### Simulate

Run the simulation using available engines:

- MuJoCo for rigid-body mechanics
- Three.js/Cannon/Rapier for fast browser fallback
- custom molecular/particle renderer for molecules
- Blender for cinematic offline render

### Render

Produce:

- real-time canvas view
- short video clip
- labeled diagram
- comparison panels

### Teach

Explain:

- what happened
- why it happened
- misconception corrected
- governing law
- real-world connection

### Extend

Offer the next experiment automatically:

- "Want to add air resistance?"
- "Want to try Jupiter?"
- "Want to double the mass?"
- "Want to see the same idea in a car crash?"

### Remember

Persist:

- questions asked
- concepts explored
- misconceptions
- preferred explanation level
- favorite domains
- prior simulations

## 8. The Wow Factor

The judges should feel three things:

1. The student can ask anything.
2. The system creates a simulation that did not exist before.
3. The explanation feels alive, visual, and personal.

The wow does not come from perfect physics alone. It comes from the loop:

```text
voice question -> generated simulation -> cinematic explanation -> follow-up curiosity
```

## 9. Recommended Technical North Star

The most reliable architecture is two-layered:

### Layer 1 - Truth Layer

This is deterministic and physics-aware.

It produces:

- simulation parameters
- equations
- simplified scene state
- data traces
- object trajectories
- diagrams

This layer should be built with code.

### Layer 2 - Cinematic Layer

This makes the truth layer visually stunning.

It produces:

- beautiful video
- realistic materials
- dramatic camera movement
- polished educational overlays
- voice narration

This layer can use rendering engines and/or video APIs.

The truth layer prevents hallucinated science. The cinematic layer wins the room.

## 10. API Direction

Use APIs only where they create clear demo value.

Recommended stack:

- LLM planning: OpenAI or local Ollama fallback.
- Voice output: ElevenLabs TTS for polished narration.
- Voice input: browser speech recognition or Whisper-style STT.
- Simulation: MuJoCo + Python for physics, Three.js for browser visualization.
- Cinematic video: Runway API or Sora-style video generation if available, with deterministic render fallback.
- Memory: Backboard-style persistent memory or a simple local memory layer if API access is not available.

Important: do not make the MVP depend entirely on slow external video generation. The product must still demo instantly using real-time rendered simulation and diagrams.

## 11. API Stack And Responsibilities

EchoMind should use APIs intentionally. Each API has a clear role in the learning loop.

| API / Service | Role In EchoMind | Required For MVP? | Fallback |
| --- | --- | --- | --- |
| **OpenAI / LLM API** | Scenario interpretation, physics planning, explanation generation, follow-up generation, lab command planning | Helpful, not mandatory | local Ollama templates |
| **Backboard** | Persistent student learning context, preferences, misconception history, feedback loop, presentation-style adaptation | Strongly recommended | local JSON/SQLite memory |
| **ElevenLabs TTS / Voice** | Natural spoken tutor voice, optional conversational avatar voice | Strong demo boost | browser speech synthesis |
| **Speech-to-text** | Converts spoken questions to text | Helpful | browser speech recognition or text input |
| **MuJoCo** | Backend physics simulation for rigid-body mechanics | Helpful for real physics | analytic equations / Three.js |
| **Three.js / React Three Fiber** | Browser-side 3D visualization, molecule scenes, diagrams, fallback simulation replay | Yes | canvas/SVG diagrams |
| **Runway / Sora-style video API** | Cinematic video enhancement from simulation keyframes/storyboards | Optional wow layer | Blender/Three.js/FFmpeg render |
| **OpenCV** | Video upload analysis, frame extraction, object tracking for digital twins | Yes for video-twin MVP | manual point selection + simple tracking |

The most important design rule:

```text
Backboard stores how to teach this student. Simulation engines show what happens. Video/voice APIs make it unforgettable.
```

## 12. Backboard As The Adaptive Learning Brain

Backboard is not just chat memory. It is EchoMind's long-term model of how each student learns best.

Backboard should remember:

- the student's favorite science domains
- questions they asked before
- concepts they already understand
- misconceptions that were corrected
- whether they prefer visual, verbal, equation-first, story-first, or hands-on explanations
- whether they like short punchy answers or deep step-by-step breakdowns
- ratings they give after each simulation
- feedback like \"too fast\", \"more diagrams\", \"less math\", \"show me equations\", \"make it more realistic\"
- which follow-up prompts they click
- which simulations they replay or skip

This makes the agent increasingly personalized:

```text
First session: generic science explainer.
Fifth session: knows this student loves space, hates long equations, and learns best from side-by-side comparisons.
```

## 13. Onboarding Personalization

Before the first simulation, EchoMind should ask a short onboarding flow.

Questions:

1. What grade or learning level should I explain at?
2. How do you learn best?
   - visual animations
   - step-by-step explanations
   - equations and numbers
   - real-world analogies
   - hands-on experiments
3. What science topics are you most curious about?
   - space
   - chemistry
   - biology
   - engineering
   - everyday physics
4. Do you want quick answers or deeper explanations?

Write onboarding answers to Backboard immediately using `user_id`.

## 14. Feedback And Improvement Loop

After every result, ask:

```text
How helpful was this explanation?
★ ★ ★ ★ ★
```

Optional feedback chips:

- Too fast
- Too slow
- More visuals
- More equations
- Less math
- More realistic
- Better voice
- Show another example

The backend should log this to Backboard:

```text
Student rated the planet-jump explanation 4/5 and clicked \"More visuals\". They replayed the Moon and Jupiter comparison twice.
```

The next simulation should adapt:

- if they like visuals, use more diagrams and fewer paragraphs
- if they want equations, show formulas earlier
- if they rate explanations low, ask a clarifying preference question
- if they replay a section, recommend related concepts

This is a core product differentiator: EchoMind does not only answer the question; it learns how to teach the student.

## 15. Success Definition

EchoMind succeeds if a judge can ask a question out loud and, within seconds, see a visual simulation with a spoken explanation that feels custom-built for that question.

The ideal judge reaction:

```text
Wait — it made that simulation from the question I just asked?
```
