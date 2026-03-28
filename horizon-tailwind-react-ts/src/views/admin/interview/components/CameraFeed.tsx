import React, { useEffect, useRef, useState, useCallback } from "react";
import { MdVideocam, MdVideocamOff, MdWarning, MdCheckCircle, MdPeople } from "react-icons/md";
import { useInterview } from "contexts/InterviewContext";

const API_BASE = "http://localhost:8000";
const CAPTURE_INTERVAL_MS = 5000; // capture + analyse every 5 seconds

type ProctorStatus = "idle" | "ok" | "no-face" | "multi-face" | "error";

interface ProctorLog {
  time: string;
  message: string;
  type: "ok" | "warn" | "error";
}

const CameraFeed: React.FC = () => {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraActive, setCameraActive]   = useState(false);
  const [shutterOpen,  setShutterOpen]    = useState(false);   // iris open animation
  const [permDenied,   setPermDenied]     = useState(false);
  const [status,       setStatus]         = useState<ProctorStatus>("idle");
  const [confidence,   setConfidence]     = useState<number>(0);
  const [log,          setLog]            = useState<ProctorLog[]>([]);
  const [faceCount,    setFaceCount]      = useState<number>(0);
  const [flash,        setFlash]          = useState(false);   // capture flash effect

  const { addCameraAlert } = useInterview();

  const pushLog = useCallback((message: string, type: ProctorLog["type"]) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLog((prev) => [{ time, message, type }, ...prev].slice(0, 5)); // keep last 5
  }, []);

  // ── Start webcam ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setPermDenied(false);
      // Iris open animation
      setTimeout(() => setShutterOpen(true), 100);
      pushLog("Camera connected", "ok");
    } catch {
      setPermDenied(true);
      pushLog("Camera access denied", "error");
    }
  }, [pushLog]);

  // ── Capture + send frame ──────────────────────────────────────────────────
  const captureAndAnalyse = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const b64 = canvas.toDataURL("image/jpeg", 0.7); // compress a bit

    // Visual flash  
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    try {
      const res = await fetch(`${API_BASE}/api/analyze-frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame: b64 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setFaceCount(data.face_count ?? 0);
      setConfidence(data.confidence ?? 0);

      if (data.face_count === 0) {
        setStatus("no-face");
        const msg = "⚠ No face detected";
        pushLog(msg, "warn");
        addCameraAlert(msg);
      } else if (data.face_count > 1) {
        setStatus("multi-face");
        const msg = `⚠ ${data.face_count} faces detected`;
        pushLog(msg, "warn");
        addCameraAlert(msg);
      } else {
        setStatus("ok");
        pushLog(`✓ Face confirmed (${Math.round((data.confidence ?? 0) * 100)}%)`, "ok");
      }
    } catch {
      setStatus("error");
      pushLog("Frame analysis failed", "error");
    }
  }, [cameraActive, addCameraAlert, pushLog]);

  // ── Periodic capture ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!cameraActive) return;
    // First capture after 1 second
    const first = setTimeout(() => captureAndAnalyse(), 1000);
    const interval = setInterval(captureAndAnalyse, CAPTURE_INTERVAL_MS);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [cameraActive, captureAndAnalyse]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── UI helpers ────────────────────────────────────────────────────────────
  const statusConfig: Record<ProctorStatus, { label: string; color: string; dot: string }> = {
    idle:       { label: "Waiting…",           color: "text-gray-400",  dot: "bg-gray-400" },
    ok:         { label: "Face Detected",       color: "text-green-500", dot: "bg-green-500" },
    "no-face":  { label: "No Face – Alert!",    color: "text-red-500",   dot: "bg-red-500"   },
    "multi-face":{ label: "Multiple Faces!",    color: "text-yellow-500",dot: "bg-yellow-500"},
    error:      { label: "Analysis Error",      color: "text-red-400",   dot: "bg-red-400"   },
  };
  const sc = statusConfig[status];

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md dark:border-white/10 dark:bg-navy-800">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <MdVideocam className="h-5 w-5 text-brand-500 dark:text-brand-400" />
          <span className="text-sm font-bold text-navy-700 dark:text-white">Proctoring Camera</span>
        </div>
        {cameraActive && (
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full animate-pulse ${sc.dot}`} />
            <span className={`text-xs font-semibold ${sc.color}`}>{sc.label}</span>
          </div>
        )}
      </div>

      {/* ── Camera viewport ── */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-950">

        {/* Actual video */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`h-full w-full object-cover transition-opacity duration-700 ${cameraActive && shutterOpen ? "opacity-100" : "opacity-0"}`}
        />

        {/* Capture flash */}
        {flash && (
          <div className="pointer-events-none absolute inset-0 animate-ping bg-white/20" />
        )}

        {/* Iris / Shutter overlay – slides away when camera is active */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${shutterOpen ? "opacity-0 scale-0" : "opacity-100 scale-100"}`}
          style={{ pointerEvents: shutterOpen ? "none" : "auto" }}
        >
          {/* Camera iris SVG */}
          <svg viewBox="0 0 120 120" className="h-28 w-28 text-brand-500/80 dark:text-brand-400/80" fill="currentColor">
            {/* 6-blade iris */}
            {[0,60,120,180,240,300].map((angle) => (
              <path
                key={angle}
                d="M60 60 L75 30 A20 20 0 0 1 95 50 Z"
                transform={`rotate(${angle} 60 60)`}
                className="transition-transform duration-700"
              />
            ))}
            <circle cx="60" cy="60" r="10" fill="white" className="opacity-70" />
          </svg>
        </div>

        {/* Permission denied overlay */}
        {permDenied && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-950/90">
            <MdVideocamOff className="h-10 w-10 text-red-400" />
            <p className="text-sm font-semibold text-red-400">Camera access denied</p>
            <p className="text-xs text-gray-400">Allow camera in browser settings</p>
          </div>
        )}

        {/* Status corner badge when camera is active */}
        {cameraActive && status !== "idle" && (
          <div className={`absolute left-2 top-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-sm
            ${status === "ok"
              ? "bg-green-900/70 text-green-300"
              : status === "multi-face"
              ? "bg-yellow-900/70 text-yellow-300"
              : "bg-red-900/70 text-red-300"
            }`}>
            {status === "ok"
              ? <MdCheckCircle className="h-3.5 w-3.5" />
              : status === "multi-face"
              ? <MdPeople className="h-3.5 w-3.5" />
              : <MdWarning className="h-3.5 w-3.5" />}
            {sc.label}
          </div>
        )}

        {/* Confidence bar */}
        {cameraActive && status === "ok" && (
          <div className="absolute bottom-0 left-0 right-0 px-2 pb-1">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-green-400 transition-all duration-500"
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* ── Start camera button ── */}
      {!cameraActive && !permDenied && (
        <div className="p-3">
          <button
            onClick={startCamera}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition-all duration-200 hover:bg-brand-600 hover:shadow-brand-500/40 active:scale-[0.98] dark:bg-brand-400 dark:hover:bg-brand-500"
          >
            <MdVideocam className="h-4 w-4" />
            Open Camera Shutter
          </button>
        </div>
      )}

      {/* ── Proctoring log ── */}
      {log.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-white/10">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Proctoring Log</p>
          <ul className="space-y-1">
            {log.map((entry, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="shrink-0 text-gray-400">{entry.time}</span>
                <span className={
                  entry.type === "ok" ? "text-green-500 dark:text-green-400"
                  : entry.type === "warn" ? "text-yellow-500 dark:text-yellow-400"
                  : "text-red-500 dark:text-red-400"
                }>
                  {entry.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
