"""Text-to-speech + voice catalog via ElevenLabs, with graceful fallback.

If `ELEVENLABS_API_KEY` is missing or a request fails, synthesis returns
`None` so the frontend falls back to the browser `speechSynthesis` API, and
`list_voices` returns a small static list so the picker still works. The agent
pipeline must never block on this.
"""

from __future__ import annotations

import os

import requests

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "").strip()
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM").strip()
ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
ELEVENLABS_VOICES_URL = "https://api.elevenlabs.io/v1/voices"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOBS_DIR = os.path.join(BASE_DIR, "static", "jobs")

VOICE_STYLE_SETTINGS = {
    "friendly_excited": {"stability": 0.35, "similarity_boost": 0.85, "style": 0.6},
    "calm": {"stability": 0.7, "similarity_boost": 0.75, "style": 0.1},
    "professor": {"stability": 0.6, "similarity_boost": 0.8, "style": 0.2},
    "funny": {"stability": 0.3, "similarity_boost": 0.8, "style": 0.7},
}

# Used only when ElevenLabs is unreachable, so the in-app picker still renders.
_FALLBACK_VOICES = [
    {
        "voice_id": "browser_default",
        "name": "Browser Voice",
        "style_label": "device default",
        "preview_url": None,
        "category": "fallback",
    }
]


def has_elevenlabs() -> bool:
    return bool(ELEVENLABS_API_KEY)


async def list_voices() -> list[dict]:
    """Return the selectable voices for the student's picker.

    With a key, proxies the ElevenLabs voices list (including the account's own
    custom/cloned voices) so the key never reaches the frontend. Each entry is
    `{voice_id, name, style_label, preview_url, category}`.
    """
    if not ELEVENLABS_API_KEY:
        return _FALLBACK_VOICES

    try:
        resp = requests.get(
            ELEVENLABS_VOICES_URL,
            headers={"xi-api-key": ELEVENLABS_API_KEY, "Accept": "application/json"},
            timeout=15,
        )
        if not resp.ok:
            return _FALLBACK_VOICES
        data = resp.json()
        voices: list[dict] = []
        for v in data.get("voices", []):
            labels = v.get("labels") or {}
            style_label = (
                ", ".join(
                    str(x)
                    for x in [labels.get("accent"), labels.get("description"), labels.get("age")]
                    if x
                )
                or v.get("category", "")
            )
            voices.append(
                {
                    "voice_id": v.get("voice_id"),
                    "name": v.get("name"),
                    "style_label": style_label,
                    "preview_url": v.get("preview_url"),
                    "category": v.get("category", "premade"),
                }
            )
        return voices or _FALLBACK_VOICES
    except (requests.RequestException, ValueError):
        return _FALLBACK_VOICES


def _synthesize_to(
    text: str, job_id: str, filename: str, voice_preference: str, voice_id: str | None
) -> str | None:
    """Synthesize `text` to `static/jobs/{job_id}/{filename}`. Returns URL or None."""
    if not ELEVENLABS_API_KEY or not text.strip():
        return None

    chosen_voice = (voice_id or "").strip() or ELEVENLABS_VOICE_ID
    if chosen_voice in ("", "browser_default"):
        return None

    voice_settings = VOICE_STYLE_SETTINGS.get(
        voice_preference, VOICE_STYLE_SETTINGS["friendly_excited"]
    )

    try:
        resp = requests.post(
            ELEVENLABS_TTS_URL.format(voice_id=chosen_voice),
            headers={
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={
                "text": text,
                "model_id": "eleven_turbo_v2_5",
                "voice_settings": voice_settings,
            },
            timeout=30,
        )
        if not resp.ok or not resp.content:
            return None

        job_dir = os.path.join(JOBS_DIR, job_id)
        os.makedirs(job_dir, exist_ok=True)
        with open(os.path.join(job_dir, filename), "wb") as f:
            f.write(resp.content)
        return f"/static/jobs/{job_id}/{filename}"
    except requests.RequestException:
        return None


async def synthesize_voice(
    text: str,
    job_id: str,
    voice_preference: str = "friendly_excited",
    voice_id: str | None = None,
) -> str | None:
    """Narrate the full `text` with the chosen voice. Returns the MP3 URL or None."""
    return _synthesize_to(text, job_id, "explanation.mp3", voice_preference, voice_id)


async def synthesize_beats(
    beats: list[dict],
    job_id: str,
    voice_preference: str = "friendly_excited",
    voice_id: str | None = None,
) -> dict[str, str]:
    """Synthesize one audio clip per journey beat so the guided tour can pause and
    speak each step in the chosen voice. Returns {beat_id: url}; empty if no key."""
    if not ELEVENLABS_API_KEY:
        return {}
    out: dict[str, str] = {}
    for i, beat in enumerate(beats):
        url = _synthesize_to(
            beat.get("text", ""), job_id, f"beat_{i}.mp3", voice_preference, voice_id
        )
        if url:
            out[beat.get("id", f"beat_{i}")] = url
    return out
