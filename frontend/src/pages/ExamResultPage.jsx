import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Trophy, CheckCircle2, XCircle, MinusCircle,
  Clock, RotateCcw, ChevronDown, ChevronUp, History,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const InlineMD = ({ children }) => (
  <ReactMarkdown
    remarkPlugins={[remarkMath]}
    rehypePlugins={[rehypeKatex]}
    components={{ p: ({ children: c }) => <span>{c}</span> }}
  >{children}</ReactMarkdown>
);

function QuestionRow({ qr }) {
  const [open, setOpen] = useState(false);

  const borderCls = qr.is_correct
    ? "border-green-700 bg-green-900/10"
    : qr.student_answer
      ? "border-red-700 bg-red-900/10"
      : "border-gray-700 bg-gray-800";

  const Icon = qr.is_correct
    ? CheckCircle2
    : qr.student_answer ? XCircle : MinusCircle;

  const iconCls = qr.is_correct ? "text-green-400" : qr.student_answer ? "text-red-400" : "text-gray-500";

  return (
    <div className={`rounded-xl border overflow-hidden ${borderCls}`}>
      <button
        className="w-full flex items-start gap-3 p-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-xs text-gray-500 w-5 flex-shrink-0 pt-0.5">{qr.index + 1}.</span>
        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconCls}`} />
        <span className="flex-1 text-sm text-gray-200 line-clamp-2">
          <InlineMD>{qr.question}</InlineMD>
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-700 p-4 space-y-3">
          {/* Your answer vs correct */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-xs text-gray-500 block mb-0.5">Your Answer</span>
              <span className={`font-bold ${
                !qr.student_answer ? "text-gray-500"
                : qr.is_correct ? "text-green-400" : "text-red-400"
              }`}>
                {qr.student_answer || "Not attempted"}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block mb-0.5">Correct Answer</span>
              <span className="font-bold text-green-400">{qr.correct}</span>
            </div>
          </div>

          {/* Options with highlights */}
          <div className="space-y-1.5">
            {qr.options.map((opt, i) => {
              const letter    = ["A", "B", "C", "D"][i];
              const isCorrect = letter === qr.correct;
              const isStudent = letter === qr.student_answer;
              return (
                <div
                  key={i}
                  className={`p-2 rounded-lg text-xs border ${
                    isCorrect
                      ? "border-green-600 bg-green-900/30 text-green-200"
                      : isStudent && !isCorrect
                        ? "border-red-600 bg-red-900/30 text-red-200"
                        : "border-gray-700 text-gray-400"
                  }`}
                >
                  <InlineMD>{opt}</InlineMD>
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          {qr.explanation && (
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-xs text-blue-200 space-y-1">
              <span className="font-semibold text-blue-300 block">Explanation</span>
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{ p: ({ ...props }) => <p className="mb-1" {...props} /> }}
              >{qr.explanation}</ReactMarkdown>
            </div>
          )}

          {(qr.subject || qr.chapter) && (
            <span className="text-xs text-gray-600">{qr.subject}{qr.chapter && ` · ${qr.chapter}`}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExamResultPage() {
  const { sessionId } = useParams();
  const location      = useLocation();
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [result, setResult] = useState(location.state || null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (result) return;
    fetch(`${API}/api/exam/session/${sessionId}/result`, {
      headers: { Authorization: `Bearer ${user?.accessToken}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.detail) navigate("/exam/history");
        else setResult(data);
      })
      .catch(() => navigate("/exam/history"));
  }, [sessionId]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!result) return <div className="text-center py-20 text-gray-400">Loading results…</div>;

  const { score, question_results = [], time_taken = 0 } = result;
  const mins = Math.floor(time_taken / 60);
  const secs = time_taken % 60;

  const pct = score?.percentage ?? 0;
  const scoreColor = pct >= 60 ? "text-green-400" : pct >= 35 ? "text-yellow-400" : "text-red-400";

  const filtered = question_results.filter(qr => {
    if (filter === "correct")     return qr.is_correct;
    if (filter === "wrong")       return !qr.is_correct && qr.student_answer;
    if (filter === "unattempted") return !qr.student_answer;
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-5">

      {/* ── Score card ──────────────────────────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h1 className="text-xl font-bold text-white">Exam Result</h1>
        </div>

        <div className={`text-6xl font-black ${scoreColor}`}>{pct}%</div>
        <div className="text-2xl font-bold text-white">
          {score?.total_marks} / {score?.max_marks} marks
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-900/30 rounded-xl p-3">
            <div className="text-2xl font-bold text-green-400">{score?.correct}</div>
            <div className="text-xs text-gray-400 mt-0.5">Correct</div>
          </div>
          <div className="bg-red-900/30 rounded-xl p-3">
            <div className="text-2xl font-bold text-red-400">{score?.incorrect}</div>
            <div className="text-xs text-gray-400 mt-0.5">Wrong</div>
          </div>
          <div className="bg-gray-700 rounded-xl p-3">
            <div className="text-2xl font-bold text-gray-400">{score?.unattempted}</div>
            <div className="text-xs text-gray-400 mt-0.5">Skipped</div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Time taken: {mins}m {secs}s</span>
        </div>
      </div>

      {/* ── Question review ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Review Questions</h2>
          <div className="flex gap-1">
            {[
              ["all",         "All",    ""],
              ["correct",     "✓",     "text-green-400"],
              ["wrong",       "✗",     "text-red-400"],
              ["unattempted", "–",     "text-gray-400"],
            ].map(([v, l, c]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`px-2.5 py-1 rounded text-xs transition ${
                  filter === v ? "bg-blue-600 text-white" : `bg-gray-700 ${c || "text-gray-400"} hover:text-white`
                }`}
              >{l}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">No questions in this category.</p>
        ) : (
          filtered.map(qr => <QuestionRow key={qr.index} qr={qr} />)
        )}
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate("/exam/setup")}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> New Exam
        </button>
        <button
          onClick={() => navigate("/exam/history")}
          className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition flex items-center justify-center gap-2"
        >
          <History className="w-4 h-4" /> History
        </button>
      </div>
    </div>
  );
}
