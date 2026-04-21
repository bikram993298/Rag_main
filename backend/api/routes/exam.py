import json
import re
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo import DESCENDING

from backend.api.routes.auth import get_current_user
from backend.models.exam_models import (
    CHAPTER_MAP, MARKS_CONFIG, TIME_PER_QUESTION,
    GenerateExamRequest, SubmitExamRequest,
)
from backend.models.gemini_llm import ask_llm
from backend.utils.database import db

router = APIRouter(prefix="/api/exam", tags=["exam"])
COLL = "exam_sessions"


# ── Question generation ────────────────────────────────────────────────────────

def _gen_prompt(subjects, chapters, num_q, difficulty, exam_mode):
    subj = ", ".join(subjects)
    ch   = ", ".join(chapters[:12]) + ("…" if len(chapters) > 12 else "")
    diff = (
        "a balanced mix: 30% easy, 50% medium, 20% hard"
        if difficulty == "mixed" else difficulty
    )
    return f"""You are a strict {exam_mode} question paper setter.
Generate exactly {num_q} MCQ questions for:
  Subjects: {subj}
  Chapters: {ch}
  Difficulty: {diff}

Return ONLY a valid JSON array — no markdown, no prose, nothing else:
[
  {{
    "subject": "Physics",
    "chapter": "Kinematics",
    "question": "A ball is thrown up at 20 m/s. Time to reach max height (g=10):",
    "options": ["A) 1 s", "B) 2 s", "C) 3 s", "D) 4 s"],
    "correct": "B",
    "explanation": "v=u-gt → 0=20-10t → t=2 s",
    "difficulty": "easy"
  }}
]

Strict rules:
1. options must have exactly 4 elements labelled A) B) C) D)
2. correct is exactly one of: A  B  C  D
3. All {num_q} questions must belong to the listed chapters
4. For math: write plain-text notation — use ^ for powers (x^2), / for fractions (a/b),
   sqrt() for roots, Greek letters spelled out (alpha, theta, pi). Do NOT use LaTeX
   backslash commands (\\frac, \\sqrt, \\alpha, etc.) — they break JSON parsing.
5. Return ONLY the JSON array"""


def _fix_json_escapes(s: str) -> str:
    # Repair invalid JSON escape sequences produced by LLMs writing raw LaTeX.
    # JSON only allows: \\ \" \/ \b \f \n \r \t \uXXXX
    # Everything else (e.g. \frac \sqrt \alpha) causes JSONDecodeError.
    result = []
    i = 0
    while i < len(s):
        c = s[i]
        if c != "\\":
            result.append(c)
            i += 1
            continue
        # We have a backslash — peek at next character
        if i + 1 >= len(s):
            result.append("\\\\")   # trailing lone backslash
            i += 1
            continue
        nxt = s[i + 1]
        if nxt in ('"', "\\", "/"):
            # Unambiguously valid JSON escapes — keep as-is
            result.append(c)
            result.append(nxt)
            i += 2
        elif nxt in ("b", "f", "n", "r", "t"):
            # These are valid JSON escapes (\b \f \n \r \t) BUT also start common
            # LaTeX commands (\beta, \frac, \nabla, \right, \theta).
            # Heuristic: if more letters follow, treat as LaTeX → double-escape.
            following = s[i + 2] if i + 2 < len(s) else ""
            if following.isalpha():
                result.append("\\\\")   # double the backslash
                i += 1                  # nxt gets appended in next iteration
            else:
                result.append(c)
                result.append(nxt)
                i += 2
        elif nxt == "u" and i + 5 < len(s) and all(
            x in "0123456789abcdefABCDEF" for x in s[i + 2 : i + 6]
        ):
            # Valid \uXXXX sequence — keep as-is
            result.append(s[i : i + 6])
            i += 6
        else:
            # Invalid escape (e.g. \frac, \sqrt, \alpha) — double the backslash
            result.append("\\\\")
            i += 1   # do NOT consume nxt; it will be appended in next iteration
    return "".join(result)


def _parse_questions(raw: str) -> list:
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip()
    start = raw.find("[")
    end   = raw.rfind("]") + 1
    if start == -1 or end <= 1:
        raise ValueError("No JSON array in LLM response")

    json_str = raw[start:end]

    # Try parsing directly first, then with escape repair
    parsed = None
    for attempt, candidate in enumerate([json_str, _fix_json_escapes(json_str)]):
        try:
            parsed = json.loads(candidate)
            break
        except json.JSONDecodeError as exc:
            if attempt == 1:
                raise ValueError(f"JSON still invalid after escape repair: {exc}") from exc

    valid = []
    for q in parsed:
        if (
            all(k in q for k in ["question", "options", "correct", "explanation"])
            and len(q["options"]) == 4
            and q["correct"] in ("A", "B", "C", "D")
        ):
            valid.append(q)
    return valid


def _calc_score(questions: list, answers: dict, marks_config: dict) -> dict:
    correct = incorrect = unattempted = 0
    for i, q in enumerate(questions):
        ans = answers.get(str(i), "").upper()
        if not ans:
            unattempted += 1
        elif ans == q["correct"]:
            correct += 1
        else:
            incorrect += 1
    total = correct * marks_config["correct"] + incorrect * marks_config["incorrect"]
    max_m = len(questions) * marks_config["correct"]
    return {
        "correct": correct,
        "incorrect": incorrect,
        "unattempted": unattempted,
        "total_marks": total,
        "max_marks": max_m,
        "percentage": round(total / max_m * 100, 1) if max_m else 0,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/chapters")
async def get_chapters(_=Depends(get_current_user)):
    return CHAPTER_MAP


@router.post("/generate")
async def generate_exam(req: GenerateExamRequest, current_user=Depends(get_current_user)):
    if not req.subjects:
        raise HTTPException(400, "Select at least one subject")
    if not req.chapters:
        raise HTTPException(400, "Select at least one chapter")

    prompt = _gen_prompt(req.subjects, req.chapters, req.num_questions,
                         req.difficulty, req.exam_mode)
    questions = []
    last_err = ""
    for attempt in range(2):
        try:
            raw = ask_llm(prompt)
            questions = _parse_questions(raw)
            if len(questions) >= max(5, req.num_questions // 2):
                break
            last_err = f"Only {len(questions)} valid questions parsed"
        except Exception as e:
            last_err = str(e)

    if not questions:
        raise HTTPException(500, f"Could not generate questions ({last_err}). Try fewer chapters or retry.")

    time_limit = TIME_PER_QUESTION.get(req.exam_mode, 120) * len(questions)
    session_doc = {
        "user_id": current_user["user_id"],
        "exam_mode": req.exam_mode,
        "subjects": req.subjects,
        "chapters": req.chapters,
        "difficulty": req.difficulty,
        "questions": questions,
        "answers": {},
        "time_limit": time_limit,
        "time_taken": 0,
        "status": "active",
        "score": None,
        "created_at": datetime.utcnow(),
        "submitted_at": None,
    }
    result = db[COLL].insert_one(session_doc)
    session_id = str(result.inserted_id)

    safe_qs = [{k: v for k, v in q.items() if k not in ("correct", "explanation")}
               for q in questions]
    return {
        "session_id": session_id,
        "exam_mode": req.exam_mode,
        "num_questions": len(questions),
        "time_limit": time_limit,
        "marks_config": MARKS_CONFIG.get(req.exam_mode, MARKS_CONFIG["Practice"]),
        "questions": safe_qs,
    }


@router.get("/sessions")
async def get_exam_history(current_user=Depends(get_current_user)):
    cursor = db[COLL].find(
        {"user_id": current_user["user_id"], "status": "evaluated"},
        {"questions": 0, "question_results": 0},
    ).sort("submitted_at", DESCENDING).limit(20)

    sessions = []
    for s in cursor:
        sessions.append({
            "session_id": str(s["_id"]),
            "exam_mode": s.get("exam_mode"),
            "subjects": s.get("subjects"),
            "chapters": s.get("chapters"),
            "difficulty": s.get("difficulty"),
            "score": s.get("score"),
            "time_taken": s.get("time_taken"),
            "submitted_at": s["submitted_at"].isoformat() if s.get("submitted_at") else None,
        })
    return {"sessions": sessions}


@router.get("/session/{session_id}")
async def get_session(session_id: str, current_user=Depends(get_current_user)):
    try:
        doc = db[COLL].find_one({"_id": ObjectId(session_id),
                                  "user_id": current_user["user_id"]})
    except Exception:
        raise HTTPException(404, "Session not found")
    if not doc:
        raise HTTPException(404, "Session not found")
    if doc["status"] != "active":
        raise HTTPException(400, "Exam already submitted")

    safe_qs = [{k: v for k, v in q.items() if k not in ("correct", "explanation")}
               for q in doc["questions"]]
    return {
        "session_id": session_id,
        "exam_mode": doc["exam_mode"],
        "num_questions": len(doc["questions"]),
        "time_limit": doc["time_limit"],
        "marks_config": MARKS_CONFIG.get(doc["exam_mode"], MARKS_CONFIG["Practice"]),
        "questions": safe_qs,
    }


@router.post("/session/{session_id}/submit")
async def submit_exam(session_id: str, req: SubmitExamRequest,
                      current_user=Depends(get_current_user)):
    try:
        doc = db[COLL].find_one({"_id": ObjectId(session_id),
                                  "user_id": current_user["user_id"]})
    except Exception:
        raise HTTPException(404, "Session not found")
    if not doc:
        raise HTTPException(404, "Session not found")
    if doc["status"] != "active":
        raise HTTPException(400, "Already submitted")

    questions    = doc["questions"]
    marks_config = MARKS_CONFIG.get(doc["exam_mode"], MARKS_CONFIG["Practice"])
    score        = _calc_score(questions, req.answers, marks_config)

    question_results = []
    for i, q in enumerate(questions):
        student_ans = req.answers.get(str(i), "").upper()
        question_results.append({
            "index": i,
            "question": q["question"],
            "options": q["options"],
            "correct": q["correct"],
            "student_answer": student_ans,
            "is_correct": bool(student_ans and student_ans == q["correct"]),
            "explanation": q.get("explanation", ""),
            "subject": q.get("subject", ""),
            "chapter": q.get("chapter", ""),
            "difficulty": q.get("difficulty", ""),
        })

    db[COLL].update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {
            "answers": req.answers,
            "time_taken": req.time_taken,
            "status": "evaluated",
            "score": score,
            "question_results": question_results,
            "submitted_at": datetime.utcnow(),
        }},
    )
    return {"score": score, "question_results": question_results}


@router.get("/session/{session_id}/result")
async def get_result(session_id: str, current_user=Depends(get_current_user)):
    try:
        doc = db[COLL].find_one({"_id": ObjectId(session_id),
                                  "user_id": current_user["user_id"]})
    except Exception:
        raise HTTPException(404, "Session not found")
    if not doc:
        raise HTTPException(404, "Session not found")
    if doc["status"] != "evaluated":
        raise HTTPException(400, "Exam not submitted yet")

    return {
        "session_id": session_id,
        "exam_mode": doc.get("exam_mode"),
        "score": doc.get("score"),
        "time_taken": doc.get("time_taken"),
        "time_limit": doc.get("time_limit"),
        "question_results": doc.get("question_results", []),
    }
