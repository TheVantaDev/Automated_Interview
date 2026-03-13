import os
from typing import List
import json
import ollama

# We are using local Ollama (llama3.1) to completely bypass API rate limits
MODEL_NAME = 'llama3.1'

def analyze_resume(text: str) -> dict:
    """Analyze the resume text to validate, extract skills, and generate questions in a single API call."""
    prompt = f"""
    You are an expert technical recruiter and interviewer.
    Analyze the following document text and perform three tasks:
    
    1. Determine if the text is a valid professional resume, CV, or LinkedIn profile.
    2. If it is a valid resume, extract a list of professional skills.
    3. Generate 3-5 high-quality interview questions based specifically on the extracted skills and context. The questions should be a mix of technical, problem-solving, and behavioral.
    
    Document Text: 
    {text[:3000]}
    
    Return the response ONLY as a strictly formatted JSON object with the following schema:
    {{
        "is_valid": true/false,
        "skills": ["Skill 1", "Skill 2"],
        "questions": [
            {{"id": 1, "category": "Technical", "question": "..."}},
            {{"id": 2, "category": "Behavioral", "question": "..."}}
        ]
    }}
    """
    
    try:
        response = ollama.chat(
            model=MODEL_NAME,
            messages=[{'role': 'user', 'content': prompt}],
            format='json'
        )
        
        raw_text = response['message']['content'].strip()
        # Log the raw text so we know what's failing if it fails
        print(f"Raw Ollama Response: {raw_text}")
        
        # Sometimes small local models output markdown ticks around the json
        import re
        raw_text = re.sub(r"^```json", "", raw_text, flags=re.MULTILINE)
        raw_text = re.sub(r"^```(.*)$", "", raw_text, flags=re.MULTILINE)
        raw_text = raw_text.strip()
        
        return json.loads(raw_text)
    except Exception as e:
        print(f"Error analyzing resume via Ollama: {e}")
        return {
            "is_valid": True,  # Fallback to true to not block the flow
            "skills": ["Communication", "Problem Solving", "Teamwork"],
            "questions": [
                {"id": 1, "category": "General", "question": "Walk me through your most significant project."},
                {"id": 2, "category": "Behavioral", "question": "Describe a time you overcame a technical challenge."}
            ]
        }

def score_answer(question: str, user_answer: str) -> dict:
    """Score the user's answer and provide feedback."""
    prompt = f"""
    You are a technical interviewer evaluator. Compare the user's answer to the question and provide a score from 0-10 and brief feedback.
    
    Question: {question}
    User Answer: {user_answer}
    
    Return JSON: {{"score": float, "feedback": string}}
    """
    try:
        response = ollama.chat(
            model=MODEL_NAME,
            messages=[{'role': 'user', 'content': prompt}],
            format='json'
        )
        raw_text = response['message']['content'].strip()
        print(f"Raw Ollama Score Response: {raw_text}")
        
        import re
        raw_text = re.sub(r"^```json", "", raw_text, flags=re.MULTILINE)
        raw_text = re.sub(r"^```(.*)$", "", raw_text, flags=re.MULTILINE)
        raw_text = raw_text.strip()
        
        return json.loads(raw_text)
    except Exception as e:
        print(f"Error scoring answer via Ollama: {e}")
    
    return {"score": 5.0, "feedback": "Could not generate automated feedback."}
