from __future__ import annotations

import json
import os
from typing import Any

from fastapi import APIRouter, HTTPException

from models.schemas import PredictionSubmitRequest, XPEvent
from services import game_manager

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOBS_DIR = os.path.join(BASE_DIR, "static", "jobs")


def _job_result(job_id: str) -> dict[str, Any]:
    path = os.path.join(JOBS_DIR, job_id, "result.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Job not found")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/game/state/{user_id}")
async def get_game_state(user_id: str) -> dict[str, Any]:
    return await game_manager.get_game_state(user_id)


@router.post("/game/prediction")
async def submit_prediction(req: PredictionSubmitRequest) -> dict[str, Any]:
    return await game_manager.submit_prediction(req, _job_result(req.job_id))


@router.post("/game/xp")
async def award_xp(req: XPEvent, user_id: str) -> dict[str, Any]:
    return await game_manager.award_xp(user_id, req.type, req.amount, req.job_id, req.metadata)
