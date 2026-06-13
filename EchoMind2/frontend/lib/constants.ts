/** Mirrors `AGENT_STAGES` in `backend/routers/agent_router.py`. */
export const AGENT_STAGES = [
  "Listening...",
  "Understanding your question...",
  "Choosing the physics model...",
  "Building the scene...",
  "Running the simulation...",
  "Rendering the explanation...",
  "Preparing the voiceover...",
  "Done.",
];

/** Prompts known to map onto a deterministic EchoMind scenario. */
export const SAMPLE_PROMPTS = [
  "What if I jumped on every planet?",
  "What happens when two water molecules meet?",
  "What happens when sodium meets chlorine?",
  "What if Earth stopped spinning?",
];

/** Playback stages for the video-twin upload pipeline (no `stages` field in that response). */
export const VIDEO_TWIN_STAGES = [
  "Uploading your video...",
  "Tracking motion frame by frame...",
  "Estimating ramp angle and friction...",
  "Building the digital twin...",
  "Rendering the explanation...",
  "Done.",
];
