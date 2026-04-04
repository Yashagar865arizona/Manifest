"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface TokenInfo {
  valid: boolean;
  alreadySubmitted: boolean;
  workspaceName: string;
  memberName: string | null;
  checkInDate: string;
}

export default function CheckInPage() {
  const params = useParams();
  const token = params.token as string;

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/check-ins/${token}`)
      .then((r) => r.json())
      .then(setTokenInfo)
      .catch(() => setError("Failed to load check-in"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, content: content.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.alreadySubmitted) {
          setSubmitted(true);
          return;
        }
        throw new Error(data.error ?? "Submission failed");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (error && !tokenInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (tokenInfo?.alreadySubmitted || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Check-in submitted</h1>
          <p className="text-sm text-gray-500">
            {tokenInfo?.workspaceName
              ? `Your update has been added to ${tokenInfo.workspaceName}. See you tomorrow.`
              : "Your check-in has been submitted. See you tomorrow."}
          </p>
        </div>
      </div>
    );
  }

  if (!tokenInfo?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Link expired</h1>
          <p className="text-sm text-gray-500">This check-in link is no longer valid. Check your email for a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-lg w-full">
        <div className="mb-8">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
            {tokenInfo.workspaceName}
          </p>
          <h1 className="text-xl font-semibold text-gray-900">
            {tokenInfo.memberName ? `Hi ${tokenInfo.memberName} —` : "Daily check-in"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">60-second update for {tokenInfo.checkInDate}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5">✅</span>
              <p className="text-sm text-gray-700">What did you complete since your last check-in?</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5">🎯</span>
              <p className="text-sm text-gray-700">What&apos;s your plan for today?</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5">🚧</span>
              <p className="text-sm text-gray-700">Anything blocking you?</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write freely — a few sentences is enough. No formatting required."
              rows={5}
              maxLength={5000}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{content.length}/5000</p>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Submitting..." : "Submit check-in →"}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Your response is read by your manager, not shared publicly.
        </p>
      </div>
    </div>
  );
}
