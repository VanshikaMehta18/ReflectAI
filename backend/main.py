from fastapi import FastAPI
from pydantic import BaseModel
import ollama
from fastapi.middleware.cors import CORSMiddleware
from typing import List

app = FastAPI()

origins = [
    "*"  # Allow all origins
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows your frontend to connect
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class ChatMessage(BaseModel):
    message: str

class JournalEntry(BaseModel):
    content: str

class StoredJournalEntry(BaseModel):
    content: str
    sentiment: str

# In-memory database
journal_entries: List[StoredJournalEntry] = []

def analyze_sentiment(text: str) -> str:
    try:
        response = ollama.chat(
            model='phi3',
            messages=[
                {
                    'role': 'system',
                    'content': 'You are a sentiment analysis expert. Analyze the following text and respond with only a single word: Positive, Negative, or Neutral.',
                },
                {
                    'role': 'user',
                    'content': text,
                },
            ],
        )
        sentiment = response['message']['content'].strip()
        # Basic validation
        if sentiment in ["Positive", "Negative", "Neutral"]:
            return sentiment
        return "Neutral" # Fallback if model responds incorrectly
    except Exception as e:
        print(f"Error analyzing sentiment: {e}")
        return "Neutral" # Fallback on error

@app.post("/chat")
def chat_with_ai(chat_message: ChatMessage):
    # First, analyze and store the user's message for analytics
    sentiment = analyze_sentiment(chat_message.message)
    stored_entry = StoredJournalEntry(content=chat_message.message, sentiment=sentiment)
    journal_entries.append(stored_entry)

    try:
        response = ollama.chat(
            model='phi3',
            messages=[
                {
                    'role': 'system',
                    'content': 'You are ReflectAI, an empathetic AI companion. Your role is to listen, reflect, and ask gentle, open-ended questions. Avoid giving advice. Your tone should be warm, encouraging, and safe.',
                },
                {
                    'role': 'user',
                    'content': chat_message.message,
                },
            ],
        )
        ai_response = response['message']['content']
        return {"response": ai_response}
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return {"response": "I'm here to listen. Tell me more."} # Fallback response

@app.get("/prompt")
def get_daily_prompt():
    try:
        response = ollama.chat(
            model='phi3',
            messages=[
                {
                    'role': 'user',
                    'content': 'Generate a short, single-sentence reflection prompt for a daily journal.',
                },
            ],
        )
        prompt = response['message']['content']
        return {"prompt": prompt}
    except Exception as e:
        print(f"Error getting prompt from Ollama: {e}")
        return {"prompt": "What was the highlight of your day?"} # Fallback prompt

@app.get("/")
def read_root():
    return {"Hello": "MindMirror Backend"}

@app.post("/journal")
def create_journal_entry(entry: JournalEntry):
    sentiment = analyze_sentiment(entry.content)
    stored_entry = StoredJournalEntry(content=entry.content, sentiment=sentiment)
    journal_entries.append(stored_entry)
    return {"message": "Journal entry saved successfully.", "entry": stored_entry}

@app.get("/journal")
def get_journal_entries():
    return {"entries": journal_entries}
