"""Uploaded video -> ramp/box digital twin.

Tries lightweight OpenCV motion tracking to estimate a ramp angle and
friction coefficient. If tracking fails for any reason (bad file,
no motion detected, OpenCV missing), falls back to a clean
deterministic ramp demo so the product never breaks.
"""

from __future__ import annotations

import math
from typing import Any

DEFAULT_RAMP_ANGLE_DEG = 25.0
DEFAULT_FRICTION = 0.25
RAMP_LENGTH_M = 3.0
GRAVITY = 9.81


def _track_motion(video_path: str) -> dict[str, float] | None:
    try:
        import cv2  # noqa: PLC0415 - optional dependency
    except ImportError:
        return None

    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None

        frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1
        frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

        prev_gray = None
        centroids: list[tuple[float, float, float]] = []
        frame_idx = 0
        max_frames = 90

        while frame_idx < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (5, 5), 0)

            if prev_gray is not None:
                diff = cv2.absdiff(prev_gray, gray)
                _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if contours:
                    largest = max(contours, key=cv2.contourArea)
                    if cv2.contourArea(largest) > 50:
                        m = cv2.moments(largest)
                        if m["m00"] != 0:
                            cx = m["m10"] / m["m00"]
                            cy = m["m01"] / m["m00"]
                            t = frame_idx / fps
                            centroids.append((t, cx / frame_w, cy / frame_h))

            prev_gray = gray
            frame_idx += 1

        cap.release()

        if len(centroids) < 5:
            return None

        t0, x0, y0 = centroids[0]
        t1, x1, y1 = centroids[-1]
        dx, dy = x1 - x0, y1 - y0
        displacement = math.hypot(dx, dy)
        if displacement < 0.02:
            return None

        angle = math.degrees(math.atan2(abs(dy), abs(dx) + 1e-6))
        ramp_angle = max(10.0, min(60.0, angle if angle > 5 else DEFAULT_RAMP_ANGLE_DEG))

        # Heuristic: more displacement in the observed window implies less
        # friction slowing the object down.
        friction = max(0.05, min(0.6, 0.55 - displacement))

        return {"ramp_angle_deg": round(ramp_angle, 1), "friction_coefficient_estimate": round(friction, 2)}
    except Exception:
        return None


def _build_trajectory(ramp_angle_deg: float, friction: float) -> list[dict[str, float]]:
    theta = math.radians(ramp_angle_deg)
    accel = GRAVITY * (math.sin(theta) - friction * math.cos(theta))
    if accel <= 0.05:
        accel = GRAVITY * math.sin(theta) * 0.5

    duration = min(4.0, math.sqrt(2 * RAMP_LENGTH_M / accel))
    steps = 24
    trajectory = []
    for i in range(steps + 1):
        t = duration * i / steps
        distance = min(RAMP_LENGTH_M, 0.5 * accel * t * t)
        trajectory.append({"t": round(t, 3), "distance_m": round(distance, 3)})
    return trajectory


def analyze_video(video_path: str, description: str = "") -> dict[str, Any]:
    tracked = _track_motion(video_path)

    if tracked:
        ramp_angle = tracked["ramp_angle_deg"]
        friction = tracked["friction_coefficient_estimate"]
        source = "tracked"
        assumptions = [
            "EchoMind tracked the largest moving object between frames to estimate "
            "the ramp angle and friction.",
            "The reconstruction simplifies the scene to a single box on a straight ramp.",
        ]
    else:
        ramp_angle = DEFAULT_RAMP_ANGLE_DEG
        friction = DEFAULT_FRICTION
        source = "fallback_demo"
        assumptions = [
            "EchoMind couldn't confidently track motion in this clip, so it shows an "
            "estimated reconstruction using typical ramp values instead.",
            "The reconstruction simplifies the scene to a single box on a straight ramp.",
        ]

    trajectory = _build_trajectory(ramp_angle, friction)

    return {
        "type": "ramp_box",
        "ramp_angle_deg": ramp_angle,
        "friction_coefficient_estimate": friction,
        "ramp_length_m": RAMP_LENGTH_M,
        "trajectory": trajectory,
        "concepts": ["gravity component", "normal force", "friction"],
        "assumptions": assumptions,
        "source": source,
        "takeaway": (
            "Gravity, the normal force from the ramp, and friction together "
            "determine how quickly the box slides down."
        ),
        "description": description,
    }
