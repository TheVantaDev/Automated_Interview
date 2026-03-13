import os
import asyncio
import tempfile
from typing import List, Dict

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
from pydantic import BaseModel

from utils import analyze_resume, score_answer

app = FastAPI(title="AI Interviewer Backend")

# allow the React dev server to talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnswerSubmission(BaseModel):
    question: str
    answer: str

def extract_text_from_pdf(file_path: str) -> str:
    """Pull all readable text out of every page of a PDF."""
    full_text: str = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text: str = page.extract_text() or ""
            if page_text:
                full_text += page_text + "\n"
    return full_text.strip()

# ---------------------------------------------------------------------------
# Main endpoint – accepts a resume PDF upload
# ---------------------------------------------------------------------------

@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    # basic guard: only PDFs allowed
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a PDF.",
        )

    # save to a temp file so pdfplumber can read it from disk
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        extracted_resume_text = extract_text_from_pdf(tmp_path)

        if not extracted_resume_text:
            raise HTTPException(
                status_code=422,
                detail="Could not extract any text from this PDF. Is it image-based?",
            )

        # 0. Analyze Resume (Validation, Skills, Questions in one API call)
        # Run in thread executor because Ollama is synchronous and takes 30-60s
        loop = asyncio.get_event_loop()
        analysis_result = await loop.run_in_executor(None, analyze_resume, extracted_resume_text)

        if not analysis_result.get("is_valid", True):
            raise HTTPException(
                status_code=400,
                detail="This document does not appear to be a sequence of professional skills or a resume. Please upload a valid resume.",
            )

        skills = analysis_result.get("skills", [])
        interview_questions = analysis_result.get("questions", [])

        return {
            "filename": file.filename,
            "skills_extracted": skills,
            "resume_context": extracted_resume_text[:1000],  # snippets for UI
            "questions": interview_questions,
        }

    finally:
        # clean up the temp file regardless of success/failure
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

# ---------------------------------------------------------------------------
# Scoring endpoint – evaluates user answer
# ---------------------------------------------------------------------------

@app.post("/api/score-answer")
async def evaluate_answer(submission: AnswerSubmission):
    # Run in thread executor because Ollama is synchronous and takes 30-60s
    loop = asyncio.get_event_loop()
    feedback_data = await loop.run_in_executor(None, score_answer, submission.question, submission.answer)
    return feedback_data

# ---------------------------------------------------------------------------
# Health check – nice to have for debugging
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "AI Interviewer backend is running"}
