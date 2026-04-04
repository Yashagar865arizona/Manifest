"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const CHECKIN_TIMES = [
  "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30",
  "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
  );
  const [checkInTime, setCheckInTime] = useState("09:00");
  const [inviteEmails, setInviteEmails] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  async function createWorkspace() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone, checkInTime }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setWorkspaceId(data.id);
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  }

  async function inviteTeam() {
    if (!workspaceId) return;
    setLoading(true);

    const validEmails = inviteEmails.filter((e) => e.trim() && e.includes("@"));

    for (const email of validEmails) {
      try {
        await fetch(`/api/workspaces/${workspaceId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
      } catch {
        // Continue even if one invite fails
      }
    }

    setLoading(false);
    router.push(`/dashboard?workspace=${workspaceId}&welcome=1`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-gray-900" : "bg-gray-200"}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-gray-900" : "bg-gray-200"}`} />
        </div>

        {step === 1 && (
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Set up your workspace</h1>
            <p className="text-sm text-gray-500 mb-6">This takes about 2 minutes.</p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Team name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Engineering Team, Product, Acme Corp..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Daily check-in time</label>
                <p className="text-xs text-gray-400 mb-2">We&apos;ll send check-in emails at this time in the workspace timezone.</p>
                <div className="grid grid-cols-4 gap-2">
                  {CHECKIN_TIMES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCheckInTime(t)}
                      className={`py-2 px-3 text-xs rounded-md border transition-colors ${
                        checkInTime === t
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-300 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                onClick={createWorkspace}
                disabled={!name.trim() || loading}
                className="w-full bg-gray-900 text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loading ? "Creating..." : "Create workspace →"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Invite your team</h1>
            <p className="text-sm text-gray-500 mb-6">
              Each person will receive an invitation email and daily check-in prompts.
            </p>

            <div className="space-y-3 mb-6">
              {inviteEmails.map((email, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const next = [...inviteEmails];
                      next[i] = e.target.value;
                      setInviteEmails(next);
                    }}
                    placeholder="teammate@company.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  {inviteEmails.length > 1 && (
                    <button
                      onClick={() => setInviteEmails(inviteEmails.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-gray-600 px-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => setInviteEmails([...inviteEmails, ""])}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <span>+</span> Add another
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={inviteTeam}
                disabled={loading}
                className="w-full bg-gray-900 text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending invites..." : "Send invites & go to dashboard →"}
              </button>

              <button
                onClick={() => router.push(`/dashboard?workspace=${workspaceId}`)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
