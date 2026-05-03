# api url: https://canvas-bp7k.onrender.com

import os 
import json
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

apiKey = os.getenv("GEMINI_API")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

genai.configure(api_key=os.getenv("GEMINI_API"))
model = genai.GenerativeModel("gemini-1.5-flash")

class PromptRequest(BaseModel):
    prompt: str

class ClassData(BaseModel):
    syllabus_text: str
    assignments: list[dict]
    current_date: str | None = None

@app.get("/ping")
def ping():
    return {"status": "ok"}

@app.post("/generate/quiz")
def generate_quiz(body: PromptRequest):
    prompt = f"""

    """

    response = model.generate_content(prompt)
    quiz = json.loads(response.text)
    return quiz
    
@app.post("/generate/flashcards")
def generate_flashcards(body: PromptRequest):
    prompt = f"""

    """

    response = model.generate_content(prompt)
    flashcards = json.loads(response.text)
    return flashcards

@app.post("/analyze/content")
def analyze_content(body: ClassData):
    prompt = f"""

    """

    response = model.generate_content(prompt)
    analysis = json.loads(response.text)
    return analysis