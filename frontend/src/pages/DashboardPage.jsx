import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { BookOpen, Target, Flame, TrendingUp, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const SUBJECT_COLORS = {
  Physics:     "bg-blue-500",
  Chemistry:   "bg-green-500",
  Biology:     "bg-purple-500",
  Mathematics: "bg-orange-500",
  General:     "bg-gray-500",
};

function AccuracyBar({ accuracy, asked }) {
  const pct = accuracy ?? 0;
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: accuracy != null ? `${pct}%` : "100%" }}
        />
      </div>
      <span className="text-xs text-gray-400 w-16 text-right">
        {accuracy != null ? `${pct}%` : `${asked} asked`}
      </span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
        <p className="text-xs text-gray-400">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.accessToken) return;
    fetch(`${API}/api/dashboard`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading your report card…
      </div>
    );
  }

  const { stats, subjects, weak_topics, recent_questions } = data ?? {
    stats: {}, subjects: [], weak_topics: [], recent_questions: [],
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {user?.full_name?.split(" ")[0]}'s Report Card
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Your JEE/NEET performance snapshot</p>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Questions Asked" value={stats.total_asked ?? 0} color="bg-blue-600" />
        <StatCard icon={Target}   label="Accuracy" value={stats.accuracy != null ? `${stats.accuracy}%` : "—"} sub="rate answers ✓/✗" color="bg-green-600" />
        <StatCard icon={Flame}    label="Streak" value={`${stats.streak ?? 0}d`} sub="days active" color="bg-orange-600" />
        <StatCard icon={TrendingUp} label="Correct" value={stats.total_correct ?? 0} sub="with feedback" color="bg-purple-600" />
      </div>

      {/* ── Subject Breakdown ─────────────────────────────────────────────── */}
      {subjects.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-base font-semibold text-white mb-4">Subject Breakdown</h2>
          <div className="space-y-3">
            {subjects.map(s => (
              <div key={s.subject}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${SUBJECT_COLORS[s.subject] ?? "bg-gray-500"}`} />
                    <span className="text-gray-200">{s.subject}</span>
                  </span>
                  <span className="text-gray-400">{s.asked} questions</span>
                </div>
                <AccuracyBar accuracy={s.accuracy} asked={s.asked} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Weak Topics ───────────────────────────────────────────────────── */}
      {weak_topics.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-base font-semibold text-white mb-1">Weak Topics</h2>
          <p className="text-xs text-gray-500 mb-4">Topics where you rated answers — needs ≥2 rated answers to appear</p>
          <div className="space-y-3">
            {weak_topics.map(t => (
              <div key={t.topic}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-200 truncate max-w-[65%]">{t.topic}</span>
                  <span className={`text-xs font-semibold ${t.accuracy >= 70 ? "text-green-400" : t.accuracy >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                    {t.accuracy}% accuracy
                  </span>
                </div>
                <AccuracyBar accuracy={t.accuracy} asked={t.asked} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Questions ──────────────────────────────────────────────── */}
      {recent_questions.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-base font-semibold text-white mb-4">Recent Questions</h2>
          <div className="space-y-2">
            {recent_questions.map((q, i) => (
              <button
                key={i}
                onClick={() => navigate("/chat")}
                className="w-full text-left flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition group"
              >
                <span className="text-sm text-gray-200 truncate">{q.text}</span>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 flex-shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!subjects.length && !weak_topics.length && (
        <div className="text-center py-16 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium text-gray-400">No data yet</p>
          <p className="text-sm mt-1">Ask questions in the chat and rate answers with ✓/✗ to build your report card.</p>
          <button
            onClick={() => navigate("/chat")}
            className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition"
          >
            Start Chatting
          </button>
        </div>
      )}
    </div>
  );
}
