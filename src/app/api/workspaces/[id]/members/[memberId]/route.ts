import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const patchSchema = z.object({
  leadershipRole: z.enum(["CEO", "MANAGER", "HR", "IC"]),
});

// PATCH /api/workspaces/[id]/members/[memberId] — update leadershipRole (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Must be a workspace MANAGER
  const admin = await db.workspaceMember.findFirst({
    where: { workspaceId: id, userId: session.user.id, role: "MANAGER", status: "ACCEPTED" },
  });
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid leadershipRole" }, { status: 400 });
  }

  const target = await db.workspaceMember.findFirst({
    where: { id: memberId, workspaceId: id },
  });
  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const updated = await db.workspaceMember.update({
    where: { id: memberId },
    data: { leadershipRole: parsed.data.leadershipRole },
  });

  return NextResponse.json(updated);
}
