# EchoMind Simulation, Video, And Digital Twin Architecture

## 1. Goal

This file defines how EchoMind turns a question or uploaded video into:

- a physics simulation
- a short cinematic animation
- a clear diagram
- a moving digital twin

The key principle:

```text
The simulation provides truth. The render provides awe.
```

## 2. Simulation Modes

EchoMind should support multiple simulation modes, chosen by the agent.

### Mode 1 - Rigid Body Physics

Best for:

- falling objects
- ramps
- collisions
- jumping on planets
- pendulums
- rolling objects
- simple bridge/truss demos

Engine priority:

1. MuJoCo Python backend
2. Rapier/Three.js browser fallback
3. analytic equations fallback

### Mode 2 - Molecular / Particle Visualization

Best for:

- molecule attraction
- bonding concepts
- charge interactions
- diffusion
- gas pressure
- simple reaction intuition

Engine priority:

1. custom Three.js particle/molecule viewer
2. RDKit/3Dmol-style molecular geometry if available
3. simplified sphere-and-bond model fallback

Do not promise quantum-accurate chemistry in MVP.

### Mode 3 - Video Digital Twin

Best for:

- box sliding down ramp
- bouncing ball
- pendulum
- toy car motion
- projectile motion

Pipeline:

1. upload video
2. extract frames
3. detect moving object
4. estimate trajectory
5. infer simple geometry
6. fit physics parameters
7. reconstruct simulation
8. compare original vs simulated motion

### Mode 4 - Diagram-Only Physics

Best for:

- scenarios too large or unsafe to simulate directly
- Earth stops spinning
- black hole tidal forces
- large-scale astronomy
- complex chemical reactions

Output:

- animated diagram
- simplified model
- voice explanation

### Mode 5 - Science Lab Simulation

Best for:

- virtual experiments
- material handling
- microscope/petri dish demos
- chemical concept visualization

MVP status:

- architecture only
- build after WhatIf and video twin are stable

## 3. Real-Time Simulation Pipeline

### Step 1 - Scenario JSON

Input:

```json
{
  "domain": "rigid_body",
  "objects": [...],
  "environment": {...},
  "simulation_plan": {...}
}
```

### Step 2 - Scene Generation

For rigid-body scenes, generate:

- MuJoCo XML
- object meshes or primitives
- gravity settings
- collision settings
- initial velocities
- constraints
- camera setup

For molecular scenes, generate:

- atoms
- bonds
- charges
- force arrows
- labels
- path animations

### Step 3 - Simulation Run

Outputs:

```text
trajectory.json
metrics.json
events.json
preview_frames/
```

Trajectory data should be engine-independent.

Example:

```json
{
  "fps": 60,
  "duration_s": 4,
  "objects": {
    "ball": [{"t": 0, "pos": [0, 0, 2]}, {"t": 0.016, "pos": [0, 0, 1.999]}]
  }
}
```

### Step 4 - Real-Time Stream

Use WebSocket for live status and frames.

Endpoint:

```text
WS /ws/jobs/{job_id}
```

Messages:

- status JSON
- frame image bytes or frame state JSON
- final result JSON

### Step 5 - Cinematic Render

After or during simulation, create a polished result.

Options:

1. Three.js render captured in browser
2. Blender Python render on backend
3. Runway/OpenAI video generation using simulation frames as references
4. FFmpeg frame stitch fallback

## 4. Cinematic Video Strategy

> The full, concrete cinematic spec lives in
> [`07_CINEMATIC_RENDER_ENGINE.md`](07_CINEMATIC_RENDER_ENGINE.md). This section is
> the summary of how simulation data becomes that cinematic output.

The most important quality decision (now locked):

**Real-time 3D is the primary cinematic layer.** The Truth Layer (this file)
produces engine-independent `trajectories` and parameters; the Render Director
packages them into a `CinematicSceneSpec`; the browser renders that spec as a
graded, PBR-lit, postprocessed 3D film. Text-to-video is an OPTIONAL enhancement
layer, never the source of scientific truth and never on the critical path.

The hand-off is exactly one object:

```text
Truth Layer (trajectories + params)  ->  CinematicSceneSpec  ->  real-time 3D engine
                                              (optional)  ->  AI video enhancement
```

Recommended pipeline:

```text
simulation data -> CinematicSceneSpec -> real-time 3D render -> (optional) AI cinematic enhancement -> overlays/narration
```

### Why

Pure video generation can look amazing but may hallucinate physics. Simulation-only can be accurate but visually plain. The hybrid approach gives both.

### Prompting Visual Style

Use general visual descriptors:

```text
hyperreal cinematic science explainer, macro lens, clean dark background, glowing educational labels, slow-motion key moment, high contrast, physically plausible motion, crisp diagram overlays, dramatic but classroom-safe
```

Do not require copying any specific creator. Use the phrase:

```text
short-form cinematic science explainer style
```

### Visual Elements To Include

Every cinematic output should include:

- title card
- main simulation shot
- labels on key objects
- arrows for forces
- one slow-motion moment
- one equation or concept card
- final takeaway card

## 5. Video API Strategy

External video APIs are optional accelerators.

### Runway API

Use case:

- image-to-video enhancement
- turning simulation keyframes into polished cinematic clips
- generating transitions or explanatory shots

Architecture:

- send first frame or storyboard images
- include strict prompt from render director
- receive video URL/file
- overlay final labels yourself if needed

### OpenAI Sora-Style Video API

Use case:

- high-quality generated clips when available
- cinematic explainer B-roll
- synchronized audio/video if supported

Important:

- verify availability, pricing, and model access right before implementation
- keep deterministic renderer as fallback

### Fallback Render

If video APIs are unavailable:

- render with Three.js or Blender
- stitch frames with FFmpeg
- add labels with canvas/Pillow/moviepy
- use ElevenLabs or browser TTS for narration

This fallback is enough for a strong demo if the design is polished.

## 6. Diagram Generation

Diagrams should be generated for every answer, even when video exists.

Diagram types:

- force diagram
- before/after comparison
- planet gravity comparison chart
- molecular charge diagram
- trajectory graph
- ramp free-body diagram

Recommended frontend rendering:

- SVG for labels/arrows
- canvas for animation
- Three.js for 3D view

Recommended backend artifact:

```text
backend/static/jobs/{job_id}/diagram.png
```

## 7. Video Digital Twin Pipeline

### Input

A student uploads a video.

Example:

```text
box sliding down incline ramp
```

### Step 1 - Frame Extraction

Use OpenCV.

Outputs:

```text
frames/
thumbnail.jpg
fps
duration
resolution
```

### Step 2 - Object Detection / Tracking

MVP approach:

- use simple segmentation/background subtraction
- allow user to click object if detection fails
- track centroid across frames

Future approach:

- use vision model for object/ramp detection
- use optical flow
- use pose/scene estimation

### Step 3 - Geometry Estimation

For ramp demo:

- detect dominant line angle
- estimate incline angle
- identify sliding object centroid
- estimate scale from user hint or relative units

If exact scale unknown, say:

```text
I am estimating relative motion because the video has no size reference.
```

### Step 4 - Physics Fitting

For a sliding box:

- estimate acceleration from tracked position
- estimate incline angle
- infer friction coefficient roughly

Equation:

```text
a = g sin(theta) - μ g cos(theta)
```

Solve for approximate `μ` if angle and acceleration are known.

### Step 5 - Digital Twin Scene

Generate:

- ramp plane
- box object
- gravity arrow
- normal force arrow
- friction arrow
- trajectory path

### Step 6 - Explanation

Teach:

- gravity component down ramp
- normal force
- friction opposing motion
- why acceleration is less than free fall

## 8. Molecular Visualization Pipeline

### Input Types

The user may ask:

```text
What happens when these two molecules come together?
```

or upload/select:

- molecule names
- SMILES strings
- simple images

### MVP Strategy

Support common named molecules and conceptual interactions:

- water-water hydrogen bonding
- sodium-chlorine ionic attraction
- oxygen-hydrogen water formation as simplified concept
- acid/base neutralization as diagram-only if unsafe/complex

### Molecular Scene JSON

```json
{
  "molecules": [
    {
      "name": "water",
      "atoms": [
        {"element": "O", "position": [0,0,0], "partial_charge": -0.4},
        {"element": "H", "position": [0.96,0,0], "partial_charge": 0.2}
      ],
      "bonds": [[0,1], [0,2]]
    }
  ],
  "interactions": [
    {"type": "hydrogen_bond", "from": "H", "to": "O"}
  ],
  "annotations": ["Partial charges attract", "Hydrogen bond forms"]
}
```

### Visual Style

- glossy spheres
- semi-transparent electron clouds
- glowing attraction arrows
- labels for charges
- slow approach animation
- simplified energy curve

### Accuracy Note

Always include conceptual framing:

```text
This is a simplified molecular model showing the main attraction pattern, not a full quantum chemistry calculation.
```

## 9. Performance Plan Without Dedicated GPU

The user noted there is no AMD GPU. That is okay.

Build for graceful performance tiers:

### Tier 1 - CPU Reliable

- analytic physics
- simple MuJoCo CPU scenes
- Three.js browser rendering
- static diagrams
- short FFmpeg renders

### Tier 2 - Cloud/API Enhanced

- external video generation
- cloud LLM
- ElevenLabs voice

### Tier 3 - GPU Optional

- MuJoCo GPU/MJX if available
- parallel simulations
- local model inference
- faster rendering

The hackathon demo should work on Tier 1 and look amazing with Tier 2.

## 10. Quality Bar

A simulation/video output is good enough when:

- the student can tell what is being compared
- the physics concept is visible
- labels make the scene self-explanatory
- the voice explanation matches the visual
- there is one surprising takeaway
- it completes in under 10 seconds for MVP examples

## 11. Files To Build Later

Backend:

```text
backend/scenario_interpreter.py
backend/physics_planner.py
backend/scene_builder.py
backend/simulation_runner.py
backend/render_director.py
backend/video_twin.py
backend/molecule_engine.py
backend/static/jobs/
```

Frontend:

```text
frontend/app/ask/page.tsx
frontend/app/video-twin/page.tsx
frontend/components/SimulationViewer.tsx        # thin wrapper around CinematicStage
frontend/components/CinematicPlayer.tsx         # scripted playback + replay/scrub
frontend/components/DiagramOverlay.tsx
frontend/components/VideoTwinCompare.tsx
frontend/components/cinematic/                  # the real-time 3D engine (see 07 §11)
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
  presets/
```
