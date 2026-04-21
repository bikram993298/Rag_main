import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Copy, Check } from "lucide-react";

export default function Message({ role, text }) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 px-2`}>
      <div
        className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-md transition-all break-words ${
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
                p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-gray-900" {...props} />
                ),
                h1: ({ node, ...props }) => (
                  <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-lg font-bold mt-3 mb-2 text-gray-900" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-base font-bold mt-3 mb-1 text-gray-800 border-b border-gray-300 pb-1" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal ml-5 mb-3 space-y-1" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="leading-relaxed" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-blue-400 pl-3 italic text-gray-600 my-2" {...props} />
                ),
                hr: ({ node, ...props }) => (
                  <hr className="my-3 border-gray-300" {...props} />
                ),
                code: ({ node, inline, className, children, ...props }) =>
                  inline ? (
                    <code className="bg-gray-200 px-1 rounded text-sm text-gray-800" {...props}>
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded-xl overflow-x-auto text-sm my-2">
                      <code>{children}</code>
                    </pre>
                  ),
              }}
            >
              {text}
            </ReactMarkdown>

            {/* Copy button */}
            <div className="flex justify-end mt-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition"
                title="Copy response"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5 text-green-500" /> Copied</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
