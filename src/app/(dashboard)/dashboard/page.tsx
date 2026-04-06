export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getWorkspaceSignalSnapshots, computePulseScore } from "@/lib/signals";
import { format, subDays } from "date-fns";
import { AskBar } from "@/components/dashboard/AskBar";
import type { AnomalyType, SignalSeverity } from "@prisma/client";

const SEVERITY_COLOR: Record<SignalSeverity, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
  LOW: "bg-blue-100 text-blue-700 border-blue-200",
};

const ANOMALY_LABEL: Record<AnomalyType, string> = {
  GHOST_DETECTION: "Gone quiet",
  OVERLOAD: "Overloaded",
  ATTRITION_RISK: "Attrition risk",
  MEETING_DEBT: "Meeting debt",
  STALLED_WORK: "Stalled work",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id, status: "ACCEPTED" },
    include: { workspace: true },
  });

  if (!membership) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No workspace yet</h2>
          <p className="text-sm text-gray-500 mb-4">Create your first workspace to get started.</p>
          <a href="/onboarding" className="inline-block bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800">
            Set up workspace →
          </a>
        </div>
      </div>
    );
  }

  const role = membership.leadershipRole;
  const workspace = membership.workspace;

  // ICs have no access to the leadership analytics dashboard
  if (role === "IC") {
    return (
      <div className="p-6 max-w-lg">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">{workspace.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Team Member · {format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-2xl">
            ✅
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-2">You&apos;re all set</h2>
          <p className="text-sm text-gray-500 mb-4">
            You&apos;ll receive a daily check-in prompt at{" "}
            <span className="font-medium">{workspace.checkInTime}</span> ({workspace.timezone}).
            Your responses feed the team intelligence dashboard your manager sees.
          </p>
          <p className="text-xs text-gray-400">
            Questions? Contact your workspace admin.
          </p>
        </div>
      </div>
    );
  }

  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch 7-day pulse history for sparklines
  const sparkHistory = await (async () => {
    try {
      const dates = Array.from({ length: 7 }, (_, i) =>
        format(subDays(new Date(), 6 - i), "yyyy-MM-dd")
      );
      const rows = await db.rawSignal.groupBy({
        by: ["signalDate"],
        where: {
          workspaceId: workspace.id,
          signalDate: { in: dates },
        },
        _avg: { value: true },
        _count: { value: true },
      });
      const byDate = Object.fromEntries(rows.map((r) => [r.signalDate, r._avg.value ?? 50]));
      return dates.map((d) => byDate[d] ?? null);
    } catch {
      return null;
    }
  })();

  const allSnapshots = await getWorkspaceSignalSnapshots(workspace.id, today);

  // Filter by role
  const snapshots = role === "CEO"
    ? allSnapshots
    : role === "HR"
    ? allSnapshots
    : allSnapshots; // Manager: ideally filter to direct reports; for now show all ICs

  const snapWithPulse = snapshots.map((s) => ({ ...s, pulse: computePulseScore(s) }));
  const avgPulse = snapWithPulse.length
    ? Math.round(snapWithPulse.reduce((a, b) => a + b.pulse, 0) / snapWithPulse.length)
    : null;

  const alerts = snapshots.flatMap((s) => s.openAlerts.map((a) => ({ ...a, user: s.userName })));
  const criticalAlerts = alerts.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH");

  const ghostCount = alerts.filter((a) => a.anomalyType === "GHOST_DETECTION").length;
  const overloadCount = alerts.filter((a) => a.anomalyType === "OVERLOAD").length;

  // Connectors connected
  const connectors = await db.connectorCredential.findMany({
    where: { workspaceId: workspace.id, status: "ACTIVE" },
    select: { connectorType: true, teamName: true, lastSyncAt: true },
  });

  const hasData = connectors.length > 0;

  const roleLabel = { CEO: "CEO View", MANAGER: "Manager View", HR: "HR View", IC: "My Signals" }[role];

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{workspace.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{roleLabel} · {format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        {!hasData && (
          <a
            href="/connectors"
            className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-md font-medium hover:bg-gray-800"
          >
            Connect integrations →
          </a>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Team pulse"
          value={avgPulse !== null ? `${avgPulse}/100` : "—"}
          color={avgPulse === null ? "default" : avgPulse >= 70 ? "green" : avgPulse >= 40 ? "yellow" : "red"}
          sparkData={sparkHistory?.filter((v): v is number => v !== null)}
        />
        <MetricCard
          label="Active alerts"
          value={String(criticalAlerts.length)}
          color={criticalAlerts.length === 0 ? "green" : criticalAlerts.length <= 2 ? "yellow" : "red"}
        />
        <MetricCard
          label="Gone quiet"
          value={String(ghostCount)}
          color={ghostCount === 0 ? "green" : "red"}
          sublabel={ghostCount > 0 ? `${ghostCount} person${ghostCount !== 1 ? "s" : ""} inactive` : undefined}
        />
        <MetricCard
          label="Overloaded"
          value={String(overloadCount)}
          color={overloadCount === 0 ? "green" : overloadCount <= 2 ? "yellow" : "red"}
        />
      </div>

      {/* Active alerts */}
      {criticalAlerts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg mb-4">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Alerts requiring attention</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {criticalAlerts.slice(0, 8).map((alert) => (
              <div key={alert.id} className="px-5 py-3 flex items-start gap-3">
                <span className={`mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${SEVERITY_COLOR[alert.severity]}`}>
                  {alert.severity}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                  <p className="text-xs text-gray-500">{alert.detail}</p>
                </div>
                <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
                  {ANOMALY_LABEL[alert.anomalyType]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team pulse table */}
      {hasData && snapWithPulse.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg mb-4">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Team signals</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Person</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Pulse</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Messages</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Commits</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Meetings</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Focus hrs</th>
                <th className="px-5 py-2 text-xs font-medium text-gray-400">Alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {snapWithPulse
                .sort((a, b) => a.pulse - b.pulse)
                .map((s) => (
                  <tr key={s.userId} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{s.userName}</p>
                      <p className="text-xs text-gray-400">{s.leadershipRole}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-sm font-semibold ${s.pulse >= 70 ? "text-green-600" : s.pulse >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                        {s.pulse}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-600">
                      {s.signals.MESSAGE_COUNT ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-600">
                      {s.signals.COMMITS_COUNT ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-600">
                      {s.signals.MEETING_HOURS !== undefined ? `${s.signals.MEETING_HOURS}h` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-600">
                      {s.signals.FOCUS_TIME_HOURS !== undefined ? `${s.signals.FOCUS_TIME_HOURS}h` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {s.openAlerts.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {s.openAlerts.slice(0, 2).map((a) => (
                            <span key={a.id} className={`inline-flex px-1.5 py-0.5 rounded text-xs border ${SEVERITY_COLOR[a.severity]}`}>
                              {ANOMALY_LABEL[a.anomalyType]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No data state */}
      {!hasData && (
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="max-w-md mx-auto text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-xl">
              🔌
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Connect your first integration</h3>
            <p className="text-sm text-gray-500 mb-6">
              Your dashboard is ready — it just needs data. Connect{" "}
              <span className="font-medium text-gray-900">Slack</span> first for the fastest time-to-value:
              message patterns and DM activity are the earliest signal of team health changes.
            </p>
            <div className="space-y-2 text-left mb-6 max-w-xs mx-auto">
              {[
                { icon: "💬", label: "Slack", desc: "Message activity, DM patterns, channel engagement" },
                { icon: "⚙️", label: "GitHub", desc: "PR velocity, commits, stalled work" },
                { icon: "📅", label: "Google Calendar", desc: "Meeting load, focus time, 1:1 cadence" },
              ].map((i) => (
                <div key={i.label} className="flex items-start gap-3 text-xs text-gray-500">
                  <span className="mt-0.5">{i.icon}</span>
                  <span><span className="font-medium text-gray-700">{i.label}</span> — {i.desc}</span>
                </div>
              ))}
            </div>
            <a
              href="/connectors"
              className="inline-block bg-gray-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
            >
              Set up integrations →
            </a>
          </div>
        </div>
      )}

      {/* Ask interface */}
      <AskBar />
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 56;
  const h = 22;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true">
      <polyline points={points} stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function MetricCard({
  label,
  value,
  color,
  sublabel,
  sparkData,
}: {
  label: string;
  value: string;
  color: "green" | "red" | "yellow" | "default";
  sublabel?: string;
  sparkData?: number[];
}) {
  const dotColors = { green: "bg-green-500", red: "bg-red-500", yellow: "bg-yellow-500", default: "bg-gray-300" };
  const sparkColors = { green: "#059669", red: "#DC2626", yellow: "#D97706", default: "#94A3B8" };
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
          <p className="text-xs text-gray-500">{label}</p>
        </div>
        {sparkData && <Sparkline data={sparkData} color={sparkColors[color]} />}
      </div>
      <p className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}
