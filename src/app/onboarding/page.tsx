"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LeadershipRole = "CEO" | "MANAGER" | "HR" | "IC";

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

const ROLE_OPTIONS: { value: LeadershipRole; label: string; hint: string }[] = [
  { value: "CEO", label: "CEO", hint: "Full org visibility" },
  { value: "MANAGER", label: "Manager", hint: "Team signals + alerts" },
  { value: "HR", label: "HR", hint: "Wellness + attrition risk" },
  { value: "IC", label: "Team Member", hint: "Check-ins only" },
];

interface InviteRow {
  email: string;
  role: LeadershipRole;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
  );
  const [checkInTime, setCheckInTime] = useState("09:00");
  const [invites, setInvites] = useState<InviteRow[]>([{ email: "", role: "IC" }]);
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

    const validInvites = invites.filter((i) => i.email.trim() && i.email.includes("@"));

    for (const invite of validInvites) {
      try {
        await fetch(`/api/workspaces/${workspaceId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: invite.email.trim(), leadershipRole: invite.role }),
        });
      } catch {
        // Continue even if one invite fails
      }
    }

    setLoading(false);
    router.push(`/dashboard?workspace=${workspaceId}&welcome=1`);
  }

  function updateInvite(index: number, field: keyof InviteRow, value: string) {
    const next = [...invites];
    next[index] = { ...next[index], [field]: value };
    setInvites(next);
  }

  function removeInvite(index: number) {
    setInvites(invites.filter((_, j) => j !== index));
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
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Invite your leadership team</h1>
            <p className="text-sm text-gray-500 mb-6">
              Assign roles so each leader sees the right dashboard. Team members get daily check-in prompts.
            </p>

            <div className="space-y-3 mb-6">
              {invites.map((invite, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="email"
                    value={invite.email}
                    onChange={(e) => updateInvite(i, "email", e.target.value)}
                    placeholder="leader@company.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <select
                    value={invite.role}
                    onChange={(e) => updateInvite(i, "role", e.target.value as LeadershipRole)}
                    className="px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {invites.length > 1 && (
                    <button
                      onClick={() => removeInvite(i)}
                      className="text-gray-400 hover:text-gray-600 px-1 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => setInvites([...invites, { email: "", role: "IC" }])}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <span>+</span> Add another
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-5">
              <p className="text-xs text-gray-500 font-medium mb-1.5">Role access levels</p>
              <div className="space-y-1">
                {ROLE_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex gap-2 text-xs">
                    <span className="font-medium text-gray-700 w-24 shrink-0">{opt.label}</span>
                    <span className="text-gray-500">{opt.hint}</span>
                  </div>
                ))}
              </div>
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
