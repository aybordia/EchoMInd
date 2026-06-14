/**
 * Single API client for EchoMind. No component should call `fetch` directly
 * for backend communication — go through these functions instead.
 */
import type {
  AgentResult,
  ConversationTurnRequest,
  AskRequest,
  FeedbackRequest,
  FeedbackResponse,
  FollowupRequest,
  GameState,
  MemorySummary,
  OnboardingRequest,
  OnboardingResponse,
  PredictionSubmitRequest,
  PredictionSubmitResponse,
  SessionResponse,
  Voice,
} from "./types";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.detail ? ` - ${JSON.stringify(body.detail)}` : "";
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(`Request to ${path} failed (${res.status})${detail}`);
  }

  return res.json() as Promise<T>;
}

export function createSession(): Promise<SessionResponse> {
  return request<SessionResponse>("/api/session", { method: "POST" });
}

export function submitOnboarding(
  payload: OnboardingRequest
): Promise<OnboardingResponse> {
  return request<OnboardingResponse>("/api/onboarding", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMemory(userId: string): Promise<MemorySummary> {
  return request<MemorySummary>(`/api/memory/${encodeURIComponent(userId)}`);
}

export function getGameState(userId: string): Promise<GameState> {
  return request<GameState>(`/api/game/state/${encodeURIComponent(userId)}`);
}

export function submitPrediction(
  payload: PredictionSubmitRequest
): Promise<PredictionSubmitResponse> {
  return request<PredictionSubmitResponse>("/api/game/prediction", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function storeConversationTurn(payload: ConversationTurnRequest): Promise<{ status: string }> {
  return request<{ status: string }>("/api/agent/conversation", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listVoices(): Promise<Voice[]> {
  return request<Voice[]>("/api/voices");
}

export function askAgent(payload: AskRequest): Promise<AgentResult> {
  return request<AgentResult>("/api/agent/ask", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAgentResult(jobId: string): Promise<AgentResult> {
  return request<AgentResult>(`/api/agent/result/${encodeURIComponent(jobId)}`);
}

export function followupAgent(payload: FollowupRequest): Promise<AgentResult> {
  return request<AgentResult>("/api/agent/followup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitFeedback(
  payload: FeedbackRequest
): Promise<FeedbackResponse> {
  return request<FeedbackResponse>("/api/feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resolveAssetUrl(path?: string | null): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${BACKEND_URL}${path}`;
}
