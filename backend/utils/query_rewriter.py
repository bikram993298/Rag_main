"""
Token-efficient query rewriter — zero LLM calls.

Builds the best possible RAG search query from conversation history using
simple heuristics, saving one full LLM round-trip per message.
"""

VAGUE_TRIGGERS = {
    "in detail", "in details", "tell me more", "discuss", "discuss more",
    "explain more", "elaborate", "continue", "go on", "more", "expand",
    "explain it", "explain", "in detailsa", "ok", "yes", "sure", "please",
    "again", "repeat",
}

# "solve this/these/those" — the user is pointing at content from the
# ASSISTANT's previous message (e.g. a list of questions the bot generated)
SOLVE_REF_TRIGGERS = {
    "solve this", "solve these", "solve those", "solve them",
    "solve this questions", "solve these questions", "solve those questions",
    "answer this", "answer these", "answer those", "answer them",
    "give solution", "give solutions", "give the solution",
    "show solution", "show me solution", "solve it",
}


def _is_vague(text: str) -> bool:
    t = text.strip().lower().rstrip("?.,!")
    if len(t) < 25:
        return any(t == trigger or t.startswith(trigger) for trigger in VAGUE_TRIGGERS)
    return False


def _points_at_assistant_content(text: str) -> bool:
    """True when the user is referring to something the assistant just said."""
    t = text.strip().lower().rstrip("?.,! ")
    return any(t == trigger or t.startswith(trigger) for trigger in SOLVE_REF_TRIGGERS)


def rewrite_followup_question(history: list[dict]) -> str:
    """Return a standalone search query derived from the conversation history."""
    if not history:
        return ""

    latest = history[-1].get("text", "").strip()
    if not latest:
        return ""

    # ── Case 1: "solve this / these questions" ────────────────────────────────
    # User is pointing at questions the ASSISTANT generated previously.
    # Use the assistant's last message text as the RAG search query so FAISS
    # can find relevant NCERT context for those questions.
    if _points_at_assistant_content(latest):
        for msg in reversed(history[:-1]):
            if msg.get("role") == "assistant":
                assistant_text = msg.get("text", "").strip()
                if assistant_text:
                    # First 400 chars is enough for a good embedding search
                    return assistant_text[:400]
        return latest

    # ── Case 2: vague elaboration request ────────────────────────────────────
    # "explain more", "in detail" etc. — refer to the last USER question
    if _is_vague(latest):
        for msg in reversed(history[:-1]):
            if msg.get("role") == "user":
                prev = msg["text"].strip()
                if not _is_vague(prev) and not _points_at_assistant_content(prev):
                    return f"{latest}: {prev}"
        return latest

    # ── Case 3: fresh question — use as-is ───────────────────────────────────
    return latest
