from fastapi import APIRouter, Depends
from typing import Dict, Any
from backend.utils.auth import get_current_user
from backend.utils.database import UserAnalyticsDB, ChatHistoryDB

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user.get("user_id", current_user.get("sub", ""))

    analytics = UserAnalyticsDB.get_analytics(user_id)
    streak = UserAnalyticsDB.get_streak(user_id)

    # ── Aggregate totals ──────────────────────────────────────────────────────
    total_asked = sum(a.get("asked", 0) for a in analytics)
    total_correct = sum(a.get("correct", 0) for a in analytics)
    total_incorrect = sum(a.get("incorrect", 0) for a in analytics)
    accuracy = round(total_correct / (total_correct + total_incorrect) * 100) if (total_correct + total_incorrect) else None

    # ── Subject breakdown ─────────────────────────────────────────────────────
    subjects: Dict[str, Dict] = {}
    for a in analytics:
        subj = a.get("subject", "General")
        if subj not in subjects:
            subjects[subj] = {"asked": 0, "correct": 0, "incorrect": 0}
        subjects[subj]["asked"] += a.get("asked", 0)
        subjects[subj]["correct"] += a.get("correct", 0)
        subjects[subj]["incorrect"] += a.get("incorrect", 0)

    subject_list = []
    for name, s in subjects.items():
        rated = s["correct"] + s["incorrect"]
        subject_list.append({
            "subject": name,
            "asked": s["asked"],
            "accuracy": round(s["correct"] / rated * 100) if rated else None,
        })
    subject_list.sort(key=lambda x: x["asked"], reverse=True)

    # ── Weak topics (rated topics sorted by accuracy ascending) ──────────────
    weak_topics = []
    for a in analytics:
        rated = a.get("correct", 0) + a.get("incorrect", 0)
        if rated >= 2:
            acc = round(a["correct"] / rated * 100)
            weak_topics.append({
                "topic": a["topic"],
                "subject": a.get("subject", "General"),
                "asked": a.get("asked", 0),
                "accuracy": acc,
            })
    weak_topics.sort(key=lambda x: x["accuracy"])

    # ── Recent questions ──────────────────────────────────────────────────────
    history = ChatHistoryDB.get_history(user_id, limit=10)
    recent = [m for m in history if m.get("role") == "user"][-5:]

    return {
        "stats": {
            "total_asked": total_asked,
            "total_correct": total_correct,
            "accuracy": accuracy,
            "streak": streak,
        },
        "subjects": subject_list,
        "weak_topics": weak_topics[:10],
        "recent_questions": recent,
    }
