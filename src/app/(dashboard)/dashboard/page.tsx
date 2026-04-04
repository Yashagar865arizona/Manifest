export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { getWorkspaceGhostStatuses } from "@/lib/ghost";
import type { SynthesisOutput } from "@/lib/openai";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Get user's managed workspaces
  const memberships = await db.workspaceMember.findMany({
    where: {
      userId: session.user.id,
      role: "MANAGER",
      status: "ACCEPTED",
    },
    include: {
      workspace: {
        include: {
          subscription: true,
          _count: { select: { members: { where: { status: "ACCEPTED" } } } },
        },
      },
    },
  });

  if (memberships.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No workspace yet</h2>
          <p className="text-sm text-gray-500 mb-4">Create your first workspace to get started.</p>
          <a
            href="/onboarding"
            className="inline-block bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Set up workspace →
          </a>
        </div>
      </div>
    );
  }

  const workspace = memberships[0].workspace;
  const today = format(new Date(), "yyyy-MM-dd");

  // Get today's synthesis report
  const synthesisReport = await db.synthesisReport.findUnique({
    where: {
      workspaceId_reportDate: {
        workspaceId: workspace.id,
        reportDate: today,
      },
    },
  });

  const structured = synthesisReport?.structuredData as unknown as SynthesisOutput | null;

  // Get ghost statuses
  const ghostStatuses = await getWorkspaceGhostStatuses(workspace.id, today);
  const ghosts = ghostStatuses.filter((g) => g.isGhost);

  // Get today's check-in stats
  const memberCount = await db.workspaceMember.count({
    where: { workspaceId: workspace.id, status: "ACCEPTED", role: "MEMBER" },
  });
  const checkedInToday = await db.checkIn.count({
    where: { workspaceId: workspace.id, checkInDate: today, tokenUsed: true },
  });

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{workspace.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium text-gray-900">{checkedInToday}</span>
            <span>/ {memberCount} checked in today</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="Checked in today"
          value={`${checkedInToday}/${memberCount}`}
          color={checkedInToday === memberCount ? "green" : "default"}
        />
        <MetricCard
          label="Ghost alerts"
          value={ghosts.length.toString()}
          color={ghosts.length > 0 ? "red" : "green"}
          sublabel={ghosts.length > 0 ? `${ghosts.length} member${ghosts.length !== 1 ? "s" : ""} inactive 3+ days` : undefined}
        />
        <MetricCard
          label="Team health"
          value={structured ? `${structured.teamHealthScore}/100` : "—"}
          color={
            structured
              ? structured.teamHealthScore >= 70
                ? "green"
                : structured.teamHealthScore >= 40
                ? "yellow"
                : "red"
              : "default"
          }
        />
      </div>

      {/* AI Intelligence Report */}
      <div className="bg-white border border-gray-200 rounded-lg mb-4">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Today&apos;s Intelligence Report</h2>
          <p className="text-xs text-gray-400 mt-0.5">AI-synthesized from team check-ins</p>
        </div>
        <div className="p-5">
          {synthesisReport ? (
            <div className="space-y-5">
              {/* Narrative */}
              <p className="text-sm text-gray-700 leading-relaxed">{synthesisReport.reportText}</p>

              {/* Blockers */}
              {structured?.blockers && structured.blockers.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Blockers requiring action
                  </h3>
                  <div className="space-y-2">
                    {structured.blockers.map((b, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-md ${
                          b.actionRequired ? "bg-red-50 border border-red-100" : "bg-yellow-50 border border-yellow-100"
                        }`}
                      >
                        <span className="text-base mt-0.5">{b.actionRequired ? "🔴" : "🟡"}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{b.member}</p>
                          <p className="text-sm text-gray-600">{b.blocker}</p>
                          {b.consecutiveDays > 1 && (
                            <p className="text-xs text-gray-400 mt-1">
                              Flagged {b.consecutiveDays} consecutive days
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Welfare signals */}
              {structured?.welfareSignals && structured.welfareSignals.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Welfare signals
                  </h3>
                  <div className="space-y-2">
                    {structured.welfareSignals.map((w, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
                        <span className="text-base mt-0.5">
                          {w.severity === "high" ? "🔵" : w.severity === "medium" ? "💙" : "ℹ️"}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{w.member}</p>
                          <p className="text-sm text-gray-600">{w.signal}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Anomalies */}
              {structured?.anomalies && structured.anomalies.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Pattern anomalies
                  </h3>
                  <div className="space-y-2">
                    {structured.anomalies.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-md">
                        <span className="text-base mt-0.5">⚠️</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {a.member} — <span className="capitalize">{a.type}</span>
                          </p>
                          <p className="text-sm text-gray-600">{a.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">
                {checkedInToday === 0
                  ? "No check-ins submitted yet today. Report will be generated after check-ins are received."
                  : `${checkedInToday} check-in${checkedInToday !== 1 ? "s" : ""} received. AI report will be generated after the check-in window closes.`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ghost Alerts */}
      {ghosts.length > 0 && (
        <div className="bg-white border border-red-200 rounded-lg">
          <div className="px-5 py-4 border-b border-red-100">
            <h2 className="text-sm font-semibold text-red-700">
              Ghost Alerts — {ghosts.length} member{ghosts.length !== 1 ? "s" : ""} inactive
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {ghosts.map((g) => (
              <div key={g.userId} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{g.memberName}</p>
                  <p className="text-xs text-gray-400">{g.memberEmail}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                    {g.consecutiveMisses} days missed
                  </span>
                  {g.lastCheckInDate && (
                    <p className="text-xs text-gray-400 mt-0.5">Last: {g.lastCheckInDate}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
  sublabel,
}: {
  label: string;
  value: string;
  color: "green" | "red" | "yellow" | "default";
  sublabel?: string;
}) {
  const dotColors = {
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    default: "bg-gray-300",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}
