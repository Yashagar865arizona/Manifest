"use client";

import { useState, useEffect } from "react";

interface Member {
  id: string;
  invitedEmail: string;
  role: "MANAGER" | "MEMBER";
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  joinedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

interface Workspace {
  id: string;
  name: string;
  checkInTime: string;
  timezone: string;
}

export default function TeamPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((workspaces) => {
        if (workspaces.length > 0) {
          const ws = workspaces.find((w: Workspace & { role: string }) => w.role === "MANAGER") ?? workspaces[0];
          setWorkspace(ws);
          return fetch(`/api/workspaces/${ws.id}/members`);
        }
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data) setMembers(data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !inviteEmail.trim()) return;

    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInviteSuccess(true);
      setInviteEmail("");
      setMembers((prev) => [...prev, data]);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-400">Loading team...</div>;
  }

  if (!workspace) {
    return <div className="p-6 text-sm text-gray-400">No workspace found.</div>;
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Team</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {workspace.name} · Check-ins at {workspace.checkInTime} ({workspace.timezone})
        </p>
      </div>

      {/* Invite form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Invite a team member</h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@company.com"
            required
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <button
            type="submit"
            disabled={inviting}
            className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {inviting ? "Sending..." : "Send invite"}
          </button>
        </form>
        {inviteError && <p className="text-sm text-red-500 mt-2">{inviteError}</p>}
        {inviteSuccess && (
          <p className="text-sm text-green-600 mt-2">Invite sent successfully.</p>
        )}
      </div>

      {/* Member list */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Members ({members.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {members.map((member) => (
            <div key={member.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                  {(member.user?.name ?? member.invitedEmail)[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {member.user?.name ?? member.invitedEmail}
                  </p>
                  <p className="text-xs text-gray-400">{member.user?.email ?? member.invitedEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    member.role === "MANAGER"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {member.role === "MANAGER" ? "Manager" : "Member"}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    member.status === "ACCEPTED"
                      ? "bg-green-50 text-green-700"
                      : member.status === "PENDING"
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-gray-50 text-gray-500"
                  }`}
                >
                  {member.status === "ACCEPTED"
                    ? "Active"
                    : member.status === "PENDING"
                    ? "Invite pending"
                    : "Declined"}
                </span>
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              No team members yet. Invite someone above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
