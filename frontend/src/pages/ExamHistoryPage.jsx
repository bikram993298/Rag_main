import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpen, Clock, CheckCircle2, XCircle, MinusCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export default function ExamHistoryPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`${API}/api/exam/sessions`, {
      headers: { Authorization: `Bearer ${user?.accessToken}` },
    })
      .then(r => r.json())
      .then(d => setSessions(d.sessions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.accessToken]);

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-400" /> Exam History
        </h1>
        <button
          onClick={() => navigate("/exam/setup")}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition"
        >
          + New Exam
        </button>
      </div>

      {loading ? (
        <p className="text-center py-12 text-gray-500">Loading…</p>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-500 space-y-3">
          <BookOpen className="w-12 h-12 mx-auto opacity-20" />
          <p className="text-lg font-medium text-gray-400">No exams taken yet</p>
          <button
            onClick={() => navigate("/exam/setup")}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition"
          >
            Take your first exam →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const pct   = s.score?.percentage ?? 0;
            const color = pct >= 60 ? "text-green-400" : pct >= 35 ? "text-yellow-400" : "text-red-400";
            const mins  = Math.floor((s.time_taken || 0) / 60);
            const date  = s.submitted_at
              ? new Date(s.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
              : "";

            return (
              <button
                key={s.session_id}
                onClick={() => navigate(`/exam/${s.session_id}/result`)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-left hover:border-gray-500 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">{s.exam_mode}</div>
                    <div className="text-xs text-gray-400 mt-1 truncate">
                      {(s.subjects || []).join(", ")}
                      {(s.chapters || []).length > 0 && (
                        <> · {(s.chapters || []).slice(0, 3).join(", ")}
                          {(s.chapters || []).length > 3 && "…"}</>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-2xl font-black ${color}`}>{pct}%</div>
                    <div className="text-xs text-gray-500">
                      {s.score?.total_marks}/{s.score?.max_marks}M
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {mins}m
                  </span>
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle2 className="w-3 h-3" /> {s.score?.correct}
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-3 h-3" /> {s.score?.incorrect}
                  </span>
                  <span className="flex items-center gap-1">
                    <MinusCircle className="w-3 h-3" /> {s.score?.unattempted}
                  </span>
                  {date && <span className="ml-auto">{date}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
