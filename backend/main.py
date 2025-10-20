from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
import ollama
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import List, Dict
import whisper
import os
from bark import SAMPLE_RATE, generate_audio, preload_models
from scipy.io.wavfile import write as write_wav

# Load the Whisper model
# Using the "tiny" model for faster processing. For higher accuracy, you can use "base", "small", "medium", or "large".
# Note: The first time you run this, it will download the model, which might take a few minutes.
whisper_model = whisper.load_model("tiny")

# Preload Bark models
# This will download the Bark models on the first run.
print("Loading Bark models...")
preload_models()
print("Bark models loaded.")


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
chat_history: List[Dict[str, str]] = [
    {
        'role': 'system',
        'content': 'You are ReflectAI, an empathetic AI companion. Your role is to listen, reflect, and ask gentle, open-ended questions. Avoid giving advice. Your tone should be warm, encouraging, and safe.',
    }
]

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

    chat_history.append({'role': 'user', 'content': chat_message.message})

    try:
        # Send the whole conversation history
        response = ollama.chat(
            model='phi3',
            messages=chat_history,
        )
        ai_response = response['message']['content']
        # Add AI response to history
        chat_history.append({'role': 'assistant', 'content': ai_response})
        return {"response": ai_response}
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        # Remove the user's message from history if the call failed
        if chat_history:
            chat_history.pop()
        return {"response": "I'm having a little trouble connecting right now. Could you try again in a moment?"} # Informative fallback

@app.post("/chat/clear")
def clear_chat_history():
    """Clears the in-memory chat history."""
    global chat_history
    chat_history = [
        {
            'role': 'system',
            'content': 'You are ReflectAI, an empathetic AI companion. Your role is to listen, reflect, and ask gentle, open-ended questions. Avoid giving advice. Your tone should be warm, encouraging, and safe.',
        }
    ]
    return {"message": "Chat history cleared successfully."}


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
        return {"prompt": "Having trouble thinking of a prompt right now. How about this: What are you grateful for today?"} # Fallback prompt

@app.get("/")
def read_root():
    return {"Hello": "MindMirror Backend"}

class SynthesisRequest(BaseModel):
    text: str

def cleanup_file(path: str):
    if os.path.exists(path):
        os.remove(path)

@app.post("/synthesize")
async def synthesize_speech(request: SynthesisRequest, background_tasks: BackgroundTasks):
    """Synthesizes speech from text using Bark."""
    try:
        # Generate audio from text
        # Using a history prompt can improve audio quality/consistency
        history_prompt = "en_speaker_6"
        audio_array = generate_audio(request.text, history_prompt=history_prompt)

        # Save audio to a temporary file
        file_path = f"./temp_audio_{os.urandom(8).hex()}.wav"
        write_wav(file_path, SAMPLE_RATE, audio_array)

        # Add a background task to delete the file after sending
        background_tasks.add_task(cleanup_file, file_path)

        return FileResponse(path=file_path, media_type="audio/wav", filename="response.wav")

    except Exception as e:
        print(f"Error during speech synthesis: {e}")
        return {"error": "Failed to synthesize speech."}


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribes audio using Whisper."""
    try:
        # Save the uploaded file temporarily
        file_path = f"./temp_{file.filename}"
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())

        # Transcribe the audio file
        result = whisper_model.transcribe(file_path)
        transcription = result["text"]

        # Clean up the temporary file
        os.remove(file_path)

        return {"transcription": transcription}
    except Exception as e:
        print(f"Error during transcription: {e}")
        # Clean up in case of error
        if os.path.exists(file_path):
            os.remove(file_path)
        return {"error": "Failed to transcribe audio."}

@app.post("/journal")
def create_journal_entry(entry: JournalEntry):
    sentiment = analyze_sentiment(entry.content)
    stored_entry = StoredJournalEntry(content=entry.content, sentiment=sentiment)
    journal_entries.append(stored_entry)
    return {"message": "Journal entry saved successfully.", "entry": stored_entry}

@app.get("/journal")
def get_journal_entries():
    return {"entries": journal_entries}
