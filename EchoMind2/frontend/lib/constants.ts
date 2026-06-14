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
