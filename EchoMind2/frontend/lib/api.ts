/**
 * Single API client for EchoMind. No component should call `fetch` directly
 * for backend communication — go through these functions instead.
 */
import type {
  AgentResult,
  AskRequest,
  FeedbackRequest,
  FeedbackResponse,
  FollowupRequest,
  MemorySummary,
  OnboardingRequest,
  OnboardingResponse,
  SessionResponse,
  VideoTwinUploadResponse,
  Voice,
} from "./types";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";

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

export async function uploadVideoTwin(
  file: File,
  metadata: { session_id: string; user_id: string; description?: string }
): Promise<VideoTwinUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("session_id", metadata.session_id);
  form.append("user_id", metadata.user_id);
  form.append("description", metadata.description ?? "");

  const res = await fetch(`${BACKEND_URL}/api/video-twin/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Video twin upload failed (${res.status})`);
  }

  return res.json() as Promise<VideoTwinUploadResponse>;
}

/** Resolve a backend-relative asset path (e.g. `/static/jobs/...`) to a full URL. */
export function resolveAssetUrl(path?: string | null): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${BACKEND_URL}${path}`;
}
