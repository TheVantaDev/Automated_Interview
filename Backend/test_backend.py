import os
from utils import extract_skills, generate_interview_questions, score_answer
from dotenv import load_dotenv

load_dotenv()

def test_flow():
    # 1. Sample Resume Text
    resume_text = """
    Software Engineer with 5 years of experience in Python, FastAPI, and Docker.
    Developed scalable backend systems and integrated various third-party APIs.
    Strong understanding of machine learning and NLP.
    """
    
    print("--- 1. Testing Skill Extraction ---")
    skills = extract_skills(resume_text)
    print(f"Extracted Skills: {skills}")
    
    if not skills:
        print("Wait, no skills found? (This might be because the model is still downloading!)")
    
    print("\n--- 2. Testing Question Generation ---")
    questions = generate_interview_questions(skills, resume_text)
    for q in questions:
        print(f"[{q['category']}] Q: {q['question']}")
        
    print("\n--- 3. Testing Answer Scoring ---")
    question = questions[0]['question']
    answer = "I have extensive experience with FastAPI, building multiple production-grade APIs with it."
    print(f"Question: {question}")
    print(f"Answer: {answer}")
    
    feedback = score_answer(question, answer)
    print(f"Score: {feedback.get('score')}/10")
    print(f"Feedback: {feedback.get('feedback')}")

if __name__ == "__main__":
    test_flow()
