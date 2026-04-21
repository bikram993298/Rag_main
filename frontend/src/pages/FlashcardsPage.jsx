import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Layers, RotateCcw, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function CardFlip({ card, onReview, onDelete }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-4">
      {/* Front */}
      <div className="min-h-[80px] flex items-center">
        <p className="text-white font-medium text-lg leading-relaxed">{card.front}</p>
      </div>

      {!flipped ? (
        <button
          onClick={() => setFlipped(true)}
          className="w-full py-2.5 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition text-sm flex items-center justify-center gap-2"
        >
          <ChevronDown className="w-4 h-4" /> Show Answer
        </button>
      ) : (
        <>
          <div className="border-t border-gray-700 pt-4">
            <p className="text-blue-300 text-sm mb-1 font-medium">Answer</p>
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{card.back}</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => onReview(card.id, 0)} className="flex-1 py-2 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-300 text-sm font-medium transition">
              Forgot
            </button>
            <button onClick={() => onReview(card.id, 1)} className="flex-1 py-2 rounded-lg bg-yellow-900/40 hover:bg-yellow-800/60 text-yellow-300 text-sm font-medium transition">
              Hard
            </button>
            <button onClick={() => onReview(card.id, 2)} className="flex-1 py-2 rounded-lg bg-green-900/40 hover:bg-green-800/60 text-green-300 text-sm font-medium transition">
              Easy
            </button>
          </div>
        </>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded">{card.subject} · {card.topic}</span>
        <button onClick={() => onDelete(card.id)} className="text-gray-600 hover:text-red-400 transition">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function FlashcardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [dueCount, setDueCount] = useState(0);
  const [dueOnly, setDueOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewed, setReviewed] = useState(new Set());

  const fetchCards = useCallback(() => {
    if (!user?.accessToken) return;
    const url = `${API}/api/flashcards${dueOnly ? "?due_only=true" : ""}`;
    fetch(url, { headers: { Authorization: `Bearer ${user.accessToken}` } })
      .then(r => r.json())
      .then(data => {
        setCards(data.cards ?? []);
        setDueCount(data.due_count ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.accessToken, dueOnly]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const handleReview = async (id, quality) => {
    await fetch(`${API}/api/flashcards/${id}/review`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
      body: JSON.stringify({ quality }),
    });
    setReviewed(prev => new Set([...prev, id]));
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/api/flashcards/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const visibleCards = dueOnly ? cards : cards;
  const reviewedToday = reviewed.size;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-400" /> Flashcards
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {dueCount > 0 ? (
              <span className="text-yellow-400 font-medium">{dueCount} cards due today</span>
            ) : (
              "All caught up! No cards due."
            )}
            {reviewedToday > 0 && <span className="ml-2 text-green-400">· {reviewedToday} reviewed</span>}
          </p>
        </div>
        <button
          onClick={() => { setDueOnly(v => !v); setLoading(true); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition ${
            dueOnly ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {dueOnly ? "Due Only" : "All Cards"}
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-12">Loading flashcards…</p>
      ) : visibleCards.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium text-gray-400">
            {dueOnly ? "No cards due right now" : "No flashcards yet"}
          </p>
          <p className="text-sm mt-1">
            Save answers from the chat using the bookmark button to create flashcards automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleCards.map(card => (
            <CardFlip
              key={card.id}
              card={card}
              onReview={handleReview}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
