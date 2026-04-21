import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Clock, Flag, Send, AlertTriangle } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/* ── Countdown timer ──────────────────────────────────────────────────────── */
function Timer({ seconds, onExpire }) {
  const [rem, setRem] = useState(seconds);
  useEffect(() => {
    if (rem <= 0) { onExpire(); return; }
    const id = setInterval(() => setRem(r => r - 1), 1000);
    return () => clearInterval(id);
  }, [rem]);           // eslint-disable-line react-hooks/exhaustive-deps

  const h = Math.floor(rem / 3600);
  const m = Math.floor((rem % 3600) / 60);
  const s = rem % 60;
  const low = rem < 300;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm select-none ${
      low ? "bg-red-900/50 text-red-300 animate-pulse" : "bg-gray-700 text-white"
    }`}>
      <Clock className="w-4 h-4" />
      {h > 0 && `${h}:`}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}

/* ── Inline markdown (no wrapping <p>) ─────────────────────────────────────── */
const InlineMD = ({ children }) => (
  <ReactMarkdown
    remarkPlugins={[remarkMath]}
    rehypePlugins={[rehypeKatex]}
    components={{ p: ({ children: c }) => <span>{c}</span> }}
  >{children}</ReactMarkdown>
);

const BlockMD = ({ children }) => (
  <ReactMarkdown
    remarkPlugins={[remarkMath]}
    rehypePlugins={[rehypeKatex]}
    components={{ p: ({ ...props }) => <p className="mb-1" {...props} /> }}
  >{children}</ReactMarkdown>
);

/* ── Status colours for nav grid ─────────────────────────────────────────── */
const STATUS_CLS = {
  current:    "bg-blue-600 text-white ring-2 ring-blue-400",
  answered:   "bg-green-700 text-white",
  marked:     "bg-yellow-600 text-white",
  unanswered: "bg-gray-700 text-gray-300 hover:bg-gray-600",
};

export default function ExamPage() {
  const { sessionId } = useParams();
  const location      = useLocation();
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [examData, setExamData]   = useState(location.state || null);
  const [currentQ, setCurrentQ]   = useState(0);
  const [answers, setAnswers]     = useState({});
  const [marked, setMarked]       = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startRef = useRef(Date.now());

  /* Load session from API if navigated directly */
  useEffect(() => {
    if (examData) return;
    fetch(`${API}/api/exam/session/${sessionId}`, {
      headers: { Authorization: `Bearer ${user?.accessToken}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.detail) navigate("/exam/setup");
        else setExamData(data);
      })
      .catch(() => navigate("/exam/setup"));
  }, [sessionId]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* Warn before accidental page leave */
  useEffect(() => {
    const handler = e => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    const timeTaken = Math.floor((Date.now() - startRef.current) / 1000);
    try {
      const res = await fetch(`${API}/api/exam/session/${sessionId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.accessToken}`,
        },
        body: JSON.stringify({ answers, time_taken: timeTaken }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || "Submission failed");
      navigate(`/exam/${sessionId}/result`, { state: result });
    } catch (e) {
      alert("Submission failed: " + e.message);
      setSubmitting(false);
    }
  }, [sessionId, answers, user?.accessToken, navigate]);

  if (!examData) {
    return <div className="text-center py-20 text-gray-400">Loading exam…</div>;
  }

  const { questions, time_limit, marks_config, exam_mode } = examData;
  const q = questions[currentQ];
  const totalAnswered = Object.keys(answers).length;
  const unattempted   = questions.length - totalAnswered;

  const getStatus = i => {
    if (i === currentQ) return "current";
    if (marked.has(i))  return "marked";
    if (answers[String(i)]) return "answered";
    return "unanswered";
  };

  const setAnswer = letter =>
    setAnswers(a => ({ ...a, [String(currentQ)]: letter }));

  const clearAnswer = () =>
    setAnswers(a => { const n = {...a}; delete n[String(currentQ)]; return n; });

  const toggleMark = () =>
    setMarked(m => { const n = new Set(m); n.has(currentQ) ? n.delete(currentQ) : n.add(currentQ); return n; });

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 5rem)" }}>

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2 flex-shrink-0">
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span className="font-medium text-white">{exam_mode}</span>
          <span>·</span>
          <span>Q {currentQ + 1} / {questions.length}</span>
          {marks_config && (
            <span className="text-xs">
              <span className="text-green-400">+{marks_config.correct}</span>
              {marks_config.incorrect !== 0 && (
                <span className="text-red-400"> / {marks_config.incorrect}</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Timer seconds={time_limit} onExpire={handleSubmit} />
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" /> Submit
          </button>
        </div>
      </div>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Question + options */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">

          {/* Question card */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {q.subject && (
                <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">{q.subject}</span>
              )}
              {q.chapter && (
                <span className="text-xs text-gray-500">{q.chapter}</span>
              )}
              {q.difficulty && (
                <span className={`text-xs ml-auto capitalize ${
                  q.difficulty === "easy" ? "text-green-400" :
                  q.difficulty === "hard" ? "text-red-400" : "text-yellow-400"
                }`}>{q.difficulty}</span>
              )}
            </div>
            <div className="text-white text-sm leading-relaxed">
              <BlockMD>{q.question}</BlockMD>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const letter   = ["A", "B", "C", "D"][oi];
              const selected = answers[String(currentQ)] === letter;
              return (
                <button
                  key={oi}
                  onClick={() => selected ? clearAnswer() : setAnswer(letter)}
                  className={`w-full p-3 rounded-xl border text-left text-sm transition ${
                    selected
                      ? "border-blue-500 bg-blue-900/40 text-white"
                      : "border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-400 hover:bg-gray-750"
                  }`}
                >
                  <InlineMD>{opt}</InlineMD>
                </button>
              );
            })}
          </div>

          {/* Prev / Mark / Next */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
              disabled={currentQ === 0}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg text-sm transition"
            >← Prev</button>

            <button
              onClick={toggleMark}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition ${
                marked.has(currentQ)
                  ? "bg-yellow-700 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              {marked.has(currentQ) ? "Marked" : "Mark"}
            </button>

            <button
              onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))}
              disabled={currentQ === questions.length - 1}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg text-sm transition"
            >Next →</button>
          </div>
        </div>

        {/* ── Navigation grid ─────────────────────────────────────────── */}
        <div className="w-40 flex-shrink-0 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-2 font-medium">Navigator</p>
            <div className="grid grid-cols-5 gap-1">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`aspect-square rounded text-xs font-medium transition ${STATUS_CLS[getStatus(i)]}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-700 inline-block" />
                <span className="text-gray-400">Done ({totalAnswered})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-yellow-600 inline-block" />
                <span className="text-gray-400">Flagged ({marked.size})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gray-700 inline-block" />
                <span className="text-gray-400">Left ({unattempted})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Submit confirmation modal ────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h3 className="font-bold text-lg text-white">Submit Exam?</h3>
            </div>
            <div className="text-sm text-gray-300 space-y-1">
              <p>Answered: <span className="text-green-400 font-semibold">{totalAnswered}</span> / {questions.length}</p>
              <p>Unattempted: <span className="text-red-400 font-semibold">{unattempted}</span></p>
              {marked.size > 0 && (
                <p>Flagged for review: <span className="text-yellow-400 font-semibold">{marked.size}</span></p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >Cancel</button>
              <button
                onClick={() => { setShowConfirm(false); handleSubmit(); }}
                disabled={submitting}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Confirm Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
