/**
 * Shared types for EchoMind frontend.
 * Keep in sync with `backend/models/schemas.py`.
 */

export interface SessionResponse {
  session_id: string;
  user_id: string;
}

export interface OnboardingRequest {
  session_id: string;
  user_id: string;
  student_level: string;
  learning_style: string[];
  favorite_topics: string[];
  explanation_depth: string;
  voice_preference: string;
  voice_id?: string | null;
  voice_label?: string | null;
}

export interface OnboardingResponse {
  status: string;
  personalization_summary: string;
}

export interface FeedbackRequest {
  job_id: string;
  session_id: string;
  user_id: string;
  rating: number;
  chips: string[];
  free_text: string;
  presentation_metrics?: Record<string, unknown>;
}

export interface FeedbackResponse {
  status: string;
  next_adaptation: string;
}

export interface AskRequest {
  question: string;
  session_id: string;
  user_id: string;
  student_level?: string;
  mode?: string;
  voice_id?: string | null;
}

export interface FollowupRequest {
  job_id: string;
  followup: string;
  session_id: string;
  user_id: string;
  voice_id?: string | null;
}

export interface Voice {
  voice_id: string;
  name: string;
  style_label: string;
  preview_url: string | null;
  category: string;
}

export interface Scenario {
  scenario_id: string;
  title: string;
  domain: string;
  student_question: string;
  concepts: string[];
  objects: Record<string, unknown>[];
  environment: Record<string, unknown>;
  known_values: Record<string, unknown>;
  unknown_values: Record<string, unknown>;
  assumptions: string[];
  safety: { allowed: boolean; risk_level: string; notes: string[] };
  simulation_plan: Record<string, unknown>;
  teaching_plan: {
    level: string;
    misconception_to_address: string | null;
    core_takeaway: string;
  };
}

export interface PlanetJumpKeyframe {
  t: number;
  y: number;
}

export interface PlanetJumpPlanet {
  name: string;
  gravity: number;
  color: string;
  jump_height_m: number;
  airtime_s: number;
  keyframes: PlanetJumpKeyframe[];
}

export interface PlanetJumpPayload {
  type: "planet_jump";
  title: string;
  v0: number;
  equation: string;
  planets: PlanetJumpPlanet[];
  highlight: string[];
  labels: string[];
  takeaway: string;
  viewer_url?: string;
}

export interface MoonDropObject {
  name: string;
  mass_kg: number;
  radius: number;
  color: string;
}

export interface MoonDropPayload {
  type: "moon_drop";
  title: string;
  gravity_m_s2: number;
  drop_height_m: number;
  objects: MoonDropObject[];
  fall_time_s: number;
  equation: string;
  comparison: {
    label: string;
    earth_gravity_m_s2: number;
    earth_fall_time_ball_s: number;
    earth_fall_time_feather_s: number;
  };
  labels: string[];
  takeaway: string;
  viewer_url?: string;
}

export type PartialCharge = "positive" | "negative" | "neutral";

export interface MoleculeAtom {
  id: string;
  element: string;
  label: string;
  offset: [number, number, number];
  radius: number;
  color: string;
  partial_charge: PartialCharge;
}

export interface MoleculeEntity {
  id: string;
  name: string;
  formula: string;
  start_position: [number, number, number];
  end_position: [number, number, number];
  atoms: MoleculeAtom[];
  bonds: [string, string][];
}

export interface MoleculeInteractionPayload {
  type: "molecule_interaction";
  title: string;
  molecules: MoleculeEntity[];
  interaction: {
    type: "hydrogen_bond" | "ionic_attraction";
    from: { molecule: string; atom: string };
    to: { molecule: string; atom: string };
    label: string;
  };
  animation: { duration_s: number };
  accuracy_note: string;
  takeaway: string;
  viewer_url?: string;
}

export interface RampBoxTrajectoryPoint {
  t: number;
  distance_m: number;
}

export interface RampBoxPayload {
  type: "ramp_box";
  ramp_angle_deg: number;
  friction_coefficient_estimate: number;
  ramp_length_m: number;
  trajectory: RampBoxTrajectoryPoint[];
  concepts: string[];
  assumptions: string[];
  source: "tracked" | "fallback_demo";
  takeaway: string;
  description?: string;
  viewer_url?: string;
}

export interface DynamicComparison {
  label: string;
  value: number;
  unit: string;
  color: string;
}

export interface DynamicEquation {
  label: string;
  formula: string;
  explanation: string;
}

export interface DynamicVariable {
  name: string;
  symbol: string;
  value: number;
  unit: string;
}

export interface DynamicObject {
  name: string;
  shape: string;
  color: string;
  mass_kg?: number;
  size?: number;
}

export interface DynamicKeyframe {
  t: number;
  description: string;
}

export interface DynamicPayload {
  type: "dynamic";
  title: string;
  subtitle: string;
  physics_type: string;
  objects: DynamicObject[];
  environment: Record<string, unknown>;
  sim_type: string;
  duration_s: number;
  keyframes: DynamicKeyframe[];
  equations: DynamicEquation[];
  variables: DynamicVariable[];
  comparisons: DynamicComparison[];
  takeaway: string;
  labels: string[];
  viewer_url?: string;
}

export interface FallbackDiagramPayload {
  type: "fallback_diagram";
  title: string;
  message: string;
  concepts: string[];
  takeaway: string;
  viewer_url?: string;
}

export type SimulationPayload =
  | PlanetJumpPayload
  | MoonDropPayload
  | MoleculeInteractionPayload
  | RampBoxPayload
  | DynamicPayload
  | FallbackDiagramPayload;

export interface VisualStyleInstructions {
  lead_with: string;
  diagram_density: string;
  equation_card: boolean;
  pace: string;
  voice_style: string;
  analogy_preference: string;
}

export interface JourneyBeat {
  id: string;
  text: string;
  focus: string;
  audio_url?: string | null;
}

export interface TeachingResult {
  transcript: string;
  beats?: JourneyBeat[];
  key_takeaway: string;
  concepts_explained: string[];
  misconceptions_corrected: string[];
  followups: string[];
  visual_style_instructions: VisualStyleInstructions;
  adaptation_note: string;
  audio_url: string | null;
  spoken_audio_url: string | null;
}

export interface AgentResult {
  job_id: string;
  status: string;
  message: string;
  stages: string[];
  scenario: Scenario;
  simulation: SimulationPayload;
  teaching: TeachingResult;
  fallback_used: boolean;
}

export interface VideoTwinUploadResponse {
  job_id: string;
  status: string;
  original_video_url: string;
  digital_twin_payload: RampBoxPayload;
  teaching: TeachingResult;
}

export interface MemorySummary {
  user_id: string;
  summary: string;
  concepts_seen: string[];
  suggested_questions: string[];
  learning_style: string[];
  favorite_visual_style: string;
  explanation_depth: string;
  presentation_preferences: Record<string, string>;
  interests: string[];
  onboarding_complete: boolean;
  feedback_count: number;
  last_feedback_rating: number | null;
  personalization_summary: string;
  backboard_enabled: boolean;
}

export const LEARNING_STYLES = [
  { id: "visual_animations", label: "Visual animations" },
  { id: "equations", label: "Equations" },
  { id: "stories_analogies", label: "Stories / analogies" },
  { id: "real_world_examples", label: "Real-world examples" },
  { id: "hands_on_experiments", label: "Hands-on experiments" },
] as const;

export const FEEDBACK_CHIPS = [
  "more_visuals",
  "more_equations",
  "less_math",
  "too_fast",
  "too_slow",
  "more_realistic",
  "better_voice",
  "show_equation_next",
] as const;
