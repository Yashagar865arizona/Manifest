import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getManagerMembership(workspaceId: string, userId: string) {
  return db.workspaceMember.findFirst({
    where: { workspaceId, userId, role: "MANAGER", status: "ACCEPTED" },
  });
}

export async function GET(
  _: Request,
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

  const workspace = await db.workspace.findUnique({
    where: { id },
    include: {
      subscription: true,
      _count: {
        select: { members: { where: { status: "ACCEPTED" } } },
      },
    },
  });

  return NextResponse.json({ ...workspace, role: membership.role });
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const manager = await getManagerMembership(id, session.user.id);
  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const workspace = await db.workspace.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(workspace);
}
