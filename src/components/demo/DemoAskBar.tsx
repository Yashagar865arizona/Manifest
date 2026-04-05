"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";

const SUGGESTED_QUESTIONS = [
  "Who is at risk this week?",
  "What's going on in engineering?",
  "Who is overloaded?",
  "Give me a full summary",
];

export function DemoAskBar() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setQuestion(trimmed);
    setLoading(true);
    setAnswer(null);
    track("demo_ask_submitted", { question: trimmed.slice(0, 100) });
    try {
      const res = await fetch("/api/demo/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
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
        <p className="text-xs text-gray-400 mt-0.5">
          Powered by AI synthesis on live team signals. Try a suggested question below.
        </p>
      </div>

      {/* Suggested questions */}
      <div className="px-5 pt-3 flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handleSubmit(q)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-gray-50 hover:bg-gray-100"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(question);
        }}
        className="px-5 pt-3 pb-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about the Axiom Labs team…"
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
