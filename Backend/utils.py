import os
import re
import json
from typing import List
import ollama

# Using local Ollama (llama3.1) to bypass API rate limits
MODEL_NAME = 'llama3.1'


def _parse_json(raw: str, default):
    """Strip markdown fences and parse JSON, falling back to default."""
    raw = re.sub(r"^```json", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"^```.*$",  "", raw, flags=re.MULTILINE)
    raw = raw.strip()
    try:
        return json.loads(raw)
    except Exception as e:
        print(f"JSON parse error: {e}")
        return default


def analyze_resume(text: str) -> dict:
    """Validate the resume, extract skills, and generate 7-8 questions — one API call."""
    prompt = f"""
    You are an expert technical recruiter and interviewer.
    Analyze the following document text and perform three tasks:

    1. Determine if the text is a valid professional resume, CV, or LinkedIn profile.
    2. If it is a valid resume, extract a list of professional skills.
    3. Generate exactly 7-8 high-quality interview questions based specifically on the
       extracted skills and experience. Use a rich mix of categories:
       Technical, Problem-Solving, System Design, Behavioral, Situational, Leadership,
       and Communication. Each question should be thoughtful and tailored to the
       candidate's background.

    Document Text:
    {text[:3000]}

    Return the response ONLY as a strictly formatted JSON object:
    {{
        "is_valid": true,
        "skills": ["Skill 1", "Skill 2"],
        "questions": [
            {{"id": 1, "category": "Technical",    "question": "..."}},
            {{"id": 2, "category": "Behavioral",   "question": "..."}},
            {{"id": 3, "category": "Problem-Solving","question": "..."}},
            {{"id": 4, "category": "System Design","question": "..."}},
            {{"id": 5, "category": "Situational",  "question": "..."}},
            {{"id": 6, "category": "Leadership",   "question": "..."}},
            {{"id": 7, "category": "Communication","question": "..."}},
            {{"id": 8, "category": "Technical",    "question": "..."}}
        ]
    }}
    """
    try:
        response = ollama.chat(
            model=MODEL_NAME,
            messages=[{'role': 'user', 'content': prompt}],
            format='json'
        )
        raw = response['message']['content'].strip()
        print(f"Raw Ollama resume response: {raw[:200]}")
        return _parse_json(raw, None) or _fallback_resume()
    except Exception as e:
        print(f"Error analyzing resume via Ollama: {e}")
        return _fallback_resume()


def _fallback_resume() -> dict:
    return {
        "is_valid": True,
        "skills":   ["Communication", "Problem Solving", "Teamwork"],
        "questions": [
            {"id": 1, "category": "Technical",      "question": "Walk me through your most significant project."},
            {"id": 2, "category": "Behavioral",     "question": "Describe a time you overcame a major technical challenge."},
            {"id": 3, "category": "Problem-Solving","question": "How do you approach debugging a system you're unfamiliar with?"},
            {"id": 4, "category": "System Design",  "question": "How would you design a scalable URL shortening service?"},
            {"id": 5, "category": "Situational",    "question": "If a critical production bug is reported 30 minutes before a release, what do you do?"},
            {"id": 6, "category": "Leadership",     "question": "Tell me about a time you led a team through an ambiguous situation."},
            {"id": 7, "category": "Communication",  "question": "How do you explain technical decisions to non-technical stakeholders?"},
            {"id": 8, "category": "Technical",      "question": "What's the most complex data structure or algorithm you've implemented?"},
        ]
    }


def score_answer(question: str, user_answer: str) -> dict:
    """Score the candidate's answer out of 10 and provide brief feedback."""
    fallback = {"score": 7.0, "feedback": "Good response. Add more specific examples to strengthen your answer."}
    prompt = f"""
    You are a technical interviewer evaluator.
    Score the candidate's answer from 0-10 and explain briefly why.

    Question:    {question}
    User Answer: {user_answer}

    Return ONLY JSON: {{"score": <float 0-10>, "feedback": "<one or two sentences>"}}
    """
    try:
        response = ollama.chat(
            model=MODEL_NAME,
            messages=[{'role': 'user', 'content': prompt}],
            format='json'
        )
        raw = response['message']['content'].strip()
        print(f"Raw Ollama score response: {raw[:200]}")
        return _parse_json(raw, fallback) or fallback
    except Exception as e:
        print(f"Error scoring answer via Ollama: {e}")
        return fallback


def generate_overall_results(qa_pairs: List[dict]) -> List[dict]:
    """
    Generate a holistic 5-category assessment from all Q&A pairs.
    qa_pairs: [{"question": str, "answer": str, "category": str}, ...]
    Returns:  [{"category": str, "score": float, "maxScore": 10, "feedback": str}, ...]
    """
    fallback = [
        {"category": "Technical Skills", "score": 7.5, "maxScore": 10, "feedback": "Demonstrates solid foundational knowledge."},
        {"category": "Problem Solving",  "score": 8.0, "maxScore": 10, "feedback": "Clear logical approach to challenges."},
        {"category": "System Design",    "score": 6.5, "maxScore": 10, "feedback": "Good understanding of core architectural principles."},
        {"category": "Communication",    "score": 9.0, "maxScore": 10, "feedback": "Very articulate and clear communicator."},
        {"category": "Cultural Fit",     "score": 8.5, "maxScore": 10, "feedback": "Values align well with collaborative environments."},
    ]

    prompt = f"""
    You are a professional HR and Technical Assessment AI.
    Review the following interview Q&A pairs and produce a summarized assessment
    across exactly 5 categories: Technical Skills, Problem Solving, System Design,
    Communication, and Cultural Fit.

    Interview Data:
    {json.dumps(qa_pairs, indent=2)[:4000]}

    For each category provide a score (0-10) and 1-2 sentences of feedback.
    Return ONLY a JSON array:
    [
        {{"category": "Technical Skills", "score": <float>, "maxScore": 10, "feedback": "<string>"}},
        {{"category": "Problem Solving",  "score": <float>, "maxScore": 10, "feedback": "<string>"}},
        {{"category": "System Design",    "score": <float>, "maxScore": 10, "feedback": "<string>"}},
        {{"category": "Communication",    "score": <float>, "maxScore": 10, "feedback": "<string>"}},
        {{"category": "Cultural Fit",     "score": <float>, "maxScore": 10, "feedback": "<string>"}}
    ]
    """
    try:
        response = ollama.chat(
            model=MODEL_NAME,
            messages=[{'role': 'user', 'content': prompt}],
            format='json'
        )
        raw = response['message']['content'].strip()
        print(f"Raw Ollama overall results: {raw[:300]}")
        parsed = _parse_json(raw, None)
        if parsed and isinstance(parsed, list) and len(parsed) > 0:
            return parsed
    except Exception as e:
        print(f"Error generating overall results via Ollama: {e}")
    return fallback
