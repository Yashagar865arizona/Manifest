import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.workspaceMember.findFirst({
    where: { workspaceId: id, userId: session.user.id, status: "ACCEPTED" },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd");

  const report = await db.synthesisReport.findUnique({
    where: { workspaceId_reportDate: { workspaceId: id, reportDate: date } },
  });

  if (!report) {
    return NextResponse.json({ report: null, date });
  }

  return NextResponse.json({ report, date });
}
