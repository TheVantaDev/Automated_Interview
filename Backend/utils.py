import re
import json
from typing import List
import ollama

MODEL_NAME = 'llama3.1'


# ─── JSON helpers ─────────────────────────────────────────────────────────────

def _extract_json_array(text: str):
    """Extract the first JSON array from a block of text, even if wrapped."""
    # Try a direct parse first
    try:
        parsed = json.loads(text.strip())
        if isinstance(parsed, list):
            return parsed
        # Ollama sometimes wraps array in {"results": [...]} or similar
        for v in parsed.values():
            if isinstance(v, list) and len(v) > 0:
                return v
    except Exception:
        pass
    # Find raw array with regex
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    return None


def _extract_json_object(text: str):
    """Extract the first JSON object from a block of text."""
    try:
        return json.loads(text.strip())
    except Exception:
        pass
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    return None


def _chat(prompt: str) -> str:
    """Send a prompt to Ollama and return raw text content."""
    response = ollama.chat(
        model=MODEL_NAME,
        messages=[{'role': 'user', 'content': prompt}],
    )
    return response['message']['content'].strip()


# ─── Resume analysis ──────────────────────────────────────────────────────────

def analyze_resume(text: str) -> dict:
    """Validate resume, extract skills, generate 7-8 tailored interview questions."""
    prompt = f"""You are an expert technical recruiter and interviewer.
Analyze the document below and return ONLY a JSON object (no markdown, no explanation).

Tasks:
1. Decide if this is a valid professional resume/CV/LinkedIn profile.
2. Extract a list of professional skills.
3. Generate exactly 7-8 interview questions tailored to the candidate's background.
   Use a mix of: Technical, Problem-Solving, System Design, Behavioral, Situational, Leadership, Communication.

Document:
{text[:3000]}

Return this exact JSON structure:
{{
  "is_valid": true,
  "skills": ["Skill1", "Skill2"],
  "questions": [
    {{"id": 1, "category": "Technical", "question": "..."}},
    {{"id": 2, "category": "Behavioral", "question": "..."}},
    {{"id": 3, "category": "Problem-Solving", "question": "..."}},
    {{"id": 4, "category": "System Design", "question": "..."}},
    {{"id": 5, "category": "Situational", "question": "..."}},
    {{"id": 6, "category": "Leadership", "question": "..."}},
    {{"id": 7, "category": "Communication", "question": "..."}},
    {{"id": 8, "category": "Technical", "question": "..."}}
  ]
}}"""
    try:
        raw = _chat(prompt)
        print(f"[analyze_resume] raw: {raw[:200]}")
        parsed = _extract_json_object(raw)
        if parsed and "questions" in parsed:
            return parsed
    except Exception as e:
        print(f"[analyze_resume] error: {e}")
    return _fallback_resume()


def _fallback_resume() -> dict:
    return {
        "is_valid": True,
        "skills": ["Communication", "Problem Solving", "Teamwork"],
        "questions": [
            {"id": 1, "category": "Technical",       "question": "Walk me through your most significant project."},
            {"id": 2, "category": "Behavioral",      "question": "Describe a time you overcame a major technical challenge."},
            {"id": 3, "category": "Problem-Solving", "question": "How do you approach debugging a system you're unfamiliar with?"},
            {"id": 4, "category": "System Design",   "question": "How would you design a scalable URL shortening service?"},
            {"id": 5, "category": "Situational",     "question": "If a critical bug is reported 30 minutes before a release, what do you do?"},
            {"id": 6, "category": "Leadership",      "question": "Tell me about a time you led a team through an ambiguous situation."},
            {"id": 7, "category": "Communication",   "question": "How do you explain technical decisions to non-technical stakeholders?"},
            {"id": 8, "category": "Technical",       "question": "What is the most complex algorithm or data structure you have implemented?"},
        ]
    }


# ─── Per-answer scoring (used by /api/score-answer if needed) ─────────────────

def score_answer(question: str, user_answer: str) -> dict:
    """Score a single answer by comparing it to an ideal answer."""
    fallback = {"score": 0.0, "feedback": "Could not evaluate — no response provided."}
    if not user_answer or not user_answer.strip() or user_answer.strip().lower() in ["no answer provided.", "no answer provided"]:
        return {"score": 0.0, "feedback": "No answer was provided for this question."}

    prompt = f"""You are a strict technical interviewer.

Question: {question}
Candidate's Answer: {user_answer}

Step 1: Think of what an ideal, expert-level answer to this question would include.
Step 2: Compare the candidate's answer to that ideal.
Step 3: Assign a score from 0 to 10 using these rules:
  - 0-2: Gibberish, random text, completely irrelevant, or blank.
  - 3-4: Vague, off-topic, shows almost no understanding.
  - 5-6: Partially correct but missing key details or depth.
  - 7-8: Solid and relevant, demonstrates clear knowledge.
  - 9-10: Excellent, expert-level, comprehensive.

Return ONLY this JSON (no markdown):
{{"score": <number 0-10>, "feedback": "<one sentence explaining the score>"}}"""
    try:
        raw = _chat(prompt)
        print(f"[score_answer] raw: {raw[:200]}")
        parsed = _extract_json_object(raw)
        if parsed and "score" in parsed:
            return parsed
    except Exception as e:
        print(f"[score_answer] error: {e}")
    return fallback


# ─── Overall results (compare-to-ideal approach) ─────────────────────────────

def generate_overall_results(qa_pairs: List[dict]) -> List[dict]:
    """
    Score all Q&A pairs using a two-step compare-to-ideal approach.
    Returns a list of 5 category scores.
    """
    # Neutral fallback — clearly shows evaluation failed, not a fake good score
    neutral_fallback = [
        {"category": "Technical Skills", "score": 3.0, "maxScore": 10, "feedback": "Evaluation could not complete. Answers were too short or unclear to assess properly."},
        {"category": "Problem Solving",  "score": 3.0, "maxScore": 10, "feedback": "Evaluation could not complete. Answers were too short or unclear to assess properly."},
        {"category": "System Design",    "score": 3.0, "maxScore": 10, "feedback": "Evaluation could not complete. Answers were too short or unclear to assess properly."},
        {"category": "Communication",    "score": 3.0, "maxScore": 10, "feedback": "Evaluation could not complete. Answers were too short or unclear to assess properly."},
        {"category": "Cultural Fit",     "score": 3.0, "maxScore": 10, "feedback": "Evaluation could not complete. Answers were too short or unclear to assess properly."},
    ]

    # Format Q&A for the prompt
    qa_text = ""
    for i, qa in enumerate(qa_pairs, 1):
        qa_text += f"\nQ{i} [{qa.get('category','General')}]: {qa.get('question','')}\n"
        qa_text += f"Candidate's Answer: {qa.get('answer', 'No answer provided.')}\n"

    prompt = f"""You are a STRICT technical interview evaluator. Your job is to be honest and critical.

SCORING RULES (follow strictly):
- 0-2  → Gibberish, random text, completely irrelevant, blank, or "okay okay" type filler.
- 3-4  → Vague, shows almost no understanding of the topic.
- 5-6  → Partially correct but missing key details.
- 7-8  → Solid, relevant, demonstrates clear knowledge.
- 9-10 → Expert-level, comprehensive, impressive answer.

SHORT OR VAGUE ANSWERS MUST SCORE 0-4. Do not be generous.

Interview Q&A to evaluate:
{qa_text[:3500]}

For each of the 5 categories below, review the relevant answers and give a score.
Scores MUST reflect actual answer quality — if answers are weak, scores must be low.

Return ONLY a valid JSON array (no markdown, no explanation outside the array):
[
  {{"category": "Technical Skills", "score": <0-10>, "maxScore": 10, "feedback": "<specific reason for the score>"}},
  {{"category": "Problem Solving",  "score": <0-10>, "maxScore": 10, "feedback": "<specific reason>"}},
  {{"category": "System Design",    "score": <0-10>, "maxScore": 10, "feedback": "<specific reason>"}},
  {{"category": "Communication",    "score": <0-10>, "maxScore": 10, "feedback": "<specific reason>"}},
  {{"category": "Cultural Fit",     "score": <0-10>, "maxScore": 10, "feedback": "<specific reason>"}}
]"""

    try:
        raw = _chat(prompt)
        print(f"[generate_overall_results] raw ({len(raw)} chars): {raw[:400]}")
        parsed = _extract_json_array(raw)
        if parsed and len(parsed) >= 5:
            # Validate each item has required fields
            valid = all("category" in item and "score" in item for item in parsed)
            if valid:
                # Ensure maxScore is present
                for item in parsed:
                    item["maxScore"] = 10
                return parsed
        print("[generate_overall_results] Could not extract valid array, using fallback")
    except Exception as e:
        print(f"[generate_overall_results] error: {e}")

    return neutral_fallback
