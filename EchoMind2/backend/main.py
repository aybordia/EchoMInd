"""EchoMind API entrypoint.

Run with:
    cd backend
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import os
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()

from routers import agent_router, game_router, memory_router  # noqa: E402
from models.schemas import SessionResponse  # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
JOBS_DIR = os.path.join(STATIC_DIR, "jobs")

os.makedirs(JOBS_DIR, exist_ok=True)

app = FastAPI(title="EchoMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(agent_router.router, prefix="/api", tags=["agent"])
app.include_router(game_router.router, prefix="/api", tags=["game"])
app.include_router(memory_router.router, prefix="/api", tags=["memory"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/session", response_model=SessionResponse)
async def create_session() -> SessionResponse:
    return SessionResponse(
        session_id=f"session_{uuid.uuid4().hex[:12]}",
        user_id=f"user_{uuid.uuid4().hex[:12]}",
    )
