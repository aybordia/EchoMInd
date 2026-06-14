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
    voice_id: Optional[str] = None
    voice_label: Optional[str] = None


class Voice(BaseModel):
    voice_id: str
    name: str
    style_label: str = ""
    preview_url: Optional[str] = None
    category: str = "premade"


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
    voice_id: Optional[str] = None


class FollowupRequest(BaseModel):
    job_id: str
    followup: str
    session_id: str
    user_id: str
    voice_id: Optional[str] = None


class ConversationTurnRequest(BaseModel):
    job_id: str
    session_id: str
    user_id: str
    role: str
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class XPEvent(BaseModel):
    type: str
    amount: int
    job_id: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class PredictionSubmitRequest(BaseModel):
    job_id: str
    session_id: str
    user_id: str
    selected_answer: str


class GameState(BaseModel):
    user_id: str
    xp_total: int = 0
    level: int = 1
    concept_mastery: dict[str, Any] = Field(default_factory=dict)
    badges: list[dict[str, Any]] = Field(default_factory=list)
    unlocked_tools: list[str] = Field(default_factory=list)
    prediction_stats: dict[str, Any] = Field(default_factory=dict)
    xp_events: list[dict[str, Any]] = Field(default_factory=list)


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
