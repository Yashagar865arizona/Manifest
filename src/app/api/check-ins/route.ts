import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { format } from "date-fns";

const submitSchema = z.object({
  token: z.string().min(1),
  content: z.string().min(1).max(5000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = submitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { token, content } = parsed.data;

    // Find the check-in token record
    const existingCheckIn = await db.checkIn.findUnique({
      where: { token },
      include: {
        workspace: { select: { name: true, timezone: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!existingCheckIn) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
    }

    if (existingCheckIn.tokenUsed) {
      return NextResponse.json(
        { error: "This check-in has already been submitted", alreadySubmitted: true },
        { status: 409 }
      );
    }

    // Update the check-in record with content
    const updated = await db.checkIn.update({
      where: { token },
      data: {
        content,
        tokenUsed: true,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      checkInId: updated.id,
      workspaceName: existingCheckIn.workspace.name,
      memberName: existingCheckIn.user.name,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/check-ins?workspaceId=X&userId=Y - get check-in history for a member
 * Manager-only endpoint
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const userId = searchParams.get("userId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 90);

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  const where = userId
    ? { workspaceId, userId }
    : { workspaceId };

  const checkIns = await db.checkIn.findMany({
    where: { ...where, tokenUsed: true },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { checkInDate: "desc" },
    take: limit,
  });

  return NextResponse.json(checkIns);
}
