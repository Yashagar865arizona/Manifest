export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id, role: "MANAGER", status: "ACCEPTED" },
    include: { workspace: true },
  });

  if (!membership) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-400">No workspace found.</p>
      </div>
    );
  }

  const weeklyReports = await db.weeklyReport.findMany({
    where: { workspaceId: membership.workspaceId },
    orderBy: { weekEnding: "desc" },
    take: 12,
  });

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Weekly Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5">Auto-generated every Friday evening</p>
      </div>

      <div className="space-y-4">
        {weeklyReports.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg px-5 py-8 text-center">
            <p className="text-sm text-gray-400">
              No weekly reports yet. The first report will be generated this Friday evening.
            </p>
          </div>
        ) : (
          weeklyReports.map((report) => (
            <div key={report.id} className="bg-white border border-gray-200 rounded-lg">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Week ending {format(new Date(report.weekEnding), "MMMM d, yyyy")}
                  </h2>
                  {report.sentAt && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Emailed {format(new Date(report.sentAt), "MMM d 'at' h:mm a")}
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  Weekly
                </span>
              </div>
              <div className="px-5 py-4">
                <div className="prose prose-sm max-w-none text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {report.reportText}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
