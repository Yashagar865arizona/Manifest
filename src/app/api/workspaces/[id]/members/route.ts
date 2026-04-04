import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInviteEmail } from "@/lib/resend";

const inviteSchema = z.object({
  email: z.string().email(),
  leadershipRole: z.enum(["CEO", "MANAGER", "HR", "IC"]).optional(),
});

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Must be a manager to view full member list
  const manager = await db.workspaceMember.findFirst({
    where: { workspaceId: id, userId: session.user.id, role: "MANAGER", status: "ACCEPTED" },
  });

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await db.workspaceMember.findMany({
    where: { workspaceId: id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const manager = await db.workspaceMember.findFirst({
    where: { workspaceId: id, userId: session.user.id, role: "MANAGER", status: "ACCEPTED" },
    include: {
      workspace: true,
      user: { select: { name: true } },
    },
  });

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const { email, leadershipRole = "IC" } = parsed.data;

  // Check seat limit
  const subscription = await db.subscription.findUnique({ where: { workspaceId: id } });
  const memberCount = await db.workspaceMember.count({
    where: { workspaceId: id, status: "ACCEPTED" },
  });

  if (subscription && memberCount >= subscription.seatLimit) {
    return NextResponse.json(
      { error: "Seat limit reached. Please upgrade your plan." },
      { status: 403 }
    );
  }

  // Upsert member invite
  const existing = await db.workspaceMember.findFirst({
    where: { workspaceId: id, invitedEmail: email },
  });

  if (existing?.status === "ACCEPTED") {
    return NextResponse.json({ error: "User is already a member" }, { status: 409 });
  }

  const member = existing
    ? await db.workspaceMember.update({
        where: { id: existing.id },
        data: { status: "PENDING", leadershipRole },
      })
    : await db.workspaceMember.create({
        data: {
          workspaceId: id,
          invitedEmail: email,
          role: "MEMBER",
          leadershipRole,
          status: "PENDING",
        },
      });

  // Send invite email
  await sendInviteEmail({
    to: email,
    inviterName: manager.user?.name ?? session.user.email!,
    workspaceName: manager.workspace.name,
    inviteToken: member.inviteToken,
  });

  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const manager = await db.workspaceMember.findFirst({
    where: { workspaceId: id, userId: session.user.id, role: "MANAGER", status: "ACCEPTED" },
  });

  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { memberId } = await request.json();
  await db.workspaceMember.deleteMany({
    where: { id: memberId, workspaceId: id, role: "MEMBER" },
  });

  return NextResponse.json({ ok: true });
}
