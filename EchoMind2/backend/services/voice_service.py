"""Text-to-speech via ElevenLabs, with graceful no-op fallback.

If `ELEVENLABS_API_KEY` is missing or the request fails, returns `None`
so the frontend falls back to the browser's `speechSynthesis` API. The
agent pipeline must never block on this.
"""

from __future__ import annotations

import os

import requests

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "").strip()
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM").strip()
ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOBS_DIR = os.path.join(BASE_DIR, "static", "jobs")

VOICE_STYLE_SETTINGS = {
    "friendly_excited": {"stability": 0.35, "similarity_boost": 0.85, "style": 0.6},
    "calm": {"stability": 0.7, "similarity_boost": 0.75, "style": 0.1},
    "professor": {"stability": 0.6, "similarity_boost": 0.8, "style": 0.2},
    "funny": {"stability": 0.3, "similarity_boost": 0.8, "style": 0.7},
}


async def synthesize_voice(text: str, job_id: str, voice_preference: str = "friendly_excited") -> str | None:
    if not ELEVENLABS_API_KEY or not text.strip():
        return None

    voice_settings = VOICE_STYLE_SETTINGS.get(voice_preference, VOICE_STYLE_SETTINGS["friendly_excited"])

    try:
        resp = requests.post(
            ELEVENLABS_URL.format(voice_id=ELEVENLABS_VOICE_ID),
            headers={
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={
                "text": text,
                "model_id": "eleven_turbo_v2",
                "voice_settings": voice_settings,
            },
            timeout=20,
        )
        if not resp.ok or not resp.content:
            return None

        job_dir = os.path.join(JOBS_DIR, job_id)
        os.makedirs(job_dir, exist_ok=True)
        audio_path = os.path.join(job_dir, "explanation.mp3")
        with open(audio_path, "wb") as f:
            f.write(resp.content)

        return f"/static/jobs/{job_id}/explanation.mp3"
    except requests.RequestException:
        return None
