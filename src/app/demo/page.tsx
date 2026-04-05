import { getDemoSnapshot, getDemoAlerts, getDemoStats } from "@/lib/demo-data";
import type { DemoAnomalyType, DemoSeverity } from "@/lib/demo-data";
import { DemoAskBar } from "@/components/demo/DemoAskBar";
import { DemoRoleLink } from "@/components/demo/DemoRoleLink";

export const metadata = {
  title: "Manifest — Live Demo: Axiom Labs",
  description:
    "See Manifest in action with a fully-populated demo workspace. No signup required.",
};

type DemoRole = "ceo" | "manager" | "hr";

const SEVERITY_COLOR: Record<DemoSeverity, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
  LOW: "bg-blue-100 text-blue-700 border-blue-200",
};

const ANOMALY_LABEL: Record<DemoAnomalyType, string> = {
  GHOST_DETECTION: "Gone quiet",
  OVERLOAD: "Overloaded",
  ATTRITION_RISK: "Attrition risk",
  MEETING_DEBT: "Meeting debt",
  STALLED_WORK: "Stalled work",
};

const ROLE_LABELS: Record<DemoRole, string> = {
  ceo: "CEO View",
  manager: "Manager View (Engineering)",
  hr: "HR View",
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  const role: DemoRole =
    params.role === "manager" ? "manager" : params.role === "hr" ? "hr" : "ceo";

  const employees = getDemoSnapshot(role);
  const alerts = getDemoAlerts(role);
  const stats = getDemoStats(role);

  const criticalAlerts = alerts.filter(
    (a) => a.severity === "CRITICAL" || a.severity === "HIGH"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Banner */}
      <div className="bg-gray-900 text-white px-4 py-2.5 text-center text-sm">
        <span className="font-medium">Demo workspace</span>
        <span className="text-gray-400 mx-2">·</span>
        <span className="text-gray-300">Axiom Labs — 45 people, read-only synthetic data</span>
        <span className="text-gray-400 mx-2">·</span>
        <a href="/signup" className="underline text-gray-200 hover:text-white font-medium">
          Start your free trial →
        </a>
      </div>

      <div className="flex h-[calc(100vh-40px)]">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <span className="text-sm font-bold tracking-tight text-gray-900">
              AI Leadership OS
            </span>
          </div>

          <nav className="flex-1 p-3 space-y-0.5">
            {(["ceo", "manager", "hr"] as DemoRole[]).map((r) => (
              <DemoRoleLink key={r} role={r} active={role === r}>
                <RoleIcon role={r} />
                {r === "ceo" ? "CEO" : r === "manager" ? "Eng Manager" : "HR"}
              </DemoRoleLink>
            ))}

            <div className="pt-3 border-t border-gray-100 mt-3">
              <div className="px-3 py-2 text-xs text-gray-400 font-medium uppercase tracking-wide">
                Navigation
              </div>
              {[
                { label: "Dashboard", active: true },
                { label: "Integrations", active: false },
                { label: "Org structure", active: false },
                { label: "Members", active: false },
                { label: "Reports", active: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm ${
                    item.active
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {item.label}
                  {!item.active && (
                    <span className="ml-auto text-xs text-gray-300 italic">demo</span>
                  )}
                </div>
              ))}
            </div>
          </nav>

          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                D
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">Daniel Park</p>
                <p className="text-xs text-gray-400 truncate">CEO · demo</p>
              </div>
            </div>
            <a
              href="/signup"
              className="block w-full text-center px-3 py-2 text-xs font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Get started free →
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-5xl">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Axiom Labs</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {ROLE_LABELS[role]} · {stats.totalEmployees} people · April 5, 2026
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  Demo mode
                </span>
              </div>
            </div>

            {/* Role context banner */}
            {role === "manager" && (
              <div className="mb-5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                <strong>Engineering Manager view</strong> — You are Marcus Chen, VP Engineering. You see your 15-person team. Two of your ICs are flagged.
              </div>
            )}
            {role === "hr" && (
              <div className="mb-5 px-4 py-3 bg-purple-50 border border-purple-100 rounded-lg text-sm text-purple-700">
                <strong>HR view</strong> — Sorted by attrition risk and pulse score. Tenure data visible. Diana Walsh (14 months) is your most urgent signal.
              </div>
            )}

            {/* Metric cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <MetricCard
                label="Team pulse"
                value={`${stats.avgPulse}/100`}
                color={stats.avgPulse >= 70 ? "green" : stats.avgPulse >= 40 ? "yellow" : "red"}
              />
              <MetricCard
                label="Active alerts"
                value={String(stats.criticalAlerts)}
                color={stats.criticalAlerts === 0 ? "green" : stats.criticalAlerts <= 2 ? "yellow" : "red"}
              />
              <MetricCard
                label="Gone quiet"
                value={String(stats.ghostCount)}
                color={stats.ghostCount === 0 ? "green" : "red"}
                sublabel={stats.ghostCount > 0 ? `${stats.ghostCount} person inactive 10d` : undefined}
              />
              <MetricCard
                label="Overloaded"
                value={String(stats.overloadCount)}
                color={stats.overloadCount === 0 ? "green" : stats.overloadCount <= 2 ? "yellow" : "red"}
              />
            </div>

            {/* Active alerts */}
            {criticalAlerts.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg mb-4">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Alerts requiring attention
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {criticalAlerts.map((alert) => (
                    <div key={alert.id} className="px-5 py-3 flex items-start gap-3">
                      <span
                        className={`mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${SEVERITY_COLOR[alert.severity]}`}
                      >
                        {alert.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{alert.detail}</p>
                      </div>
                      <span className="ml-auto text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                        {ANOMALY_LABEL[alert.anomalyType]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All alerts (non-critical) for HR view */}
            {role === "hr" && alerts.filter((a) => a.severity !== "CRITICAL" && a.severity !== "HIGH").length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg mb-4">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Additional signals</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {alerts
                    .filter((a) => a.severity !== "CRITICAL" && a.severity !== "HIGH")
                    .map((alert) => (
                      <div key={alert.id} className="px-5 py-3 flex items-start gap-3">
                        <span
                          className={`mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${SEVERITY_COLOR[alert.severity]}`}
                        >
                          {alert.severity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{alert.detail}</p>
                        </div>
                        <span className="ml-auto text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                          {ANOMALY_LABEL[alert.anomalyType]}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Team signals table */}
            <div className="bg-white border border-gray-200 rounded-lg mb-4">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Team signals</h2>
                <span className="text-xs text-gray-400">{employees.length} people · sorted by pulse</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-2 text-xs font-medium text-gray-400">Person</th>
                    {role === "hr" && (
                      <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Tenure</th>
                    )}
                    <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Pulse</th>
                    <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Messages</th>
                    <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Commits</th>
                    <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Meetings</th>
                    <th className="text-right px-5 py-2 text-xs font-medium text-gray-400">Focus hrs</th>
                    <th className="px-5 py-2 text-xs font-medium text-gray-400">Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employees.map((emp) => (
                    <tr
                      key={emp.userId}
                      className={`hover:bg-gray-50 ${emp.openAlerts.length > 0 ? "bg-red-50/30" : ""}`}
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900">{emp.userName}</p>
                        <p className="text-xs text-gray-400">{emp.title}</p>
                      </td>
                      {role === "hr" && (
                        <td className="px-5 py-3 text-right">
                          <span
                            className={`text-xs font-medium ${
                              emp.tenureMonths < 18
                                ? "text-red-600"
                                : emp.tenureMonths < 24
                                ? "text-yellow-600"
                                : "text-gray-500"
                            }`}
                          >
                            {emp.tenureMonths}mo
                          </span>
                        </td>
                      )}
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`text-sm font-semibold ${
                            emp.pulse >= 70
                              ? "text-green-600"
                              : emp.pulse >= 40
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {emp.pulse}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-600">
                        {emp.signals.MESSAGE_COUNT !== undefined ? (
                          <span
                            className={
                              emp.baselines.MESSAGE_COUNT &&
                              emp.signals.MESSAGE_COUNT < emp.baselines.MESSAGE_COUNT * 0.5
                                ? "text-red-500 font-medium"
                                : ""
                            }
                          >
                            {emp.signals.MESSAGE_COUNT}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-600">
                        {emp.signals.COMMITS_COUNT !== undefined ? (
                          <span
                            className={
                              emp.baselines.COMMITS_COUNT &&
                              emp.baselines.COMMITS_COUNT > 0 &&
                              emp.signals.COMMITS_COUNT === 0
                                ? "text-red-500 font-medium"
                                : ""
                            }
                          >
                            {emp.signals.COMMITS_COUNT}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-600">
                        {emp.signals.MEETING_HOURS !== undefined ? (
                          <span
                            className={
                              emp.signals.MEETING_HOURS >= 6
                                ? "text-red-500 font-medium"
                                : ""
                            }
                          >
                            {emp.signals.MEETING_HOURS}h
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-600">
                        {emp.signals.FOCUS_TIME_HOURS !== undefined
                          ? `${emp.signals.FOCUS_TIME_HOURS}h`
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {emp.openAlerts.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {emp.openAlerts.slice(0, 2).map((a) => (
                              <span
                                key={a.id}
                                className={`inline-flex px-1.5 py-0.5 rounded text-xs border ${SEVERITY_COLOR[a.severity]}`}
                              >
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

            {/* Ask bar */}
            <DemoAskBar />

            {/* CTA */}
            <div className="mt-6 bg-gray-900 rounded-lg p-5 text-white flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Ready to run this on your actual team?</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Connect Slack, GitHub, or Google Calendar in under 5 minutes.
                </p>
              </div>
              <a
                href="/signup"
                className="flex-shrink-0 bg-white text-gray-900 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                Start free trial →
              </a>
            </div>
          </div>
        </main>
      </div>
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

function RoleIcon({ role }: { role: DemoRole }) {
  if (role === "ceo") {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    );
  }
  if (role === "manager") {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
