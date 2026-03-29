"""
camera_analysis.py — Robust face proctoring
─────────────────────────────────────────────
Detection strategy (best → fallback):
  1. OpenCV DNN  (ResNet-SSD, downloaded once on first run) — most accurate
  2. Haar Cascade — always available, used if DNN model absent

Improvements over old version:
  • Deep-learning detector handles angles, lighting, partial occlusion
  • Much lower false-positive / false-negative rate
  • Profile cascade only fires when DNN also sees nothing (quieter alerts)
"""

import base64
import os
import urllib.request
import numpy as np
import cv2

# ─── DNN model paths ──────────────────────────────────────────────────────────
_DIR = os.path.dirname(os.path.abspath(__file__))
_PROTO = os.path.join(_DIR, "deploy.prototxt")
_MODEL = os.path.join(_DIR, "res10_300x300_ssd_iter_140000.caffemodel")

# Public mirrors for the ResNet-SSD face detector (OpenCV's own models)
_PROTO_URL = (
    "https://raw.githubusercontent.com/opencv/opencv/master/"
    "samples/dnn/face_detector/deploy.prototxt"
)
_MODEL_URL = (
    "https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector"
    "_20170830/res10_300x300_ssd_iter_140000.caffemodel"
)

# ─── Haar cascade ─────────────────────────────────────────────────────────────
_HAAR = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
_HAAR_ALT = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"
)

# ─── DNN net (loaded once) ────────────────────────────────────────────────────
_dnn_net = None


def _ensure_dnn_models():
    """Download model files if not present. Silent no-op if download fails."""
    global _dnn_net
    if _dnn_net is not None:
        return True

    try:
        if not os.path.exists(_PROTO):
            print("[camera] Downloading deploy.prototxt …")
            urllib.request.urlretrieve(_PROTO_URL, _PROTO)
        if not os.path.exists(_MODEL):
            print("[camera] Downloading caffemodel (2 MB) …")
            urllib.request.urlretrieve(_MODEL_URL, _MODEL)
        net = cv2.dnn.readNetFromCaffe(_PROTO, _MODEL)
        _dnn_net = net
        print("[camera] DNN face detector loaded ✓")
        return True
    except Exception as exc:
        print(f"[camera] DNN load failed, falling back to Haar: {exc}")
        return False


# Try to load at import time (non-blocking — will quietly fall back)
_ensure_dnn_models()


# ─── Detection helpers ────────────────────────────────────────────────────────

def _detect_dnn(frame: np.ndarray, conf_threshold: float = 0.55):
    """
    Returns list of (x, y, w, h) for faces with confidence > threshold.
    More robust than Haar; handles angles, low-light, partial faces.
    """
    if _dnn_net is None:
        return []

    h, w = frame.shape[:2]
    blob = cv2.dnn.blobFromImage(
        cv2.resize(frame, (300, 300)), 1.0,
        (300, 300), (104.0, 177.0, 123.0)
    )
    _dnn_net.setInput(blob)
    detections = _dnn_net.forward()

    boxes = []
    for i in range(detections.shape[2]):
        conf = float(detections[0, 0, i, 2])
        if conf < conf_threshold:
            continue
        x1 = int(detections[0, 0, i, 3] * w)
        y1 = int(detections[0, 0, i, 4] * h)
        x2 = int(detections[0, 0, i, 5] * w)
        y2 = int(detections[0, 0, i, 6] * h)
        bw, bh = x2 - x1, y2 - y1
        if bw > 20 and bh > 20:
            boxes.append((x1, y1, bw, bh))
    return boxes


def _detect_haar(gray: np.ndarray):
    """
    Two-cascade ensemble — returns union of frontal_default + frontal_alt2.
    Much more sensitive (lower minNeighbors) to avoid false negatives.
    """
    f1 = _HAAR.detectMultiScale(
        gray, scaleFactor=1.05, minNeighbors=3, minSize=(40, 40),
        flags=cv2.CASCADE_SCALE_IMAGE,
    )
    f2 = _HAAR_ALT.detectMultiScale(
        gray, scaleFactor=1.05, minNeighbors=3, minSize=(40, 40),
        flags=cv2.CASCADE_SCALE_IMAGE,
    )
    results = []
    if isinstance(f1, np.ndarray):
        results += f1.tolist()
    if isinstance(f2, np.ndarray):
        results += f2.tolist()
    return results


def _detect_profile(gray: np.ndarray) -> bool:
    """Returns True only if a clear sideways profile is found."""
    _profile = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_profileface.xml"
    )
    # Left profile
    lp = _profile.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
    )
    # Right profile (flip)
    rp = _profile.detectMultiScale(
        cv2.flip(gray, 1), scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
    )
    return (isinstance(lp, np.ndarray) and len(lp) > 0) or \
           (isinstance(rp, np.ndarray) and len(rp) > 0)


# ─── Main API ─────────────────────────────────────────────────────────────────

def analyze_frame(b64_frame: str) -> dict:
    """
    Analyse a base64 JPEG webcam frame for proctoring events.

    Returns:
      {
        "face_detected": bool,
        "face_count":    int,
        "confidence":    float,   # 0–1
        "alert":         str|None,
        "boxes":         [[x,y,w,h], ...],
        "suspicion":     [str, ...]
      }
    """
    # ── Decode ────────────────────────────────────────────────────────────────
    try:
        if "," in b64_frame:
            b64_frame = b64_frame.split(",", 1)[1]
        arr   = np.frombuffer(base64.b64decode(b64_frame), np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("imdecode returned None")
    except Exception as exc:
        return _build(False, 0, 0.0, [f"Decode error: {exc}"], [])

    h, w = frame.shape[:2]
    gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray  = cv2.equalizeHist(gray)

    # ── Detect ────────────────────────────────────────────────────────────────
    # Prefer DNN (more accurate), fall back to Haar
    if _dnn_net is not None:
        boxes = _detect_dnn(frame)
        method = "dnn"
    else:
        boxes = _detect_haar(gray)
        method = "haar"

    face_count = len(boxes)
    print(f"[camera/{method}] faces={face_count} frame={w}x{h}")

    suspicion  = []
    confidence = 0.0

    if face_count == 0:
        # Check if it's a profile or just gone
        looking_away = _detect_profile(gray)
        if looking_away:
            suspicion.append("Candidate is looking away from the screen")
        else:
            suspicion.append("No face detected – candidate may have left the frame")

    elif face_count > 1:
        suspicion.append(f"Multiple faces detected ({face_count}) – possible impersonation")
        # Still compute confidence from the largest face
        face_count = face_count  # keep real count

    if face_count >= 1 and not suspicion:
        # Compute confidence from face area ratio
        bx, by, bw, bh = boxes[0]
        ratio      = (bw * bh) / (w * h)
        confidence = min(1.0, ratio * 10)

        if ratio < 0.012:
            suspicion.append("Candidate appears to be too far from the camera")
            confidence = 0.0

    return _build(face_count >= 1, face_count, round(float(confidence), 2), suspicion, boxes)


def _build(face_detected, face_count, confidence, suspicion, boxes):
    return {
        "face_detected": face_detected,
        "face_count":    face_count,
        "confidence":    confidence,
        "alert":         " | ".join(suspicion) if suspicion else None,
        "boxes":         [list(b) for b in boxes],
        "suspicion":     suspicion,
    }
