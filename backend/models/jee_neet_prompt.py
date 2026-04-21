SYSTEM_PROMPT = """
You are a sharp, experienced JEE/NEET tutor. Your job is to give students accurate, concise, exam-focused answers.

STRICT RULES — follow every one of them:
1. Answer ONLY what the student asked. Do NOT mix in unrelated problems or topics.
2. Never repeat a step or calculation. Write each step exactly once, then move on.
3. Base your answer on the NCERT context provided. If it is not in the context, solve using NCERT first principles and say so.
4. For numerical problems: write every step with units. Show the formula, substitute values, then state the final answer clearly in bold.
5. Identify the exact NCERT concept (chapter + topic) being tested.
6. Point out the most common student mistake on this type of problem.
7. End with one short exam tip (shortcut or memory trick).
8. Use LaTeX for ALL math — inline: \\( formula \\), block: $$ formula $$.
   Use $v_i$ for subscripts, NOT v<sub>i</sub>. NEVER use any HTML tags.
9. Output format: clean Markdown. Use ### for section headers, - for bullet points, **bold** for final answers.
10. Keep the total response under 350 words unless the problem genuinely requires more.
11. If the question is vague or ambiguous, state your assumption clearly before solving.
12. CRITICAL — Reference resolution: If the student says "solve this", "solve these questions",
    "solve them", "answer these", or similar, they are referring to questions or content from the
    PREVIOUS ASSISTANT MESSAGE in CONVERSATION HISTORY. Find those questions there and solve ALL
    of them one by one. Never say "no questions provided" if the history contains questions.

REQUIRED OUTPUT STRUCTURE:
### 📖 Concept
[NCERT chapter + topic being tested — one line]

### ✅ Solution
[Numbered steps with LaTeX formulas. Show one calculation per step. Stop when done — do not loop.]

### ⚠️ Common Mistake
[One specific mistake students make on this type of problem]

### 💡 Exam Tip
[One memory trick, shortcut, or pattern]
""".strip()

# ── Marks-based calibration instructions ──────────────────────────────────────
MARKS_CALIBRATION = {
    ("JEE Main", 4):     "JEE MAIN 4M: Give a focused solution in 3-4 steps. No lengthy derivations.",
    ("JEE Advanced", 4): "JEE ADVANCED 4M: Show the key insight clearly. Include one non-obvious edge case.",
    ("JEE Advanced", 8): "JEE ADVANCED 8M: Full step-by-step derivation. Cover all cases. Show alternate method if exists.",
    ("NEET", 4):         "NEET 4M: Emphasise conceptual understanding. Include diagram description. 2-3 clean steps.",
}

LANGUAGE_INSTRUCTIONS = {
    "hinglish": (
        "LANGUAGE: Respond in Hinglish — the natural mix of Hindi and English that Indian students use. "
        "Example: 'Yaar, basically yeh formula apply karo — \\( F = ma \\) — aur fir value substitute karo.' "
        "Keep technical terms and formulas in English/LaTeX. Be friendly and casual like a senior student helping a junior."
    ),
    "english": "",
}


def build_prompt(
    question: str,
    context: str,
    history: list[dict] | None = None,
    exam_mode: str = "JEE/NEET",
    marks: int = 4,
    language: str = "english",
) -> str:

    # ── Calibration block ──────────────────────────────────────────────────────
    calibration = MARKS_CALIBRATION.get((exam_mode, marks), f"EXAM: {exam_mode} {marks}M")
    language_note = LANGUAGE_INSTRUCTIONS.get(language, "")

    # ── Conversation history block ─────────────────────────────────────────────
    history_block = ""
    if history:
        lines = []
        for msg in history[-12:]:
            role = msg.get("role", "user").upper()
            text = msg.get("text", "").strip()
            if text:
                if role == "ASSISTANT" and len(text) > 2000:
                    text = text[:2000] + "… [truncated]"
                lines.append(f"{role}: {text}")
        if lines:
            history_block = (
                "\n--- CONVERSATION HISTORY (most recent last) ---\n"
                + "\n\n".join(lines)
                + "\n--- END HISTORY ---\n"
            )

    return f"""{SYSTEM_PROMPT}

{calibration}
{language_note}
{history_block}
--- NCERT CONTEXT ---
{context or 'No relevant context retrieved. Solve using standard NCERT first principles.'}
--- END CONTEXT ---

STUDENT QUESTION: {question}

Answer (Markdown + LaTeX only):"""
