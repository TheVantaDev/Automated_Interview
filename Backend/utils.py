import os
from typing import List
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure LLM
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model_llm = genai.GenerativeModel('gemini-1.5-flash')

# Load the model locally - REMOVED spacy due to build issues on Windows/Python 3.13
# We will use Gemini 1.5 Flash for extraction instead, which is more robust.

def extract_skills(text: str) -> List[str]:
    """Extract skills from text using Gemini 1.5 Flash."""
    prompt = f"""
    Extract a list of professional skills from the following resume text.
    Return ONLY a comma-separated list of skills. No other text.
    
    Resume:
    {text[:2000]}
    """
    try:
        response = model_llm.generate_content(prompt)
        skills = [s.strip() for s in response.text.split(',') if s.strip()]
        return skills
    except Exception as e:
        print(f"Error extracting skills: {e}")
        return []

def generate_interview_questions(skills: List[str], resume_context: str) -> List[dict]:
    """Generate personalized interview questions based on skills and resume."""
    prompt = f"""
    You are an expert technical interviewer. Based on the following extracted skills and resume context, 
    generate 3-5 high-quality interview questions. 
    The questions should be a mix of technical, problem-solving, and behavioral.
    
    Skills: {', '.join(skills)}
    
    Resume Context: 
    {resume_context[:2000]}
    
    Return the response as a JSON list of objects with the following keys:
    'id' (int), 'category' (Technical/Problem Solving/Behavioral), 'question' (string).
    """
    
    try:
        response = model_llm.generate_content(prompt)
        # In a real scenario, you'd parse this JSON. For now, let's keep it simple or use a structured output if available.
        # For simplicity in this demo, I'll return a basic structure if parsing fails.
        import json
        import re
        
        # Try to find JSON in the response
        match = re.search(r'\[.*\]', response.text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        print(f"Error generating questions: {e}")
    
    return [
        {"id": 1, "category": "General", "question": "Walk me through your most significant project."},
        {"id": 2, "category": "Technical", "question": f"How have you applied your skills in {skills[0] if skills else 'your field'}?"},
        {"id": 3, "category": "Behavioral", "question": "Describe a time you overcame a technical challenge."}
    ]

def score_answer(question: str, user_answer: str) -> dict:
    """Score the user's answer and provide feedback."""
    prompt = f"""
    You are a technical interviewer evaluator. Compare the user's answer to the question and provide a score from 0-10 and brief feedback.
    
    Question: {question}
    User Answer: {user_answer}
    
    Return JSON: {{"score": float, "feedback": string}}
    """
    try:
        response = model_llm.generate_content(prompt)
        import json
        import re
        match = re.search(r'\{.*\}', response.text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        print(f"Error scoring answer: {e}")
    
    return {"score": 5.0, "feedback": "Could not generate automated feedback."}
