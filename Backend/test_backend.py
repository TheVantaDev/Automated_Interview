import os
from utils import analyze_resume, score_answer
from dotenv import load_dotenv

load_dotenv()

def test_flow():
    # 1. Sample Resume Text
    resume_text = """
    Software Engineer with 5 years of experience in Python, FastAPI, and Docker.
    Developed scalable backend systems and integrated various third-party APIs.
    Strong understanding of machine learning and NLP.
    """
    
    print("--- 1. Testing Resume Analysis (Validation, Skills, Questions) ---")
    analysis = analyze_resume(resume_text)
    
    is_valid = analysis.get("is_valid", False)
    print(f"Is Valid Resume: {is_valid}")
    
    skills = analysis.get("skills", [])
    print(f"Extracted Skills: {skills}")
    
    print("\n--- 2. Testing Question Generation ---")
    questions = analysis.get("questions", [])
    for q in questions:
        print(f"[{q.get('category', 'Unknown')}] Q: {q.get('question', '')}")
        
    print("\n--- 3. Testing Answer Scoring ---")
    if questions:
        question = questions[0].get('question', 'What is your experience?')
        answer = "I have extensive experience with FastAPI, building multiple production-grade APIs with it."
        print(f"Question: {question}")
        print(f"Answer: {answer}")
        
        feedback = score_answer(question, answer)
        print(f"Score: {feedback.get('score')}/10")
        print(f"Feedback: {feedback.get('feedback')}")
    else:
        print("No questions were generated.")

if __name__ == "__main__":
    test_flow()
