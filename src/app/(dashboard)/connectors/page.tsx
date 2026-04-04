export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { format } from "date-fns";

export default async function ConnectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id, status: "ACCEPTED" },
    select: { workspaceId: true, role: true },
  });
  if (!membership) redirect("/dashboard");

  const connectors = await db.connectorCredential.findMany({
    where: { workspaceId: membership.workspaceId },
    orderBy: { connectorType: "asc" },
  });

  const connectorMap = new Map(connectors.map((c) => [c.connectorType, c]));

  const integrations = [
    {
      type: "SLACK" as const,
      name: "Slack",
      description: "Message activity, DM patterns, channel engagement",
      connectHref: "/api/connectors/slack/connect",
      icon: "💬",
    },
    {
      type: "GITHUB" as const,
      name: "GitHub",
      description: "PR velocity, commit frequency, stalled work detection",
      connectHref: "/api/connectors/github/connect",
      icon: "⚙️",
    },
    {
      type: "GOOGLE_CALENDAR" as const,
      name: "Google Calendar",
      description: "Meeting load, focus time, 1:1 cadence",
      connectHref: "/api/connectors/google/connect",
      icon: "📅",
    },
  ];

  const isAdmin = membership.role === "MANAGER";

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-400 mt-0.5">Connect your tools to start seeing team signals</p>
      </div>

      {params.connected && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {params.connected} connected successfully. Backfilling last 30 days of data in the background.
        </div>
      )}
      {params.error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          Connection failed: {params.error.replace(/_/g, " ")}. Please try again.
        </div>
      )}

      <div className="space-y-3">
        {integrations.map((integration) => {
          const connected = connectorMap.get(integration.type);
          return (
            <div key={integration.type} className="bg-white border border-gray-200 rounded-lg p-5 flex items-center gap-4">
              <div className="text-2xl w-10 text-center">{integration.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
                  {connected && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      connected.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {connected.status === "ACTIVE" ? "Connected" : "Error"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{integration.description}</p>
                {connected?.lastSyncAt && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Last sync: {format(connected.lastSyncAt, "MMM d 'at' h:mm a")}
                    {connected.teamName && ` · ${connected.teamName}`}
                  </p>
                )}
              </div>
              <div>
                {isAdmin ? (
                  connected ? (
                    <span className="text-xs text-gray-400">
                      {connected.status === "ACTIVE" ? "✓ Active" : "Reconnect needed"}
                    </span>
                  ) : (
                    <a
                      href={integration.connectHref}
                      className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-md font-medium hover:bg-gray-800"
                    >
                      Connect
                    </a>
                  )
                ) : (
                  <span className="text-xs text-gray-400">Admin only</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-xs font-semibold text-gray-600 mb-1">Coming in Phase 2</h4>
        <p className="text-xs text-gray-400">Linear, Jira, BambooHR, Workday, Notion</p>
      </div>
    </div>
  );
}
