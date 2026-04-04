"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface InviteInfo {
  workspaceName: string;
  invitedEmail: string;
  token: string;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invite?token=${token}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          if (data.alreadyAccepted) {
            router.push("/dashboard");
            return;
          }
          throw new Error(data.error);
        }
        setInviteInfo(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, router]);

  async function handleAccept() {
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsAuth) {
          router.push(`/login?callbackUrl=/invite/${token}`);
          return;
        }
        throw new Error(data.error);
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">Loading invite...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Invalid invite</h1>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Link href="/" className="text-sm text-gray-700 font-medium hover:underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (!inviteInfo) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-sm w-full">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-xl">
            📋
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-1">
            You&apos;re invited to join
          </h1>
          <p className="text-xl font-bold text-gray-900 mb-2">{inviteInfo.workspaceName}</p>
          <p className="text-sm text-gray-500 mb-6">
            Daily team check-ins, synthesized into an AI intelligence report for your manager.
            Takes 60 seconds a day.
          </p>

          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-gray-900 text-white py-3 px-4 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors mb-3"
          >
            {accepting ? "Accepting..." : "Accept invitation →"}
          </button>

          <p className="text-xs text-gray-400">
            You&apos;ll need to create an account or log in with {inviteInfo.invitedEmail}
          </p>
        </div>
      </div>
    </div>
  );
}
