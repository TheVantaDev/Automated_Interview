import os
import tempfile
from typing import List, Dict

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
from pydantic import BaseModel

from utils import extract_skills, generate_interview_questions, score_answer, generate_overall_results

app = FastAPI(title="AI Interviewer Backend")

# allow more origins or just any for local dev to avoid "Failed to fetch" browser issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnswerSubmission(BaseModel):
    question: str
    answer: str
    category: str = "Technical"

class OverallResultsRequest(BaseModel):
    interview_data: List[Dict] # list of {question, answer, category}

def extract_text_from_pdf(file_path: str) -> str:
    """Pull all readable text out of every page of a PDF."""
    full_text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
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
        print(f"DEBUG: Extracted {len(extracted_resume_text)} characters from PDF")

        if not extracted_resume_text:
            raise HTTPException(
                status_code=422,
                detail="Could not extract any text from this PDF. Is it image-based?",
            )

        # 1. Extract Skills using the spaCy model
        print("DEBUG: Extracting skills...")
        skills = extract_skills(extracted_resume_text)
        print(f"DEBUG: Extracted {len(skills)} skills")

        # 2. Generate specialized questions using LLM
        print("DEBUG: Generating questions...")
        interview_questions = generate_interview_questions(skills, extracted_resume_text)
        print(f"DEBUG: Generated {len(interview_questions)} questions")

        # predicted category is based on top skill/extraction
        predicted_cat = skills[0] if (skills and len(skills) > 0) else "General Candidate"

        return {
            "filename": file.filename,
            "predicted_category": predicted_cat,
            "resume_snippet": extracted_resume_text[:500],  # snippets for UI
            "questions": interview_questions,
        }



    finally:
        # clean up the temp file regardless of success/failure
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

# ---------------------------------------------------------------------------
# Scoring endpoints
# ---------------------------------------------------------------------------

@app.post("/api/score-answer")
async def evaluate_answer(submission: AnswerSubmission):
    feedback_data = score_answer(submission.question, submission.answer)
    return feedback_data

@app.post("/api/generate-results")
async def get_overall_results(request: OverallResultsRequest):
    results = generate_overall_results(request.interview_data)
    return {"results": results}

# ---------------------------------------------------------------------------
# Health check – nice to have for debugging
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "AI Interviewer backend is running"}

