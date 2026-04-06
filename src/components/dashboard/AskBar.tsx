"use client";

import { useState } from "react";

interface Source {
  name: string;
  role: string;
  pulse: number;
  alerts: string[];
}

const SUGGESTED_QUESTIONS = [
  "What's going on with the team?",
  "Who is at risk this week?",
  "Who is overloaded?",
  "Are there any stalled projects?",
];

const ALERT_LABELS: Record<string, string> = {
  GHOST_DETECTION: "Gone quiet",
  OVERLOAD: "Overloaded",
  ATTRITION_RISK: "Attrition risk",
  MEETING_DEBT: "Meeting debt",
  STALLED_WORK: "Stalled work",
};

export function AskBar() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setQuestion(trimmed);
    setLoading(true);
    setAnswer(null);
    setSources([]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!res.ok || !res.body) {
        setAnswer("Failed to get a response. Please try again.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(part.slice(6));
            if (event.type === "sources") {
              setSources(event.sources ?? []);
            } else if (event.type === "text") {
              setAnswer((prev) => (prev ?? "") + event.text);
            }
          } catch {
            // malformed chunk — skip
          }
        }
      }
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
          AI-synthesized answers from connected team signals.
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
            placeholder="Ask anything about your team…"
            maxLength={500}
            className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Thinking
              </span>
            ) : (
              "Ask"
            )}
          </button>
        </div>

        {/* Streaming answer */}
        {(answer !== null || loading) && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {answer ?? ""}
              {loading && (
                <span className="inline-block w-1 h-4 bg-gray-400 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </p>

            {/* Sources */}
            {sources.length > 0 && !loading && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-400 mb-2">Signals referenced</p>
                <div className="flex flex-wrap gap-2">
                  {sources.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-md px-2 py-1"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          s.pulse >= 70
                            ? "bg-green-500"
                            : s.pulse >= 40
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      />
                      <span className="font-medium text-gray-700">{s.name}</span>
                      {s.alerts.length > 0 && (
                        <span className="text-gray-400">
                          · {ALERT_LABELS[s.alerts[0]] ?? s.alerts[0]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
