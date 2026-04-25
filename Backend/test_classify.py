import ollama

prompt = """You are a document classifier. Your ONLY job is to decide if the document below is a professional resume or CV.

A resume/CV typically contains:
- A person's name and contact information
- Work experience / employment history
- Education background
- Skills section
- Projects or certifications

A NON-resume is anything else: essays, articles, random text, invoices, legal documents, stories, etc.

Document (first 2000 characters):
John Doe
john.doe@email.com | +1-555-123-4567

EXPERIENCE
Software Engineer at Google (2020-2023)
- Built scalable microservices using Python and Go

EDUCATION
B.S. Computer Science, MIT, 2019

SKILLS
Python, JavaScript, React, SQL, Docker

Respond with ONLY one word: YES if it is a resume/CV, or NO if it is not. Do not add any explanation."""

response = ollama.chat(model='llama3.1', messages=[{'role': 'user', 'content': prompt}])
raw = response['message']['content'].strip()
print(f"Raw response: >>>{raw}<<<")
print(f"Upper: >>>{raw.upper()}<<<")
print(f"Starts with YES: {raw.upper().startswith('YES')}")
