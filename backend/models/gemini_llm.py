import itertools
import os
from pathlib import Path
from typing import List

import google.generativeai as genai
from dotenv import load_dotenv

try:
    from groq import Groq
except Exception:
    Groq = None


env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

GROQ_API_KEY = (os.getenv("GROQ_API_KEY") or "").strip()
GROQ_MODEL = (os.getenv("GROQ_MODEL") or "llama-3.3-70b-versatile").strip()
GEMINI_MODEL = (os.getenv("GEMINI_MODEL") or "models/gemini-2.0-flash").strip()

SYSTEM_PROMPT = """
You are an expert JEE/NEET tutor.
Rules:
1. Prefer NCERT-grounded reasoning.
2. For numericals, show all steps with units.
3. Mention tested concept/chapter where possible.
4. End with one short exam tip.
5. Use LaTeX for formulas.
""".strip()


def _collect_gemini_keys() -> List[str]:
    keys = []
    for name in [
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
        "GEMINI_KEY_1",
        "GEMINI_KEY_2",
        "GEMINI_KEY_3",
    ]:
        value = (os.getenv(name) or "").strip()
        if value:
            keys.append(value)

    deduped = []
    seen = set()
    for key in keys:
        if key not in seen:
            deduped.append(key)
            seen.add(key)
    return deduped


GEMINI_KEYS = _collect_gemini_keys()
_gemini_key_cycle = itertools.cycle(GEMINI_KEYS) if GEMINI_KEYS else None
_groq_client = Groq(api_key=GROQ_API_KEY) if (Groq and GROQ_API_KEY) else None


def build_prompt(question: str, context: str, subject: str = "", exam: str = "JEE/NEET") -> str:
    return f"""
{SYSTEM_PROMPT}

EXAM TARGET: {exam}
SUBJECT: {subject or 'General Science'}

--- NCERT CONTEXT ---
{context or 'No context found in index.'}
--- END CONTEXT ---

STUDENT QUESTION: {question}

Output format:
### Concept
### Solution
### Common Mistake
### Exam Tip
""".strip()


def _ask_groq(prompt: str) -> str:
    if not _groq_client:
        raise RuntimeError("Groq is not configured")

    response = _groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2048,
        temperature=0.3,
    )
    content = response.choices[0].message.content if response.choices else ""
    if not content:
        raise RuntimeError("Groq returned empty content")
    return content.strip()


def _ask_gemini(prompt: str, api_key: str) -> str:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(GEMINI_MODEL)
    response = model.generate_content(
        prompt,
        generation_config={"temperature": 0.35, "max_output_tokens": 1200},
    )
    text = getattr(response, "text", "") or ""
    if not text.strip():
        raise RuntimeError("Gemini returned empty content")
    return text.strip()


def ask_llm(prompt: str) -> str:
    errors = []

    try:
        return _ask_groq(prompt)
    except Exception as exc:
        errors.append(f"Groq: {exc}")

    if not GEMINI_KEYS or _gemini_key_cycle is None:
        return "[LLM Error] No configured Gemini fallback keys and Groq failed."

    for _ in range(len(GEMINI_KEYS)):
        key = next(_gemini_key_cycle)
        try:
            return _ask_gemini(prompt, key)
        except Exception as exc:
            errors.append(f"Gemini: {exc}")
            continue

    merged = " | ".join(errors)
    if "429" in merged or "quota" in merged.lower():
        return (
            "[Gemini Error] Quota exceeded (HTTP 429). "
            "Your current API project likely has free-tier limit=0 or exhausted quota. "
            "Update backend/.env with a key from an active Gemini API project, "
            "then restart backend."
        )
    return "[LLM Error] All AI providers failed. Please retry in a minute."


def generate_answer(prompt: str = None, query: str = None, context: str = None) -> str:
    try:
        final_prompt = prompt or build_prompt(question=query or "", context=context or "")
        return ask_llm(final_prompt)
    except Exception as exc:
        return f"[LLM Error] {exc}"
