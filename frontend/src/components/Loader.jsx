import React from "react";

export default function Loader() {
  return (
    <div className="flex items-center justify-center py-3">
      <div className="flex space-x-2">
        <span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></span>
        <span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:0.15s]"></span>
        <span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:0.3s]"></span>
      </div>
      <p className="ml-3 text-gray-400 text-sm">Assistant is thinking...</p>
    </div>
  );
}
