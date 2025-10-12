# MindMirror — An AI Cognitive Reflection Coach

**Tagline:** “Your AI companion for journaling, reflection, and emotional awareness — powered by safe, empathetic dialogue.”

## 🌍 Problem

Mental well-being often deteriorates due to lack of reflection, journaling, or unbiased listening. However, most AI “therapy bots” risk unsafe or unregulated advice.

## 💡 Solution

MindMirror uses Phi-3 + NeMo Guardrails to power guided reflection sessions.
The model asks structured reflection prompts, listens empathetically (via Whisper), and analyzes sentiment — all while enforcing ethical boundaries via Guardrails (e.g., never making medical claims or unsafe suggestions).

## ⚙️ Tech Stack

- **LLM:** Phi-3 (via Ollama / Together API)
- **Safety:** NeMo Guardrails (custom rails for emotional safety + redirection)
- **Voice Stack:** Whisper + Bark for STT/TTS
- **Frontend:** React
- **Backend:** FastAPI
- **Analytics:** Streamlit dashboard for emotional trend visualization

## ✨ Features

- Daily summaries & “Mood Timeline” tracking

## 🌐 Outcome

A live web app that feels like a guided mental coach — reflective, emotionally intelligent, and strictly compliant.

**Focus:** ethical emotional AI, responsible human-AI conversation design.
