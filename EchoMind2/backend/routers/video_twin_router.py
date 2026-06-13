from __future__ import annotations

import json
import os
import uuid
from typing import Any

from fastapi import APIRouter, File, Form, UploadFile

from services import memory_manager, tutor_agent, video_twin, voice_service

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOBS_DIR = os.path.join(BASE_DIR, "static", "jobs")

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/video-twin/upload")
async def upload_video_twin(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    user_id: str = Form(...),
    description: str = Form(""),
) -> dict[str, Any]:
    job_id = f"video_job_{uuid.uuid4().hex[:10]}"
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".mp4"
    video_path = os.path.join(job_dir, f"original{ext}")

    contents = await file.read()
    with open(video_path, "wb") as f:
        f.write(contents[:MAX_FILE_SIZE])

    digital_twin_payload = video_twin.analyze_video(video_path, description)

    student_context = await memory_manager.get_student_context(user_id)
    scenario = {
        "title": "Ramp and Box Digital Twin",
        "domain": "ramp_box",
        "concepts": digital_twin_payload["concepts"],
        "assumptions": digital_twin_payload.get("assumptions", []),
        "teaching_plan": {"core_takeaway": digital_twin_payload.get("takeaway", "")},
    }
    teaching = tutor_agent.build_teaching_result(scenario, digital_twin_payload, student_context)

    voice_pref = student_context.get("presentation_preferences", {}).get("voice_style", "friendly_excited")
    audio_url = await voice_service.synthesize_voice(teaching["transcript"], job_id, voice_pref)
    teaching["audio_url"] = audio_url
    teaching["spoken_audio_url"] = audio_url

    await memory_manager.store_simulation_memory(user_id, scenario, teaching)

    with open(os.path.join(job_dir, "digital_twin_payload.json"), "w", encoding="utf-8") as f:
        json.dump(digital_twin_payload, f, indent=2)
    with open(os.path.join(job_dir, "teaching.json"), "w", encoding="utf-8") as f:
        json.dump(teaching, f, indent=2)

    return {
        "job_id": job_id,
        "status": "complete",
        "original_video_url": f"/static/jobs/{job_id}/original{ext}",
        "digital_twin_payload": digital_twin_payload,
        "teaching": teaching,
    }
