# 🤖 Automated AI Interviewer

An intelligent, resume-driven interview platform that categorizes candidates using a **1D CNN model** and generates role-specific interview questions — built as a university project.

![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.1-38B2AC?logo=tailwindcss&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-4.7-3178C6?logo=typescript&logoColor=white)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Team](#team)

---

## Overview

The **Automated AI Interviewer** streamlines the hiring process by:

1. **Accepting** a candidate's resume (PDF upload)
2. **Classifying** the resume into a job category using a trained 1D CNN
3. **Generating** role-specific interview questions
4. **Collecting** candidate answers in a clean, chat-like interface
5. **Scoring** responses and providing actionable feedback

> **Note:** The CNN model is currently mocked with a placeholder function. The real `.h5` model will be integrated once training is complete.

---

## Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│                      │  POST   │                      │
│   React Frontend     │────────▶│   FastAPI Backend     │
│   (Horizon UI)       │◀────────│   (Python)            │
│                      │  JSON   │                      │
│  • Upload View       │         │  • PDF Text Extract   │
│  • Interview View    │         │  • CNN Classifier     │
│  • Results View      │         │  • Question Bank      │
│                      │         │                      │
└──────────────────────┘         └──────────────────────┘
        :3000                            :8000
```

---

## Features

| Feature | Status |
|---------|--------|
| Drag & drop PDF upload | ✅ Done |
| PDF text extraction (pdfplumber) | ✅ Done |
| Mock CNN resume classifier | ✅ Done |
| Role-specific question generation | ✅ Done |
| Interview Q&A interface | ✅ Done |
| Anti-paste protection on answers | ✅ Done |
| Scoring & feedback dashboard | ✅ Done |
| Dark mode support | ✅ Done |
| Real CNN model (.h5) integration | 🔜 Pending |
| LLM-powered dynamic questions | 🔜 Pending |

---

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS 3** for styling
- **Horizon UI** design system (Card, Widget, Progress components)
- **React Router v6** for navigation

### Backend
- **FastAPI** — async Python REST API
- **pdfplumber** — PDF text extraction
- **Uvicorn** — ASGI server
- **1D CNN** (TensorFlow/Keras) — resume classification *(pending)*

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- pip

### 1. Clone the repository

```bash
git clone https://github.com/TheVantaDev/Automated_Interview.git
cd Automated_Interview
```

### 2. Start the Backend

```bash
cd Backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 3. Start the Frontend

```bash
cd horizon-tailwind-react-ts
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Reference

### `POST /api/upload-resume`

Upload a PDF resume for analysis.

**Request:** `multipart/form-data` with a `file` field (PDF only)

**Response:**
```json
{
  "filename": "john_doe_resume.pdf",
  "predicted_category": "Software Engineer",
  "resume_snippet": "John Doe — 5 years experience in...",
  "questions": [
    {
      "id": 1,
      "category": "Technical",
      "question": "Can you walk us through a recent project..."
    }
  ]
}
```

### `GET /api/health`

Health check endpoint.

```json
{ "status": "ok", "message": "AI Interviewer backend is running" }
```

---

## Project Structure

```
Automated_Interview/
├── Backend/
│   ├── main.py              # FastAPI app, endpoints, mock CNN
│   └── requirements.txt     # Python dependencies
│
├── horizon-tailwind-react-ts/
│   └── src/
│       ├── contexts/
│       │   └── InterviewContext.tsx    # Global state management
│       ├── views/admin/
│       │   ├── default/               # Upload view
│       │   ├── interview/             # Q&A interface
│       │   └── results/               # Scoring dashboard
│       ├── components/                # Horizon UI components
│       ├── routes.tsx                 # App routing
│       └── App.tsx                    # Root component
│
└── README.md
```

---

## Roadmap

- [x] Project scaffolding & UI design
- [x] FastAPI backend with PDF extraction
- [x] Mock CNN prediction pipeline
- [x] Frontend ↔ Backend integration
- [ ] Train & integrate real 1D CNN model (`.h5`)
- [ ] LLM-powered dynamic question generation
- [ ] Answer evaluation via NLP scoring
- [ ] Export interview report as PDF
- [ ] Multi-candidate session management

---

## Team

Built by **TheVantaDev** — University Project, 2026.

---

<p align="center">
  <sub>Built with ❤️ using React, FastAPI, and a lot of coffee.</sub>
</p>
