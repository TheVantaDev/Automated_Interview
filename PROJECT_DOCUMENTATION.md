# AI Interviewer — Complete Project Documentation

---

## 1. Project Overview

**AI Interviewer** is a full-stack web application that:
1. Accepts a candidate's PDF resume
2. Uses a local AI (Ollama / Llama 3.1) to analyze it and generate 7–8 tailored interview questions
3. Presents those questions in an interview UI with real-time webcam proctoring
4. Evaluates all answers using AI (compare-to-ideal-answer method) and shows a scored results dashboard

**Stack:**
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Backend | Python 3.13 + FastAPI + Uvicorn |
| AI Engine | Ollama (Llama 3.1 running locally) |
| Camera | OpenCV (DNN ResNet-SSD detector) |
| PDF Parsing | pdfplumber |

---

## 2. System Architecture

```
Browser (localhost:3000)
│
│  HTTP REST calls (fetch / CORS)
│
FastAPI Server (localhost:8000)
│
├── Ollama (localhost:11434)   ← AI model for all text tasks
└── OpenCV DNN                 ← Face detection from webcam frames
```

---

## 3. Backend — File Map

### `Backend/main.py`
**Role:** FastAPI application entry point. Defines all HTTP API endpoints.

| Endpoint | Method | What it does |
|----------|--------|-------------|
| `/api/upload-resume` | POST | Receives PDF file, extracts text with pdfplumber, calls `analyze_resume()`, returns questions + skills |
| `/api/analyze-frame` | POST | Receives base64 webcam frame, calls `cv_analyze_frame()`, returns face detection result |
| `/api/generate-results` | POST | Receives all Q&A pairs, calls `generate_overall_results()`, returns 5-category scores |
| `/api/score-answer` | POST | Scores a single answer (utility endpoint) |

**Key imports:**
```
utils.py           → analyze_resume, score_answer, generate_overall_results
camera_analysis.py → analyze_frame (aliased as cv_analyze_frame)
pdfplumber         → PDF text extraction
fastapi + pydantic → API framework + request/response models
```

---

### `Backend/utils.py`
**Role:** All AI logic — communicates with Ollama (Llama 3.1).

| Function | Input | Output | How it works |
|----------|-------|--------|-------------|
| `analyze_resume(text)` | Raw resume text (string) | `{is_valid, skills[], questions[]}` | Sends one prompt to Llama 3.1 asking it to validate the resume, extract skills, and generate 7–8 categorized questions |
| `score_answer(question, answer)` | Question + candidate answer | `{score: 0-10, feedback: string}` | Asks Llama to think of an ideal answer first, then compare candidate's answer to it |
| `generate_overall_results(qa_pairs)` | List of `{question, answer, category}` | List of 5 category scores | Sends all Q&A to Llama with strict scoring rules (0-2 for gibberish, 7-8 for good, 9-10 for expert). Returns JSON array with Technical Skills, Problem Solving, System Design, Communication, Cultural Fit |
| `_extract_json_array(text)` | Raw LLM response | Parsed list | Extracts a JSON array from anywhere in Ollama's text response using regex — fixes the bug where `format='json'` returned objects not arrays |
| `_extract_json_object(text)` | Raw LLM response | Parsed dict | Same but for single JSON objects |
| `_chat(prompt)` | Prompt string | Raw text from Ollama | Single Ollama API call wrapper |

**Important design decision:** We do NOT use `format='json'` in Ollama calls because it forces the response into a JSON **object** `{}` — but we need a JSON **array** `[]` for results. Instead we call without format and use regex extraction.

---

### `Backend/camera_analysis.py`
**Role:** Webcam frame analysis using OpenCV.

| Function | Input | Output |
|----------|-------|--------|
| `analyze_frame(b64_frame)` | Base64 JPEG string | `{face_detected, face_count, confidence, alert, boxes[], suspicion[]}` |

**Detection strategy (best → fallback):**
1. **OpenCV DNN ResNet-SSD** — downloads `deploy.prototxt` + `res10_300x300_ssd_iter_140000.caffemodel` (2 MB) on first run. Handles angles, low-light, partial faces. Far more accurate than Haar cascades.
2. **Dual Haar Cascade fallback** — uses `frontalface_default` + `frontalface_alt2` with lower `minNeighbors=3` if DNN model fails to download.

**What it detects:**
| Situation | `suspicion` message |
|-----------|-------------------|
| No face visible | "No face detected – candidate may have left the frame" |
| Only profile visible (looking away) | "Candidate is looking away from the screen" |
| Multiple faces | "Multiple faces detected (N) – possible impersonation" |
| Face too small / too far | "Candidate appears to be too far from the camera" |

---

## 4. Frontend — File Map

### Entry & Routing
```
src/index.tsx       → ReactDOM root render, wraps App in BrowserRouter
src/App.tsx         → Defines routes: / → /admin/default, admin/* → AdminLayout
src/routes.tsx      → Route config array: Upload Resume, Interview, Results
src/index.css       → Global CSS overrides
```

---

### Layouts
#### `src/layouts/admin/index.tsx`
**Role:** The shell that wraps all 3 pages. Renders:
- `<Sidebar />` on the left
- `<Navbar />` at the top
- `<Footer />` at the bottom
- The current page component in the main content area

---

### Shared Components
| File | Used by | Purpose |
|------|---------|---------|
| `components/card/index.tsx` | ResumeUpload, CandidateCard, QuestionItem, ScoreCard, Widget | White rounded card container |
| `components/widget/Widget.tsx` | Results page | Stat display box (icon + label + value) |
| `components/sidebar/index.tsx` | AdminLayout | Left navigation rail |
| `components/sidebar/components/Links.tsx` | Sidebar | Renders route links from `routes.tsx` |
| `components/navbar/index.tsx` | AdminLayout | Top bar with dark mode toggle |
| `components/footer/Footer.tsx` | AdminLayout | Bottom bar |
| `components/fixedPlugin/FixedPlugin.tsx` | AdminLayout | Floating dark/light mode button |

---

### Context (State Management)
#### `src/contexts/InterviewContext.tsx`
**Role:** Global state shared across all 3 pages. Uses React Context + useState.

| State field | Type | Purpose |
|-------------|------|---------|
| `currentStep` | `"upload" \| "interview" \| "results"` | Controls which page is "active" |
| `fileName` | string | Uploaded PDF filename |
| `questions` | `Question[]` | Array of 7–8 questions from backend |
| `answers` | `Record<id, string>` | Candidate's typed answers, keyed by question ID |
| `results` | `CategoryResult[]` | 5 scored categories from `/api/generate-results` |
| `isScoring` | boolean | True while waiting for results from Ollama |
| `cameraAlerts` | `string[]` | Log of all proctoring alerts during interview |
| `skillsExtracted` | `string[]` | Skills extracted from resume |
| `predictedCategory` | string | Job role predicted by AI |
| `resumeSnippet` | string | Short text from resume |

| Action | Purpose |
|--------|---------|
| `setBackendData(data)` | Saves all data returned from `/api/upload-resume` |
| `setAnswer(id, value)` | Updates a single answer |
| `submitInterview()` | Sets `currentStep = "results"` so interview → results navigation triggers |
| `addCameraAlert(msg)` | Appends a new alert to `cameraAlerts[]` |
| `resetInterview()` | Clears all state, goes back to upload |
| `setResults(data)` | Saves scored results from backend |
| `setIsScoring(bool)` | Controls loading spinner on results page |

---

### Page 1 — Upload Resume
#### `src/views/admin/default/index.tsx`
Simple wrapper that renders `<ResumeUpload />`.

#### `src/views/admin/default/components/ResumeUpload.tsx`
**What it does:**
1. Drag-and-drop or click-to-browse PDF upload
2. On "Analyze Resume" click → POST to `/api/upload-resume` with FormData
3. Shows a 4-step animated progress bar while Ollama processes (Uploading → Reading PDF → AI Analyzing → Generating Questions)
4. On success → calls `setBackendData()` + `goToInterview()` + navigates to `/admin/interview`
5. Timeout: 180 seconds (Ollama can be slow)

---

### Page 2 — Interview
#### `src/views/admin/interview/index.tsx`
**What it does:**
1. Reads questions + answers from context
2. Renders `<CandidateCard />`, then list of `<QuestionItem />` components
3. Renders floating `<CameraFeed />` (fixed-position, draggable)
4. On submit → calls `submitInterview()`, waits for `currentStep === "results"`, then navigates

#### `src/views/admin/interview/components/CandidateCard.tsx`
Displays candidate info from context: predicted job role, resume snippet, extracted skills.

#### `src/views/admin/interview/components/QuestionItem.tsx`
Single question card with a `<textarea>` for the answer. Calls `setAnswer()` on change.

#### `src/views/admin/interview/components/CameraFeed.tsx`
**Role:** Floating draggable proctoring camera widget.

**How it works:**
1. On mount → calls `navigator.mediaDevices.getUserMedia()` to start webcam (auto, no button needed)
2. Shows an iris animation while waiting for permission
3. Every 5 seconds → captures frame to `<canvas>` → base64 → POST `/api/analyze-frame`
4. **Temporal smoothing:** Only raises an alert if the **same problem appears 2 consecutive times** — eliminates single-frame glitches
5. Alerts are added to `cameraAlerts[]` in context via `addCameraAlert()`
6. **Draggable:** Uses `pointer events` — drag the header bar to move anywhere on screen
7. **Minimisable:** Click the X button in the header to collapse to just the header bar

**Proctoring states:**
| Status | Trigger |
|--------|---------|
| `ok` | Face detected, looking at screen |
| `no-face` | No face for 2 consecutive checks |
| `looking-away` | Profile face or "far" message for 2 consecutive checks |
| `multi-face` | 2+ faces for 2 consecutive checks |
| `error` | Fetch to backend failed |

---

### Page 3 — Results
#### `src/views/admin/results/index.tsx`
**What it does:**
1. On mount (when `currentStep === "results"`) → POST to `/api/generate-results` with all Q&A pairs
2. Shows loading spinner while Ollama scores (can take 30–60 seconds)
3. Displays 5 `<ScoreCard />` components with category scores
4. Shows overall percentage + "Potential Hire / Needs Improvement" badge
5. Shows proctoring summary: total alerts + list of alert messages from `cameraAlerts[]`
6. "Start New Interview" button calls `resetInterview()` and navigates back to upload

#### `src/views/admin/results/components/ScoreCard.tsx`
Shows one category: icon, category name, score (e.g. 7.5/10), inline Tailwind progress bar (green ≥80%, yellow ≥60%, red <60%), and feedback text.

---

## 5. Frontend → Backend API Mapping

```
┌────────────────────────────────┐         ┌─────────────────────────────────────┐
│  FRONTEND                      │  HTTP   │  BACKEND                            │
│                                │ ──────> │                                     │
│  ResumeUpload.tsx              │ POST    │  /api/upload-resume                 │
│  (PDF file via FormData)       │         │  → pdfplumber extracts text         │
│                                │         │  → utils.analyze_resume()           │
│                                │ <────── │  ← {questions[], skills[], ...}     │
├────────────────────────────────┤         ├─────────────────────────────────────┤
│  CameraFeed.tsx                │ POST    │  /api/analyze-frame                 │
│  (base64 JPEG every 5s)        │         │  → camera_analysis.analyze_frame()  │
│                                │         │  → OpenCV DNN detection             │
│                                │ <────── │  ← {face_count, suspicion[], ...}   │
├────────────────────────────────┤         ├─────────────────────────────────────┤
│  results/index.tsx             │ POST    │  /api/generate-results              │
│  (Q&A pairs JSON)              │         │  → utils.generate_overall_results() │
│                                │         │  → Ollama Llama 3.1 scoring         │
│                                │ <────── │  ← [{category, score, feedback}×5]  │
└────────────────────────────────┘         └─────────────────────────────────────┘
```

---

## 6. Data Flow — Full Interview Session

```
1. User uploads PDF
   └─ ResumeUpload.tsx  →  POST /api/upload-resume
      └─ pdfplumber extracts text
         └─ Ollama analyzes: validates resume, extracts skills, generates 7-8 questions
            └─ Response saved to InterviewContext

2. User answers questions
   └─ QuestionItem.tsx stores answers in InterviewContext.answers{}
   └─ CameraFeed.tsx sends frame every 5s → /api/analyze-frame
      └─ Camera alerts stored in InterviewContext.cameraAlerts[]

3. User submits
   └─ submitInterview() sets currentStep = "results"
      └─ React router navigates to /admin/results

4. Results page loads
   └─ useEffect fires → POST /api/generate-results with all Q&A pairs
      └─ Ollama scores each answer vs ideal (strict scoring: 0-2 for gibberish)
         └─ 5 category scores returned
            └─ Displayed as ScoreCards + proctoring summary
```

---

## 7. How to Run

### Start Backend
```bash
cd Backend
& "$env:LOCALAPPDATA\Microsoft\WindowsApps\python3.exe" -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Start Frontend
```bash
cd horizon-tailwind-react-ts
npm start
```

### Ollama (must be running separately)
```bash
ollama serve
ollama pull llama3.1
```

### URLs
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (auto) | http://localhost:8000/docs |
| Ollama | http://localhost:11434 |

---

## 8. Important Known Details

| Topic | Detail |
|-------|--------|
| Ollama speed | Llama 3.1 takes 30–90 seconds per inference on CPU. The frontend shows progress stages and loading spinners. |
| DNN model auto-download | On first backend run, `camera_analysis.py` downloads 2 small files (`deploy.prototxt` + `res10_300x300_ssd_iter_140000.caffemodel`) into the `Backend/` folder. This happens once. |
| Python version | Must use Windows Store Python 3.13 (`$env:LOCALAPPDATA\Microsoft\WindowsApps\python3.exe`). The system `python` (msys64) does NOT have the required packages. |
| MediaPipe | Not used — does not support Python 3.13. OpenCV DNN is used instead. |
| CORS | Backend allows all origins (`*`) for local development. |
| Scoring fairness | Gibberish / one-word answers score 0–2. The model is explicitly told to be strict and compare answers to an internally generated ideal answer. |
