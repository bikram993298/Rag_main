import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Copy, Check, ThumbsUp, ThumbsDown, Bookmark, BookmarkCheck } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Parse ### 📖 Concept line from response text
function extractConcept(text) {
  const match = text?.match(/###.*?Concept[^\n]*\n+([^\n#]+)/);
  if (!match) return { front: "", back: "" };
  const conceptLine = match[1].trim();
  const tipMatch = text.match(/###.*?Exam Tip[^\n]*\n+([^\n#]+)/);
  const tip = tipMatch ? tipMatch[1].trim() : "";
  return {
    front: conceptLine,
    back: tip || conceptLine,
  };
}

export default function Message({ role, text, topic, subject, accessToken }) {
  const isUser = role === "user";
  const [copied, setCopied]       = useState(false);
  const [feedback, setFeedback]   = useState(null); // "positive" | "negative"
  const [saved, setSaved]         = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = async (isCorrect) => {
    if (feedback || !accessToken || !topic) return;
    setFeedback(isCorrect ? "positive" : "negative");
    await fetch(`${API}/api/chat/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ topic: topic || "General", subject: subject || "General", is_correct: isCorrect }),
    });
  };

  const handleSaveFlashcard = async () => {
    if (saved || !accessToken) return;
    const { front, back } = extractConcept(text);
    if (!front) return;
    setSaved(true);
    await fetch(`${API}/api/flashcards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        front,
        back,
        topic: topic || "General",
        subject: subject || "General",
      }),
    });
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 px-1`}>
      <div
        className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-md break-words ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-100 text-gray-900 border border-gray-300 rounded-bl-none"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{text}</div>
        ) : (
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p:  ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2 text-gray-900" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-3 mb-1 text-gray-800 border-b border-gray-300 pb-1" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-3 space-y-1" {...props} />,
                li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                hr: ({ node, ...props }) => <hr className="my-3 border-gray-300" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-blue-400 pl-3 italic text-gray-600 my-2" {...props} />
                ),
                code: ({ node, inline, className, children, ...props }) =>
                  inline ? (
                    <code className="bg-gray-200 px-1 rounded text-sm text-gray-800" {...props}>{children}</code>
                  ) : (
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-xl overflow-x-auto text-sm my-2">
                      <code>{children}</code>
                    </pre>
                  ),
              }}
            >
              {text}
            </ReactMarkdown>

            {/* Action bar */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
              {/* Feedback buttons */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400 mr-1">Helpful?</span>
                <button
                  onClick={() => handleFeedback(true)}
                  title="Correct answer"
                  className={`p-1.5 rounded-lg transition ${
                    feedback === "positive"
                      ? "bg-green-100 text-green-600"
                      : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  title="Wrong answer"
                  className={`p-1.5 rounded-lg transition ${
                    feedback === "negative"
                      ? "bg-red-100 text-red-600"
                      : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right side: save flashcard + copy */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSaveFlashcard}
                  title="Save as flashcard"
                  className={`p-1.5 rounded-lg transition flex items-center gap-1 text-xs ${
                    saved
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  {saved ? "Saved" : "Save"}
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 transition flex items-center gap-1 text-xs"
                  title="Copy"
                >
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
