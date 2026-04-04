export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

const ROLE_LABELS = {
  CEO: "CEO",
  MANAGER: "Manager",
  HR: "HR",
  IC: "Individual Contributor",
};

const ROLE_COLORS = {
  CEO: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  HR: "bg-teal-100 text-teal-700",
  IC: "bg-gray-100 text-gray-600",
};

export default async function OrgPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id, status: "ACCEPTED" },
    select: { workspaceId: true, role: true },
  });
  if (!membership) redirect("/dashboard");

  const members = await db.workspaceMember.findMany({
    where: { workspaceId: membership.workspaceId, status: "ACCEPTED" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const orgNodes = await db.orgNode.findMany({
    where: { workspaceId: membership.workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const nodeMap = new Map(orgNodes.map((n) => [n.userId, n]));

  const isAdmin = membership.role === "MANAGER";

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Org structure</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {members.length} team member{members.length !== 1 ? "s" : ""} · Define roles and reporting lines
          </p>
        </div>
        {isAdmin && (
          <a
            href="/org/import"
            className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-md font-medium hover:bg-gray-800"
          >
            Import CSV
          </a>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {members.map((m) => {
          const node = m.userId ? nodeMap.get(m.userId) : null;
          return (
            <div key={m.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                {(m.user?.name ?? m.invitedEmail)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {m.user?.name ?? m.invitedEmail}
                </p>
                {node?.title && <p className="text-xs text-gray-400 truncate">{node.title}</p>}
                {!m.user && <p className="text-xs text-yellow-600">Invite pending</p>}
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[m.leadershipRole]}`}>
                {ROLE_LABELS[m.leadershipRole]}
              </span>
              {node?.department && (
                <span className="text-xs text-gray-400">{node.department}</span>
              )}
            </div>
          );
        })}
        {members.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No members yet. Invite your team to get started.
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>Tip:</strong> Set leadership roles (CEO, Manager, HR) so each person sees the right dashboard view.
          Use the CSV import to set up your full org tree with manager relationships.
        </p>
      </div>
    </div>
  );
}
