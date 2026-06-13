# EchoMind Cinematic Render Engine

> This is the most important file for the product's "wow." It defines exactly how
> EchoMind turns dry simulation data into a **premium, real-time 3D cinematic
> science explainer** — the kind of polished 3D that makes a viewer say "wait, it
> built that?" Everything here is concrete on purpose. A builder should be able to
> follow it like a recipe and produce the look without guessing.

## 0. The One Rule

```text
The Truth Layer decides WHAT is true. The Cinematic Engine decides HOW STUNNING it looks.
They communicate through exactly ONE object: the CinematicSceneSpec.
```

If a builder ever asks "how should this look," the answer is in the
`CinematicSceneSpec` plus the global render config in this file — never improvised
per-component.

## 1. The Quality Bar (what "looks real" means concretely)

We are NOT building diagrams with motion. We are building a real-time 3D film.
Every scene must hit all of these, or it is not done:

- **Image-based lighting** from an HDRI environment (real reflections, real ambient).
- **PBR materials** (metalness/roughness/clearcoat/transmission), never flat colors.
- **Soft contact shadows** under every object.
- **Postprocessing stack**: ACES tone mapping, bloom, ambient occlusion, subtle
  depth of field, vignette, and slight chromatic aberration on accent frames.
- **Cinematic camera choreography**: eased dolly/orbit moves, never a static cam.
- **A key "hero moment"** rendered in slow motion.
- **Labels and force arrows that live in 3D space**, not 2D HUD clutter.
- **A dark, premium, graded background** (gradient or HDRI-lit studio void), never
  pure white, never a default canvas.
- **Smooth easing** on every transition (no linear lerps).
- **60 fps target** on an integrated GPU / no-dGPU laptop.

The reference feeling: glossy product-film clarity (think a high-end product
render or a top-tier explainer short) applied to physics, with crisp labels
layered on.

## 2. The CinematicSceneSpec Contract

This is the keystone object. The backend Render Director (see `06`) produces it
from the Truth Layer; the frontend `CinematicStage` consumes it. It is engine-
agnostic JSON. **Defining this well is what makes the rest "just code."**

```jsonc
{
  "spec_version": "1.0",
  "scene_id": "planet_jump_001",
  "preset": "planet_jump",            // planet_jump | molecule | moon_drop | ramp_box | diagram_fallback
  "duration_s": 12,
  "fps": 60,

  // ---- LOOK ----
  "environment": {
    "hdri": "studio_soft",            // named preset, see §4
    "background": "graded_void_dark", // see §4
    "exposure": 1.05,
    "fog": { "enabled": true, "color": "#05060a", "near": 18, "far": 60 }
  },
  "grade": {
    "tone_mapping": "aces",
    "bloom": { "intensity": 0.9, "threshold": 0.85, "smoothing": 0.3 },
    "ssao": { "intensity": 0.6, "radius": 0.25 },
    "depth_of_field": { "enabled": true, "focus_target": "hero", "bokeh": 2.2 },
    "vignette": 0.35,
    "chromatic_aberration": 0.0015
  },

  // ---- CONTENT ----
  "objects": [
    {
      "id": "earth_figure",
      "kind": "capsule_figure",       // capsule_figure | sphere | atom | bond | ramp | box | arrow | plane
      "transform": { "position": [-6, 0, 0], "rotation": [0,0,0], "scale": 1 },
      "material": "skin_matte",       // named material from §5
      "label": { "text": "Earth · g=9.81", "anchor": "above", "style": "title_chip" },
      "trajectory_ref": "earth_jump"  // links to a trajectory in `trajectories`
    }
  ],

  // ---- MOTION (from the Truth Layer; engine-independent) ----
  "trajectories": {
    "earth_jump": { "channel": "position", "fps": 60, "keys": [[0,[ -6,0,0]], [0.25,[-6,1.6,0]], "..."] }
  },

  // ---- ANNOTATIONS IN 3D ----
  "annotations": [
    { "id": "g_arrow", "kind": "force_arrow", "from": [-6,1.6,0], "to": [-6,0.4,0],
      "color": "#ff5d73", "label": "gravity", "appear_at": 1.5 }
  ],

  // ---- CAMERA SHOT LIST (the choreography) ----
  "shots": [
    { "type": "establish", "start": 0,  "end": 2.5, "move": "dolly_in",
      "from": {"pos":[0,3,16],"look":[0,1,0]}, "to": {"pos":[0,2,11],"look":[0,1,0]}, "ease": "easeInOutCubic" },
    { "type": "hero",      "start": 5.0, "end": 7.0, "move": "orbit",   "slowmo": 0.35,
      "target": "moon_figure", "ease": "easeOutCubic" },
    { "type": "compare",   "start": 7.0, "end": 10.0, "move": "wide_pull",
      "from": {"pos":[0,2,11]}, "to": {"pos":[0,4,20]}, "ease": "easeInOutCubic" }
  ],

  // ---- THE BEAT TIMELINE (overlay cards synced to narration) ----
  "beats": [
    { "at": 0.0,  "card": "title",     "text": "Jump on Every Planet" },
    { "at": 5.0,  "card": "callout",   "text": "Same legs. Same push.", "highlight": "moon_figure" },
    { "at": 8.5,  "card": "equation",  "latex": "h = \\frac{v_0^2}{2g}" },
    { "at": 11.0, "card": "takeaway",  "text": "Lower gravity → higher jump. Mass never mattered." }
  ],

  // ---- OPTIONAL AI VIDEO ENHANCEMENT (never required) ----
  "video_enhancement": { "requested": false, "provider": null, "keyframe_ids": [] }
}
```

### Hard rules for the spec

- The Truth Layer **must** fill `trajectories` (real physics). The Cinematic Engine
  **must not** invent motion — only camera, lights, materials, timing.
- Every `preset` has sane defaults so a minimal spec still looks great. The Render
  Director only overrides what it needs.
- `beats[]` are synced to the narration transcript (see `tutor_agent` in `06` and
  the timing handshake in §9).

## 3. Frontend Tech Stack (exact)

```text
three
@react-three/fiber          // React renderer for three.js
@react-three/drei           // Environment, OrbitControls, Html labels, Float, ContactShadows, Text
@react-three/postprocessing // EffectComposer: Bloom, SSAO, DepthOfField, Vignette, ChromaticAberration, ToneMapping
maath                       // easing + smooth damping helpers
leva (dev only)             // live-tune lighting/postFX while building, strip from prod
```

Install:

```bash
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing maath
npm install -D leva
```

If `@react-three/postprocessing` cannot be installed, the engine must degrade
gracefully (see §8 Tier fallback) but the default build assumes it is present.

## 4. Environment & Background (image-based lighting)

The single biggest driver of "looks real" is the environment map. Do not light
scenes with bare point lights only.

### HDRI presets (`environment.hdri`)

| Preset | Use | Implementation |
| --- | --- | --- |
| `studio_soft` | molecules, product-style hero objects | drei `<Environment preset="studio" />` or a bundled soft studio `.hdr` |
| `space_void`  | planets, astronomy | dark HDRI + a single warm key sun light |
| `warm_lab`    | ramp/box, mechanics | neutral indoor HDRI, soft overhead |
| `night_grade` | diagram fallback | very dark HDRI, accents do the lighting |

Bundle 3–4 small `.hdr`/`.exr` files under `frontend/public/hdri/`. Keep each
under ~2 MB (use 1k or 2k resolution; we never need 4k for this).

### Background (`environment.background`)

- `graded_void_dark`: a vertical gradient (`#05060a` → `#0c1020`) on a large
  inverted sphere or a CSS-backed canvas clear color, plus subtle fog.
- Never use the default white/transparent canvas. The void sells the cinema.

### Standard 3-point rig (always added on top of IBL)

```text
key   : warm directional light, intensity ~2.5, casts soft shadows (PCFSoft, mapSize 2048)
fill  : cool area/hemisphere light, intensity ~0.6, no shadow
rim   : bright back light behind hero object, intensity ~3, tight, creates the glossy edge
ground: drei <ContactShadows> for soft grounding, blur ~2.5, opacity ~0.5
```

## 5. Materials (named PBR library)

Define ONE shared material library so every preset reuses it. All are
`MeshPhysicalMaterial` unless noted.

| Name | Look | Key params |
| --- | --- | --- |
| `skin_matte` | jump figure | roughness 0.7, metalness 0, subtle subsurface tint |
| `planet_rock` | rocky planets | roughness 0.9, normal/bump map, low metalness |
| `planet_gas` | gas giants | emissive bands, roughness 0.5, slight clearcoat |
| `glossy_accent` | highlight objects | clearcoat 1, clearcoatRoughness 0.1, metalness 0.2 |
| `atom_glossy` | molecule atoms | clearcoat 1, roughness 0.15, vivid base color per element |
| `electron_cloud` | semi-transparent shells | transmission 0.9, thickness 0.5, roughness 0.2, ior 1.2 |
| `bond_metal` | molecule bonds | metalness 0.8, roughness 0.3 |
| `ramp_surface` | inclined plane | roughness 0.8, subtle anisotropy |
| `box_crate` | sliding box | roughness 0.6, wood/painted albedo |
| `arrow_emissive` | force arrows | emissive on, bloom-reactive, unlit-ish |
| `floor_studio` | ground plane | roughness 0.4, faint reflection (env-mapped) |

Element color table for atoms (CPK-ish, but tuned for glossy cinema):

```text
H = #f4f6ff   O = #ff5a5a   N = #5a8bff   C = #3a3f4a   Na = #b07cff   Cl = #5ddf8f
```

## 6. Postprocessing Stack (the grade)

Order matters. Build the `EffectComposer` exactly like this:

```text
1. SSAO              // contact darkening, depth
2. Bloom             // glow on emissive labels/arrows/rim highlights
3. DepthOfField      // focus the hero, blur the rest (subtle)
4. ChromaticAberration  // tiny, only ~0.0015, adds lens realism
5. Vignette          // pull the eye to center
6. ToneMapping(ACES) // final filmic curve  -- ALWAYS LAST
```

Defaults come from `grade` in the spec. Expose them in `leva` during dev so the
look can be dialed in once, then frozen into the preset defaults.

## 7. Camera Choreography (`shots`)

A static camera kills the cinema. The `CameraDirector` plays the `shots[]` list:

- Each shot has `start`/`end` (seconds), a `move`, easing, and either explicit
  `from`/`to` poses or a `target` object id to frame.
- Moves: `dolly_in`, `wide_pull`, `orbit`, `crane_up`, `push_to_hero`, `whip_to`.
- `slowmo` on a shot scales trajectory playback for that window (the hero moment).
- Between shots, blend with eased interpolation (`maath/easing.damp3`), never cut
  hard unless a beat explicitly calls for a `whip_to`.
- Always frame with a slight off-center composition (rule of thirds), never dead
  center for the hero.

Implementation: a per-frame controller in `useFrame` that finds the active shot
by `clock`, computes eased pose, and writes `camera.position` / `camera.lookAt`.
Disable `OrbitControls` during scripted playback; re-enable for free-explore mode
after the clip ends.

## 8. Performance Tiers (no dedicated GPU is fine)

The default machine has no dGPU. Guarantee 60 fps by tiering:

| Tier | Trigger | What changes |
| --- | --- | --- |
| **Cinema** (default) | capable GPU detected | full postFX, 2048 shadows, DoF on |
| **Lite** | fps drops < 45 for 1s, or low-power GPU | shadows 1024, DoF off, SSAO half-res, bloom kept |
| **Diagram** | WebGL2 unavailable / repeated frame drops | switch to the SVG/canvas `DiagramFallback`, keep labels + arrows + takeaway |

Detect with a 1-second fps probe on mount, then allow runtime downgrade. The
product must NEVER stutter in front of a judge — it silently drops a tier instead.

## 9. Narration ⇄ Visual Timing Handshake

The voice and the visuals must feel authored together.

1. `tutor_agent` produces the transcript split into **sentence beats** with rough
   durations (or word timings if the TTS returns them).
2. Render Director maps each narration beat to a `beats[]` entry and aligns the
   `shots[]` so the hero shot lands on the key sentence.
3. Frontend plays audio; a single master clock drives both the audio element and
   `useFrame`. If audio is unavailable (browser TTS or muted), the clip still
   plays on the same clock with captions.

Rule: the **hero slow-mo shot** must coincide with the **takeaway sentence**.

## 10. Per-Preset Cinematic Recipes

Each preset ships with defaults so a minimal spec looks finished. The Render
Director only overrides specifics.

### 10.1 `planet_jump`

- Environment `space_void`, warm sun key, rim light per figure.
- N planet "stages" in a gentle arc (not a flat row), each a glossy sphere with a
  capsule figure standing on it.
- Camera: establish wide → push to the Moon figure (hero, slow-mo as it soars) →
  wide pull to compare all planets.
- Annotations: a `gravity` force arrow on the hero, jump-height tick labels.
- Beats: title → "same push, different gravity" → equation `h=v₀²/2g` → takeaway.
- Highlighted comparison triad: Moon vs Earth vs Jupiter glow brighter.

### 10.2 `molecule`

- Environment `studio_soft`, glossy atoms, `electron_cloud` transmissive shells.
- Two molecules drift in from opposite sides, slow approach, partial-charge labels
  fade in, a dotted/emissive hydrogen-bond or ionic-attraction arc snaps into place.
- Camera: slow orbit around the interaction point; DoF focuses the bonding region.
- Hero moment: the bond/attraction forming, in slow motion with a bloom pulse.
- Beat: equation/energy card optional; takeaway about charge attraction.
- Mandatory disclaimer beat: "Simplified model — not full quantum chemistry."

### 10.3 `moon_drop`

- Environment `space_void`; two objects (bowling ball + feather) at equal height.
- They fall in perfect lockstep under Moon gravity; optional split-screen with an
  Earth-air variant where the feather lags.
- Hero: the synchronized landing, slow-mo, dust puff.
- Annotation: single shared `g` arrow; label "no air = same acceleration."

### 10.4 `ramp_box`

- Environment `warm_lab`; an inclined `ramp_surface` with a `box_crate` sliding.
- Three force arrows: gravity (down), normal (perpendicular to ramp), friction
  (up-slope), each appearing as narration introduces it.
- Side-by-side: original uploaded video (in `VideoTwinCompare`) next to the 3D twin.
- Hero: the box reaching the base, slow-mo; takeaway about net acceleration.

### 10.5 `diagram_fallback`

- 2D SVG/canvas, but still graded: dark background, glow on arrows, the same beat
  cards (title/callout/equation/takeaway). Used for unsafe/too-large scenarios
  (black hole tides, Earth stops spinning) and the performance Tier-3 fallback.

## 11. Component Breakdown (frontend)

```text
frontend/components/cinematic/
  CinematicStage.tsx      // top-level: <Canvas>, mounts everything from a CinematicSceneSpec
  SceneEnvironment.tsx    // HDRI <Environment>, background gradient, fog, 3-point rig
  GradeComposer.tsx       // EffectComposer with the §6 stack, driven by spec.grade
  CameraDirector.tsx      // plays spec.shots on the master clock (§7)
  SceneObjects.tsx        // instantiates spec.objects with the §5 material library
  Trajectory.tsx          // drives object transforms from spec.trajectories
  ForceArrow.tsx          // 3D arrow (shaft cylinder + cone head), emissive, animated in
  Label3D.tsx             // drei <Html> or <Text> chip anchored to an object/point
  BeatOverlay.tsx         // title/callout/equation/takeaway cards, framer-motion, synced to beats
  MaterialLibrary.ts      // the §5 named materials, single source of truth
  presets/                // per-preset default spec builders (planetJump, molecule, moonDrop, rampBox)
  usePerfTier.ts          // §8 fps probe + tier state
  useMasterClock.ts       // §9 single clock for audio + visuals
```

`CinematicStage` props:

```ts
type CinematicStageProps = {
  spec: CinematicSceneSpec
  audioUrl?: string | null      // if present, drives the master clock; else browser TTS / silent
  onBeat?: (beatIndex: number) => void
  interactiveAfterPlay?: boolean // re-enable OrbitControls when the clip ends
}
```

The old `SimulationViewer.tsx` / `CinematicPlayer.tsx` from `05` become thin
wrappers: `SimulationViewer` chooses live-preview vs `CinematicStage`;
`CinematicPlayer` is `CinematicStage` in scripted-playback mode plus replay/scrub.

## 12. Optional AI Video Enhancement Layer

Real-time 3D is the guaranteed deliverable. AI video generation is an OPTIONAL
"max polish" pass and must never be on the critical path.

When `video_enhancement.requested` is true and a key exists:

1. The engine captures hero keyframes from the live 3D scene (canvas → PNG).
2. Backend Render Director sends those frames + a strict style prompt to the video
   API (Runway image-to-video, or Sora-style if available).
3. The returned clip is shown in `CinematicPlayer` as an alternate "Film" tab; the
   real-time 3D remains the default and the fallback.
4. If the API is slow/unavailable/fails: silently keep the real-time clip. No error
   surfaced to the user.

Style prompt template (general descriptors, no creator names):

```text
hyperreal cinematic science explainer, macro lens, clean dark studio background,
glowing educational labels, physically plausible motion, soft volumetric light,
slow-motion key moment, high contrast, crisp and classroom-safe
```

## 13. Acceptance Checklist (per rendered scene)

A scene is "cinematic-done" only when:

- [ ] HDRI/IBL lighting is active (visible reflections on glossy materials)
- [ ] every object uses a PBR material from the library (no flat `meshBasicMaterial`)
- [ ] soft contact shadows ground every object
- [ ] the postFX stack runs (bloom on emissives, ACES tone mapping, vignette)
- [ ] the camera moves with eased choreography (no static cam)
- [ ] there is one slow-motion hero moment aligned to the takeaway line
- [ ] force arrows and labels live in 3D and appear on cue
- [ ] title, one callout, optional equation, and a final takeaway card all show
- [ ] background is a graded dark void (never white/default)
- [ ] holds ~60 fps on a no-dGPU laptop, or silently drops a tier
- [ ] looks like a film, not a diagram

If any box is unchecked, the scene is not done — fix the look before adding features.
</content>
