import re
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from backend.rag.retriever import retrieve_context
from backend.models.gemini_llm import generate_answer
from backend.models.jee_neet_prompt import build_prompt
from backend.utils.query_rewriter import rewrite_followup_question
from backend.utils.database import ChatHistoryDB, UserAnalyticsDB
from backend.utils.auth import get_current_user

router = APIRouter()

HISTORY_WINDOW = 12

# ── Helpers ────────────────────────────────────────────────────────────────────

def _extract_topic(text: str) -> tuple[str, str]:
    """Parse ### 📖 Concept line from LLM response → (topic, subject)."""
    match = re.search(r"###.*?Concept[^\n]*\n+([^\n#]+)", text)
    topic = match.group(1).strip()[:120] if match else "General"
    subject = "General"
    for s in ["Physics", "Chemistry", "Biology", "Mathematics", "Math"]:
        if s.lower() in topic.lower():
            subject = "Mathematics" if s == "Math" else s
            break
    return topic, subject


# ── Models ─────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    messages: list[dict]
    exam_mode: str = "JEE/NEET"      # "JEE Main" | "JEE Advanced" | "NEET"
    marks: int = 4                    # 4 | 8
    language: str = "english"        # "english" | "hinglish"


class FeedbackRequest(BaseModel):
    topic: str
    subject: str = "General"
    is_correct: bool


# ── POST /api/chat ─────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(
    req: ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    history = req.messages
    user_id = current_user.get("user_id", current_user.get("sub", ""))

    if not history or not history[-1].get("text", "").strip():
        raise HTTPException(status_code=400, detail="Empty user message.")

    latest_user_text = history[-1]["text"].strip()
    print(f"\n📩 [{user_id}] [{req.exam_mode} {req.marks}M] {latest_user_text[:80]}")

    # Save user message
    ChatHistoryDB.save_message(user_id, "user", latest_user_text)

    # Load server history for LLM context
    db_history = ChatHistoryDB.get_history(user_id, limit=60)
    lm_history = db_history[-(HISTORY_WINDOW + 1):-1]

    # Build RAG search query
    rewritten_query = rewrite_followup_question(db_history[-8:])
    print(f"🔍 RAG query: {rewritten_query[:80]}")

    # Retrieve NCERT context
    context = retrieve_context(rewritten_query, k=7)

    # Build calibrated prompt
    prompt = build_prompt(
        question=latest_user_text,
        context=context,
        history=lm_history,
        exam_mode=req.exam_mode,
        marks=req.marks,
        language=req.language,
    )

    # Call LLM
    try:
        answer = generate_answer(prompt)
        if not answer or answer.startswith("[LLM Error]") or answer.startswith("[Gemini Error]"):
            raise RuntimeError(answer or "Empty answer")
        print("✅ Answer generated")
    except Exception as e:
        print(f"❌ LLM error: {e}")
        answer = f"Sorry, I couldn't generate an answer right now. Please try again."

    # Save assistant reply + track topic analytics
    ChatHistoryDB.save_message(user_id, "assistant", answer)
    topic, subject = _extract_topic(answer)
    UserAnalyticsDB.record_question(user_id, topic, subject)

    return {"answer": answer, "topic": topic, "subject": subject}


# ── POST /api/chat/feedback ────────────────────────────────────────────────────

@router.post("/chat/feedback")
async def feedback(
    req: FeedbackRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("user_id", current_user.get("sub", ""))
    UserAnalyticsDB.record_feedback(user_id, req.topic, req.subject, req.is_correct)
    return {"message": "Feedback recorded"}


# ── GET /api/chat/history ──────────────────────────────────────────────────────

@router.get("/chat/history")
async def get_history(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user.get("user_id", current_user.get("sub", ""))
    messages = ChatHistoryDB.get_history(user_id, limit=100)
    return {"messages": messages}


# ── DELETE /api/chat/history ───────────────────────────────────────────────────

@router.delete("/chat/history")
async def clear_history(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user.get("user_id", current_user.get("sub", ""))
    ChatHistoryDB.clear_history(user_id)
    return {"message": "Chat history cleared"}
