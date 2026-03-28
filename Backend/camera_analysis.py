"""
camera_analysis.py
------------------
OpenCV-based face proctoring helper.
Receives a base64-encoded JPEG frame, decodes it, runs Haar-cascade face
detection, and returns a structured result the FastAPI endpoint can forward
to the browser.
"""

import base64
import io
import numpy as np
import cv2

# ─── Haar Cascade (ships with opencv-python) ────────────────────────────────
FACE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

# Detection parameters – tuned for a typical webcam at 640×480
_SCALE_FACTOR  = 1.1
_MIN_NEIGHBORS = 5
_MIN_SIZE      = (60, 60)


def analyze_frame(b64_frame: str) -> dict:
    """
    Analyse a single frame for face proctoring.

    Args:
        b64_frame: Base64-encoded JPEG/PNG image string (data-URL prefix is
                   stripped automatically).

    Returns:
        {
            "face_detected": bool,
            "face_count":    int,
            "confidence":    float,        # 0.0 – 1.0 estimate
            "alert":         str | None,
            "boxes":         [[x,y,w,h], ...]  # bounding boxes
        }
    """
    # ── 1. Decode the base64 frame ───────────────────────────────────────────
    try:
        # Strip optional data-URL header: "data:image/jpeg;base64,..."
        if "," in b64_frame:
            b64_frame = b64_frame.split(",", 1)[1]

        img_bytes = base64.b64decode(b64_frame)
        np_arr    = np.frombuffer(img_bytes, np.uint8)
        frame     = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            raise ValueError("cv2.imdecode returned None – invalid image data")
    except Exception as exc:
        return {
            "face_detected": False,
            "face_count":    0,
            "confidence":    0.0,
            "alert":         f"Frame decode error: {exc}",
            "boxes":         [],
        }

    # ── 2. Pre-process: grayscale + contrast-enhance ──────────────────────────
    gray    = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray    = cv2.equalizeHist(gray)          # better detection in low-light

    # ── 3. Run Haar-cascade face detector ────────────────────────────────────
    faces = FACE_CASCADE.detectMultiScale(
        gray,
        scaleFactor  = _SCALE_FACTOR,
        minNeighbors = _MIN_NEIGHBORS,
        minSize      = _MIN_SIZE,
        flags        = cv2.CASCADE_SCALE_IMAGE,
    )

    face_count = len(faces) if isinstance(faces, np.ndarray) else 0
    boxes      = faces.tolist() if isinstance(faces, np.ndarray) else []

    # ── 4. Build response ────────────────────────────────────────────────────
    if face_count == 0:
        alert      = "No face detected – candidate may have left the frame"
        confidence = 0.0
    elif face_count == 1:
        alert      = None                     # all good
        # Naive confidence: larger face relative to frame → higher confidence
        h, w       = frame.shape[:2]
        fx, fy, fw, fh = boxes[0]
        confidence = min(1.0, (fw * fh) / (w * h) * 8)   # scale to ~1.0
    else:
        alert      = f"Multiple faces detected ({face_count}) – possible impersonation"
        confidence = 0.5

    return {
        "face_detected": face_count >= 1,
        "face_count":    face_count,
        "confidence":    round(confidence, 2),
        "alert":         alert,
        "boxes":         boxes,
    }
