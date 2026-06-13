from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from models.schemas import FeedbackRequest, OnboardingRequest
from services import memory_manager

router = APIRouter()


@router.post("/onboarding")
async def onboarding(req: OnboardingRequest) -> dict[str, Any]:
    return await memory_manager.store_onboarding(req)


@router.get("/memory/{user_id}")
async def memory_summary(user_id: str) -> dict[str, Any]:
    return await memory_manager.get_memory_summary(user_id)


@router.post("/feedback")
async def feedback(req: FeedbackRequest) -> dict[str, Any]:
    if not 1 <= req.rating <= 5:
        raise HTTPException(status_code=400, detail="rating must be between 1 and 5")
    return await memory_manager.store_feedback(req)
