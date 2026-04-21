from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
from backend.rag.retriever import retrieve_context
from backend.models.gemini_llm import generate_answer
from backend.models.jee_neet_prompt import build_prompt
from backend.utils.query_rewriter import rewrite_followup_question
from backend.utils.database import ChatHistoryDB
from backend.utils.auth import get_current_user

router = APIRouter()

# How many stored messages to load for LLM context (token-efficient sliding window)
HISTORY_WINDOW = 12


class ChatRequest(BaseModel):
    messages: list[dict]  # client sends full in-memory history


# ──────────────────────────────────────────────
# POST /api/chat  — main chat endpoint
# ──────────────────────────────────────────────
@router.post("/chat")
async def chat(
    req: ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    history = req.messages
    user_id = current_user.get("user_id", current_user.get("sub", ""))

    if not history or not history[-1].get("text", "").strip():
        raise HTTPException(status_code=400, detail="Empty user message.")

    latest_user_text = history[-1]["text"].strip()
    print(f"\n📩 [{user_id}] {latest_user_text[:80]}")

    # ── Step 1: Save user message to DB ──────────────────────────────────────
    ChatHistoryDB.save_message(user_id, "user", latest_user_text)

    # ── Step 2: Load server-side history for LLM context ─────────────────────
    # Use server DB (not client state) — reliable even after page refresh
    db_history = ChatHistoryDB.get_history(user_id, limit=60)
    # Sliding window: last HISTORY_WINDOW messages for the LLM
    lm_history = db_history[-(HISTORY_WINDOW + 1):-1]  # exclude the message we just saved

    # ── Step 3: Rewrite follow-up into a good RAG search query ───────────────
    # Pass the last 8 messages for context resolution
    rewritten_query = rewrite_followup_question(db_history[-8:])
    print(f"🔍 RAG query: {rewritten_query[:80]}")

    # ── Step 4: Retrieve NCERT context with the rewritten query ──────────────
    context = retrieve_context(rewritten_query, k=7)
    preview = (context[:200] + "…") if len(context) > 200 else context
    print(f"📖 Context: {preview}")

    # ── Step 5: Build prompt with history + context ───────────────────────────
    prompt = build_prompt(
        question=latest_user_text,
        context=context,
        history=lm_history,
    )

    # ── Step 6: Call LLM ──────────────────────────────────────────────────────
    try:
        answer = generate_answer(prompt)
        if not answer or answer.startswith("[LLM Error]") or answer.startswith("[Gemini Error]"):
            raise RuntimeError(answer or "Empty answer")
        print("✅ Answer generated")
    except Exception as e:
        print(f"❌ LLM error: {e}")
        answer = f"Sorry, I couldn't generate an answer right now. Please try again. ({e})"

    # ── Step 7: Save assistant reply to DB ───────────────────────────────────
    ChatHistoryDB.save_message(user_id, "assistant", answer)

    return {"answer": answer}


# ──────────────────────────────────────────────
# GET /api/chat/history  — load history on login
# ──────────────────────────────────────────────
@router.get("/chat/history")
async def get_history(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user.get("user_id", current_user.get("sub", ""))
    messages = ChatHistoryDB.get_history(user_id, limit=100)
    return {"messages": messages}


# ──────────────────────────────────────────────
# DELETE /api/chat/history  — clear chat history
# ──────────────────────────────────────────────
@router.delete("/chat/history")
async def clear_history(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user.get("user_id", current_user.get("sub", ""))
    ChatHistoryDB.clear_history(user_id)
    return {"message": "Chat history cleared"}
