"""Shared Pydantic models for EchoMind.

These types are the contract between backend and frontend. Keep
`frontend/lib/types.ts` in sync with any changes made here.
"""

from typing import Any, Optional

from pydantic import BaseModel, Field


class SessionResponse(BaseModel):
    session_id: str
    user_id: str


class OnboardingRequest(BaseModel):
    session_id: str
    user_id: str
    student_level: str = "middle_school"
    learning_style: list[str] = Field(default_factory=list)
    favorite_topics: list[str] = Field(default_factory=list)
    explanation_depth: str = "quick_then_deeper"
    voice_preference: str = "friendly_excited"


class OnboardingResponse(BaseModel):
    status: str
    personalization_summary: str


class FeedbackRequest(BaseModel):
    job_id: str
    session_id: str
    user_id: str
    rating: int
    chips: list[str] = Field(default_factory=list)
    free_text: str = ""
    presentation_metrics: dict[str, Any] = Field(default_factory=dict)


class FeedbackResponse(BaseModel):
    status: str
    next_adaptation: str


class AskRequest(BaseModel):
    question: str
    session_id: str
    user_id: str
    student_level: str = "middle_school"
    mode: str = "voice_or_text"


class FollowupRequest(BaseModel):
    job_id: str
    followup: str
    session_id: str
    user_id: str


class Scenario(BaseModel):
    scenario_id: str
    title: str
    domain: str
    student_question: str
    concepts: list[str] = Field(default_factory=list)
    objects: list[dict[str, Any]] = Field(default_factory=list)
    environment: dict[str, Any] = Field(default_factory=dict)
    known_values: dict[str, Any] = Field(default_factory=dict)
    unknown_values: dict[str, Any] = Field(default_factory=dict)
    assumptions: list[str] = Field(default_factory=list)
    safety: dict[str, Any] = Field(
        default_factory=lambda: {"allowed": True, "risk_level": "low", "notes": []}
    )
    simulation_plan: dict[str, Any] = Field(default_factory=dict)
    teaching_plan: dict[str, Any] = Field(default_factory=dict)


class AgentJob(BaseModel):
    job_id: str
    session_id: str
    user_id: str
    question: str
    stage: str
    scenario: Optional[Scenario] = None
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    fallback_used: bool = False


class AgentAskResponse(BaseModel):
    job_id: str
    status: str
    scenario: Scenario
    initial_message: str


class AgentResult(BaseModel):
    job_id: str
    status: str
    scenario: dict[str, Any]
    simulation: dict[str, Any]
    teaching: dict[str, Any]


class VideoTwinUploadResponse(BaseModel):
    job_id: str
    status: str
    message: str
    original_video_url: Optional[str] = None
    digital_twin_payload: Optional[dict[str, Any]] = None
    teaching: Optional[dict[str, Any]] = None
