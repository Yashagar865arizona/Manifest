"use client";

import { useState } from "react";

export function AskBar() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json();
      setAnswer(data.answer ?? "No response.");
    } catch {
      setAnswer("Failed to get a response. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg mt-4">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Ask your org</h2>
        <p className="text-xs text-gray-400 mt-0.5">e.g. "What&apos;s going on with the engineering team?" or "Who is at risk this week?"</p>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about your team…"
            maxLength={500}
            className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "…" : "Ask"}
          </button>
        </div>
        {answer && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed">{answer}</p>
          </div>
        )}
      </form>
    </div>
  );
}
