export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { SyncButton } from "./SyncButton";

export default async function AdminPage() {
  // Workspaces with aggregated counts
  const workspaces = await db.workspace.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        where: { status: "ACCEPTED" },
        select: { userId: true, role: true, invitedEmail: true },
      },
      connectors: {
        select: { connectorType: true, status: true, lastSyncAt: true },
      },
      subscription: {
        select: { plan: true, status: true, seatLimit: true },
      },
    },
  });

  // Waitlist entries
  const waitlist = await db.waitlistEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Recent anomaly alerts (cross-workspace, last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentAlerts = await db.anomalyAlert.findMany({
    where: { detectedAt: { gte: since }, resolvedAt: null },
    orderBy: { detectedAt: "desc" },
    take: 30,
    include: {
      workspace: { select: { name: true } },
      user: { select: { email: true, name: true } },
    },
  });

  // Signal pipeline health: last sync per connector per workspace
  const connectorHealth = await db.connectorCredential.findMany({
    select: {
      workspaceId: true,
      connectorType: true,
      status: true,
      lastSyncAt: true,
      workspace: { select: { name: true } },
    },
    orderBy: { lastSyncAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Admin panel</h1>
        <p className="text-sm text-gray-400 mt-0.5">Internal ops view — not visible to workspace users</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Workspaces", value: workspaces.length },
          { label: "Waitlist signups", value: waitlist.length },
          { label: "Open alerts (24h)", value: recentAlerts.length },
          {
            label: "Active connectors",
            value: connectorHealth.filter((c) => c.status === "ACTIVE").length,
          },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Workspace table */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Workspaces</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Name", "Owner", "Created", "Connectors", "Seats", "Plan", "Sync"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {workspaces.map((ws) => {
                const owner = ws.members.find((m) => m.role === "MANAGER");
                const activeConnectors = ws.connectors.filter((c) => c.status === "ACTIVE").length;
                const seatCount = ws.members.length;
                return (
                  <tr key={ws.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{ws.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{owner?.invitedEmail ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(ws.createdAt, "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{activeConnectors}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {seatCount}
                      {ws.subscription ? ` / ${ws.subscription.seatLimit}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      {ws.subscription ? (
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                          ws.subscription.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : ws.subscription.status === "TRIALING"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {ws.subscription.plan}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SyncButton workspaceId={ws.id} workspaceName={ws.name} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {workspaces.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No workspaces yet</div>
          )}
        </div>
      </section>

      {/* Signal pipeline health */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Signal pipeline health</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Workspace", "Connector", "Status", "Last sync"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {connectorHealth.map((c) => {
                const stale =
                  c.lastSyncAt && Date.now() - c.lastSyncAt.getTime() > 26 * 60 * 60 * 1000;
                return (
                  <tr key={`${c.workspaceId}-${c.connectorType}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{c.workspace.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.connectorType}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                        c.status === "ACTIVE"
                          ? stale
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {c.status === "ACTIVE" ? (stale ? "stale" : "ok") : c.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {c.lastSyncAt ? format(c.lastSyncAt, "MMM d 'at' h:mm a") : "never"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {connectorHealth.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No connectors configured</div>
          )}
        </div>
      </section>

      {/* Recent anomaly alerts */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Open anomaly alerts (last 24h)</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Workspace", "User", "Type", "Severity", "Detail", "Detected"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentAlerts.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{a.workspace.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {a.user.name ?? a.user.email}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{a.anomalyType}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                      a.severity === "CRITICAL"
                        ? "bg-red-100 text-red-700"
                        : a.severity === "HIGH"
                        ? "bg-orange-100 text-orange-700"
                        : a.severity === "MEDIUM"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{a.detail}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {format(a.detectedAt, "MMM d 'at' h:mm a")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentAlerts.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No open alerts in the last 24h</div>
          )}
        </div>
      </section>

      {/* Waitlist */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Waitlist ({waitlist.length} signups)
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Email", "Source", "Signed up"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-medium text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {waitlist.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{w.email}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{w.source ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {format(w.createdAt, "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {waitlist.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No waitlist signups yet</div>
          )}
        </div>
      </section>
    </div>
  );
}
