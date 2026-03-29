import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    MdVideocam, MdVideocamOff, MdWarning, MdCheckCircle,
    MdPeople, MdOpenWith, MdClose,
} from "react-icons/md";
import { useInterview } from "contexts/InterviewContext";

const API_BASE = "http://localhost:8000";
const CAPTURE_INTERVAL_MS = 5000;

type ProctorStatus = "idle" | "requesting" | "ok" | "no-face" | "multi-face" | "looking-away" | "error";

interface ProctorLog {
    time: string;
    message: string;
    type: "ok" | "warn" | "error";
}

// Default bottom-right corner position
const DEFAULT_POS = { x: window.innerWidth - 292, y: window.innerHeight - 260 };

const CameraFeed: React.FC = () => {
    const videoRef  = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [cameraActive, setCameraActive] = useState(false);
    const [shutterOpen,  setShutterOpen]  = useState(false);
    const [permDenied,   setPermDenied]   = useState(false);
    const [status,       setStatus]       = useState<ProctorStatus>("requesting");
    const [confidence,   setConfidence]   = useState(0);
    const [log,          setLog]          = useState<ProctorLog[]>([]);
    const [flash,        setFlash]        = useState(false);
    const [minimised,    setMinimised]    = useState(false);

    // Dragging state
    const [pos,      setPos]      = useState(DEFAULT_POS);
    const dragging   = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const { addCameraAlert } = useInterview();

    // Consecutive-fail buffer — only alert after 2 consecutive bad frames
    // This eliminates single-frame glitches causing false alerts
    const failBuffer = useRef<string[]>([]); // stores last 2 problem types
    const ALERT_THRESHOLD = 2;              // frames in a row before alerting

    const pushLog = useCallback((message: string, type: ProctorLog["type"]) => {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setLog((prev) => [{ time, message, type }, ...prev].slice(0, 4));
    }, []);

    // ── Camera start ──────────────────────────────────────────────────────────
    const startCamera = useCallback(async () => {
        setStatus("requesting");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
                audio: false,
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setCameraActive(true);
            setPermDenied(false);
            setStatus("idle");
            setTimeout(() => setShutterOpen(true), 200);
            pushLog("📷 Camera active – proctoring on", "ok");
        } catch {
            setPermDenied(true);
            setStatus("error");
            pushLog("Camera permission denied", "error");
        }
    }, [pushLog]);

    useEffect(() => {
        startCamera();
        return () => {
            const video = videoRef.current;
            if (video?.srcObject) (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        };
    }, []); // eslint-disable-line

    // ── Periodic frame analysis ───────────────────────────────────────────────
    const captureAndAnalyse = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !cameraActive) return;
        const video = videoRef.current, canvas = canvasRef.current;
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL("image/jpeg", 0.7);

        setFlash(true);
        setTimeout(() => setFlash(false), 120);

        try {
            const res  = await fetch(`${API_BASE}/api/analyze-frame`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ frame: b64 }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            setConfidence(data.confidence ?? 0);
            const susps: string[] = data.suspicion ?? [];

            // ── Determine current frame problem type ──────────────────────────
            let currentProblem = "ok";
            if (susps.some((s: string) => s.includes("away") || s.includes("sideways"))) {
                currentProblem = "looking-away";
            } else if (data.face_count === 0) {
                currentProblem = "no-face";
            } else if (data.face_count > 1) {
                currentProblem = "multi-face";
            } else if (susps.some((s: string) => s.includes("far"))) {
                currentProblem = "too-far";
            }

            // ── Temporal smoothing — push to rolling buffer ───────────────────
            failBuffer.current = [...failBuffer.current, currentProblem].slice(-ALERT_THRESHOLD);
            const consecutiveSame =
                failBuffer.current.length === ALERT_THRESHOLD &&
                failBuffer.current.every((v) => v === currentProblem);

            if (currentProblem === "ok") {
                // Clear buffer on a good frame
                failBuffer.current = [];
                setStatus("ok");
                pushLog(`\u2713 Face detected (${Math.round((data.confidence ?? 0) * 100)}%)`, "ok");
            } else if (consecutiveSame) {
                // Only alert after ALERT_THRESHOLD consecutive identical problems
                if (currentProblem === "looking-away") {
                    setStatus("looking-away");
                    const msg = "\ud83d\udc40 Looking away from screen";
                    pushLog(msg, "warn");
                    addCameraAlert(msg);
                } else if (currentProblem === "no-face") {
                    setStatus("no-face");
                    const msg = "\u26a0 No face detected";
                    pushLog(msg, "warn");
                    addCameraAlert(msg);
                } else if (currentProblem === "multi-face") {
                    setStatus("multi-face");
                    const msg = `\u26a0 ${data.face_count} faces detected`;
                    pushLog(msg, "warn");
                    addCameraAlert(msg);
                } else if (currentProblem === "too-far") {
                    setStatus("looking-away");
                    const msg = "\u2194 Move closer to the camera";
                    pushLog(msg, "warn");
                    addCameraAlert(msg);
                }
            } else {
                // First occurrence of a problem — update status display but don't alert yet
                setStatus(currentProblem === "ok" ? "ok" : currentProblem as ProctorStatus);
            }
        } catch {
            setStatus("error");
        }
    }, [cameraActive, addCameraAlert, pushLog]);

    useEffect(() => {
        if (!cameraActive) return;
        const first    = setTimeout(() => captureAndAnalyse(), 1500);
        const interval = setInterval(captureAndAnalyse, CAPTURE_INTERVAL_MS);
        return () => { clearTimeout(first); clearInterval(interval); };
    }, [cameraActive, captureAndAnalyse]);

    // ── Drag handlers (pointer events) ────────────────────────────────────────
    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // Only drag from the header bar
        dragging.current = true;
        dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragging.current) return;
        const nx = e.clientX - dragOffset.current.x;
        const ny = e.clientY - dragOffset.current.y;
        // Clamp inside viewport
        setPos({
            x: Math.max(0, Math.min(nx, window.innerWidth  - 280)),
            y: Math.max(0, Math.min(ny, window.innerHeight - 60)),
        });
    };
    const onPointerUp = () => { dragging.current = false; };

    // ── Status config ─────────────────────────────────────────────────────────
    const statusConfig: Record<ProctorStatus, { label: string; color: string; dot: string; bg: string }> = {
        requesting:    { label: "Requesting…",      color: "text-brand-400",   dot: "bg-brand-400",   bg: "bg-navy-900/70 text-brand-300"    },
        idle:          { label: "Ready",             color: "text-gray-400",    dot: "bg-gray-400",    bg: "bg-gray-900/70 text-gray-300"     },
        ok:            { label: "All Clear",         color: "text-green-400",   dot: "bg-green-400",   bg: "bg-green-900/70 text-green-300"   },
        "no-face":     { label: "No Face!",          color: "text-red-400",     dot: "bg-red-500",     bg: "bg-red-900/70 text-red-300"       },
        "multi-face":  { label: "Multiple Faces!",   color: "text-yellow-400",  dot: "bg-yellow-400",  bg: "bg-yellow-900/70 text-yellow-300" },
        "looking-away":{ label: "Looking Away!",     color: "text-orange-400",  dot: "bg-orange-400",  bg: "bg-orange-900/70 text-orange-300" },
        error:         { label: "Cam Error",         color: "text-red-400",     dot: "bg-red-400",     bg: "bg-red-900/70 text-red-300"       },
    };
    const sc = statusConfig[status];

    return (
        <div
            style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 9999, width: 280 }}
            className="select-none overflow-hidden rounded-2xl border border-white/10 bg-navy-900 shadow-2xl shadow-black/50"
        >
            {/* ── Drag handle / header ── */}
            <div
                className="flex cursor-grab items-center justify-between bg-navy-800 px-3 py-2 active:cursor-grabbing"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
            >
                <div className="flex items-center gap-2">
                    <MdOpenWith className="h-4 w-4 text-gray-400" />
                    <MdVideocam className="h-4 w-4 text-brand-400" />
                    <span className="text-xs font-bold text-white">Proctoring</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <span className={`h-2 w-2 animate-pulse rounded-full ${sc.dot}`} />
                        <span className={`text-xs font-semibold ${sc.color}`}>{sc.label}</span>
                    </div>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setMinimised((v) => !v)}
                        className="ml-1 rounded p-0.5 hover:bg-white/10 text-gray-400 hover:text-white"
                    >
                        <MdClose className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* ── Body (hides when minimised) ── */}
            {!minimised && (
                <>
                    {/* Viewport */}
                    <div className="relative aspect-video w-full bg-gray-950">
                        <video
                            ref={videoRef}
                            autoPlay muted playsInline
                            className={`h-full w-full object-cover transition-opacity duration-700 ${cameraActive && shutterOpen ? "opacity-100" : "opacity-0"}`}
                        />

                        {/* Iris shutter */}
                        <div className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-gray-950 transition-all duration-700 ${shutterOpen ? "opacity-0" : "opacity-100"}`}>
                            <svg viewBox="0 0 120 120" className="h-20 w-20 text-brand-500" fill="currentColor">
                                {[0,60,120,180,240,300].map((a) => (
                                    <path key={a} d="M60 60 L75 30 A20 20 0 0 1 95 50 Z" transform={`rotate(${a} 60 60)`} />
                                ))}
                                <circle cx="60" cy="60" r="8" fill="white" opacity="0.8" />
                            </svg>
                        </div>

                        {/* Denied overlay */}
                        {permDenied && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-950/95">
                                <MdVideocamOff className="h-8 w-8 text-red-400" />
                                <p className="text-xs font-semibold text-red-400">Camera denied</p>
                                <button onClick={startCamera} className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-bold text-white hover:bg-brand-600">
                                    Retry
                                </button>
                            </div>
                        )}

                        {/* Status badge */}
                        {cameraActive && status !== "idle" && status !== "requesting" && (
                            <div className={`absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold backdrop-blur-sm ${sc.bg}`}>
                                {status === "ok"           ? <MdCheckCircle className="h-3 w-3" />
                                : status === "multi-face"  ? <MdPeople      className="h-3 w-3" />
                                :                            <MdWarning      className="h-3 w-3" />}
                                {sc.label}
                            </div>
                        )}

                        {/* Confidence bar */}
                        {status === "ok" && (
                            <div className="absolute bottom-0 left-0 right-0 px-1.5 pb-1">
                                <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
                                    <div className="h-full rounded-full bg-green-400 transition-all duration-500" style={{ width: `${Math.round(confidence * 100)}%` }} />
                                </div>
                            </div>
                        )}

                        {/* Flash */}
                        {flash && <div className="pointer-events-none absolute inset-0 bg-white/10" />}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>

                    {/* Proctoring log */}
                    {log.length > 0 && (
                        <div className="px-3 py-2">
                            <ul className="space-y-0.5">
                                {log.map((entry, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-xs">
                                        <span className="shrink-0 text-gray-500">{entry.time}</span>
                                        <span className={entry.type === "ok" ? "text-green-400" : entry.type === "warn" ? "text-yellow-400" : "text-red-400"}>
                                            {entry.message}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CameraFeed;
