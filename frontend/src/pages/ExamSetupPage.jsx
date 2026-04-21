import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpen, ChevronDown, ChevronRight, Loader2, Clock, Target, Zap } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const EXAM_MODES = [
  { id: "JEE Main",     desc: "+4 / -1  ·  2 min/Q",  color: "blue"   },
  { id: "JEE Advanced", desc: "+4 / -2  ·  3 min/Q",  color: "purple" },
  { id: "NEET",         desc: "+4 / -1  ·  1.5 min/Q", color: "green"  },
  { id: "Practice",     desc: "+4 /  0  ·  2 min/Q",  color: "gray"   },
];

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard", "mixed"];

const TIME_MAP = { "JEE Main": 120, "JEE Advanced": 200, "NEET": 80, "Practice": 120 };

function formatTime(secs) {
  if (secs >= 3600) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  return `${Math.floor(secs / 60)} min`;
}

export default function ExamSetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]           = useState(1);
  const [examMode, setExamMode]   = useState("JEE Main");
  const [chapterMap, setChapterMap] = useState({});
  const [selected, setSelected]   = useState({});   // key: "Subject::Chapter"
  const [expanded, setExpanded]   = useState({});
  const [numQ, setNumQ]           = useState(20);
  const [difficulty, setDifficulty] = useState("mixed");
  const [generating, setGenerating] = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    fetch(`${API}/api/exam/chapters`, {
      headers: { Authorization: `Bearer ${user?.accessToken}` },
    })
      .then(r => r.json())
      .then(setChapterMap)
      .catch(() => {});
  }, [user?.accessToken]);

  const toggleChapter = (subject, chapter) => {
    const key = `${subject}::${chapter}`;
    setSelected(prev => {
      const next = { ...prev };
      next[key] ? delete next[key] : (next[key] = { subject, chapter });
      return next;
    });
  };

  const toggleSubject = (subject, chapters) => {
    const allOn = chapters.every(ch => selected[`${subject}::${ch}`]);
    setSelected(prev => {
      const next = { ...prev };
      chapters.forEach(ch => {
        const k = `${subject}::${ch}`;
        allOn ? delete next[k] : (next[k] = { subject, chapter: ch });
      });
      return next;
    });
  };

  const selectedList = Object.values(selected);
  const subjects     = [...new Set(selectedList.map(s => s.subject))];
  const chapters     = selectedList.map(s => s.chapter);
  const timeSecs     = TIME_MAP[examMode] * numQ;

  const handleGenerate = async () => {
    if (!selectedList.length) { setError("Select at least one chapter"); return; }
    setError("");
    setGenerating(true);
    try {
      const res = await fetch(`${API}/api/exam/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.accessToken}`,
        },
        body: JSON.stringify({ exam_mode: examMode, subjects, chapters, num_questions: numQ, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      navigate(`/exam/${data.session_id}`, { state: data });
    } catch (e) {
      setError(e.message);
      setGenerating(false);
    }
  };

  /* ── Step dots ──────────────────────────────────────────────────────────── */
  const StepDots = () => (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map(s => (
        <React.Fragment key={s}>
          <button
            onClick={() => s < step && setStep(s)}
            className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition ${
              step === s ? "bg-blue-600 text-white" :
              step > s  ? "bg-green-700 text-white cursor-pointer" :
              "bg-gray-700 text-gray-400"
            }`}
          >{s}</button>
          {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? "bg-green-700" : "bg-gray-700"}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-400" /> Create Exam
        </h1>
        <p className="text-gray-400 text-sm mt-1">AI-generated questions tailored to your selection</p>
      </div>

      <StepDots />

      {/* ── Step 1: Exam Mode ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Choose Exam Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {EXAM_MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setExamMode(m.id)}
                className={`p-4 rounded-xl border-2 text-left transition ${
                  examMode === m.id
                    ? "border-blue-500 bg-blue-900/30"
                    : "border-gray-700 bg-gray-800 hover:border-gray-500"
                }`}
              >
                <div className="font-bold text-white text-sm">{m.id}</div>
                <div className="text-xs text-gray-400 mt-1">{m.desc}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
          >
            Next: Select Chapters →
          </button>
        </div>
      )}

      {/* ── Step 2: Chapters ──────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Select Chapters</h2>
            <span className="text-xs text-blue-400">{selectedList.length} selected</span>
          </div>

          {Object.entries(chapterMap).map(([subject, chs]) => {
            const allOn  = chs.every(ch => selected[`${subject}::${ch}`]);
            const someOn = chs.some(ch  => selected[`${subject}::${ch}`]);
            const open   = expanded[subject];
            return (
              <div key={subject} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-750"
                  onClick={() => setExpanded(e => ({ ...e, [subject]: !e[subject] }))}
                >
                  <input
                    type="checkbox"
                    checked={allOn}
                    ref={el => el && (el.indeterminate = someOn && !allOn)}
                    onChange={e => { e.stopPropagation(); toggleSubject(subject, chs); }}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="flex-1 font-medium text-white">{subject}</span>
                  <span className="text-xs text-gray-500">
                    {chs.filter(ch => selected[`${subject}::${ch}`]).length}/{chs.length}
                  </span>
                  {open
                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                    : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
                {open && (
                  <div className="border-t border-gray-700 p-3 grid grid-cols-2 gap-y-2 gap-x-3">
                    {chs.map(ch => (
                      <label key={ch} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={!!selected[`${subject}::${ch}`]}
                          onChange={() => toggleChapter(subject, ch)}
                          className="w-3.5 h-3.5 accent-blue-500 flex-shrink-0"
                        />
                        <span className="text-xs text-gray-300 group-hover:text-white transition leading-tight">{ch}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition">
              ← Back
            </button>
            <button
              onClick={() => {
                if (!selectedList.length) { setError("Select at least one chapter"); return; }
                setError(""); setStep(3);
              }}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
            >
              Next: Configure →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Configure ─────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-white">Configure Exam</h2>

          {/* Num questions */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Number of Questions</label>
              <span className="text-blue-400 font-bold text-xl">{numQ}</span>
            </div>
            <input
              type="range" min={5} max={50} step={5} value={numQ}
              onChange={e => setNumQ(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              {[5,15,25,35,50].map(n => <span key={n}>{n}</span>)}
            </div>
          </div>

          {/* Difficulty */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-3">
            <label className="text-sm font-medium text-gray-300">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize border transition ${
                    difficulty === d
                      ? "border-blue-500 bg-blue-900/30 text-white"
                      : "border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-300 mb-2">Exam Summary</p>
            <div className="flex items-start gap-2 text-sm text-gray-400">
              <Target className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <span>{examMode} · {subjects.join(", ")} · {selectedList.length} chapters</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4 text-green-400" />
              <span>{numQ} questions · {formatTime(timeSecs)} total</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="capitalize">{difficulty} difficulty · AI-generated</span>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition">
              ← Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Questions…</>
                : "Generate Exam →"}
            </button>
          </div>

          {generating && (
            <p className="text-center text-xs text-gray-500">
              AI is crafting {numQ} questions… this takes 10–20 seconds.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
