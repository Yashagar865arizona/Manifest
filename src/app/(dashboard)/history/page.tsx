export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { userId } = await searchParams;

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id, role: "MANAGER", status: "ACCEPTED" },
    include: { workspace: true },
  });

  if (!membership) {
    return <div className="p-6"><p className="text-sm text-gray-400">No workspace found.</p></div>;
  }

  const workspaceId = membership.workspaceId;

  // Get all members for the filter
  const members = await db.workspaceMember.findMany({
    where: { workspaceId, status: "ACCEPTED", role: "MEMBER" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // Get check-ins
  const checkIns = await db.checkIn.findMany({
    where: {
      workspaceId,
      tokenUsed: true,
      ...(userId ? { userId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ checkInDate: "desc" }, { submittedAt: "desc" }],
    take: 50,
  });

  const selectedMember = userId
    ? members.find((m) => m.user?.id === userId)
    : null;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Check-in History</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {selectedMember?.user
              ? `${selectedMember.user.name ?? selectedMember.user.email}`
              : "All team members"}
          </p>
        </div>
      </div>

      {/* Member filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        <a
          href="/history"
          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
            !userId
              ? "bg-gray-900 text-white border-gray-900"
              : "border-gray-300 text-gray-600 hover:border-gray-400"
          }`}
        >
          All
        </a>
        {members.map((m) =>
          m.user ? (
            <a
              key={m.user.id}
              href={`/history?userId=${m.user.id}`}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                userId === m.user.id
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {m.user.name ?? m.user.email}
            </a>
          ) : null
        )}
      </div>

      {/* Check-ins */}
      <div className="space-y-3">
        {checkIns.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg px-5 py-8 text-center">
            <p className="text-sm text-gray-400">No check-ins yet.</p>
          </div>
        ) : (
          checkIns.map((ci) => (
            <div key={ci.id} className="bg-white border border-gray-200 rounded-lg">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                    {(ci.user.name ?? ci.user.email)[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {ci.user.name ?? ci.user.email}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-600">{ci.checkInDate}</p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(ci.submittedAt), "h:mm a")}
                  </p>
                </div>
              </div>
              <div className="px-5 py-3">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {ci.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
