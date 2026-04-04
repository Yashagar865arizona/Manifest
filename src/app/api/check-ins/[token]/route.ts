import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const checkIn = await db.checkIn.findUnique({
    where: { token },
    include: {
      workspace: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!checkIn) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  return NextResponse.json({
    valid: !checkIn.tokenUsed,
    alreadySubmitted: checkIn.tokenUsed,
    workspaceName: checkIn.workspace.name,
    memberName: checkIn.user.name,
    checkInDate: checkIn.checkInDate,
  });
}
