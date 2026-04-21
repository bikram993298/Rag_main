import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Trash2 } from "lucide-react";
import Message from "./Message";
import Loader from "./Loader";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const EXAM_MODES = ["JEE Main", "JEE Advanced", "NEET"];
const MARKS_OPTIONS = [4, 8];
const LANG_OPTIONS = [
  { value: "english",  label: "English" },
  { value: "hinglish", label: "हिं+EN" },
];

export default function ChatBox() {
  const [input, setInput]           = useState("");
  const [messages, setMessages]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [examMode, setExamMode]     = useState("JEE Main");
  const [marks, setMarks]           = useState(4);
  const [language, setLanguage]     = useState("english");
  const chatEndRef = useRef(null);
  const { user } = useAuth();

  // ── Load history on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.accessToken) return;
    fetch(`${API}/api/chat/history`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    })
      .then(r => r.json())
      .then(data => { if (data.messages?.length) setMessages(data.messages); })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [user?.accessToken]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg    = { role: "user", text: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.accessToken}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          exam_mode: examMode,
          marks,
          language,
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: data.answer || "No response received.",
          topic: data.topic,
          subject: data.subject,
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: `⚠️ Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, examMode, marks, language, user?.accessToken]);

  // ── Clear history ──────────────────────────────────────────────────────────
  const clearHistory = async () => {
    if (!window.confirm("Clear your entire chat history?")) return;
    await fetch(`${API}/api/chat/history`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${user?.accessToken}` },
    });
    setMessages([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 5rem)" }}>

      {/* ── Mode selector bar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Exam mode */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {EXAM_MODES.map(mode => (
            <button
              key={mode}
              onClick={() => setExamMode(mode)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                examMode === mode
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Marks */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {MARKS_OPTIONS.map(m => (
            <button
              key={m}
              onClick={() => setMarks(m)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                marks === m
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {m}M
            </button>
          ))}
        </div>

        {/* Language */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {LANG_OPTIONS.map(l => (
            <button
              key={l.value}
              onClick={() => setLanguage(l.value)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                language === l.value
                  ? "bg-green-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <button
          onClick={clearHistory}
          title="Clear chat history"
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 hover:text-white transition"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </button>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-800 rounded-xl space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {historyLoading ? (
          <p className="text-center text-gray-500 text-sm mt-8">Loading your history…</p>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-8 space-y-1">
            <p className="text-base font-medium text-gray-400">Ask any JEE / NEET question</p>
            <p>Mode: <span className="text-blue-400">{examMode}</span> · <span className="text-purple-400">{marks} marks</span> · <span className="text-green-400">{language}</span></p>
          </div>
        ) : (
          messages.map((m, i) => (
            <Message
              key={i}
              role={m.role}
              text={m.text}
              topic={m.topic}
              subject={m.subject}
              accessToken={user?.accessToken}
            />
          ))
        )}
        {loading && <Loader />}
        <div ref={chatEndRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────────────────────── */}
      <div className="flex items-end gap-3 mt-3">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask a ${examMode} question… (Shift+Enter for new line)`}
          rows={2}
          className="flex-1 resize-none rounded-lg p-3 bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className={`px-5 py-2.5 rounded-lg font-semibold transition ${
            loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-95"
          }`}
        >
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
