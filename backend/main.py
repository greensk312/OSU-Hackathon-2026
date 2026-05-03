# api url: https://canvas-bp7k.onrender.com

import os 
import json
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

class QuizRequest(BaseModel):
    analysis: dict

class FlashcardRequest(BaseModel):
    analysis: dict

class ClassData(BaseModel):
    syllabus_text: str
    assignments: list[dict]
    current_date: str | None = None

@app.get("/ping")
def ping():
    return {"status": "ok"}

@app.post("/generate/quiz")
def generate_quiz(body: QuizRequest):
    prompt = f"""
    You are a quiz generator for a college student. Using the course analysis below, generate a 5 question
    multiple choice quiz. Questions should reflect the current focus and upcoming topics, using the 
    suggested question types and key terms where appropriate. Difficulty should match the mastery level hint.

    Course Analysis:
    {json.dumps(body.analysis, indent=2)}

    Return ONLY a JSON object with exactly this structure:
    {{
        "title": "short descriptive title for this quiz based on the topics covered",
        "mastery_level": "the mastery level hint from the analysis",
        "questions": [
            {{
                "question": "the question text",
                "options": {{
                    "A": "first option",
                    "B": "second option",
                    "C": "third option",
                    "D": "fourth option"
                }},
                "correct_answer": "A",
                "explanation": "brief explanation of why this answer is correct"
            }}
        ]
    }}
    """

    response = model.generate_content(prompt)

    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] 
        raw = raw.rsplit("```", 1)[0]
    quiz = json.loads(raw)


    return quiz
    
@app.post("/generate/flashcards")
def generate_flashcards(body: FlashcardRequest):
    prompt = f"""
    You are a flashcard generator for a college student. Using the course analysis below, generate 10
    flashcards that cover the most important concepts, key terms, and topics the student needs to know.
    Prioritize current focus areas and upcoming topics. Difficulty should match the mastery level hint.

    Course Analysis:
    {json.dumps(body.analysis, indent=2)}

    Return ONLY a JSON object with exactly this structure:
    {{
        "title": "short descriptive title for this flashcard set based on the topics covered",
        "mastery_level": "the mastery level hint from the analysis",
        "flashcards": [
            {{
                "front": "the question, term, or concept",
                "back": "the answer, definition, or explanation",
                "category": "which main category this card belongs to"
            }}
        ]
    }}
    """

    response = model.generate_content(prompt)

    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] 
        raw = raw.rsplit("```", 1)[0]
    flashcards = json.loads(raw)

    return flashcards

@app.post("/analyze/content")
def analyze_content(body: ClassData):
    prompt = f"""
    You are an academic study assistant. Analyze the following course syllabus and assignment list
    to produce a structured study profile for a student that can be used to generate relevant multiple 
    choice quizzes and flashcards to assist the student in their learning for the course. 

    Today's date: {body.current_date or "unknown"}

    Syllabus:
    {body.syllabus_text}

    Assignments (with titles, descriptions, and due dates):
    {json.dumps(body.assignments, indent=2)}

    Return ONLY a JSON object with exactly these fields:
    {{
        "main_categories": ["list of broad topic areas covered in the course"],
        "course_progress_summary": "1-2 paragraphs describing what the student has studied so far and what they are currently learning, informed by assignment due dates",
        "current_focus": "1 paragraph on what the student should be focusing on right now given upcoming due dates",
        "upcoming_topics": ["short list of topics or concepts coming up soon based on due dates"],
        "key_terms": ["important vocabulary, formulas, or named concepts that are central to the course"],
        "suggested_question_types": ["types of questions that suit this material, e.g. conceptual, proof-based, application, definition"],
        "mastery_level_hint": "one of: foundational, developing, advanced — based on where the student is in the course"
    }}
    """

    response = model.generate_content(prompt)

    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] 
        raw = raw.rsplit("```", 1)[0]
    analysis = json.loads(raw)

    return analysis