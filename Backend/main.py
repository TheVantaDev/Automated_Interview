import os
import tempfile

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber


app = FastAPI(title="AI Interviewer Backend")

# allow the React dev server to talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Mock CNN prediction – will be swapped for the real .h5 model later
# ---------------------------------------------------------------------------

def get_cnn_prediction(extracted_resume_text: str) -> str:
    """
    Placeholder that simulates the 1D-CNN resume classifier.
    TODO: Load the trained .h5 model from disk and run actual inference.
          Expected input  -> tokenized + padded text vector
          Expected output -> one of N job-category labels
    """
    print("Running text through CNN...")
    print(f"  [mock] received {len(extracted_resume_text)} chars of resume text")

    # hardcoded until the real model is ready
    predicted_category = "Software Engineer"
    return predicted_category


# ---------------------------------------------------------------------------
# Question bank — each category maps to a set of interview questions
# TODO: Replace with LLM-generated questions based on resume content
# ---------------------------------------------------------------------------

QUESTION_BANK = {
    "Software Engineer": [
        {
            "id": 1,
            "category": "Technical",
            "question": (
                "Can you walk us through a recent project where you designed "
                "and built a backend service? What trade-offs did you face?"
            ),
        },
        {
            "id": 2,
            "category": "Problem Solving",
            "question": (
                "Describe a time you had to debug a production outage. "
                "What was your approach and what did you learn?"
            ),
        },
        {
            "id": 3,
            "category": "Behavioral",
            "question": (
                "Tell us about a situation where you disagreed with a "
                "teammate on a technical decision. How did you resolve it?"
            ),
        },
    ],
}

# fallback if the predicted category isn't in our bank yet
DEFAULT_QUESTIONS = [
    {
        "id": 1,
        "category": "General",
        "question": "Tell us about your most impactful project and your role in it.",
    },
    {
        "id": 2,
        "category": "Technical",
        "question": "Explain a complex technical concept from your field in simple terms.",
    },
    {
        "id": 3,
        "category": "Behavioral",
        "question": "Describe how you handle tight deadlines and competing priorities.",
    },
]


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

        if not extracted_resume_text:
            raise HTTPException(
                status_code=422,
                detail="Could not extract any text from this PDF. Is it image-based?",
            )

        # run the (mock) classifier
        predicted_category = get_cnn_prediction(extracted_resume_text)

        # pick questions that match the predicted role
        interview_questions = QUESTION_BANK.get(
            predicted_category, DEFAULT_QUESTIONS
        )

        return {
            "filename": file.filename,
            "predicted_category": predicted_category,
            "resume_snippet": extracted_resume_text[:300],  # first 300 chars for the UI
            "questions": interview_questions,
        }

    finally:
        # clean up the temp file regardless of success/failure
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# ---------------------------------------------------------------------------
# Health check – nice to have for debugging
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "AI Interviewer backend is running"}
